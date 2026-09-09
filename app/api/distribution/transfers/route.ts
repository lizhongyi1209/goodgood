import {
  createDistributionTransfer,
  distributionApiError,
  readDistributionTransfers,
} from "@/server/distribution/api.mjs";
import { getAuthenticationRuntime } from "@/server/auth/runtime-operations.mjs";
import { DistributionError } from "@/server/distribution/errors.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { authenticate } = await getAuthenticationRuntime();
    const url = new URL(request.url);
    return Response.json(
      await readDistributionTransfers({
        input: {
          cursor: url.searchParams.get("cursor"),
          limit: url.searchParams.get("limit") ?? undefined,
        },
        ownerContext: await authenticate(request),
      }),
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return failureResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    if (request.headers.get("x-goodgood-distribution-action") !== "1") {
      throw new DistributionError(
        "DISTRIBUTION_CSRF_CHECK_FAILED",
        "积分划拨请求未通过安全校验，请刷新后重试。",
        403,
      );
    }
    const { authenticate } = await getAuthenticationRuntime();
    const result = await createDistributionTransfer({
      idempotencyKey: request.headers.get("idempotency-key"),
      input: await request.json(),
      ownerContext: await authenticate(request),
    });
    return Response.json(result, {
      headers: { "cache-control": "no-store" },
      status: result.created ? 201 : 200,
    });
  } catch (error) {
    return failureResponse(
      error instanceof SyntaxError
        ? new DistributionError(
            "CREDIT_TRANSFER_REQUEST_INVALID",
            "积分划拨请求内容无效。",
            400,
          )
        : error,
    );
  }
}

function failureResponse(error: unknown) {
  const failure = distributionApiError(error);
  return Response.json(failure.body, {
    headers: { "cache-control": "no-store" },
    status: failure.status,
  });
}
