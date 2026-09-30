import { loadAuthenticationConfig } from "@/server/auth/config.mjs";
import { createRequestAuthenticator } from "@/server/auth/request-authenticator.mjs";
import { getGenerationResources } from "@/server/generation/resources.mjs";
import {
  canvasProjectApiError, deleteCanvasProject, readCanvasProject, readCanvasProjectJson, renameCanvasProject, saveCanvasProject,
} from "@/server/canvas-projects/api.mjs";
import { workspaceIdFromRequest } from "@/server/organizations/request.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function ownerContext(request: Request) {
  const resources = await getGenerationResources();
  return createRequestAuthenticator({
    config: loadAuthenticationConfig(), getPool: async () => resources.pool,
  })(request);
}

export async function GET(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;
  try {
    return Response.json(await readCanvasProject({
      projectId, ownerContext: await ownerContext(request), workspaceId: workspaceIdFromRequest(request),
    }), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const failure = canvasProjectApiError(error);
    return Response.json(failure.body, { status: failure.status, headers: { "cache-control": "no-store" } });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;
  try {
    const owner = await ownerContext(request);
    return Response.json(await saveCanvasProject({
      projectId, ownerContext: owner, workspaceId: workspaceIdFromRequest(request),
      input: await readCanvasProjectJson(request),
    }), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const failure = canvasProjectApiError(error);
    return Response.json(failure.body, { status: failure.status, headers: { "cache-control": "no-store" } });
  }
}

async function manage(request: Request, context: { params: Promise<{ projectId: string }> }, operation: typeof renameCanvasProject | typeof deleteCanvasProject) {
  const { projectId } = await context.params;
  try {
    const owner = await ownerContext(request);
    return Response.json(await operation({
      projectId, ownerContext: owner, workspaceId: workspaceIdFromRequest(request),
      input: await readCanvasProjectJson(request),
    }), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const failure = canvasProjectApiError(error);
    return Response.json(failure.body, { status: failure.status, headers: { "cache-control": "no-store" } });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ projectId: string }> }) {
  return manage(request, context, renameCanvasProject);
}

export async function DELETE(request: Request, context: { params: Promise<{ projectId: string }> }) {
  return manage(request, context, deleteCanvasProject);
}
