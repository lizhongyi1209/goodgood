import type { GenerationReference } from "@/shared/contracts/generation";
import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";

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
  error?: Readonly<{ message?: string }>;
}>;

export type PendingReferenceFile = Readonly<{
  clientId: string;
  file: File;
}>;

export type ReferenceUploadResult = Readonly<{
  clientId: string;
  reference: GenerationReference;
}>;

async function parseJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T | ReferenceApiError;
  if (!response.ok) {
    throw new Error(
      (payload as ReferenceApiError).error?.message ??
        "参考图上传失败，请稍后重试。",
    );
  }
  return payload as T;
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

export async function uploadReferenceFiles(
  items: readonly PendingReferenceFile[],
  onUpdate: (clientId: string, reference: GenerationReference) => void,
): Promise<readonly ReferenceUploadResult[]> {
  let intents: readonly UploadIntent[];
  try {
    const response = await goodGoodApiFetch("/api/references", {
      body: JSON.stringify({
        files: items.map(({ clientId, file }) => ({
          byteSize: file.size,
          clientId,
          mimeType: file.type,
          name: file.name,
        })),
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    intents = (
      await parseJson<Readonly<{ uploads: readonly UploadIntent[] }>>(response)
    ).uploads;
  } catch (error) {
    const message = error instanceof Error ? error.message : "参考图上传失败。";
    return items.map((item) => {
      const reference = failedReference(item, message);
      onUpdate(item.clientId, reference);
      return { clientId: item.clientId, reference };
    });
  }

  const intentsByClientId = new Map(
    intents.map((intent) => [intent.clientId, intent]),
  );
  return Promise.all(
    items.map(async (item) => {
      const intent = intentsByClientId.get(item.clientId);
      if (!intent) {
        const reference = failedReference(item, "上传服务返回了不完整的请求。");
        onUpdate(item.clientId, reference);
        return { clientId: item.clientId, reference };
      }
      try {
        const upload = await fetch(intent.uploadUrl, {
          body: item.file,
          headers: intent.headers,
          method: "PUT",
        });
        if (!upload.ok) throw new Error("参考图直传失败，请重新选择文件。");
        const completed = await parseJson<
          Readonly<{ id: string; name: string; status: "ready" }>
        >(
          await goodGoodApiFetch(
            `/api/references/${encodeURIComponent(intent.reference.id)}/complete`,
            { method: "POST" },
          ),
        );
        const reference: GenerationReference = Object.freeze({
          id: completed.id,
          name: completed.name,
          status: "ready",
          url: "",
        });
        onUpdate(item.clientId, reference);
        return { clientId: item.clientId, reference };
      } catch (error) {
        const reference = Object.freeze({
          errorMessage:
            error instanceof Error ? error.message : "参考图上传失败。",
          id: intent.reference.id,
          name: intent.reference.name,
          status: "failed" as const,
          url: "",
        });
        onUpdate(item.clientId, reference);
        return { clientId: item.clientId, reference };
      }
    }),
  );
}
