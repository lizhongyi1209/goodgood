export type ImageMetadataKey = "make" | "model" | "lensMake" | "lensModel" | "exposureTime" | "fNumber" | "iso" | "focalLength" | "focalLength35mm" | "exposureBias" | "dateTimeOriginal" | "artist" | "copyright" | "description" | "software" | "latitude" | "longitude";
export type ImageFileMetadataFields = Partial<Record<ImageMetadataKey, string>>;
export const IMAGE_METADATA_FIELDS: readonly Readonly<{ key: ImageMetadataKey; label: string; group: string; placeholder: string }>[];
export function readImageFileMetadata(bytes: Uint8Array): Readonly<{ format: "jpeg" | "png"; hasMetadata: boolean; fields: ImageFileMetadataFields; orientation: number }>;
export function validateImageMetadata(input: unknown): ImageFileMetadataFields;
export function writeImageFileMetadata(bytes: Uint8Array, fields: ImageFileMetadataFields, options?: Readonly<{ clear?: boolean; orientation?: number }>): Readonly<{ bytes: Uint8Array<ArrayBuffer>; mimeType: "image/jpeg" | "image/png"; extension: "jpg" | "png" }>;
export function copyImageMetadataJson(fields: ImageFileMetadataFields): string;
export function parseImageMetadataJson(text: string): ImageFileMetadataFields;
