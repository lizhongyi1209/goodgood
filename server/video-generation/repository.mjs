import { createHash } from "node:crypto";
import { appendCreditEntryInTransaction, runCreditTransaction, BillingPersistenceError } from "../billing/repository.mjs";
import { paymentFundedPortionForReservation } from "../billing/policy.mjs";
import { reserveOrganizationGenerationCreditsInTransaction, settleOrganizationGenerationCreditsInTransaction, releaseOrganizationGenerationCreditsInTransaction } from "../organizations/credit-repository.mjs";
import { resolveWorkspaceAccess } from "../organizations/workspace-access.mjs";
import { CREDIT_UNIT } from "../../shared/contracts/model-pricing.mjs";
import { VideoGenerationError } from "./errors.mjs";
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function videoInputHash({ quotedCredits: _quote, ...input }) { return hash(input); }
function metadata(job) { return { activityCategory: "video_generation", videoGenerationJobId: job.id, batchReference: job.id,
  projectId: job.canvas_project_id, projectName: job.source_project_name, modelName: job.model_id === "kling-3.0-omni" ? "Kling 3.0 Omni" : "Kling 3.0 动作模仿",
  resolution: job.input_snapshot.resolution, durationSeconds: job.price_snapshot.seconds, fixedCreditAmount: Number(job.reserved_credit_amount) }; }
