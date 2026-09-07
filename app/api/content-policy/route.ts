import {
  acceptContentPolicy,
  contentSafetyApiError,
  readContentPolicy,
} from "@/server/content-safety/api.mjs";
import { ContentSafetyError } from "@/server/content-safety/errors.mjs";
import { loadAuthenticationConfig } from "@/server/auth/config.mjs";
import { createRequestAuthenticator } from "@/server/auth/request-authenticator.mjs";
import { getGenerationResources } from "@/server/generation/resources.mjs";
import {
  CONTENT_POLICY,
  CONTENT_REPORT_CATEGORIES,
} from "@/server/content-safety/policy.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function ownerContext(request: Request) {
  const resources = await getGenerationResources();
  return createRequestAuthenticator({
    config: loadAuthenticationConfig(),
    getPool: async () => resources.pool,
  })(request);
}

function idempotencyKey(request: Request) {
  return request.headers.get("idempotency-key") ?? undefined;
}

function assertCsrfSafe(request: Request) {
  if (request.headers.get("x-goodgood-content-safety-action") !== "1") {
    throw new ContentSafetyError(
      "CONTENT_SAFETY_CSRF_CHECK_FAILED",
      "内容安全请求未通过安全校验，请刷新后重试。",
      403,
    );
  }
}

function failureResponse(error: unknown) {
  const failure = contentSafetyApiError(error);
  return Response.json(failure.body, {
    headers: { "cache-control": "no-store" },
    status: failure.status,
  });
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "production" && !process.env.GOODGOOD_AUTH_MODE) {
    return Response.json(
      {
        accepted: true,
        acceptedAt: new Date(0).toISOString(),
        policy: CONTENT_POLICY,
        reportCategories: CONTENT_REPORT_CATEGORIES,
      },
      { headers: { "cache-control": "no-store" } },
    );
  }
  try {
    return Response.json(
      await readContentPolicy({ ownerContext: await ownerContext(request) }),
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return failureResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertCsrfSafe(request);
    const result = await acceptContentPolicy({
      idempotencyKey: idempotencyKey(request),
      input: await request.json(),
      ownerContext: await ownerContext(request),
    });
    return Response.json(result, {
      headers: { "cache-control": "no-store" },
      status: result.created ? 201 : 200,
    });
  } catch (error) {
    return failureResponse(error);
  }
}
