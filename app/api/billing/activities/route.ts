import {
  readCreditActivities,
  readPreviewCreditActivities,
} from "@/server/billing/activity-api.mjs";
import { billingApiError } from "@/server/billing/api.mjs";
import { loadAuthenticationConfig } from "@/server/auth/config.mjs";
import { createRequestAuthenticator } from "@/server/auth/request-authenticator.mjs";
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

function inputFrom(request: Request) {
  const search = new URL(request.url).searchParams;
  return {
    cursor: search.get("cursor"),
    filter: search.get("filter") ?? "all",
    limit: search.get("limit") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const input = inputFrom(request);
    const page = process.env.NODE_ENV !== "production" && !process.env.GOODGOOD_AUTH_MODE
      ? readPreviewCreditActivities({ input })
      : await readCreditActivities({
          input,
          ownerContext: await ownerContext(request),
        });
    return Response.json(page, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const response = billingApiError(error);
    return Response.json(response.body, {
      headers: { "cache-control": "no-store" },
      status: response.status,
    });
  }
}
