import { createHash } from "node:crypto";
import { seedanceVideoCapabilities } from "../../shared/contracts/seedance-video-generation.mjs";
import { VideoGenerationError } from "./errors.mjs";
// Temporary platform points approved for GG-418; provider monetary usage is separate.
export const TEMPORARY_SEEDANCE_CREDIT_RATES = Object.freeze({
  "seedance-2-5": { "480p": 8, "720p": 16, "1080p": 24 },
  "seedance-2-0": { "480p": 6, "720p": 12, "1080p": 20, "4k": 32 },
  "seedance-2-0-fast": { "480p": 4, "720p": 8 },
  "seedance-2-0-mini": { "480p": 3, "720p": 6 },
});
export function quoteVideoCredits(input, metadata = [], environment = process.env) {
  let rates;
  try { rates = JSON.parse(environment.GOODGOOD_VIDEO_CREDIT_RATES_JSON ?? "{}"); } catch { throw new VideoGenerationError("VIDEO_PRICING_UNAVAILABLE", "视频价格配置暂不可用。", 503); }
  const cap = seedanceVideoCapabilities(input.modelId);
  const line = input.seedanceLine ?? "standard";
  const configured = rates?.[input.modelId];
  const perSecond = cap ? configured?.[line]?.[input.resolution] ?? configured?.[input.resolution] ?? TEMPORARY_SEEDANCE_CREDIT_RATES[input.modelId]?.[input.resolution] : configured?.[input.resolution];
  if (!Number.isSafeInteger(perSecond) || perSecond <= 0 || perSecond > 1_000_000) throw new VideoGenerationError("VIDEO_UNPRICED", "当前视频规格尚未定价。", 409);
  const automaticDuration = Boolean(cap && input.duration === -1);
  const seconds = input.type === "motion_control" ? Math.ceil(metadata.find((item) => item.kind === "video")?.durationSeconds ?? 0)
    : automaticDuration ? input.type === "video_edit" ? Math.ceil(metadata.find((item) => item.kind === "video")?.durationSeconds ?? cap.maxDuration) : cap.maxDuration : input.duration;
  if (!Number.isSafeInteger(seconds) || seconds < (cap ? 4 : 3) || seconds > (cap?.maxDuration ?? 30)) throw new VideoGenerationError("VIDEO_DURATION_INVALID", "请重新选择有效的视频素材。", 409);
  return { credits: perSecond * seconds, perSecond, seconds, ...(cap ? { automaticDuration, line } : {}),
    version: createHash("sha256").update(JSON.stringify(cap ? [input.modelId, line, input.resolution, perSecond] : [input.modelId, input.resolution, perSecond])).digest("hex").slice(0, 16) };
}
/** Frozen quote owns settlement; actual duration can only reduce its reservation. */
export function settledVideoCredits(quote, durationSeconds) {
  if (!quote.automaticDuration || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return quote.credits;
  const seconds = Math.max(4, Math.min(quote.seconds, Math.ceil(durationSeconds)));
  return Math.min(quote.credits, seconds * quote.perSecond);
}
