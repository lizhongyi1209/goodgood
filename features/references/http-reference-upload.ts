import type { GenerationReference } from "@/shared/contracts/generation";
import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";
import { workspaceRequestHeaders } from "@/features/organizations/workspace-request";

type UploadIntent = Readonly<{
  clientId: string;
  expiresAt: string;
  headers: Readonly<Record<string, string>>;
  reference: Readonly<{
    id: string;
    name: string;
    status: "uploading";
  }>;
  uploadUrl: string;
}>;

type ReferenceApiError = Readonly<{
  error?: Readonly<{ code?: string; message?: string; requestId?: string; retryable?: boolean }>;
}>;

const UPLOAD_CONCURRENCY = 2;
const COMPLETION_RECOVERY_MS = 8 * 60 * 1000;
let activeUploads = 0;
const waitingUploads: Array<() => void> = [];

async function withUploadSlot<T>(work: () => Promise<T>): Promise<T> {
  if (activeUploads >= UPLOAD_CONCURRENCY) {
    await new Promise<void>((resolve) => waitingUploads.push(resolve));
  } else {
    activeUploads += 1;
  }
  try {
    return await work();
  } finally {
    const next = waitingUploads.shift();
    if (next) next();
    else activeUploads -= 1;
  }
}

class ReferenceUploadHttpError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
  }
}

export type PendingReferenceFile = Readonly<{
  clientId: string;
  file: File;
}>;

export type ReferenceUploadResult = Readonly<{
  clientId: string;
  reference: GenerationReference;
}>;

async function parseJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T | ReferenceApiError;
  if (!response.ok) {
    const failure = (payload as ReferenceApiError).error;
    throw new ReferenceUploadHttpError(
      `${failure?.message ?? "参考图上传失败，请稍后重试。"}${failure?.requestId ? `（请求 ${failure.requestId}）` : ""}`,
      failure?.retryable ??
        (response.status === 408 || response.status === 429 || response.status >= 500),
    );
  }
  return payload as T;
}

function pause(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function putWithRetry(intent: UploadIntent, file: File): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(intent.uploadUrl, {
        body: file,
        headers: intent.headers,
        method: "PUT",
      });
      if (response.ok) return;
      if (![408, 429].includes(response.status) && response.status < 500) {
        throw new ReferenceUploadHttpError(`参考图直传失败（HTTP ${response.status}），请重试上传。`, false);
      }
    } catch (error) {
      if (error instanceof ReferenceUploadHttpError && !error.retryable) throw error;
    }
    if (attempt < 2) await pause(400 * (attempt + 1));
  }
  throw new ReferenceUploadHttpError("网络暂时无法上传参考图，请重试。", true);
}

async function recoverCompletion(referenceId: string, workspaceId: string | null) {
  const deadline = Date.now() + COMPLETION_RECOVERY_MS;
  while (Date.now() < deadline) {
    try {
      const response = await goodGoodApiFetch(
        `/api/references/${encodeURIComponent(referenceId)}/status`,
        { cache: "no-store", headers: workspaceRequestHeaders(workspaceId) },
      );
      const status = await parseJson<Readonly<{
        id: string;
        name: string;
        status: "pending" | "ready" | "rejected" | "expired";
        errorCode?: string;
      }>>(response);
      if (status.status === "ready") return { id: status.id, name: status.name, status: "ready" as const };
      if (status.status === "rejected" || status.status === "expired") {
        throw new ReferenceUploadHttpError(`参考图未通过校验${status.errorCode ? `（${status.errorCode}）` : ""}，请重新上传。`, false);
      }
    } catch (error) {
      if (error instanceof ReferenceUploadHttpError && !error.retryable) throw error;
    }
    await pause(3_000);
  }
  throw new Error("参考图校验尚未完成，请稍后从素材库重新添加，或重试上传。");
}

function failedReference(
  item: PendingReferenceFile,
  message: string,
): GenerationReference {
  return Object.freeze({
    errorMessage: message,
    id: item.clientId,
    name: item.file.name,
    status: "failed" as const,
    url: "",
  });
}

async function uploadOne(
  item: PendingReferenceFile,
  onUpdate: (clientId: string, reference: GenerationReference) => void,
  workspaceId: string | null,
): Promise<ReferenceUploadResult> {
  let intent: UploadIntent | undefined;
  try {
    const response = await goodGoodApiFetch("/api/references", {
      body: JSON.stringify({ files: [{
        byteSize: item.file.size,
        clientId: item.clientId,
        mimeType: item.file.type,
        name: item.file.name,
      }] }),
      headers: {
        "content-type": "application/json",
        ...workspaceRequestHeaders(workspaceId),
      },
      method: "POST",
    });
    const payload = await parseJson<Readonly<{ uploads: readonly UploadIntent[] }>>(response);
    intent = payload.uploads?.find((value) => value.clientId === item.clientId);
    if (!intent) throw new Error("上传服务返回了不完整的请求。");

    await putWithRetry(intent, item.file);
    let completed: Readonly<{ id: string; name: string; status: "ready" }>;
    try {
      completed = await parseJson<Readonly<{ id: string; name: string; status: "ready" }>>(
        await goodGoodApiFetch(
          `/api/references/${encodeURIComponent(intent.reference.id)}/complete`,
          { headers: workspaceRequestHeaders(workspaceId), method: "POST" },
        ),
      );
      if (completed.status !== "ready" || !completed.id) {
        throw new ReferenceUploadHttpError("参考图校验结果尚未确认。", true);
      }
    } catch (error) {
      if (error instanceof ReferenceUploadHttpError && !error.retryable) throw error;
      completed = await recoverCompletion(intent.reference.id, workspaceId);
    }
    const reference: GenerationReference = Object.freeze({
      id: completed.id,
      name: completed.name,
      status: "ready",
      url: "",
    });
    onUpdate(item.clientId, reference);
    return { clientId: item.clientId, reference };
  } catch (error) {
    const reference = intent
      ? Object.freeze({
          errorMessage: error instanceof Error ? error.message : "参考图上传失败。",
          id: intent.reference.id,
          name: intent.reference.name,
          status: "failed" as const,
          url: "",
        })
      : failedReference(item, error instanceof Error ? error.message : "参考图上传失败。");
    onUpdate(item.clientId, reference);
    return { clientId: item.clientId, reference };
  }
}

export async function uploadReferenceFiles(
  items: readonly PendingReferenceFile[],
  onUpdate: (clientId: string, reference: GenerationReference) => void,
  workspaceId: string | null = null,
): Promise<readonly ReferenceUploadResult[]> {
  return Promise.all(items.map((item) => withUploadSlot(
    () => uploadOne(item, onUpdate, workspaceId),
  )));
}
