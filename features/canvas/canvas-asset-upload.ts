import { uploadPrivateAudioMaterial } from "@/features/assets/http-audio-materials";
import { saveAssetOrganization } from "@/features/assets/http-asset-organization";
import { uploadPrivateVideoMaterial } from "@/features/creation/http-video-materials";
import { uploadReferenceFiles } from "@/features/references/http-reference-upload";
import { canvasAssetFileError } from "./canvas-asset-addition.mjs";

export type UploadedCanvasAsset = Readonly<{ kind: "reference" | "video" | "audio"; id: string }>;
export const CANVAS_ASSET_LIBRARY_UPDATED_EVENT = "goodgood:canvas-asset-library-updated";

export async function uploadCanvasAssetFile(file: File, clientId: string): Promise<UploadedCanvasAsset> {
  const validation = canvasAssetFileError(file);
  if (validation) throw new Error(validation);
  if (file.type.startsWith("image/")) {
    const [result] = await uploadReferenceFiles([{ clientId, file }], () => {}, null);
    if (result?.reference.status !== "ready" || !result.reference.id) {
      throw new Error(result?.reference.errorMessage ?? "图片上传尚未确认，请重试。");
    }
    return { kind: "reference", id: result.reference.id };
  }
  const result = file.type === "video/mp4"
    ? await uploadPrivateVideoMaterial(clientId, file, null)
    : await uploadPrivateAudioMaterial(clientId, file, null);
  if (result.status !== "ready" || !result.id) throw new Error("素材上传尚未确认，请重试。");
  return { kind: file.type === "video/mp4" ? "video" : "audio", id: result.id };
}

export async function archiveCanvasAssetUpload(asset: UploadedCanvasAsset, folderId: string | null): Promise<void> {
  if (folderId) await saveAssetOrganization(asset.kind, asset.id, { folderId, tags: [] }, null);
}
