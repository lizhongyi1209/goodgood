import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import pg from "pg";
import {
  updateAdminBusinessRole,
  updateAdminDirectParent,
} from "../server/admin/api.mjs";
import {
  listManagedAccounts,
  setBusinessRole,
  setDirectParent,
} from "../server/admin/repository.mjs";
import { applyMigrations } from "../server/persistence/migrate.mjs";

const { Pool } = pg;
const integrationRequested =
  process.env.GOODGOOD_GG027_HIERARCHY_INTEGRATION === "1";
const explicitDatabaseUrl =
  process.env.GOODGOOD_GG027_HIERARCHY_DATABASE_URL;
if (integrationRequested && !explicitDatabaseUrl) {
  throw new Error(
    "GOODGOOD_GG027_HIERARCHY_DATABASE_URL must name an isolated test database when hierarchy integration is enabled.",
  );
}
const integrationEnabled = integrationRequested && Boolean(explicitDatabaseUrl);
const databaseUrl = explicitDatabaseUrl ?? "";

const SITE_OWNER = Object.freeze({
  ownerId: "10000000-0000-4000-8000-000000000001",
  systemRole: "site_owner",
});
const TARGET_OWNER = "20000000-0000-4000-8000-000000000002";

test("GG-027 hierarchy migration keeps role and relationship history without mutable deletion", async () => {
  const [migration, schema, repository, routes, boundary] = await Promise.all([
    readFile(
      new URL("../migrations/0021_gg027_business_hierarchy.sql", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../server/admin/repository.mjs", import.meta.url), "utf8"),
    readFile(new URL("../server/admin/node-api.mjs", import.meta.url), "utf8"),
    readFile(
      new URL("../features/admin/http-admin-boundary.ts", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(migration, /CREATE TABLE IF NOT EXISTS business_role_assignments/);
  assert.match(migration, /role IN \('enterprise', 'distributor'\)/);
  assert.match(migration, /business_role_assignments_active_owner_unique/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS account_relationships/);
  assert.match(migration, /account_relationships_active_child_unique/);
  assert.match(migration, /parent_owner_id <> child_owner_id/);
  assert.match(migration, /may only be ended once/);
  assert.match(migration, /set_business_role/);
  assert.match(migration, /set_direct_parent/);
  assert.match(schema, /export const businessRoleAssignments/);
  assert.match(schema, /export const accountRelationships/);
  assert.match(repository, /WITH RECURSIVE descendants/);
  assert.match(repository, /account-hierarchy:mutate/);
  assert.match(routes, /business-role/);
  assert.match(routes, /direct-parent/);
  assert.match(boundary, /transferableCredits: string/);
});

test("GG-027 site-owner APIs separate business roles from system roles", async () => {
  let roleInput;
  let parentInput;
  const repository = {
    async setBusinessRole(_pool, input) {
      roleInput = input;
      return {
        actionType: "set_business_role",
        businessRole: input.businessRole,
        created: true,
      };
    },
    async setDirectParent(_pool, input) {
      parentInput = input;
      return {
        actionType: "set_direct_parent",
        created: true,
        directParentId: input.parentOwnerId,
      };
    },
  };

  await updateAdminBusinessRole({
    idempotencyKey: "business-role-0001",
    input: { reason: "签约企业账户", role: "enterprise" },
    ownerContext: SITE_OWNER,
    repository,
    resources: { pool: {} },
    targetOwnerId: TARGET_OWNER,
  });
  assert.equal(roleInput.actorOwnerId, SITE_OWNER.ownerId);
  assert.equal(roleInput.businessRole, "enterprise");
  assert.equal(roleInput.operationHash.length, 64);

  await updateAdminDirectParent({
    idempotencyKey: "direct-parent-0001",
    input: {
      parentOwnerId: SITE_OWNER.ownerId,
      reason: "调整直属关系",
    },
    ownerContext: SITE_OWNER,
    repository,
    resources: { pool: {} },
    targetOwnerId: TARGET_OWNER,
  });
  assert.equal(parentInput.parentOwnerId, SITE_OWNER.ownerId);
  assert.equal(parentInput.targetOwnerId, TARGET_OWNER);

  await assert.rejects(
    updateAdminBusinessRole({
      idempotencyKey: "business-role-0002",
      input: { reason: "无效身份", role: "site_owner" },
      ownerContext: SITE_OWNER,
      repository,
      resources: { pool: {} },
      targetOwnerId: TARGET_OWNER,
    }),
    (error) => error.code === "ADMIN_REQUEST_INVALID" && error.status === 400,
  );
  await assert.rejects(
    updateAdminBusinessRole({
      idempotencyKey: "business-role-0003",
      input: { reason: "越权修改", role: "distributor" },
      ownerContext: { ...SITE_OWNER, systemRole: "member" },
      repository,
      resources: { pool: {} },
      targetOwnerId: TARGET_OWNER,
    }),
    (error) => error.code === "ADMIN_ACCESS_DENIED" && error.status === 403,
  );
});

function hierarchyInput({ actorOwnerId, key, parentOwnerId, role, targetOwnerId }) {
  const common = {
    actorOwnerId,
    idempotencyKey: key,
    operationHash: key.padEnd(64, "0").slice(0, 64),
    reason: "GG-027 隔离数据库关系测试",
    targetOwnerId,
  };
  return parentOwnerId === undefined
    ? { ...common, businessRole: role }
    : { ...common, parentOwnerId };
}

test(
  "GG-027 PostgreSQL hierarchy enforces one direct parent, replay safety, and cycle rejection",
  { skip: !integrationEnabled, timeout: 30_000 },
  async (context) => {
    const pool = new Pool({ connectionString: databaseUrl, max: 4 });
    context.after(() => pool.end());
    await applyMigrations({ databaseUrl, logger: { log() {} } });

    const suffix = `${Date.now()}-${randomUUID()}`;
    const ownerId = randomUUID();
    const enterpriseId = randomUUID();
    const distributorId = randomUUID();
    const childId = randomUUID();
    const grandchildId = randomUUID();
    const users = [
      [ownerId, `owner-${suffix}@goodgood.invalid`],
      [enterpriseId, `enterprise-${suffix}@goodgood.invalid`],
      [distributorId, `distributor-${suffix}@goodgood.invalid`],
      [childId, `child-${suffix}@goodgood.invalid`],
      [grandchildId, `grandchild-${suffix}@goodgood.invalid`],
    ];
    for (const [id, email] of users) {
      await pool.query(
        "INSERT INTO users (id, email, status) VALUES ($1, $2, 'active')",
        [id, email],
      );
    }
    await pool.query(
      `INSERT INTO system_role_assignments (
         id, owner_id, role, source, assigned_by_operator_id, reason,
         idempotency_key, operation_hash
       ) VALUES ($1, $2, 'site_owner', 'bootstrap', 'gg027-test',
         'GG-027 isolated test owner', $3, $4)`,
      [randomUUID(), ownerId, `owner-${suffix}`, "f".repeat(64)],
    );

    const enterpriseRole = hierarchyInput({
      actorOwnerId: ownerId,
      key: `role-enterprise-${suffix}`,
      role: "enterprise",
      targetOwnerId: enterpriseId,
    });
    assert.deepEqual(await setBusinessRole(pool, enterpriseRole), {
      actionType: "set_business_role",
      businessRole: "enterprise",
      created: true,
    });
    assert.deepEqual(await setBusinessRole(pool, enterpriseRole), {
      actionType: "set_business_role",
      businessRole: "enterprise",
      created: false,
    });
    await setBusinessRole(
      pool,
      hierarchyInput({
        actorOwnerId: ownerId,
        key: `role-distributor-${suffix}`,
        role: "distributor",
        targetOwnerId: distributorId,
      }),
    );
    await setBusinessRole(
      pool,
      hierarchyInput({
        actorOwnerId: ownerId,
        key: `role-child-${suffix}`,
        role: "distributor",
        targetOwnerId: childId,
      }),
    );
    await setBusinessRole(
      pool,
      hierarchyInput({
        actorOwnerId: ownerId,
        key: `role-grandchild-${suffix}`,
        role: "enterprise",
        targetOwnerId: grandchildId,
      }),
    );

    await setDirectParent(
      pool,
      hierarchyInput({
        actorOwnerId: ownerId,
        key: `parent-child-${suffix}`,
        parentOwnerId: enterpriseId,
        targetOwnerId: childId,
      }),
    );
    await setDirectParent(
      pool,
      hierarchyInput({
        actorOwnerId: ownerId,
        key: `parent-grandchild-${suffix}`,
        parentOwnerId: childId,
        targetOwnerId: grandchildId,
      }),
    );

    await assert.rejects(
      setDirectParent(
        pool,
        hierarchyInput({
          actorOwnerId: ownerId,
          key: `cycle-${suffix}`,
          parentOwnerId: grandchildId,
          targetOwnerId: enterpriseId,
        }),
      ),
      (error) => error.code === "ADMIN_RELATIONSHIP_CYCLE" && error.status === 409,
    );
    const failedAudit = await pool.query(
      "SELECT count(*)::int AS count FROM administrative_actions WHERE idempotency_key = $1",
      [`cycle-${suffix}`],
    );
    assert.equal(failedAudit.rows[0].count, 0);

    await setDirectParent(
      pool,
      hierarchyInput({
        actorOwnerId: ownerId,
        key: `replace-parent-${suffix}`,
        parentOwnerId: distributorId,
        targetOwnerId: childId,
      }),
    );
    const relationships = await pool.query(
      `SELECT parent_owner_id, ended_at
         FROM account_relationships
        WHERE child_owner_id = $1
        ORDER BY created_at, id`,
      [childId],
    );
    assert.equal(relationships.rowCount, 2);
    assert.ok(relationships.rows[0].ended_at);
    assert.equal(relationships.rows[1].parent_owner_id, distributorId);
    assert.equal(relationships.rows[1].ended_at, null);

    const accounts = await listManagedAccounts(pool, {
      cursor: null,
      limit: 20,
      query: `child-${suffix}`,
      status: "active",
    });
    const childAccount = accounts.items.find((item) => item.id === childId);
    assert.ok(childAccount);
    assert.equal(childAccount.businessRole, "distributor");
    assert.equal(childAccount.directParentId, distributorId);
    assert.equal(childAccount.transferableCredits, "0");

    await assert.rejects(
      setBusinessRole(
        pool,
        hierarchyInput({
          actorOwnerId: enterpriseId,
          key: `unauthorized-${suffix}`,
          role: "enterprise",
          targetOwnerId: distributorId,
        }),
      ),
      (error) => error.code === "ADMIN_ACCESS_DENIED" && error.status === 403,
    );
  },
);
