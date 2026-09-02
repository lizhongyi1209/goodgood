import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";
import type {
  CreationDraftRecord,
  CreationDraftState,
} from "@/shared/contracts/draft";

type DraftApiFailure = Readonly<{
  error?: Readonly<{
    code?: string;
    currentDraft?: CreationDraftRecord | null;
    message?: string;
    retryable?: boolean;
  }>;
}>;

export class DraftBoundaryError extends Error {
  readonly code: string;
  readonly currentDraft: CreationDraftRecord | null;
  readonly retryable: boolean;

  constructor(
    code: string,
    message: string,
    retryable = false,
    currentDraft: CreationDraftRecord | null = null,
  ) {
    super(message);
    this.name = "DraftBoundaryError";
    this.code = code;
    this.currentDraft = currentDraft;
    this.retryable = retryable;
  }
}

async function parseDraftResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T | DraftApiFailure;
  if (!response.ok) {
    const failure = payload as DraftApiFailure;
    throw new DraftBoundaryError(
      failure.error?.code ?? "DRAFT_UNAVAILABLE",
      failure.error?.message ?? "草稿暂时无法保存，当前内容仍保留在此页面。",
      failure.error?.retryable ?? false,
      failure.error?.currentDraft ?? null,
    );
  }
  return payload as T;
}

function draftStatePayload(state: CreationDraftState) {
  return {
    ...state,
    references: state.references.map((reference) => ({ id: reference.id })),
  };
}

export async function readCreationDraft(): Promise<CreationDraftRecord | null> {
  const response = await goodGoodApiFetch("/api/draft", { cache: "no-store" });
  const payload = await parseDraftResponse<
    Readonly<{ draft: CreationDraftRecord | null }>
  >(response);
  return payload.draft;
}

export async function saveCreationDraft(
  state: CreationDraftState,
  expectedVersion: number | null,
): Promise<CreationDraftRecord> {
  return parseDraftResponse<CreationDraftRecord>(
    await goodGoodApiFetch("/api/draft", {
      body: JSON.stringify({
        expectedVersion,
        state: draftStatePayload(state),
      }),
      headers: { "content-type": "application/json" },
      method: "PUT",
    }),
  );
}

export async function deleteCreationDraft(expectedVersion: number | null) {
  await parseDraftResponse<Readonly<{ deleted: true }>>(
    await goodGoodApiFetch("/api/draft", {
      body: JSON.stringify({ expectedVersion }),
      headers: { "content-type": "application/json" },
      method: "DELETE",
    }),
  );
}
