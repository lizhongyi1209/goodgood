type ImageDownloadDependencies = Readonly<{
  documentObject?: Pick<Document, "body" | "createElement">;
  fetchImplementation?: typeof fetch;
  schedule?: (callback: () => void, delayMs: number) => unknown;
  urlObject?: Pick<typeof URL, "createObjectURL" | "revokeObjectURL">;
}>;

export type ImageDownloadResult = "started";

const OBJECT_URL_RELEASE_DELAY_MS = 60_000;

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
    // A malformed URL will fail during fetch; keep a safe download filename.
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
  const fetchImplementation = dependencies.fetchImplementation ?? fetch;
  const response = await fetchImplementation(input.previewUrl);
  if (!response.ok) {
    throw new Error(`Image download failed with status ${response.status}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0) {
    throw new Error("Image download returned an empty file.");
  }

  const documentObject = dependencies.documentObject ?? document;
  const urlObject = dependencies.urlObject ?? URL;
  const schedule = dependencies.schedule ?? setTimeout;
  const blob = new Blob([bytes], {
    type: response.headers.get("content-type") ?? "application/octet-stream",
  });
  const objectUrl = urlObject.createObjectURL(blob);
  const link = documentObject.createElement("a");
  link.href = objectUrl;
  link.download = imageDownloadFilename(
    input.createdAt,
    input.ordinal,
    input.previewUrl,
  );
  link.style.display = "none";
  try {
    documentObject.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    schedule(() => urlObject.revokeObjectURL(objectUrl), OBJECT_URL_RELEASE_DELAY_MS);
  }
  return "started";
}
