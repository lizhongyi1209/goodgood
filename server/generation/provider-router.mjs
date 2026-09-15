import {
  NormalizedProviderError,
  downloadProviderOutput,
} from "./provider.mjs";
import { readPrivateObject } from "./storage.mjs";
import { BANANA_LINES, supportsImageLines, isBananaModel, isBananaLineReady, isValidImageLine } from "../../shared/contracts/banana-lines.mjs";
import {
  US_GATEWAY_GPT_IMAGE_25_FLARE_ROUTE,
  US_GATEWAY_GPT_IMAGE_25_SUNBURST_ROUTE,
  US_GATEWAY_GPT_IMAGE_2_ROUTE,
  US_GATEWAY_NANO_BANANA_2_ROUTE,
  createUsGatewayAdapter,
  getUsGatewayRoute,
} from "./us-gateway-adapter.mjs";

// The local mock provider speaks the recorded O1Key image API contract, so a
// mock route is the O1Key route for the same model and line, relabelled with the
// local provider identity. That keeps the attempt ledger honest about which
// provider ran, while letting the local stack drive the real adapter instead of
// a parallel GoodGood-only request shape that production never uses. Routes are
// memoized: a route is re-resolved per job and downstream code compares routes
// by identity.
const LOCAL_ROUTE_CACHE = new Map();

function localRouteFor(route) {
  let local = LOCAL_ROUTE_CACHE.get(route);
  if (!local) {
    local = Object.freeze({
      ...route,
      provider: "goodgood-mock",
      routeVersion: route.routeVersion.replace(/^o1key-/, "mock-o1key-contract-"),
    });
    LOCAL_ROUTE_CACHE.set(route, local);
  }
  return local;
}

export const MOCK_PROVIDER_ROUTE = localRouteFor(US_GATEWAY_NANO_BANANA_2_ROUTE);

export const MOCK_GPT_IMAGE_2_ROUTE = localRouteFor(US_GATEWAY_GPT_IMAGE_2_ROUTE);

export const MOCK_GPT_IMAGE_25_SUNBURST_ROUTE = localRouteFor(
  US_GATEWAY_GPT_IMAGE_25_SUNBURST_ROUTE,
);

export const MOCK_GPT_IMAGE_25_FLARE_ROUTE = localRouteFor(
  US_GATEWAY_GPT_IMAGE_25_FLARE_ROUTE,
);

const MOCK_PROVIDER_ROUTES = Object.freeze({
  "nano-banana-2": MOCK_PROVIDER_ROUTE,
  "gpt-image-2.5-sunburst": MOCK_GPT_IMAGE_25_SUNBURST_ROUTE,
  "gpt-image-2": MOCK_GPT_IMAGE_2_ROUTE,
  "gpt-image-2.5-flare": MOCK_GPT_IMAGE_25_FLARE_ROUTE,
});
// Lines O1Key does not route still need a local-only route so the workspace can
// exercise an unconnected line without pretending it is a real provider route.
const MOCK_BANANA_LINE_ROUTES = Object.freeze(Object.fromEntries(
  ["nano-banana-2", "nano-banana-pro", "gpt-image-2", "gpt-image-2.5-sunburst", "gpt-image-2.5-flare"].map((modelId) => [modelId, Object.freeze(Object.fromEntries(
    BANANA_LINES.map(({ id }) => {
      const route = getUsGatewayRoute(modelId, id);
      return [id, route ? localRouteFor(route) : Object.freeze({
        provider: "goodgood-mock", productModelId: modelId, imageLine: id,
        providerModel: `${modelId}-${id}-mock-v1`, routeVersion: `m3-mock-${modelId}-${id}-v1`,
      })];
    }),
  ))]),
));

// A mock route carries the local provider identity but the O1Key request
// contract, so the adapter must be built from the O1Key route it mirrors. An
// O1Key route mirrors itself.
export function o1keyRouteForMockRoute(route) {
  if (route?.provider === "o1key") return route;
  if (route?.provider !== "goodgood-mock") return null;
  const mirrored = getUsGatewayRoute(route.productModelId, route.imageLine);
  if (!mirrored || mirrored.providerModel !== route.providerModel) return null;
  return mirrored;
}

export function generationProviderRouteForModel(providerKind, modelId, imageLine) {
  if (!isValidImageLine(modelId, imageLine)) throw new Error("Invalid image line.");
  if (supportsImageLines(modelId) && !isBananaLineReady(modelId, imageLine)) throw new Error("Image line is not connected.");
  const routed = getUsGatewayRoute(modelId, imageLine);
  if (routed) {
    return providerKind === "mock" ? localRouteFor(routed) : routed;
  }
  const fallback = MOCK_BANANA_LINE_ROUTES[modelId]?.[imageLine ?? "special"];
  if (providerKind === "mock" && fallback) return fallback;
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

// Called after every dispatch with the task ids persisted so far, so the token
// must describe what exists now. A job that expects one task keeps the bare task
// id; a job that needs more encodes the set from the first dispatch, so a crash
// after dispatch one is still recoverable as a partial task set. Keying off the
// expected total instead rejected the first dispatch of a four-output job.
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
  {
    // The local mock serves the recorded O1Key contract, so every provider kind
    // runs the same adapter. A mock route is the O1Key route for its model and
    // line under a local provider identity; the adapter is always built from the
    // route that owns the request contract.
    const adapterRoute = o1keyRouteForMockRoute(route);
    if (!adapterRoute) {
      throw new Error(
        `The selected route does not match the ${config.provider.kind} provider.`,
      );
    }
    const adapter = createUsGatewayAdapter({
      allowInsecureLoopback: config.provider.allowInsecureLoopback,
      apiKey: config.provider.apiKey,
      baseUrl: config.provider.baseUrl,
      requestTimeoutMs: config.provider.requestTimeoutMs,
      route: adapterRoute,
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
}
