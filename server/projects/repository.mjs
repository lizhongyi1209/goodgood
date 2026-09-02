import { createHash, randomUUID } from "node:crypto";
import { lockReferenceLifecycle } from "../references/lifecycle-lock.mjs";
import { findReadyReferences } from "../references/repository.mjs";
import { ProjectPersistenceError } from "./errors.mjs";

const PROJECT_SELECT = `
  SELECT id, owner_id, create_idempotency_key, create_input_hash,
         name, prompt, reference_snapshot, model_id,
         aspect_ratio, resolution, generation_count, status, version,
         created_at, updated_at
    FROM projects
`;

export function hashProjectInput({ batchIds, name, state }) {
  return createHash("sha256")
    .update(JSON.stringify({ batchIds, name, state }))
    .digest("hex");
}

async function verifyProjectReferences(client, { ownerId, references }) {
  if (!references.length) return;
  const currentReferences = await findReadyReferences(client, {
    lock: true,
    ownerId,
    referenceIds: references.map((reference) => reference.id),
  });
  const referencesMatch = references.every((reference, index) => {
    const current = currentReferences[index];
    return current?.id === reference.id && current.object_key === reference.objectKey;
  });
  if (!referencesMatch) {
    throw new ProjectPersistenceError(
      "PROJECT_REFERENCE_NOT_READY",
      "部分参考图已不可用，请刷新后重试。",
      409,
    );
  }
}

async function associateProjectBatches(
  client,
  { batchIds, ownerId, projectId },
) {
  const result = await client.query(
    `SELECT j.id AS job_id, b.id AS batch_id, b.project_id
       FROM generation_jobs j
       JOIN generation_batches b ON b.id = j.batch_id
      WHERE j.owner_id = $1 AND j.id = ANY($2::uuid[])
      FOR UPDATE OF b`,
    [ownerId, batchIds],
  );
  if (
    result.rowCount !== batchIds.length ||
    result.rows.some(
      (row) => row.project_id !== null && row.project_id !== projectId,
    )
  ) {
    throw new ProjectPersistenceError(
      "PROJECT_BATCH_CONFLICT",
      "部分生成批次无法归入该项目，请刷新后重试。",
      409,
    );
  }
  await client.query(
    `UPDATE generation_batches
        SET project_id = $1, updated_at = now()
      WHERE id = ANY($2::uuid[])`,
    [projectId, result.rows.map((row) => row.batch_id)],
  );
}

export async function createProject(
  pool,
  { batchIds, idempotencyKey, name, ownerId, state },
) {
  const client = await pool.connect();
  const projectId = randomUUID();
  const inputHash = hashProjectInput({ batchIds, name, state });
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [`${ownerId}:${idempotencyKey}`],
    );
    const existing = await client.query(
      `${PROJECT_SELECT}
        WHERE owner_id = $1 AND create_idempotency_key = $2`,
      [ownerId, idempotencyKey],
    );
    if (existing.rowCount) {
      if (existing.rows[0].create_input_hash !== inputHash) {
        throw new ProjectPersistenceError(
          "IDEMPOTENCY_CONFLICT",
          "同一幂等键已用于不同的项目保存请求。",
          409,
        );
      }
      await client.query("COMMIT");
      return existing.rows[0];
    }
    if (state.references.length) await lockReferenceLifecycle(client);
    await verifyProjectReferences(client, {
      ownerId,
      references: state.references,
    });
    const result = await client.query(
      `INSERT INTO projects (
         id, owner_id, create_idempotency_key, create_input_hash,
         name, prompt, reference_snapshot, model_id,
         aspect_ratio, resolution, generation_count
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11)
       RETURNING *`,
      [
        projectId,
        ownerId,
        idempotencyKey,
        inputHash,
        name,
        state.prompt,
        JSON.stringify(state.references),
        state.modelId,
        state.aspectRatio,
        state.resolution,
        state.count,
      ],
    );
    await associateProjectBatches(client, { batchIds, ownerId, projectId });
    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateProject(
  pool,
  { batchIds, name, ownerId, projectId, state },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (state.references.length) await lockReferenceLifecycle(client);
    const existing = await client.query(
      `SELECT id FROM projects
        WHERE id = $1 AND owner_id = $2 AND status = 'active'
        FOR UPDATE`,
      [projectId, ownerId],
    );
    if (!existing.rowCount) {
      await client.query("COMMIT");
      return null;
    }
    await verifyProjectReferences(client, {
      ownerId,
      references: state.references,
    });
    await associateProjectBatches(client, { batchIds, ownerId, projectId });
    const result = await client.query(
      `UPDATE projects
          SET name = $3, prompt = $4, reference_snapshot = $5::jsonb,
              model_id = $6, aspect_ratio = $7, resolution = $8,
              generation_count = $9, version = version + 1,
              updated_at = now()
        WHERE id = $1 AND owner_id = $2
        RETURNING *`,
      [
        projectId,
        ownerId,
        name,
        state.prompt,
        JSON.stringify(state.references),
        state.modelId,
        state.aspectRatio,
        state.resolution,
        state.count,
      ],
    );
    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function findProject(pool, { ownerId, projectId }) {
  const result = await pool.query(
    `${PROJECT_SELECT}
      WHERE id = $1 AND owner_id = $2 AND status = 'active'`,
    [projectId, ownerId],
  );
  return result.rows[0] ?? null;
}

export async function listProjects(pool, { ownerId }) {
  const result = await pool.query(
    `${PROJECT_SELECT}
      WHERE owner_id = $1 AND status = 'active'
      ORDER BY updated_at DESC, id DESC`,
    [ownerId],
  );
  return result.rows;
}
