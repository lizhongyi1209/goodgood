import {
  NormalizedProviderError,
  createProviderTask,
  downloadProviderOutput,
  pollProviderTask,
} from "./provider.mjs";
import { readPrivateObject, signAssetRead } from "./storage.mjs";
import { BANANA_LINES, isBananaModel, isBananaLineReady, isValidImageLine } from "../../shared/contracts/banana-lines.mjs";
import {
  createUsGatewayAdapter,
  getUsGatewayRoute,
} from "./us-gateway-adapter.mjs";

export const MOCK_PROVIDER_ROUTE = Object.freeze({
  provider: "goodgood-mock",
  providerModel: "nano-banana-2-mock-v1",
  routeVersion: "m3-mock-v1",
});

export const MOCK_GPT_IMAGE_2_ROUTE = Object.freeze({
  provider: "goodgood-mock",
  providerModel: "gpt-image-2-mock-v1",
  routeVersion: "m3-mock-gpt-image-2-v1",
});

export const MOCK_GPT_IMAGE_25_SUNBURST_ROUTE = Object.freeze({
  provider: "goodgood-mock",
  providerModel: "gpt-image-2.5-sunburst-mock-v1",
  routeVersion: "m3-mock-gpt-image-2.5-sunburst-v1",
});

export const MOCK_GPT_IMAGE_25_FLARE_ROUTE = Object.freeze({
  provider: "goodgood-mock",
  providerModel: "gpt-image-2.5-flare-mock-v1",
  routeVersion: "m3-mock-gpt-image-2.5-flare-v1",
});

const MOCK_PROVIDER_ROUTES = Object.freeze({
  "nano-banana-2": MOCK_PROVIDER_ROUTE,
  "gpt-image-2.5-sunburst": MOCK_GPT_IMAGE_25_SUNBURST_ROUTE,
  "gpt-image-2": MOCK_GPT_IMAGE_2_ROUTE,
  "gpt-image-2.5-flare": MOCK_GPT_IMAGE_25_FLARE_ROUTE,
});
const MOCK_BANANA_LINE_ROUTES = Object.freeze(Object.fromEntries(
  ["nano-banana-2", "nano-banana-pro"].map((modelId) => [modelId, Object.freeze(Object.fromEntries(
    BANANA_LINES.map(({ id }) => [id, modelId === "nano-banana-2" && id === "special" ? MOCK_PROVIDER_ROUTE : Object.freeze({
      provider: "goodgood-mock", productModelId: modelId, imageLine: id,
      providerModel: `${modelId}-${id}-mock-v1`, routeVersion: `m3-mock-${modelId}-${id}-v1`,
    })]),
  ))]),
));

export function generationProviderRouteForModel(providerKind, modelId, imageLine) {
  if (!isValidImageLine(modelId, imageLine)) throw new Error("Invalid image line.");
  if (isBananaModel(modelId) && !isBananaLineReady(modelId, imageLine)) throw new Error("Image line is not connected.");
  if (providerKind === "o1key") {
    const route = getUsGatewayRoute(modelId, imageLine);
    if (route) return route;
  } else if (providerKind === "mock") {
    const route = isBananaModel(modelId) ? MOCK_BANANA_LINE_ROUTES[modelId]?.[imageLine ?? "special"] : MOCK_PROVIDER_ROUTES[modelId];
    if (route) return route;
  }
  throw new Error(`No ${providerKind} generation route for ${modelId}.`);
}

function assertAttemptRoute(attempt, route) {
  if (
    attempt.provider !== route.provider ||
    attempt.provider_model !== route.providerModel ||
    attempt.route_version !== route.routeVersion
  ) {
    throw new Error("Active provider attempt does not match this worker configuration.");
  }
}

function throwTerminalFailure(task) {
  const failure = task.failures[0];
  throw new NormalizedProviderError({
    code: failure?.code ?? "INTERNAL_ERROR",
    message: failure?.message ?? "生成服务未能完成任务。输入内容已保留，请重试。",
    retryable: failure?.retryable !== false,
  });
}

function validateOutputCount(outputs, expectedOutputCount) {
  if (
    !Array.isArray(outputs) ||
    !Number.isInteger(expectedOutputCount) ||
    outputs.length !== expectedOutputCount
  ) {
    throw new NormalizedProviderError({
      code: "INTERNAL_ERROR",
      message: "生成服务返回的图片数量与请求不一致。输入内容已保留，请重试。",
    });
  }
  return outputs;
}

