import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import test from "node:test";
import {
  readCreditActivities,
  readPreviewCreditActivities,
} from "../server/billing/activity-api.mjs";
import {
  listCreditActivities,
  summarizeCreditActivitySpend,
} from "../server/billing/activity-repository.mjs";
import { BillingPersistenceError } from "../server/billing/repository.mjs";
import { createBillingNodeApiHandler } from "../server/billing/node-api.mjs";
import {
  parseWorkspaceRoute,
  workspaceRouteHref,
} from "../features/navigation/workspace-route.mjs";

const OWNER_ID = "70000000-0000-4000-8000-000000000001";
const CREATED_AT = "2026-09-09T06:31:42.000Z";

function activityRow(overrides = {}) {
  return {
    amount: "-40",
    close_entry_type: "settle",
    closed_at: "2026-09-09T06:32:18.000Z",
    created_at: CREATED_AT,
    entry_type: "reserve",
    id: "71000000-0000-4000-8000-000000000001",
    image_job_id: "73000000-0000-4000-8000-000000000001",
    metadata: {},
    model_id: "nano-banana-2",
    prompt: "  清晨薄雾中的现代建筑  ",
    reason: "generation_reservation",
    related_payment_ref: null,
    requested_count: 4,
    resolution: "2K",
    result_asset_id: "72000000-0000-4000-8000-000000000001",
    unit: "credit-cny-cent",
    ...overrides,
  };
}

function account() {
  return {
    availableBalance: 80n,
    reservedBalance: 20n,
    status: "active",
    unit: "credit-cny-cent",
    version: 5n,
  };
}

test("credit activity repository turns reservation lifecycles into one user record", async () => {
  const rows = [
    activityRow(),
    activityRow({
      amount: "-20",
      close_entry_type: null,
      closed_at: null,
      id: "71000000-0000-4000-8000-000000000002",
      requested_count: 2,
      result_asset_id: null,
    }),
    activityRow({
      close_entry_type: "release",
      id: "71000000-0000-4000-8000-000000000003",
      result_asset_id: null,
    }),
    activityRow({
      amount: "100",
      close_entry_type: null,
      closed_at: null,
      entry_type: "grant",
      id: "71000000-0000-4000-8000-000000000004",
      image_job_id: null,
      metadata: { campaign: "welcome-v1" },
      model_id: null,
      prompt: null,
      reason: "welcome_grant_v1",
      requested_count: null,
      resolution: null,
      result_asset_id: null,
    }),
    activityRow({
      amount: "500",
      close_entry_type: null,
      closed_at: null,
      entry_type: "grant",
      id: "71000000-0000-4000-8000-000000000005",
      image_job_id: null,
      metadata: { grantKind: "seed_test_credit" },
      model_id: null,
      prompt: null,
      reason: "alpha test grant",
      requested_count: null,
      resolution: null,
      result_asset_id: null,
    }),
    activityRow({
      amount: "40",
      close_entry_type: null,
      closed_at: null,
      entry_type: "refund",
      id: "71000000-0000-4000-8000-000000000006",
      reason: "generation_refund",
    }),
    activityRow({
      amount: "-12",
      close_entry_type: null,
      closed_at: null,
      entry_type: "adjust",
      id: "71000000-0000-4000-8000-000000000007",
      image_job_id: null,
      metadata: {
        activityCategory: "video_generation",
        batchReference: "VID-20260909-0001",
      },
      reason: "video_generation_charge",
    }),
  ];
  const calls = [];
  const pool = {
    async query(sql, values) {
      calls.push({ sql, values });
      return { rowCount: rows.length, rows };
    },
  };

  const result = await listCreditActivities(pool, {
    filter: "all",
    limit: rows.length,
    ownerId: OWNER_ID,
  });

  assert.deepEqual(
    result.items.map(({ amount, kind, status }) => [kind, status, amount]),
    [
      ["generation", "spent", "-40"],
      ["generation", "processing", "-20"],
      ["generation", "released", "0"],
      ["welcome", "credited", "100"],
      ["promotion", "credited", "500"],
      ["refund", "refunded", "40"],
      ["adjustment", "adjusted", "-12"],
    ],
  );
  assert.equal(result.items[0].category, "image_generation");
  assert.equal(result.items[0].batchReference, rows[0].image_job_id);
  assert.equal(result.items[0].creditAmount, "40");
  assert.match(result.items[0].id, /^act_[0-9a-f]{32}$/);
  assert.equal(result.items[0].id.includes(rows[0].id), false);
  assert.equal("reason" in result.items[0], false);
  assert.equal("metadata" in result.items[0], false);
  assert.equal("generation" in result.items[0], false);
  assert.equal("modelId" in result.items[0], false);
  assert.equal(result.items[3].category, "other");
  assert.equal(result.items[3].batchReference, null);
  assert.equal(result.items[6].category, "video_generation");
  assert.equal(result.items[6].batchReference, "VID-20260909-0001");
  assert.equal(calls[0].values[0], OWNER_ID);
  assert.equal(calls[0].values[1], "all");
});

