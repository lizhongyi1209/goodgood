type SaveFileWritable = Readonly<{
  abort?: () => Promise<void>;
  close: () => Promise<void>;
  write: (data: Blob) => Promise<void>;
}>;

type SaveFileHandle = Readonly<{
  createWritable: () => Promise<SaveFileWritable>;
}>;

type SaveFilePicker = (options: Readonly<{
  suggestedName: string;
  types: readonly Readonly<{
    accept: Readonly<Record<string, readonly string[]>>;
    description: string;
  }>[];
}>) => Promise<SaveFileHandle>;

type ImageDownloadDependencies = Readonly<{
  documentObject?: Pick<Document, "body" | "createElement">;
  fetchImplementation?: typeof fetch;
  saveFilePicker?: SaveFilePicker | null;
  urlObject?: Pick<typeof URL, "createObjectURL" | "revokeObjectURL">;
}>;

export type ImageDownloadResult = "cancelled" | "saved";

const IMAGE_FILE_TYPES = [{
  accept: {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/webp": [".webp"],
  },
  description: "图片",
}] as const;

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : Boolean(error && typeof error === "object" && "name" in error && error.name === "AbortError");
}

export function imageDownloadFilename(
  batchId: string,
  imageId: string,
  previewUrl: string,
): string {
  let extension = ".png";
  try {
    const match = new URL(previewUrl, "https://goodgood.local").pathname
      .match(/\.(jpe?g|png|webp)$/i);
    if (match) extension = `.${match[1].toLowerCase().replace("jpeg", "jpg")}`;
  } catch {
    // A malformed URL will fail during fetch; keep a safe filename for the picker.
  }
  const safePart = (value: string) => value.replace(/[^a-zA-Z0-9_-]+/g, "-");
  return `goodgood-${safePart(batchId)}-${safePart(imageId)}${extension}`;
}

export async function saveImageToLocal(
  input: Readonly<{
    batchId: string;
    imageId: string;
    previewUrl: string;
  }>,
  dependencies: ImageDownloadDependencies = {},
): Promise<ImageDownloadResult> {
  const globalWithPicker = globalThis as typeof globalThis & {
    showSaveFilePicker?: SaveFilePicker;
  };
  const picker = dependencies.saveFilePicker === undefined
    ? globalWithPicker.showSaveFilePicker?.bind(globalThis)
    : dependencies.saveFilePicker ?? undefined;
  const suggestedName = imageDownloadFilename(
    input.batchId,
    input.imageId,
    input.previewUrl,
  );

  let fileHandle: SaveFileHandle | null = null;
  if (picker) {
    try {
      fileHandle = await picker({ suggestedName, types: IMAGE_FILE_TYPES });
    } catch (error) {
      if (isAbortError(error)) return "cancelled";
      throw error;
    }
  }

  const fetchImplementation = dependencies.fetchImplementation ?? fetch;
  const response = await fetchImplementation(input.previewUrl);
  if (!response.ok) {
    throw new Error(`Image download failed with status ${response.status}`);
  }
  const blob = await response.blob();

  if (fileHandle) {
    const writable = await fileHandle.createWritable();
    try {
      await writable.write(blob);
      await writable.close();
    } catch (error) {
      await writable.abort?.().catch(() => undefined);
      throw error;
    }
    return "saved";
  }

  const documentObject = dependencies.documentObject ?? document;
  const urlObject = dependencies.urlObject ?? URL;
  const objectUrl = urlObject.createObjectURL(blob);
  const link = documentObject.createElement("a");
  link.href = objectUrl;
  link.download = suggestedName;
  link.style.display = "none";
  documentObject.body.appendChild(link);
  link.click();
  link.remove();
  urlObject.revokeObjectURL(objectUrl);
  return "saved";
}
