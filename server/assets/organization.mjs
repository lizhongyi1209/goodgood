import { randomUUID } from "node:crypto";
import { sessionExpiredError } from "../auth/errors.mjs";
import { getGenerationResources } from "../generation/resources.mjs";
import { resolveWorkspaceAccess } from "../organizations/workspace-access.mjs";
import { AssetRequestError } from "./api.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ASSET_TABLES = Object.freeze({
  generated: { table: "assets", condition: "moderation_state='accepted'" },
  reference: { table: "reference_assets", condition: "upload_state='ready' AND moderation_state='accepted' AND object_deleted_at IS NULL" },
  video: { table: "video_materials", condition: "upload_state='ready'" },
  audio: { table: "audio_materials", condition: "upload_state='ready'" },
  text: { table: "text_assets", condition: "TRUE" },
});

function ownerIdFromContext(ownerContext) {
  if (!ownerContext?.ownerId) throw sessionExpiredError();
  return ownerContext.ownerId;
}

function requireId(value) {
  if (typeof value !== "string" || !UUID.test(value)) {
    throw new AssetRequestError("ASSET_ORGANIZATION_INVALID", "资产标识无效。", 400);
  }
  return value;
}

function folderName(value) {
  const name = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (!name || name.length > 64 || /[\u0000-\u001f\u007f]/.test(name)) {
    throw new AssetRequestError("ASSET_FOLDER_INVALID", "文件夹名称应为 1–64 个字符。", 400);
  }
  return name;
}

function assetDisplayName(value) {
  const raw = typeof value === "string" ? value : "";
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name || name.length > 255 || /[\u0000-\u001f\u007f]/.test(raw)) {
    throw new AssetRequestError("ASSET_NAME_INVALID", "资产名称应为 1–255 个字符。", 400);
  }
  return name;
}

function normalizeTags(value) {
  if (!Array.isArray(value) || value.length > 8) {
    throw new AssetRequestError("ASSET_TAGS_INVALID", "每项资产最多设置 8 个标签。", 400);
  }
  const tags = value.map((tag) => typeof tag === "string" ? tag.trim() : "");
  if (tags.some((tag) => !tag || tag.length > 24 || /[\u0000-\u001f\u007f]/.test(tag)) ||
      new Set(tags.map((tag) => tag.toLocaleLowerCase())).size !== tags.length) {
    throw new AssetRequestError("ASSET_TAGS_INVALID", "标签需为不重复的 1–24 个字符。", 400);
  }
  return tags;
}

function mapFolder(row) {
  return { id: row.id, name: row.name, createdAt: new Date(row.created_at).toISOString() };
}

export async function listAssetOrganization({ ownerContext, workspaceId = /** @type {string | null} */ (null), resourcesOverride = null }) {
  const ownerId = ownerIdFromContext(ownerContext);
  const resources = resourcesOverride ?? await getGenerationResources();
  const workspace = await resolveWorkspaceAccess(resources.pool, { ownerId, workspaceId });
  const [folders, arrangements] = await Promise.all([
    resources.pool.query(`SELECT id,name,created_at FROM asset_folders WHERE workspace_id=$1 AND owner_id=$2 ORDER BY created_at,id`, [workspace.id, ownerId]),
    resources.pool.query(`SELECT asset_kind,asset_id,folder_id,tags,display_name FROM asset_organization WHERE workspace_id=$1 AND owner_id=$2`, [workspace.id, ownerId]),
  ]);
  return {
    folders: folders.rows.map(mapFolder),
    arrangements: arrangements.rows.map((row) => ({ kind: row.asset_kind, id: row.asset_id, folderId: row.folder_id, tags: row.tags, displayName: row.display_name })),
  };
}

