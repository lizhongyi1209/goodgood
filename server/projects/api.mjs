import { AuthenticationError, sessionExpiredError } from "../auth/errors.mjs";
import { findProjectGenerationJobs } from "../generation/repository.mjs";
import { presentGenerationJob } from "../generation/presenter.mjs";
import { getGenerationResources } from "../generation/resources.mjs";
import { signAssetRead } from "../generation/storage.mjs";
import { ReferenceRequestError } from "../references/errors.mjs";
import { newRequestId } from "../observability/http.mjs";
import { OrganizationError } from "../organizations/errors.mjs";
import { findReadyReferences } from "../references/repository.mjs";
import {
  ProjectPersistenceError,
  ProjectRequestError,
} from "./errors.mjs";
import {
  createProject as createProjectRecord,
  findProject,
  listProjects as listProjectRecords,
  updateProject as updateProjectRecord,
} from "./repository.mjs";
import {
  validateProjectId,
  validateProjectIdempotencyKey,
  validateProjectSaveRequest,
} from "./validation.mjs";

const DEFAULT_WORKSPACE_ID = /** @type {string | null} */ (null);

function ownerIdFromContext(ownerContext) {
  if (!ownerContext?.ownerId) throw sessionExpiredError();
  return ownerContext.ownerId;
}

async function resolveProjectState(resources, ownerId, state, workspaceId) {
  const readyReferences = await findReadyReferences(resources.pool, {
    ownerId,
    referenceIds: state.referenceIds,
    workspaceId,
  });
  if (readyReferences.length !== state.referenceIds.length) {
    throw new ProjectRequestError(
      "PROJECT_REFERENCE_NOT_READY",
      "部分参考图尚未完成校验，请等待上传完成或移除失败项。",
      409,
    );
  }
  return {
    ...state,
    references: readyReferences.map((reference, index) => ({
      id: reference.id,
      name: reference.original_file_name,
      objectKey: reference.object_key,
      ordinal: index + 1,
    })),
  };
}

async function presentProject(resources, row) {
  const [batches, referenceEntries] = await Promise.all([
    findProjectGenerationJobs(resources.pool, {
      ownerId: row.owner_id,
      projectId: row.id,
      workspaceId: row.workspace_id,
    }).then((jobs) => Promise.all(jobs.map((job) => presentGenerationJob(resources, job)))),
    Promise.all(
      (row.reference_snapshot ?? []).map(async (reference) => [
        reference.id,
        await signAssetRead({
          bucket: resources.config.objectStorage.bucket,
          key: reference.objectKey,
          publicStorage: resources.publicStorage,
        }),
      ]),
    ),
  ]);
  const referenceUrls = new Map(referenceEntries);
  return {
    batches,
    createdAt: new Date(row.created_at).toISOString(),
    id: row.id,
    name: row.name,
    state: {
      aspectRatio: row.aspect_ratio,
      count: row.generation_count,
      background: row.background ?? "auto",
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
  };
}

export async function createProject({
  idempotencyKey,
  input,
  ownerContext,
  workspaceId = DEFAULT_WORKSPACE_ID,
}) {
  const resources = await getGenerationResources();
  const ownerId = ownerIdFromContext(ownerContext);
  const validated = validateProjectSaveRequest(input);
  const state = await resolveProjectState(
    resources,
    ownerId,
    validated.state,
    workspaceId,
  );
  const row = await createProjectRecord(resources.pool, {
    ...validated,
    idempotencyKey: validateProjectIdempotencyKey(idempotencyKey),
    ownerId,
    state,
    workspaceId,
  });
  return presentProject(resources, row);
}

export async function readProject({
  ownerContext,
  projectId,
  workspaceId = DEFAULT_WORKSPACE_ID,
}) {
  const resources = await getGenerationResources();
  const ownerId = ownerIdFromContext(ownerContext);
  const row = await findProject(resources.pool, {
    ownerId,
    projectId: validateProjectId(projectId),
    workspaceId,
  });
  if (!row) {
    throw new ProjectRequestError("PROJECT_NOT_FOUND", "未找到该项目。", 404);
  }
  return presentProject(resources, row);
}

export async function listProjects({
  ownerContext,
  workspaceId = DEFAULT_WORKSPACE_ID,
}) {
  const resources = await getGenerationResources();
  const ownerId = ownerIdFromContext(ownerContext);
  const rows = await listProjectRecords(resources.pool, { ownerId, workspaceId });
  return { projects: await Promise.all(rows.map((row) => presentProject(resources, row))) };
}

export async function updateProject({
  input,
  ownerContext,
  projectId,
  workspaceId = DEFAULT_WORKSPACE_ID,
}) {
  const resources = await getGenerationResources();
  const ownerId = ownerIdFromContext(ownerContext);
  const validatedProjectId = validateProjectId(projectId);
  if (
    !(await findProject(resources.pool, {
      ownerId,
      projectId: validatedProjectId,
      workspaceId,
    }))
  ) {
    throw new ProjectRequestError("PROJECT_NOT_FOUND", "未找到该项目。", 404);
  }
  const validated = validateProjectSaveRequest(input);
  const state = await resolveProjectState(
    resources,
    ownerId,
    validated.state,
    workspaceId,
  );
  const row = await updateProjectRecord(resources.pool, {
    ...validated,
    ownerId,
    projectId: validatedProjectId,
    state,
    workspaceId,
  });
  if (!row) {
    throw new ProjectRequestError("PROJECT_NOT_FOUND", "未找到该项目。", 404);
  }
  return presentProject(resources, row);
}

export function projectApiError(
  error,
  projectId = "",
  requestId = newRequestId(),
) {
  if (
    error instanceof AuthenticationError ||
    error instanceof OrganizationError ||
    error instanceof ProjectRequestError ||
    error instanceof ProjectPersistenceError ||
    error instanceof ReferenceRequestError
  ) {
    return {
      body: {
        error: {
          code: error.code,
          message: error.message,
          projectId: projectId || undefined,
          requestId,
          retryable: error.retryable ?? false,
        },
      },
      status: error.status,
    };
  }
  console.error(
    JSON.stringify({
      event: "project.api_failed",
      message: error instanceof Error ? error.message : String(error),
      requestId,
    }),
  );
  return {
    body: {
      error: {
        code: "SAVE_FAILED",
        message: "项目暂时无法保存或读取，当前创作内容已保留，请重试。",
        projectId: projectId || undefined,
        requestId,
        retryable: true,
      },
    },
    status: 503,
  };
}
