import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import test from "node:test";
import { sessionExpiredError } from "../server/auth/errors.mjs";
import {
  billingApiError,
  readBillingSummary,
} from "../server/billing/api.mjs";
import { createBillingNodeApiHandler } from "../server/billing/node-api.mjs";
import {
  BillingPersistenceError,
  findCreditAccount,
  listActiveGenerationPrices,
} from "../server/billing/repository.mjs";

const timestamp = "2026-09-02T00:00:00.000Z";

function accountRow(overrides = {}) {
  return {
    available_balance: "100",
    created_at: timestamp,
    id: "70000000-0000-4000-8000-000000000001",
    owner_id: "owner-a",
    reserved_balance: "0",
    status: "active",
    unit: "credit",
    updated_at: timestamp,
    version: "1",
    ...overrides,
  };
}

function priceRow(resolution) {
  return {
    created_at: timestamp,
    credit_amount: "10",
    credit_unit: "credit",
    effective_from: timestamp,
    effective_until: null,
    id: `price-${resolution}`,
    model_id: "nano-banana-2",
    output_count: 1,
    plan_context: "standard",
    resolution,
    version: 1,
  };
}

function billingPool({ account = accountRow() } = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, values) {
      calls.push({ sql, values });
      if (sql.includes("FROM credit_accounts")) {
        return { rowCount: account ? 1 : 0, rows: account ? [account] : [] };
      }
      if (sql.includes("FROM price_versions")) {
        return { rowCount: 1, rows: [priceRow(values[1])] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
}

function requestFor({ headers = {}, method = "GET", url }) {
  const request = Readable.from([]);
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

test("billing repository reads exact account state and all launch resolution prices", async () => {
  const pool = billingPool();
  const account = await findCreditAccount(pool, {
    ownerId: "owner-a",
  });
  assert.equal(account.availableBalance, 100n);
  assert.equal(account.reservedBalance, 0n);
  assert.equal(account.version, 1n);

  const prices = await listActiveGenerationPrices(pool, {
    count: 1,
    modelId: "nano-banana-2",
  });
  assert.deepEqual(
    prices.map((price) => [price.resolution, price.creditAmount]),
    [
      ["1K", 10n],
      ["2K", 10n],
      ["4K", 10n],
    ],
  );
  assert.deepEqual(
    pool.calls.slice(1).map((call) => call.values.slice(0, 3)),
    [
      ["nano-banana-2", "1K", 1],
      ["nano-banana-2", "2K", 1],
      ["nano-banana-2", "4K", 1],
    ],
  );
});

test("billing summary serializes exact credits without owner or account identifiers", async () => {
  const summary = await readBillingSummary({
    ownerContext: { ownerId: "owner-a" },
    resources: { pool: billingPool() },
  });
  assert.deepEqual(summary.account, {
    availableCredits: "100",
    reservedCredits: "0",
    unit: "credit",
    version: "1",
  });
  assert.deepEqual(
    summary.quotes.map((quote) => [quote.resolution, quote.creditAmount]),
    [
      ["1K", "10"],
      ["2K", "10"],
      ["4K", "10"],
    ],
  );
  assert.equal("ownerId" in summary.account, false);
  assert.equal("id" in summary.account, false);

  await assert.rejects(
    readBillingSummary({
      ownerContext: { ownerId: "owner-a" },
      resources: { pool: billingPool({ account: null }) },
    }),
    (error) =>
      error instanceof BillingPersistenceError &&
      error.code === "CREDIT_ACCOUNT_UNAVAILABLE" &&
      error.status === 503,
  );
  const normalized = billingApiError(
    new BillingPersistenceError(
      "CREDIT_ACCOUNT_UNAVAILABLE",
      "积分账户暂时不可用，请稍后重试。",
      503,
    ),
  );
  assert.equal(normalized.status, 503);
  assert.equal(normalized.body.error.retryable, true);
});

test("billing HTTP route authenticates, remains read-only, and preserves owner context", async () => {
  const calls = [];
  const handler = createBillingNodeApiHandler({
    authenticate: async (request) => {
      const ownerId = request.headers["x-owner"];
      if (!ownerId) throw sessionExpiredError();
      return { ownerId };
    },
    operations: {
      async readBillingSummary(input) {
        calls.push(input);
        return {
          account: {
            availableCredits: input.ownerContext.ownerId === "owner-a" ? "100" : "0",
            reservedCredits: "0",
            unit: "credit",
            version: "1",
          },
          quotes: [],
        };
      },
    },
  });

  const ownerResponse = responseRecorder();
  assert.equal(
    await handler(
      requestFor({ headers: { "x-owner": "owner-a" }, url: "/api/billing" }),
      ownerResponse,
    ),
    true,
  );
  assert.equal(ownerResponse.statusCode, 200);
  assert.equal(JSON.parse(ownerResponse.body).account.availableCredits, "100");
  assert.equal(calls[0].ownerContext.ownerId, "owner-a");
  assert.equal(ownerResponse.headers["cache-control"], "no-store");

  const unauthorizedResponse = responseRecorder();
  await handler(requestFor({ url: "/api/billing" }), unauthorizedResponse);
  assert.equal(unauthorizedResponse.statusCode, 401);
  assert.equal(
    JSON.parse(unauthorizedResponse.body).error.code,
    "SESSION_EXPIRED",
  );

  const methodResponse = responseRecorder();
  await handler(
    requestFor({
      headers: { "x-owner": "owner-a" },
      method: "POST",
      url: "/api/billing",
    }),
    methodResponse,
  );
  assert.equal(methodResponse.statusCode, 405);
  assert.equal(methodResponse.headers.allow, "GET");
  assert.equal(
    await handler(requestFor({ url: "/api/unrelated" }), responseRecorder()),
    false,
  );
});

test("billing summary is wired into both runtimes and the shared workspace", async () => {
  const [route, runtime, page, composer, boundary, contract] = await Promise.all([
    readFile(new URL("../app/api/billing/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../server/runtime/web.mjs", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../features/creation/creation-composer.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../features/billing/http-billing-boundary.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../shared/contracts/billing.ts", import.meta.url), "utf8"),
  ]);
  assert.match(route, /await readBillingSummary/);
  assert.match(route, /previewBillingSummary/);
  assert.match(runtime, /createBillingNodeApiHandler/);
  assert.match(runtime, /handleBillingNodeApi/);
  assert.match(boundary, /goodGoodApiFetch\("\/api\/billing"/);
  assert.match(contract, /BillingSummary/);
  assert.match(page, /billingLoading/);
  assert.match(page, /billingError/);
  assert.match(page, /积分余额/);
  assert.match(page, /可生成 \{availableImages/);
  assert.match(composer, /className="composer-price"/);
  assert.match(composer, /billingDescription/);
});
