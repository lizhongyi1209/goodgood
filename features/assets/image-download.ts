import { readAssetDownloadUrl } from "@/features/assets/http-asset-boundary";

type ImageDownloadDependencies = Readonly<{
  documentObject?: Pick<Document, "body" | "createElement">;
  fetchImplementation?: typeof fetch;
  resolveDownloadUrl?: (assetId: string) => Promise<string>;
  schedule?: (callback: () => void, delayMs: number) => unknown;
  urlObject?: Pick<typeof URL, "createObjectURL" | "revokeObjectURL">;
}>;

export type ImageDownloadResult = "started";
export type ImageDownloadStage =
  | "resolve-url"
  | "fetch"
  | "read"
  | "validate"
  | "prepare"
  | "start";

export class ImageDownloadError extends Error {
  readonly stage: ImageDownloadStage;

  constructor(stage: ImageDownloadStage, message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "ImageDownloadError";
    this.stage = stage;
  }
}

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
    assetId: string;
    createdAt: string;
    ordinal: number;
    previewUrl: string;
  }>,
  dependencies: ImageDownloadDependencies = {},
): Promise<ImageDownloadResult> {
  const resolveDownloadUrl = dependencies.resolveDownloadUrl ?? readAssetDownloadUrl;
  let downloadUrl: string;
  try {
    downloadUrl = await resolveDownloadUrl(input.assetId);
  } catch (error) {
    throw new ImageDownloadError(
      "resolve-url",
      "Image download URL could not be refreshed.",
      error,
    );
  }
  const fetchImplementation = dependencies.fetchImplementation ?? fetch;
  let response: Response;
  try {
    response = await fetchImplementation(downloadUrl);
  } catch (error) {
    throw new ImageDownloadError(
      "fetch",
      "Image download request failed.",
      error,
    );
  }
  if (!response.ok) {
    throw new ImageDownloadError(
      "fetch",
      `Image download failed with status ${response.status}`,
    );
  }
  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = new Uint8Array(await response.arrayBuffer());
  } catch (error) {
    throw new ImageDownloadError(
      "read",
      "Image download response could not be read.",
      error,
    );
  }
  if (bytes.byteLength === 0) {
    throw new ImageDownloadError(
      "validate",
      "Image download returned an empty file.",
    );
  }

  const documentObject = dependencies.documentObject ?? document;
  const urlObject = dependencies.urlObject ?? URL;
  const schedule = dependencies.schedule ?? setTimeout;
  let objectUrl: string;
  let link: HTMLAnchorElement;
  try {
    const blob = new Blob([bytes], {
      type: response.headers.get("content-type") ?? "application/octet-stream",
    });
    objectUrl = urlObject.createObjectURL(blob);
    link = documentObject.createElement("a");
  } catch (error) {
    throw new ImageDownloadError(
      "prepare",
      "Image download could not be prepared.",
      error,
    );
  }
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
  } catch (error) {
    throw new ImageDownloadError(
      "start",
      "Browser download could not be started.",
      error,
    );
  } finally {
    link.remove();
    schedule(() => urlObject.revokeObjectURL(objectUrl), OBJECT_URL_RELEASE_DELAY_MS);
  }
  return "started";
}
