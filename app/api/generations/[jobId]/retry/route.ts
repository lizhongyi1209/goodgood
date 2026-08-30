import {
  generationApiError,
  retryGeneration,
} from "@/server/generation/api.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  try {
    const result = await retryGeneration({
      idempotencyKey: request.headers.get("idempotency-key"),
      jobId,
    });
    return Response.json(result.job, {
      headers: { "cache-control": "no-store" },
      status: result.created ? 202 : 200,
    });
  } catch (error) {
    const response = generationApiError(error, jobId);
    return Response.json(response.body, {
      headers: { "cache-control": "no-store" },
      status: response.status,
    });
  }
}
