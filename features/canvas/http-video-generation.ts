import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";
import { workspaceRequestHeaders } from "@/features/organizations/workspace-request";
import type { CanvasVideoGenerationDraft, VideoGenerationInput, VideoGenerationStatus } from "@/shared/contracts/video-generation.mjs";
export type VideoCreditQuote = { credits: number; perSecond: number; seconds: number; version: string };
export class CanvasVideoGenerationError extends Error { constructor(public code: string, message: string, public status?: number) { super(message); } }
async function request<T>(path: string, workspaceId: string | null, signal: AbortSignal, input?: unknown): Promise<T> {
  const response = await goodGoodApiFetch(`/api/video-generation${path}`, { method: input === undefined ? "GET" : "POST", signal, cache: "no-store",
    headers: { ...workspaceRequestHeaders(workspaceId), ...(input === undefined ? {} : { "content-type": "application/json" }) }, ...(input === undefined ? {} : { body: JSON.stringify(input) }) });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new CanvasVideoGenerationError(payload?.error?.code ?? "VIDEO_GENERATION_UNAVAILABLE", payload?.error?.message ?? (response.status === 404 ? "视频功能尚未启用，请更新后端。" : "视频服务暂不可用，请重试。"), response.status);
  if (!payload || typeof payload !== "object") throw new CanvasVideoGenerationError("VIDEO_RESPONSE_INVALID", "视频回执暂不可用。");
  return payload as T;
}
export function quoteCanvasVideo(input: Pick<CanvasVideoGenerationDraft, "modelId" | "type" | "resolution" | "duration" | "characterOrientation"> & { videoAssetId?: string }, workspaceId: string | null, signal: AbortSignal) { return request<VideoCreditQuote>("/quote", workspaceId, signal, input); }
export function submitCanvasVideo(input: VideoGenerationInput, workspaceId: string | null, signal: AbortSignal) { return request<VideoGenerationStatus>("", workspaceId, signal, input); }
export function readCanvasVideo(requestId: string, workspaceId: string | null, signal: AbortSignal) { return request<VideoGenerationStatus>(`/${encodeURIComponent(requestId)}`, workspaceId, signal); }
export function downloadCanvasVideo(requestId: string, workspaceId: string | null, signal: AbortSignal) { return request<{ url: string }>(`/${encodeURIComponent(requestId)}/download`, workspaceId, signal); }
export function retryCanvasVideoSave(requestId: string, workspaceId: string | null, signal: AbortSignal) { return request<VideoGenerationStatus>(`/${encodeURIComponent(requestId)}/retry-save`, workspaceId, signal, {}); }
export function retryCanvasVideo(requestId: string, input: { requestId: string; quotedCredits: number }, workspaceId: string | null, signal: AbortSignal) { return request<VideoGenerationStatus>(`/${encodeURIComponent(requestId)}/retry`, workspaceId, signal, input); }
