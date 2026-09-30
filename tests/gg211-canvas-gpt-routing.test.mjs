import assert from "node:assert/strict";
import test from "node:test";
import { createUsGatewayAdapter, getCanvasImageRoute, getUsGatewayRoute, isExplicitImageChannelRejection } from "../server/generation/us-gateway-adapter.mjs";
import { generationProviderRouteForModel, generationProviderFallbackRoute } from "../server/generation/provider-router.mjs";
import { createProviderFallbackAttempt, hashGenerationInput, persistedGenerationInputFromRow } from "../server/generation/repository.mjs";

const models = ["gpt-image-2", "gpt-image-2.5-sunburst", "gpt-image-2.5-flare"];
const canvasJob = (modelId, resolution = "4K") => ({
  model_id: modelId, image_line: "special", resolution,
  provider_routing_policy: "canvas-image-v1", requested_count: 1,
  aspect_ratio: "1:1", prompt: "isolated contract fixture", quality: "medium",
  background: "transparent", output_format: "png", reference_snapshot: [],
});

test("canvas GPT routes use documented resolution IDs and retain old accepted routes", () => {
  for (const modelId of models) {
    const channelModel = modelId === "gpt-image-2" ? `${modelId}-c` : modelId;
    for (const resolution of ["1K", "2K", "4K"]) {
      const job = canvasJob(modelId, resolution);
      const route = generationProviderRouteForModel("o1key", modelId, "special", job);
      assert.equal(route.providerModel, `${channelModel}-${resolution === "4K" ? "sd" : "sp"}`);
      const fallback = generationProviderFallbackRoute("o1key", route, job);
      assert.equal(fallback?.providerModel ?? null, resolution === "4K" ? modelId : null);
      if (fallback) {
        assert.equal(generationProviderFallbackRoute("o1key", fallback, job), null);
        assert.equal(generationProviderRouteForModel("o1key", modelId, "special", job, {
          provider_model: fallback.providerModel, route_version: fallback.routeVersion,
        }), fallback);
      }
    }
    assert.equal(generationProviderRouteForModel("o1key", modelId, "special", {}), getUsGatewayRoute(modelId, "special"));
    assert.equal(generationProviderRouteForModel("o1key", modelId, undefined, {}), getUsGatewayRoute(modelId));
  }
});

test("fallback classification accepts only definite no-channel rejection without an accepted task", () => {
  assert.equal(isExplicitImageChannelRejection({ error: { code: "no_available_channel" } }, 503), true);
  assert.equal(isExplicitImageChannelRejection({ error: { message: "无可用渠道" } }, 400), true);
  for (const [status, payload] of [
    [503, { error: { message: "upstream timed out" } }],
    [503, { error: { message: "no available channel" }, task_id: "accepted" }],
    [200, { error: { message: "no available channel" }, data: { task_id: "accepted" } }],
    [401, { error: { code: "no_available_channel" } }],
    [429, { error: { code: "no_available_channel" } }],
    [400, { error: { message: "no available channel: invalid size parameter" } }],
    [503, { error: { message: "no available channel: insufficient balance" } }],
    [503, { message: "no available channel" }],
    [200, { task_id: "accepted" }],
    [502, null],
  ]) assert.equal(isExplicitImageChannelRejection(payload, status), false);
});

test("adapter freezes quality, transparent PNG and exact pixels into the selected provider request", async () => {
  for (const modelId of models) {
    const route = getCanvasImageRoute(modelId, "4K");
    let body;
    const adapter = createUsGatewayAdapter({
      apiKey: "test-only-not-a-provider-key", baseUrl: "https://provider.example.invalid",
      route, fetchImplementation: async (_url, options) => {
        body = JSON.parse(options.body);
        return new Response(JSON.stringify({ task_id: "fixture" }), { status: 200 });
      },
    });
    await adapter.submitPrepared({ job: canvasJob(modelId), uploadedReferences: [] });
    assert.equal(body.model, route.providerModel);
    assert.equal(body.n, 1);
    assert.equal(body.quality, "medium");
    assert.equal(body.background, "transparent");
    assert.equal(body.output_format, "png");
    assert.equal(body.size, "4096x4096");
  }
});

test("routing policy survives history reconstruction and changes new input identity only", () => {
  const input = { modelId: "gpt-image-2", prompt: "fixture", references: [], aspectRatio: "1:1", resolution: "4K", count: 1 };
  assert.notEqual(hashGenerationInput(input), hashGenerationInput({ ...input, routingPolicy: "canvas-image-v1" }));
  const row = { ...canvasJob("gpt-image-2"), project_id: null };
  assert.equal(persistedGenerationInputFromRow(row).routingPolicy, "canvas-image-v1");
  assert.equal(Object.hasOwn(persistedGenerationInputFromRow({ ...row, provider_routing_policy: null }), "routingPolicy"), false);
});

test("fallback transaction records a distinct pinned attempt and never changes billing reservation", async () => {
  const fromRoute = getCanvasImageRoute("gpt-image-2", "4K");
  const toRoute = getCanvasImageRoute("gpt-image-2", "4K", { fallback: true });
  const queries = [];
  const job = { ...canvasJob("gpt-image-2"), id: "job", state: "running", lease_owner: "worker", attempt_count: 1, input_hash: "hash" };
  const client = {
    async query(sql, values) {
      queries.push({ sql, values });
      if (sql.includes("FOR UPDATE OF j")) return { rows: [job], rowCount: 1 };
      if (sql.startsWith("UPDATE generation_attempts")) return { rows: [{ id: "primary" }], rowCount: 1 };
      if (sql.includes("INSERT INTO generation_attempts")) return { rows: [{ id: "backup", ordinal: values[2], state: "created" }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    }, release() {},
  };
  const attempt = await createProviderFallbackAttempt({ connect: async () => client }, {
    jobId: "job", workerId: "worker", attemptId: "primary", fromRoute, toRoute,
  });
  assert.equal(attempt.ordinal, 2);
  assert.equal(attempt.state, "created");
  const insert = queries.find(({ sql }) => sql.includes("INSERT INTO generation_attempts"));
  assert.equal(insert.values[5], "gpt-image-2");
  assert.equal(insert.values[3], toRoute.routeVersion);
  assert.ok(queries.some(({ sql }) => sql.includes("provider_task_id IS NULL AND state = 'submitted'")));
  assert.ok(queries.some(({ sql }) => sql.includes("INSERT INTO generation_job_events")));
  assert.equal(queries.at(-1).sql, "COMMIT");
  assert.equal(queries.some(({ sql }) => /credit_reservation|credit_account|credit_ledger/.test(sql)), false);
  job.lease_owner = "other-worker";
  assert.equal(await createProviderFallbackAttempt({ connect: async () => client }, {
    jobId: "job", workerId: "worker", attemptId: "primary", fromRoute, toRoute,
  }), null);
  assert.equal(queries.at(-1).sql, "ROLLBACK");
});
