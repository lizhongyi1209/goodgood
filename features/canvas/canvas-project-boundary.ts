import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";
import type { CanvasProjectDocument, CanvasProjectRecord, CanvasProjectSummary } from "@/shared/contracts/canvas-project";

type ApiFailure = { error?: { code?: string; message?: string; retryable?: boolean } };

export class CanvasProjectBoundaryError extends Error {
  constructor(readonly code: string, message: string, readonly status: number, readonly retryable: boolean) {
    super(message);
    this.name = "CanvasProjectBoundaryError";
  }
}

async function parse<T>(response: Response): Promise<T> {
  const payload = await response.json() as T | ApiFailure;
  if (!response.ok) {
    const error = (payload as ApiFailure).error;
    throw new CanvasProjectBoundaryError(
      error?.code ?? "CANVAS_PROJECT_UNAVAILABLE",
      error?.message ?? "画布项目暂时无法同步，请稍后重试。",
      response.status,
      error?.retryable ?? response.status >= 500,
    );
  }
  return payload as T;
}

export async function listCanvasProjects(): Promise<readonly CanvasProjectSummary[]> {
  const result = await parse<{ projects: CanvasProjectSummary[] }>(await goodGoodApiFetch("/api/canvas-projects", { cache: "no-store" }));
  return result.projects;
}

export function readCanvasProject(projectId: string): Promise<CanvasProjectRecord> {
  return goodGoodApiFetch(`/api/canvas-projects/${encodeURIComponent(projectId)}`, { cache: "no-store" })
    .then((response) => parse<CanvasProjectRecord>(response));
}

export function saveCanvasProject(input: {
  id: string;
  expectedVersion: number | null;
  name: string;
  document: CanvasProjectDocument;
}): Promise<CanvasProjectRecord> {
  return goodGoodApiFetch(`/api/canvas-projects/${encodeURIComponent(input.id)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      expectedVersion: input.expectedVersion,
      name: input.name,
      document: input.document,
    }),
  }).then((response) => parse<CanvasProjectRecord>(response));
}

/** Project-list management never submits a stale canvas document. */
export async function readCanvasProjectCatalog(): Promise<{ projects: CanvasProjectSummary[]; deletedProjectIds: string[] }> {
  const result = await parse<{ projects: CanvasProjectSummary[]; deletedProjectIds?: string[] }>(
    await goodGoodApiFetch("/api/canvas-projects", { cache: "no-store" }),
  );
  return { projects: result.projects, deletedProjectIds: result.deletedProjectIds ?? [] };
}

export function renameCanvasProject(id: string, name: string, expectedVersion: number): Promise<CanvasProjectSummary> {
  return goodGoodApiFetch(`/api/canvas-projects/${encodeURIComponent(id)}`, {
    method: "PATCH", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, expectedVersion }),
  }).then((response) => parse<CanvasProjectSummary>(response));
}

export function deleteCanvasProject(id: string, expectedVersion: number | null): Promise<{ id: string }> {
  return goodGoodApiFetch(`/api/canvas-projects/${encodeURIComponent(id)}`, {
    method: "DELETE", headers: { "content-type": "application/json" },
    body: JSON.stringify({ expectedVersion }),
  }).then((response) => parse<{ id: string }>(response));
}