export async function findVideoJob(pool, { requestId, ownerId, workspaceId }) {
  const workspace = await resolveWorkspaceAccess(pool, { ownerId, workspaceId });
  const rows = await pool.query("SELECT * FROM video_generation_jobs WHERE id=$1 AND owner_id=$2 AND workspace_id=$3", [requestId, ownerId, workspace.id]);
  return rows.rows[0] ?? null;
}
export async function beginVideoJob(pool, { input, quote, ownerId, workspaceId }) {
  return runCreditTransaction(pool, async (client) => {
    const workspace = await resolveWorkspaceAccess(client, { ownerId, workspaceId, write: true });
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`video-generation:${input.requestId}`]);
    const existing = (await client.query("SELECT * FROM video_generation_jobs WHERE id=$1 FOR UPDATE", [input.requestId])).rows[0];
    if (existing) {
      if (existing.owner_id !== ownerId || existing.workspace_id !== workspace.id || existing.input_hash !== videoInputHash(input)) throw new VideoGenerationError("VIDEO_IDEMPOTENCY_CONFLICT", "该提交标识已被使用，请重新提交。", 409);
      return existing;
    }
    const active = await client.query("SELECT count(*)::int AS count FROM video_generation_jobs WHERE owner_id=$1 AND workspace_id=$2 AND state IN ('queued','submitting','submission_unknown','running','saving')", [ownerId, workspace.id]);
    if (active.rows[0].count >= 4) throw new VideoGenerationError("VIDEO_CAPACITY_BUSY", "已有四个视频任务正在进行，请等待完成。", 409);
    const project = await client.query("SELECT name FROM canvas_projects p WHERE id=$1 AND owner_id=$2 AND workspace_id=$3 AND NOT EXISTS (SELECT 1 FROM canvas_project_deletions d WHERE d.project_id=p.id AND d.workspace_id=p.workspace_id)", [input.projectId, ownerId, workspace.id]);
    if (!project.rowCount) throw new VideoGenerationError("VIDEO_PROJECT_NOT_READY", "项目尚未同步，请保存后重试。", 409);
    if (input.quotedCredits !== quote.credits) throw new VideoGenerationError("VIDEO_PRICE_CHANGED", "视频价格已变化，请确认新价格后重新生成。", 409);
    const snapshot = { ...input }; delete snapshot.quotedCredits;
    const job = (await client.query(`INSERT INTO video_generation_jobs(id,owner_id,workspace_id,canvas_project_id,source_project_name,model_id,input_hash,input_snapshot,price_snapshot,reserved_credit_amount)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10) RETURNING *`, [input.requestId, ownerId, workspace.id, input.projectId, project.rows[0].name, input.modelId, videoInputHash(input), JSON.stringify(snapshot), JSON.stringify(quote), quote.credits])).rows[0];
    const key = `video:${job.id}:reserve`;
    if (workspace.kind === "organization") {
      const reserved = await reserveOrganizationGenerationCreditsInTransaction(client, { actorOwnerId: ownerId, amount: BigInt(quote.credits), idempotencyKey: key, jobId: job.id,
        metadata: metadata(job), operationHash: hash({ jobId: job.id, amount: quote.credits, type: "reserve" }), workspaceId: workspace.id });
      job.organization_reservation_entry_id = reserved.entry.id;
      await client.query("UPDATE video_generation_jobs SET organization_reservation_entry_id=$2 WHERE id=$1", [job.id, reserved.entry.id]);
    } else {
      const account = (await client.query("SELECT * FROM credit_accounts WHERE owner_id=$1 AND unit=$2 FOR UPDATE", [ownerId, CREDIT_UNIT])).rows[0];
      const funded = account && paymentFundedPortionForReservation({ available: account.available_balance, paymentFundedAvailable: account.payment_funded_available_balance ?? 0 }, BigInt(quote.credits));
      if (funded === null || funded === undefined || funded === false) throw new BillingPersistenceError("INSUFFICIENT_POINTS", "积分不足，请充值后重试。", 409);
      const reserved = await appendCreditEntryInTransaction(client, { accountRow: account, actor: "system", amount: -BigInt(quote.credits), paymentFundedAmount: -funded,
        entryType: "reserve", idempotencyKey: key, metadata: metadata(job), reason: "video_generation_reservation", relatedVideoJobId: job.id });
      job.credit_reservation_entry_id = reserved.entry.id;
      await client.query("UPDATE video_generation_jobs SET credit_reservation_entry_id=$2 WHERE id=$1", [job.id, reserved.entry.id]);
    }
    return job;
  });
}
export async function claimVideoJob(pool, leaseOwner) {
  // A lost paid POST receipt cannot be repaired by posting again.
  await pool.query("UPDATE video_generation_jobs SET state='submission_unknown',error_code='VIDEO_SUBMISSION_UNKNOWN',lease_owner=NULL,lease_expires_at=NULL,updated_at=now() WHERE state='submitting' AND lease_expires_at<now()");
  const rows = await pool.query(`WITH candidate AS (SELECT id FROM video_generation_jobs WHERE state IN ('queued','running','saving') AND next_poll_at<=now()
    AND (lease_expires_at IS NULL OR lease_expires_at<now()) ORDER BY next_poll_at,created_at FOR UPDATE SKIP LOCKED LIMIT 1)
    UPDATE video_generation_jobs j SET lease_owner=$1,lease_expires_at=now()+interval '3 minutes' FROM candidate c WHERE j.id=c.id RETURNING j.*`, [leaseOwner]);
  return rows.rows[0] ?? null;
}
export async function updateVideoJob(pool, jobId, leaseOwner, patch) {
  const allowed = new Set(["state", "provider_task_id", "provider_result_url", "provider_cost", "progress", "error_code", "failure_diagnostics", "bridge_keys"]);
  const fields = Object.entries(patch).filter(([key]) => allowed.has(key));
  const args = [jobId, leaseOwner, ...fields.map(([key, value]) => ["failure_diagnostics", "bridge_keys"].includes(key) ? JSON.stringify(value) : value)];
  const assignments = fields.map(([key], i) => `${key}=$${i + 3}${["failure_diagnostics", "bridge_keys"].includes(key) ? "::jsonb" : ""}`);
  const rows = await pool.query(`UPDATE video_generation_jobs SET ${assignments.length ? assignments.join(",") + "," : ""}updated_at=now(),next_poll_at=now()+interval '12 seconds',lease_owner=NULL,lease_expires_at=NULL WHERE id=$1 AND lease_owner=$2 RETURNING *`, args);
  return rows.rows[0] ?? null;
}
export async function markVideoSubmitting(pool, jobId, leaseOwner, bridgeKeys) {
  return (await pool.query("UPDATE video_generation_jobs SET state='submitting',submitted_at=now(),bridge_keys=$3::jsonb,updated_at=now() WHERE id=$1 AND state='queued' AND lease_owner=$2 AND lease_expires_at>now() RETURNING *", [jobId, leaseOwner, JSON.stringify(bridgeKeys)])).rowCount > 0;
}
export async function persistVideoReceipt(pool, jobId, leaseOwner, task) {
  return (await pool.query("UPDATE video_generation_jobs SET provider_task_id=$3,provider_cost=$4,updated_at=now() WHERE id=$1 AND lease_owner=$2 RETURNING id", [jobId, leaseOwner, task.taskId, task.providerCost])).rowCount > 0;
}
export async function closeVideoJob(pool, { jobId, leaseOwner, succeeded, errorCode = null, diagnostics = null, output = null }) {
  return runCreditTransaction(pool, async (client) => {
    await client.query("SELECT w.id FROM workspaces w JOIN video_generation_jobs j ON j.workspace_id=w.id WHERE j.id=$1 FOR UPDATE OF w", [jobId]);
    const job = (await client.query("SELECT * FROM video_generation_jobs WHERE id=$1 FOR UPDATE", [jobId])).rows[0];
    if (!job || ["succeeded", "failed"].includes(job.state) || job.lease_owner !== leaseOwner) return null;
    const type = succeeded ? "settle" : "release"; const key = `video:${job.id}:${type}`;
    if (output) {
      await client.query(`INSERT INTO video_materials(id,owner_id,workspace_id,object_key,original_file_name,declared_mime_type,declared_byte_size,upload_state,expires_at,uploaded_at,source_video_job_id,pixel_width,pixel_height,duration_seconds)
        VALUES($1,$2,$3,$4,$5,'video/mp4',$6,'ready',now(),now(),$1,$7,$8,$9) ON CONFLICT(id) DO NOTHING`, [job.id, job.owner_id, job.workspace_id, output.key, output.name, output.byteSize, output.pixelWidth, output.pixelHeight, output.durationSeconds]);
    }
    if (job.organization_reservation_entry_id) {
      await (succeeded ? settleOrganizationGenerationCreditsInTransaction : releaseOrganizationGenerationCreditsInTransaction)(client, { jobId: job.id, workspaceId: job.workspace_id, actor: "worker", idempotencyKey: key,
        refundAmount: 0n, metadata: metadata(job), operationHash: hash({ jobId: job.id, type }), reason: `video_generation_${type}` });
    } else {
      const entry = (await client.query("SELECT * FROM credit_ledger_entries WHERE id=$1", [job.credit_reservation_entry_id])).rows[0];
      if (!entry) throw new VideoGenerationError("VIDEO_RESERVATION_MISSING", "视频积分预留记录暂不可用。", 503);
      const account = (await client.query("SELECT * FROM credit_accounts WHERE id=$1 FOR UPDATE", [entry.account_id])).rows[0];
      await appendCreditEntryInTransaction(client, { accountRow: account, actor: "worker", amount: succeeded ? BigInt(entry.amount) : -BigInt(entry.amount),
        paymentFundedAmount: (succeeded ? 1n : -1n) * BigInt(entry.payment_funded_amount ?? 0), entryType: type, idempotencyKey: key,
        priorEntryId: entry.id, relatedVideoJobId: job.id, metadata: metadata(job), reason: `video_generation_${type}` });
    }
    return (await client.query(`UPDATE video_generation_jobs SET state=$2,charged_credit_amount=$3,error_code=$4,failure_diagnostics=$5::jsonb,
      output_asset_id=$6,output_metadata=$7::jsonb,provider_result_url=NULL,lease_owner=NULL,lease_expires_at=NULL,updated_at=now() WHERE id=$1 RETURNING *`,
      [job.id, succeeded ? "succeeded" : "failed", succeeded ? job.reserved_credit_amount : 0, errorCode, JSON.stringify(diagnostics), output ? job.id : null, JSON.stringify(output ? { pixelWidth: output.pixelWidth, pixelHeight: output.pixelHeight, durationSeconds: output.durationSeconds } : null)])).rows[0];
  });
}
