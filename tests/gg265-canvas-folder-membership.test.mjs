import assert from "node:assert/strict";
import test from "node:test";
import { createCanvasFolderMover, selectCanvasFolderItems } from "../features/canvas/canvas-folder-drop.mjs";

function collection() {
  return {
    folders: [{ id: "people", name: "People" }, { id: "places", name: "Places" }],
    items: [
      { kind: "generated", id: "a", media: "image", name: "My image" },
      { kind: "reference", id: "a", media: "image", name: "Same ID, different kind" },
      { kind: "reference", id: "b", media: "image", name: "Unclassified" },
      { kind: "video", id: "v", media: "video", name: "Video" },
      { kind: "audio", id: "s", media: "audio", name: "Sound" },
    ],
    arrangements: [
      { kind: "generated", id: "a", folderId: "people", tags: ["portrait"], displayName: "My image" },
      { kind: "reference", id: "a", folderId: null, tags: ["reference"], displayName: null },
      { kind: "video", id: "v", folderId: "places", tags: [], displayName: null },
      { kind: "audio", id: "s", folderId: "deleted", tags: [], displayName: null },
    ],
  };
}

function keys(items) { return items.map((item) => `${item.kind}:${item.id}`); }

test("GG-265 root and existing folders partition assets by kind and confirmed membership", () => {
  const data = collection();
  const before = structuredClone(data);
  assert.deepEqual(keys(selectCanvasFolderItems(data)), ["reference:a", "reference:b", "audio:s"]);
  assert.deepEqual(keys(selectCanvasFolderItems(data, "people")), ["generated:a"]);
  assert.deepEqual(keys(selectCanvasFolderItems(data, "places")), ["video:v"]);
  assert.equal(selectCanvasFolderItems(data, "people")[0], data.items[0]);
  assert.deepEqual(data, before);
});

test("GG-265 empty/loading and deleted-folder views safely retain unclassified assets", () => {
  assert.deepEqual(selectCanvasFolderItems(null), []);
  assert.deepEqual(selectCanvasFolderItems({ folders: [], items: [], arrangements: [] }), []);
  const data = collection();
  assert.deepEqual(keys(selectCanvasFolderItems(data, "deleted")), keys(selectCanvasFolderItems(data)));
  const deleted = { ...data, folders: data.folders.filter((folder) => folder.id !== "people") };
  assert.deepEqual(keys(selectCanvasFolderItems(deleted)), ["generated:a", "reference:a", "reference:b", "audio:s"]);
});

test("GG-265 root move leaves source until confirmation, then shows the same asset only in target and survives reread", async () => {
  let data = collection();
  let confirm;
  const response = new Promise((resolve) => { confirm = resolve; });
  const original = data.items[2];
  const requests = [];
  const mover = createCanvasFolderMover({
    readData: () => data,
    save: (...args) => { requests.push(args); return response; },
    onState: () => {},
    onSaved: (saved) => { data = { ...data, arrangements: [...data.arrangements, saved] }; },
  });
  const move = mover.move("reference:b", "people");
  assert.ok(selectCanvasFolderItems(data).includes(original));
  assert.ok(!selectCanvasFolderItems(data, "people").includes(original));
  confirm({ kind: "reference", id: "b", folderId: "people", tags: [], displayName: null });
  assert.equal(await move, true);
  assert.ok(!selectCanvasFolderItems(data).includes(original));
  assert.equal(selectCanvasFolderItems(data, "people")[1], original);
  assert.equal(data.items.length, 5);
  assert.deepEqual(requests, [["reference", "b", { folderId: "people", tags: [] }]]);
  const reread = structuredClone(data);
  assert.deepEqual(keys(selectCanvasFolderItems(reread)), ["reference:a", "audio:s"]);
  assert.deepEqual(keys(selectCanvasFolderItems(reread, "people")), ["generated:a", "reference:b"]);
  assert.equal(reread.items[2].name, original.name);
});

test("GG-265 failed move retains source membership; retry moves once and keeps tags/name", async () => {
  let data = collection();
  const original = data.items[0];
  const states = [];
  let fail = true;
  const mover = createCanvasFolderMover({
    readData: () => data,
    save: async (kind, id, value) => {
      if (fail) throw new Error("Unavailable");
      return { kind, id, ...value, displayName: "My image" };
    },
    onState: (state) => states.push(state),
    onSaved: (saved) => {
      data = { ...data, arrangements: data.arrangements.map((entry) => entry.kind === saved.kind && entry.id === saved.id ? saved : entry) };
    },
  });
  const before = data;
  assert.equal(await mover.move("generated:a", "places"), false);
  assert.equal(data, before);
  assert.deepEqual(selectCanvasFolderItems(data, "people"), [original]);
  assert.deepEqual(keys(selectCanvasFolderItems(data, "places")), ["video:v"]);
  fail = false;
  assert.equal(await mover.move(states.at(-1).key, states.at(-1).folderId), true);
  assert.deepEqual(selectCanvasFolderItems(data, "people"), []);
  assert.equal(selectCanvasFolderItems(data, "places")[0], original);
  assert.ok(!selectCanvasFolderItems(data).includes(original));
  assert.equal(data.items.length, 5);
  assert.deepEqual(data.arrangements[0], { kind: "generated", id: "a", folderId: "places", tags: ["portrait"], displayName: "My image" });
});
