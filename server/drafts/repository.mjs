import { CREATION_DRAFT_TTL_MS } from "./constants.mjs";
import { DraftPersistenceError } from "./errors.mjs";
import { lockReferenceLifecycle } from "../references/lifecycle-lock.mjs";
import { findReadyReferences } from "../references/repository.mjs";

function activeDraft(row, now) {
  return row && new Date(row.expires_at).getTime() > now.getTime() ? row : null;
}

export async function findCreationDraft(pool, { now = new Date(), ownerId }) {
  const result = await pool.query(
    `SELECT * FROM creation_drafts
      WHERE owner_id = $1 AND expires_at > $2`,
    [ownerId, now],
  );
  return result.rows[0] ?? null;
}

export async function saveCreationDraft(
  pool,
  { expectedVersion, now = new Date(), ownerId, state },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await lockReferenceLifecycle(client);
    const existingResult = await client.query(
      "SELECT * FROM creation_drafts WHERE owner_id = $1 FOR UPDATE",
      [ownerId],
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
         owner_id, prompt, reference_snapshot, model_id, aspect_ratio,
         resolution, generation_count, version, expires_at, created_at, updated_at
       ) VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10, $10)
       ON CONFLICT (owner_id) DO UPDATE
         SET prompt = EXCLUDED.prompt,
             reference_snapshot = EXCLUDED.reference_snapshot,
             model_id = EXCLUDED.model_id,
             aspect_ratio = EXCLUDED.aspect_ratio,
             resolution = EXCLUDED.resolution,
             generation_count = EXCLUDED.generation_count,
             version = EXCLUDED.version,
             expires_at = EXCLUDED.expires_at,
             updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [
        ownerId,
        state.prompt,
        JSON.stringify(references),
        state.modelId,
        state.aspectRatio,
        state.resolution,
        state.count,
        nextVersion,
        expiresAt,
        now,
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
  { expectedVersion, now = new Date(), ownerId },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      "SELECT * FROM creation_drafts WHERE owner_id = $1 FOR UPDATE",
      [ownerId],
    );
    const existing = result.rows[0] ?? null;
    const current = activeDraft(existing, now);
    if ((current?.version ?? null) !== expectedVersion) {
      await client.query("COMMIT");
      return { conflict: true, current };
    }
    if (existing) {
      await client.query("DELETE FROM creation_drafts WHERE owner_id = $1", [ownerId]);
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
