import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import test from "node:test";
import { CREATION_DRAFT_TTL_MS } from "../server/drafts/constants.mjs";
import { DraftConflictError } from "../server/drafts/errors.mjs";
import { createCreationDraftNodeApiHandler } from "../server/drafts/node-api.mjs";
import {
  validateDraftDelete,
  validateDraftMutation,
} from "../server/drafts/validation.mjs";

const REFERENCE_ID = "20000000-0000-4000-8000-000000000001";
const validDraft = Object.freeze({
  expectedVersion: null,
  state: {
    aspectRatio: "4:5",
    count: 1,
    modelId: "nano-banana-2",
    prompt: "保留服装结构",
    references: [{ id: REFERENCE_ID }],
    resolution: "2K",
  },
});

test("creation drafts validate stable values, ready reference IDs, versions, and expiry policy", () => {
  assert.equal(CREATION_DRAFT_TTL_MS, 30 * 24 * 60 * 60 * 1_000);
  assert.deepEqual(validateDraftMutation(validDraft), {
    expectedVersion: null,
    state: {
      aspectRatio: "4:5",
      count: 1,
      modelId: "nano-banana-2",
      prompt: "保留服装结构",
      referenceIds: [REFERENCE_ID],
      resolution: "2K",
    },
  });
  assert.equal(validateDraftDelete({ expectedVersion: 3 }), 3);
  assert.throws(
    () => validateDraftMutation({ ...validDraft, expectedVersion: 0 }),
    (error) => error.code === "INVALID_DRAFT",
  );
  assert.throws(
    () => validateDraftMutation({
      ...validDraft,
      state: { ...validDraft.state, modelId: "provider-model" },
    }),
    (error) => error.code === "INVALID_DRAFT",
  );
});

function requestFor({ body, headers = {}, method = "GET", url = "/api/draft" }) {
  const request = Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []);
  request.headers = headers;
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

test("creation draft HTTP routes preserve owner context for empty, save, conflict, and delete", async () => {
  const calls = [];
  const record = {
    expiresAt: "2026-10-01T00:00:00.000Z",
    state: validDraft.state,
    updatedAt: "2026-09-01T00:00:00.000Z",
    version: 1,
  };
  const operations = {
    async deleteCreationDraft(input) {
      calls.push({ operation: "delete", ...input });
      return { deleted: true };
    },
    async readCreationDraft(input) {
      calls.push({ operation: "read", ...input });
      return { draft: null };
    },
    async saveCreationDraft(input) {
      calls.push({ operation: "save", ...input });
      if (input.ownerContext.ownerId === "owner-b") {
        throw new DraftConflictError(record);
      }
      return record;
    },
  };
  const handler = createCreationDraftNodeApiHandler({
    authenticate: async (request) => ({
      ownerId: request.headers["x-owner"] ?? "owner-a",
    }),
    operations,
  });

  const emptyResponse = responseRecorder();
  assert.equal(await handler(requestFor({}), emptyResponse), true);
  assert.deepEqual(JSON.parse(emptyResponse.body), { draft: null });
  assert.equal(calls[0].ownerContext.ownerId, "owner-a");

  const saveResponse = responseRecorder();
  await handler(requestFor({ body: validDraft, method: "PUT" }), saveResponse);
  assert.equal(saveResponse.statusCode, 200);
  assert.equal(calls[1].input.expectedVersion, null);

  const conflictResponse = responseRecorder();
  await handler(
    requestFor({
      body: validDraft,
      headers: { "x-owner": "owner-b" },
      method: "PUT",
    }),
    conflictResponse,
  );
  assert.equal(conflictResponse.statusCode, 409);
  assert.equal(JSON.parse(conflictResponse.body).error.code, "DRAFT_CONFLICT");
  assert.equal(JSON.parse(conflictResponse.body).error.currentDraft.version, 1);

  const deleteResponse = responseRecorder();
  await handler(
    requestFor({ body: { expectedVersion: 1 }, method: "DELETE" }),
    deleteResponse,
  );
  assert.equal(deleteResponse.statusCode, 200);
  assert.equal(calls.at(-1).ownerContext.ownerId, "owner-a");
});

test("creation draft persistence is one-per-owner, optimistic, and wired through both runtimes", async () => {
  const [migration, schema, repository, apiRoute, runtime, cleanup, page, boundary] =
    await Promise.all([
      readFile(new URL("../migrations/0008_m4_creation_drafts.sql", import.meta.url), "utf8"),
      readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
      readFile(new URL("../server/drafts/repository.mjs", import.meta.url), "utf8"),
      readFile(new URL("../app/api/draft/route.ts", import.meta.url), "utf8"),
      readFile(new URL("../server/runtime/web.mjs", import.meta.url), "utf8"),
      readFile(new URL("../server/references/cleanup-repository.mjs", import.meta.url), "utf8"),
      readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../features/drafts/http-draft-boundary.ts", import.meta.url), "utf8"),
    ]);
  assert.match(migration, /owner_id uuid PRIMARY KEY/);
  assert.match(migration, /version integer NOT NULL DEFAULT 1/);
  assert.match(migration, /expires_at timestamptz NOT NULL/);
  assert.match(schema, /export const creationDrafts = pgTable/);
  assert.match(repository, /FOR UPDATE/);
  assert.match(repository, /lockReferenceLifecycle/);
  assert.match(repository, /existing\.version \+ 1/);
  assert.match(apiRoute, /saveCreationDraft/);
  assert.match(runtime, /handleCreationDraftNodeApi/);
  assert.match(cleanup, /FROM creation_drafts draft/);
  assert.match(page, /保留当前内容/);
  assert.match(page, /恢复云端草稿/);
  assert.match(
    page,
    /const expectedVersion = draftConflict\s+\? draftConflict\.currentDraft\?\.version \?\? null\s+: draftVersionRef\.current/,
  );
  assert.doesNotMatch(page, /if \(draftConflict\) return;/);
  assert.match(page, /850/);
  assert.match(boundary, /expectedVersion/);
});
