import { createHash } from "node:crypto";
import { resolveWorkspaceAccess } from "../organizations/workspace-access.mjs";
import { CanvasProjectError } from "./errors.mjs";

const SELECT = "id, name, document, version, updated_at";

function present(row) {
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    updatedAt: new Date(row.updated_at).toISOString(),
    document: row.document,
  };
}

function contentHash({ name, document }) {
  return createHash("sha256").update(JSON.stringify({ name, document })).digest("hex");
}

export async function listCanvasProjectRecords(pool, { ownerId, workspaceId = null }) {
  const workspace = await resolveWorkspaceAccess(pool, { ownerId, workspaceId });
  const result = await pool.query(
    `SELECT id, name, version, updated_at FROM canvas_projects
      WHERE workspace_id = $1 AND owner_id = $2
      ORDER BY updated_at DESC, id DESC`,
    [workspace.id, ownerId],
  );
  return result.rows.map((row) => ({
    id: row.id, name: row.name, version: row.version,
    updatedAt: new Date(row.updated_at).toISOString(),
  }));
}

export async function readCanvasProjectRecord(pool, { ownerId, projectId, workspaceId = null }) {
  const workspace = await resolveWorkspaceAccess(pool, { ownerId, workspaceId });
  const result = await pool.query(
    `SELECT ${SELECT} FROM canvas_projects
      WHERE id = $1 AND workspace_id = $2 AND owner_id = $3`,
    [projectId, workspace.id, ownerId],
  );
  return result.rows[0] ? present(result.rows[0]) : null;
}

export async function saveCanvasProjectRecord(pool, { ownerId, projectId, workspaceId = null, input }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const workspace = await resolveWorkspaceAccess(client, { ownerId, workspaceId, write: true });
    const hash = contentHash(input);
    if (input.expectedVersion === null) {
      const inserted = await client.query(
        `INSERT INTO canvas_projects (id, workspace_id, owner_id, name, document, content_hash)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6)
         ON CONFLICT (id) DO NOTHING RETURNING ${SELECT}`,
        [projectId, workspace.id, ownerId, input.name, JSON.stringify(input.document), hash],
      );
      if (inserted.rows[0]) {
        await client.query("COMMIT");
        return present(inserted.rows[0]);
      }
    }
    const current = await client.query(
      `SELECT ${SELECT}, content_hash FROM canvas_projects
       WHERE id = $1 AND workspace_id = $2 AND owner_id = $3 FOR UPDATE`,
      [projectId, workspace.id, ownerId],
    );
    if (!current.rows[0]) {
      throw new CanvasProjectError("VERSION_CONFLICT", "画布已在其他位置更新，请刷新后重试。", 409);
    }
    if (current.rows[0].content_hash === hash) {
      await client.query("COMMIT");
      return present(current.rows[0]);
    }
    if (current.rows[0].version !== input.expectedVersion) {
      throw new CanvasProjectError("VERSION_CONFLICT", "画布已在其他位置更新，请刷新后重试。", 409);
    }
    const updated = await client.query(
      `UPDATE canvas_projects
          SET name = $4, document = $5::jsonb, content_hash = $6,
              version = version + 1, updated_at = now()
        WHERE id = $1 AND workspace_id = $2 AND owner_id = $3
        RETURNING ${SELECT}`,
      [projectId, workspace.id, ownerId, input.name, JSON.stringify(input.document), hash],
    );
    await client.query("COMMIT");
    return present(updated.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
