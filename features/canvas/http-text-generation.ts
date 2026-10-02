import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";
import { workspaceRequestHeaders } from "@/features/organizations/workspace-request";
import { readServerSentEvents } from "@/shared/server-sent-events.mjs";
import type { TextGenerationMessage, TextGenerationModelId } from "@/shared/contracts/text-generation.mjs";

export type TextGenerationMedia = { kind: "image"; assetKind: "reference" | "generated"; assetId: string } |
  { kind: "video"; assetKind: "video"; assetId: string; frames: string[] };
export type TextGenerationStatus = { requestId: string; state: "running" | "succeeded" | "failed" | "cancelled"; markdown: string; error: { code: string; message: string } | null };
export class CanvasTextGenerationError extends Error {
  constructor(public code: string, message: string) { super(message); }
}
async function failure(response: Response) {
  const body = await response.json().catch(() => null);
  throw new CanvasTextGenerationError(body?.error?.code ?? "TEXT_GENERATION_UNAVAILABLE", body?.error?.message ?? "文本生成暂不可用，请稍后重试。");
}
export async function readCanvasTextGeneration(requestId: string, workspaceId: string | null, signal: AbortSignal): Promise<TextGenerationStatus> {
  const response = await goodGoodApiFetch(`/api/text-generation/${encodeURIComponent(requestId)}`, { signal, cache: "no-store", headers: workspaceRequestHeaders(workspaceId) });
  if (!response.ok) return failure(response);
  return response.json();
}
export async function cancelCanvasTextGeneration(requestId: string, workspaceId: string | null) {
  const response = await goodGoodApiFetch(`/api/text-generation/${encodeURIComponent(requestId)}/cancel`, { method: "POST",
    signal: AbortSignal.timeout(10_000), headers: { ...workspaceRequestHeaders(workspaceId), "content-type": "application/json" }, body: "{}" });
  if (!response.ok) return failure(response);
  return response.json() as Promise<TextGenerationStatus>;
}
export async function streamCanvasTextGeneration(input: { requestId: string; projectId: string; modelId: TextGenerationModelId;
  prompt: string; history: readonly TextGenerationMessage[]; media: TextGenerationMedia[] }, workspaceId: string | null,
  signal: AbortSignal, observe: (event: { type: "start" | "delta" | "done"; text?: string }) => void) {
  const response = await goodGoodApiFetch("/api/text-generation/stream", { method: "POST", signal,
    headers: { ...workspaceRequestHeaders(workspaceId), "content-type": "application/json" }, body: JSON.stringify(input) });
  if (!response.ok) return failure(response);
  if (!response.body || !response.headers.get("content-type")?.includes("text/event-stream")) throw new CanvasTextGenerationError("TEXT_STREAM_INTERRUPTED", "生成连接中断，正在保留内容。");
  let completed = false;
  for await (const payload of readServerSentEvents(response.body, signal)) {
    const event = JSON.parse(payload);
    if (event.type === "error") throw new CanvasTextGenerationError(event.code, event.message);
    if (event.type === "start" || event.type === "done" || event.type === "delta" && typeof event.text === "string") observe(event);
    if (event.type === "done") { completed = true; break; }
  }
  if (!completed) throw new CanvasTextGenerationError("TEXT_STREAM_INTERRUPTED", "生成连接中断，正在恢复结果。");
}
