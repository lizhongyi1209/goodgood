import { loadAuthenticationConfig } from "@/server/auth/config.mjs";
import { createRequestAuthenticator } from "@/server/auth/request-authenticator.mjs";
import { billingApiError } from "@/server/billing/api.mjs";
import { createPaymentOrder } from "@/server/billing/payment-api.mjs";
import { PaymentError } from "@/server/billing/payment-errors.mjs";
import { loadFakePaymentSandboxConfig } from "@/server/billing/payment-sandbox.mjs";
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
    const authenticatedOwner = await ownerContext(request);
    let input: unknown;
    try {
      input = await request.json();
    } catch {
      throw new PaymentError(
        "PAYMENT_REQUEST_INVALID",
        "支付订单请求无效。",
        400,
      );
    }
    const result = await createPaymentOrder({
      idempotencyKey: request.headers.get("idempotency-key"),
      input,
      ownerContext: authenticatedOwner,
      paymentSandbox: loadFakePaymentSandboxConfig(),
    });
    return Response.json(result.order, {
      headers: { "cache-control": "no-store" },
      status: result.created ? 201 : 200,
    });
  } catch (error) {
    const response = billingApiError(error);
    return Response.json(response.body, {
      headers: { "cache-control": "no-store" },
      status: response.status,
    });
  }
}
