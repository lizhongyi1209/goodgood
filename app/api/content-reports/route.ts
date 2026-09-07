import {
  contentSafetyApiError,
  createContentReport,
} from "@/server/content-safety/api.mjs";
import { ContentSafetyError } from "@/server/content-safety/errors.mjs";
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

export async function POST(request: Request) {
  try {
    if (request.headers.get("x-goodgood-content-safety-action") !== "1") {
      throw new ContentSafetyError(
        "CONTENT_SAFETY_CSRF_CHECK_FAILED",
        "内容安全请求未通过安全校验，请刷新后重试。",
        403,
      );
    }
    const result = await createContentReport({
      idempotencyKey: request.headers.get("idempotency-key") ?? undefined,
      input: await request.json(),
      ownerContext: await ownerContext(request),
    });
    return Response.json(result, {
      headers: { "cache-control": "no-store" },
      status: result.created ? 201 : 200,
    });
  } catch (error) {
    const failure = contentSafetyApiError(error);
    return Response.json(failure.body, {
      headers: { "cache-control": "no-store" },
      status: failure.status,
    });
  }
}
