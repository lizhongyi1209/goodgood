import { getAudioMaterialContentUrl } from "@/server/audio-materials/api.mjs";
import { audioFailure, audioScope } from "../../helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ materialId: string }> }) {
  const { materialId } = await context.params;
  try {
    const { url } = await getAudioMaterialContentUrl({ ...await audioScope(request), materialId });
    return new Response(null, { status: 302, headers: { "cache-control": "private, no-store", location: url } });
  } catch (error) { return audioFailure(error, materialId); }
}
