import test from "node:test";
import assert from "node:assert/strict";
import { closeVideoJob } from "../server/video-generation/repository.mjs";
import { quoteVideoCredits } from "../server/video-generation/pricing.mjs";

// Transactional, in-memory SQL boundary: never attaches to a database or Worker.
function boundary({ rejectRefund = false } = {}) {
  const price = quoteVideoCredits({ modelId: "seedance-2-5", seedanceLine: "standard", resolution: "720p", type: "text_to_video", duration: -1 }, [], {});
  let state = {
    job: { id: "synthetic-video", owner_id: "synthetic-owner", workspace_id: "synthetic-workspace", model_id: "seedance-2-5",
      input_snapshot: { resolution: "720p" }, price_snapshot: price, reserved_credit_amount: "480", charged_credit_amount: "0",
      state: "saving", lease_owner: "synthetic-lease", credit_reservation_entry_id: "reservation" },
    account: { id: "synthetic-account", owner_id: "synthetic-owner", unit: "point", status: "active", available_balance: "500", reserved_balance: "480",
      payment_funded_available_balance: "50", payment_funded_reserved_balance: "400", version: "1", created_at: new Date(0), updated_at: new Date(0) },
    ledger: [{ id: "reservation", account_id: "synthetic-account", amount: "-480", payment_funded_amount: "-400", entry_type: "reserve" }], assets: [],
  };
  let snapshot; const statements = [];
  const result = (rows = []) => ({ rows: rows.map((row) => structuredClone(row)), rowCount: rows.length });
  const client = { release() {}, async query(sql, args = []) {
    statements.push(sql);
    if (sql === "BEGIN") { snapshot = structuredClone(state); return result(); }
    if (sql === "COMMIT") { snapshot = null; return result(); }
    if (sql === "ROLLBACK") { state = snapshot; return result(); }
    if (sql.startsWith("SELECT w.id")) return result([{ id: state.job.workspace_id }]);
    if (sql.includes("SELECT * FROM video_generation_jobs")) return result([state.job]);
    if (sql.includes("FROM credit_ledger_entries")) return result(state.ledger.filter((entry) => sql.includes("idempotency_key") ? entry.account_id === args[0] && entry.idempotency_key === args[1] : entry.id === args[0]));
    if (sql.includes("SELECT * FROM credit_accounts")) return result([state.account]);
    if (sql.includes("UPDATE credit_accounts")) {
      state.account.available_balance = String(BigInt(state.account.available_balance) + BigInt(args[1]));
      state.account.reserved_balance = String(BigInt(state.account.reserved_balance) + BigInt(args[2]));
      state.account.payment_funded_available_balance = args[3]; state.account.payment_funded_reserved_balance = args[4];
      state.account.version = String(BigInt(state.account.version) + 1n); return result([state.account]);
    }
    if (sql.includes("INSERT INTO credit_ledger_entries")) {
      if (rejectRefund && args[3] === "refund") throw new Error("synthetic refund write failure");
      const entry = { id: args[0], account_id: args[1], owner_id: args[2], entry_type: args[3], amount: args[4], payment_funded_amount: args[5],
        idempotency_key: args[6], operation_hash: args[7], reason: args[8], prior_entry_id: args[11], actor: args[12], metadata: JSON.parse(args[13]), related_video_job_id: args[16], created_at: new Date(0) };
      state.ledger.push(entry); return result([entry]);
    }
    if (sql.includes("INSERT INTO video_materials")) { state.assets.push({ id: args[0] }); return result(); }
    if (sql.includes("UPDATE video_generation_jobs")) { state.job.state = args[1]; state.job.charged_credit_amount = args[2]; state.job.lease_owner = null; return result([state.job]); }
    throw new Error(`Unexpected synthetic SQL: ${sql}`);
  } };
  return { pool: { connect: async () => client }, getState: () => structuredClone(state), statements };
}
const request = { jobId: "synthetic-video", leaseOwner: "synthetic-lease", succeeded: true,
  output: { key: "synthetic/private-result", name: "Seedance_synthetic.mp4", byteSize: 1000, pixelWidth: 1280, pixelHeight: 720, durationSeconds: 6 } };

test("successful automatic-duration settlement refunds the difference atomically with funded provenance", async () => {
  const db = boundary(); await closeVideoJob(db.pool, request);
  const { job, account, ledger, assets } = db.getState();
  assert.equal(job.state, "succeeded"); assert.equal(job.charged_credit_amount, 96);
  assert.equal(account.reserved_balance, "0"); assert.equal(account.available_balance, "884");
  assert.equal(account.payment_funded_available_balance, "434"); assert.equal(account.payment_funded_reserved_balance, "0");
  assert.deepEqual(ledger.slice(1).map((entry) => [entry.entry_type, entry.amount, entry.payment_funded_amount]), [["settle", "-480", "-400"], ["refund", "384", "384"]]);
  assert.equal(ledger[2].prior_entry_id, ledger[1].id); assert.equal(ledger[2].reason, "video_generation_duration_refund");
  assert.equal(assets.length, 1); assert.equal(db.statements.at(-1), "COMMIT");
  assert.equal(await closeVideoJob(db.pool, request), null); assert.equal(db.getState().ledger.length, 3);
});

test("a failed refund rolls back the result and full settlement, preserving the reservation", async () => {
  const db = boundary({ rejectRefund: true }); const before = db.getState();
  await assert.rejects(() => closeVideoJob(db.pool, request), /refund write failure/);
  assert.deepEqual(db.getState(), before); assert.equal(db.statements.at(-1), "ROLLBACK");
});

test("failed generation releases its whole reservation rather than charging an automatic duration", async () => {
  const db = boundary(); await closeVideoJob(db.pool, { ...request, succeeded: false, output: null, errorCode: "VIDEO_PROVIDER_FAILED" });
  const { job, account, ledger } = db.getState();
  assert.equal(job.charged_credit_amount, 0); assert.equal(job.state, "failed");
  assert.equal(account.available_balance, "980"); assert.equal(account.payment_funded_available_balance, "450");
  assert.deepEqual(ledger.slice(1).map((entry) => entry.entry_type), ["release"]);
});
