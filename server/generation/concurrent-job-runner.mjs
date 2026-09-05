export function createConcurrentJobRunner({
  acknowledge,
  observe = () => {},
  run,
}) {
  if (typeof acknowledge !== "function" || typeof run !== "function") {
    throw new Error("Concurrent job runner requires run and acknowledge functions.");
  }

  let accepting = true;
  const activeTasks = new Set();

  function emit(event) {
    try {
      observe(event);
    } catch {
      // Observability must never change job execution or acknowledgement.
    }
  }

  async function execute(jobId) {
    try {
      await run(jobId);
    } catch (error) {
      emit({
        event: "worker.job_crashed",
        jobId,
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      try {
        await acknowledge(jobId);
      } catch (error) {
        emit({
          event: "worker.queue_ack_failed",
          jobId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  function start(jobId) {
    if (!accepting) return false;
    let task;
    task = execute(jobId).finally(() => {
      activeTasks.delete(task);
      emit({
        activeJobCount: activeTasks.size,
        event: "worker.job_settled",
        jobId,
      });
    });
    activeTasks.add(task);
    emit({
      activeJobCount: activeTasks.size,
      event: "worker.job_started",
      jobId,
    });
    return true;
  }

  return Object.freeze({
    activeJobCount: () => activeTasks.size,
    drain: async () => {
      accepting = false;
      await Promise.allSettled([...activeTasks]);
    },
    start,
    stopAccepting: () => {
      accepting = false;
    },
  });
}
