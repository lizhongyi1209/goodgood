import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";
import { workspaceRequestHeaders } from "@/features/organizations/workspace-request";

export type OrganizedAssetKind = "generated" | "reference" | "video" | "audio" | "text";
export type AssetFolder = Readonly<{ id: string; name: string; createdAt: string }>;
export type AssetArrangement = Readonly<{ kind: OrganizedAssetKind; id: string; folderId: string | null; tags: readonly string[]; displayName?: string | null }>;
export type AssetOrganization = Readonly<{ folders: readonly AssetFolder[]; arrangements: readonly AssetArrangement[] }>;

async function parse<T>(response: Response): Promise<T> {
  const value = await response.json().catch(() => ({})) as T | { error?: { message?: string } };
  if (!response.ok) throw new Error((value as { error?: { message?: string } }).error?.message ?? "资产整理暂时不可用，请重试。");
  return value as T;
}

export async function listAssetOrganization(workspaceId: string | null): Promise<AssetOrganization> {
  return parse(await goodGoodApiFetch("/api/asset-organization", { cache: "no-store", headers: workspaceRequestHeaders(workspaceId) }));
}

export async function createAssetFolder(name: string, workspaceId: string | null): Promise<AssetFolder> {
  const value = await parse<{ folder: AssetFolder }>(await goodGoodApiFetch("/api/asset-organization/folders", {
    method: "POST", headers: { "content-type": "application/json", ...workspaceRequestHeaders(workspaceId) },
    body: JSON.stringify({ name }),
  }));
  return value.folder;
}

export async function renameAssetFolder(folderId: string, name: string, workspaceId: string | null): Promise<AssetFolder> {
  const value = await parse<{ folder: AssetFolder }>(await goodGoodApiFetch(`/api/asset-organization/folders/${encodeURIComponent(folderId)}`, {
    method: "PATCH", headers: { "content-type": "application/json", ...workspaceRequestHeaders(workspaceId) },
    body: JSON.stringify({ name }),
  }));
  return value.folder;
}

export async function deleteAssetFolder(folderId: string, workspaceId: string | null): Promise<void> {
  await parse(await goodGoodApiFetch(`/api/asset-organization/folders/${encodeURIComponent(folderId)}`, {
    method: "DELETE", headers: workspaceRequestHeaders(workspaceId),
  }));
}

export async function saveAssetOrganization(kind: OrganizedAssetKind, id: string,
  value: Readonly<{ folderId: string | null; tags: readonly string[] }>, workspaceId: string | null): Promise<AssetArrangement> {
  return parse(await goodGoodApiFetch(`/api/asset-organization/items/${kind}/${encodeURIComponent(id)}`, {
    method: "PUT", headers: { "content-type": "application/json", ...workspaceRequestHeaders(workspaceId) },
    body: JSON.stringify(value),
  }));
}

export async function renameAssetItem(kind: OrganizedAssetKind, id: string, name: string, workspaceId: string | null): Promise<AssetArrangement> {
  return parse(await goodGoodApiFetch(`/api/asset-organization/items/${kind}/${encodeURIComponent(id)}`, {
    method: "PATCH", headers: { "content-type": "application/json", ...workspaceRequestHeaders(workspaceId) },
    body: JSON.stringify({ name }),
  }));
}
