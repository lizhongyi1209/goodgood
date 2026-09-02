import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import test from "node:test";
import { ProjectRequestError } from "../server/projects/errors.mjs";
import { createProjectNodeApiHandler } from "../server/projects/node-api.mjs";
import { hashProjectInput } from "../server/projects/repository.mjs";
import {
  validateProjectIdempotencyKey,
  validateProjectSaveRequest,
} from "../server/projects/validation.mjs";

const PROJECT_ID = "30000000-0000-4000-8000-000000000001";
const JOB_ID = "40000000-0000-4000-8000-000000000001";
const REFERENCE_ID = "20000000-0000-4000-8000-000000000001";
const validSave = Object.freeze({
  batchIds: [JOB_ID],
  name: "银色未来服装视觉",
  state: {
    aspectRatio: "4:5",
    count: 1,
    modelId: "nano-banana-2",
    prompt: "保留服装结构",
    references: [{ id: REFERENCE_ID }],
    resolution: "2K",
  },
});

test("project saves validate stable domain values, ordered ready IDs, and idempotency", () => {
  assert.deepEqual(validateProjectSaveRequest(validSave), {
    batchIds: [JOB_ID],
    name: validSave.name,
    state: {
      aspectRatio: "4:5",
      count: 1,
      modelId: "nano-banana-2",
      prompt: "保留服装结构",
      referenceIds: [REFERENCE_ID],
      resolution: "2K",
    },
  });
  assert.equal(
    validateProjectIdempotencyKey("project_save_12345678"),
    "project_save_12345678",
  );
  assert.throws(
    () => validateProjectSaveRequest({ ...validSave, batchIds: [] }),
    (error) => error.code === "INVALID_PROJECT",
  );
  assert.throws(
    () =>
      validateProjectSaveRequest({
        ...validSave,
        state: { ...validSave.state, modelId: "provider-model-name" },
      }),
    (error) => error.code === "INVALID_PROJECT",
  );
  assert.throws(
    () => validateProjectIdempotencyKey("short"),
    (error) => error.code === "INVALID_IDEMPOTENCY_KEY",
  );

  const hashInput = {
    ...validateProjectSaveRequest(validSave),
    state: {
      ...validateProjectSaveRequest(validSave).state,
      references: [
        {
          id: REFERENCE_ID,
          name: "服装.png",
          objectKey: `references/owner-a/${REFERENCE_ID}/original`,
          ordinal: 1,
        },
      ],
    },
  };
  assert.equal(hashProjectInput(hashInput), hashProjectInput(hashInput));
  assert.notEqual(
    hashProjectInput(hashInput),
    hashProjectInput({ ...hashInput, name: "另一项目" }),
  );
});

function requestFor({ body, headers = {}, method = "GET", url }) {
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

test("project HTTP routes preserve owner context across create, list, read, and update", async () => {
  const calls = [];
  const project = {
    batches: [],
    createdAt: new Date(0).toISOString(),
    id: PROJECT_ID,
    name: validSave.name,
    state: validSave.state,
    updatedAt: new Date(0).toISOString(),
  };
  const operations = {
    async createProject(input) {
      calls.push({ operation: "create", ...input });
      return project;
    },
    async listProjects(input) {
      calls.push({ operation: "list", ...input });
      return { projects: [] };
    },
    async readProject(input) {
      calls.push({ operation: "read", ...input });
      if (input.ownerContext.ownerId !== "owner-a") {
        throw new ProjectRequestError("PROJECT_NOT_FOUND", "未找到该项目。", 404);
      }
      return project;
    },
    async updateProject(input) {
      calls.push({ operation: "update", ...input });
      return project;
    },
  };
  const handler = createProjectNodeApiHandler({
    authenticate: async (request) => ({
      ownerId: request.headers["x-owner"] ?? "owner-a",
    }),
    operations,
  });

  const listResponse = responseRecorder();
  assert.equal(
    await handler(requestFor({ url: "/api/projects" }), listResponse),
    true,
  );
  assert.equal(listResponse.statusCode, 200);
  assert.deepEqual(JSON.parse(listResponse.body), { projects: [] });

  const createResponse = responseRecorder();
  await handler(
    requestFor({
      body: validSave,
      headers: { "idempotency-key": "project_save_12345678" },
      method: "POST",
      url: "/api/projects",
    }),
    createResponse,
  );
  assert.equal(createResponse.statusCode, 201);
  assert.equal(calls[1].idempotencyKey, "project_save_12345678");
  assert.equal(calls[1].ownerContext.ownerId, "owner-a");

  const readResponse = responseRecorder();
  await handler(
    requestFor({ url: `/api/projects/${PROJECT_ID}` }),
    readResponse,
  );
  assert.equal(readResponse.statusCode, 200);
  assert.equal(calls[2].projectId, PROJECT_ID);

  const updateResponse = responseRecorder();
  await handler(
    requestFor({
      body: validSave,
      method: "PATCH",
      url: `/api/projects/${PROJECT_ID}`,
    }),
    updateResponse,
  );
  assert.equal(updateResponse.statusCode, 200);
  assert.equal(calls[3].ownerContext.ownerId, "owner-a");

  const crossOwnerResponse = responseRecorder();
  await handler(
    requestFor({
      headers: { "x-owner": "owner-b" },
      url: `/api/projects/${PROJECT_ID}`,
    }),
    crossOwnerResponse,
  );
  assert.equal(crossOwnerResponse.statusCode, 404);
  assert.equal(JSON.parse(crossOwnerResponse.body).error.code, "PROJECT_NOT_FOUND");
});

test("M4 project migration owns resumable state and generation ordering", async () => {
  const [migration, schema, repository, page] = await Promise.all([
    readFile(new URL("../migrations/0004_m4_projects.sql", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../server/projects/repository.mjs", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS projects/);
  assert.match(migration, /create_idempotency_key text NOT NULL/);
  assert.match(migration, /reference_snapshot jsonb NOT NULL/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects/);
  assert.match(migration, /projects_owner_create_idempotency_unique/);
  assert.match(schema, /export const projects = pgTable/);
  assert.match(repository, /ORDER BY updated_at DESC/);
  assert.match(page, /projectAssetBatches/);
  assert.match(page, /新建创作/);
  assert.match(page, /projectsLoading/);
  assert.match(page, /projectSaveError/);
});
