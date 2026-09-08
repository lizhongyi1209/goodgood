type SaveFileWritable = Readonly<{
  abort?: () => Promise<void>;
  close: () => Promise<void>;
  write: (data: Uint8Array<ArrayBuffer>) => Promise<void>;
}>;

type SaveFileHandle = Readonly<{
  createWritable: (
    options?: Readonly<{ keepExistingData?: boolean }>,
  ) => Promise<SaveFileWritable>;
  getFile: () => Promise<Readonly<{ size: number }>>;
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
  createdAt: string,
  ordinal: number,
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
  const createdDate = new Date(createdAt);
  const safeDate = Number.isNaN(createdDate.valueOf()) ? new Date() : createdDate;
  const pad = (value: number) => String(value).padStart(2, "0");
  const timestamp = [
    safeDate.getFullYear(),
    pad(safeDate.getMonth() + 1),
    pad(safeDate.getDate()),
    "_",
    pad(safeDate.getHours()),
    pad(safeDate.getMinutes()),
    pad(safeDate.getSeconds()),
  ].join("");
  const imageOrdinal = Number.isSafeInteger(ordinal) && ordinal > 0 ? ordinal : 1;
  return `GoodGood_${timestamp}_${pad(imageOrdinal)}${extension}`;
}

export async function saveImageToLocal(
  input: Readonly<{
    createdAt: string;
    ordinal: number;
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
    input.createdAt,
    input.ordinal,
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
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0) {
    throw new Error("Image download returned an empty file.");
  }

  if (fileHandle) {
    const writable = await fileHandle.createWritable({
      keepExistingData: false,
    });
    try {
      await writable.write(bytes);
      await writable.close();
    } catch (error) {
      await writable.abort?.().catch(() => undefined);
      throw error;
    }
    const savedFile = await fileHandle.getFile();
    if (savedFile.size !== bytes.byteLength) {
      throw new Error("Image download verification failed.");
    }
    return "saved";
  }

  const documentObject = dependencies.documentObject ?? document;
  const urlObject = dependencies.urlObject ?? URL;
  const blob = new Blob([bytes], {
    type: response.headers.get("content-type") ?? "application/octet-stream",
  });
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
