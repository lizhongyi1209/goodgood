import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import test from "node:test";
import pg from "pg";
import { listCreditActivities, summarizeCreditActivitySpend } from "../server/billing/activity-repository.mjs";
import { grantCredits } from "../server/billing/repository.mjs";
import { projectSourceAwareCreditBalance } from "../server/billing/policy.mjs";
import {
  createDistributionTransfer,
  readDistribution,
  readDistributionTransfers,
} from "../server/distribution/api.mjs";
import { createDistributionNodeApiHandler } from "../server/distribution/node-api.mjs";
import {
  createCreditTransfer,
  listCreditTransfers,
  listDirectChildren,
} from "../server/distribution/repository.mjs";
import { applyMigrations } from "../server/persistence/migrate.mjs";

const { Pool } = pg;
const integrationRequested =
  process.env.GOODGOOD_GG027_TRANSFER_INTEGRATION === "1";
const explicitDatabaseUrl = process.env.GOODGOOD_GG027_TRANSFER_DATABASE_URL;
if (integrationRequested && !explicitDatabaseUrl) {
  throw new Error(
    "GOODGOOD_GG027_TRANSFER_DATABASE_URL must name an isolated test database when transfer integration is enabled.",
  );
}
const integrationEnabled = integrationRequested && Boolean(explicitDatabaseUrl);
const databaseUrl = explicitDatabaseUrl ?? "";

const OWNER_CONTEXT = Object.freeze({
  ownerId: "10000000-0000-4000-8000-000000000001",
});
const CHILD_ID = "20000000-0000-4000-8000-000000000002";

