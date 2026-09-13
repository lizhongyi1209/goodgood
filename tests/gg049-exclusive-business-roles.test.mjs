import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { canonicalBusinessRoute } from "../features/distribution/business-route.mjs";
import { createCreditTransfer, listCreditTransfers, listDirectChildren, readDistributionSummary } from "../server/distribution/repository.mjs";
import { listEligibleBusinessParents, setBusinessRole, setDirectParent } from "../server/admin/repository.mjs";

// Injected SQL boundaries only. Never connect to a database or real Worker.
const ownerId = "owner-a", childId = "child-a";
const existing = { id: "internal", public_id: "trf_existing", parent_owner_id: ownerId, child_owner_id: childId,
  parent_email: "parent@example.invalid", child_email: "child@example.invalid", amount: "10", unit: "credit",
  created_at: "2026-09-13T00:00:00Z", operation_hash: "a".repeat(64), remark: null };
const account = { available_balance: "40", payment_funded_available_balance: "30", status: "active", child_count: 0 };
function boundary(role, { status = "active", replay = false } = {}) {
  const calls = [];
  const client = { release() { calls.push({ sql: "RELEASE" }); }, async query(sql, values) {
    calls.push({ sql, values });
    let rows = [];
    if (sql.includes("SELECT account.id, account.status, assignment.role")) rows = [{ id: ownerId, status, role }];
    else if (sql.includes("FROM credit_accounts")) rows = [account];
    else if (sql.includes("FROM credit_transfers transfer") && replay) rows = [existing];
    return { rows, rowCount: rows.length };
  } };
  return { calls, client, pool: { query: client.query, connect: async () => client } };
}
const input = { amount: 10n, childOwnerId: childId, idempotencyKey: "replay-key", operationHash: existing.operation_hash, ownerId };

test("GG-049 one business assignment is enforced by existing uniqueness and atomic replacement", async () => {
  const migration = await readFile(new URL("../migrations/0021_gg027_business_hierarchy.sql", import.meta.url), "utf8");
  assert.match(migration, /business_role_assignments_active_owner_unique\s+ON business_role_assignments \(owner_id\)\s+WHERE ended_at IS NULL/);
  const calls = [];
  const client = { release() {}, async query(sql) {
    calls.push(sql);
    const rows = sql.includes("FROM system_role_assignments") ? [{ authorized: 1 }]
      : sql.includes("SELECT id FROM users") ? [{ id: ownerId }]
        : sql.includes("SELECT * FROM business_role_assignments") ? [{ id: "old", role: "enterprise" }] : [];
    return { rows, rowCount: rows.length };
  } };
  const result = await setBusinessRole({ connect: async () => client }, {
    actorOwnerId: "site-owner", businessRole: "distributor", idempotencyKey: "switch-identity", operationHash: "a".repeat(64), reason: "调整业务", targetOwnerId: ownerId,
  });
  assert.equal(result.businessRole, "distributor");
  const end = calls.findIndex((sql) => sql.includes("UPDATE business_role_assignments"));
  const insert = calls.findIndex((sql) => sql.includes("INSERT INTO business_role_assignments"));
  assert.ok(end > calls.indexOf("BEGIN") && insert > end && calls.indexOf("COMMIT") > insert);
  assert.equal(calls.some((sql) => /DELETE|UPDATE credit_accounts/.test(sql)), false);
});

test("GG-049 all distribution reads reject enterprise, personal and unknown role before data lookup", async () => {
  for (const role of ["enterprise", null, "unknown"]) for (const read of [readDistributionSummary, listDirectChildren, listCreditTransfers]) {
    const value = boundary(role);
    await assert.rejects(read(value.pool, { ownerId }), (error) => error.code === "BUSINESS_ROLE_REQUIRED" && error.status === 403);
    assert.equal(value.calls.length, 1);
  }
});

test("GG-049 active distributor retains empty reads and suspended distributor is denied", async () => {
  const value = boundary("distributor");
  assert.equal((await readDistributionSummary(value.pool, { ownerId })).businessRole, "distributor");
  assert.deepEqual(await listDirectChildren(value.pool, { ownerId }), []);
  assert.deepEqual(await listCreditTransfers(value.pool, { ownerId }), { items: [], next: null });
  await assert.rejects(readDistributionSummary(boundary("distributor", { status: "suspended" }).pool, { ownerId }),
    (error) => error.code === "ACCOUNT_ACCESS_REQUIRED");
});

