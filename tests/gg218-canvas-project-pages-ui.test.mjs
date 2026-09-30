import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, root,
  resolve: { alias: { "@": root } }, server: { middlewareMode: true, hmr: false, ws: false } });
after(() => vite.close());
const { getCanvasProjectPages } = await vite.ssrLoadModule("/shared/contracts/canvas-project.ts");
const { emptyCanvasRuntimePage, nextCanvasPageName, canvasPageHasActiveWork } = await vite.ssrLoadModule("/features/canvas/canvas-project-pages.ts");
const { pendingCanvasProjectContent, remoteCanvasProjectDocument } = await vite.ssrLoadModule("/features/canvas/canvas-project-snapshot.ts");
const { CanvasProjectSync } = await vite.ssrLoadModule("/features/canvas/canvas-project-sync.ts");

const empty = () => ({ nodes: [], edges: [], generators: {}, viewport: { x: 0, y: 0, zoom: 1 } });
const page = (id, name) => ({ ...empty(), id, name });
const work = () => ({ busyGeneratorIds: new Set(), uploadingNodeIds: new Set(), referenceStatuses: {}, convertingEdgeIds: new Set() });

test("legacy content and local-only view changes do not create a cloud content update", async () => {
  const legacy = { ...empty(), schemaVersion: 1 };
  const entry = { id: "local-project", name: "project", document: legacy, version: 3, dirty: false, updatedAt: "2026-09-30T00:00:00Z" };
  const states = [];
  const sync = new CanvasProjectSync("isolated-owner", entry, (...args) => states.push(args), () => {});
  await sync.update("project", { schemaVersion: 2, pages: getCanvasProjectPages(legacy).map((item) => ({ ...item, viewport: { x: 50, y: 100, zoom: 2 } })) });
  assert.equal(sync.snapshot.document.schemaVersion, 1);
  assert.equal(sync.snapshot.dirty, false);
  assert.deepEqual(states, []);
  sync.close();
});

test("empty pages are independent and deleted page numbers can be reused", () => {
  const first = emptyCanvasRuntimePage();
  const second = emptyCanvasRuntimePage("second", nextCanvasPageName([first]));
  first.nodes.push({ id: "one", type: "imageGenerator", position: { x: 0, y: 0 }, data: { sequence: 1 } });
  assert.equal(second.name, "页面2");
  assert.deepEqual(second.nodes, []);
  assert.equal(nextCanvasPageName([{ name: "页面1" }, { name: "页面3" }]), "页面2");
});

test("inactive page uploads remain local recovery work without hiding other page data", () => {
  const first = page("first", "页面1");
  const second = page("second", "页面2");
  first.nodes.push({ id: "ready", type: "sourceImage", position: { x: 0, y: 0 }, asset: { id: "reference-one", kind: "reference" } });
  second.nodes.push({ id: "local", type: "sourceImage", position: { x: 20, y: 0 }, pendingFileId: "recovery-file" });
  const document = { schemaVersion: 2, pages: [first, second] };
  assert.equal(pendingCanvasProjectContent(document), "materials");
  const remote = remoteCanvasProjectDocument(document);
  assert.equal(remote.pages.length, 2);
  assert.equal(remote.pages[0].nodes[0].asset.id, "reference-one");
  assert.deepEqual(remote.pages[1].nodes, []);
  assert.equal(document.pages[1].nodes[0].pendingFileId, "recovery-file");
});

test("inactive confirmed jobs keep their job IDs while local failed submissions follow GG-216", () => {
  const second = page("second", "页面2");
  second.nodes.push({ id: "generator", type: "imageGenerator", position: { x: 0, y: 0 },
    jobId: "pending_one", localJob: { id: "pending_one", state: "failed" } });
  const document = { schemaVersion: 2, pages: [page("first", "页面1"), second] };
  assert.equal(pendingCanvasProjectContent(document), null);
  second.nodes[0].localJob.error = { code: "SUBMISSION_UNKNOWN" };
  assert.equal(pendingCanvasProjectContent(document), "generation");
  delete second.nodes[0].localJob.error;
  second.nodes[0].localJob.state = "queued";
  assert.equal(pendingCanvasProjectContent(document), "generation");
  second.nodes[0].jobId = "confirmed-job";
  assert.equal(remoteCanvasProjectDocument(document).pages[1].nodes[0].jobId, "confirmed-job");
});

test("page deletion waits for uploads, submissions, confirmed active jobs and conversions", () => {
  const current = emptyCanvasRuntimePage("page", "页面1");
  current.nodes.push({ id: "generator", type: "imageGenerator", position: { x: 0, y: 0 }, data: { sequence: 1 } });
  const options = work();
  options.busyGeneratorIds.add("generator");
  assert.equal(canvasPageHasActiveWork(current, options), true);
  options.busyGeneratorIds.clear();
  current.nodes[0].data.job = { id: "job", state: "running" };
  assert.equal(canvasPageHasActiveWork(current, options), true);
  current.nodes[0].data.job = { id: "pending_unknown", state: "failed", error: { code: "SUBMISSION_UNKNOWN" } };
  assert.equal(canvasPageHasActiveWork(current, options), true);
  current.nodes[0].data.job = { id: "job", state: "succeeded" };
  assert.equal(canvasPageHasActiveWork(current, options), false);
  options.referenceStatuses.generator = [{ reference: { status: "uploading" } }];
  assert.equal(canvasPageHasActiveWork(current, options), true);
  options.referenceStatuses = {};
  current.edges.push({ id: "conversion", source: "one", target: "generator" });
  options.convertingEdgeIds.add("conversion");
  assert.equal(canvasPageHasActiveWork(current, options), true);
});