const O1KEY_TASK_SET_PREFIX = "gg-o1key-set-v1:";

function taskSetError() {
  return new NormalizedProviderError({
    code: "INTERNAL_ERROR",
    message: "生成服务任务记录无法识别。输入内容已保留，请重试。",
  });
}

function submissionUnknownError() {
  return new NormalizedProviderError({
    code: "SUBMISSION_UNKNOWN",
    message:
      "生成请求可能已被上游受理。系统不会自动重复提交；再次生成会创建新的计费任务。",
    retryable: true,
  });
}

export function encodeO1KeyTaskSet(
  taskIds,
  { submissionStarted = false } = {},
) {
  if (
    !Array.isArray(taskIds) ||
    !taskIds.length ||
    taskIds.some((taskId) => typeof taskId !== "string" || !taskId) ||
    new Set(taskIds).size !== taskIds.length ||
    typeof submissionStarted !== "boolean"
  ) {
    throw taskSetError();
  }
  return `${O1KEY_TASK_SET_PREFIX}${Buffer.from(
    JSON.stringify({ submissionStarted, taskIds }),
    "utf8",
  ).toString("base64url")}`;
}

function decodeO1KeyTaskState(
  taskId,
  { expectedTaskCount, legacySingle = false },
) {
  if (![1, 2, 4].includes(expectedTaskCount)) throw taskSetError();
  if (taskId === null || taskId === undefined || taskId === "") {
    return { submissionStarted: false, taskIds: [] };
  }
  if (typeof taskId !== "string") throw taskSetError();
  if (!taskId.startsWith(O1KEY_TASK_SET_PREFIX)) {
    if (legacySingle && expectedTaskCount === 1) {
      return { submissionStarted: false, taskIds: [taskId] };
    }
    throw taskSetError();
  }
  let payload;
  try {
    payload = JSON.parse(
      Buffer.from(taskId.slice(O1KEY_TASK_SET_PREFIX.length), "base64url").toString(
        "utf8",
      ),
    );
  } catch {
    throw taskSetError();
  }
  const taskIds = Array.isArray(payload) ? payload : payload?.taskIds;
  const submissionStarted = Array.isArray(payload)
    ? false
    : payload?.submissionStarted;
  if (
    !Array.isArray(taskIds) ||
    !taskIds.length ||
    taskIds.length > expectedTaskCount ||
    taskIds.some((value) => typeof value !== "string" || !value) ||
    new Set(taskIds).size !== taskIds.length ||
    typeof submissionStarted !== "boolean"
  ) {
    throw taskSetError();
  }
  return { submissionStarted, taskIds };
}

export function decodeO1KeyTaskSet(
  taskId,
  options,
) {
  return decodeO1KeyTaskState(taskId, options).taskIds;
}

function expectedO1KeyTaskCount(route, job) {
  return isBananaModel(route.productModelId) ? job.requested_count : 1;
}

function o1keyTaskState(route, job, taskId) {
  const expectedTaskCount = expectedO1KeyTaskCount(route, job);
  if (taskId === null || taskId === undefined || taskId === "") {
    return { submissionStarted: false, taskIds: [] };
  }
  return decodeO1KeyTaskState(taskId, {
    expectedTaskCount,
    legacySingle: expectedTaskCount === 1,
  });
}

function o1keyTaskToken(
  route,
  job,
  taskIds,
  { submissionStarted = false } = {},
) {
  return expectedO1KeyTaskCount(route, job) === 1
    ? taskIds[0]
    : encodeO1KeyTaskSet(taskIds, { submissionStarted });
}

