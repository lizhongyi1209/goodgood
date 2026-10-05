import { VIDEO_GENERATION_COUNTS } from "../../shared/contracts/video-generation.mjs";

/** Allocate every frozen request before any network work; retries use count 1. */
export function canvasVideoGenerationBatchInputs(input, count, createId) {
  if (!VIDEO_GENERATION_COUNTS.includes(count)) throw new RangeError("生成数量请选择 1、2 或 4。");
  const ids = new Set();
  return Array.from({ length: count }, (_, index) => {
    const requestId = index === 0 ? input.requestId : createId();
    if (ids.has(requestId)) throw new Error("视频任务标识重复，请重新生成。");
    ids.add(requestId);
    const { count: _count, submissionError: _error, ...frozen } = structuredClone(input);
    return { ...frozen, requestId };
  });
}
