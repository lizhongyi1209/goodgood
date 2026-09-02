import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";
import type { GenerationJob } from "@/shared/contracts/generation";

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

export async function listAssets(): Promise<readonly GenerationJob[]> {
  const response = await goodGoodApiFetch("/api/assets", {
    cache: "no-store",
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
