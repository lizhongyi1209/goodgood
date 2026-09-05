import { readFile, statfs } from "node:fs/promises";
import { GenerationRequestError } from "../generation/api.mjs";

export const HOST_RESOURCE_THRESHOLDS = Object.freeze({
  availableMemoryFloorBytes: 500 * 1024 * 1024,
  rootDiskUsageCeilingPercent: 80,
});

export function parseMemAvailable(meminfo) {
  const match = /^MemAvailable:\s+(\d+)\s+kB$/m.exec(meminfo);
  if (!match) throw new Error("/proc/meminfo does not report MemAvailable.");
  return Number.parseInt(match[1], 10) * 1024;
}

export function rootDiskUsagePercent(filesystem) {
  const blocks = Number(filesystem.blocks);
  const availableBlocks = Number(filesystem.bavail);
  if (
    !Number.isFinite(blocks) ||
    blocks <= 0 ||
    !Number.isFinite(availableBlocks) ||
    availableBlocks < 0 ||
    availableBlocks > blocks
  ) {
    throw new Error("Root filesystem statistics are invalid.");
  }
  return ((blocks - availableBlocks) / blocks) * 100;
}

export async function probeHostResources({
  readMeminfo = () => readFile("/proc/meminfo", "utf8"),
  readRootFilesystem = () => statfs("/", { bigint: true }),
} = {}) {
  const [meminfo, filesystem] = await Promise.all([
    readMeminfo(),
    readRootFilesystem(),
  ]);
  return Object.freeze({
    availableMemoryBytes: parseMemAvailable(meminfo),
    rootDiskUsagePercent: rootDiskUsagePercent(filesystem),
  });
}

export function evaluateHostResourceAdmission(
  snapshot,
  thresholds = HOST_RESOURCE_THRESHOLDS,
) {
  if (
    !Number.isFinite(snapshot?.availableMemoryBytes) ||
    snapshot.availableMemoryBytes < 0 ||
    !Number.isFinite(snapshot?.rootDiskUsagePercent) ||
    snapshot.rootDiskUsagePercent < 0 ||
    snapshot.rootDiskUsagePercent > 100
  ) {
    throw new Error("Host resource observation is invalid.");
  }
  const reasons = [];
  if (snapshot.availableMemoryBytes < thresholds.availableMemoryFloorBytes) {
    reasons.push("available-memory-below-floor");
  }
  if (
    snapshot.rootDiskUsagePercent >=
    thresholds.rootDiskUsageCeilingPercent
  ) {
    reasons.push("root-disk-at-or-above-ceiling");
  }
  return Object.freeze({
    allowed: reasons.length === 0,
    reasons: Object.freeze(reasons),
    snapshot: Object.freeze({ ...snapshot }),
  });
}

function protectionError() {
  return new GenerationRequestError(
    "GENERATION_CAPACITY_PROTECTED",
    "服务器正在保护生成资源，请稍后再试。你的输入内容已保留。",
    503,
    true,
  );
}

export function createHostGenerationAdmission({
  log = (entry) => console.error(JSON.stringify(entry)),
  probe = probeHostResources,
  thresholds = HOST_RESOURCE_THRESHOLDS,
} = {}) {
  let protection = null;

  const admitGeneration = async () => {
    if (protection) throw protectionError();

    let evaluation;
    try {
      evaluation = evaluateHostResourceAdmission(await probe(), thresholds);
    } catch (error) {
      protection = Object.freeze({
        activatedAt: new Date().toISOString(),
        reasons: Object.freeze(["resource-observation-unavailable"]),
      });
      log({
        event: "generation.resource_protection_activated",
        message: error instanceof Error ? error.message : String(error),
        reasons: protection.reasons,
        recovery: "operator-review-and-process-restart",
      });
      throw protectionError();
    }

    if (!evaluation.allowed) {
      protection = Object.freeze({
        activatedAt: new Date().toISOString(),
        availableMemoryBytes: evaluation.snapshot.availableMemoryBytes,
        reasons: evaluation.reasons,
        rootDiskUsagePercent: evaluation.snapshot.rootDiskUsagePercent,
      });
      log({
        event: "generation.resource_protection_activated",
        ...protection,
        recovery: "operator-review-and-process-restart",
      });
      throw protectionError();
    }
  };

  return Object.freeze({
    admitGeneration,
    protectionState: () => protection,
  });
}
