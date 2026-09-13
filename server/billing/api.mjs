import { AuthenticationError, sessionExpiredError } from "../auth/errors.mjs";
import { getGenerationResources } from "../generation/resources.mjs";
import { newRequestId } from "../observability/http.mjs";
import {
  BillingPersistenceError,
  findCreditAccount,
  listActiveGenerationPrices,
} from "./repository.mjs";
import { PaymentError } from "./payment-errors.mjs";
import { readManagedModels } from "../admin/models.mjs";
import { BANANA_LINES, imagePriceContext, supportsImageLines, isBananaLineReady, modelBananaLines, modelSpecificationPrices } from "../../shared/contracts/banana-lines.mjs";

const GPT_IMAGE_LAUNCH_PRICES = [
  "gpt-image-2.5-sunburst",
  "gpt-image-2",
  "gpt-image-2.5-flare",
].flatMap((modelId) => [1, 2, 4].map((count) => Object.freeze({
  count,
  modelId,
  planContext: "standard",
})));

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
    modelId: "nano-banana-pro",
    planContext: "standard",
  }),
  ...GPT_IMAGE_LAUNCH_PRICES,
]);

function previewCreditAmount({ count, modelId }) {
  return String((modelId === "nano-banana-pro" ? 30 : 20) * count);
}

function ownerIdFromContext(ownerContext) {
  if (!ownerContext?.ownerId) throw sessionExpiredError();
  return ownerContext.ownerId;
}

function publicAccount(account) {
  return {
    availableCredits: account.availableBalance.toString(),
    reservedCredits: account.reservedBalance.toString(),
    transferableCredits: (
      account.paymentFundedAvailableBalance ?? 0n
    ).toString(),
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
    availableCredits: "200",
    reservedCredits: "0",
    transferableCredits: "0",
    unit: "credit-cny-cent",
    version: "1",
  }),
  quotes: Object.freeze(
    LAUNCH_PRICES.flatMap((launchPrice) =>
      ["1K", "2K", "4K"].map((resolution) =>
        Object.freeze({
          ...launchPrice,
          creditAmount: previewCreditAmount(launchPrice),
          creditUnit: "credit-cny-cent",
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
  const directory = await readManagedModels({ ownerContext, resources: resolvedResources, publicDirectory: true });
  const [account, priceGroups] = await Promise.all([
    findCreditAccount(resolvedResources.pool, { ownerId }),
    Promise.all(
      directory.models.filter((model) => model.mediaType === "image").flatMap((model) =>
        (supportsImageLines(model.adapterId) ? BANANA_LINES.filter(({ id }) => modelBananaLines(model)[id].enabled && isBananaLineReady(model.adapterId, id)).map(({ id }) => id) : [undefined]).flatMap((line) =>
          (model.adapterId === "nano-banana-pro" ? [1] : [1,2,4]).map((count) => ({ modelId: model.id, count, planContext: imagePriceContext(line) })))).map((launchPrice) =>
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
    quotes: priceGroups.flat().flatMap((price) => {
      const model = directory.models.find((item) => item.id === price.modelId);
      const imageLine = price.planContext === "standard" ? "special" : price.planContext.replace("banana-", "");
      if (!modelSpecificationPrices(model, imageLine)[price.resolution]) return [];
      return [{ ...publicQuote(price), modelId: model.adapterId, catalogModelId: model.id,
        ...(supportsImageLines(model.adapterId) && imageLine !== "special" ? { imageLine } : {}),
      }];
    }),
    models: directory.models,
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
    [
      "CREDIT_ACCOUNT_UNAVAILABLE",
      "PRICE_NOT_AVAILABLE",
      "CREDIT_ACTIVITY_UNAVAILABLE",
    ].includes(error.code)
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
  if (
    error instanceof BillingPersistenceError &&
    error.code === "CREDIT_ACTIVITY_REQUEST_INVALID"
  ) {
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
