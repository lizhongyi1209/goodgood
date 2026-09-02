import { billingApiError } from "@/server/billing/api.mjs";
import { acceptFakePaymentWebhook } from "@/server/billing/payment-api.mjs";
import { PaymentError } from "@/server/billing/payment-errors.mjs";
import { loadFakePaymentSandboxConfig } from "@/server/billing/payment-sandbox.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const rawBody = Buffer.from(await request.arrayBuffer());
    if (rawBody.length > 64 * 1024) {
      throw new PaymentError(
        "PAYMENT_REQUEST_INVALID",
        "支付请求内容过大。",
        400,
      );
    }
    return Response.json(
      await acceptFakePaymentWebhook({
        headers: Object.fromEntries(request.headers.entries()),
        paymentSandbox: loadFakePaymentSandboxConfig(),
        rawBody,
      }),
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const response = billingApiError(error);
    return Response.json(response.body, {
      headers: { "cache-control": "no-store" },
      status: response.status,
    });
  }
}
