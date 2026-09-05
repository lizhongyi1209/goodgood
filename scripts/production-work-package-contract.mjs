import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  planProductionConversion,
  readProductionConversionManifest,
} from "./production-conversion-contract.mjs";
import {
  createR2InventoryDocument,
  planR2CurrentObjectDeletion,
  validateR2InventoryDocument,
} from "../server/generation/r2-inventory-contract.mjs";

export const PRODUCTION_WORK_PACKAGE_SCHEMA_VERSION = 1;

export const PRODUCTION_WORK_PACKAGE_FILES = Object.freeze([
  "compose.production.dependencies.yaml",
  "compose.production.yaml",
  "infra/production/CONVERSION_RUNBOOK.md",
  "infra/production/conversion-manifest.example.json",
  "infra/production/maintenance/index.html",
  "infra/production/maintenance-control.sh",
  "infra/production/nginx/active-upstream.blue.example.conf",
  "infra/production/nginx/active-upstream.green.example.conf",
  "infra/production/nginx/cloudflare-origin-only.conf",
  "infra/production/nginx/goodgood.conf",
  "infra/production/postgres-backup.env.example",
  "infra/production/postgres-backup-automated.sh",
  "infra/production/postgres-backup-restore.sh",
  "infra/production/r2-inventory.env.example",
  "infra/production/release.env.example",
  "infra/production/runtime.env.example",
  "infra/production/slots/blue.env",
  "infra/production/slots/green.env",
  "infra/production/systemd/goodgood-production-postgres-backup.service",
  "infra/production/systemd/goodgood-production-postgres-backup.timer",
  "infra/production/systemd/goodgood-production-postgres-maintenance.service",
  "infra/production/systemd/goodgood-production-postgres-maintenance.timer",
  "scripts/build-runtime.mjs",
  "scripts/production-conversion-contract.mjs",
  "scripts/production-work-package-contract.mjs",
  "scripts/run-production-conversion.mjs",
  "scripts/run-production-r2-deletion-plan.mjs",
  "scripts/run-production-work-package.mjs",
  "server/generation/r2-inventory-contract.mjs",
  "server/runtime/r2-inventory.mjs",
]);

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function requireText(source, expected, label) {
  requireCondition(source.includes(expected), `${label} must contain ${expected}.`);
}

function rejectText(source, expression, label) {
  requireCondition(!expression.test(source), `${label} contains forbidden ${expression}.`);
}

function readPackage(root) {
  return new Map(
    PRODUCTION_WORK_PACKAGE_FILES.map((relativePath) => [
      relativePath,
      readFileSync(path.resolve(root, relativePath), "utf8"),
    ]),
  );
}

