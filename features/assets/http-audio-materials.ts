import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";
import { workspaceRequestHeaders } from "@/features/organizations/workspace-request";

export type PrivateAudioMaterial = Readonly<{
  id: string; mediaType: "audio"; name: string; mimeType: string;
  size: number; uploadedAt: string; url: string;
}>;

type UploadIntent = Readonly<{ material: { id: string; name: string }; uploadUrl: string; headers: Record<string, string> }>;

async function parse<T>(response: Response): Promise<T> {
  const value = await response.json().catch(() => ({})) as T | { error?: { message?: string } };
  if (!response.ok) throw new Error((value as { error?: { message?: string } }).error?.message ?? "音频素材服务暂时不可用，请重试。");
  return value as T;
}

export async function listPrivateAudioMaterials(workspaceId: string | null, signal?: AbortSignal): Promise<readonly PrivateAudioMaterial[]> {
  const value = await parse<{ materials: readonly PrivateAudioMaterial[] }>(await goodGoodApiFetch("/api/audio-materials", {
    cache: "no-store", headers: workspaceRequestHeaders(workspaceId), signal,
  }));
  return value.materials;
}

export async function uploadPrivateAudioMaterial(clientId: string, file: File,
  workspaceId: string | null): Promise<Readonly<{ id: string; name: string; status: "ready" }>> {
  const intent = await parse<UploadIntent>(await goodGoodApiFetch("/api/audio-materials", {
    method: "POST", headers: { "content-type": "application/json", ...workspaceRequestHeaders(workspaceId) },
    body: JSON.stringify({ file: { clientId, name: file.name, mimeType: /\.wav$/i.test(file.name) ? "audio/wav" : "audio/mpeg", byteSize: file.size } }),
  }));
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(intent.uploadUrl, { method: "PUT", headers: intent.headers, body: file });
    } catch {
      if (attempt === 2) throw new Error("无法连接音频存储服务，请检查网络后重试。");
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
      continue;
    }
    if (response.ok) break;
    if (attempt === 2 || (response.status < 500 && ![408, 429].includes(response.status)))
      throw new Error(`音频直传失败（HTTP ${response.status}），请重试。`);
    await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
  }
  try {
    return await parse(await goodGoodApiFetch(`/api/audio-materials/${encodeURIComponent(intent.material.id)}/complete`, {
      method: "POST", headers: workspaceRequestHeaders(workspaceId),
    }));
  } catch (error) {
    const status = await parse<{ id: string; name: string; status: string }>(await goodGoodApiFetch(
      `/api/audio-materials/${encodeURIComponent(intent.material.id)}/status`,
      { cache: "no-store", headers: workspaceRequestHeaders(workspaceId) },
    ));
    if (status.status === "ready") return { id: status.id, name: status.name, status: "ready" };
    throw error;
  }
}