test("credit activity spend summary uses settled debits and Shanghai calendar boundaries", async () => {
  const calls = [];
  const pool = {
    async query(sql, values) {
      calls.push({ sql, values });
      return { rowCount: 1, rows: [{ this_month: "70", this_week: "30", today: "10" }] };
    },
  };
  assert.deepEqual(
    await summarizeCreditActivitySpend(pool, { ownerId: OWNER_ID }),
    { thisMonth: "70", thisWeek: "30", today: "10" },
  );
  assert.deepEqual(calls[0].values, [OWNER_ID, "Asia/Shanghai"]);
  assert.match(calls[0].sql, /closing\.entry_type = 'settle'/);
  assert.match(calls[0].sql, /date_trunc\('week'/);
  assert.doesNotMatch(calls[0].sql, /closing\.entry_type = 'release'\)\s*THEN -entry\.amount/);
});

test("credit activity cursor resolves an owner-scoped public reference before paging", async () => {
  const entryId = "71000000-0000-4000-8000-000000000010";
  const digest = createHash("md5")
    .update(`goodgood-credit-activity-v1:${entryId}`)
    .digest("hex");
  const calls = [];
  const pool = {
    async query(sql, values) {
      calls.push({ sql, values });
      if (calls.length === 1) {
        return {
          rowCount: 1,
          rows: [{ created_at: CREATED_AT, id: entryId }],
        };
      }
      return { rowCount: 0, rows: [] };
    },
  };
  await listCreditActivities(pool, {
    cursor: { activityId: `act_${digest}`, createdAt: CREATED_AT },
    filter: "spend",
    limit: 20,
    ownerId: OWNER_ID,
  });
  assert.match(calls[0].sql, /owner_id = \$1/);
  assert.deepEqual(calls[0].values, [OWNER_ID, CREATED_AT, digest]);
  assert.deepEqual(calls[1].values.slice(0, 4), [
    OWNER_ID,
    "spend",
    CREATED_AT,
    entryId,
  ]);

  await assert.rejects(
    listCreditActivities(
      { query: async () => ({ rowCount: 0, rows: [] }) },
      {
        cursor: { activityId: `act_${digest}`, createdAt: CREATED_AT },
        filter: "all",
        limit: 20,
        ownerId: OWNER_ID,
      },
    ),
    (error) => error instanceof BillingPersistenceError && error.code === "CREDIT_ACTIVITY_REQUEST_INVALID",
  );
});

test("credit activity API validates filters, binds the owner, and keeps ledger IDs out of cursors", async () => {
  const calls = [];
  const repository = {
    async findCreditAccount(_pool, input) {
      calls.push(["account", input]);
      return account();
    },
    async listCreditActivities(_pool, input) {
      calls.push(["activities", input]);
      return {
        items: [
          {
            amount: "-40",
            batchReference: "73000000-0000-4000-8000-000000000001",
            category: "image_generation",
            completedAt: CREATED_AT,
            creditAmount: "40",
            id: "act_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            kind: "generation",
            occurredAt: CREATED_AT,
            status: "spent",
            unit: "credit-cny-cent",
          },
        ],
        next: {
          activityId: "act_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          createdAt: CREATED_AT,
        },
      };
    },
    async summarizeCreditActivitySpend(_pool, input) {
      calls.push(["summary", input]);
      return { thisMonth: "70", thisWeek: "30", today: "10" };
    },
  };
  const page = await readCreditActivities({
    input: { filter: "spend", limit: "20" },
    ownerContext: { ownerId: OWNER_ID },
    repository,
    resources: { pool: {} },
  });
  assert.deepEqual(page.account, {
    availableCredits: "80",
    reservedCredits: "20",
    transferableCredits: "0",
    unit: "credit-cny-cent",
    version: "5",
  });
  assert.equal(calls[1][1].ownerId, OWNER_ID);
  assert.equal(calls[1][1].filter, "spend");
  assert.deepEqual(page.spendSummary, { thisMonth: "70", thisWeek: "30", today: "10" });
  const decodedCursor = Buffer.from(page.nextCursor, "base64url").toString("utf8");
  assert.match(decodedCursor, /act_b{32}/);
  assert.doesNotMatch(decodedCursor, /[0-9a-f]{8}-[0-9a-f]{4}-/i);

  await assert.rejects(
    readCreditActivities({
      input: { filter: "unknown" },
      ownerContext: { ownerId: OWNER_ID },
      repository,
      resources: { pool: {} },
    }),
    (error) => error instanceof BillingPersistenceError && error.code === "CREDIT_ACTIVITY_REQUEST_INVALID",
  );

  const emptyPage = await readCreditActivities({
    ownerContext: { ownerId: OWNER_ID },
    repository: {
      async findCreditAccount() { return account(); },
      async listCreditActivities() { return { items: [], next: null }; },
      async summarizeCreditActivitySpend() { return { thisMonth: "0", thisWeek: "0", today: "0" }; },
    },
    resources: { pool: {} },
  });
  assert.deepEqual(emptyPage.items, []);
  assert.equal(emptyPage.nextCursor, null);

  await assert.rejects(
    readCreditActivities({
      ownerContext: { ownerId: OWNER_ID },
      repository: {
        async findCreditAccount() { return { ...account(), status: "frozen" }; },
        async listCreditActivities() { return { items: [], next: null }; },
        async summarizeCreditActivitySpend() { return { thisMonth: "0", thisWeek: "0", today: "0" }; },
      },
      resources: { pool: {} },
    }),
    (error) => error instanceof BillingPersistenceError && error.code === "CREDIT_ACCOUNT_UNAVAILABLE",
  );
});

