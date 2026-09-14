import { modelQualityPriceContext } from "../../shared/contracts/gpt-quality-pricing.mjs";
import {lockHiddenPreset} from '../inspiration/preset.mjs';
import { createHash, randomUUID } from "node:crypto";
import { supportsImageLines } from "../../shared/contracts/banana-lines.mjs";
import { requireEnabledImageModel } from "../admin/models.mjs";
import { promptContextForRetry } from "../../shared/contracts/prompt-batch.mjs";
import {
  findActiveGenerationPrice,
  releaseGenerationCreditsInTransaction,
  reserveGenerationCreditsInTransaction,
  settleGenerationCreditsInTransaction,
} from "../billing/repository.mjs";
import {
  releaseOrganizationGenerationCreditsInTransaction,
  reserveOrganizationGenerationCreditsInTransaction,
  settleOrganizationGenerationCreditsInTransaction,
} from "../organizations/credit-repository.mjs";
import { resolveWorkspaceAccess } from "../organizations/workspace-access.mjs";
import { lockReferenceLifecycle } from "../references/lifecycle-lock.mjs";
import { findReadyReferences } from "../references/repository.mjs";
import {
  isGptImageModelId,
  normalizeGenerationModelOptions,
} from "./capabilities.mjs";

export class GenerationPersistenceError extends Error {
  constructor(code, message, status = 500) {
    super(message);
    this.name = "GenerationPersistenceError";
    this.code = code;
    this.status = status;
  }
}

function requiredGenerationModelOptions(input) {
  const options = normalizeGenerationModelOptions({
    imageLine: input.imageLine,
    background: input.background,
    googleSearch: input.googleSearch,
    modelId: input.modelId,
    outputFormat: input.outputFormat,
    quality: input.quality,
    thinkingLevel: input.thinkingLevel,
  });
  if (!options) {
    throw new GenerationPersistenceError(
      "UNSUPPORTED_GENERATION_OPTIONS",
      "当前模型不支持所选生成参数组合。",
      400,
    );
  }
  return options;
}

export function hashGenerationInput(input) {
  const modelOptions = requiredGenerationModelOptions(input);
  return createHash("sha256")
    .update(
      JSON.stringify({
        aspectRatio: input.aspectRatio,
        background: modelOptions.background,
        count: input.count,
        googleSearch: modelOptions.googleSearch,
        modelId: input.modelId,
        ...(modelOptions.imageLine ? { imageLine: modelOptions.imageLine } : {}),
        ...(input.catalogModelId ? { catalogModelId: input.catalogModelId } : {}),
        outputFormat: modelOptions.outputFormat,
        projectId: input.projectId ?? null,
        prompt: input.prompt,
        ...(input.presetFingerprint ? {presetFingerprint:input.presetFingerprint} : {}),
        ...(input.composerPrompt ? { composerPrompt: input.composerPrompt } : {}),
        references: input.references.map(({ id, name }, index) => ({
          id,
          name,
          ordinal: index + 1,
        })),
        resolution: input.resolution,
        quality: modelOptions.quality,
        thinkingLevel: modelOptions.thinkingLevel,
      }),
    )
    .digest("hex");
}

export function hashOrganizationGenerationCreditOperation({
  amount = null,
  jobId,
  operation,
  workspaceId,
}) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        amount: amount == null ? null : String(amount),
        jobId,
        operation,
        workspaceId,
      }),
    )
    .digest("hex");
}

export function generationInputFromRow(row, referenceUrls = new Map()) {
  return {
    aspectRatio: row.aspect_ratio,
    background: row.background ?? "auto",
    count: row.requested_count,
    googleSearch: row.google_search ?? false,
    modelId: row.model_id,
    ...(row.image_line && row.image_line !== "special" ? { imageLine: row.image_line } : {}),
    ...(row.catalog_model_id ? { catalogModelId: row.catalog_model_id, catalogModelName: row.catalog_model_name } : {}),
    outputFormat:
      row.output_format ?? (isGptImageModelId(row.model_id) ? "jpeg" : "png"),
    projectId: row.project_id ?? null,
    prompt: row.prompt,
    references: (row.reference_snapshot ?? []).map((reference) => ({
      id: reference.id,
      name: reference.name,
      status: "ready",
      url: referenceUrls.get(reference.id) ?? "",
    })),
    resolution: row.resolution,
    quality: row.quality ?? "auto",
    thinkingLevel:
      row.thinking_level ??
      (row.model_id === "nano-banana-2" ? "high" : "low"),
  };
}

