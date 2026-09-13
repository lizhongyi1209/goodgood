import { CREATION_DRAFT_TTL_MS } from "./constants.mjs";
import { DraftPersistenceError } from "./errors.mjs";
import { lockReferenceLifecycle } from "../references/lifecycle-lock.mjs";
import { findReadyReferences } from "../references/repository.mjs";
import { resolveWorkspaceAccess } from "../organizations/workspace-access.mjs";

function activeDraft(row, now) {
  return row && new Date(row.expires_at).getTime() > now.getTime() ? row : null;
}

export async function findCreationDraft(
  pool,
  { now = new Date(), ownerId, workspaceId = null },
) {
  const workspace = await resolveWorkspaceAccess(pool, { ownerId, workspaceId });
  const result = await pool.query(
    `SELECT * FROM creation_drafts
      WHERE workspace_id = $1 AND creator_owner_id = $2 AND expires_at > $3`,
    [workspace.id, ownerId, now],
  );
  return result.rows[0] ?? null;
}

export async function saveCreationDraft(
  pool,
  { expectedVersion, now = new Date(), ownerId, state, workspaceId = null },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const workspace = await resolveWorkspaceAccess(client, {
      ownerId,
      workspaceId,
      write: true,
    });
    await lockReferenceLifecycle(client);
    const existingResult = await client.query(
      `SELECT * FROM creation_drafts
        WHERE workspace_id = $1 AND creator_owner_id = $2 FOR UPDATE`,
      [workspace.id, ownerId],
    );
    const existing = existingResult.rows[0] ?? null;
    const current = activeDraft(existing, now);
    if ((current?.version ?? null) !== expectedVersion) {
      await client.query("COMMIT");
      return { conflict: true, current };
    }

    const readyReferences = await findReadyReferences(client, {
      lock: true,
      ownerId,
      referenceIds: state.referenceIds,
      workspaceId: workspace.id,
    });
    if (readyReferences.length !== state.referenceIds.length) {
      throw new DraftPersistenceError(
        "DRAFT_REFERENCE_NOT_READY",
        "部分参考图已不可用，请移除后重试。",
        409,
      );
    }
    const references = readyReferences.map((reference, index) => ({
      id: reference.id,
      name: reference.original_file_name,
      objectKey: reference.object_key,
      ordinal: index + 1,
    }));
    const nextVersion = existing ? existing.version + 1 : 1;
    const expiresAt = new Date(now.getTime() + CREATION_DRAFT_TTL_MS);
    const result = await client.query(
      `INSERT INTO creation_drafts (
         owner_id, workspace_id, creator_owner_id, prompt,
         reference_snapshot, model_id, aspect_ratio,
         resolution, generation_count, thinking_level, google_search,
         quality, background, output_format,
         version, expires_at, created_at, updated_at, catalog_model_id
       ) VALUES ($1, $2, $1, $3, $4::jsonb, $5, $6, $7, $8, $9,
                 $10, $11, $12, $13, $14, $15, $16, $16, $17)
       ON CONFLICT (workspace_id, creator_owner_id) DO UPDATE
         SET prompt = EXCLUDED.prompt,
             reference_snapshot = EXCLUDED.reference_snapshot,
             model_id = EXCLUDED.model_id,
             catalog_model_id = EXCLUDED.catalog_model_id,
             aspect_ratio = EXCLUDED.aspect_ratio,
             resolution = EXCLUDED.resolution,
             generation_count = EXCLUDED.generation_count,
             thinking_level = EXCLUDED.thinking_level,
             google_search = EXCLUDED.google_search,
             quality = EXCLUDED.quality,
             background = EXCLUDED.background,
             output_format = EXCLUDED.output_format,
             version = EXCLUDED.version,
             expires_at = EXCLUDED.expires_at,
             updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [
        ownerId,
        workspace.id,
        state.prompt,
        JSON.stringify(references),
        state.modelId,
        state.aspectRatio,
        state.resolution,
        state.count,
        state.thinkingLevel,
        state.googleSearch,
        state.quality,
        state.background,
        state.outputFormat,
        nextVersion,
        expiresAt,
        now,
        state.catalogModelId ?? null,
      ],
    );
    await client.query("COMMIT");
    return { conflict: false, current: result.rows[0] };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteCreationDraft(
  pool,
  { expectedVersion, now = new Date(), ownerId, workspaceId = null },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const workspace = await resolveWorkspaceAccess(client, {
      ownerId,
      workspaceId,
      write: true,
    });
    const result = await client.query(
      `SELECT * FROM creation_drafts
        WHERE workspace_id = $1 AND creator_owner_id = $2 FOR UPDATE`,
      [workspace.id, ownerId],
    );
    const existing = result.rows[0] ?? null;
    const current = activeDraft(existing, now);
    if ((current?.version ?? null) !== expectedVersion) {
      await client.query("COMMIT");
      return { conflict: true, current };
    }
    if (existing) {
      await client.query(
        `DELETE FROM creation_drafts
          WHERE workspace_id = $1 AND creator_owner_id = $2`,
        [workspace.id, ownerId],
      );
    }
    await client.query("COMMIT");
    return { conflict: false, current: null };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