export async function renameAssetItem({ kind, assetId, input, ownerContext, workspaceId = /** @type {string | null} */ (null), resourcesOverride = null }) {
  const ownerId = ownerIdFromContext(ownerContext);
  const source = ASSET_TABLES[kind];
  requireId(assetId);
  if (!source) throw new AssetRequestError("ASSET_ORGANIZATION_INVALID", "资产类型无效。", 400);
  const name = assetDisplayName(input?.name);
  const resources = resourcesOverride ?? await getGenerationResources();
  const client = await resources.pool.connect();
  try {
    await client.query("BEGIN");
    const workspace = await resolveWorkspaceAccess(client, { ownerId, workspaceId, write: true });
    const ownerColumn = kind === "generated" || kind === "reference" ? "creator_owner_id" : "owner_id";
    const asset = await client.query(`SELECT id FROM ${source.table} WHERE id=$1 AND workspace_id=$2 AND ${ownerColumn}=$3 AND ${source.condition} FOR SHARE`, [assetId, workspace.id, ownerId]);
    if (!asset.rowCount) throw new AssetRequestError("ASSET_NOT_FOUND", "未找到可重命名的资产。", 404);
    const result = await client.query(`INSERT INTO asset_organization(workspace_id,owner_id,asset_kind,asset_id,display_name)
      VALUES($1,$2,$3,$4,$5)
      ON CONFLICT(workspace_id,owner_id,asset_kind,asset_id)
      DO UPDATE SET display_name=EXCLUDED.display_name,updated_at=now()
      RETURNING folder_id,tags,display_name`, [workspace.id, ownerId, kind, assetId, name]);
    await client.query("COMMIT");
    const row = result.rows[0];
    return { kind, id: assetId, folderId: row.folder_id, tags: row.tags, displayName: row.display_name };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally { client.release(); }
}

export async function createAssetFolder({ input, ownerContext, workspaceId = /** @type {string | null} */ (null), resourcesOverride = null }) {
  const ownerId = ownerIdFromContext(ownerContext);
  const name = folderName(input?.name);
  const resources = resourcesOverride ?? await getGenerationResources();
  const workspace = await resolveWorkspaceAccess(resources.pool, { ownerId, workspaceId, write: true });
  const result = await resources.pool.query(`INSERT INTO asset_folders(id,workspace_id,owner_id,name)
    VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id,name,created_at`, [randomUUID(), workspace.id, ownerId, name]);
  if (!result.rowCount) throw new AssetRequestError("ASSET_FOLDER_EXISTS", "已存在同名文件夹。", 409);
  return { folder: mapFolder(result.rows[0]) };
}

export async function renameAssetFolder({ folderId, input, ownerContext, workspaceId = /** @type {string | null} */ (null), resourcesOverride = null }) {
  const ownerId = ownerIdFromContext(ownerContext);
  requireId(folderId);
  const name = folderName(input?.name);
  const resources = resourcesOverride ?? await getGenerationResources();
  const workspace = await resolveWorkspaceAccess(resources.pool, { ownerId, workspaceId, write: true });
  const result = await resources.pool.query(`UPDATE asset_folders SET name=$4,updated_at=now()
    WHERE id=$1 AND workspace_id=$2 AND owner_id=$3
      AND NOT EXISTS (SELECT 1 FROM asset_folders other WHERE other.workspace_id=$2 AND other.owner_id=$3 AND lower(other.name)=lower($4) AND other.id<>$1)
    RETURNING id,name,created_at`, [folderId, workspace.id, ownerId, name]);
  if (!result.rowCount) throw new AssetRequestError("ASSET_FOLDER_CONFLICT", "文件夹不存在或名称已被使用。", 409);
  return { folder: mapFolder(result.rows[0]) };
}

export async function deleteAssetFolder({ folderId, ownerContext, workspaceId = /** @type {string | null} */ (null), resourcesOverride = null }) {
  const ownerId = ownerIdFromContext(ownerContext);
  requireId(folderId);
  const resources = resourcesOverride ?? await getGenerationResources();
  const client = await resources.pool.connect();
  try {
    await client.query("BEGIN");
    const workspace = await resolveWorkspaceAccess(client, { ownerId, workspaceId, write: true });
    const folder = await client.query(`SELECT id FROM asset_folders WHERE id=$1 AND workspace_id=$2 AND owner_id=$3 FOR UPDATE`, [folderId, workspace.id, ownerId]);
    if (!folder.rowCount) throw new AssetRequestError("ASSET_FOLDER_NOT_FOUND", "未找到文件夹。", 404);
    await client.query(`UPDATE asset_organization SET folder_id=NULL,updated_at=now() WHERE folder_id=$1 AND workspace_id=$2 AND owner_id=$3`, [folderId, workspace.id, ownerId]);
    await client.query(`DELETE FROM asset_folders WHERE id=$1 AND workspace_id=$2 AND owner_id=$3`, [folderId, workspace.id, ownerId]);
    await client.query("COMMIT");
    return { deleted: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export async function saveAssetOrganization({ kind, assetId, input, ownerContext, workspaceId = /** @type {string | null} */ (null), resourcesOverride = null }) {
  const ownerId = ownerIdFromContext(ownerContext);
  const source = ASSET_TABLES[kind];
  requireId(assetId);
  if (!source) throw new AssetRequestError("ASSET_ORGANIZATION_INVALID", "资产类型无效。", 400);
  const folderId = input?.folderId == null ? null : requireId(input.folderId);
  const tags = normalizeTags(input?.tags ?? []);
  const resources = resourcesOverride ?? await getGenerationResources();
  const client = await resources.pool.connect();
  try {
    await client.query("BEGIN");
    const workspace = await resolveWorkspaceAccess(client, { ownerId, workspaceId, write: true });
    const asset = await client.query(`SELECT id FROM ${source.table} WHERE id=$1 AND workspace_id=$2 AND ${kind === "reference" ? "creator_owner_id" : kind === "generated" ? "creator_owner_id" : "owner_id"}=$3 AND ${source.condition}${kind === "text" ? " FOR SHARE" : ""}`, [assetId, workspace.id, ownerId]);
    if (!asset.rowCount) throw new AssetRequestError("ASSET_NOT_FOUND", "未找到可整理的资产。", 404);
    if (folderId) {
      const folder = await client.query(`SELECT id FROM asset_folders WHERE id=$1 AND workspace_id=$2 AND owner_id=$3`, [folderId, workspace.id, ownerId]);
      if (!folder.rowCount) throw new AssetRequestError("ASSET_FOLDER_NOT_FOUND", "未找到文件夹。", 404);
    }
    if (!folderId && tags.length === 0) {
      await client.query(`UPDATE asset_organization SET folder_id=NULL,tags='{}'::text[],updated_at=now()
        WHERE workspace_id=$1 AND owner_id=$2 AND asset_kind=$3 AND asset_id=$4 AND display_name IS NOT NULL`, [workspace.id, ownerId, kind, assetId]);
      await client.query(`DELETE FROM asset_organization WHERE workspace_id=$1 AND owner_id=$2 AND asset_kind=$3 AND asset_id=$4 AND display_name IS NULL`, [workspace.id, ownerId, kind, assetId]);
    } else {
      await client.query(`INSERT INTO asset_organization(workspace_id,owner_id,asset_kind,asset_id,folder_id,tags)
        VALUES($1,$2,$3,$4,$5,$6::text[])
        ON CONFLICT(workspace_id,owner_id,asset_kind,asset_id)
        DO UPDATE SET folder_id=EXCLUDED.folder_id,tags=EXCLUDED.tags,updated_at=now()`,
      [workspace.id, ownerId, kind, assetId, folderId, tags]);
    }
    const saved = await client.query(`SELECT display_name FROM asset_organization WHERE workspace_id=$1 AND owner_id=$2 AND asset_kind=$3 AND asset_id=$4`, [workspace.id, ownerId, kind, assetId]);
    await client.query("COMMIT");
    return { kind, id: assetId, folderId, tags, displayName: saved.rows[0]?.display_name ?? null };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
