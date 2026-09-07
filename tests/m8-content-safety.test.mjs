import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import test from "node:test";
import {
  acceptContentPolicy,
  createContentReport,
  readContentPolicy,
  resolveContentReport,
} from "../server/content-safety/api.mjs";
import { createContentSafetyNodeApiHandler } from "../server/content-safety/node-api.mjs";
import {
  CONTENT_POLICY_DOCUMENT_HASH,
  CONTENT_POLICY_VERSION,
} from "../server/content-safety/policy.mjs";
import {
  acceptCurrentContentPolicy,
  assertCurrentContentPolicyAccepted,
  createOwnedAssetReport,
  resolveOpenContentReport,
} from "../server/content-safety/repository.mjs";

const MEMBER = Object.freeze({
  accessStatus: "active",
  ownerId: "20000000-0000-4000-8000-000000000002",
  systemRole: "member",
});
const SITE_OWNER = Object.freeze({
  accessStatus: "active",
  ownerId: "10000000-0000-4000-8000-000000000001",
  systemRole: "site_owner",
});
const ASSET_ID = "30000000-0000-4000-8000-000000000003";
const REPORT_ID = "40000000-0000-4000-8000-000000000004";

test("seed policy is versioned and acceptance fails closed on document drift", async () => {
  const calls = [];
  const repository = {
    async acceptCurrentContentPolicy(_pool, input) {
      calls.push(input);
      return {
        acceptedAt: "2026-09-07T05:00:00.000Z",
        created: true,
        documentHash: CONTENT_POLICY_DOCUMENT_HASH,
        version: CONTENT_POLICY_VERSION,
      };
    },
    async hasAcceptedCurrentContentPolicy() {
      return null;
    },
  };
  const policy = await readContentPolicy({
    ownerContext: MEMBER,
    repository,
    resources: { pool: {} },
  });
  assert.equal(policy.accepted, false);
  assert.equal(policy.policy.version, CONTENT_POLICY_VERSION);
  assert.match(policy.policy.documentHash, /^[a-f0-9]{64}$/);
  assert.equal(policy.reportCategories.at(-1).code, "other");

  await assert.rejects(
    acceptContentPolicy({
      idempotencyKey: "policy-key-0001",
      input: { documentHash: "0".repeat(64), version: CONTENT_POLICY_VERSION },
      ownerContext: MEMBER,
      repository,
      resources: { pool: {} },
    }),
    (error) => error.code === "CONTENT_POLICY_VERSION_CONFLICT" && error.status === 409,
  );
  assert.equal(calls.length, 0);

  const accepted = await acceptContentPolicy({
    idempotencyKey: "policy-key-0001",
    input: {
      documentHash: CONTENT_POLICY_DOCUMENT_HASH,
      version: CONTENT_POLICY_VERSION,
    },
    ownerContext: MEMBER,
    repository,
    resources: { pool: {} },
  });
  assert.equal(accepted.created, true);
  assert.deepEqual(calls[0], {
    idempotencyKey: "policy-key-0001",
    ownerId: MEMBER.ownerId,
  });
});

test("member report input is owner-scoped, category-bound, and contains no copied content", async () => {
  let stored;
  const repository = {
    async createOwnedAssetReport(_pool, input) {
      stored = input;
      return {
        assetId: input.assetId,
        category: input.category,
        created: true,
        createdAt: "2026-09-07T05:10:00.000Z",
        id: REPORT_ID,
        resolution: null,
        resolvedAt: null,
        state: "open",
      };
    },
  };
  await createContentReport({
    idempotencyKey: "report-key-0001",
    input: { assetId: ASSET_ID, category: "privacy_ip", prompt: "must-not-copy" },
    ownerContext: MEMBER,
    repository,
    resources: { pool: {} },
  });
  assert.equal(stored.ownerId, MEMBER.ownerId);
  assert.equal(stored.assetId, ASSET_ID);
  assert.equal(stored.category, "privacy_ip");
  assert.equal(stored.operationHash.length, 64);
  assert.equal("prompt" in stored, false);

  await assert.rejects(
    createContentReport({
      idempotencyKey: "report-key-0002",
      input: { assetId: ASSET_ID, category: "invented" },
      ownerContext: MEMBER,
      repository,
      resources: { pool: {} },
    }),
    (error) => error.code === "CONTENT_REPORT_CATEGORY_INVALID",
  );
});