export function createGenerationProvider({
  config,
  publicStorage,
  route = generationProviderRouteForModel(config.provider.kind, "nano-banana-2"),
  storage,
}) {
  if (config.provider.kind === "o1key") {
    if (getUsGatewayRoute(route.productModelId, route.imageLine) !== route) {
      throw new Error("The selected route does not match the O1Key provider.");
    }
    const adapter = createUsGatewayAdapter({
      allowInsecureLoopback: config.provider.allowInsecureLoopback,
      apiKey: config.provider.apiKey,
      baseUrl: config.provider.baseUrl,
      requestTimeoutMs: config.provider.requestTimeoutMs,
      route,
    });
    return Object.freeze({
      route,
      submissionPolicy: "task-id-required",

      assertAttempt(attempt) {
        assertAttemptRoute(attempt, route);
      },

      isTaskSubmissionComplete({ job, taskId }) {
        const taskState = o1keyTaskState(route, job, taskId);
        return (
          !taskState.submissionStarted &&
          taskState.taskIds.length ===
          expectedO1KeyTaskCount(route, job)
        );
      },

      async createTask({
        job,
        onSubmissionStart = async () => {},
        onTaskCreated = async () => {},
        taskId = null,
      }) {
        const taskState = o1keyTaskState(route, job, taskId);
        if (taskState.submissionStarted) throw submissionUnknownError();
        const taskIds = [...taskState.taskIds];
        const expectedTaskCount = expectedO1KeyTaskCount(route, job);
        const references = [];
        for (const reference of job.reference_snapshot ?? []) {
          const object = await readPrivateObject({
            bucket: config.objectStorage.bucket,
            key: reference.objectKey,
            maxBytes: 20 * 1024 * 1024,
            storage,
          });
          references.push({
            bytes: object.bytes,
            mimeType: object.contentType,
            name: reference.name,
          });
        }
        const uploadedReferences = await adapter.prepareReferences(references);
        while (taskIds.length < expectedTaskCount) {
          const submissionToken = taskIds.length === 0
            ? null
            : o1keyTaskToken(route, job, taskIds, {
                submissionStarted: true,
              });
          const task = await adapter.submitPrepared({
            job,
            onSubmissionStart: () => onSubmissionStart(submissionToken),
            uploadedReferences,
          });
          taskIds.push(task.taskId);
          await onTaskCreated(o1keyTaskToken(route, job, taskIds));
        }
        return o1keyTaskToken(route, job, taskIds);
      },

      downloadOutput(output) {
        return downloadProviderOutput(output, {
          maxAttempts: 5,
          retryDelayMs: 1_000,
        });
      },

      async pollTask({ expectedOutputCount, onRefining, taskId }) {
        let refiningNotified = false;
        const taskState = o1keyTaskState(route, {
          requested_count: expectedOutputCount,
        }, taskId);
        if (taskState.submissionStarted) throw submissionUnknownError();
        const { taskIds } = taskState;
        const expectedTaskCount = isBananaModel(route.productModelId)
          ? expectedOutputCount
          : 1;
        if (taskIds.length !== expectedTaskCount) throw taskSetError();
        const tasks = await Promise.all(taskIds.map((providerTaskId) =>
          adapter.waitForTerminal({
            onUpdate: async (update) => {
              if (!refiningNotified && update.state === "running") {
                refiningNotified = true;
                await onRefining();
              }
            },
            expectedOutputCount:
              isBananaModel(route.productModelId) ? 1 : expectedOutputCount,
            pollIntervalMs: config.provider.pollIntervalMs,
            taskId: providerTaskId,
            timeoutMs: config.provider.timeoutMs,
          })
        ));
        for (const task of tasks) {
          if (task.state === "failed") throwTerminalFailure(task);
        }
        return validateOutputCount(
          tasks.flatMap((task) => task.outputs),
          expectedOutputCount,
        );
      },
    });
  }

  if (![...Object.values(MOCK_PROVIDER_ROUTES), ...Object.values(MOCK_BANANA_LINE_ROUTES).flatMap(Object.values)].includes(route)) {
    throw new Error("The selected route does not match the mock provider.");
  }

  return Object.freeze({
    route,
    submissionPolicy: "idempotent",

    assertAttempt(attempt) {
      assertAttemptRoute(attempt, route);
    },

    isTaskSubmissionComplete({ taskId }) {
      return typeof taskId === "string" && taskId.length > 0;
    },

    async createTask({ attempt, job }) {
      const references = await Promise.all(
        (job.reference_snapshot ?? []).map(async (reference) => ({
          id: reference.id,
          ordinal: reference.ordinal,
          url: await signAssetRead({
            bucket: config.objectStorage.bucket,
            key: reference.objectKey,
            publicStorage,
          }),
        })),
      );
      return createProviderTask({
        attempt,
        config: config.provider,
        job,
        references,
      });
    },

    downloadOutput: downloadProviderOutput,

    async pollTask({ expectedOutputCount, onRefining, taskId }) {
      const outputs = await pollProviderTask({
        config: config.provider,
        onRefining,
        taskId,
      });
      return validateOutputCount(outputs, expectedOutputCount);
    },
  });
}
