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

function documentResourceIds(document) {
  const pages = document.schemaVersion === 2 ? document.pages : [document];
  const ids = { reference: new Set(), generated: new Set(), video: new Set(), audio: new Set(), job: new Set() };
  for (const page of pages) {
    for (const node of page.nodes) {
      if (node.asset) ids[node.asset.kind].add(node.asset.id);
      if (node.jobId) ids.job.add(node.jobId);
    }
    for (const generator of Object.values(page.generators)) {
      for (const id of generator.directReferenceIds) ids.reference.add(id);
    }
    for (const id of Object.values(page.convertedReferences ?? {})) ids.reference.add(id);
  }
  return ids;
}

async function assertNewDocumentResources(client, { document, previousDocument, ownerId, workspace }) {
  const ids = documentResourceIds(document);
  if (previousDocument) {
    const previousIds = documentResourceIds(previousDocument);
    for (const [kind, values] of Object.entries(ids)) {
      for (const id of previousIds[kind]) values.delete(id);
    }
  }
  // Existing snapshots may still point to a removed library item. Preserve
  // those identities during movement and v1 upgrades; private reads continue
  // to authorize access. Check only newly attached resources before writing.
  // Organization managers can read members' generated assets through the
  // existing organization asset boundary. Other material boundaries stay owned.
  const organizationManager = workspace.kind === "organization" &&
    ["org_owner", "org_admin"].includes(workspace.role);
  const statements = {
    reference: `SELECT id FROM reference_assets
      WHERE id = ANY($1::uuid[]) AND workspace_id = $2 AND creator_owner_id = $3
        AND upload_state = 'ready' AND moderation_state = 'accepted' AND object_deleted_at IS NULL`,
    generated: `SELECT a.id FROM assets a
      JOIN generation_jobs j ON j.id = a.job_id
      JOIN generation_batches b ON b.id = a.batch_id
      WHERE a.id = ANY($1::uuid[]) AND a.workspace_id = $2 AND j.workspace_id = $2 AND b.workspace_id = $2
        AND ($4::boolean OR (a.owner_id = $3 AND j.owner_id = $3 AND b.owner_id = $3))
        AND j.state = 'succeeded' AND a.moderation_state = 'accepted'`,
    video: `SELECT id FROM video_materials
      WHERE id = ANY($1::uuid[]) AND workspace_id = $2 AND owner_id = $3 AND upload_state = 'ready'`,
    audio: `SELECT id FROM audio_materials
      WHERE id = ANY($1::uuid[]) AND workspace_id = $2 AND owner_id = $3 AND upload_state = 'ready'`,
    job: `SELECT j.id FROM generation_jobs j
      WHERE j.id = ANY($1::uuid[]) AND j.workspace_id = $2 AND j.owner_id = $3`,
  };
  for (const [kind, values] of Object.entries(ids)) {
    if (!values.size) continue;
    const parameters = [[...values], workspace.id, ownerId];
    if (kind === "generated") parameters.push(organizationManager);
    const result = await client.query(statements[kind], parameters);
    if (new Set(result.rows.map((row) => row.id)).size !== values.size) {
      throw new CanvasProjectError("CANVAS_RESOURCE_UNAVAILABLE",
        "画布中的素材或生成任务不可用，请重新选择素材后重试。", 400);
    }
  }
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
    const loadCurrent = () => client.query(
      `SELECT ${SELECT}, content_hash FROM canvas_projects
       WHERE id = $1 AND workspace_id = $2 AND owner_id = $3 FOR UPDATE`,
      [projectId, workspace.id, ownerId],
    );
    let current = await loadCurrent();
    if (input.expectedVersion === null && !current.rows[0]) {
      await assertNewDocumentResources(client, { document: input.document, ownerId, workspace });
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
      current = await loadCurrent();
    }
    if (!current.rows[0]) {
      throw new CanvasProjectError("VERSION_CONFLICT", "画布已在其他位置更新，请刷新后重试。", 409);
    }
    if (current.rows[0].document.schemaVersion === 2 && input.document.schemaVersion === 1) {
      throw new CanvasProjectError("CANVAS_SCHEMA_UPGRADE_REQUIRED",
        "该画布已使用多页面，请刷新页面后继续编辑。", 400);
    }
    if (current.rows[0].content_hash === hash) {
      await client.query("COMMIT");
      return present(current.rows[0]);
    }
    if (current.rows[0].version !== input.expectedVersion) {
      throw new CanvasProjectError("VERSION_CONFLICT", "画布已在其他位置更新，请刷新后重试。", 409);
    }
    await assertNewDocumentResources(client, {
      document: input.document, previousDocument: current.rows[0].document, ownerId, workspace,
    });
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