test("persisted acceptance with the same version and another hash fails closed", async () => {
  let rolledBack = false;
  const client = {
    async query(sql) {
      const normalized = sql.replace(/\s+/g, " ").trim();
      if (normalized === "BEGIN" || normalized === "COMMIT") {
        return { rowCount: null, rows: [] };
      }
      if (normalized === "ROLLBACK") {
        rolledBack = true;
        return { rowCount: null, rows: [] };
      }
      if (normalized.startsWith("SELECT pg_advisory_xact_lock")) {
        return { rowCount: 1, rows: [{}] };
      }
      if (normalized.startsWith("SELECT owner.status")) {
        return { rowCount: 1, rows: [{ has_deletion_request: false, status: "active" }] };
      }
      if (normalized.startsWith("INSERT INTO content_policy_acceptances")) {
        return { rowCount: 0, rows: [] };
      }
      if (normalized.startsWith("SELECT accepted_at, document_hash")) {
        return {
          rowCount: 1,
          rows: [{ accepted_at: new Date(), document_hash: "0".repeat(64) }],
        };
      }
      throw new Error(`Unexpected SQL: ${normalized}`);
    },
    release() {},
  };
  await assert.rejects(
    acceptCurrentContentPolicy(
      { async connect() { return client; } },
      { idempotencyKey: "policy-key-0002", ownerId: MEMBER.ownerId },
    ),
    (error) => error.code === "CONTENT_POLICY_ACCEPTANCE_CONFLICT",
  );
  assert.equal(rolledBack, true);
});

test("creative policy enforcement accepts only the current owner record", async () => {
  await assert.doesNotReject(
    assertCurrentContentPolicyAccepted(
      {
        async query() {
          return { rows: [{ accepted_at: new Date() }] };
        },
      },
      MEMBER.ownerId,
    ),
  );
  await assert.rejects(
    assertCurrentContentPolicyAccepted(
      {
        async query() {
          return { rows: [] };
        },
      },
      MEMBER.ownerId,
    ),
    (error) => error.code === "CONTENT_POLICY_ACCEPTANCE_REQUIRED",
  );
});

test("creating a report atomically quarantines only the member-owned live asset", async () => {
  const sqlCalls = [];
  let committed = false;
  const client = {
    async query(sql, values = []) {
      const normalized = sql.replace(/\s+/g, " ").trim();
      sqlCalls.push({ sql: normalized, values });
      if (normalized === "BEGIN" || normalized === "ROLLBACK") {
        return { rowCount: null, rows: [] };
      }
      if (normalized === "COMMIT") {
        committed = true;
        return { rowCount: null, rows: [] };
      }
      if (normalized.startsWith("SELECT pg_advisory_xact_lock")) {
        return { rowCount: 1, rows: [{}] };
      }
      if (normalized.startsWith("SELECT * FROM content_reports") && normalized.includes("idempotency_key")) {
        return { rowCount: 0, rows: [] };
      }
      if (normalized.startsWith("SELECT owner.status")) {
        return { rowCount: 1, rows: [{ has_deletion_request: false, status: "active" }] };
      }
      if (normalized.startsWith("SELECT id, moderation_state FROM assets")) {
        return { rowCount: 1, rows: [{ id: ASSET_ID, moderation_state: "not_reviewed" }] };
      }
      if (normalized.startsWith("SELECT * FROM content_reports") && normalized.includes("asset_id")) {
        return { rowCount: 0, rows: [] };
      }
      if (normalized.startsWith("INSERT INTO content_reports")) {
        return {
          rowCount: 1,
          rows: [{
            asset_id: ASSET_ID,
            category: "other",
            created_at: new Date("2026-09-07T05:20:00.000Z"),
            id: REPORT_ID,
            resolution: null,
            resolved_at: null,
            state: "open",
          }],
        };
      }
      if (normalized.startsWith("UPDATE assets SET moderation_state = 'quarantined'")) {
        return { rowCount: 1, rows: [] };
      }
      throw new Error(`Unexpected SQL: ${normalized}`);
    },
    release() {},
  };
  const result = await createOwnedAssetReport(
    { async connect() { return client; } },
    {
      assetId: ASSET_ID,
      category: "other",
      idempotencyKey: "report-key-0003",
      operationHash: "a".repeat(64),
      ownerId: MEMBER.ownerId,
    },
  );
  assert.equal(result.created, true);
  assert.equal(committed, true);
  const quarantine = sqlCalls.find(({ sql }) => sql.startsWith("UPDATE assets SET moderation_state"));
  assert.deepEqual(quarantine.values, [ASSET_ID, MEMBER.ownerId]);
});