test("credit activity preview filters consumption, received credit, and releases", () => {
  const preview = readPreviewCreditActivities();
  assert.equal(preview.account.unit, "credit-cny-cent");
  assert.equal(preview.account.availableCredits, "200");
  assert.equal(preview.items[0].amount, "-20");
  assert.deepEqual(
    readPreviewCreditActivities({ input: { filter: "spend" } }).items.map((item) => item.status),
    ["spent"],
  );
  assert.deepEqual(
    readPreviewCreditActivities({ input: { filter: "receive" } }).items.map((item) => item.kind),
    ["promotion", "welcome"],
  );
  assert.deepEqual(
    readPreviewCreditActivities({ input: { filter: "return" } }).items.map((item) => item.status),
    ["released"],
  );
  assert.deepEqual(readPreviewCreditActivities().spendSummary, {
    thisMonth: "60",
    thisWeek: "20",
    today: "20",
  });
});

function requestFor(url) {
  const request = Readable.from([]);
  request.headers = { "x-owner": OWNER_ID };
  request.method = "GET";
  request.url = url;
  return request;
}

function responseRecorder() {
  return {
    body: "",
    headers: {},
    statusCode: 0,
    end(chunk = "") { this.body += chunk; },
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
  };
}

test("both runtimes and workspace navigation expose the authenticated credit history route", async () => {
  const inputs = [];
  const handler = createBillingNodeApiHandler({
    authenticate: async () => ({ ownerId: OWNER_ID }),
    operations: {
      async readCreditActivities(input) {
        inputs.push(input);
        return { account: {}, items: [], nextCursor: null, spendSummary: {} };
      },
    },
    paymentSandbox: { enabled: false },
  });
  const response = responseRecorder();
  assert.equal(
    await handler(requestFor("/api/billing/activities?filter=return&limit=12"), response),
    true,
  );
  assert.equal(response.statusCode, 200);
  assert.deepEqual(inputs[0].input, {
    cursor: null,
    filter: "return",
    limit: "12",
  });
  assert.equal(response.headers["cache-control"], "no-store");

  assert.deepEqual(parseWorkspaceRoute("/credits/"), { kind: "credits" });
  assert.equal(workspaceRouteHref({ kind: "credits" }), "/credits");

  const [route, pageEntry, page, view, boundary, contract, runtime] = await Promise.all([
    readFile(new URL("../app/api/billing/activities/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/credits/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/billing/credit-activity-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/billing/http-billing-boundary.ts", import.meta.url), "utf8"),
    readFile(new URL("../shared/contracts/billing.ts", import.meta.url), "utf8"),
    readFile(new URL("../server/runtime/web.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(route, /await readCreditActivities/);
  assert.match(route, /readPreviewCreditActivities/);
  assert.match(pageEntry, /export \{ default \} from "\.\.\/page"/);
  assert.match(page, /handleCreditsNav/);
  assert.match(page, /activeView === "credits"/);
  assert.doesNotMatch(page, /source: "credits"/);
  assert.match(view, /credit-activity-skeleton/);
  assert.match(view, /credit-activity-error/);
  assert.match(view, /credit-activity-empty/);
  assert.match(view, /loadMoreError/);
  assert.match(view, /page\.nextCursor/);
  assert.match(view, /积分记录/);
  assert.match(view, /今日消耗/);
  assert.match(view, /本周消耗/);
  assert.match(view, /本月消耗/);
  assert.match(view, /图片生成/);
  assert.match(view, /视频生成/);
  assert.match(view, /其他变动/);
  assert.match(view, /批次/);
  assert.doesNotMatch(view, /getGenerationModel/);
  assert.doesNotMatch(view, /promptPreview/);
  assert.doesNotMatch(view, /查看结果/);
  assert.match(boundary, /\/api\/billing\/activities/);
  assert.match(contract, /CreditActivityPage/);
  assert.match(runtime, /createBillingNodeApiHandler/);
});
