import { canvasImageJobIsActive } from "./canvas-image-prompt-batch.mjs";

/** One identity per requested picture. Legacy multi-picture jobs keep their positions. */
export function canvasGeneratorSlots(data) {
  if (data.slots) return data.slots;
  return (data.jobs ?? (data.job ? [data.job] : [])).flatMap((job) => {
    const count = job.input.modelId === "seedream-5.0-pro" ? 1 : Math.max(job.input.count, job.outputs.length, 1);
    return Array.from({ length: count }, (_, outputIndex) => ({
      id: `legacy_${job.id}_${outputIndex}`, job, outputIndex,
    }));
  });
}

/** Native Seedream layers are outputs of one paid slot, never extra requests. */
export function canvasGeneratorResultSlots(data) {
  return canvasGeneratorSlots(data).flatMap((slot, slotIndex) => {
    const outputs = slot.job.state === "succeeded" ? slot.job.outputs : [];
    if (slot.job.input.modelId === "seedream-5.0-pro" && outputs.length) {
      return outputs.map((output, index) => ({ ...slot, slotIndex, key: `${slot.id}:layer:${index}`, output }));
    }
    return [{ ...slot, slotIndex, key: slot.id, output: outputs[slot.outputIndex ?? 0] }];
  });
}

export function canvasImageSlotCanRetry(slot) {
  return !canvasImageJobIsActive(slot.job) && ["failed", "cancelled"].includes(slot.job.state) &&
    Boolean(slot.job.error?.retryable || slot.job.error?.code === "SUBMISSION_UNKNOWN" && slot.requestKey);
}

export function canvasImageSlotFrozenInput(input) {
  // URLs and runtime metadata never enter the cloud document.
  const { composerPrompt: _composerPrompt, catalogModelName: _catalogModelName, ...snapshot } = input;
  return Object.freeze({ ...snapshot, routingPolicy: "canvas-image-v1", projectId: null,
    references: Object.freeze(input.references.map(({ id, name }) => Object.freeze({
    id, name, status: "ready", url: "",
  }))) });
}

export function recoverCanvasImageSlot(slot) {
  if (!slot.job.id.startsWith("pending_") || !canvasImageJobIsActive(slot.job)) return slot;
  return { ...slot, job: { ...slot.job, state: "failed", error: {
    code: "SUBMISSION_UNKNOWN", title: "生成状态未确认",
    message: "请求状态未确认。点击重试将查询同一请求，不会重复提交已接受的任务。",
    retryable: Boolean(slot.requestKey),
  } } };
}