test("site-owner removal deletes the private object before persistence and retries failures safely", async () => {
  const sequence = [];
  const repository = {
    async resolveOpenContentReport(_pool, input) {
      sequence.push("repository-start");
      await input.deleteObject("private/generated/object");
      sequence.push("repository-finish");
      return { action: input.action, created: true, reportId: input.reportId };
    },
  };
  const resources = {
    config: { objectStorage: { bucket: "private-bucket" } },
    pool: {},
    storage: {
      async send(command) {
        sequence.push("object-delete");
        assert.equal(command.input.Bucket, "private-bucket");
        assert.equal(command.input.Key, "private/generated/object");
      },
    },
  };
  const result = await resolveContentReport({
    idempotencyKey: "resolve-key-0001",
    input: { action: "remove", reason: "确认违反内测使用规则" },
    ownerContext: SITE_OWNER,
    reportId: REPORT_ID,
    repository,
    resources,
  });
  assert.equal(result.created, true);
  assert.deepEqual(sequence, ["repository-start", "object-delete", "repository-finish"]);

  resources.storage.send = async () => {
    throw new Error("storage unavailable");
  };
  await assert.rejects(
    resolveContentReport({
      idempotencyKey: "resolve-key-0002",
      input: { action: "remove", reason: "确认违反内测使用规则" },
      ownerContext: SITE_OWNER,
      reportId: REPORT_ID,
      repository,
      resources,
    }),
    /storage unavailable/,
  );
});

