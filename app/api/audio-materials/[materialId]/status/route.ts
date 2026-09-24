import { getAudioMaterialStatus } from "@/server/audio-materials/api.mjs";
import { audioFailure, audioJson, audioScope } from "../../helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ materialId: string }> }) {
  const { materialId } = await context.params;
  try { return audioJson(await getAudioMaterialStatus({ ...await audioScope(request), materialId })); }
  catch (error) { return audioFailure(error, materialId); }
}
