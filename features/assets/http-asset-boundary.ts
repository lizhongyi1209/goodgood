import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";
import type { GenerationJob } from "@/shared/contracts/generation";
import { workspaceRequestHeaders } from "@/features/organizations/workspace-request";

type AssetApiErrorEnvelope = Readonly<{
  error?: Readonly<{
    code?: string;
    message?: string;
    retryable?: boolean;
  }>;
}>;

type AssetListResponse = Readonly<{
  batches: readonly GenerationJob[];
}>;

type AssetDownloadUrlResponse = Readonly<{
  url?: string;
}>;

export class AssetBoundaryError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.name = "AssetBoundaryError";
    this.code = code;
    this.retryable = retryable;
  }
}

export async function listAssets(
  workspaceId: string | null = null,
): Promise<readonly GenerationJob[]> {
  const response = await goodGoodApiFetch("/api/assets", {
    cache: "no-store",
    headers: workspaceRequestHeaders(workspaceId),
  });
  const payload = (await response.json()) as
    | AssetListResponse
    | AssetApiErrorEnvelope;
  if (!response.ok) {
    const failure = payload as AssetApiErrorEnvelope;
    throw new AssetBoundaryError(
      failure.error?.code ?? "ASSET_LIBRARY_UNAVAILABLE",
      failure.error?.message ?? "资产库暂时无法读取，请重试。",
      failure.error?.retryable ?? false,
    );
  }
  return (payload as AssetListResponse).batches;
}

export async function readAssetDownloadUrl(
  assetId: string,
  workspaceId: string | null = null,
): Promise<string> {
  const response = await goodGoodApiFetch(
    `/api/assets/${encodeURIComponent(assetId)}/download-url`,
    {
      cache: "no-store",
      headers: workspaceRequestHeaders(workspaceId),
    },
  );
  const payload = (await response.json()) as
    | AssetDownloadUrlResponse
    | AssetApiErrorEnvelope;
  if (!response.ok) {
    const failure = payload as AssetApiErrorEnvelope;
    throw new AssetBoundaryError(
      failure.error?.code ?? "ASSET_LIBRARY_UNAVAILABLE",
      failure.error?.message ?? "图片暂时无法下载，请重试。",
      failure.error?.retryable ?? false,
    );
  }
  const url = (payload as AssetDownloadUrlResponse).url;
  if (typeof url !== "string" || !url) {
    throw new AssetBoundaryError(
      "ASSET_LIBRARY_UNAVAILABLE",
      "图片暂时无法下载，请重试。",
      true,
    );
  }
  return url;
}