test("repository restoration is audited and removal failure preserves quarantine", async () => {
  const queryLog = [];
  const makeClient = () => ({
    async query(sql, values = []) {
      const normalized = sql.replace(/\s+/g, " ").trim();
      queryLog.push({ sql: normalized, values });
      if (["BEGIN", "COMMIT", "ROLLBACK"].includes(normalized)) {
        return { rowCount: null, rows: [] };
      }
      if (normalized.startsWith("SELECT 1 FROM system_role_assignments")) {
        return { rowCount: 1, rows: [{}] };
      }
      if (normalized.startsWith("SELECT pg_advisory_xact_lock")) {
        return { rowCount: 1, rows: [{}] };
      }
      if (normalized.startsWith("SELECT * FROM content_moderation_actions")) {
        return { rowCount: 0, rows: [] };
      }
      if (normalized.startsWith("SELECT report.*")) {
        return {
          rowCount: 1,
          rows: [{
            asset_id: ASSET_ID,
            moderation_state: "quarantined",
            object_deleted_at: null,
            object_key: "private/generated/object",
            state: "open",
            target_owner_id: MEMBER.ownerId,
          }],
        };
      }
      if (normalized.startsWith("UPDATE assets")) {
        return { rowCount: 1, rows: [] };
      }
      if (normalized.startsWith("UPDATE content_reports")) {
        return { rowCount: 1, rows: [] };
      }
      if (normalized.startsWith("INSERT INTO content_moderation_actions")) {
        return { rowCount: 1, rows: [] };
      }
      throw new Error(`Unexpected SQL: ${normalized}`);
    },
    release() {},
  });
  const pool = { async connect() { return makeClient(); } };
  const restored = await resolveOpenContentReport(pool, {
    action: "restore",
    actorOwnerId: SITE_OWNER.ownerId,
    deleteObject: async () => assert.fail("restore must not delete bytes"),
    idempotencyKey: "restore-key-0001",
    operationHash: "b".repeat(64),
    reason: "误报，恢复图片",
    reportId: REPORT_ID,
  });
  assert.deepEqual(restored, { action: "restore", created: true, reportId: REPORT_ID });
  const restoredAsset = queryLog.find(({ sql }) => sql.startsWith("UPDATE assets"));
  assert.deepEqual(restoredAsset.values, [ASSET_ID, "accepted", false]);

  queryLog.length = 0;
  await assert.rejects(
    resolveOpenContentReport(pool, {
      action: "remove",
      actorOwnerId: SITE_OWNER.ownerId,
      deleteObject: async () => {
        throw new Error("object storage unavailable");
      },
      idempotencyKey: "remove-key-0001",
      operationHash: "c".repeat(64),
      reason: "确认违反使用规则",
      reportId: REPORT_ID,
    }),
    /object storage unavailable/,
  );
  assert.equal(queryLog.some(({ sql }) => sql.startsWith("UPDATE assets")), false);
  assert.equal(queryLog.at(-1).sql, "ROLLBACK");
});

test("content-safety HTTP mutations are POST-only and CSRF-protected", async () => {
  let authenticated = false;
  let statusCode;
  let body;
  const handler = createContentSafetyNodeApiHandler({
    authenticate: async () => {
      authenticated = true;
      return MEMBER;
    },
  });
  const request = Readable.from([JSON.stringify({})]);
  request.method = "POST";
  request.url = "/api/content-reports";
  request.headers = { "content-type": "application/json" };
  const response = {
    end(value) { body = JSON.parse(value); },
    writeHead(value) { statusCode = value; },
  };
  assert.equal(await handler(request, response), true);
  assert.equal(authenticated, false);
  assert.equal(statusCode, 403);
  assert.equal(body.error.code, "CONTENT_SAFETY_CSRF_CHECK_FAILED");
});

test("C6-2P migration, policy gate, reporting UI, and admin states stay wired", async () => {
  const [
    migration,
    generationRepository,
    referenceRepository,
    workspace,
    policyDialog,
    adminPage,
  ] = await Promise.all([
    readFile(new URL("../migrations/0020_m8_seed_content_safety.sql", import.meta.url), "utf8"),
    readFile(new URL("../server/generation/repository.mjs", import.meta.url), "utf8"),
    readFile(new URL("../server/references/repository.mjs", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/safety/content-policy-dialog.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/admin/account-management-page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(migration, /content_policy_acceptances/);
  assert.match(migration, /content_reports/);
  assert.match(migration, /content_moderation_actions_append_only/);
  assert.match(migration, /moderation_state = 'not_reviewed'/);
  assert.match(generationRepository, /assertCurrentContentPolicyAccepted/);
  assert.match(
    generationRepository,
    /LEFT JOIN assets a[\s\S]*a\.moderation_state IN \('not_reviewed', 'accepted'\)/,
  );
  assert.match(referenceRepository, /assertCurrentContentPolicyAccepted/);
  assert.match(workspace, /举报并隐藏这张图片/);
  assert.match(policyDialog, /使用规则暂时无法读取/);
  assert.match(policyDialog, /同意并进入工作台/);
  assert.match(adminPage, /正在加载内容举报/);
  assert.match(adminPage, /当前没有待处理的内容举报/);
  assert.match(adminPage, /预览读取失败/);
  assert.match(adminPage, /对象删除不可撤销/);
});
