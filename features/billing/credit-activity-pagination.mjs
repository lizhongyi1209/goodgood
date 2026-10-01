export const CREDIT_ACTIVITY_PAGE_SIZE = 20;

export function visibleCreditActivity(item) {
  return item.status !== "released" && item.status !== "refunded" && item.kind !== "refund";
}

export function initialCreditActivityState() {
  return { page: null, pageNumber: 1, hasPrevious: false, hasNext: false, loading: false, error: null };
}

async function readVisiblePage(read, filter, continuation, metadata, signal) {
  const buffer = [...(continuation?.buffer ?? [])];
  let cursor = continuation?.cursor ?? null;
  let shouldRead = continuation ? cursor !== null : true;
  let latest = metadata;
  const cursors = new Set();
  // One visible lookahead proves that Next leads to a real page, even when old
  // servers include a long run of hidden release/refund records. Keep every
  // over-read item in the continuation instead of dropping it at the UI limit.
  while (buffer.length <= CREDIT_ACTIVITY_PAGE_SIZE && shouldRead) {
    if (signal.aborted) return null;
    cursors.add(cursor);
    const page = await read({ filter, cursor, limit: CREDIT_ACTIVITY_PAGE_SIZE, signal });
    if (signal.aborted) return null;
    if (!page || !Array.isArray(page.items)) throw new Error("积分记录暂时无法读取，请稍后重试。");
    latest = page;
    buffer.push(...page.items.filter(visibleCreditActivity));
    cursor = page.nextCursor ?? null;
    if (cursor !== null && cursors.has(cursor)) throw new Error("分页标识未更新，请刷新后重试。");
    shouldRead = cursor !== null;
  }
  return {
    metadata: latest,
    items: buffer.slice(0, CREDIT_ACTIVITY_PAGE_SIZE),
    next: buffer.length > CREDIT_ACTIVITY_PAGE_SIZE
      ? { buffer: buffer.slice(CREDIT_ACTIVITY_PAGE_SIZE), cursor }
      : null,
  };
}

export function createCreditActivityPager({ read, onState }) {
  let pages = [];
  let position = -1;
  let metadata = null;
  let filter = "all";
  let state = initialCreditActivityState();
  let epoch = 0;
  let disposed = false;
  let pending = false;
  let controller = null;
  let failedTarget = null;

  function publish(patch) {
    state = { ...state, ...patch };
    onState(state);
  }
  function show(index) {
    const selected = pages[index];
    position = index;
    failedTarget = null;
    publish({
      page: { ...metadata, items: selected.items, nextCursor: selected.next?.cursor ?? null },
      pageNumber: index + 1, hasPrevious: index > 0, hasNext: selected.next !== null,
      loading: false, error: null,
    });
  }
  async function go(index) {
    if (disposed || pending || index < 0 || index > pages.length) return false;
    if (index < pages.length) { show(index); return true; }
    if (index > 0 && !pages[index - 1].next) return false;
    const requestEpoch = epoch;
    const request = new AbortController();
    controller = request;
    pending = true;
    publish({ loading: true, error: null });
    try {
      const result = await readVisiblePage(read, filter, index === 0 ? null : pages[index - 1].next, metadata, request.signal);
      if (disposed || requestEpoch !== epoch || !result) return false;
      metadata = result.metadata;
      pages.push({ items: result.items, next: result.next });
      show(index);
      return true;
    } catch (cause) {
      if (disposed || requestEpoch !== epoch || request.signal.aborted) return false;
      failedTarget = index;
      publish({ loading: false, error: cause instanceof Error ? cause.message : "积分记录暂时无法读取，请稍后重试。" });
      return false;
    } finally {
      if (requestEpoch === epoch) { pending = false; controller = null; }
    }
  }
  return {
    getState: () => state,
    reset(nextFilter = "all") {
      if (disposed) return Promise.resolve(false);
      epoch += 1;
      controller?.abort();
      pending = false;
      pages = []; position = -1; metadata = null; failedTarget = null;
      filter = nextFilter;
      state = initialCreditActivityState();
      return go(0);
    },
    next: () => state.hasNext ? go(position + 1) : Promise.resolve(false),
    previous: () => position > 0 ? go(position - 1) : Promise.resolve(false),
    retry: () => failedTarget !== null ? go(failedTarget) : Promise.resolve(false),
    dispose() { disposed = true; epoch += 1; controller?.abort(); pending = false; },
  };
}

export function creditActivityTaskId(item) {
  return typeof item.taskId === "string" && item.taskId.trim() ? item.taskId : null;
}

export function shortenCreditTaskId(taskId) {
  return taskId.length > 18 ? `${taskId.slice(0, 8)}…${taskId.slice(-6)}` : taskId;
}

export async function copyCreditTaskId(taskId, clipboard) {
  if (typeof taskId !== "string" || !taskId.trim()) return false;
  try {
    if (!clipboard?.writeText) return false;
    await clipboard.writeText(taskId);
    return true;
  } catch { return false; }
}
