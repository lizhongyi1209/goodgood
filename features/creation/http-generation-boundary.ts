import type {
  GenerationJobObserver,
  GenerationService,
} from "@/features/creation/generation-boundary";
import type {
  GenerationError,
  GenerationInputSnapshot,
  GenerationJob,
} from "@/shared/contracts/generation";
import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";

const POLL_INTERVAL_MS = 450;

type GenerationApiErrorEnvelope = Readonly<{
  error?: Readonly<{
    code?: string;
    message?: string;
    retryable?: boolean;
  }>;
}>;

export type HttpGenerationBoundary = Readonly<{
  retry: (
    failedJob: GenerationJob,
    observer?: GenerationJobObserver,
  ) => Promise<GenerationJob>;
  service: GenerationService;
}>;

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

const createIdempotencyKey = () =>
  `web_${globalThis.crypto.randomUUID()}`;

function generationRequestPayload(input: GenerationInputSnapshot) {
  return {
    ...input,
    references: input.references.map((reference) => ({ id: reference.id })),
  };
}

function fallbackError(message?: string): GenerationError {
  return Object.freeze({
    code: "INTERNAL_ERROR",
    message: message ?? "生成服务暂时不可用。输入内容已保留，请稍后重试。",
    retryable: true,
    title: "本次生成未完成",
  });
}

function failedLocalJob(
  id: string,
  input: GenerationInputSnapshot,
  message?: string,
): GenerationJob {
  const timestamp = new Date().toISOString();
  return Object.freeze({
    createdAt: timestamp,
    error: fallbackError(message),
    id,
    input,
    outputs: Object.freeze([]),
    state: "failed",
    updatedAt: timestamp,
  });
}

async function parseJob(response: Response) {
  const payload = (await response.json()) as GenerationJob | GenerationApiErrorEnvelope;
  if (!response.ok) {
    const errorPayload = payload as GenerationApiErrorEnvelope;
    throw new Error(errorPayload.error?.message ?? "生成服务暂时不可用。");
  }
  return payload as GenerationJob;
}

async function pollJob(job: GenerationJob, observer?: GenerationJobObserver) {
  let current = job;
  while (
    current.state === "queued" ||
    current.state === "running" ||
    current.state === "refining"
  ) {
    await wait(POLL_INTERVAL_MS);
    try {
      current = await parseJob(
        await goodGoodApiFetch(`/api/generations/${encodeURIComponent(current.id)}`, {
          cache: "no-store",
        }),
      );
      observer?.(current);
    } catch {
      // The durable server job keeps running while a transient poll is retried.
      await wait(POLL_INTERVAL_MS);
    }
  }
  return current;
}

async function postAndPoll({
  endpoint,
  input,
  observer,
}: Readonly<{
  endpoint: string;
  input: GenerationInputSnapshot;
  observer?: GenerationJobObserver;
}>) {
  const localId = `pending_${globalThis.crypto.randomUUID()}`;
  const timestamp = new Date().toISOString();
  observer?.(
    Object.freeze({
      createdAt: timestamp,
      error: null,
      id: localId,
      input,
      outputs: Object.freeze([]),
      state: "queued",
      updatedAt: timestamp,
    }),
  );

  try {
    const response = await goodGoodApiFetch(endpoint, {
      body:
        endpoint === "/api/generations"
          ? JSON.stringify(generationRequestPayload(input))
          : undefined,
      headers: {
        "content-type": "application/json",
        "idempotency-key": createIdempotencyKey(),
      },
      method: "POST",
    });
    const submitted = await parseJob(response);
    observer?.(submitted);
    return pollJob(submitted, observer);
  } catch (error) {
    const failed = failedLocalJob(
      localId,
      input,
      error instanceof Error ? error.message : undefined,
    );
    observer?.(failed);
    return failed;
  }
}

export function createHttpGenerationBoundary(): HttpGenerationBoundary {
  return Object.freeze({
    retry(failedJob, observer) {
      return postAndPoll({
        endpoint: `/api/generations/${encodeURIComponent(failedJob.id)}/retry`,
        input: failedJob.input,
        observer,
      });
    },
    service: {
      submit(input, observer) {
        return postAndPoll({ endpoint: "/api/generations", input, observer });
      },
    },
  });
}
