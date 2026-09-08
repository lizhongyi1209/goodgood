import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";

export type ReferenceMaterial = Readonly<{
  byteSize: number;
  height: number;
  id: string;
  mimeType: string;
  name: string;
  status: "ready";
  uploadedAt: string;
  url: string;
  width: number;
}>;

type ReferenceListResponse = Readonly<{
  references: readonly ReferenceMaterial[];
}>;

type ReferenceApiError = Readonly<{
  error?: Readonly<{
    code?: string;
    message?: string;
    retryable?: boolean;
  }>;
}>;

export class ReferenceLibraryError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.name = "ReferenceLibraryError";
    this.code = code;
    this.retryable = retryable;
  }
}

export async function listReferenceMaterials(): Promise<readonly ReferenceMaterial[]> {
  const response = await goodGoodApiFetch("/api/references", {
    cache: "no-store",
  });
  const payload = (await response.json()) as ReferenceListResponse | ReferenceApiError;
  if (!response.ok) {
    const failure = payload as ReferenceApiError;
    throw new ReferenceLibraryError(
      failure.error?.code ?? "REFERENCE_LIBRARY_UNAVAILABLE",
      failure.error?.message ?? "上传素材暂时无法读取，请重试。",
      failure.error?.retryable ?? false,
    );
  }
  return (payload as ReferenceListResponse).references;
}

