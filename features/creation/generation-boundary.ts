import {
  transitionGenerationJob,
} from "@/features/creation/generation-job";
import type {
  GenerationError,
  GenerationInputSnapshot,
  GenerationJob,
  GenerationOutput,
} from "@/shared/contracts/generation";

export type GenerationProviderPhase = "running" | "refining";

export type GenerationProviderLifecycle = Readonly<{
  onPhase: (phase: GenerationProviderPhase) => Promise<void>;
}>;

export interface GenerationProvider {
  generate(
    input: GenerationInputSnapshot,
    lifecycle: GenerationProviderLifecycle,
  ): Promise<readonly GenerationOutput[]>;
}

export interface GenerationRepository {
  create(job: GenerationJob): Promise<void>;
  save(job: GenerationJob): Promise<void>;
  findById(jobId: string): Promise<GenerationJob | null>;
}

export type GenerationJobObserver = (job: GenerationJob) => void;

export interface GenerationService {
  submit(
    input: GenerationInputSnapshot,
    observer?: GenerationJobObserver,
  ): Promise<GenerationJob>;
}

export type GenerationServiceDependencies = Readonly<{
  repository: GenerationRepository;
  provider: GenerationProvider;
  createJobId: () => string;
  now: () => Date;
}>;

export class GenerationProviderError extends Error {
  readonly generationError: GenerationError;

  constructor(generationError: GenerationError) {
    super(generationError.code);
    this.name = "GenerationProviderError";
    this.generationError = generationError;
  }
}

const UNKNOWN_GENERATION_ERROR: GenerationError = Object.freeze({
  code: "INTERNAL_ERROR",
  title: "本次生成未完成",
  message: "生成服务暂时不可用。输入内容已保留，请稍后重试。",
  retryable: true,
});

function normalizeGenerationError(error: unknown): GenerationError {
  if (error instanceof GenerationProviderError) return error.generationError;
  return UNKNOWN_GENERATION_ERROR;
}

export function createGenerationService(
  dependencies: GenerationServiceDependencies,
): GenerationService {
  const { repository, provider, createJobId, now } = dependencies;

  return {
    async submit(input, observer) {
      const timestamp = now().toISOString();
      let currentJob: GenerationJob = Object.freeze({
        id: createJobId(),
        input,
        state: "queued",
        outputs: Object.freeze([]),
        error: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      await repository.create(currentJob);
      observer?.(currentJob);

      const advance = async (phase: GenerationProviderPhase) => {
        currentJob = transitionGenerationJob(
          currentJob,
          phase,
          now().toISOString(),
        );
        await repository.save(currentJob);
        observer?.(currentJob);
      };

      try {
        const outputs = await provider.generate(input, { onPhase: advance });
        currentJob = transitionGenerationJob(
          currentJob,
          "succeeded",
          now().toISOString(),
          { outputs, error: null },
        );
      } catch (error) {
        currentJob = transitionGenerationJob(
          currentJob,
          "failed",
          now().toISOString(),
          { error: normalizeGenerationError(error) },
        );
      }

      await repository.save(currentJob);
      observer?.(currentJob);
      return currentJob;
    },
  };
}
