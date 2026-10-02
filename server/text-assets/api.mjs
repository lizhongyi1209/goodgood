import { sessionExpiredError } from "../auth/errors.mjs";
import { AssetRequestError, assetApiError } from "../assets/api.mjs";
import { getGenerationResources } from "../generation/resources.mjs";
import { resolveWorkspaceAccess } from "../organizations/workspace-access.mjs";
import { newRequestId } from "../observability/http.mjs";
import { isTextAssetId, textAssetInputError, textAssetPreview } from "../../shared/contracts/text-assets.mjs";

function ownerIdFor(context) { if (!context?.ownerId) throw sessionExpiredError(); return context.ownerId; }
function requireId(id) { if (!isTextAssetId(id)) throw new AssetRequestError("TEXT_ASSET_INVALID", "文本模板标识无效。", 400); }
function describe(row, full = false) {
  return { id: row.id, name: row.name, previewText: textAssetPreview(row.text_content), createdAt: new Date(row.created_at).toISOString(),
    ...(full ? { markdown: row.markdown, text: row.text_content } : {}) };
}
export function textAssetApiError(error, requestId = newRequestId()) {
  const failure = assetApiError(error, requestId);
  if (failure.status === 503) failure.body.error = { ...failure.body.error, code: "TEXT_ASSETS_UNAVAILABLE", message: "文本模板尚未启用或暂时不可用，请稍后重试。" };
  return failure;
}
export async function listTextAssets({ ownerContext, workspaceId = /** @type {string | null} */ (null), resourcesOverride = null }) {
  const ownerId = ownerIdFor(ownerContext);
  const resources = resourcesOverride ?? await getGenerationResources();
  const workspace = await resolveWorkspaceAccess(resources.pool, { ownerId, workspaceId });
  const result = await resources.pool.query(`SELECT id,name,left(text_content,2000) AS text_content,created_at FROM text_assets
    WHERE workspace_id=$1 AND owner_id=$2 ORDER BY created_at DESC,id`, [workspace.id, ownerId]);
  return { assets: result.rows.map((row) => describe(row)) };
}
export async function getTextAsset({ assetId, ownerContext, workspaceId = /** @type {string | null} */ (null), resourcesOverride = null }) {
  requireId(assetId);
  const ownerId = ownerIdFor(ownerContext);
  const resources = resourcesOverride ?? await getGenerationResources();
  const workspace = await resolveWorkspaceAccess(resources.pool, { ownerId, workspaceId });
  const result = await resources.pool.query("SELECT * FROM text_assets WHERE id=$1 AND workspace_id=$2 AND owner_id=$3", [assetId, workspace.id, ownerId]);
  if (!result.rowCount) throw new AssetRequestError("TEXT_ASSET_NOT_FOUND", "未找到文本模板。", 404);
  return { asset: describe(result.rows[0], true) };
}
export async function createTextAsset({ input, ownerContext, workspaceId = /** @type {string | null} */ (null), resourcesOverride = null }) {
  const ownerId = ownerIdFor(ownerContext);
  const invalid = textAssetInputError(input);
  if (invalid) throw new AssetRequestError("TEXT_ASSET_INVALID", invalid, 400);
  const resources = resourcesOverride ?? await getGenerationResources();
  const client = await resources.pool.connect();
  try {
    await client.query("BEGIN");
    const workspace = await resolveWorkspaceAccess(client, { ownerId, workspaceId, write: true });
    await client.query(`INSERT INTO text_assets(id,workspace_id,owner_id,name,markdown,text_content) VALUES($1,$2,$3,$4,$5,$6)
      ON CONFLICT(id) DO NOTHING`, [input.id, workspace.id, ownerId, input.name.trim(), input.markdown, input.text]);
    const result = await client.query("SELECT * FROM text_assets WHERE id=$1 AND workspace_id=$2 AND owner_id=$3 FOR SHARE", [input.id, workspace.id, ownerId]);
    const row = result.rows[0];
    if (!row || row.name !== input.name.trim() || row.markdown !== input.markdown || row.text_content !== input.text) throw new AssetRequestError("TEXT_ASSET_CONFLICT", "模板保存请求发生冲突，请重新打开设置模板。", 409);
    await client.query("COMMIT");
    return { asset: describe(row, true) };
  } catch (error) { await client.query("ROLLBACK").catch(() => {}); throw error; }
  finally { client.release(); }
}
export async function deleteTextAsset({ assetId, ownerContext, workspaceId = /** @type {string | null} */ (null), resourcesOverride = null }) {
  requireId(assetId);
  const ownerId = ownerIdFor(ownerContext);
  const resources = resourcesOverride ?? await getGenerationResources();
  const client = await resources.pool.connect();
  try {
    await client.query("BEGIN");
    const workspace = await resolveWorkspaceAccess(client, { ownerId, workspaceId, write: true });
    const result = await client.query("DELETE FROM text_assets WHERE id=$1 AND workspace_id=$2 AND owner_id=$3 RETURNING id", [assetId, workspace.id, ownerId]);
    if (!result.rowCount) throw new AssetRequestError("TEXT_ASSET_NOT_FOUND", "未找到文本模板。", 404);
    await client.query("DELETE FROM asset_organization WHERE asset_kind='text' AND asset_id=$1 AND workspace_id=$2 AND owner_id=$3", [assetId, workspace.id, ownerId]);
    await client.query("COMMIT");
    return { id: assetId, deleted: true };
  } catch (error) { await client.query("ROLLBACK").catch(() => {}); throw error; }
  finally { client.release(); }
}
