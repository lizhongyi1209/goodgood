import { loadAuthenticationConfig } from "@/server/auth/config.mjs";
import { createRequestAuthenticator } from "@/server/auth/request-authenticator.mjs";
import {
  creationDraftApiError,
  deleteCreationDraft,
  readCreationDraft,
  saveCreationDraft,
} from "@/server/drafts/api.mjs";
import { getGenerationResources } from "@/server/generation/resources.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function ownerContext(request: Request) {
  const resources = await getGenerationResources();
  return createRequestAuthenticator({
    config: loadAuthenticationConfig(),
    getPool: async () => resources.pool,
  })(request);
}

async function handle(
  request: Request,
  operation: (owner: Awaited<ReturnType<typeof ownerContext>>) => Promise<unknown>,
) {
  try {
    return Response.json(await operation(await ownerContext(request)), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const response = creationDraftApiError(error);
    return Response.json(response.body, {
      headers: { "cache-control": "no-store" },
      status: response.status,
    });
  }
}

export async function GET(request: Request) {
  return handle(request, (ownerContextValue) =>
    readCreationDraft({ ownerContext: ownerContextValue }));
}

export async function PUT(request: Request) {
  return handle(request, (ownerContextValue) =>
    request.json().then((input) =>
      saveCreationDraft({ input, ownerContext: ownerContextValue })));
}

export async function DELETE(request: Request) {
  return handle(request, (ownerContextValue) =>
    request.json().then((input) =>
      deleteCreationDraft({ input, ownerContext: ownerContextValue })));
}
