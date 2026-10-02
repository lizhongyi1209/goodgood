/** Canvas-only separators; creation/video keep their existing prompt contract. */
export function parseCanvasImagePrompts(prompt) {
  const segments = prompt.replace(/\r\n?/g, "\n").split(/^[^\S\r\n]*(?:---|———|－－－)[^\S\r\n]*$/m);
  return Object.freeze({
    hasSeparator: segments.length > 1,
    prompts: Object.freeze(segments.map((segment) => segment.trim()).filter(Boolean)),
  });
}

export function canvasGeneratorJobs(data) {
  return data.jobs ?? (data.job ? [data.job] : []);
}

export function canvasGeneratorOutputs(data) {
  return canvasGeneratorJobs(data).flatMap((job) => job.state === "succeeded" ? job.outputs : []);
}

export function canvasImageJobIsActive(job) {
  return ["queued", "running", "refining"].includes(job.state);
}

export function canvasImageBatchCreditAmount(creditAmount, promptCount) {
  return (BigInt(creditAmount) * BigInt(promptCount)).toString();
}

/** A reload cannot tell whether a POST with no durable ID was accepted. */
export function recoverCanvasImageJob(job) {
  return job.id.startsWith("pending_") && canvasImageJobIsActive(job)
    ? { ...job, state: "failed", error: {
      code: "SUBMISSION_UNKNOWN", title: "生成状态未确认",
      message: "请求可能仍在处理，请先检查资产库，再决定是否重新生成。", retryable: false,
    } } : job;
}
