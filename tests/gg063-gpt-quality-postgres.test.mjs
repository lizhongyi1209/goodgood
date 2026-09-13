import assert from "node:assert/strict";
import test from "node:test";
import { generationProviderRouteForModel } from "../server/generation/provider-router.mjs";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { applyMigrations } from "../server/persistence/migrate.mjs";
import { saveManagedModel } from "../server/admin/models.mjs";
import { readBillingSummary } from "../server/billing/api.mjs";
import {
  grantCredits,
  findCreditAccount,
} from "../server/billing/repository.mjs";
import {
  createGenerationJob,
  claimGenerationJob,
  completeGenerationJob,
  failGenerationJob,
} from "../server/generation/repository.mjs";
import { gptPricingQualities } from "../shared/contracts/gpt-quality-pricing.mjs";
import { validateDraftMutation } from "../server/drafts/validation.mjs";
import {
  saveCreationDraft,
  findCreationDraft,
} from "../server/drafts/repository.mjs";
import { createProject, findProject } from "../server/projects/repository.mjs";
const enabled = process.env.GOODGOOD_GG063_INTEGRATION === "1",
  databaseUrl = process.env.GOODGOOD_GG063_DATABASE_URL;
if (enabled) {
  const target = new URL(databaseUrl ?? "missing://target");
  if (
    !["127.0.0.1", "localhost"].includes(target.hostname) ||
    !/^\/goodgood_gg063_quality_test\w*$/.test(target.pathname) ||
    process.env.GOODGOOD_GG063_NO_WORKER !== "1"
  )
    throw Error(
      "GG-063 requires a named disposable no-Worker loopback database.",
    );
}
test(
  "GG-063 SQL quality quotes pin personal reservations, release failures and restore max",
  { skip: !enabled, timeout: 40000 },
  async (context) => {
    const pool = new pg.Pool({ connectionString: databaseUrl });
    context.after(() => pool.end());
    assert.equal(
      (await pool.query("select current_database() as name")).rows[0].name,
      new URL(databaseUrl).pathname.slice(1),
    );
    await applyMigrations({ databaseUrl, logger: { log() {} } });
    const ownerId = randomUUID();
    await pool.query(
      "insert into users(id,email,status) values($1,$2,'active')",
      [ownerId, `${ownerId}@goodgood.invalid`],
    );
    const ownerContext = { ownerId, systemRole: "site_owner" };
    await grantCredits(pool, {
      ownerId,
      amount: 10000n,
      idempotencyKey: "gg063-grant",
      reason: "isolated test",
      actor: "system",
    });
    for (const adapterId of [
      "gpt-image-2",
      "gpt-image-2.5-sunburst",
      "gpt-image-2.5-flare",
    ]) {
      const prices = Object.fromEntries(
        ["1K", "2K", "4K"].map((res) => [
          res,
          {
            output: 200,
            qualities: Object.fromEntries(
              gptPricingQualities(adapterId).map((item, index) => [
                item.id,
                5 + index * 10,
              ]),
            ),
          },
        ]),
      );
      let model = (
        await saveManagedModel({
          ownerContext,
          resources: { pool },
          input: {
            id: `gg063-${adapterId}`,
            adapterId,
            name: adapterId,
            description: "",
            enabled: true,
            version: null,
            prices: {},
            lines: {
              special: { enabled: false, prices: {} },
              quality: { enabled: false, prices: {} },
              dedicated: { enabled: true, prices },
            },
          },
        })
      ).model;
      const quotes = (
        await readBillingSummary({ ownerContext, resources: { pool } })
      ).quotes.filter((q) => q.catalogModelId === model.id);
      assert.equal(
        quotes.length,
        (gptPricingQualities(adapterId).length + 1) * 9,
      );
      for (const quality of [
        "auto",
        ...gptPricingQualities(adapterId).map((item) => item.id),
      ]) {
        const input = {
          prompt: "isolated",
          modelId: adapterId,
          catalogModelId: model.id,
          aspectRatio: "1:1",
          resolution: "2K",
          count: 4,
          references: [],
          imageLine: "dedicated",
          quality,
        };
        const quote = quotes.find(
          (q) =>
            q.quality === quality && q.resolution === "2K" && q.count === 4,
        );
        input.expectedPriceVersion = quote.priceVersion;
        const job = await createGenerationJob(pool, {
          ownerId,
          idempotencyKey: `${adapterId}-${quality}`,
          input,
        });
        const pin = (
          await pool.query(
            "select quoted_credit_amount,price_version_id,quality from generation_batches where id=$1",
            [job.row.batch_id],
          )
        ).rows[0];
        assert.equal(pin.quoted_credit_amount, quote.creditAmount);
        assert.equal(pin.quality, quality);
        const workerId = "gg063-no-worker-fixture";
        const claimed = await claimGenerationJob(pool, {
          jobId: job.row.id,
          workerId,
          leaseMs: 3000,
          attemptRouteForModel: (modelId, line) =>
            generationProviderRouteForModel("mock", modelId, line),
        });
        await failGenerationJob(pool, {
          jobId: job.row.id,
          workerId,
          attemptId: claimed.attempt.id,
          error: {
            code: "PROVIDER_FAILED",
            title: "Synthetic",
            message: "no provider call",
            retryable: true,
          },
        });
        assert.equal(
          (await findCreditAccount(pool, { ownerId })).reservedBalance,
          0n,
        );
      }
      const quality = gptPricingQualities(adapterId).at(-1).id;
      const state = {
        prompt: "restore",
        modelId: adapterId,
        catalogModelId: model.id,
        aspectRatio: "1:1",
        resolution: "1K",
        count: 1,
        references: [],
        imageLine: "dedicated",
        quality,
        thinkingLevel: "low",
        googleSearch: false,
        background: "auto",
        outputFormat: "png",
      };
      const project = await createProject(pool, {
        ownerId,
        batchIds: [],
        state,
        name: "quality restore",
        idempotencyKey: `gg063-project-${adapterId}`,
      });
      assert.equal(
        (await findProject(pool, { ownerId, projectId: project.id })).quality,
        quality,
      );
      const previous = await findCreationDraft(pool, { ownerId });
      await saveCreationDraft(pool, {
        ownerId,
        ...validateDraftMutation({
          state,
          expectedVersion: previous?.version ?? null,
        }),
      });
      assert.equal(
        (await findCreationDraft(pool, { ownerId })).quality,
        quality,
      );
      const job = await createGenerationJob(pool, {
        ownerId,
        idempotencyKey: `gg063-pin-${adapterId}`,
        input: state,
      });
      const before = (
        await pool.query(
          "select price_version_id,quoted_credit_amount from generation_batches where id=$1",
          [job.row.batch_id],
        )
      ).rows[0];
      const revisedPrices = Object.fromEntries(
        Object.entries(model.lines.dedicated.prices).map(
          ([resolution, price]) => [
            resolution,
            {
              ...price,
              qualities: Object.fromEntries(
                Object.entries(price.qualities).map(([id, amount]) => [
                  id,
                  amount + 7,
                ]),
              ),
            },
          ],
        ),
      );
      model = (
        await saveManagedModel({
          ownerContext,
          resources: { pool },
          input: {
            ...model,
            lines: {
              ...model.lines,
              dedicated: { ...model.lines.dedicated, prices: revisedPrices },
            },
          },
        })
      ).model;
      const staleQuote = quotes.find(
        (q) => q.quality === quality && q.resolution === "1K" && q.count === 1,
      );
      await assert.rejects(
        createGenerationJob(pool, {
          ownerId,
          idempotencyKey: `gg063-stale-${adapterId}`,
          input: { ...state, expectedPriceVersion: staleQuote.priceVersion },
        }),
        (error) => error.code === "PRICE_CHANGED",
      );
      model = (
        await saveManagedModel({
          ownerContext,
          resources: { pool },
          input: { ...model, enabled: false },
        })
      ).model;
      assert.deepEqual(
        (
          await pool.query(
            "select price_version_id,quoted_credit_amount from generation_batches where id=$1",
            [job.row.batch_id],
          )
        ).rows[0],
        before,
      );
      await assert.rejects(
        createGenerationJob(pool, {
          ownerId,
          idempotencyKey: `gg063-disabled-${adapterId}`,
          input: state,
        }),
        (error) => error.code === "MODEL_DISABLED",
      );
      const workerId = "gg063-no-worker-fixture",
        claimed = await claimGenerationJob(pool, {
          jobId: job.row.id,
          workerId,
          leaseMs: 3000,
          attemptRouteForModel: (modelId, line) =>
            generationProviderRouteForModel("mock", modelId, line),
        });
      const completion = {
        jobId: job.row.id,
        workerId,
        attemptId: claimed.attempt.id,
        resultHash: "f".repeat(64),
        assets: [
          {
            id: randomUUID(),
            ownerId,
            batchId: job.row.batch_id,
            ordinal: 1,
            objectKey: `gg063-synthetic/${job.row.id}.png`,
            checksum: "c".repeat(64),
            mimeType: "image/png",
            pixelWidth: 1,
            pixelHeight: 1,
            aspectRatio: 1,
            byteSize: 68,
          },
        ],
      };
      assert.equal(
        (await completeGenerationJob(pool, completion)).completed,
        true,
      );
      assert.equal(
        (await completeGenerationJob(pool, completion)).reason,
        "already_succeeded",
      );
    }
    assert.equal(
      (await findCreditAccount(pool, { ownerId })).availableBalance,
      9885n,
    );
  },
);
