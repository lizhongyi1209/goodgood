import assert from "node:assert/strict";
import test from "node:test";
import { copyCreditTaskId, createCreditActivityPager, creditActivityTaskId, shortenCreditTaskId } from "../features/billing/credit-activity-pagination.mjs";

const item = (id, status = "spent") => ({ id: String(id), status, kind: status === "refunded" ? "refund" : "generation" });
const rows = (start, count) => Array.from({ length: count }, (_, index) => item(start + index));
const page = (items, nextCursor = null, available = "90071992547409931234") => ({
  items, nextCursor, account: { availableCredits: available }, spendSummary: { today: "2", thisWeek: "5", thisMonth: "9" },
});
const ids = (state) => state.page.items.map((entry) => entry.id);
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function harness(read) {
  const states = [], queries = [];
  const pager = createCreditActivityPager({ read: (query) => { queries.push(query); return read(query); }, onState: (state) => states.push(state) });
  return { pager, states, queries };
}

test("GG-260 cursor spillover yields replacement pages of at most 20 without losing visible records", async () => {
  const source = new Map([
    [null, page([...rows(0, 13), ...rows(100, 7).map((entry) => ({ ...entry, status: "released" }))], "a")],
    ["a", page([...rows(13, 18), item("refund", "refunded"), item("release", "released")], "b")],
    ["b", page(rows(31, 20), "c")], ["c", page([item("hidden", "refunded")])],
  ]);
  const h = harness(async ({ cursor }) => source.get(cursor));
  assert.equal(await h.pager.reset(), true);
  assert.deepEqual(ids(h.pager.getState()), rows(0, 20).map((entry) => entry.id));
  assert.equal(h.pager.getState().hasNext, true);
  assert.equal(await h.pager.previous(), false);
  assert.equal(await h.pager.next(), true);
  assert.deepEqual(ids(h.pager.getState()), rows(20, 20).map((entry) => entry.id));
  assert.equal(h.pager.getState().pageNumber, 2);
  assert.equal(await h.pager.next(), true);
  assert.deepEqual(ids(h.pager.getState()), rows(40, 11).map((entry) => entry.id));
  assert.equal(h.pager.getState().hasNext, false);
  assert.equal(await h.pager.next(), false);
  assert.ok(h.states.every((state) => !state.page || state.page.items.length <= 20));
  assert.ok(h.queries.every((query) => query.limit === 20 && query.signal instanceof AbortSignal));
  const calls = h.queries.length;
  assert.equal(await h.pager.previous(), true);
  assert.deepEqual(ids(h.pager.getState()), rows(20, 20).map((entry) => entry.id));
  assert.equal(await h.pager.next(), true);
  assert.equal(h.queries.length, calls);
});

test("GG-260 exact full page followed by more than ten hidden pages has no empty Next page", async () => {
  const h = harness(async ({ cursor }) => {
    if (cursor === null) return page(rows(0, 20), "0");
    const index = Number(cursor);
    return page([item(`release-${index}`, "released")], index < 12 ? String(index + 1) : null);
  });
  await h.pager.reset();
  assert.equal(h.queries.length, 14);
  assert.equal(h.pager.getState().page.items.length, 20);
  assert.equal(h.pager.getState().hasNext, false);
  assert.equal(await h.pager.next(), false);
});

test("GG-260 all-hidden and empty results retain actual account summary and a single empty page", async () => {
  for (const result of [page([]), page([item("a", "released"), item("b", "refunded")])]) {
    const h = harness(async () => result);
    await h.pager.reset("receive");
    assert.deepEqual(ids(h.pager.getState()), []);
    assert.equal(h.pager.getState().hasNext, false);
    assert.equal(h.pager.getState().pageNumber, 1);
    assert.equal(h.pager.getState().page.account.availableCredits, "90071992547409931234");
    assert.equal(h.queries[0].filter, "receive");
  }
});

test("GG-260 latest account/quota summary remains current when returning to cached pages", async () => {
  const quota = { remaining: 3, limit: 10, reserved: 1 };
  const h = harness(async ({ cursor }) => cursor === null ? page(rows(0, 20), "a", "120")
    : cursor === "a" ? page(rows(20, 20), "b", "115") : { ...page(rows(40, 3), null, "110"), dailyFreeQuota: quota });
  await h.pager.reset();
  await h.pager.next();
  await h.pager.previous();
  assert.equal(h.pager.getState().page.account.availableCredits, "110");
  assert.equal(h.pager.getState().page.dailyFreeQuota, quota);
  assert.deepEqual(ids(h.pager.getState()), rows(0, 20).map((entry) => entry.id));
});

