import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";
import { IMAGE_CLEANUP_CREDIT_COST, type ImageCleanupInput, type ImageCleanupResult } from "@/shared/contracts/image-cleanup.mjs";

export class ImageCleanupBoundaryError extends Error {
  constructor(message: string, readonly retryable: boolean) { super(message); this.name = "ImageCleanupBoundaryError"; }
}
export async function removeImageAiMetadata(input: ImageCleanupInput, workspaceId: string | null, signal: AbortSignal): Promise<ImageCleanupResult> {
  const response = await goodGoodApiFetch("/api/image-cleanup", {
    method: "POST", credentials: "same-origin", cache: "no-store", signal,
    headers: { "content-type": "application/json", ...(workspaceId ? { "x-goodgood-workspace-id": workspaceId } : {}) },
    body: JSON.stringify(input),
  });
  let payload: ImageCleanupResult & { error?: { message?: string; retryable?: boolean } };
  try { payload = await response.json(); }
  catch { throw new ImageCleanupBoundaryError("去除AI暂不可用，请重试确认本次结果。", true); }
  if (!response.ok) throw new ImageCleanupBoundaryError(payload.error?.message ?? "去除AI暂不可用，请稍后重试。", payload.error?.retryable ?? response.status >= 500);
  const r = payload.reference;
  if (payload.requestId !== input.requestId || payload.chargedCredits !== IMAGE_CLEANUP_CREDIT_COST ||
      !r?.id || !r.name || !["image/jpeg", "image/png"].includes(r.mimeType) ||
      !Number.isSafeInteger(r.width) || !Number.isSafeInteger(r.height) || r.width <= 0 || r.height <= 0) {
    throw new ImageCleanupBoundaryError("本次结果未能确认，请重试；同一操作不会再次扣费。", true);
  }
  return payload;
}
