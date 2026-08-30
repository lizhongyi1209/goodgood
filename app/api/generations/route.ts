import {
  generationApiError,
  submitGeneration,
} from "@/server/generation/api.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const result = await submitGeneration({
      idempotencyKey: request.headers.get("idempotency-key"),
      input: await request.json(),
    });
    return Response.json(result.job, {
      headers: { "cache-control": "no-store" },
      status: result.created ? 202 : 200,
    });
  } catch (error) {
    const response = generationApiError(error);
    return Response.json(response.body, {
      headers: { "cache-control": "no-store" },
      status: response.status,
    });
  }
}
