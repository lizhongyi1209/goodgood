import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import test from "node:test";
import sharp from "sharp";
import { createReferenceNodeApiHandler } from "../server/references/node-api.mjs";
import {
  inspectReferenceImage,
  validateReferenceIds,
  validateReferenceUploadRequest,
} from "../server/references/validation.mjs";

const validUpload = Object.freeze({
  byteSize: 1024,
  clientId: "local-reference-1",
  mimeType: "image/png",
  name: "服装参考.png",
});

test("reference upload intents enforce type, size, count, and stable IDs", () => {
  assert.deepEqual(validateReferenceUploadRequest({ files: [validUpload] }), [
    validUpload,
  ]);
  assert.throws(
    () =>
      validateReferenceUploadRequest({
        files: [{ ...validUpload, mimeType: "image/gif" }],
      }),
    (error) => error.code === "UPLOAD_TYPE_INVALID",
  );
  assert.throws(
    () =>
      validateReferenceUploadRequest({
        files: [{ ...validUpload, byteSize: 20 * 1024 * 1024 + 1 }],
      }),
    (error) => error.code === "UPLOAD_TOO_LARGE",
  );
  assert.throws(
    () =>
      validateReferenceUploadRequest({
        files: Array.from({ length: 11 }, (_, index) => ({
          ...validUpload,
          clientId: `reference-${index}`,
        })),
      }),
    (error) => error.code === "REFERENCE_LIMIT_EXCEEDED",
  );
  assert.deepEqual(
    validateReferenceIds([
      { id: "20000000-0000-4000-8000-000000000001" },
      { id: "20000000-0000-4000-8000-000000000002" },
    ]),
    [
      "20000000-0000-4000-8000-000000000001",
      "20000000-0000-4000-8000-000000000002",
    ],
  );
  assert.throws(
    () =>
      validateReferenceIds(
        Array.from({ length: 11 }, (_, index) => ({
          id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        })),
      ),
    (error) => error.code === "REFERENCE_LIMIT_EXCEEDED",
  );
});

test("reference validation decodes the real image before accepting metadata", async () => {
  const validPng = await readFile(
    new URL("../public/nano-fashion.png", import.meta.url),
  );
  assert.deepEqual(
    await inspectReferenceImage({
      bytes: validPng,
      declaredMimeType: "image/png",
    }),
    { detectedMimeType: "image/png", height: 1402, width: 1122 },
  );
  await assert.rejects(
    inspectReferenceImage({
      bytes: validPng,
      declaredMimeType: "image/jpeg",
    }),
    (error) => error.code === "UPLOAD_TYPE_MISMATCH",
  );
  await assert.rejects(
    inspectReferenceImage({
      bytes: Buffer.from("not-an-image"),
      declaredMimeType: "image/png",
    }),
    (error) => error.code === "UPLOAD_DECODE_INVALID",
  );
  const tinyPng = await sharp({
    create: {
      background: { alpha: 1, b: 255, g: 255, r: 255 },
      channels: 4,
      height: 32,
      width: 32,
    },
  })
    .png()
    .toBuffer();
  await assert.rejects(
    inspectReferenceImage({
      bytes: tinyPng,
      declaredMimeType: "image/png",
    }),
    (error) => error.code === "UPLOAD_DIMENSIONS_INVALID",
  );
});

function requestFor({ body, method = "POST", url }) {
  const request = Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []);
  request.headers = {};
  request.method = method;
  request.url = url;
  return request;
}

function responseRecorder() {
  return {
    body: "",
    headers: {},
    statusCode: 0,
    end(chunk = "") {
      this.body += chunk;
    },
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
  };
}

test("reference HTTP routes preserve the authenticated owner context", async () => {
  const calls = [];
  const ownerContext = { ownerId: "owner-a" };
  const handler = createReferenceNodeApiHandler({
    authenticate: async () => ownerContext,
    operations: {
      async completeReferenceUpload(input) {
        calls.push(input);
        return { id: input.referenceId, name: "参考.png", status: "ready" };
      },
      async createReferenceUploads(input) {
        calls.push(input);
        return { uploads: [] };
      },
    },
  });

  const createResponse = responseRecorder();
  assert.equal(
    await handler(
      requestFor({
        body: { files: [validUpload] },
        url: "/api/references",
      }),
      createResponse,
    ),
    true,
  );
  assert.equal(createResponse.statusCode, 201);
  assert.deepEqual(calls[0], { files: [validUpload], ownerContext });

  const completeResponse = responseRecorder();
  await handler(
    requestFor({
      url: "/api/references/20000000-0000-4000-8000-000000000001/complete",
    }),
    completeResponse,
  );
  assert.equal(completeResponse.statusCode, 200);
  assert.deepEqual(calls[1], {
    ownerContext,
    referenceId: "20000000-0000-4000-8000-000000000001",
  });
});

test("M4 reference records are owner-scoped and retain validation evidence", async () => {
  const [migration, schema, generationRepository] = await Promise.all([
    readFile(
      new URL("../migrations/0003_m4_reference_assets.sql", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../server/generation/repository.mjs", import.meta.url),
      "utf8",
    ),
  ]);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS reference_assets/);
  assert.match(migration, /owner_id uuid NOT NULL REFERENCES users/);
  assert.match(migration, /detected_mime_type/);
  assert.match(migration, /pixel_width/);
  assert.match(migration, /checksum/);
  assert.match(migration, /upload_state IN \('pending', 'ready', 'rejected', 'expired'\)/);
  assert.match(schema, /export const referenceAssets = pgTable/);
  assert.match(generationRepository, /objectKey/);
});
