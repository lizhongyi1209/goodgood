import { AuthenticationError, sessionExpiredError } from "../auth/errors.mjs";
import { getGenerationResources } from "../generation/resources.mjs";
import { newRequestId } from "../observability/http.mjs";
import {
  BillingPersistenceError,
  findCreditAccount,
  listActiveGenerationPrices,
} from "./repository.mjs";
import { PaymentError } from "./payment-errors.mjs";

const LAUNCH_PRICES = Object.freeze([
  Object.freeze({
    count: 1,
    modelId: "nano-banana-2",
    planContext: "standard",
  }),
  Object.freeze({
    count: 2,
    modelId: "nano-banana-2",
    planContext: "standard",
  }),
  Object.freeze({
    count: 4,
    modelId: "nano-banana-2",
    planContext: "standard",
  }),
  Object.freeze({
    count: 1,
    modelId: "gpt-image-2",
    planContext: "standard",
  }),
  Object.freeze({
    count: 2,
    modelId: "gpt-image-2",
    planContext: "standard",
  }),
  Object.freeze({
    count: 4,
    modelId: "gpt-image-2",
    planContext: "standard",
  }),
]);

function ownerIdFromContext(ownerContext) {
  if (!ownerContext?.ownerId) throw sessionExpiredError();
  return ownerContext.ownerId;
}

function publicAccount(account) {
  return {
    availableCredits: account.availableBalance.toString(),
    reservedCredits: account.reservedBalance.toString(),
    unit: account.unit,
    version: account.version.toString(),
  };
}

function publicQuote(price) {
  return {
    count: price.count,
    creditAmount: price.creditAmount.toString(),
    creditUnit: price.creditUnit,
    modelId: price.modelId,
    planContext: price.planContext,
    priceVersion: price.version,
    resolution: price.resolution,
  };
}

export const previewBillingSummary = Object.freeze({
  account: Object.freeze({
    availableCredits: "100",
    reservedCredits: "0",
    unit: "credit",
    version: "1",
  }),
  quotes: Object.freeze(
    LAUNCH_PRICES.flatMap((launchPrice) =>
      ["1K", "2K", "4K"].map((resolution) =>
        Object.freeze({
          ...launchPrice,
          creditAmount: String(10 * launchPrice.count),
          creditUnit: "credit",
          priceVersion: 1,
          resolution,
        }),
      ),
    ),
  ),
});

export async function readBillingSummary({
  ownerContext,
  resources = null,
}) {
  const ownerId = ownerIdFromContext(ownerContext);
  const resolvedResources = resources ?? (await getGenerationResources());
  const [account, priceGroups] = await Promise.all([
    findCreditAccount(resolvedResources.pool, { ownerId }),
    Promise.all(
      LAUNCH_PRICES.map((launchPrice) =>
        listActiveGenerationPrices(resolvedResources.pool, launchPrice),
      ),
    ),
  ]);
  if (!account || account.status !== "active") {
    throw new BillingPersistenceError(
      "CREDIT_ACCOUNT_UNAVAILABLE",
      "积分账户暂时不可用，请稍后重试。",
      503,
    );
  }
  return {
    account: publicAccount(account),
    quotes: priceGroups.flat().map(publicQuote),
  };
}

export function billingApiError(error, requestId = newRequestId()) {
  if (error instanceof AuthenticationError) {
    return {
      body: {
        error: {
          code: error.code,
          message: error.message,
          requestId,
          retryable: false,
        },
      },
      status: error.status,
    };
  }
  if (
    error instanceof BillingPersistenceError &&
    ["CREDIT_ACCOUNT_UNAVAILABLE", "PRICE_NOT_AVAILABLE"].includes(error.code)
  ) {
    return {
      body: {
        error: {
          code: error.code,
          message: error.message,
          requestId,
          retryable: true,
        },
      },
      status: error.status,
    };
  }
  if (error instanceof PaymentError) {
    return {
      body: {
        error: {
          code: error.code,
          message: error.message,
          requestId,
          retryable: error.retryable,
        },
      },
      status: error.status,
    };
  }
  console.error(
    JSON.stringify({
      event: "billing.api_failed",
      message: error instanceof Error ? error.message : String(error),
      requestId,
    }),
  );
  return {
    body: {
      error: {
        code: "BILLING_UNAVAILABLE",
        message: "积分信息暂时无法读取，请稍后重试。",
        requestId,
        retryable: true,
      },
    },
    status: 503,
  };
}
