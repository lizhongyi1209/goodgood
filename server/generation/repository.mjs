import { createHash, randomUUID } from "node:crypto";

export class GenerationPersistenceError extends Error {
  constructor(code, message, status = 500) {
    super(message);
    this.name = "GenerationPersistenceError";
    this.code = code;
    this.status = status;
  }
}

export function hashGenerationInput(input) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        aspectRatio: input.aspectRatio,
        count: input.count,
        modelId: input.modelId,
        prompt: input.prompt,
        references: input.references.map(({ id, name }, index) => ({
          id,
          name,
          ordinal: index + 1,
        })),
        resolution: input.resolution,
      }),
    )
    .digest("hex");
}

export function generationInputFromRow(row) {
  return {
    aspectRatio: row.aspect_ratio,
    count: row.requested_count,
    modelId: row.model_id,
    prompt: row.prompt,
    references: (row.reference_snapshot ?? []).map((reference) => ({
      id: reference.id,
      name: reference.name,
      url: "",
    })),
    resolution: row.resolution,
  };
}

export function publicGenerationJob(row, previewUrl = null) {
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
    input: generationInputFromRow(row),
    outputs:
      row.asset_id && previewUrl
        ? [
            {
              id: row.asset_id,
              previewPosition: "50% 50%",
              previewUrl,
            },
          ]
        : [],
    state: row.state,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

const JOB_SELECT = `
  SELECT j.*,
         b.prompt,
         b.reference_snapshot,
         b.model_id,
         b.aspect_ratio,
         b.resolution,
         b.requested_count,
         b.input_hash,
         a.id AS asset_id,
         a.object_key,
         a.mime_type,
         a.pixel_width,
         a.pixel_height,
         a.byte_size,
         a.checksum
    FROM generation_jobs j
    JOIN generation_batches b ON b.id = j.batch_id
    LEFT JOIN assets a ON a.job_id = j.id
`;

export async function findGenerationJob(pool, { jobId, ownerId }) {
  const result = await pool.query(
    `${JOB_SELECT} WHERE j.id = $1 AND j.owner_id = $2`,
    [jobId, ownerId],
  );
  return result.rows[0] ?? null;
}

export async function createGenerationJob(
  pool,
  { idempotencyKey, input, ownerId, retryOfJobId = null },
) {
  const inputHash = hashGenerationInput(input);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [`${ownerId}:${idempotencyKey}`],
    );

    const existing = await client.query(
      `${JOB_SELECT} WHERE j.owner_id = $1 AND j.idempotency_key = $2`,
      [ownerId, idempotencyKey],
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
        "SELECT state FROM generation_jobs WHERE id = $1 AND owner_id = $2",
        [retryOfJobId, ownerId],
      );
      if (!source.rowCount || source.rows[0].state !== "failed") {
        throw new GenerationPersistenceError(
          "RETRY_NOT_ALLOWED",
          "只有失败的生成任务可以重试。",
          409,
        );
      }
    }

    const batchId = randomUUID();
    const jobId = randomUUID();
    const references = input.references.map(({ id, name }, index) => ({
      id,
      name,
      ordinal: index + 1,
    }));
    await client.query(
      `INSERT INTO generation_batches (
         id, owner_id, prompt, reference_snapshot, model_id, aspect_ratio,
         resolution, requested_count, input_hash
       ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9)`,
      [
        batchId,
        ownerId,
        input.prompt,
        JSON.stringify(references),
        input.modelId,
        input.aspectRatio,
        input.resolution,
        input.count,
        inputHash,
      ],
    );
    await client.query(
      `INSERT INTO generation_jobs (
         id, batch_id, owner_id, idempotency_key, retry_of_job_id
       ) VALUES ($1, $2, $3, $4, $5)`,
      [jobId, batchId, ownerId, idempotencyKey, retryOfJobId],
    );
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
  { jobId, leaseMs, workerId },
) {
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
    if (["succeeded", "failed", "cancelled"].includes(job.state)) {
      await client.query("COMMIT");
      return { claimed: false, reason: "terminal" };
    }
    if (
      job.lease_owner &&
      job.lease_owner !== workerId &&
      job.lease_expires_at &&
      new Date(job.lease_expires_at).getTime() > Date.now()
    ) {
      await client.query("COMMIT");
      return { claimed: false, reason: "leased" };
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
         ) VALUES ($1, $2, $3, 'm3-mock-v1', 'goodgood-mock',
                   'nano-banana-2-mock-v1', 'created', $4)
         RETURNING *`,
        [attemptId, jobId, ordinal, job.input_hash],
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
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function saveProviderTask(pool, { attemptId, taskId }) {
  await pool.query(
    `UPDATE generation_attempts
        SET provider_task_id = COALESCE(provider_task_id, $2),
            state = 'submitted', updated_at = now()
      WHERE id = $1`,
    [attemptId, taskId],
  );
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
  { asset, attemptId, jobId, resultHash, workerId },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query(
      "SELECT state FROM generation_jobs WHERE id = $1 FOR UPDATE",
      [jobId],
    );
    const state = locked.rows[0]?.state;
    if (state === "succeeded") {
      await client.query("COMMIT");
      return false;
    }
    if (!state || state === "failed" || state === "cancelled") {
      await client.query("COMMIT");
      return false;
    }

    await client.query(
      `INSERT INTO assets (
         id, owner_id, batch_id, job_id, object_key, checksum, mime_type,
         pixel_width, pixel_height, aspect_ratio, byte_size
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (job_id) DO NOTHING`,
      [
        asset.id,
        asset.ownerId,
        asset.batchId,
        jobId,
        asset.objectKey,
        asset.checksum,
        asset.mimeType,
        asset.pixelWidth,
        asset.pixelHeight,
        asset.aspectRatio,
        asset.byteSize,
      ],
    );
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
      detail: { assetId: asset.id },
    });
    await client.query("COMMIT");
    return true;
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
      "SELECT state FROM generation_jobs WHERE id = $1 FOR UPDATE",
      [jobId],
    );
    const state = locked.rows[0]?.state;
    if (!state || ["succeeded", "failed", "cancelled"].includes(state)) {
      await client.query("COMMIT");
      return false;
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
