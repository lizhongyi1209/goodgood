import {
  videoReferenceCapacityError,
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
): VideoReferenceRole {
  if (material.mediaType === "video") return "reference_video";
  if (material.mediaType === "audio") return "reference_audio";
  return references.some((reference) => reference.role === "first_frame")
    ? "reference_image"
    : "first_frame";
}

export function videoAssetToReference(
  material: VideoAssetMaterial,
  references: readonly VideoReference[],
): VideoReference {
  return {
    id: material.id,
    mediaType: material.mediaType,
    name: material.name,
    role: roleForAsset(material, references),
    size: material.size,
    url: material.url,
  };
}

export function appendVideoAssetMaterials(
  references: readonly VideoReference[],
  materials: readonly VideoAssetMaterial[],
  modelId: VideoGenerationModelId,
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
    const candidate = videoAssetToReference(material, nextReferences);
    const capacityError = videoReferenceCapacityError(
      modelId,
      [...nextReferences, candidate],
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
    references: nextReferences,
    addedCount,
    duplicateCount,
    rejectedCount,
    firstCapacityError,
  };
}
