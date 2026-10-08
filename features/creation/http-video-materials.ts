import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";
import { workspaceRequestHeaders } from "@/features/organizations/workspace-request";

export type PrivateVideoMaterial = Readonly<{
  id: string;
  mediaType: "video";
  name: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  url: string;
}>;

type ApiError = Readonly<{ error?: Readonly<{ code?: string; message?: string; requestId?: string; retryable?: boolean }> }>;
type UploadIntent = Readonly<{
  material: Readonly<{ id: string; name: string; status: "uploading" }>;
  uploadUrl: string;
  headers: Readonly<Record<string, string>>;
}>;

function pause(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { signal?.removeEventListener("abort", abort); resolve(); }, milliseconds);
    const abort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      reject(signal?.reason ?? new DOMException("Upload cancelled", "AbortError"));
    };
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
  });
}

async function parseJson<T>(response: Response): Promise<T> {
  const value = (await response.json().catch(() => ({}))) as T | ApiError;
  if (!response.ok) {
    const error = (value as ApiError).error;
    const suffix = error?.requestId ? `（请求 ${error.requestId}）` : "";
    throw new Error(`${error?.message ?? "视频素材服务暂时不可用，请重试。"}${suffix}`);
  }
  return value as T;
}

export async function listPrivateVideoMaterials(workspaceId: string | null, signal?: AbortSignal): Promise<readonly PrivateVideoMaterial[]> {
  const response = await goodGoodApiFetch("/api/video-materials", {
    cache: "no-store", headers: workspaceRequestHeaders(workspaceId), signal,
  });
  return (await parseJson<{ materials: readonly PrivateVideoMaterial[] }>(response)).materials;
}

export async function uploadPrivateVideoMaterial(
  clientId: string,
  file: File,
  workspaceId: string | null,
  signal?: AbortSignal,
): Promise<Readonly<{ id: string; name: string; status: "ready" }>> {
  signal?.throwIfAborted();
  const intent = await parseJson<UploadIntent>(await goodGoodApiFetch("/api/video-materials", {
    method: "POST",
    headers: { "content-type": "application/json", ...workspaceRequestHeaders(workspaceId) },
    body: JSON.stringify({ file: { clientId, name: file.name, mimeType: /\.mov$/i.test(file.name) ? "video/quicktime" : "video/mp4", byteSize: file.size } }),
    signal,
  }));
  for (let attempt = 0; attempt < 3; attempt += 1) {
    signal?.throwIfAborted();
    let response: Response;
    try {
      response = await fetch(intent.uploadUrl, { method: "PUT", headers: intent.headers, body: file, signal });
    } catch (error) {
      if (signal?.aborted) throw error;
      if (attempt === 2) throw new Error("无法连接视频存储服务，请检查网络后重试。");
      await pause(400 * (attempt + 1), signal);
      continue;
    }
    if (response.ok) break;
    if (attempt === 2 || (response.status < 500 && ![408, 429].includes(response.status))) {
      throw new Error(`视频直传失败（HTTP ${response.status}），请检查网络或稍后重试。`);
    }
    await pause(400 * (attempt + 1), signal);
  }
  try {
    return await parseJson<{ id: string; name: string; status: "ready" }>(
      await goodGoodApiFetch(`/api/video-materials/${encodeURIComponent(intent.material.id)}/complete`, {
        method: "POST", headers: workspaceRequestHeaders(workspaceId), signal,
      }),
    );
  } catch (error) {
    if (signal?.aborted) throw error;
    // A lost completion response can follow a successful server validation.
    const response = await goodGoodApiFetch(`/api/video-materials/${encodeURIComponent(intent.material.id)}/status`, {
      cache: "no-store", headers: workspaceRequestHeaders(workspaceId), signal,
    });
    const status = await parseJson<{ id: string; name: string; status: string; errorCode?: string }>(response);
    if (status.status === "ready") return { id: status.id, name: status.name, status: "ready" };
    if (status.status === "rejected") throw new Error(`视频未通过校验（${status.errorCode ?? "格式或大小不符"}）。`);
    throw error;
  }
}