export function inspectProductionWorkPackage({
  now = () => Date.now(),
  root = repositoryRoot,
} = {}) {
  const checkedAt = now();
  requireCondition(Number.isFinite(checkedAt), "now must return epoch milliseconds.");
  const files = readPackage(root);
  const source = (relativePath) => files.get(relativePath);
  const checks = [];
  const check = (id, verify) => {
    try {
      verify();
      checks.push(Object.freeze({ id, status: "pass" }));
    } catch (error) {
      throw new Error(
        `${id}: ${error instanceof Error ? error.message : "check failed"}`,
      );
    }
  };

  check("bounded-production-state", () => {
    const compose = source("compose.production.dependencies.yaml");
    for (const expected of [
      "name: goodgood-production-dependencies",
      "postgres:17.11-bookworm@sha256:",
      "valkey/valkey:8.1.9-alpine3.24@sha256:",
      "cpus: 0.75",
      "mem_limit: 768m",
      "cpus: 0.25",
      "mem_limit: 256m",
      "name: goodgood-production-postgres-data",
      "name: goodgood-production-valkey-data",
      "name: goodgood-production-state",
      "internal: true",
    ]) {
      requireText(compose, expected, "production dependency Compose");
    }
    rejectText(compose, /goodgood-staging|rustfs|\n\s*ports:/i, "production dependency Compose");
  });

  check("blue-green-application", () => {
    const compose = source("compose.production.yaml");
    for (const expected of [
      "GOODGOOD_PRODUCTION_COMPOSE_PROJECT",
      "127.0.0.1:${GOODGOOD_PRODUCTION_WEB_PORT",
      "127.0.0.1:${GOODGOOD_PRODUCTION_WORKER_HEALTH_PORT",
      "stop_grace_period: 5m",
      "read_only: true",
      "goodgood-production-state",
      "external: true",
      'entrypoint: ["node", "server/runtime/r2-inventory.mjs"]',
      "GOODGOOD_R2_INVENTORY_ENV_FILE",
    ]) {
      requireText(compose, expected, "production application Compose");
    }
    requireCondition(
      (compose.match(/^  worker:\s*$/gm) ?? []).length === 1,
      "production application Compose must define exactly one Worker service.",
    );
    rejectText(compose, /\bbuild:|mock-generation|fake-sandbox|goodgood-staging/i, "production application Compose");
    const inventoryEnvironment = source("infra/production/r2-inventory.env.example");
    for (const forbidden of ["DATABASE_URL", "REDIS_URL", "GOODGOOD_AUTH_", "GENERATION_"]) {
      requireCondition(!inventoryEnvironment.includes(forbidden), `R2 inventory environment must omit ${forbidden}.`);
    }
    requireText(source("infra/production/release.env.example"), "GOODGOOD_R2_INVENTORY_ENV_FILE=/etc/goodgood/production/r2-inventory.env", "production release environment");
    requireText(source("infra/production/runtime.env.example"), "GOODGOOD_FAKE_PAYMENT_ENABLED=false", "production runtime environment");
    for (const [slot, webPort, workerPort] of [
      ["blue", "3100", "3101"],
      ["green", "3200", "3201"],
    ]) {
      const slotFile = source(`infra/production/slots/${slot}.env`);
      requireText(slotFile, `GOODGOOD_PRODUCTION_COMPOSE_PROJECT=goodgood-production-${slot}`, `${slot} slot`);
      requireText(slotFile, `GOODGOOD_PRODUCTION_WEB_PORT=${webPort}`, `${slot} slot`);
      requireText(slotFile, `GOODGOOD_PRODUCTION_WORKER_HEALTH_PORT=${workerPort}`, `${slot} slot`);
    }
  });

  check("fail-closed-maintenance-ingress", () => {
    const nginx = source("infra/production/nginx/goodgood.conf");
    const originAllowlist = source(
      "infra/production/nginx/cloudflare-origin-only.conf",
    );
    const markerPosition = nginx.indexOf("/etc/goodgood/production/maintenance.enabled");
    const proxyPosition = nginx.indexOf("proxy_pass http://goodgood_active");
    requireCondition(markerPosition >= 0 && markerPosition < proxyPosition, "maintenance marker must be evaluated before proxying.");
    requireText(originAllowlist, "allow 127.0.0.1;", "production origin allowlist");
    requireText(originAllowlist, "allow ::1;", "production origin allowlist");
    for (const expected of [
      "return 503;",
      "error_page 503 =503 /__goodgood_maintenance.html;",
      "alias /var/www/goodgood-production/maintenance/index.html;",
      "Retry-After 300",
      "server_name goodgood.o1key.com;",
    ]) {
      requireText(nginx, expected, "production Nginx site");
    }
    const control = source("infra/production/maintenance-control.sh");
    for (const expected of [
      "plan-enable)",
      "enable --execute",
      "nginx -s reload",
      "systemctl stop nginx",
      "origin_verification=passed",
    ]) {
      requireText(control, expected, "maintenance control");
    }
    rejectText(control, /^\s*disable\)/m, "maintenance control");
    rejectText(control, /\brm\b|\bunlink\b/, "maintenance control");
    requireCondition(
      (originAllowlist.match(/^allow /gm) ?? []).length === 24,
      "Origin allowlist must contain two loopback probes and 22 reviewed Cloudflare ranges.",
    );
    requireText(originAllowlist, "deny all;", "Cloudflare allowlist");
  });

  check("production-backup-policy", () => {
    const automated = source("infra/production/postgres-backup-automated.sh");
    for (const expected of [
      "/goodgood-postgres-backups/production",
      '--host "${snapshot_host}"',
      "--tag production",
      "--tag automated",
      "--tag postgresql",
      "--keep-within 24h",
      "--keep-daily 14",
      "--keep-weekly 8",
      "--keep-monthly 12",
      "check --read-data",
      "restore-latest-drill",
    ]) {
      requireText(automated, expected, "production backup automation");
    }
    const backupTimer = source("infra/production/systemd/goodgood-production-postgres-backup.timer");
    requireText(backupTimer, "OnCalendar=*-*-* *:00,30:00 UTC", "production backup timer");
    requireText(backupTimer, "RandomizedDelaySec=5m", "production backup timer");
    const maintenanceTimer = source("infra/production/systemd/goodgood-production-postgres-maintenance.timer");
    requireText(maintenanceTimer, "Persistent=true", "production maintenance timer");
    const restore = source("infra/production/postgres-backup-restore.sh");
    for (const expected of ["--network none", "--read-only", "storage=tmpfs", "goodgood_schema_migrations"]) {
      requireText(restore, expected, "production restore drill");
    }
  });

  check("metadata-only-r2-inventory", () => {
    const runtime = source("server/runtime/r2-inventory.mjs");
    requireText(runtime, "ListObjectsV2Command", "R2 inventory runtime");
    rejectText(runtime, /DeleteObject|DeleteObjects|PutObject|GetObject/, "R2 inventory runtime");
    const planner = source("scripts/run-production-r2-deletion-plan.mjs");
    rejectText(planner, /node:child_process|\bspawn\b|\bexecFile\b|DeleteObject/, "R2 deletion planner");

    const inventory = createR2InventoryDocument({
      capturedAt: "2026-09-05T00:00:00.000Z",
      objects: [
        {
          etag: '"etag-b"',
          key: "references/test-b.png",
          lastModified: "2026-09-04T01:00:00.000Z",
          size: 20,
        },
        {
          etag: '"etag-a"',
          key: "generated/test-a.jpg",
          lastModified: "2026-09-04T00:00:00.000Z",
          size: 10,
        },
      ],
    });
    const plan = planR2CurrentObjectDeletion(inventory);
    requireCondition(plan.executed === false && plan.executionAvailable === false, "R2 deletion preview must be non-executable.");
    requireCondition(plan.objectCount === 2 && plan.totalBytes === 30, "R2 deletion preview summary must be exact.");
    const tampered = structuredClone(inventory);
    tampered.objects[0].size += 1;
    let rejected = false;
    try {
      validateR2InventoryDocument(tampered);
    } catch {
      rejected = true;
    }
    requireCondition(rejected, "tampered R2 inventory must fail closed.");
  });

  check("pending-conversion-manifest", () => {
    const manifest = readProductionConversionManifest(
      path.resolve(root, "infra/production/conversion-manifest.example.json"),
    );
    const plan = planProductionConversion(manifest, { now: () => checkedAt });
    requireCondition(plan.executed === false && plan.executionAvailable === false, "conversion plan must be non-executable.");
    requireCondition(!plan.readyForSeparateLiveActionReview && plan.blockers.length > 0, "example conversion manifest must remain pending.");
    requireCondition(plan.steps[0].id === "enter-public-maintenance", "maintenance must be the first conversion action.");
  });

  check("authing-and-secret-checklists", () => {
    const runbook = source("infra/production/CONVERSION_RUNBOOK.md");
    for (const expected of [
      "https://goodgood.o1key.com/api/auth/callback",
      "https://goodgood.o1key.com/",
      "不删除任何 Authing 用户或第三方身份",
      "GoodGood session",
      "没有共享签名 secret",
      "撤销 staging 凭据",
      "Restic",
    ]) {
      requireText(runbook, expected, "conversion runbook secret checklists");
    }
  });

  check("rollback-and-four-hour-stop", () => {
    const runbook = source("infra/production/CONVERSION_RUNBOOK.md");
    for (const expected of [
      "deadline=T0+4h",
      "检查点 R0",
      "检查点 R7",
      "schemaDowngradeAttempted=false",
      "不得把 staging 重新公开",
      "七日后清理",
      "本仓库不提供 public-open 执行命令",
    ]) {
      requireText(runbook, expected, "conversion rollback runbook");
    }
  });

  check("runtime-bundle-and-release-binding", () => {
    requireText(source("scripts/build-runtime.mjs"), '"r2-inventory": "server/runtime/r2-inventory.mjs"', "runtime build");
    const releaseMetadata = readFileSync(
      path.resolve(root, "scripts/release-metadata.mjs"),
      "utf8",
    );
    for (const relativePath of PRODUCTION_WORK_PACKAGE_FILES) {
      requireText(releaseMetadata, JSON.stringify(relativePath), "release metadata contract");
    }
  });

  return Object.freeze({
    action: "production-work-package-rehearsal",
    checkedAt: new Date(checkedAt).toISOString(),
    checks: Object.freeze(checks),
    executed: false,
    executionAvailable: false,
    ok: true,
    schemaVersion: PRODUCTION_WORK_PACKAGE_SCHEMA_VERSION,
  });
}