test("GG-049 new and replayed transfers reject enterprise before replay lookup, rollback without mutation", async () => {
  for (const replay of [false, true]) {
    const value = boundary("enterprise", { replay });
    await assert.rejects(createCreditTransfer(value.pool, input), (error) => error.code === "BUSINESS_ROLE_REQUIRED" && error.status === 403);
    assert.equal(value.calls.at(-2).sql, "ROLLBACK");
    assert.equal(value.calls.at(-1).sql, "RELEASE");
    assert.equal(value.calls.some(({ sql }) => /FROM credit_transfers|^\s*(UPDATE|INSERT INTO)/.test(sql)), false);
  }
});

test("GG-049 distributor replay returns original reference only after current role check, with no second write", async () => {
  const value = boundary("distributor", { replay: true });
  const result = await createCreditTransfer(value.pool, input);
  assert.equal(result.created, false);
  assert.equal(result.transfer.id, "trf_existing");
  const role = value.calls.findIndex(({ sql }) => sql.includes("SELECT account.id"));
  const replay = value.calls.findIndex(({ sql }) => sql.includes("FROM credit_transfers transfer"));
  assert.ok(role >= 0 && replay > role);
  assert.equal(value.calls.some(({ sql }) => /^\s*(UPDATE|INSERT INTO)/.test(sql)), false);
});

test("GG-049 eligible parents are active distributors; enterprise parent fails before relationship update", async () => {
  await listEligibleBusinessParents({ async query(sql) {
    assert.match(sql, /account.status = 'active'/);
    assert.match(sql, /assignment.ended_at IS NULL AND assignment.role = 'distributor'/);
    return { rows: [] };
  } });
  const calls = [];
  const client = { release() {}, async query(sql) {
    calls.push(sql);
    const rows = sql.includes("FROM system_role_assignments") ? [{ authorized: 1 }]
      : sql.includes("FROM users") ? [{ id: ownerId }, { id: childId }]
        : sql.includes("SELECT assignment.role") ? [{ role: "enterprise" }] : [];
    return { rows, rowCount: rows.length };
  } };
  await assert.rejects(setDirectParent({ connect: async () => client }, {
    actorOwnerId: "site-owner", parentOwnerId: ownerId, targetOwnerId: childId,
    idempotencyKey: "bind-parent", operationHash: "a".repeat(64), reason: "绑定上下级",
  }), (error) => error.code === "ADMIN_PARENT_BUSINESS_ROLE_REQUIRED");
  assert.equal(calls.some((sql) => /UPDATE account_relationships|INSERT INTO account_relationships/.test(sql)), false);
  assert.equal(calls.at(-1), "ROLLBACK");
});

test("GG-049 legacy account links follow the single current role; company and creative links stay unchanged", () => {
  for (const tab of ["accounts", "transfers"]) {
    const legacy = { kind: "enterpriseAccounts", tab };
    for (const role of ["enterprise", null, undefined]) assert.deepEqual(canonicalBusinessRoute(legacy, role), { kind: "organizations" });
    assert.deepEqual(canonicalBusinessRoute(legacy, "distributor"), tab === "transfers" ? { kind: "distribution", tab } : { kind: "distribution" });
  }
  for (const tab of [undefined, "transfers"]) assert.deepEqual(canonicalBusinessRoute({ kind: "distribution", tab }, "enterprise"), { kind: "organizations" });
  for (const route of [{ kind: "create" }, { kind: "project", projectId: "p" }, { kind: "organizations", organizationId: "company" }]) {
    for (const role of [null, "enterprise", "distributor"]) assert.equal(canonicalBusinessRoute(route, role), route);
  }
});

test("GG-049 enterprise UI has no transfer branch or identity switch; admin explains separate accounts", async () => {
  const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
  const page = await source("app/page.tsx");
  const navigation = await source("features/organizations/enterprise-management-navigation.tsx");
  const distributor = await source("features/distribution/business-management-view.tsx");
  const admin = await source("features/admin/account-management-page.tsx");
  assert.doesNotMatch(page + navigation, /allocationEnabled|enterpriseAccountTab|context="enterprise"/);
  assert.doesNotMatch(navigation, /直属账户|划拨记录|enterpriseAccounts/);
  assert.match(distributor, /aria-label="分销管理"[\s\S]*客户与下级[\s\S]*划拨记录/);
  assert.doesNotMatch(distributor, /EnterpriseManagementNavigation|context:/);
  assert.match(admin, /一个账户只能选择一个身份[\s\S]*两种业务请使用不同账户/);
  assert.doesNotMatch(page, /WorkspaceSwitcher|mobile-workspace-switcher/);
});
