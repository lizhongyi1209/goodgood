import type {
  VideoAspectRatio,
  VideoGenerationMode,
  VideoGenerationModelId,
  VideoProviderLine,
  VideoResolution,
} from "@/features/creation/video-generation-options";

const POLL_INTERVAL_MS = 5_000;

export type LocalVideoPreviewAvailability = "checking" | "available" | "unavailable";

export type LocalVideoPreviewJob = Readonly<{
  taskId: string;
  status: string;
  progress: number | null;
  resultUrl: string | null;
  error: string | null;
  terminal: boolean;
}>;

export type LocalVideoPreviewInput = Readonly<{
  prompt: string;
  generationMode: VideoGenerationMode;
  modelId: VideoGenerationModelId;
  line: VideoProviderLine;
  ratio: VideoAspectRatio;
  resolution: VideoResolution;
  duration: number;
  generateAudio: boolean;
  references: readonly [];
}>;

type PreviewErrorEnvelope = Readonly<{ error?: Readonly<{ message?: string }> }>;

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

async function parsePreviewResponse(response: Response) {
  const payload = await response.json() as LocalVideoPreviewJob | PreviewErrorEnvelope;
  if (!response.ok) {
    throw new Error((payload as PreviewErrorEnvelope).error?.message ?? "本地视频实测接口暂时不可用。");
  }
  return payload as LocalVideoPreviewJob;
}

export async function readLocalVideoPreviewAvailability() {
  try {
    const response = await fetch("/api/video/preview", { cache: "no-store" });
    if (!response.ok) return false;
    const payload = await response.json() as { available?: boolean };
    return payload.available === true;
  } catch {
    return false;
  }
}

export async function submitLocalVideoPreview(
  input: LocalVideoPreviewInput,
  observer: (job: LocalVideoPreviewJob) => void,
) {
  const job = await parsePreviewResponse(await fetch("/api/video/preview", {
    body: JSON.stringify(input),
    headers: { "content-type": "application/json" },
    method: "POST",
  }));
  observer(job);

  return pollLocalVideoPreview(job, observer);
}

export async function pollLocalVideoPreview(
  initialJob: LocalVideoPreviewJob,
  observer: (job: LocalVideoPreviewJob) => void,
) {
  let job = initialJob;

  while (!job.terminal) {
    await wait(POLL_INTERVAL_MS);
    job = await parsePreviewResponse(await fetch(
      `/api/video/preview?taskId=${encodeURIComponent(job.taskId)}`,
      { cache: "no-store" },
    ));
    observer(job);
  }
  return job;
}
