import { AuthenticationError, sessionExpiredError } from "../auth/errors.mjs";
import { getGenerationResources } from "../generation/resources.mjs";
import { signAssetRead } from "../generation/storage.mjs";
import { newRequestId } from "../observability/http.mjs";
import { OrganizationError } from "../organizations/errors.mjs";
import {
  DraftConflictError,
  DraftPersistenceError,
  DraftRequestError,
} from "./errors.mjs";
import {
  deleteCreationDraft as deleteCreationDraftRecord,
  findCreationDraft,
  saveCreationDraft as saveCreationDraftRecord,
} from "./repository.mjs";
import {
  validateDraftDelete,
  validateDraftMutation,
} from "./validation.mjs";

const DEFAULT_WORKSPACE_ID = /** @type {string | null} */ (null);

function ownerIdFromContext(ownerContext) {
  if (!ownerContext?.ownerId) throw sessionExpiredError();
  return ownerContext.ownerId;
}

async function presentCreationDraft(resources, row) {
  if (!row) return null;
  const referenceEntries = await Promise.all(
    (row.reference_snapshot ?? []).map(async (reference) => [
      reference.id,
      await signAssetRead({
        bucket: resources.config.objectStorage.bucket,
        key: reference.objectKey,
        publicStorage: resources.publicStorage,
      }),
    ]),
  );
  const referenceUrls = new Map(referenceEntries);
  return {
    expiresAt: new Date(row.expires_at).toISOString(),
    state: {
      aspectRatio: row.aspect_ratio,
      background: row.background ?? "auto",
      count: row.generation_count,
      googleSearch: row.google_search ?? false,
      modelId: row.model_id,
      prompt: row.prompt,
      references: (row.reference_snapshot ?? []).map((reference) => ({
        id: reference.id,
        name: reference.name,
        status: "ready",
        url: referenceUrls.get(reference.id) ?? "",
      })),
      resolution: row.resolution,
      outputFormat:
        row.output_format ?? (row.model_id === "gpt-image-2" ? "jpeg" : "png"),
      quality: row.quality ?? "auto",
      thinkingLevel:
        row.thinking_level ??
        (row.model_id === "nano-banana-2" ? "high" : "low"),
    },
    updatedAt: new Date(row.updated_at).toISOString(),
    version: row.version,
  };
}

export async function readCreationDraft({
  ownerContext,
  workspaceId = DEFAULT_WORKSPACE_ID,
}) {
  const resources = await getGenerationResources();
  const row = await findCreationDraft(resources.pool, {
    ownerId: ownerIdFromContext(ownerContext),
    workspaceId,
  });
  return { draft: await presentCreationDraft(resources, row) };
}

export async function saveCreationDraft({
  input,
  ownerContext,
  workspaceId = DEFAULT_WORKSPACE_ID,
}) {
  const resources = await getGenerationResources();
  const validated = validateDraftMutation(input);
  const result = await saveCreationDraftRecord(resources.pool, {
    ...validated,
    ownerId: ownerIdFromContext(ownerContext),
    workspaceId,
  });
  if (result.conflict) {
    throw new DraftConflictError(
      await presentCreationDraft(resources, result.current),
    );
  }
  return presentCreationDraft(resources, result.current);
}

export async function deleteCreationDraft({
  input,
  ownerContext,
  workspaceId = DEFAULT_WORKSPACE_ID,
}) {
  const resources = await getGenerationResources();
  const result = await deleteCreationDraftRecord(resources.pool, {
    expectedVersion: validateDraftDelete(input),
    ownerId: ownerIdFromContext(ownerContext),
    workspaceId,
  });
  if (result.conflict) {
    throw new DraftConflictError(
      await presentCreationDraft(resources, result.current),
    );
  }
  return { deleted: true };
}

export function creationDraftApiError(error, requestId = newRequestId()) {
  if (
    error instanceof AuthenticationError ||
    error instanceof OrganizationError ||
    error instanceof DraftRequestError ||
    error instanceof DraftPersistenceError
  ) {
    return {
      body: {
        error: {
          code: error.code,
          currentDraft: error.currentDraft,
          message: error.message,
          requestId,
          retryable: error.retryable ?? false,
        },
      },
      status: error.status,
    };
  }
  console.error(JSON.stringify({
    event: "creation_draft.api_failed",
    message: error instanceof Error ? error.message : String(error),
    requestId,
  }));
  return {
    body: {
      error: {
        code: "DRAFT_UNAVAILABLE",
        message: "草稿暂时无法保存，当前内容仍保留在此页面。",
        requestId,
        retryable: true,
      },
    },
    status: 503,
  };
}
