/** GG-370: pure reference combinations; never submits jobs or mutates inputs. */
export const CANVAS_BATCH_MAX_GROUPS = 5;
export const CANVAS_BATCH_REFERENCE_LIMIT = 10;
export const CANVAS_BATCH_PREVIEW_LIMIT = 6;

const REFERENCE_ERROR = "参考素材不可用，请重新连接或上传。";
const CAPACITY_ERROR = "每次生成最多使用 10 张参考图，请减少公共参考或素材组。";

function unique(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.reference.id)) return false;
    seen.add(item.reference.id);
    return true;
  });
}

function normalize(common, groups) {
  if (!Array.isArray(common) || !Array.isArray(groups) || groups.length > CANVAS_BATCH_MAX_GROUPS) {
    return { error: "最多添加 5 个批量素材组。" };
  }
  const ids = new Set();
  for (const group of groups) {
    if (!group || typeof group.id !== "string" || !group.id.trim() || ids.has(group.id) || !Array.isArray(group.items)) {
      return { error: "素材组配置不可用，请重新添加。" };
    }
    ids.add(group.id);
  }
  for (const item of [...common, ...groups.flatMap((group) => group.items)]) {
    if (!item?.reference || typeof item.reference.id !== "string" || !item.reference.id.trim() ||
        !["ready", "uploading", "failed"].includes(item.reference.status)) return { error: REFERENCE_ERROR };
  }
  return { error: null, common: unique([...common]), groups: groups.map((group, index) => ({
    id: group.id, name: group.name?.trim() || "素材组 " + (index + 1), items: unique([...group.items]),
  })) };
}

function pairedLength(groups) {
  const size = Math.max(0, ...groups.map((group) => group.items.length));
  return groups.every((group) => group.items.length === 1 || group.items.length === size) ? size : null;
}

/** Maximum distinct selected candidates outside common refs is a bipartite matching. */
function maximumReferences(common, groups) {
  const shared = new Set(common.map((item) => item.reference.id));
  const assigned = new Map();
  const augment = (index, visited) => {
    for (const item of groups[index].items) {
      const id = item.reference.id;
      if (shared.has(id) || visited.has(id)) continue;
      visited.add(id);
      if (!assigned.has(id) || augment(assigned.get(id), visited)) {
        assigned.set(id, index);
        return true;
      }
    }
    return false;
  };
  groups.forEach((_, index) => augment(index, new Set()));
  return common.length + assigned.size;
}

export function validateCanvasBatchReferenceCapacity(common, groups, mode = "all") {
  const input = normalize(common, groups);
  if (input.error) return { valid: false, error: input.error, maxReferences: 0 };
  let maximum = maximumReferences(input.common, input.groups);
  const size = mode === "paired" && input.groups.length && input.groups.every((group) => group.items.length)
    ? pairedLength(input.groups) : null;
  if (size !== null) {
    maximum = input.common.length;
    for (let index = 0; index < size; index += 1) {
      const items = unique([...input.common, ...input.groups.map((group) => group.items[group.items.length === 1 ? 0 : index])]);
      maximum = Math.max(maximum, items.length);
    }
  }
  return { valid: maximum <= CANVAS_BATCH_REFERENCE_LIMIT,
    error: maximum > CANVAS_BATCH_REFERENCE_LIMIT ? CAPACITY_ERROR : null, maxReferences: maximum };
}

// With at most five groups there are at most 52 set partitions. These tiny
// partitions count overlapping identities exactly without visiting the product.
const partitionCache = new Map([[0, [[]]]]);
function partitions(mask) {
  if (partitionCache.has(mask)) return partitionCache.get(mask);
  const bit = mask & -mask;
  const result = [];
  for (const rest of partitions(mask ^ bit)) {
    result.push([bit, ...rest]);
    for (let index = 0; index < rest.length; index += 1) {
      result.push(rest.map((block, position) => position === index ? block | bit : block));
    }
  }
  partitionCache.set(mask, result);
  return result;
}
const factorial = [1n, 1n, 2n, 6n, 24n];

function distinctAssignments(blocks, intersections) {
  let total = 0n;
  for (const partition of partitions((1 << blocks.length) - 1)) {
    let ways = 1n;
    for (const block of partition) {
      let merged = 0, length = 0;
      for (let index = 0; index < blocks.length; index += 1) {
        if (block & (1 << index)) { merged |= blocks[index]; length += 1; }
      }
      ways *= BigInt(intersections[merged]) * factorial[length - 1] * (length % 2 ? 1n : -1n);
      if (!ways) break;
    }
    total += ways;
  }
  return total;
}

