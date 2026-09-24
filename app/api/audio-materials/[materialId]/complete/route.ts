import { completeAudioMaterialUpload } from "@/server/audio-materials/api.mjs";
import { audioFailure, audioJson, audioScope } from "../../helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ materialId: string }> }) {
  const { materialId } = await context.params;
  try { return audioJson(await completeAudioMaterialUpload({ ...await audioScope(request), materialId })); }
  catch (error) { return audioFailure(error, materialId); }
}
