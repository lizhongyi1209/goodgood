import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom", configFile: false, root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false, ws: false },
});
after(() => vite.close());
const { pendingCanvasProjectContent, remoteCanvasProjectDocument } = await vite.ssrLoadModule(
  "/features/canvas/canvas-project-snapshot.ts",
);

function documentWithJob(state) {
  return {
    schemaVersion: 1,
    nodes: [{ id: "generator-test", type: "imageGenerator", position: { x: 5, y: 8 },
      jobId: "pending_test", localJob: { id: "pending_test", state, input: {}, outputs: [] } }],
    edges: [],
    generators: { "generator-test": {
      draft: { prompt: "isolated draft", modelKey: null, ratio: "adaptive", resolution: "2K", count: 1 },
      directReferenceIds: [],
    } },
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

test("finished local submissions no longer impersonate material uploads, while recovery jobs stay intact", () => {
  for (const state of ["failed", "cancelled"]) {
    const document = documentWithJob(state);
    assert.equal(pendingCanvasProjectContent(document), null);
    const remote = remoteCanvasProjectDocument(document);
    assert.equal(remote.nodes[0].id, "generator-test");
    assert.equal(remote.nodes[0].jobId, undefined);
    assert.equal(remote.nodes[0].localJob, undefined);
    assert.deepEqual(remote.generators, document.generators);
    assert.equal(document.nodes[0].jobId, "pending_test");
    assert.equal(document.nodes[0].localJob.state, state);
  }
});

test("unconfirmed generation placeholders keep the canvas unsynced and are distinct from uploads", () => {
  for (const state of ["queued", "running", "refining", "succeeded"]) {
    assert.equal(pendingCanvasProjectContent(documentWithJob(state)), "generation");
  }
  const missingJob = documentWithJob("failed");
  delete missingJob.nodes[0].localJob;
  assert.equal(pendingCanvasProjectContent(missingJob), "generation");
  const mismatchedJob = documentWithJob("failed");
  mismatchedJob.nodes[0].localJob.id = "pending_other";
  assert.equal(pendingCanvasProjectContent(mismatchedJob), "generation");
});

test("pending media files and failed reference uploads still take priority over finished local jobs", () => {
  for (const type of ["sourceImage", "sourceVideo"]) {
    const document = documentWithJob("failed");
    document.nodes.push({ id: "local-media", type, position: { x: 0, y: 0 }, pendingFileId: "local-file" });
    assert.equal(pendingCanvasProjectContent(document), "materials");
    assert.equal(remoteCanvasProjectDocument(document).nodes.some((node) => node.id === "local-media"), false);
    assert.equal(document.nodes[1].pendingFileId, "local-file");
  }
  const pendingReference = documentWithJob("cancelled");
  pendingReference.generators["generator-test"].pendingReferences = [{ id: "pending-reference", name: "test.png" }];
  assert.equal(pendingCanvasProjectContent(pendingReference), "materials");
  assert.equal(remoteCanvasProjectDocument(pendingReference).generators["generator-test"].pendingReferences, undefined);
  assert.equal(pendingReference.generators["generator-test"].pendingReferences.length, 1);
});

test("empty projects and durable assets or jobs have no local upload blocker", () => {
  const empty = { ...documentWithJob("failed"), nodes: [], generators: {} };
  assert.equal(pendingCanvasProjectContent(empty), null);
  const durable = documentWithJob("succeeded");
  durable.nodes[0].jobId = "durable-job";
  durable.nodes[0].localJob.id = "durable-job";
  durable.nodes.push({ id: "ready-image", type: "sourceImage", position: { x: 0, y: 0 },
    asset: { id: "durable-reference", kind: "reference" } });
  assert.equal(pendingCanvasProjectContent(durable), null);
  assert.equal(remoteCanvasProjectDocument(durable).nodes[0].jobId, "durable-job");
});
