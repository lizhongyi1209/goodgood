import { createHash } from "node:crypto";
import { VideoGenerationError } from "./errors.mjs";
// Platform points are independent of the reseller's settled monetary cost.
export function quoteVideoCredits(input, metadata = [], environment = process.env) {
  let rates;
  try { rates = JSON.parse(environment.GOODGOOD_VIDEO_CREDIT_RATES_JSON ?? "{}"); } catch { throw new VideoGenerationError("VIDEO_PRICING_UNAVAILABLE", "视频价格配置暂不可用。", 503); }
  const perSecond = rates?.[input.modelId]?.[input.resolution];
  if (!Number.isSafeInteger(perSecond) || perSecond <= 0 || perSecond > 1_000_000) throw new VideoGenerationError("VIDEO_UNPRICED", "当前视频规格尚未定价。", 409);
  const seconds = input.type === "motion_control" ? Math.ceil(metadata.find((item) => item.kind === "video")?.durationSeconds ?? 0) : input.duration;
  if (!Number.isSafeInteger(seconds) || seconds < 3 || seconds > 30) throw new VideoGenerationError("VIDEO_DURATION_INVALID", "请重新选择有效的视频素材。", 409);
  const credits = perSecond * seconds;
  return { credits, perSecond, seconds, version: createHash("sha256").update(JSON.stringify([input.modelId, input.resolution, perSecond])).digest("hex").slice(0, 16) };
}
