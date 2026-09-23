import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import test from "node:test";
import { createVideoMaterialNodeApiHandler } from "../server/video-materials/node-api.mjs";
import { validateVideoObjectHeader, validateVideoUploadRequest, VIDEO_MATERIAL_LIMITS } from "../server/video-materials/api.mjs";
import { cleanupExpiredVideoUploads } from "../server/video-materials/cleanup.mjs";
import { PRIVATE_IMAGE_UPLOAD_MAX_BYTES } from "../shared/contracts/upload-limits.mjs";

function requestFor(url, method = "GET", body = null) {
  const request = Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []);
  request.url = url;
  request.method = method;
  request.headers = {};
  return request;
}

function responseRecorder() {
  return {
    statusCode: 0,
    body: "",
    writeHead(statusCode) { this.statusCode = statusCode; },
    end(value = "") { this.body += value; },
  };
}

test("GG-104 validates video type, size and container header before readiness", () => {
  const valid = { clientId: "local-1", name: "镜头.mov", mimeType: "video/quicktime", byteSize: 1024 };
  assert.deepEqual(validateVideoUploadRequest(valid), valid);
  assert.equal(VIDEO_MATERIAL_LIMITS.maxBytes, 200 * 1024 * 1024);
  assert.equal(PRIVATE_IMAGE_UPLOAD_MAX_BYTES, 20 * 1024 * 1024);
  assert.throws(() => validateVideoUploadRequest({ ...valid, byteSize: VIDEO_MATERIAL_LIMITS.maxBytes + 1 }),
    (error) => error.code === "UPLOAD_TOO_LARGE");
  assert.throws(() => validateVideoUploadRequest({ ...valid, mimeType: "video/webm" }),
    (error) => error.code === "UPLOAD_TYPE_INVALID");
  assert.throws(() => validateVideoUploadRequest({ ...valid, byteSize: 0 }),
    (error) => error.code === "UPLOAD_SIZE_INVALID");
  const mov = Buffer.from([0, 0, 0, 20, 102, 116, 121, 112, 113, 116, 32, 32]);
  assert.doesNotThrow(() => validateVideoObjectHeader(mov, "video/quicktime"));
  assert.throws(() => validateVideoObjectHeader(mov, "video/mp4"),
    (error) => error.code === "UPLOAD_TYPE_MISMATCH");
  assert.throws(() => validateVideoObjectHeader(Buffer.from("not a video file"), "video/mp4"),
    (error) => error.code === "UPLOAD_CONTENT_INVALID");
});

test("GG-104 video API passes authenticated owner and workspace to each operation", async () => {
  const ownerContext = { ownerId: "owner-a" };
  const calls = [];
  const handler = createVideoMaterialNodeApiHandler({
    authenticate: async () => ownerContext,
    videoOperations: {
      async listVideoMaterials(input) { calls.push(["list", input]); return { materials: [] }; },
      async createVideoMaterialUpload(input) { calls.push(["create", input]); return { material: { id: "x" } }; },
      async completeVideoMaterialUpload(input) { calls.push(["complete", input]); return { id: input.materialId, status: "ready" }; },
      async getVideoMaterialStatus(input) { calls.push(["status", input]); return { id: input.materialId, status: "ready" }; },
    },
  });
  const workspaceId = "20000000-0000-4000-8000-000000000001";
  const request = requestFor("/api/video-materials");
  request.headers["x-goodgood-workspace-id"] = workspaceId;
  const response = responseRecorder();
  assert.equal(await handler(request, response), true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(calls[0], ["list", { ownerContext, workspaceId }]);
  const create = responseRecorder();
  await handler(requestFor("/api/video-materials", "POST", { file: { clientId: "a" } }), create);
  assert.equal(create.statusCode, 201);
  assert.deepEqual(calls[1], ["create", { file: { clientId: "a" }, ownerContext, workspaceId: null }]);
  const complete = responseRecorder();
  await handler(requestFor("/api/video-materials/20000000-0000-4000-8000-000000000002/complete", "POST"), complete);
  assert.equal(complete.statusCode, 200);
  assert.equal(calls[2][1].materialId, "20000000-0000-4000-8000-000000000002");
  const status = responseRecorder();
  await handler(requestFor("/api/video-materials/20000000-0000-4000-8000-000000000002/status"), status);
  assert.equal(status.statusCode, 200);
  assert.equal(calls[3][0], "status");
});

test("GG-104 composer places the tray above prompt and mode switch below", async () => {
  for (const path of ["../features/creation/creation-composer.tsx", "../features/creation/video-creation-composer.tsx"]) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.ok(source.indexOf('<div className="reference-tray') < source.indexOf('<div className="prompt-row">'));
    assert.ok(source.indexOf('<div className="prompt-row">') < source.lastIndexOf("<CreationModeSwitch"));
    assert.match(source, /onDrop=\{fileDrop\.onDrop\}/);
    assert.match(source, /reference-upload-errors/);
  }
});

test("GG-104 cleanup previews old unfinished videos and deletes only on execute", async () => {
  const queries = [];
  const storageCalls = [];
  const resources = {
    config: { objectStorage: { bucket: "disposable-test-bucket" } },
    pool: { async query(sql, values) {
      queries.push([sql, values]);
      if (sql.startsWith("SELECT")) return { rowCount: 1, rows: [{ id: "pending-1", object_key: "video-materials/test/pending-1/original" }] };
      return { rowCount: 1 };
    } },
    storage: { async send(command) { storageCalls.push(command.input); } },
  };
  const preview = await cleanupExpiredVideoUploads(resources);
  assert.deepEqual(preview, { eligible: 1, deleted: 0, failed: 0 });
  assert.equal(storageCalls.length, 0);
  assert.match(queries[0][0], /upload_state IN \('pending', 'rejected', 'expired'\)/);
  assert.match(queries[0][0], /interval '24 hours'/);
  const result = await cleanupExpiredVideoUploads(resources, { execute: true });
  assert.deepEqual(result, { eligible: 1, deleted: 1, failed: 0 });
  assert.equal(storageCalls[0].Bucket, "disposable-test-bucket");
  assert.match(queries.at(-1)[0], /DELETE FROM video_materials/);
});
