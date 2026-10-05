import { planCanvasBatchReferences } from "./canvas-batch-reference-plan.mjs";

export const CANVAS_BATCH_COMBINATIONS_PER_PAGE = 12;

function unique(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.reference.id)) return false;
    seen.add(item.reference.id);
    return true;
  });
}

/** Expand only the requested page, even if the Cartesian product is enormous. */
export function pageCanvasBatchReferences(common, groups, mode, requestedPage = 1) {
  const plan = planCanvasBatchReferences(common, groups, mode);
  const pageSize = CANVAS_BATCH_COMBINATIONS_PER_PAGE;
  if (!plan.total) return { total: 0, page: 1, pageCount: 0, pageSize, combinations: [], error: plan.error };
  const shared = unique([...common]);
  const pools = groups.map((group) => ({ ...group, items: unique([...group.items]) }));
  const total = BigInt(plan.total);
  const width = BigInt(pageSize);
  const pageCount = Number((total + width - 1n) / width);
  const page = Math.min(pageCount, Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1);
  const start = (BigInt(page) - 1n) * width;
  const combinations = [];
  for (let index = start; index < total && index < start + width; index += 1n) {
    let remaining = index;
    const choices = Array(pools.length);
    for (let position = pools.length - 1; position >= 0; position -= 1) {
      const pool = pools[position].items;
      if (mode === "paired") choices[position] = pool[pool.length === 1 ? 0 : Number(index)];
      else {
        const size = BigInt(pool.length);
        choices[position] = pool[Number(remaining % size)];
        remaining /= size;
      }
    }
    combinations.push({ index: Number(index),
      key: JSON.stringify([mode, ...choices.map((item, position) => [pools[position].id, item.reference.id])]),
      items: unique([...shared, ...choices]) });
  }
  return { total: plan.total, page, pageCount, pageSize, combinations, error: plan.error };
}
