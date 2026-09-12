import {
  assertLocalPreviewRequest,
  loadLocalSeedancePreviewClient,
  localSeedancePreviewErrorResponse,
  resolveLocalSeedancePreviewConfig,
  toLocalVideoPreviewResult,
} from "@/server/video/local-seedance-preview.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEADERS = { "cache-control": "no-store" };

function errorResponse(error: unknown) {
  const response = localSeedancePreviewErrorResponse(error);
  return Response.json(response.body, { headers: HEADERS, status: response.status });
}

export async function GET(request: Request) {
  try {
    assertLocalPreviewRequest(request);
    const taskId = new URL(request.url).searchParams.get("taskId");
    if (!taskId) {
      resolveLocalSeedancePreviewConfig();
      await loadLocalSeedancePreviewClient();
      return Response.json({ available: true, persistence: false }, { headers: HEADERS });
    }
    const client = await loadLocalSeedancePreviewClient();
    return Response.json(
      toLocalVideoPreviewResult(await client.getVideo({ taskId })),
      { headers: HEADERS },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertLocalPreviewRequest(request, { mutating: true });
    const client = await loadLocalSeedancePreviewClient();
    const result = await client.createVideo(await request.json());
    return Response.json(toLocalVideoPreviewResult(result), {
      headers: HEADERS,
      status: 202,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
