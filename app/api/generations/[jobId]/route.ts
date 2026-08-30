import {
  generationApiError,
  readGeneration,
} from "@/server/generation/api.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  try {
    return Response.json(await readGeneration(jobId), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const response = generationApiError(error, jobId);
    return Response.json(response.body, {
      headers: { "cache-control": "no-store" },
      status: response.status,
    });
  }
}
