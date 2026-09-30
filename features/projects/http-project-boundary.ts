import type {
  ProjectRecord,
  ProjectSaveDraft,
} from "@/shared/contracts/project";
import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";
import { workspaceRequestHeaders } from "@/features/organizations/workspace-request";

type ProjectApiErrorEnvelope = Readonly<{
  error?: Readonly<{
    code?: string;
    message?: string;
    retryable?: boolean;
  }>;
}>;

export class ProjectBoundaryError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.name = "ProjectBoundaryError";
    this.code = code;
    this.retryable = retryable;
  }
}

async function parseProject(response: Response) {
  const payload = (await response.json()) as ProjectRecord | ProjectApiErrorEnvelope;
  if (!response.ok) {
    const failure = payload as ProjectApiErrorEnvelope;
    throw new ProjectBoundaryError(
      failure.error?.code ?? "SAVE_FAILED",
      failure.error?.message ?? "项目暂时不可用，当前创作内容已保留，请重试。",
      failure.error?.retryable ?? false,
    );
  }
  return payload as ProjectRecord;
}

function projectRequestPayload(draft: ProjectSaveDraft) {
  return {
    batchIds: draft.batchIds,
    name: draft.name,
    state: {
      ...draft.state,
      references: draft.state.references.map((reference) => ({ id: reference.id })),
    },
  };
}

export async function listProjects(
  workspaceId: string | null = null,
): Promise<readonly ProjectRecord[]> {
  const response = await goodGoodApiFetch("/api/projects", {
    cache: "no-store",
    headers: workspaceRequestHeaders(workspaceId),
  });
  const payload = (await response.json()) as
    | Readonly<{ projects: readonly ProjectRecord[] }>
    | ProjectApiErrorEnvelope;
  if (!response.ok) {
    const failure = payload as ProjectApiErrorEnvelope;
    throw new ProjectBoundaryError(
      failure.error?.code ?? "SAVE_FAILED",
      failure.error?.message ?? "项目列表暂时不可用，请重试。",
      failure.error?.retryable ?? false,
    );
  }
  return (payload as Readonly<{ projects: readonly ProjectRecord[] }>).projects;
}

export async function readProject(
  projectId: string,
  workspaceId: string | null = null,
): Promise<ProjectRecord> {
  return parseProject(
    await goodGoodApiFetch(`/api/projects/${encodeURIComponent(projectId)}`, {
      cache: "no-store",
      headers: workspaceRequestHeaders(workspaceId),
    }),
  );
}

export async function saveProject(
  draft: ProjectSaveDraft,
  workspaceId: string | null = null,
): Promise<ProjectRecord> {
  const projectId = draft.projectId ?? null;
  const idempotencyKey = draft.idempotencyKey ?? `project_${globalThis.crypto.randomUUID()}`;
  return parseProject(
    await goodGoodApiFetch(
      projectId
        ? `/api/projects/${encodeURIComponent(projectId)}`
        : "/api/projects",
      {
        body: JSON.stringify(projectRequestPayload(draft)),
        headers: {
          "content-type": "application/json",
          ...(projectId ? {} : { "idempotency-key": idempotencyKey }),
          ...workspaceRequestHeaders(workspaceId),
        },
        method: projectId ? "PATCH" : "POST",
      },
    ),
  );
}

async function parseManagement<T>(response: Response): Promise<T> {
  const payload = await response.json() as T | ProjectApiErrorEnvelope;
  if (!response.ok) {
    const failure = (payload as ProjectApiErrorEnvelope).error;
    throw new ProjectBoundaryError(failure?.code ?? "PROJECT_UNAVAILABLE",
      failure?.message ?? "项目操作未完成，请重试。", failure?.retryable ?? false);
  }
  return payload as T;
}

export function renameProject(projectId: string, name: string, workspaceId: string | null = null): Promise<Pick<ProjectRecord, "id" | "name" | "updatedAt">> {
  return goodGoodApiFetch(`/api/projects/${encodeURIComponent(projectId)}`, {
    method: "PATCH", headers: { "content-type": "application/json", ...workspaceRequestHeaders(workspaceId) },
    body: JSON.stringify({ name }),
  }).then((response) => parseManagement<Pick<ProjectRecord, "id" | "name" | "updatedAt">>(response));
}

export function deleteProject(projectId: string, workspaceId: string | null = null): Promise<{ id: string }> {
  return goodGoodApiFetch(`/api/projects/${encodeURIComponent(projectId)}`, {
    method: "DELETE", headers: workspaceRequestHeaders(workspaceId),
  }).then((response) => parseManagement<{ id: string }>(response));
}