function allReferenceCounts(common, groups) {
  const shared = new Set(common.map((item) => item.reference.id));
  const availability = new Map();
  const sharedChoices = groups.map((group, index) => {
    let count = 0;
    for (const item of group.items) {
      const id = item.reference.id;
      if (shared.has(id)) count += 1;
      else availability.set(id, (availability.get(id) ?? 0) | (1 << index));
    }
    return count;
  });
  const size = 1 << groups.length;
  const availabilityCounts = Array(size).fill(0);
  for (const mask of availability.values()) availabilityCounts[mask] += 1;
  const intersections = Array(size).fill(0);
  for (let mask = 1; mask < size; mask += 1) {
    for (let available = 1; available < size; available += 1) {
      if ((available & mask) === mask) intersections[mask] += availabilityCounts[available];
    }
  }
  const histogram = new Map();
  for (let outside = 0; outside < size; outside += 1) {
    let sharedWays = 1n;
    for (let index = 0; index < groups.length; index += 1) {
      if (!(outside & (1 << index))) sharedWays *= BigInt(sharedChoices[index]);
    }
    if (!sharedWays) continue;
    for (const blocks of partitions(outside)) {
      const ways = distinctAssignments(blocks, intersections) * sharedWays;
      if (!ways) continue;
      const references = common.length + blocks.length;
      histogram.set(references, (histogram.get(references) ?? 0n) + ways);
    }
  }
  return new Map([...histogram].sort(([a], [b]) => a - b).map(([count, ways]) => [count, Number(ways)]));
}

function combination(mode, groups, common, choices, index) {
  return { key: JSON.stringify([mode, ...choices.map((item, position) => [groups[position].id, item.reference.id])]),
    index, items: unique([...common, ...choices]) };
}

function empty(error) {
  return { valid: false, error, ready: false, total: 0, referenceCounts: new Map(), preview: [],
    combinations: function* () {} };
}

export function planCanvasBatchReferences(common, groups, mode) {
  if (mode !== "all" && mode !== "paired") return empty("请选择批量组合方式。");
  const input = normalize(common, groups);
  if (input.error) return empty(input.error);
  if (!input.groups.length) return empty("请添加至少 1 个批量素材组。");
  const missing = input.groups.find((group) => !group.items.length);
  if (missing) return empty("请为「" + missing.name + "」添加素材。");
  const paired = mode === "paired" ? pairedLength(input.groups) : null;
  if (mode === "paired" && paired === null) return empty("按顺序配对时，各组数量需要相同；只有 1 张的组可以重复使用。");
  const count = mode === "paired" ? BigInt(paired) : input.groups.reduce((total, group) => total * BigInt(group.items.length), 1n);
  if (count > BigInt(Number.MAX_SAFE_INTEGER)) return empty("组合数量过多，请减少素材后再试。");
  const total = Number(count);
  const combinations = function* () {
    if (mode === "paired") {
      for (let index = 0; index < total; index += 1) {
        const choices = input.groups.map((group) => group.items[group.items.length === 1 ? 0 : index]);
        yield combination(mode, input.groups, input.common, choices, index);
      }
      return;
    }
    const positions = input.groups.map(() => 0);
    let index = 0;
    while (true) {
      const choices = input.groups.map((group, position) => group.items[positions[position]]);
      yield combination(mode, input.groups, input.common, choices, index++);
      let position = positions.length - 1;
      while (position >= 0 && ++positions[position] >= input.groups[position].items.length) {
        positions[position] = 0; position -= 1;
      }
      if (position < 0) return;
    }
  };
  const referenceCounts = mode === "all" ? allReferenceCounts(input.common, input.groups) : new Map();
  const relevant = [...input.common];
  if (mode === "paired") {
    for (const current of combinations()) {
      referenceCounts.set(current.items.length, (referenceCounts.get(current.items.length) ?? 0) + 1);
      relevant.push(...current.items);
    }
  } else {
    const present = new Set(input.common.map((item) => item.reference.id));
    for (const group of input.groups) {
      relevant.push(...group.items.filter((item) => !present.has(item.reference.id)));
      if (group.items.length === 1) present.add(group.items[0].reference.id);
    }
  }
  const preview = [];
  for (const current of combinations()) {
    preview.push(current);
    if (preview.length === CANVAS_BATCH_PREVIEW_LIMIT) break;
  }
  const tooMany = [...referenceCounts.keys()].some((count) => count > CANVAS_BATCH_REFERENCE_LIMIT);
  const failed = relevant.some((item) => item.reference.status === "failed");
  const loading = relevant.some((item) => item.reference.status === "uploading");
  return { valid: !tooMany, ready: !tooMany && !failed && !loading, total, referenceCounts, preview, combinations,
    error: tooMany ? CAPACITY_ERROR : failed ? "有参考图加载失败，请重试或移除后再生成。"
      : loading ? "参考图正在准备，完成后即可批量生成。" : null };
}
