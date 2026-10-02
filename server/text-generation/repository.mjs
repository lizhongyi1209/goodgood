import { createHash } from "node:crypto";
import { appendCreditEntryInTransaction, BillingPersistenceError, runCreditTransaction } from "../billing/repository.mjs";
import { paymentFundedPortionForReservation } from "../billing/policy.mjs";
import { reserveOrganizationGenerationCreditsInTransaction, settleOrganizationGenerationCreditsInTransaction, releaseOrganizationGenerationCreditsInTransaction } from "../organizations/credit-repository.mjs";
import { resolveWorkspaceAccess } from "../organizations/workspace-access.mjs";
import { CREDIT_UNIT } from "../../shared/contracts/model-pricing.mjs";
import { getTextGenerationModel, TEXT_GENERATION_CREDIT_COST } from "../../shared/contracts/text-generation.mjs";
import { TextGenerationError } from "./errors.mjs";
import { textGenerationCreditOutcome, textCancellationPaymentFundedRefund } from "./credit-policy.mjs";

const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function textGenerationSnapshot(input) {
  return { modelId: input.modelId, ...(input.presetId ? { presetId: input.presetId } : {}), prompt: input.prompt, history: input.history, media: input.media.map(({ frames, ...item }) =>
    ({ ...item, ...(frames ? { frameChecksums: frames.map((frame) => hash(frame)) } : {}) })) };
}
function metadata(job) {
  return { activityCategory: "text_generation", batchReference: job.id, textGenerationJobId: job.id,
    projectId: job.canvas_project_id, projectName: job.source_project_name,
    modelName: getTextGenerationModel(job.model_id)?.name ?? job.model_id, fixedCreditAmount: TEXT_GENERATION_CREDIT_COST };
}
export async function beginTextGeneration(pool, { input, ownerId, workspaceId }) {
  return runCreditTransaction(pool, async (client) => {
    const workspace = await resolveWorkspaceAccess(client, { ownerId, workspaceId, write: true });
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`text-generation:${input.requestId}`]);
    const snapshot = textGenerationSnapshot(input);
    const inputHash = hash({ ...snapshot, projectId: input.projectId });
    const existing = await client.query("SELECT * FROM text_generation_jobs WHERE id=$1 FOR UPDATE", [input.requestId]);
    if (existing.rowCount) {
      const job = existing.rows[0];
      if (job.owner_id !== ownerId || job.workspace_id !== workspace.id || job.input_hash !== inputHash) {
        throw new TextGenerationError("TEXT_GENERATION_IDEMPOTENCY_CONFLICT", "这次提交标识已被使用，请重新提交。", 409);
      }
      return { created: false, job };
    }
    let projectName = null;
    if (input.projectId) {
      const project = await client.query(`SELECT p.name FROM canvas_projects p WHERE p.id=$1 AND p.owner_id=$2 AND p.workspace_id=$3
        AND NOT EXISTS (SELECT 1 FROM canvas_project_deletions d WHERE d.project_id=p.id AND d.workspace_id=p.workspace_id)`,
      [input.projectId, ownerId, workspace.id]);
      if (!project.rowCount) throw new TextGenerationError("TEXT_PROJECT_NOT_FOUND", "画布尚未同步，请保存后重试。", 409);
      projectName = project.rows[0].name;
    }
    const inserted = await client.query(`INSERT INTO text_generation_jobs
      (id,owner_id,workspace_id,canvas_project_id,source_project_name,model_id,input_hash,input_snapshot,state,lease_expires_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,'running',now()+interval '11 minutes') RETURNING *`,
    [input.requestId, ownerId, workspace.id, input.projectId, projectName, input.modelId, inputHash, JSON.stringify(snapshot)]);
    const job = inserted.rows[0];
    const key = `text:${job.id}:reserve`;
    if (workspace.kind === "organization") {
      const reserved = await reserveOrganizationGenerationCreditsInTransaction(client, { actorOwnerId: ownerId,
        amount: BigInt(TEXT_GENERATION_CREDIT_COST), idempotencyKey: key, jobId: job.id, metadata: metadata(job),
        operationHash: hash({ jobId: job.id, type: "reserve", amount: TEXT_GENERATION_CREDIT_COST }), workspaceId: workspace.id });
      await client.query("UPDATE text_generation_jobs SET organization_reservation_entry_id=$2 WHERE id=$1", [job.id, reserved.entry.id]);
      job.organization_reservation_entry_id = reserved.entry.id;
    } else {
      const accounts = await client.query("SELECT * FROM credit_accounts WHERE owner_id=$1 AND unit=$2 FOR UPDATE", [ownerId, CREDIT_UNIT]);
      const account = accounts.rows[0];
      if (!account) throw new BillingPersistenceError("INSUFFICIENT_POINTS", "积分不足，请充值后重试。", 409);
      const funded = paymentFundedPortionForReservation({ available: account.available_balance,
        paymentFundedAvailable: account.payment_funded_available_balance ?? 0 }, BigInt(TEXT_GENERATION_CREDIT_COST));
      if (funded === null) throw new BillingPersistenceError("INSUFFICIENT_POINTS", "积分不足，请充值后重试。", 409);
      const reserved = await appendCreditEntryInTransaction(client, { accountRow: account, actor: "system",
        amount: -BigInt(TEXT_GENERATION_CREDIT_COST), paymentFundedAmount: -funded, entryType: "reserve", idempotencyKey: key,
        metadata: metadata(job), reason: "text_generation_reservation", relatedTextJobId: job.id });
      await client.query("UPDATE text_generation_jobs SET credit_reservation_entry_id=$2 WHERE id=$1", [job.id, reserved.entry.id]);
      job.credit_reservation_entry_id = reserved.entry.id;
    }
    return { created: true, job };
  });
}
export async function finishTextGeneration(pool, { jobId, state, output = "", errorCode = null }) {
  const { chargedAmount, refundedAmount } = textGenerationCreditOutcome(state);
  return runCreditTransaction(pool, async (client) => {
    // Match submit's workspace -> job -> account lock order, including organization budgets.
    await client.query("SELECT w.id FROM workspaces w JOIN text_generation_jobs t ON t.workspace_id=w.id WHERE t.id=$1 FOR UPDATE OF w", [jobId]);
    const rows = await client.query("SELECT * FROM text_generation_jobs WHERE id=$1 FOR UPDATE", [jobId]);
    const job = rows.rows[0];
    if (!job || job.state !== "running") return job;
    const settle = chargedAmount > 0;
    const entryType = settle ? "settle" : "release";
    const key = `text:${job.id}:${entryType}`;
    const billingMetadata = { ...metadata(job), chargedCreditAmount: chargedAmount, refundedCreditAmount: refundedAmount };
    if (job.organization_reservation_entry_id) {
      const close = settle ? settleOrganizationGenerationCreditsInTransaction : releaseOrganizationGenerationCreditsInTransaction;
      await close(client, { jobId: job.id, workspaceId: job.workspace_id, actor: "system", idempotencyKey: key,
        refundAmount: settle ? BigInt(refundedAmount) : 0n,
        metadata: billingMetadata, operationHash: hash({ jobId: job.id, type: entryType, chargedAmount, refundedAmount }), reason: `text_generation_${entryType}` });
    } else {
      const entries = await client.query("SELECT * FROM credit_ledger_entries WHERE id=$1", [job.credit_reservation_entry_id]);
      const entry = entries.rows[0];
      if (!entry) throw new TextGenerationError("TEXT_CREDIT_RESERVATION_MISSING", "积分预留记录暂不可用。", 503);
      const accounts = await client.query("SELECT * FROM credit_accounts WHERE id=$1 FOR UPDATE", [entry.account_id]);
      const closed = await appendCreditEntryInTransaction(client, { accountRow: accounts.rows[0], actor: "system", amount: settle ? BigInt(entry.amount) : -BigInt(entry.amount),
        paymentFundedAmount: settle ? BigInt(entry.payment_funded_amount ?? 0) : -BigInt(entry.payment_funded_amount ?? 0),
        entryType, idempotencyKey: key, priorEntryId: entry.id, metadata: billingMetadata, reason: `text_generation_${entryType}`, relatedTextJobId: job.id });
      if (settle && refundedAmount > 0) {
        // Close the full reservation once, then refund the unused half atomically.
        const settledAccount = await client.query("SELECT * FROM credit_accounts WHERE id=$1 FOR UPDATE", [entry.account_id]);
        await appendCreditEntryInTransaction(client, { accountRow: settledAccount.rows[0], actor: "system", amount: BigInt(refundedAmount),
          paymentFundedAmount: textCancellationPaymentFundedRefund(-BigInt(entry.payment_funded_amount ?? 0)),
          entryType: "refund", idempotencyKey: `text:${job.id}:cancel-refund`, priorEntryId: closed.entry.id,
          metadata: billingMetadata, reason: "text_generation_cancellation_refund", relatedTextJobId: job.id });
      }
    }
    const updated = await client.query(`UPDATE text_generation_jobs SET state=$2,output_markdown=$3,error_code=$4,charged_credit_amount=$5,updated_at=now() WHERE id=$1 RETURNING *`,
      [job.id, state, output, errorCode, chargedAmount]);
    return updated.rows[0];
  });
}
export async function readTextGeneration(pool, { requestId, ownerId, workspaceId }) {
  const workspace = await resolveWorkspaceAccess(pool, { ownerId, workspaceId });
  const rows = await pool.query("SELECT * FROM text_generation_jobs WHERE id=$1 AND owner_id=$2 AND workspace_id=$3", [requestId, ownerId, workspace.id]);
  if (!rows.rowCount) throw new TextGenerationError("TEXT_GENERATION_NOT_FOUND", "未找到这次文本生成。", 404);
  return rows.rows[0];
}
export async function recoverExpiredTextGenerations(pool) {
  const expired = await pool.query("SELECT id,output_markdown FROM text_generation_jobs WHERE state='running' AND lease_expires_at<now() ORDER BY lease_expires_at LIMIT 20");
  for (const job of expired.rows) await finishTextGeneration(pool, { jobId: job.id, state: "failed", output: job.output_markdown, errorCode: "TEXT_GENERATION_INTERRUPTED" });
}
