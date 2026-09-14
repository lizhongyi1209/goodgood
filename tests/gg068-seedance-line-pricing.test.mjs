import assert from "node:assert/strict";
import test from "node:test";
import {
  validateManagedModel,
  saveManagedModel,
  readManagedModels,
} from "../server/admin/models.mjs";
import {
  modelVideoLines,
  seedanceResolutions,
} from "../shared/contracts/seedance-models.mjs";
import {
  seedanceListPrices,
  calculateTokenQuote,
} from "../shared/contracts/seedance-token-pricing.mjs";
import { MODEL_TEMPLATES } from "../shared/contracts/model-pricing.mjs";
import { buildO1KeySeedanceVideoPayload } from "../server/video/o1key-seedance-adapter.mjs";
const ownerContext = { ownerId: "owner", systemRole: "site_owner" };
const make = () => ({
  id: "seedance-2-5",
  adapterId: "seedance-2-5",
  name: "Seedance 2.5",
  description: "",
  enabled: true,
  version: 1,
  prices: seedanceListPrices("seedance-2-5"),
});
test("GG-068 video lines preserve legacy rates then validate independent prices and availability", () => {
  const original = make();
  const lines = modelVideoLines(original);
  lines.backup.prices["1080p"].output = 6160;
  assert.equal(original.prices["1080p"].output, 7700);
  assert.equal(lines.standard.prices["1080p"].output, 7700);
  const configured = validateManagedModel({ ...original, videoLines: lines });
  assert.equal(configured.videoLines.backup.prices["1080p"].output, 6160);
  assert.deepEqual(
    calculateTokenQuote(configured.videoLines.backup.prices, {
      resolution: "1080p",
      completionTokens: 1000000,
      hasReferenceVideo: false,
    }),
    { credits: 6160, yuan: "61.60" },
  );
  for (const videoLines of [
    { ...lines, extra: lines.standard },
    { standard: lines.standard },
    {
      standard: { enabled: false, prices: {} },
      backup: { enabled: false, prices: {} },
    },
    { ...lines, backup: { enabled: true, prices: {} } },
  ])
    assert.throws(
      () => validateManagedModel({ ...original, videoLines }),
      (e) => e.code === "MODEL_REQUEST_INVALID",
    );
  assert.equal(
    validateManagedModel({
      ...original,
      videoLines: {
        standard: { enabled: false, prices: {} },
        backup: lines.backup,
      },
    }).videoLines.standard.enabled,
    false,
  );
  assert.equal(modelVideoLines({ adapterId: "nano-banana-2" }), null);
});
test("GG-068 token line configuration persists together and public roundtrip retains both rates", async () => {
  const input = make();
  input.videoLines = modelVideoLines(input);
  input.videoLines.backup.prices["720p"].input = 2100;
  let stored = {
    ...input,
    media_type: "video",
    adapter_id: input.adapterId,
    lines: input.videoLines,
    updated_at: new Date(),
  };
  const calls = [];
  const client = {
    async query(sql, values) {
      calls.push({ sql, values });
      if (sql.startsWith("SELECT * FROM managed_models"))
        return { rows: [stored] };
      if (sql.startsWith("INSERT INTO managed_models")) {
        stored = {
          ...stored,
          videoLines: undefined,
          prices: JSON.parse(values[6]),
          lines: JSON.parse(values[7]),
          version: 2,
        };
        return { rows: [stored] };
      }
      return { rows: [], rowCount: 1 };
    },
    release() {},
  };
  const result = await saveManagedModel({
    ownerContext,
    input,
    resources: { pool: { connect: async () => client } },
  });
  assert.equal(result.model.videoLines.backup.prices["720p"].input, 2100);
  assert.equal(result.model.videoLines.standard.prices["720p"].input, 4200);
  assert.equal(
    calls.filter((c) => c.sql.includes("INSERT INTO managed_model_events"))
      .length,
    1,
  );
  assert.equal(
    calls.some((c) => c.sql.includes("INSERT INTO price_versions")),
    false,
  );
  const directory = await readManagedModels({
    ownerContext,
    resources: { pool: { query: async () => ({ rows: [stored] }) } },
  });
  assert.deepEqual(directory.models[0].videoLines, result.model.videoLines);
});
test("GG-068 Seedance 2.5 ranks first, exposes 1080p and preserves exact route requests", () => {
  assert.equal(
    MODEL_TEMPLATES.filter((t) => t.mediaType === "video")[0].id,
    "seedance-2-5",
  );
  assert.deepEqual(seedanceResolutions("seedance-2-5"), [
    "480p",
    "720p",
    "1080p",
  ]);
  const input = {
    duration: 5,
    generateAudio: false,
    generationMode: "multimodal",
    modelId: "seedance-2-5",
    prompt: "test",
    ratio: "16:9",
    references: [],
    resolution: "1080p",
  };
  for (const line of ["standard", "backup"])
    assert.equal(
      buildO1KeySeedanceVideoPayload({ ...input, line }).resolution,
      "1080p",
    );
  assert.throws(() =>
    buildO1KeySeedanceVideoPayload({
      ...input,
      line: "standard",
      resolution: "4K",
    }),
  );
  assert.throws(() =>
    buildO1KeySeedanceVideoPayload({
      ...input,
      line: "backup",
      modelId: "seedance-2-0-fast",
    }),
  );
});
