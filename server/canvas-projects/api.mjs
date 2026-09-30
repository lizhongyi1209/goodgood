import { AuthenticationError, sessionExpiredError } from "../auth/errors.mjs";
import { OrganizationError } from "../organizations/errors.mjs";
import { newRequestId } from "../observability/http.mjs";
import { getGenerationResources } from "../generation/resources.mjs";
import { CanvasProjectError } from "./errors.mjs";
import { deleteCanvasProjectRecord, listCanvasProjectRecords, listDeletedCanvasProjectIds,
  readCanvasProjectRecord, renameCanvasProjectRecord, saveCanvasProjectRecord } from "./repository.mjs";
import { canvasProjectBodyLimit, validateCanvasProjectDelete, validateCanvasProjectId,
  validateCanvasProjectRename, validateCanvasProjectSave } from "./validation.mjs";

const DEFAULT_WORKSPACE_ID = /** @type {string | null} */ (null);

function ownerId(ownerContext) {
  if (!ownerContext?.ownerId) throw sessionExpiredError();
  return ownerContext.ownerId;
}

export async function listCanvasProjects({ ownerContext, workspaceId = DEFAULT_WORKSPACE_ID }) {
  const resources = await getGenerationResources();
  const context = { ownerId: ownerId(ownerContext), workspaceId };
  const projects = await listCanvasProjectRecords(resources.pool, context);
  const deletedProjectIds = await listDeletedCanvasProjectIds(resources.pool, context);
  return { projects: projects.filter((project) => !deletedProjectIds.includes(project.id)), deletedProjectIds };
}

export async function readCanvasProject({ ownerContext, projectId, workspaceId = DEFAULT_WORKSPACE_ID }) {
  const resources = await getGenerationResources();
  const record = await readCanvasProjectRecord(resources.pool, {
    ownerId: ownerId(ownerContext), projectId: validateCanvasProjectId(projectId), workspaceId,
  });
  if (!record) throw new CanvasProjectError("CANVAS_PROJECT_NOT_FOUND", "未找到该画布项目。", 404);
  return record;
}

export async function saveCanvasProject({ input, ownerContext, projectId, workspaceId = DEFAULT_WORKSPACE_ID }) {
  const resources = await getGenerationResources();
  return saveCanvasProjectRecord(resources.pool, {
    ownerId: ownerId(ownerContext), projectId: validateCanvasProjectId(projectId), workspaceId,
    input: validateCanvasProjectSave(input),
  });
}

export async function renameCanvasProject({ input, ownerContext, projectId, workspaceId = DEFAULT_WORKSPACE_ID }) {
  const resources = await getGenerationResources();
  return renameCanvasProjectRecord(resources.pool, {
    ownerId: ownerId(ownerContext), projectId: validateCanvasProjectId(projectId), workspaceId,
    input: validateCanvasProjectRename(input),
  });
}

export async function deleteCanvasProject({ input, ownerContext, projectId, workspaceId = DEFAULT_WORKSPACE_ID }) {
  const resources = await getGenerationResources();
  return deleteCanvasProjectRecord(resources.pool, {
    ownerId: ownerId(ownerContext), projectId: validateCanvasProjectId(projectId), workspaceId,
    ...validateCanvasProjectDelete(input),
  });
}

export async function readCanvasProjectJson(request) {
  const contentType = typeof request.headers?.get === "function"
    ? request.headers.get("content-type") : request.headers?.["content-type"];
  if (String(contentType ?? "").split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    throw new CanvasProjectError("INVALID_CANVAS_PROJECT", "需要 JSON 格式的画布项目内容。", 415);
  }
  const chunks = [];
  let size = 0;
  const stream = request.body ?? request;
  for await (const chunk of stream) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > canvasProjectBodyLimit) {
      throw new CanvasProjectError("PAYLOAD_TOO_LARGE", "画布项目超过 1 MB 限制。", 413);
    }
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new CanvasProjectError("INVALID_CANVAS_PROJECT", "画布项目 JSON 格式无效。", 400);
  }
}

export function canvasProjectApiError(error, requestId = newRequestId()) {
  if (error instanceof CanvasProjectError || error instanceof AuthenticationError || error instanceof OrganizationError) {
    return { body: { error: { code: error.code, message: error.message, requestId, retryable: error.retryable ?? false } }, status: error.status };
  }
  console.error(JSON.stringify({ event: "canvas_project.api_failed", requestId,
    message: error instanceof Error ? error.message : String(error) }));
  return { body: { error: { code: "CANVAS_PROJECT_UNAVAILABLE",
    message: "画布暂时无法同步，内容已保留在本机，请稍后重试。", requestId, retryable: true } }, status: 503 };
}
