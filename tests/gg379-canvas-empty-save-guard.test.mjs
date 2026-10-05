import assert from "node:assert/strict";
import test from "node:test";
import { unapprovedEmptyCanvasPages } from "../features/canvas/canvas-empty-save-guard.mjs";

const page = (id, ids = []) => ({ id, nodes: ids.map((id) => ({ id })), edges: [], generators: {} });
const document = (...pages) => ({ schemaVersion: 2, pages });

test("a transient empty flow cannot replace a populated saved page", () => {
  assert.deepEqual(unapprovedEmptyCanvasPages(document(page("a", ["image", "folder"])), document(page("a"))), ["a"]);
});
test("an explicit last-node deletion or history restore may save an empty page", () => {
  assert.deepEqual(unapprovedEmptyCanvasPages(document(page("a", ["image"])), document(page("a")), new Set(["a"])), []);
});
test("empty new projects and new pages can still be saved", () => {
  assert.deepEqual(unapprovedEmptyCanvasPages(document(page("a")), document(page("a"), page("b"))), []);
});
test("one page's clear permission cannot clear a different page", () => {
  const previous = document(page("a", ["one"]), page("b", ["two"]));
  assert.deepEqual(unapprovedEmptyCanvasPages(previous, document(page("a"), page("b")), new Set(["a"])), ["b"]);
});
test("partial deletion and removing an entire page retain existing behavior", () => {
  const previous = document(page("a", ["one", "two"]), page("b", ["three"]));
  assert.deepEqual(unapprovedEmptyCanvasPages(previous, document(page("a", ["one"]))), []);
});
test("legacy documents retain protection while upgrading to page documents", () => {
  const legacy = { schemaVersion: 1, nodes: [{ id: "one" }], edges: [], generators: {} };
  assert.deepEqual(unapprovedEmptyCanvasPages(legacy, document(page("page-1"))), ["page-1"]);
});
