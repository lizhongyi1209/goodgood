import assert from "node:assert/strict";
import test from "node:test";
import { createCanvasFolderMover, planCanvasFolderMove } from "../features/canvas/canvas-folder-drop.mjs";

function collection() {
  return {
    folders: [{ id: "people", name: "人物" }, { id: "places", name: "场景" }],
    items: [
      { kind: "generated", id: "image-a", media: "image" },
      { kind: "reference", id: "image-b", media: "image" },
      { kind: "video", id: "video-a", media: "video" },
      { kind: "audio", id: "audio-a", media: "audio" },
    ],
    arrangements: [{ kind: "generated", id: "image-a", folderId: "people", tags: ["肖像"], displayName: "我的图" }],
  };
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function harness(save, initial = collection()) {
  let data = initial;
  const states = [], requests = [], saved = [];
  const mover = createCanvasFolderMover({
    readData: () => data,
    save: (...args) => { requests.push(args); return save(...args); },
    onState: (state) => states.push(state),
    onSaved: (arrangement) => {
      saved.push(arrangement);
      data = { ...data, arrangements: [...data.arrangements.filter((entry) => entry.kind !== arrangement.kind || entry.id !== arrangement.id), arrangement] };
    },
  });
  return { mover, states, requests, saved, getData: () => data, setData: (next) => { data = next; } };
}

test("GG-256 moves generated and reference identity with current tags only", () => {
  const data = collection();
  assert.deepEqual(planCanvasFolderMove(data, "generated:image-a", "places"), {
    key: "generated:image-a", kind: "generated", id: "image-a", folderId: "places", folderName: "场景", tags: ["肖像"],
  });
  assert.deepEqual(planCanvasFolderMove(data, "reference:image-b", "people"), {
    key: "reference:image-b", kind: "reference", id: "image-b", folderId: "people", folderName: "人物", tags: [],
  });
  const plan = planCanvasFolderMove(data, "generated:image-a", "places");
  plan.tags.push("独立快照");
  assert.deepEqual(data.arrangements[0].tags, ["肖像"]);
  assert.equal(data.arrangements[0].displayName, "我的图");
});

test("GG-256 rejects absent/loading collections, unknown identities, same folders and mismatched media", () => {
  const data = collection();
  for (const [current, key, folder] of [
    [null, "reference:image-b", "people"],
    [{ ...data, items: [] }, "reference:image-b", "people"],
    [data, null, "people"], [data, "", "people"],
    [data, "generated:other-owner", "people"], [data, "reference:image-a", "people"],
    [data, "generated:image-a", "people"], [data, "reference:image-b", "unknown"],
    [{ ...data, items: [{ kind: "external", id: "image", media: "image" }] }, "external:image", "people"],
    [{ ...data, items: [{ kind: "generated", id: "image-a", media: "video" }] }, "generated:image-a", "places"],
  ]) assert.equal(planCanvasFolderMove(current, key, folder), null);
});

test("GG-256 keeps membership unchanged while pending and permits one request until confirmation", async () => {
  const response = deferred();
  const h = harness(() => response.promise);
  const initial = h.getData();
  const move = h.mover.move("generated:image-a", "places");
  assert.equal(h.mover.isPending(), true);
  assert.equal(h.getData(), initial);
  assert.deepEqual(h.states.map((state) => state.phase), ["pending"]);
  assert.equal(await h.mover.move("generated:image-a", "places"), false);
  assert.equal(await h.mover.move("reference:image-b", "people"), false);
  assert.deepEqual(h.requests, [["generated", "image-a", { folderId: "places", tags: ["肖像"] }]]);
  const confirmed = { ...initial.arrangements[0], folderId: "places" };
  response.resolve(confirmed);
  assert.equal(await move, true);
  assert.equal(h.mover.isPending(), false);
  assert.deepEqual(h.saved, [confirmed]);
  assert.equal(h.getData().arrangements[0].displayName, "我的图");
  assert.deepEqual(h.states.map((state) => state.phase), ["pending", "succeeded"]);
  assert.equal(await h.mover.move("generated:image-a", "places"), false);
  assert.equal(h.requests.length, 1);
});

test("GG-256 failure leaves original organization intact and retry resolves latest tags", async () => {
  let fail = true;
  const h = harness(async (kind, id, value) => {
    if (fail) throw new Error("整理暂时不可用");
    return { kind, id, ...value, displayName: "我的图" };
  });
  const initial = h.getData();
  assert.equal(await h.mover.move("generated:image-a", "places"), false);
  assert.equal(h.getData(), initial);
  assert.equal(h.saved.length, 0);
  assert.equal(h.mover.isPending(), false);
  assert.equal(h.states.at(-1).error, "整理暂时不可用");
  const failed = h.states.at(-1);
  h.setData({ ...initial, arrangements: [{ ...initial.arrangements[0], tags: ["更新标签"] }] });
  fail = false;
  assert.equal(await h.mover.move(failed.key, failed.folderId), true);
  assert.deepEqual(h.requests[1], ["generated", "image-a", { folderId: "places", tags: ["更新标签"] }]);
  assert.deepEqual(h.states.map((state) => state.phase), ["pending", "failed", "pending", "succeeded"]);
});

test("GG-256 invalid/no-op moves never call save or expose a pending state", async () => {
  const h = harness(async () => { throw new Error("unexpected write"); });
  for (const [key, folder] of [["generated:image-a", "people"], ["unknown", "people"], ["reference:image-b", "missing"], ["video:unknown", "people"]]) {
    assert.equal(await h.mover.move(key, folder), false);
  }
  h.setData(null);
  assert.equal(await h.mover.move("reference:image-b", "people"), false);
  assert.deepEqual(h.requests, []);
  assert.deepEqual(h.states, []);
  assert.deepEqual(h.saved, []);
});

test("GG-256 late success after disposal does not mutate an unmounted panel", async () => {
  const response = deferred();
  const h = harness(() => response.promise);
  const move = h.mover.move("reference:image-b", "people");
  h.mover.dispose();
  response.resolve({ kind: "reference", id: "image-b", folderId: "people", tags: [], displayName: null });
  assert.equal(await move, true);
  assert.deepEqual(h.states.map((state) => state.phase), ["pending"]);
  assert.deepEqual(h.saved, []);
  assert.equal(await h.mover.move("reference:image-b", "places"), false);
  assert.equal(h.requests.length, 1);
});

test("GG-256 late failure after disposal stays quiet and always releases the pending guard", async () => {
  const response = deferred();
  const h = harness(() => response.promise);
  const move = h.mover.move("generated:image-a", "places");
  h.mover.dispose();
  response.reject(new Error("late error"));
  assert.equal(await move, false);
  assert.equal(h.mover.isPending(), false);
  assert.deepEqual(h.states.map((state) => state.phase), ["pending"]);
  assert.deepEqual(h.saved, []);
});

test("GG-256 non-Error failure remains recoverable without hiding the source asset", async () => {
  const h = harness(async () => { throw null; });
  assert.equal(await h.mover.move("reference:image-b", "people"), false);
  assert.equal(h.states.at(-1).phase, "failed");
  assert.equal(h.states.at(-1).error, "移动失败，请重试。");
  assert.equal(h.getData().items.length, 4);
});

test("GG-372 moves video, audio and text through the same confirmed organization path", async () => {
  for (const [kind, id, media] of [["video", "video-a", "video"], ["audio", "audio-a", "audio"], ["text", "text-a", "text"]]) {
    const initial = collection();
    if (kind === "text") initial.items.push({ kind, id, media });
    initial.arrangements.push({ kind, id, folderId: "people", tags: ["保留标签"], displayName: "保留名称" });
    const h = harness(async (nextKind, nextId, value) => ({ kind: nextKind, id: nextId, ...value, displayName: "保留名称" }), initial);
    assert.equal(await h.mover.move(`${kind}:${id}`, "places"), true);
    assert.deepEqual(h.requests, [[kind, id, { folderId: "places", tags: ["保留标签"] }]]);
    assert.equal(h.getData().arrangements.find((entry) => entry.kind === kind && entry.id === id).displayName, "保留名称");
    assert.deepEqual(h.states.map((state) => state.phase), ["pending", "succeeded"]);
    assert.equal(await h.mover.move(`${kind}:${id}`, "places"), false);
    assert.equal(h.requests.length, 1);
  }
});
