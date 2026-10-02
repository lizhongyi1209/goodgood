import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";
import { workspaceRequestHeaders } from "@/features/organizations/workspace-request";
import { TEXT_ASSETS_UPDATED_EVENT, type TextAsset, type TextAssetInput, type TextAssetSummary, type TextAssetsUpdatedDetail } from "@/shared/contracts/text-assets.mjs";
export type { TextAsset, TextAssetSummary } from "@/shared/contracts/text-assets.mjs";

async function parse<T>(response: Response): Promise<T> {
  const value = await response.json().catch(() => ({})) as T & { error?: { message?: string; code?: string } };
  if (!response.ok) throw new Error(response.status === 404 && value.error?.code !== "TEXT_ASSET_NOT_FOUND"
    ? "文本模板功能尚未启用，请稍后重试。" : value.error?.message ?? "文本模板暂时不可用，请重试。");
  return value;
}
function changed(workspaceId: string | null, addedAssetId?: string) {
  window.dispatchEvent(new CustomEvent<TextAssetsUpdatedDetail>(TEXT_ASSETS_UPDATED_EVENT, { detail: { workspaceId, ...(addedAssetId ? { addedAssetId } : {}) } }));
}
export async function listPrivateTextAssets(workspaceId: string | null): Promise<readonly TextAssetSummary[]> {
  const response = await goodGoodApiFetch("/api/text-assets", { cache: "no-store", headers: workspaceRequestHeaders(workspaceId) });
  // The old backend has no text-assets route; keep existing media readable until activation.
  if (response.status === 404) return [];
  const value = await parse<{ assets: readonly TextAssetSummary[] }>(response);
  if (!Array.isArray(value.assets)) throw new Error("文本模板列表读取失败，请重试。");
  return value.assets;
}
export async function readPrivateTextAsset(id: string, workspaceId: string | null, signal?: AbortSignal): Promise<TextAsset> {
  const value = await parse<{ asset: TextAsset }>(await goodGoodApiFetch(`/api/text-assets/${encodeURIComponent(id)}`, {
    cache: "no-store", headers: workspaceRequestHeaders(workspaceId), signal,
  }));
  if (!value.asset || value.asset.id !== id || typeof value.asset.markdown !== "string" || typeof value.asset.text !== "string") throw new Error("文本模板内容读取失败，请重试。");
  return value.asset;
}
export async function createPrivateTextAsset(input: TextAssetInput, workspaceId: string | null): Promise<TextAsset> {
  const asset = (await parse<{ asset: TextAsset }>(await goodGoodApiFetch("/api/text-assets", {
    method: "POST", headers: { "content-type": "application/json", ...workspaceRequestHeaders(workspaceId) }, body: JSON.stringify(input),
  }))).asset;
  if (!asset || asset.id !== input.id || asset.markdown !== input.markdown || asset.text !== input.text) throw new Error("模板保存结果暂时无法确认，请重试。");
  changed(workspaceId, asset.id); return asset;
}
export async function deletePrivateTextAsset(id: string, workspaceId: string | null): Promise<void> {
  await parse(await goodGoodApiFetch(`/api/text-assets/${encodeURIComponent(id)}`, { method: "DELETE", headers: workspaceRequestHeaders(workspaceId) }));
  changed(workspaceId);
}
export async function downloadPrivateTextAsset(id: string, name: string, workspaceId: string | null): Promise<void> {
  const asset = await readPrivateTextAsset(id, workspaceId);
  const url = URL.createObjectURL(new Blob([asset.markdown], { type: "text/markdown;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url;
  anchor.download = `${Array.from(name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")).slice(0, 120).join("").replace(/[. ]+$/, "") || "文本模板"}.md`;
  anchor.hidden = true; document.body.appendChild(anchor);
  try { anchor.click(); } finally { anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 30_000); }
}