test("GG-027 transfer migration adds paired payment-funded ledger types without commerce fields", async () => {
  const [migration, schema, policy, repository, runtime, contract] = await Promise.all([
    readFile(
      new URL("../migrations/0022_gg027_credit_transfers.sql", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../server/billing/policy.mjs", import.meta.url), "utf8"),
    readFile(new URL("../server/distribution/repository.mjs", import.meta.url), "utf8"),
    readFile(new URL("../server/runtime/web.mjs", import.meta.url), "utf8"),
    readFile(new URL("../shared/contracts/distribution.ts", import.meta.url), "utf8"),
  ]);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS credit_transfers/);
  assert.match(migration, /'transfer_out', 'transfer_in'/);
  assert.match(migration, /parent_ledger_entry_id/);
  assert.match(migration, /child_ledger_entry_id/);
  assert.match(migration, /credit_transfers_append_only/);
  assert.doesNotMatch(migration, /price|currency|money|commission|payment_order/i);
  assert.match(schema, /export const creditTransfers/);
  assert.match(policy, /"transfer_out"/);
  assert.match(repository, /payment_funded_available_balance/);
  assert.match(repository, /account-hierarchy:mutate/);
  assert.match(runtime, /handleDistributionNodeApi/);
  assert.match(contract, /direction: "outgoing" \| "incoming"/);
});

test("GG-027 transfer projections preserve payment-funded source on both sides", () => {
  const parent = projectSourceAwareCreditBalance(
    {
      available: 300n,
      paymentFundedAvailable: 200n,
      paymentFundedReserved: 0n,
      reserved: 0n,
    },
    "transfer_out",
    -150n,
    -150n,
  );
  assert.deepEqual(parent, {
    available: 150n,
    paymentFundedAvailable: 50n,
    paymentFundedReserved: 0n,
    reserved: 0n,
  });
  assert.deepEqual(
    projectSourceAwareCreditBalance(
      {
        available: 0n,
        paymentFundedAvailable: 0n,
        paymentFundedReserved: 0n,
        reserved: 0n,
      },
      "transfer_in",
      150n,
      150n,
    ),
    {
      available: 150n,
      paymentFundedAvailable: 150n,
      paymentFundedReserved: 0n,
      reserved: 0n,
    },
  );
});

test("GG-027 distribution API validates exact amounts and uses owner-scoped repositories", async () => {
  let transferInput;
  const repository = {
    async createCreditTransfer(_pool, input) {
      transferInput = input;
      return { account: {}, created: true, transfer: {} };
    },
    async listCreditTransfers(_pool, input) {
      assert.equal(input.ownerId, OWNER_CONTEXT.ownerId);
      return { items: [], next: null };
    },
    async readDistributionSummary(_pool, input) {
      assert.equal(input.ownerId, OWNER_CONTEXT.ownerId);
      return { account: {}, businessRole: "distributor", directChildCount: 0 };
    },
  };
  await createDistributionTransfer({
    idempotencyKey: "transfer-api-0001",
    input: { amount: "125", childOwnerId: CHILD_ID, remark: "线下结算 A" },
    ownerContext: OWNER_CONTEXT,
    repository,
    resources: { pool: {} },
  });
  assert.equal(transferInput.amount, 125n);
  assert.equal(transferInput.ownerId, OWNER_CONTEXT.ownerId);
  assert.equal(transferInput.operationHash.length, 64);

  assert.equal(
    (await readDistribution({
      ownerContext: OWNER_CONTEXT,
      repository,
      resources: { pool: {} },
    })).businessRole,
    "distributor",
  );
  assert.deepEqual(
    await readDistributionTransfers({
      ownerContext: OWNER_CONTEXT,
      repository,
      resources: { pool: {} },
    }),
    { items: [], nextCursor: null },
  );

  for (const amount of [0, -1, 1.5, "01", "1.5", "9223372036854775808"]) {
    await assert.rejects(
      createDistributionTransfer({
        idempotencyKey: `invalid-${String(amount)}`,
        input: { amount, childOwnerId: CHILD_ID },
        ownerContext: OWNER_CONTEXT,
        repository,
        resources: { pool: {} },
      }),
      (error) => error.code === "CREDIT_TRANSFER_REQUEST_INVALID",
    );
  }
});

test("GG-027 transfer POST fails closed without its CSRF marker", async () => {
  let called = false;
  let statusCode;
  let payload;
  const handler = createDistributionNodeApiHandler({
    authenticate: async () => OWNER_CONTEXT,
    operations: {
      async createDistributionTransfer() {
        called = true;
      },
    },
  });
  const request = Readable.from([
    JSON.stringify({ amount: "10", childOwnerId: CHILD_ID }),
  ]);
  request.method = "POST";
  request.url = "/api/distribution/transfers";
  request.headers = { "content-type": "application/json" };
  const response = {
    end(value) {
      payload = JSON.parse(value);
    },
    writeHead(value) {
      statusCode = value;
    },
  };
  assert.equal(await handler(request, response), true);
  assert.equal(called, false);
  assert.equal(statusCode, 403);
  assert.equal(payload.error.code, "DISTRIBUTION_CSRF_CHECK_FAILED");
});

function transferInput({ amount, childOwnerId, key, ownerId, remark = null }) {
  return {
    amount: BigInt(amount),
    childOwnerId,
    idempotencyKey: key,
    operationHash: key.padEnd(64, "0").slice(0, 64),
    ownerId,
    remark,
  };
}

async function insertBusinessRole(pool, { actorId, ownerId, role, suffix }) {
  await pool.query(
    `INSERT INTO business_role_assignments (
       id, owner_id, role, assigned_by_owner_id, assignment_reason,
       assigned_idempotency_key, assigned_operation_hash
     ) VALUES ($1, $2, $3, $4, 'GG-027 transfer test role', $5, $6)`,
    [randomUUID(), ownerId, role, actorId, `role-${suffix}`, "a".repeat(64)],
  );
}

async function insertRelationship(pool, { actorId, childId, parentId, suffix }) {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO account_relationships (
       id, parent_owner_id, child_owner_id, created_by_owner_id,
       relationship_reason, created_idempotency_key, created_operation_hash
     ) VALUES ($1, $2, $3, $4, 'GG-027 transfer test relationship', $5, $6)`,
    [id, parentId, childId, actorId, `relationship-${suffix}`, "b".repeat(64)],
  );
  return id;
}

test(
  "GG-027 PostgreSQL transfers are zero-sum, direct-only, replay-safe, and concurrency-safe",
  { skip: !integrationEnabled, timeout: 30_000 },
  async (context) => {
    const pool = new Pool({ connectionString: databaseUrl, max: 8 });
    context.after(() => pool.end());
    await applyMigrations({ databaseUrl, logger: { log() {} } });

    const suffix = `${Date.now()}-${randomUUID()}`;
    const actorId = randomUUID();
    const parentId = randomUUID();
    const childId = randomUUID();
    const secondChildId = randomUUID();
    const grandchildId = randomUUID();
    for (const [id, label] of [
      [actorId, "actor"],
      [parentId, "parent"],
      [childId, "child"],
      [secondChildId, "second-child"],
      [grandchildId, "grandchild"],
    ]) {
      await pool.query(
        "INSERT INTO users (id, email, status) VALUES ($1, $2, 'active')",
        [id, `${label}-${suffix}@goodgood.invalid`],
      );
    }
    await insertBusinessRole(pool, {
      actorId,
      ownerId: parentId,
      role: "distributor",
      suffix: `parent-${suffix}`,
    });
    await insertBusinessRole(pool, {
      actorId,
      ownerId: childId,
      role: "distributor",
      suffix: `child-${suffix}`,
    });
    await insertRelationship(pool, {
      actorId,
      childId,
      parentId,
      suffix: `child-${suffix}`,
    });
    await insertRelationship(pool, {
      actorId,
      childId: secondChildId,
      parentId,
      suffix: `second-child-${suffix}`,
    });
    await insertRelationship(pool, {
      actorId,
      childId: grandchildId,
      parentId: childId,
      suffix: `grandchild-${suffix}`,
    });

    await grantCredits(pool, {
      amount: 100n,
      idempotencyKey: `non-transferable-${suffix}`,
      ownerId: parentId,
      reason: "GG-027 non-transferable fixture",
    });
    await grantCredits(pool, {
      actor: "payment",
      amount: 200n,
      idempotencyKey: `payment-funded-${suffix}`,
      ownerId: parentId,
      reason: "GG-027 payment fixture",
      relatedPaymentRef: `manual_${randomUUID().replaceAll("-", "")}`,
      sourceClass: "payment_funded",
    });

    const firstInput = transferInput({
      amount: 150,
      childOwnerId: childId,
      key: `first-transfer-${suffix}`,
      ownerId: parentId,
      remark: "首笔线下划拨",
    });
    const first = await createCreditTransfer(pool, firstInput);
    assert.equal(first.created, true);
    assert.match(first.transfer.id, /^trf_[0-9a-f]{32}$/);
    assert.equal(first.account.availableCredits, "150");
    assert.equal(first.account.transferableCredits, "50");
    assert.equal((await createCreditTransfer(pool, firstInput)).created, false);

    const balancesAfterFirst = await pool.query(
      `SELECT owner_id, available_balance, payment_funded_available_balance
         FROM credit_accounts
        WHERE owner_id = ANY($1::uuid[])
        ORDER BY owner_id`,
      [[parentId, childId]],
    );
    const parentBalance = balancesAfterFirst.rows.find((row) => row.owner_id === parentId);
    const childBalance = balancesAfterFirst.rows.find((row) => row.owner_id === childId);
    assert.deepEqual(
      [String(parentBalance.available_balance), String(parentBalance.payment_funded_available_balance)],
      ["150", "50"],
    );
    assert.deepEqual(
      [String(childBalance.available_balance), String(childBalance.payment_funded_available_balance)],
      ["150", "150"],
    );

    const childTransfer = await createCreditTransfer(
      pool,
      transferInput({
        amount: 100,
        childOwnerId: grandchildId,
        key: `downstream-${suffix}`,
        ownerId: childId,
      }),
    );
    assert.equal(childTransfer.account.transferableCredits, "50");
    await grantCredits(pool, {
      amount: 100n,
      idempotencyKey: `child-promotion-${suffix}`,
      ownerId: childId,
      reason: "GG-027 child promotional fixture",
    });
    await assert.rejects(
      createCreditTransfer(
        pool,
        transferInput({
          amount: 60,
          childOwnerId: grandchildId,
          key: `excess-${suffix}`,
          ownerId: childId,
        }),
      ),
      (error) =>
        error.code === "INSUFFICIENT_TRANSFERABLE_POINTS" && error.status === 409,
    );
    await assert.rejects(
      createCreditTransfer(
        pool,
        transferInput({
          amount: 1,
          childOwnerId: grandchildId,
          key: `indirect-${suffix}`,
          ownerId: parentId,
        }),
      ),
      (error) => error.code === "DIRECT_CHILD_NOT_FOUND" && error.status === 404,
    );

    const concurrent = await Promise.allSettled([
      createCreditTransfer(
        pool,
        transferInput({
          amount: 40,
          childOwnerId: childId,
          key: `concurrent-a-${suffix}`,
          ownerId: parentId,
        }),
      ),
      createCreditTransfer(
        pool,
        transferInput({
          amount: 40,
          childOwnerId: secondChildId,
          key: `concurrent-b-${suffix}`,
          ownerId: parentId,
        }),
      ),
    ]);
    assert.equal(concurrent.filter((item) => item.status === "fulfilled").length, 1);
    assert.equal(concurrent.filter((item) => item.status === "rejected").length, 1);
    assert.equal(
      concurrent.find((item) => item.status === "rejected").reason.code,
      "INSUFFICIENT_TRANSFERABLE_POINTS",
    );

    const children = await listDirectChildren(pool, { ownerId: parentId });
    assert.equal(children.length, 2);
    assert.equal(
      children.find((item) => item.id === childId).allocatedCredits,
      concurrent[0].status === "fulfilled" ? "190" : "150",
    );
    const history = await listCreditTransfers(pool, {
      limit: 20,
      ownerId: parentId,
    });
    assert.equal(history.items.filter((item) => item.direction === "outgoing").length, 2);

    const activity = await listCreditActivities(pool, {
      filter: "all",
      limit: 20,
      ownerId: childId,
    });
    assert.ok(activity.items.some((item) => item.kind === "transfer_in"));
    assert.ok(activity.items.some((item) => item.kind === "transfer_out"));
    assert.deepEqual(await summarizeCreditActivitySpend(pool, { ownerId: childId }), {
      thisMonth: "0",
      thisWeek: "0",
      today: "0",
    });

    const invariant = await pool.query(
      `SELECT sum(available_balance + reserved_balance)::text AS total,
              sum(payment_funded_available_balance + payment_funded_reserved_balance)::text
                AS payment_total
         FROM credit_accounts
        WHERE owner_id = ANY($1::uuid[])`,
      [[parentId, childId, secondChildId, grandchildId]],
    );
    assert.deepEqual(invariant.rows[0], { payment_total: "200", total: "400" });
    const transferEntries = await pool.query(
      `SELECT sum(amount)::text AS amount,
              sum(payment_funded_amount)::text AS payment_amount
         FROM credit_ledger_entries
        WHERE entry_type IN ('transfer_out', 'transfer_in')`,
    );
    assert.deepEqual(transferEntries.rows[0], { amount: "0", payment_amount: "0" });
  },
);
