import { createHash, randomUUID } from "node:crypto";
import { lockReferenceLifecycle } from "../references/lifecycle-lock.mjs";
import { findReadyReferences } from "../references/repository.mjs";
import { resolveWorkspaceAccess } from "../organizations/workspace-access.mjs";
import { ProjectPersistenceError } from "./errors.mjs";

const PROJECT_SELECT = `
  SELECT id, owner_id, workspace_id, creator_owner_id,
         create_idempotency_key, create_input_hash,
         name, prompt, reference_snapshot, model_id, catalog_model_id,
         aspect_ratio, resolution, generation_count, thinking_level,
         google_search, quality, background, output_format, status, version,
         created_at, updated_at
    FROM projects
`;

export function hashProjectInput({ batchIds, name, state }) {
  return createHash("sha256")
    .update(JSON.stringify({ batchIds, name, state }))
    .digest("hex");
}

async function verifyProjectReferences(
  client,
  { ownerId, references, workspaceId },
) {
  if (!references.length) return;
  const currentReferences = await findReadyReferences(client, {
    lock: true,
    ownerId,
    referenceIds: references.map((reference) => reference.id),
    workspaceId,
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
  { batchIds, ownerId, projectId, workspaceId },
) {
  const result = await client.query(
    `SELECT j.id AS job_id, b.id AS batch_id, b.project_id
       FROM generation_jobs j
       JOIN generation_batches b ON b.id = j.batch_id
      WHERE j.creator_owner_id = $1 AND j.workspace_id = $2
        AND b.workspace_id = $2 AND j.id = ANY($3::uuid[])
      FOR UPDATE OF b`,
    [ownerId, workspaceId, batchIds],
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
  { batchIds, idempotencyKey, name, ownerId, state, workspaceId = null },
) {
  const client = await pool.connect();
  const projectId = randomUUID();
  const inputHash = hashProjectInput({ batchIds, name, state });
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
      `${PROJECT_SELECT}
        WHERE workspace_id = $1 AND creator_owner_id = $2
          AND create_idempotency_key = $3`,
      [workspace.id, ownerId, idempotencyKey],
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
      workspaceId: workspace.id,
    });
    const result = await client.query(
      `INSERT INTO projects (
         id, owner_id, workspace_id, creator_owner_id,
         create_idempotency_key, create_input_hash,
         name, prompt, reference_snapshot, model_id,
         aspect_ratio, resolution, generation_count, thinking_level, google_search,
         quality, background, output_format, catalog_model_id
       ) VALUES ($1, $2, $3, $2, $4, $5, $6, $7, $8::jsonb, $9, $10,
                 $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        projectId,
        ownerId,
        workspace.id,
        idempotencyKey,
        inputHash,
        name,
        state.prompt,
        JSON.stringify(state.references),
        state.modelId,
        state.aspectRatio,
        state.resolution,
        state.count,
        state.thinkingLevel,
        state.googleSearch,
        state.quality,
        state.background,
        state.outputFormat,
        state.catalogModelId ?? null,
      ],
    );
    await associateProjectBatches(client, {
      batchIds,
      ownerId,
      projectId,
      workspaceId: workspace.id,
    });
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
  { batchIds, name, ownerId, projectId, state, workspaceId = null },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const workspace = await resolveWorkspaceAccess(client, {
      ownerId,
      workspaceId,
      write: true,
    });
    if (state.references.length) await lockReferenceLifecycle(client);
    const existing = await client.query(
      `SELECT id FROM projects
        WHERE id = $1 AND workspace_id = $2 AND creator_owner_id = $3
          AND status = 'active'
        FOR UPDATE`,
      [projectId, workspace.id, ownerId],
    );
    if (!existing.rowCount) {
      await client.query("COMMIT");
      return null;
    }
    await verifyProjectReferences(client, {
      ownerId,
      references: state.references,
      workspaceId: workspace.id,
    });
    await associateProjectBatches(client, {
      batchIds,
      ownerId,
      projectId,
      workspaceId: workspace.id,
    });
    const result = await client.query(
      `UPDATE projects
          SET name = $4, prompt = $5, reference_snapshot = $6::jsonb,
              model_id = $7, aspect_ratio = $8, resolution = $9,
              generation_count = $10, thinking_level = $11,
              google_search = $12, quality = $13, background = $14,
              output_format = $15, catalog_model_id = $16, version = version + 1,
              updated_at = now()
        WHERE id = $1 AND workspace_id = $2 AND creator_owner_id = $3
        RETURNING *`,
      [
        projectId,
        workspace.id,
        ownerId,
        name,
        state.prompt,
        JSON.stringify(state.references),
        state.modelId,
        state.aspectRatio,
        state.resolution,
        state.count,
        state.thinkingLevel,
        state.googleSearch,
        state.quality,
        state.background,
        state.outputFormat,
        state.catalogModelId ?? null,
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

export async function findProject(
  pool,
  { ownerId, projectId, workspaceId = null },
) {
  const workspace = await resolveWorkspaceAccess(pool, { ownerId, workspaceId });
  const result = await pool.query(
    `${PROJECT_SELECT}
      WHERE id = $1 AND workspace_id = $2 AND creator_owner_id = $3
        AND status = 'active'`,
    [projectId, workspace.id, ownerId],
  );
  return result.rows[0] ?? null;
}

export async function listProjects(pool, { ownerId, workspaceId = null }) {
  const workspace = await resolveWorkspaceAccess(pool, { ownerId, workspaceId });
  const result = await pool.query(
    `${PROJECT_SELECT}
      WHERE workspace_id = $1 AND creator_owner_id = $2 AND status = 'active'
      ORDER BY updated_at DESC, id DESC`,
    [workspace.id, ownerId],
  );
  return result.rows;
}
