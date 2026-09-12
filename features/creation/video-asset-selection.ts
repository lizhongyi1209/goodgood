import {
  DEFAULT_VIDEO_GENERATION_MODE,
  normalizeVideoReferencesForMode,
  videoReferenceCapacityError,
  type VideoGenerationMode,
  type VideoGenerationModelId,
  type VideoReference,
  type VideoReferenceMediaType,
  type VideoReferenceRole,
} from "@/features/creation/video-generation-options";

export type VideoAssetMediaFilter = "all" | VideoReferenceMediaType;

export type VideoAssetMaterial = Readonly<{
  id: string;
  mediaType: VideoReferenceMediaType;
  name: string;
  size: number;
  source: "generated" | "uploaded";
  url: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
}>;

export type AppendVideoAssetMaterialsResult = Readonly<{
  references: readonly VideoReference[];
  addedCount: number;
  duplicateCount: number;
  rejectedCount: number;
  firstCapacityError: string | null;
}>;

function roleForAsset(
  material: VideoAssetMaterial,
  references: readonly VideoReference[],
  generationMode: VideoGenerationMode,
): VideoReferenceRole {
  if (material.mediaType === "video") return "reference_video";
  if (material.mediaType === "audio") return "reference_audio";
  if (generationMode === "multimodal") return "reference_image";
  return references.some((reference) => reference.role === "first_frame")
    ? "last_frame"
    : "first_frame";
}

export function videoAssetToReference(
  material: VideoAssetMaterial,
  references: readonly VideoReference[],
  generationMode: VideoGenerationMode = DEFAULT_VIDEO_GENERATION_MODE,
): VideoReference {
  return {
    id: material.id,
    mediaType: material.mediaType,
    name: material.name,
    role: roleForAsset(material, references, generationMode),
    size: material.size,
    url: material.url,
  };
}

export function appendVideoAssetMaterials(
  references: readonly VideoReference[],
  materials: readonly VideoAssetMaterial[],
  modelId: VideoGenerationModelId,
  generationMode: VideoGenerationMode = DEFAULT_VIDEO_GENERATION_MODE,
): AppendVideoAssetMaterialsResult {
  const nextReferences = [...references];
  let addedCount = 0;
  let duplicateCount = 0;
  let rejectedCount = 0;
  let firstCapacityError: string | null = null;

  for (const material of materials) {
    if (nextReferences.some((reference) => reference.id === material.id)) {
      duplicateCount += 1;
      continue;
    }
    const candidate = videoAssetToReference(material, nextReferences, generationMode);
    const capacityError = videoReferenceCapacityError(
      modelId,
      [...nextReferences, candidate],
      generationMode,
    );
    if (capacityError) {
      rejectedCount += 1;
      firstCapacityError ??= capacityError;
      continue;
    }
    nextReferences.push(candidate);
    addedCount += 1;
  }

  return {
    references: normalizeVideoReferencesForMode(nextReferences, generationMode),
    addedCount,
    duplicateCount,
    rejectedCount,
    firstCapacityError,
  };
}
