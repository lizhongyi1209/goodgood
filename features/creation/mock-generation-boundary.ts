import {
  createGenerationService,
  GenerationProviderError,
  type GenerationProvider,
  type GenerationRepository,
  type GenerationService,
} from "@/features/creation/generation-boundary";
import type {
  GenerationInputSnapshot,
  GenerationJob,
  GenerationOutput,
} from "@/shared/contracts/generation";

export const MOCK_GENERATION_OUTPUTS = [
  { id: "01", previewUrl: "/nano-fashion.png", previewPosition: "50% 48%" },
  { id: "02", previewUrl: "/nano-fashion.png", previewPosition: "72% 35%" },
  { id: "03", previewUrl: "/nano-fashion.png", previewPosition: "35% 68%" },
  { id: "04", previewUrl: "/nano-fashion.png", previewPosition: "62% 56%" },
] as const satisfies readonly GenerationOutput[];

const MOCK_TIMEOUT_ERROR = Object.freeze({
  code: "MODEL_TIMEOUT" as const,
  title: "本次生成未完成",
  message: "模型服务响应超时。提示词、参考图与生成参数均已保留，你可以直接重试。",
  retryable: true,
});

export type MockGenerationBoundaryOptions = Readonly<{
  wait?: (milliseconds: number) => Promise<void>;
  createJobId?: () => string;
  now?: () => Date;
}>;

export type MockGenerationBoundary = Readonly<{
  service: GenerationService;
  repository: GenerationRepository;
  provider: GenerationProvider;
}>;

export class InMemoryGenerationRepository implements GenerationRepository {
  readonly #jobs = new Map<string, GenerationJob>();

  async create(job: GenerationJob): Promise<void> {
    if (this.#jobs.has(job.id)) {
      throw new Error(`Generation job already exists: ${job.id}`);
    }
    this.#jobs.set(job.id, job);
  }

  async save(job: GenerationJob): Promise<void> {
    if (!this.#jobs.has(job.id)) {
      throw new Error(`Generation job does not exist: ${job.id}`);
    }
    this.#jobs.set(job.id, job);
  }

  async findById(jobId: string): Promise<GenerationJob | null> {
    return this.#jobs.get(jobId) ?? null;
  }
}

export class MockGenerationProvider implements GenerationProvider {
  readonly #failedInputs = new WeakSet<GenerationInputSnapshot>();
  readonly #wait: (milliseconds: number) => Promise<void>;

  constructor(wait: (milliseconds: number) => Promise<void>) {
    this.#wait = wait;
  }

  async generate(
    input: GenerationInputSnapshot,
    lifecycle: Parameters<GenerationProvider["generate"]>[1],
  ): Promise<readonly GenerationOutput[]> {
    await this.#wait(650);
    await lifecycle.onPhase("running");
    await this.#wait(1550);

    const shouldFail =
      /报错|error|失败/i.test(input.prompt) && !this.#failedInputs.has(input);
    if (shouldFail) {
      this.#failedInputs.add(input);
      throw new GenerationProviderError(MOCK_TIMEOUT_ERROR);
    }

    await lifecycle.onPhase("refining");
    await this.#wait(900);
    return Object.freeze(
      MOCK_GENERATION_OUTPUTS.slice(0, input.count).map((output) =>
        Object.freeze({ ...output }),
      ),
    );
  }
}

const defaultWait = (milliseconds: number) =>
  new Promise<void>((resolve) => globalThis.setTimeout(resolve, milliseconds));

const defaultCreateJobId = () => `GG-${String(Date.now()).slice(-6)}`;

export function createMockGenerationBoundary(
  options: MockGenerationBoundaryOptions = {},
): MockGenerationBoundary {
  const repository = new InMemoryGenerationRepository();
  const provider = new MockGenerationProvider(options.wait ?? defaultWait);
  const service = createGenerationService({
    repository,
    provider,
    createJobId: options.createJobId ?? defaultCreateJobId,
    now: options.now ?? (() => new Date()),
  });

  return Object.freeze({ service, repository, provider });
}
