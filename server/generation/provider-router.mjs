import {
  NormalizedProviderError,
  createProviderTask,
  downloadProviderOutput,
  pollProviderTask,
} from "./provider.mjs";
import { readPrivateObject, signAssetRead } from "./storage.mjs";
import {
  US_GATEWAY_MVP_ROUTE,
  createUsGatewayAdapter,
} from "./us-gateway-adapter.mjs";

export const MOCK_PROVIDER_ROUTE = Object.freeze({
  provider: "goodgood-mock",
  providerModel: "nano-banana-2-mock-v1",
  routeVersion: "m3-mock-v1",
});

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

export function createGenerationProvider({ config, publicStorage, storage }) {
  if (config.provider.kind === "o1key") {
    const adapter = createUsGatewayAdapter({
      allowInsecureLoopback: config.provider.allowInsecureLoopback,
      apiKey: config.provider.apiKey,
      baseUrl: config.provider.baseUrl,
      requestTimeoutMs: config.provider.requestTimeoutMs,
    });
    return Object.freeze({
      route: US_GATEWAY_MVP_ROUTE,
      submissionPolicy: "task-id-required",

      assertAttempt(attempt) {
        assertAttemptRoute(attempt, US_GATEWAY_MVP_ROUTE);
      },

      async createTask({ job, onSubmissionStart }) {
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
        const task = await adapter.submit({ job, onSubmissionStart, references });
        return task.taskId;
      },

      downloadOutput(output) {
        return downloadProviderOutput(output, {
          maxAttempts: 5,
          retryDelayMs: 1_000,
        });
      },

      async pollTask({ onRefining, taskId }) {
        let refiningNotified = false;
        const task = await adapter.waitForTerminal({
          onUpdate: async (update) => {
            if (!refiningNotified && update.state === "running") {
              refiningNotified = true;
              await onRefining();
            }
          },
          pollIntervalMs: config.provider.pollIntervalMs,
          taskId,
          timeoutMs: config.provider.timeoutMs,
        });
        if (task.state === "failed") throwTerminalFailure(task);
        return task.outputs[0];
      },
    });
  }

  return Object.freeze({
    route: MOCK_PROVIDER_ROUTE,
    submissionPolicy: "idempotent",

    assertAttempt(attempt) {
      assertAttemptRoute(attempt, MOCK_PROVIDER_ROUTE);
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

    pollTask({ onRefining, taskId }) {
      return pollProviderTask({
        config: config.provider,
        onRefining,
        taskId,
      });
    },
  });
}