test("GG-260 failed next page preserves its lookahead and current page for a complete retry", async () => {
  let failed = true;
  const h = harness(async ({ cursor }) => {
    if (cursor === null) return page(rows(0, 20), "a");
    if (cursor === "a") return page([item(20)], "b");
    if (failed) throw new Error("读取失败");
    return page(rows(21, 9));
  });
  await h.pager.reset();
  assert.equal(await h.pager.next(), false);
  assert.equal(h.pager.getState().error, "读取失败");
  assert.equal(h.pager.getState().pageNumber, 1);
  assert.deepEqual(ids(h.pager.getState()), rows(0, 20).map((entry) => entry.id));
  failed = false;
  assert.equal(await h.pager.retry(), true);
  assert.deepEqual(ids(h.pager.getState()), rows(20, 10).map((entry) => entry.id));
  assert.equal(h.pager.getState().hasNext, false);
});

test("GG-260 in-flight pagination rejects duplicate commands and filter reset aborts/ignores old replies", async () => {
  const old = deferred();
  const h = harness(({ filter }) => filter === "all" ? old.promise : Promise.resolve(page([item("receive")]))) ;
  const initial = h.pager.reset("all");
  assert.equal(h.pager.getState().loading, true);
  assert.equal(await h.pager.next(), false);
  assert.equal(await h.pager.previous(), false);
  await h.pager.reset("receive");
  assert.equal(h.queries[0].signal.aborted, true);
  old.resolve(page(rows(0, 20), "old"));
  assert.equal(await initial, false);
  assert.deepEqual(ids(h.pager.getState()), ["receive"]);
  assert.equal(h.pager.getState().pageNumber, 1);
  assert.equal(h.pager.getState().hasPrevious, false);
  assert.equal(h.pager.getState().loading, false);
});

test("GG-260 duplicate Next cannot advance twice while its continuation is pending", async () => {
  const response = deferred();
  const h = harness(({ cursor }) => cursor === null ? Promise.resolve(page(rows(0, 20), "a"))
    : cursor === "a" ? Promise.resolve(page([item(20)], "b")) : response.promise);
  await h.pager.reset();
  const next = h.pager.next();
  assert.equal(h.pager.getState().loading, true);
  assert.equal(await h.pager.next(), false);
  assert.equal(await h.pager.previous(), false);
  assert.equal(h.queries.filter((query) => query.cursor === "b").length, 1);
  response.resolve(page(rows(21, 4)));
  assert.equal(await next, true);
  assert.equal(h.pager.getState().pageNumber, 2);
  assert.deepEqual(ids(h.pager.getState()), ["20", "21", "22", "23", "24"]);
});

test("GG-260 unmount cancellation suppresses late failures and state updates", async () => {
  const response = deferred();
  const h = harness(() => response.promise);
  const pending = h.pager.reset();
  const count = h.states.length;
  h.pager.dispose();
  response.reject(new Error("late failure"));
  assert.equal(await pending, false);
  assert.equal(h.states.length, count);
  assert.equal(h.queries[0].signal.aborted, true);
  assert.equal(await h.pager.reset(), false);
});

test("GG-260 repeated or cyclic cursors report a recoverable error rather than loop", async () => {
  let repaired = false;
  const h = harness(async ({ cursor }) => repaired ? page(rows(0, 2)) : cursor === null ? page([], "a") : page([], "a"));
  assert.equal(await h.pager.reset(), false);
  assert.match(h.pager.getState().error, /分页标识/);
  assert.equal(h.queries.length, 2);
  repaired = true;
  assert.equal(await h.pager.retry(), true);
  assert.deepEqual(ids(h.pager.getState()), ["0", "1"]);
});

test("GG-260 task display never substitutes a batch or public activity ID", () => {
  const taskId = "12345678-1234-4321-aaaa-123456abcdef";
  assert.equal(creditActivityTaskId({ taskId, batchReference: "batch", id: "activity" }), taskId);
  for (const taskId of [undefined, null, "", "  "]) assert.equal(creditActivityTaskId({ taskId, batchReference: "real-looking-batch", id: "activity" }), null);
  assert.equal(shortenCreditTaskId(taskId), "12345678…abcdef");
  assert.equal(shortenCreditTaskId("short-id"), "short-id");
});

test("GG-260 clipboard writes the full task ID and returns recoverable denial/unsupported failures", async () => {
  const taskId = "12345678-1234-4321-aaaa-123456abcdef", copied = [];
  assert.equal(await copyCreditTaskId(taskId, { writeText: async (value) => { copied.push(value); } }), true);
  assert.deepEqual(copied, [taskId]);
  assert.equal(await copyCreditTaskId(taskId, { writeText: async () => { throw new Error("denied"); } }), false);
  assert.equal(await copyCreditTaskId(taskId, null), false);
  assert.equal(await copyCreditTaskId(null, { writeText: async () => { throw new Error("unexpected"); } }), false);
});
