import { createRuntimeHealthServer } from "./runtime-health.mjs";
import { parseRuntimePort } from "./port.mjs";
import {
  closeGenerationResources,
  connectGenerationQueue,
  getGenerationResources,
  prepareObjectStorage,
  probeGenerationResources,
} from "../generation/resources.mjs";
import {
  acknowledgeQueuedJob,
  dispatchPendingJobs,
  reconcileRecoverableJobs,
  takeQueuedJob,
} from "../generation/queue.mjs";
import {
  createWorkerId,
  processGenerationJob,
} from "../generation/worker-service.mjs";
import { createConcurrentJobRunner } from "../generation/concurrent-job-runner.mjs";

const host = process.env.WORKER_HEALTH_HOST ?? "0.0.0.0";
const port = parseRuntimePort(
  process.env.WORKER_HEALTH_PORT,
  3001,
  "WORKER_HEALTH_PORT",
);
const health = createRuntimeHealthServer({
  host,
  port,
  service: "goodgood-worker",
});
const workerId = createWorkerId();
let stopping = false;

await health.listen();

const resources = await getGenerationResources();
await connectGenerationQueue(resources);
await prepareObjectStorage(resources);
await reconcileRecoverableJobs(resources.pool);
await dispatchPendingJobs(resources.pool, resources.redis);
const checks = await probeGenerationResources(resources);
health.markReady(checks);

console.log(
  JSON.stringify({
    event: "worker.ready",
    healthHost: host,
    healthPort: port,
    revision: process.env.GOODGOOD_REVISION ?? "development",
    service: "goodgood-worker",
    workerId,
  }),
);

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const jobs = createConcurrentJobRunner({
  acknowledge: (jobId) => acknowledgeQueuedJob(resources.redis, jobId),
  observe: (entry) => {
    const log = entry.event.endsWith("failed") || entry.event.endsWith("crashed")
      ? console.error
      : console.log;
    log(JSON.stringify({ ...entry, workerId }));
  },
  run: async (jobId) => {
    const result = await processGenerationJob(resources, { jobId, workerId });
    console.log(
      JSON.stringify({
        event: "worker.job_finished",
        jobId,
        outcome: result.outcome,
        code: result.code,
        customerCreditAmount: result.customerCreditAmount,
        customerCreditUnit: result.customerCreditUnit,
        durationMs: result.durationMs,
        stage: result.stage,
        ownerId: result.ownerId,
        provider: result.provider,
        providerLatencyMs: result.providerLatencyMs,
        providerTaskId: result.providerTaskId,
        routeVersion: result.routeVersion,
        workerId,
      }),
    );
  },
});

const loop = (async () => {
  let lastReconciliation = 0;
  while (!stopping) {
    try {
      if (Date.now() - lastReconciliation > 1_000) {
        await reconcileRecoverableJobs(resources.pool);
        await dispatchPendingJobs(resources.pool, resources.redis);
        lastReconciliation = Date.now();
      }
      const jobId = await takeQueuedJob(resources.redis);
      if (!jobId) {
        await delay(100);
        continue;
      }
      jobs.start(jobId);
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "worker.loop_dependency_failed",
          message: error instanceof Error ? error.message : String(error),
          workerId,
        }),
      );
      await delay(500);
    }
  }
})();

async function stop(signal) {
  if (stopping) return;
  stopping = true;
  health.markNotReady("stopping");
  console.log(
    JSON.stringify({
      activeJobCount: jobs.activeJobCount(),
      event: "worker.stopping",
      service: "goodgood-worker",
      signal,
    }),
  );

  await loop;
  jobs.stopAccepting();
  await jobs.drain();
  await closeGenerationResources();
  await health.close();
}

process.once("SIGINT", () => void stop("SIGINT"));
process.once("SIGTERM", () => void stop("SIGTERM"));
