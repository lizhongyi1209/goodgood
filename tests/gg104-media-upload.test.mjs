import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import test from "node:test";
import { S3Client } from "@aws-sdk/client-s3";
import { createVideoMaterialNodeApiHandler } from "../server/video-materials/node-api.mjs";
import { createVideoMaterialUpload, completeVideoMaterialUpload, getVideoMaterialStatus,
  listVideoMaterials, validateVideoObjectHeader, validateVideoUploadRequest, VIDEO_MATERIAL_LIMITS } from "../server/video-materials/api.mjs";
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
  assert.equal(PRIVATE_IMAGE_UPLOAD_MAX_BYTES, 200 * 1024 * 1024);
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

function fakeVideoResources({ storedSize = 32 } = {}) {
  let row = null;
  const publicStorage = new S3Client({
    credentials: { accessKeyId: "disposable", secretAccessKey: "disposable-secret" },
    endpoint: "http://127.0.0.1:58049", forcePathStyle: true, region: "us-east-1",
  });
  const pool = { async query(sql, values) {
    if (sql.includes("FROM users u")) {
      return ["owner-a", "owner-b"].includes(values[0])
        ? { rows: [{ workspace_id: "workspace-a", kind: "organization", status: "active",
          membership_status: "active", membership_role: "org_member" }] }
        : { rows: [] };
    }
    if (sql.startsWith("INSERT INTO video_materials")) {
      row = {
        id: values[0], owner_id: values[1], workspace_id: values[2], object_key: values[3],
        original_file_name: values[4], declared_mime_type: values[5], declared_byte_size: values[6],
        expires_at: new Date(Date.now() + 600_000), upload_state: "pending",
      };
      return { rows: [{ expires_at: row.expires_at }], rowCount: 1 };
    }
    if (sql.startsWith("SELECT * FROM video_materials")) {
      return { rows: row && row.id === values[0] && row.workspace_id === values[1] && row.owner_id === values[2]
        ? [row] : [], rowCount: row ? 1 : 0 };
    }
    if (sql.startsWith("UPDATE video_materials SET upload_state='ready'")) {
      row = { ...row, upload_state: "ready", uploaded_at: new Date() };
      return { rows: [row], rowCount: 1 };
    }
    if (sql.startsWith("UPDATE video_materials SET upload_state='rejected'")) {
      row = { ...row, upload_state: "rejected", error_code: values[2] };
      return { rowCount: 1 };
    }
    if (sql.includes("FROM video_materials") && sql.includes("ORDER BY uploaded_at")) {
      return { rows: row?.upload_state === "ready" && row.workspace_id === values[0] && row.owner_id === values[1]
        ? [row] : [], rowCount: row?.upload_state === "ready" ? 1 : 0 };
    }
    throw Error(`Unexpected SQL: ${sql.slice(0, 80)}`);
  } };
  const header = Buffer.from([0, 0, 0, 32, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 0, 0]);
  const storage = { async send(command) {
    if (command.constructor.name === "HeadBucketCommand" || command.constructor.name === "PutBucketCorsCommand") return {};
    if (command.constructor.name === "HeadObjectCommand") return { ContentLength: storedSize, ContentType: "video/mp4" };
    if (command.constructor.name === "GetObjectCommand") return { Body: { async transformToByteArray() { return header; } } };
    throw Error(`Unexpected storage command: ${command.constructor.name}`);
  } };
  return {
    config: { objectStorage: { bucket: "disposable-video-test", provisioningMode: "manage", uploadAllowedOrigins: ["http://127.0.0.1:32131"] } },
    pool, publicStorage, storage,
  };
}

test("GG-104 video intent, validation, listing and owner isolation complete without provider", async () => {
  const resourcesOverride = fakeVideoResources();
  const ownerContext = { ownerId: "owner-a" };
  const intent = await createVideoMaterialUpload({
    file: { clientId: "video-a", name: "test.mp4", mimeType: "video/mp4", byteSize: 32 },
    ownerContext, resourcesOverride,
  });
  assert.equal(intent.material.status, "uploading");
  assert.match(intent.material.id, /^[0-9a-f-]{36}$/i);
  assert.match(intent.uploadUrl, /^http:\/\/127\.0\.0\.1:58049\/disposable-video-test\//);
  assert.equal(intent.headers["content-type"], "video/mp4");
  const ready = await completeVideoMaterialUpload({ materialId: intent.material.id, ownerContext, resourcesOverride });
  assert.equal(ready.status, "ready");
  assert.equal((await getVideoMaterialStatus({ materialId: ready.id, ownerContext, resourcesOverride })).status, "ready");
  const materials = await listVideoMaterials({ ownerContext, resourcesOverride });
  assert.equal(materials.materials.length, 1);
  assert.equal(materials.materials[0].id, ready.id);
  assert.match(materials.materials[0].url, /^http:\/\/127\.0\.0\.1:58049\//);
  assert.equal((await listVideoMaterials({ ownerContext: { ownerId: "owner-b" }, resourcesOverride })).materials.length, 0);
  await assert.rejects(getVideoMaterialStatus({ materialId: ready.id,
    ownerContext: { ownerId: "owner-b" }, resourcesOverride }), (error) => error.status === 404);
});

test("GG-104 rejects a stored video size mismatch before library visibility", async () => {
  const resourcesOverride = fakeVideoResources({ storedSize: 31 });
  const ownerContext = { ownerId: "owner-a" };
  const intent = await createVideoMaterialUpload({
    file: { clientId: "video-b", name: "test.mp4", mimeType: "video/mp4", byteSize: 32 },
    ownerContext, resourcesOverride,
  });
  assert.match(intent.material.id, /^[0-9a-f-]{36}$/i);
  await assert.rejects(completeVideoMaterialUpload({ materialId: intent.material.id, ownerContext, resourcesOverride }),
    (error) => error.code === "UPLOAD_SIZE_MISMATCH");
  assert.equal((await listVideoMaterials({ ownerContext, resourcesOverride })).materials.length, 0);
});
