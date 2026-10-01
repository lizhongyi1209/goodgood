import assert from "node:assert/strict";
import test from "node:test";
import { readCreditActivities, readPreviewCreditActivities } from "../server/billing/activity-api.mjs";
import { listCreditActivities } from "../server/billing/activity-repository.mjs";
import { validateM3GenerationInput } from "../server/generation/api.mjs";
import { generationInputFromRow, hashGenerationInput, persistedGenerationInputFromRow,
  requireCanvasGenerationProject } from "../server/generation/repository.mjs";

const ownerId = "70000000-0000-4000-8000-000000000001";
const workspaceId = "70000000-0000-4000-8000-000000000002";
const canvasId = "70000000-0000-4000-8000-000000000003";
const input = { prompt: "test", references: [], modelId: "nano-banana-2", aspectRatio: "1:1",
  resolution: "1K", count: 1, routingPolicy: "canvas-image-v1" };

test("canvas project source is validated separately from classic projects", () => {
  assert.equal(validateM3GenerationInput({ ...input, canvasProjectId: canvasId }).canvasProjectId, canvasId);
  assert.equal("canvasProjectId" in validateM3GenerationInput(input), false);
  for (const canvasProjectId of ["bad", 4, {}]) assert.throws(() =>
    validateM3GenerationInput({ ...input, canvasProjectId }), (error) => error.code === "CANVAS_PROJECT_NOT_FOUND");
  assert.throws(() => validateM3GenerationInput({ ...input, canvasProjectId: canvasId, projectId: ownerId }),
    (error) => error.code === "INVALID_PROJECT_CONTEXT");
  assert.throws(() => validateM3GenerationInput({ ...input, routingPolicy: undefined, canvasProjectId: canvasId }),
    (error) => error.code === "INVALID_PROJECT_CONTEXT");
});

test("source identity participates in idempotency while absent/null preserves old hashes", () => {
  const normalized = validateM3GenerationInput(input);
  const baseline = hashGenerationInput(normalized);
  assert.equal(hashGenerationInput({ ...normalized, canvasProjectId: null }), baseline);
  assert.notEqual(hashGenerationInput({ ...normalized, canvasProjectId: canvasId }), baseline);
  assert.notEqual(hashGenerationInput({ ...normalized, canvasProjectId: canvasId }),
    hashGenerationInput({ ...normalized, canvasProjectId: ownerId }));
});

test("persisted recovery and public job input retain explicit canvas identity, never infer old identities", () => {
  const row = { aspect_ratio: "1:1", requested_count: 1, model_id: "nano-banana-2", prompt: "test",
    reference_snapshot: [], resolution: "1K", canvas_project_id: canvasId, provider_routing_policy: "canvas-image-v1" };
  assert.equal(persistedGenerationInputFromRow(row).canvasProjectId, canvasId);
  assert.equal(generationInputFromRow(row).canvasProjectId, canvasId);
  assert.equal("canvasProjectId" in persistedGenerationInputFromRow({ ...row, canvas_project_id: null }), false);
});

test("canvas source lookup requires owner/workspace and excludes tombstones under the submission lock", async () => {
  const calls = [];
  const project = { id: canvasId, name: "original project" };
  const client = { query: async (sql, values) => {
    calls.push({ sql, values });
    return { rowCount: 1, rows: [project] };
  } };
  assert.equal(await requireCanvasGenerationProject(client, { ownerId, workspaceId, canvasProjectId: canvasId }), project);
  assert.deepEqual(calls[0].values, [canvasId, workspaceId, ownerId]);
  assert.match(calls[0].sql, /canvas\.workspace_id = \$2 AND canvas\.owner_id = \$3/);
  assert.match(calls[0].sql, /NOT EXISTS[\s\S]*canvas_project_deletions[\s\S]*deleted\.owner_id = canvas\.owner_id/);
  assert.match(calls[0].sql, /FOR SHARE OF canvas/);
  await assert.rejects(requireCanvasGenerationProject({ query: async () => ({ rowCount: 0, rows: [] }) },
    { ownerId, workspaceId, canvasProjectId: canvasId }), (error) => error.code === "CANVAS_PROJECT_NOT_FOUND" && error.status === 404);
});

