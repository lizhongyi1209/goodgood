import type { ImageFileMetadataFields } from "./image-file-metadata.mjs";

export const RANDOM_IMAGE_METADATA_PRESETS: readonly Readonly<ImageFileMetadataFields>[];
export function createRandomImageMetadataPicker(random?: () => number): () => ImageFileMetadataFields;
export function hasImageMetadataContent(fields: ImageFileMetadataFields): boolean;
