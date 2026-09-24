import { createAudioMaterialUpload, listAudioMaterials } from "@/server/audio-materials/api.mjs";
import { audioFailure, audioJson, audioScope } from "./helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try { return audioJson(await listAudioMaterials(await audioScope(request))); }
  catch (error) { return audioFailure(error); }
}

export async function POST(request: Request) {
  try { return audioJson(await createAudioMaterialUpload({ ...await audioScope(request), file: (await request.json() as { file?: unknown })?.file }), 201); }
  catch (error) { return audioFailure(error); }
}