test("credit activity exposes only real joined task/project/model provenance and preserves legacy reference", async () => {
  const jobId = "70000000-0000-4000-8000-000000000004";
  const base = { id: ownerId, entry_type: "reserve", amount: "-20", unit: "credit-cny-cent",
    created_at: "2026-10-01T00:00:00Z", close_entry_type: "settle", image_job_id: jobId,
    activity_project_id: canvasId, activity_project_name: "frozen source", generation_model_name: "actual model" };
  const rows = [base, { ...base, id: workspaceId, activity_project_id: null, activity_project_name: null,
    generation_model_name: null }, { ...base, id: canvasId, entry_type: "grant", amount: "200", image_job_id: null,
    metadata: { taskId: "invented", batchReference: "legacy-video-ref", activityCategory: "video_generation" } }];
  const result = await listCreditActivities({ query: async () => ({ rows }) }, { ownerId });
  assert.equal(result.items[0].taskId, jobId);
  assert.equal(result.items[0].batchReference, jobId);
  assert.equal(result.items[0].projectId, canvasId);
  assert.equal(result.items[0].projectName, "frozen source");
  assert.equal(result.items[0].modelName, "actual model");
  assert.equal(result.items[1].projectId, null);
  assert.equal(result.items[1].modelName, null);
  assert.deepEqual(Object.fromEntries(["taskId", "projectId", "projectName", "modelName"].map((key) =>
    [key, result.items[2][key]])), { taskId: null, projectId: null, projectName: null, modelName: null });
  assert.equal(result.items[2].batchReference, "legacy-video-ref");
});

test("usage view filters releases/refunds before LIMIT with real scope joins and one lookahead record", async () => {
  const calls = [];
  await listCreditActivities({ query: async (sql, values) => { calls.push({ sql, values }); return { rows: [] }; } },
    { ownerId, view: "usage", limit: 20 });
  assert.equal(calls[0].values[4], 21);
  assert.equal(calls[0].values[5], true);
  assert.match(calls[0].sql, /entry\.entry_type <> 'refund'[\s\S]*= 'release'[\s\S]*ORDER BY[\s\S]*LIMIT/);
  assert.match(calls[0].sql, /project\.creator_owner_id = entry\.owner_id/);
  assert.match(calls[0].sql, /canvas\.owner_id = entry\.owner_id/);
  assert.match(calls[0].sql, /batch\.source_project_name/);
});

function repository() {
  const calls = [];
  return { calls, findCreditAccount: async () => ({ status: "active", availableBalance: 100n,
    reservedBalance: 0n, unit: "credit-cny-cent", version: 1n }),
    listCreditActivities: async (_pool, query) => { calls.push(query); return { items: [],
      next: { activityId: "act_11111111111111111111111111111111", createdAt: "2026-10-01T00:00:00Z" } }; },
    summarizeCreditActivitySpend: async () => ({ today: "0", thisWeek: "0", thisMonth: "0" }) };
}

test("usage cursor binds filter/view while old ledger cursor and 50-row limit remain compatible", async () => {
  const store = repository();
  const read = (query) => readCreditActivities({ input: query, ownerContext: { ownerId }, repository: store, resources: { pool: {} } });
  const usage = await read({ view: "usage", limit: 20, filter: "all" });
  assert.equal(store.calls[0].ownerId, ownerId);
  assert.equal(JSON.parse(Buffer.from(usage.nextCursor, "base64url")).view, "usage");
  await read({ view: "usage", filter: "all", cursor: usage.nextCursor });
  for (const query of [{ view: "ledger", cursor: usage.nextCursor }, { view: "usage", filter: "spend", cursor: usage.nextCursor },
    { view: "usage", limit: 21 }, { view: "unknown" }]) await assert.rejects(read(query), (error) => error.code === "CREDIT_ACTIVITY_REQUEST_INVALID");
  const old = await read({ limit: 50 });
  assert.equal("view" in JSON.parse(Buffer.from(old.nextCursor, "base64url")), false);
  await read({ cursor: old.nextCursor });
  await assert.rejects(read({ view: "usage", cursor: old.nextCursor }), (error) => error.code === "CREDIT_ACTIVITY_REQUEST_INVALID");
});

test("activity reads reject absent ownership and cursor resolution never crosses owners", async () => {
  let called = false;
  await assert.rejects(readCreditActivities({ repository: { findCreditAccount: () => { called = true; } } }),
    (error) => error.code === "SESSION_EXPIRED");
  assert.equal(called, false);
  await assert.rejects(listCreditActivities({ query: async (_sql, values) => {
    assert.equal(values[0], ownerId); return { rowCount: 0, rows: [] };
  } }, { ownerId, view: "usage", cursor: { activityId: "act_11111111111111111111111111111111",
    createdAt: "2026-10-01T00:00:00Z" } }), (error) => error.code === "CREDIT_ACTIVITY_REQUEST_INVALID");
});

test("preview usage omits returned rows without inventing model/project/task sources", () => {
  const page = readPreviewCreditActivities({ input: { view: "usage" } });
  assert.ok(page.items.every((item) => !["released", "refunded"].includes(item.status)));
  assert.ok(page.items.every((item) => item.taskId === null && item.projectId === null && item.modelName === null));
  assert.ok(readPreviewCreditActivities({ input: { filter: "return" } }).items.some((item) => item.status === "released"));
});
