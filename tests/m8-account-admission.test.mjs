import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import test from "node:test";
import {
  createAdminTestCreditGrant,
  readAdminDashboard,
  updateAdminAccountStatus,
} from "../server/admin/api.mjs";
import { createAdminNodeApiHandler } from "../server/admin/node-api.mjs";
import { changeAccountAccess } from "../server/admin/repository.mjs";
import { parseSiteOwnerBootstrapArguments } from "../server/runtime/bootstrap-site-owner.mjs";
import { createAuthenticationOperations } from "../server/auth/operations.mjs";
import { resolveOwnerContext } from "../server/auth/repository.mjs";

const SITE_OWNER = Object.freeze({
  accessStatus: "active",
  accountTier: "seed",
  availableCredits: "100",
  email: "owner@goodgood.invalid",
  ownerId: "10000000-0000-4000-8000-000000000001",
  reservedCredits: "0",
  systemRole: "site_owner",
});

test("M8 account migration keeps exactly pending, active, and suspended access states", async () => {
  const [migration, schema, authRepository] = await Promise.all([
    readFile(new URL("../migrations/0011_m8_account_admission.sql", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../server/auth/repository.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(migration, /status IN \('pending', 'active', 'suspended'\)/);
  assert.doesNotMatch(migration, /'rejected'/);
  assert.match(migration, /account_tier text NOT NULL DEFAULT 'seed'/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS system_role_assignments/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS administrative_actions/);
  assert.match(migration, /administrative_actions_append_only/);
  assert.match(schema, /default\("pending"\)/);
  assert.match(authRepository, /VALUES \(\$1, \$2, 'zh-CN', 'pending', 'seed'\)/);
  assert.match(authRepository, /grantWelcomeCreditsInTransaction/);
});

test("pending sessions expose only account state and waiting credits", async () => {
  let productAuthenticatorCalled = false;
  const operations = createAuthenticationOperations({
    authenticate() {
      productAuthenticatorCalled = true;
      throw new Error("product authenticator must not read pending sessions");
    },
    authenticateSession: async () => ({
      accessStatus: "pending",
      accountTier: "seed",
      availableCredits: "100",
      email: "pending@goodgood.invalid",
      reservedCredits: "0",
      systemRole: "member",
    }),
    config: { mode: "local" },
    getPool: async () => ({}),
  });
  assert.deepEqual(await operations.readSession({}), {
    account: {
      availableCredits: "100",
      reservedCredits: "0",
      role: "member",
      tier: "seed",
      unit: "credit",
    },
    access: { status: "pending" },
    authenticated: true,
    user: { email: "pending@goodgood.invalid" },
  });
  assert.equal(productAuthenticatorCalled, false);
});

test("the shared product capability guard rejects pending and suspended owners", async () => {
  for (const [status, code] of [
    ["pending", "ACCOUNT_PENDING"],
    ["suspended", "ACCOUNT_SUSPENDED"],
  ]) {
    const pool = {
      async query() {
        return {
          rows: [
            {
              account_tier: "seed",
              email: `${status}@goodgood.invalid`,
              is_site_owner: false,
              locale: "zh-CN",
              owner_id: "20000000-0000-4000-8000-000000000002",
              status,
            },
          ],
        };
      },
    };
    await assert.rejects(
      resolveOwnerContext(pool, { issuer: "test", subject: status }),
      (error) => error.code === code && error.status === 403,
    );
  }
});

test("site-owner dashboard keeps search in a POST body and returns empty state safely", async () => {
  const calls = [];
  const repository = {
    async listManagedAccounts(_pool, input) {
      calls.push(input);
      return { hasMore: false, items: [], next: null };
    },
    async listRecentAdministrativeActions() {
      return [];
    },
    async readAccountStatusCounts() {
      return { active: 2, pending: 1, suspended: 0 };
    },
  };
  const dashboard = await readAdminDashboard({
    input: { query: "person@example.com", status: "pending" },
    ownerContext: SITE_OWNER,
    repository,
    resources: { pool: {} },
  });
  assert.deepEqual(dashboard, {
    accounts: [],
    counts: { active: 2, pending: 1, suspended: 0 },
    nextCursor: null,
    recentActions: [],
  });
  assert.equal(calls[0].query, "person@example.com");
  assert.equal(calls[0].status, "pending");

  await assert.rejects(
    readAdminDashboard({
      input: {},
      ownerContext: { ...SITE_OWNER, systemRole: "member" },
      repository,
      resources: { pool: {} },
    }),
    (error) => error.code === "ADMIN_ACCESS_DENIED" && error.status === 403,
  );
});

test("review transitions and test-credit grants use server-owned actors and limits", async () => {
  let accessInput;
  let grantInput;
  const repository = {
    async changeAccountAccess(_pool, input) {
      accessInput = input;
      return { actionType: "approve_account", created: true, status: "active" };
    },
    async grantTestCredits(_pool, input) {
      grantInput = input;
      return {
        availableCredits: "600",
        created: true,
        grantedCredits: "500",
        reservedCredits: "0",
      };
    },
  };
  const targetOwnerId = "20000000-0000-4000-8000-000000000002";
  await updateAdminAccountStatus({
    idempotencyKey: "approve-0001",
    input: { reason: "通过种子用户审核", status: "active" },
    ownerContext: SITE_OWNER,
    repository,
    resources: { pool: {} },
    targetOwnerId,
  });
  assert.equal(accessInput.actorOwnerId, SITE_OWNER.ownerId);
  assert.equal(accessInput.targetOwnerId, targetOwnerId);
  assert.equal(accessInput.operationHash.length, 64);

  await createAdminTestCreditGrant({
    idempotencyKey: "grant-000001",
    input: { amount: 500, reason: "第二轮生图测试" },
    ownerContext: SITE_OWNER,
    repository,
    resources: { pool: {} },
    targetOwnerId,
  });
  assert.equal(grantInput.actorOwnerId, SITE_OWNER.ownerId);
  assert.equal(grantInput.amount, 500);
  assert.match(grantInput.ledgerIdempotencyKey, /^admin-grant:v1:[0-9a-f]{64}$/);

  for (const amount of [0, -1, 5001, 1.5]) {
    await assert.rejects(
      createAdminTestCreditGrant({
        idempotencyKey: `invalid-${String(amount)}`,
        input: { amount, reason: "无效积分测试" },
        ownerContext: SITE_OWNER,
        repository,
        resources: { pool: {} },
        targetOwnerId,
      }),
      (error) => error.code === "ADMIN_CREDIT_AMOUNT_INVALID",
    );
  }
});

test("account review persistence is idempotent and rejects conflicting key reuse", async () => {
  let action = null;
  let status = "pending";
  const client = {
    async query(sql, values = []) {
      const normalized = sql.replace(/\s+/g, " ").trim();
      if (["BEGIN", "COMMIT", "ROLLBACK"].includes(normalized)) {
        return { rowCount: null, rows: [] };
      }
      if (normalized.startsWith("SELECT 1 FROM system_role_assignments")) {
        return { rowCount: 1, rows: [{ exists: 1 }] };
      }
      if (normalized.startsWith("SELECT pg_advisory_xact_lock")) {
        return { rowCount: 1, rows: [{}] };
      }
      if (normalized.startsWith("SELECT * FROM administrative_actions")) {
        return { rowCount: action ? 1 : 0, rows: action ? [action] : [] };
      }
      if (normalized.startsWith("SELECT id, status FROM users")) {
        return {
          rowCount: 1,
          rows: [{ id: values[0], status }],
        };
      }
      if (normalized.startsWith("UPDATE users SET status")) {
        status = values[1];
        return { rowCount: 1, rows: [] };
      }
      if (normalized.startsWith("INSERT INTO administrative_actions")) {
        action = {
          action_type: values[3],
          idempotency_key: values[7],
          operation_hash: values[8],
          resulting_status: values[5],
        };
        return { rowCount: 1, rows: [] };
      }
      throw new Error(`Unexpected SQL: ${normalized}`);
    },
    release() {},
  };
  const pool = { async connect() { return client; } };
  const input = {
    actorOwnerId: SITE_OWNER.ownerId,
    idempotencyKey: "review-key-0001",
    operationHash: "a".repeat(64),
    reason: "通过种子用户审核",
    targetOwnerId: "20000000-0000-4000-8000-000000000002",
    toStatus: "active",
  };
  assert.deepEqual(await changeAccountAccess(pool, input), {
    actionType: "approve_account",
    created: true,
    status: "active",
  });
  assert.deepEqual(await changeAccountAccess(pool, input), {
    actionType: "approve_account",
    created: false,
    status: "active",
  });
  await assert.rejects(
    changeAccountAccess(pool, { ...input, operationHash: "b".repeat(64) }),
    (error) => error.code === "ADMIN_IDEMPOTENCY_CONFLICT" && error.status === 409,
  );
});

test("admin HTTP mutations fail closed without the CSRF-only request header", async () => {
  let authenticated = false;
  let statusCode;
  let body;
  const handler = createAdminNodeApiHandler({
    authenticate: async () => {
      authenticated = true;
      return SITE_OWNER;
    },
  });
  const request = Readable.from([JSON.stringify({})]);
  request.method = "POST";
  request.url = "/api/admin/users/query";
  request.headers = { "content-type": "application/json" };
  const response = {
    end(value) {
      body = JSON.parse(value);
    },
    writeHead(value) {
      statusCode = value;
    },
  };
  assert.equal(await handler(request, response), true);
  assert.equal(authenticated, false);
  assert.equal(statusCode, 403);
  assert.equal(body.error.code, "ADMIN_CSRF_CHECK_FAILED");
});

test("site-owner bootstrap is dry-run by default and requires an explicit operator reference", () => {
  assert.deepEqual(
    parseSiteOwnerBootstrapArguments([
      "--email",
      "owner@example.com",
      "--operator",
      "operator-1",
      "--reference",
      "initial-owner-2026",
    ]),
    {
      execute: false,
      input: {
        email: "owner@example.com",
        operatorId: "operator-1",
        reference: "initial-owner-2026",
      },
    },
  );
  assert.equal(
    parseSiteOwnerBootstrapArguments([
      "--execute",
      "--email",
      "owner@example.com",
      "--operator",
      "operator-1",
      "--reference",
      "initial-owner-2026",
    ]).execute,
    true,
  );
  assert.throws(
    () => parseSiteOwnerBootstrapArguments(["--email", "owner@example.com"]),
    /--operator is required/,
  );
});

test("account management surface includes loading, empty, failure, audit, and grant controls", async () => {
  const source = (
    await Promise.all([
      readFile(
        new URL("../features/admin/account-management-page.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../features/admin/http-admin-boundary.ts", import.meta.url),
        "utf8",
      ),
    ])
  ).join("\n");
  assert.match(source, /正在加载账户/);
  assert.match(source, /没有符合条件的账户/);
  assert.match(source, /账户列表加载失败/);
  assert.match(source, /最近操作记录/);
  assert.match(source, /\[100, 500, 1000\]/);
  assert.match(source, /Number\(amount\) > 5000/);
  assert.match(source, /x-goodgood-admin-action/);
});