export function persistedGenerationInputFromRow(row) {
  return {
    aspectRatio: row.aspect_ratio,
    background: row.background ?? "auto",
    count: row.requested_count,
    googleSearch: row.google_search ?? false,
    modelId: row.model_id,
    ...(row.image_line && row.image_line !== "special" ? { imageLine: row.image_line } : {}),
    ...(row.catalog_model_id ? { catalogModelId: row.catalog_model_id } : {}),
    outputFormat:
      row.output_format ?? (isGptImageModelId(row.model_id) ? "jpeg" : "png"),
    projectId: row.project_id ?? null,
    prompt: row.prompt,
    references: (row.reference_snapshot ?? []).map((reference) => ({
      id: reference.id,
      name: reference.name,
      objectKey: reference.objectKey,
    })),
    resolution: row.resolution,
    quality: row.quality ?? "auto",
    thinkingLevel:
      row.thinking_level ??
      (row.model_id === "nano-banana-2" ? "high" : "low"),
  };
}

export function publicGenerationJob(
  row,
  previewUrls = new Map(),
  referenceUrls = new Map(),
) {
  return {
    createdAt: new Date(row.submitted_at).toISOString(),
    error: row.error_code
      ? {
          code: row.error_code,
          message: row.error_message,
          retryable: row.error_retryable !== false,
          title: row.error_title ?? "本次生成未完成",
        }
      : null,
    id: row.id,
    input: generationInputFromRow(row, referenceUrls),
    outputs: (row.assets ?? []).flatMap((asset) => {
      const previewUrl = previewUrls.get(asset.id);
      return previewUrl
        ? [{
            id: asset.id,
            previewPosition: "50% 50%",
            previewUrl,
            ...(asset.pixel_width != null && asset.pixel_height != null
              ? { height: asset.pixel_height, width: asset.pixel_width }
              : {}),
          }]
        : [];
    }),
    state: row.state,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

const JOB_SELECT = `
  SELECT j.*,
         b.prompt,
         b.project_id,
         b.reference_snapshot,
         b.model_id,
         b.image_line,
         b.catalog_model_id,
         b.catalog_model_name,
         b.aspect_ratio,
         b.resolution,
         b.requested_count,
         b.thinking_level,
         b.google_search,
         b.quality,
         b.background,
         b.output_format,
         b.input_hash,
         (SELECT u.email FROM users u WHERE u.id = j.creator_owner_id)
           AS creator_email,
         COALESCE((
           SELECT jsonb_agg(to_jsonb(a) ORDER BY a.ordinal)
             FROM assets a
            WHERE a.job_id = j.id
              AND a.workspace_id = j.workspace_id
              AND a.moderation_state = 'accepted'
         ), '[]'::jsonb) AS assets
    FROM generation_jobs j
    JOIN generation_batches b ON b.id = j.batch_id
`;

export async function findGenerationJob(
  pool,
  { jobId, ownerId, workspaceId = null },
) {
  const workspace = await resolveWorkspaceAccess(pool, { ownerId, workspaceId });
  const result = await pool.query(
    `${JOB_SELECT} WHERE j.id = $1 AND j.owner_id = $2
      AND j.workspace_id = $3`,
    [jobId, ownerId, workspace.id],
  );
  return result.rows[0] ?? null;
}

export async function findProjectGenerationJobs(
  pool,
  { ownerId, projectId, workspaceId = null },
) {
  const workspace = await resolveWorkspaceAccess(pool, { ownerId, workspaceId });
  const result = await pool.query(
    `${JOB_SELECT}
      WHERE b.project_id = $1 AND j.owner_id = $2
        AND j.workspace_id = $3 AND b.workspace_id = $3
      ORDER BY j.submitted_at DESC, j.id DESC`,
    [projectId, ownerId, workspace.id],
  );
  return result.rows;
}

export async function findOwnerAssetGenerationJobs(
  pool,
  { ownerId, workspaceId = null },
) {
  const workspace = await resolveWorkspaceAccess(pool, { ownerId, workspaceId });
  const result = await pool.query(
    `${JOB_SELECT}
      WHERE j.owner_id = $1
        AND b.owner_id = $1
        AND j.workspace_id = $2 AND b.workspace_id = $2
        AND j.state = 'succeeded'
        AND EXISTS (
          SELECT 1 FROM assets a
           WHERE a.job_id = j.id
             AND a.owner_id = $1
             AND a.workspace_id = $2
             AND a.moderation_state = 'accepted'
        )
      ORDER BY j.submitted_at DESC, j.id DESC`,
    [ownerId, workspace.id],
  );
  return result.rows;
}

export async function findOwnerAsset(
  pool,
  { assetId, ownerId, workspaceId = null },
) {
  const workspace = await resolveWorkspaceAccess(pool, { ownerId, workspaceId });
  const result = await pool.query(
    `SELECT a.id, a.object_key
       FROM assets a
       JOIN generation_jobs j ON j.id = a.job_id
       JOIN generation_batches b ON b.id = a.batch_id
      WHERE a.id = $1
        AND a.owner_id = $2
        AND j.owner_id = $2
        AND b.owner_id = $2
        AND a.workspace_id = $3 AND j.workspace_id = $3 AND b.workspace_id = $3
        AND j.state = 'succeeded'
        AND a.moderation_state = 'accepted'`,
    [assetId, ownerId, workspace.id],
  );
  return result.rows[0] ?? null;
}

export async function findOrganizationAssetGenerationJobs(
  pool,
  { actorOwnerId, workspaceId },
) {
  const workspace = await resolveWorkspaceAccess(pool, {
    manager: true,
    ownerId: actorOwnerId,
    workspaceId,
  });
  const result = await pool.query(
    `${JOB_SELECT}
      WHERE j.workspace_id = $1 AND b.workspace_id = $1
        AND j.state = 'succeeded'
        AND EXISTS (
          SELECT 1 FROM assets a
           WHERE a.job_id = j.id AND a.workspace_id = $1
             AND a.moderation_state = 'accepted'
        )
      ORDER BY j.submitted_at DESC, j.id DESC`,
    [workspace.id],
  );
  return result.rows;
}

export async function findOrganizationAsset(
  pool,
  { actorOwnerId, assetId, workspaceId },
) {
  const workspace = await resolveWorkspaceAccess(pool, {
    manager: true,
    ownerId: actorOwnerId,
    workspaceId,
  });
  const result = await pool.query(
    `SELECT a.id, a.object_key, a.creator_owner_id
       FROM assets a
       JOIN generation_jobs j
         ON j.id = a.job_id AND j.workspace_id = a.workspace_id
      WHERE a.id = $1 AND a.workspace_id = $2
        AND j.state = 'succeeded' AND a.moderation_state = 'accepted'`,
    [assetId, workspace.id],
  );
  return result.rows[0] ?? null;
}

export async function createGenerationJob(
  pool,
  {
    idempotencyKey,
    input,
    ownerId,
    retryOfJobId = null,
    workspaceId = null,
    presetCaseId = null,
    presetSupplement = null,
    frozenPreset = null,
  },
) {
  const modelOptions = requiredGenerationModelOptions(input);
  const presetFingerprint=presetCaseId?`${presetCaseId}:${presetSupplement}`:frozenPreset?createHash('sha256').update(frozenPreset.effective_prompt).digest('hex'):null;
  const inputHash = hashGenerationInput({...input,presetFingerprint});
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const workspace = await resolveWorkspaceAccess(client, {
      ownerId,
      workspaceId,
      write: true,
    });
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [`${workspace.id}:${ownerId}:${idempotencyKey}`],
    );

    const existing = await client.query(
      `${JOB_SELECT}
        WHERE j.workspace_id = $1 AND j.creator_owner_id = $2
          AND j.idempotency_key = $3`,
      [workspace.id, ownerId, idempotencyKey],
    );
    if (existing.rowCount) {
      const row = existing.rows[0];
      if (row.input_hash !== inputHash || row.retry_of_job_id !== retryOfJobId) {
        throw new GenerationPersistenceError(
          "IDEMPOTENCY_CONFLICT",
          "同一幂等键已用于不同的生成请求。",
          409,
        );
      }
      await client.query("COMMIT");
      return { created: false, row };
    }

    if (retryOfJobId) {
      const source = await client.query(
        `SELECT state FROM generation_jobs
          WHERE id = $1 AND workspace_id = $2 AND creator_owner_id = $3`,
        [retryOfJobId, workspace.id, ownerId],
      );
      if (!source.rowCount || source.rows[0].state !== "failed") {
        throw new GenerationPersistenceError(
          "RETRY_NOT_ALLOWED",
          "只有失败的生成任务可以重试。",
          409,
        );
      }
    }

    const managedModel = await requireEnabledImageModel(client, input);
    if (input.expectedPriceVersion !== undefined) {
      const quote = await findActiveGenerationPrice(client, { modelId: managedModel.id, resolution: input.resolution, count: input.count, planContext: modelQualityPriceContext(managedModel, input.imageLine, input.quality) });
      if (quote.version !== input.expectedPriceVersion) throw new GenerationPersistenceError("PRICE_CHANGED", "模型价格已更新，请刷新报价后重新提交。尚未扣除积分。", 409);
    }

    if (input.projectId || input.references.length || presetCaseId) {
      await lockReferenceLifecycle(client);
    }
    if((presetCaseId||frozenPreset)&&workspace.kind!=='personal') throw new GenerationPersistenceError('INSPIRATION_FORBIDDEN','预设效果仅支持个人创作。',403);
    const effectivePrompt=presetCaseId?await lockHiddenPreset(client,presetCaseId,presetSupplement):frozenPreset?.effective_prompt;
    const visiblePrompt=presetCaseId?`预设效果（原提示词隐藏）${presetSupplement?`\n补充提示词：${presetSupplement}`:''}`:input.prompt;
    if (input.references.length) {
      const currentReferences = await findReadyReferences(client, {
        lock: true,
        ownerId,
        referenceIds: input.references.map((reference) => reference.id),
        workspaceId: workspace.id,
      });
      const referencesMatch = input.references.every((reference, index) => {
        const current = currentReferences[index];
        return current?.id === reference.id && current.object_key === reference.objectKey;
      });
      if (!referencesMatch) {
        throw new GenerationPersistenceError(
          "REFERENCE_NOT_READY",
          "部分参考图已不可用，请刷新后重试。",
          409,
        );
      }
    }

    let projectComposerPrompt = input.composerPrompt ?? input.prompt;
    if (input.projectId) {
      const project = await client.query(
        `SELECT id, prompt FROM projects
          WHERE id = $1 AND workspace_id = $2 AND creator_owner_id = $3
            AND status = 'active'
          FOR UPDATE`,
        [input.projectId, workspace.id, ownerId],
      );
      if (!project.rowCount) {
        throw new GenerationPersistenceError(
          "PROJECT_NOT_FOUND",
          "未找到该项目。",
          404,
        );
      }
      if (retryOfJobId && !input.composerPrompt) {
        projectComposerPrompt = promptContextForRetry(input.prompt, project.rows[0].prompt ?? "");
      }
    }

    const batchId = randomUUID();
    const jobId = randomUUID();
    const references = input.references.map(({ id, name, objectKey }, index) => ({
      id,
      name,
      objectKey,
      ordinal: index + 1,
    }));
    await client.query(
      `INSERT INTO generation_batches (
         id, owner_id, workspace_id, creator_owner_id, project_id,
         prompt, reference_snapshot, model_id,
         aspect_ratio, resolution, requested_count, thinking_level,
         google_search, quality, background, output_format, input_hash, image_line
       ) VALUES ($1, $2, $3, $2, $4, $5, $6::jsonb, $7, $8, $9, $10,
                 $11, $12, $13, $14, $15, $16, $17)`,
      [
        batchId,
        ownerId,
        workspace.id,
        input.projectId ?? null,
        visiblePrompt,
        JSON.stringify(references),
        input.modelId,
        input.aspectRatio,
        input.resolution,
        input.count,
        modelOptions.thinkingLevel,
        modelOptions.googleSearch,
        modelOptions.quality,
        modelOptions.background,
        modelOptions.outputFormat,
        inputHash,
        supportsImageLines(input.modelId) ? input.imageLine ?? "special" : null,
      ],
    );
    if (input.projectId) {
      await client.query(
        `UPDATE projects
            SET prompt = $3, reference_snapshot = $4::jsonb,
                model_id = $5, aspect_ratio = $6, resolution = $7,
                generation_count = $8, thinking_level = $9,
                google_search = $10, quality = $11, background = $12,
                output_format = $13, catalog_model_id = $15, image_line = $16, version = version + 1,
                updated_at = now()
          WHERE id = $1 AND owner_id = $2 AND creator_owner_id = $2
            AND workspace_id = $14`,
        [
          input.projectId,
          ownerId,
          projectComposerPrompt,
          JSON.stringify(references),
          input.modelId,
          input.aspectRatio,
          input.resolution,
          input.count,
          modelOptions.thinkingLevel,
          modelOptions.googleSearch,
          modelOptions.quality,
          modelOptions.background,
          modelOptions.outputFormat,
          workspace.id,
          input.catalogModelId ?? null,
          supportsImageLines(input.modelId) ? input.imageLine ?? "special" : null,
        ],
      );
    }
    await client.query(
      `INSERT INTO generation_jobs (
         id, batch_id, owner_id, workspace_id, creator_owner_id,
         idempotency_key, retry_of_job_id
       ) VALUES ($1, $2, $3, $4, $3, $5, $6)`,
      [jobId, batchId, ownerId, workspace.id, idempotencyKey, retryOfJobId],
    );
    if(effectivePrompt) await client.query('INSERT INTO inspiration_generation_prompts(job_id,case_id,effective_prompt) VALUES($1,$2,$3)',[jobId,presetCaseId??frozenPreset.case_id,effectivePrompt]);
    await client.query("UPDATE generation_batches SET catalog_model_id=$2,catalog_model_name=$3 WHERE id=$1",
      [batchId, managedModel.id, managedModel.name]);
    if (workspace.kind === "organization") {
      const price = await findActiveGenerationPrice(client, {
        count: input.count,
        modelId: input.catalogModelId ?? input.modelId,
        planContext: modelQualityPriceContext(managedModel, input.imageLine, input.quality),
        resolution: input.resolution,
      });
      await client.query(
        `UPDATE generation_batches
            SET price_version_id = $2, quoted_credit_unit = $3,
                quoted_credit_amount = $4, updated_at = now()
          WHERE id = $1 AND workspace_id = $5`,
        [
          batchId,
          price.id,
          price.creditUnit,
          price.creditAmount.toString(),
          workspace.id,
        ],
      );
      const reservation = await reserveOrganizationGenerationCreditsInTransaction(
        client,
        {
          actorOwnerId: ownerId,
          amount: price.creditAmount,
          idempotencyKey: `organization-generation-reserve:${jobId}`,
          jobId,
          metadata: { priceVersionId: price.id },
          operationHash: hashOrganizationGenerationCreditOperation({
            amount: price.creditAmount,
            jobId,
            operation: "reserve",
            workspaceId: workspace.id,
          }),
          reason: "organization generation reservation",
          workspaceId: workspace.id,
        },
      );
      await client.query(
        `UPDATE generation_jobs
            SET workspace_credit_reservation_entry_id = $2,
                updated_at = now()
          WHERE id = $1 AND workspace_id = $3
            AND workspace_credit_reservation_entry_id IS NULL`,
        [jobId, reservation.entry.id, workspace.id],
      );
    } else {
      await reserveGenerationCreditsInTransaction(client, {
        planContext: modelQualityPriceContext(managedModel, input.imageLine, input.quality),
        idempotencyKey: `generation-reserve:${jobId}`,
        jobId,
        ownerId,
      });
    }
    await client.query(
      `INSERT INTO generation_job_events (
         job_id, sequence, from_state, to_state, event_type, detail
       ) VALUES ($1, 1, NULL, 'queued', 'submitted', $2::jsonb)`,
      [jobId, JSON.stringify({ retryOfJobId })],
    );
    await client.query(
      "INSERT INTO generation_queue_outbox (job_id) VALUES ($1)",
      [jobId],
    );
    const created = await client.query(`${JOB_SELECT} WHERE j.id = $1`, [jobId]);
    await client.query("COMMIT");
    return { created: true, row: created.rows[0] };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function insertEvent(
  client,
  { detail = {}, eventType, fromState, jobId, toState },
) {
  await client.query(
    `INSERT INTO generation_job_events (
       job_id, sequence, from_state, to_state, event_type, detail
     )
     SELECT $1, COALESCE(MAX(sequence), 0) + 1, $2, $3, $4, $5::jsonb
       FROM generation_job_events
      WHERE job_id = $1`,
    [jobId, fromState, toState, eventType, JSON.stringify(detail)],
  );
}

export async function claimGenerationJob(
  pool,
  { attemptRoute = null, attemptRouteForModel = null, jobId, leaseMs, workerId },
) {
  if (!attemptRoute && typeof attemptRouteForModel !== "function") {
    throw new Error("A provider attempt route or model route resolver is required.");
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query(
      `${JOB_SELECT} WHERE j.id = $1 FOR UPDATE OF j`,
      [jobId],
    );
    if (!locked.rowCount) {
      await client.query("COMMIT");
      return { claimed: false, reason: "missing" };
    }
    const job = locked.rows[0];
    const resolvedAttemptRoute = attemptRouteForModel
      ? attemptRouteForModel(job.model_id, job.image_line ?? undefined)
      : attemptRoute;
    if (
      !resolvedAttemptRoute?.routeVersion ||
      !resolvedAttemptRoute.provider ||
      !resolvedAttemptRoute.providerModel
    ) {
      throw new Error("A complete provider attempt route is required.");
    }
    if (["succeeded", "failed", "cancelled"].includes(job.state)) {
      await client.query("COMMIT");
      return { claimed: false, reason: "terminal", route: resolvedAttemptRoute };
    }
    if (
      job.lease_owner &&
      job.lease_expires_at &&
      new Date(job.lease_expires_at).getTime() > Date.now()
    ) {
      await client.query("COMMIT");
      return { claimed: false, reason: "leased", route: resolvedAttemptRoute };
    }

    if (job.state === "queued") {
      await client.query(
        `UPDATE generation_jobs
            SET state = 'running', progress = 20,
                started_at = COALESCE(started_at, now()), updated_at = now()
          WHERE id = $1`,
        [jobId],
      );
      await insertEvent(client, {
        eventType: "worker_claimed",
        fromState: "queued",
        jobId,
        toState: "running",
        detail: { workerId },
      });
      job.state = "running";
    }
    await client.query(
      `UPDATE generation_jobs
          SET lease_owner = $2,
              lease_expires_at = now() + ($3 * interval '1 millisecond'),
              updated_at = now()
        WHERE id = $1`,
      [jobId, workerId, leaseMs],
    );

    let attemptResult = await client.query(
      `SELECT * FROM generation_attempts
        WHERE job_id = $1 AND state IN ('created', 'submitted', 'running')
        ORDER BY ordinal DESC LIMIT 1`,
      [jobId],
    );
    if (!attemptResult.rowCount) {
      const ordinal = Number(job.attempt_count) + 1;
      const attemptId = randomUUID();
      attemptResult = await client.query(
        `INSERT INTO generation_attempts (
           id, job_id, ordinal, route_version, provider, provider_model,
           state, request_hash
         ) VALUES ($1, $2, $3, $4, $5, $6, 'created', $7)
         RETURNING *`,
        [
          attemptId,
          jobId,
          ordinal,
          resolvedAttemptRoute.routeVersion,
          resolvedAttemptRoute.provider,
          resolvedAttemptRoute.providerModel,
          job.input_hash,
        ],
      );
      await client.query(
        "UPDATE generation_jobs SET attempt_count = $2 WHERE id = $1",
        [jobId, ordinal],
      );
    }

    const refreshed = await client.query(`${JOB_SELECT} WHERE j.id = $1`, [jobId]);
    await client.query("COMMIT");
    return {
      attempt: attemptResult.rows[0],
      claimed: true,
      job: refreshed.rows[0],
      route: resolvedAttemptRoute,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function saveProviderTask(
  pool,
  { attemptId, previousTaskId = null, taskId },
) {
  const result = await pool.query(
    `UPDATE generation_attempts
        SET provider_task_id = $2,
            state = 'submitted', updated_at = now()
      WHERE id = $1
        AND provider_task_id IS NOT DISTINCT FROM $3
      RETURNING id`,
    [attemptId, taskId, previousTaskId],
  );
  return result.rowCount === 1;
}

export async function markProviderSubmissionStarted(pool, { attemptId }) {
  const result = await pool.query(
    `UPDATE generation_attempts
        SET state = 'submitted', updated_at = now()
      WHERE id = $1 AND state = 'created' AND provider_task_id IS NULL
      RETURNING id`,
    [attemptId],
  );
  return result.rowCount === 1;
}

export async function renewGenerationLease(
  pool,
  { jobId, leaseMs, workerId },
) {
  await pool.query(
    `UPDATE generation_jobs
        SET lease_expires_at = now() + ($3 * interval '1 millisecond'),
            updated_at = now()
      WHERE id = $1 AND lease_owner = $2
        AND state IN ('running', 'refining')`,
    [jobId, workerId, leaseMs],
  );
}

export async function markGenerationRefining(pool, { jobId, workerId }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      "SELECT state FROM generation_jobs WHERE id = $1 FOR UPDATE",
      [jobId],
    );
    if (result.rows[0]?.state === "running") {
      await client.query(
        `UPDATE generation_jobs
            SET state = 'refining', progress = 75, updated_at = now()
          WHERE id = $1 AND lease_owner = $2`,
        [jobId, workerId],
      );
      await client.query(
        `UPDATE generation_attempts
            SET state = 'running', updated_at = now()
          WHERE job_id = $1 AND state IN ('created', 'submitted')`,
        [jobId],
      );
      await insertEvent(client, {
        eventType: "provider_processing",
        fromState: "running",
        jobId,
        toState: "refining",
      });
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function completeGenerationJob(
  pool,
  { assets, attemptId, jobId, resultHash, workerId },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query(
      `SELECT j.state, j.owner_id, j.creator_owner_id, j.workspace_id,
              j.batch_id, j.lease_owner, j.credit_reservation_entry_id,
              j.workspace_credit_reservation_entry_id, b.requested_count
         FROM generation_jobs j
         JOIN generation_batches b ON b.id = j.batch_id
        WHERE j.id = $1 FOR UPDATE OF j`,
      [jobId],
    );
    const state = locked.rows[0]?.state;
    if (state === "succeeded") {
      await client.query("COMMIT");
      return { completed: false, reason: "already_succeeded" };
    }
    if (!state) {
      await client.query("COMMIT");
      return { completed: false, reason: "missing" };
    }
    if (state === "failed" || state === "cancelled") {
      await client.query("COMMIT");
      return { completed: false, reason: state };
    }
    if (locked.rows[0].lease_owner !== workerId) {
      await client.query("COMMIT");
      return { completed: false, reason: "lease_lost" };
    }

    if (
      !Array.isArray(assets) ||
      assets.length !== locked.rows[0].requested_count ||
      assets.some((asset, index) =>
        asset.ordinal !== index + 1 ||
        asset.ownerId !== locked.rows[0].owner_id ||
        asset.batchId !== locked.rows[0].batch_id
      )
    ) {
      throw new GenerationPersistenceError(
        "GENERATION_OUTPUT_COUNT_MISMATCH",
        "The generated Asset set does not match the requested count.",
      );
    }

    for (const asset of assets) {
      await client.query(
        `INSERT INTO assets (
           id, owner_id, workspace_id, creator_owner_id, batch_id, job_id,
           ordinal, object_key, checksum, mime_type, pixel_width, pixel_height,
           aspect_ratio, byte_size
         ) VALUES ($1, $2, $3, $2, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          asset.id,
          locked.rows[0].creator_owner_id,
          locked.rows[0].workspace_id,
          locked.rows[0].batch_id,
          jobId,
          asset.ordinal,
          asset.objectKey,
          asset.checksum,
          asset.mimeType,
          asset.pixelWidth,
          asset.pixelHeight,
          asset.aspectRatio,
          asset.byteSize,
        ],
      );
    }
    if (locked.rows[0].credit_reservation_entry_id) {
      await settleGenerationCreditsInTransaction(client, {
        idempotencyKey: `generation-settle:${jobId}`,
        jobId,
        ownerId: locked.rows[0].owner_id,
      });
    } else if (locked.rows[0].workspace_credit_reservation_entry_id) {
      await settleOrganizationGenerationCreditsInTransaction(client, {
        idempotencyKey: `organization-generation-settle:${jobId}`,
        jobId,
        operationHash: hashOrganizationGenerationCreditOperation({
          jobId,
          operation: "settle",
          workspaceId: locked.rows[0].workspace_id,
        }),
        workspaceId: locked.rows[0].workspace_id,
      });
    }
    await client.query(
      `UPDATE generation_attempts
          SET state = 'succeeded', result_hash = $2,
              completed_at = now(), updated_at = now()
        WHERE id = $1`,
      [attemptId, resultHash],
    );
    await client.query(
      `UPDATE generation_jobs
          SET state = 'succeeded', progress = 100,
              error_code = NULL, error_title = NULL, error_message = NULL,
              error_retryable = NULL, completed_at = now(), updated_at = now(),
              lease_owner = NULL, lease_expires_at = NULL
        WHERE id = $1 AND lease_owner = $2`,
      [jobId, workerId],
    );
    await insertEvent(client, {
      eventType: "asset_persisted",
      fromState: state,
      jobId,
      toState: "succeeded",
      detail: { assetIds: assets.map((asset) => asset.id) },
    });
    await client.query("COMMIT");
    return { completed: true, reason: "completed" };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function failGenerationJob(
  pool,
  { attemptId, error, jobId, workerId },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query(
      `SELECT state, owner_id, workspace_id, lease_owner,
              credit_reservation_entry_id, workspace_credit_reservation_entry_id
         FROM generation_jobs WHERE id = $1 FOR UPDATE`,
      [jobId],
    );
    const state = locked.rows[0]?.state;
    if (!state || ["succeeded", "failed", "cancelled"].includes(state)) {
      await client.query("COMMIT");
      return false;
    }
    if (locked.rows[0].lease_owner !== workerId) {
      await client.query("COMMIT");
      return false;
    }
    if (locked.rows[0].credit_reservation_entry_id) {
      await releaseGenerationCreditsInTransaction(client, {
        idempotencyKey: `generation-release:${jobId}`,
        jobId,
        ownerId: locked.rows[0].owner_id,
        reason:
          error.code === "SUBMISSION_UNKNOWN"
            ? "customer_release_submission_unknown"
            : "generation_release",
      });
    } else if (locked.rows[0].workspace_credit_reservation_entry_id) {
      await releaseOrganizationGenerationCreditsInTransaction(client, {
        idempotencyKey: `organization-generation-release:${jobId}`,
        jobId,
        operationHash: hashOrganizationGenerationCreditOperation({
          jobId,
          operation: "release",
          workspaceId: locked.rows[0].workspace_id,
        }),
        reason:
          error.code === "SUBMISSION_UNKNOWN"
            ? "organization release submission unknown"
            : "organization generation release",
        workspaceId: locked.rows[0].workspace_id,
      });
    }
    await client.query(
      `UPDATE generation_attempts
          SET state = 'failed', error_code = $2, error_message = $3,
              completed_at = now(), updated_at = now()
        WHERE id = $1`,
      [attemptId, error.code, error.message],
    );
    await client.query(
      `UPDATE generation_jobs
          SET state = 'failed', error_code = $3, error_title = $4,
              error_message = $5, error_retryable = $6, completed_at = now(),
              updated_at = now(), lease_owner = NULL, lease_expires_at = NULL
        WHERE id = $1 AND lease_owner = $2`,
      [jobId, workerId, error.code, error.title, error.message, error.retryable],
    );
    await insertEvent(client, {
      eventType: "provider_failed",
      fromState: state,
      jobId,
      toState: "failed",
      detail: { code: error.code },
    });
    await client.query("COMMIT");
    return true;
  } catch (failure) {
    await client.query("ROLLBACK");
    throw failure;
  } finally {
    client.release();
  }
}

export async function deferGenerationJob(
  pool,
  { jobId, message, workerId },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query(
      "SELECT state FROM generation_jobs WHERE id = $1 FOR UPDATE",
      [jobId],
    );
    const state = locked.rows[0]?.state;
    if (state && !["succeeded", "failed", "cancelled"].includes(state)) {
      await client.query(
        `UPDATE generation_jobs
            SET lease_owner = NULL, lease_expires_at = NULL, updated_at = now()
          WHERE id = $1 AND lease_owner = $2`,
        [jobId, workerId],
      );
      await client.query(
        `INSERT INTO generation_queue_outbox (job_id, last_error)
         VALUES ($1, $2)
         ON CONFLICT (job_id) DO UPDATE
           SET dispatched_at = NULL, last_error = EXCLUDED.last_error`,
        [jobId, message.slice(0, 500)],
      );
      await insertEvent(client, {
        eventType: "worker_deferred",
        fromState: state,
        jobId,
        toState: state,
        detail: { message: message.slice(0, 200) },
      });
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
