import { sessionExpiredError } from "../auth/errors.mjs";
import { getGenerationResources } from "../generation/resources.mjs";
import { BillingPersistenceError, findCreditAccount } from "./repository.mjs";
import {
  listCreditActivities,
  summarizeCreditActivitySpend,
} from "./activity-repository.mjs";

const FILTERS = new Set(["all", "spend", "receive", "return"]);
const ACTIVITY_ID_PATTERN = /^act_[0-9a-f]{32}$/;

const DEFAULT_REPOSITORY = Object.freeze({
  findCreditAccount,
  listCreditActivities,
  summarizeCreditActivitySpend,
});

function requestError(message) {
  return new BillingPersistenceError(
    "CREDIT_ACTIVITY_REQUEST_INVALID",
    message,
    400,
  );
}

function requireOwner(ownerContext) {
  if (!ownerContext?.ownerId) throw sessionExpiredError();
  return ownerContext.ownerId;
}

function encodeCursor(cursor, filter) {
  if (!cursor) return null;
  return Buffer.from(JSON.stringify({ ...cursor, filter }), "utf8").toString("base64url");
}

function decodeCursor(value, filter) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || value.length < 4 || value.length > 500) {
    throw requestError("分页标识无效，请刷新后重试。");
  }
  try {
    const cursor = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (
      !cursor ||
      cursor.filter !== filter ||
      !ACTIVITY_ID_PATTERN.test(cursor.activityId) ||
      typeof cursor.createdAt !== "string" ||
      Number.isNaN(Date.parse(cursor.createdAt))
    ) {
      throw new Error("invalid cursor");
    }
    return {
      activityId: cursor.activityId,
      createdAt: new Date(cursor.createdAt).toISOString(),
    };
  } catch (error) {
    if (error instanceof BillingPersistenceError) throw error;
    throw requestError("分页标识无效，请刷新后重试。");
  }
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

function readInput(input = {}) {
  const filter = input.filter ?? "all";
  if (!FILTERS.has(filter)) throw requestError("积分记录筛选无效。");
  const limit = input.limit === undefined || input.limit === "" ? 20 : Number(input.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw requestError("每页记录数必须在 1 到 50 之间。");
  }
  return {
    cursor: decodeCursor(input.cursor, filter),
    filter,
    limit,
  };
}

export async function readCreditActivities({
  input = {},
  ownerContext,
  repository = DEFAULT_REPOSITORY,
  resources = null,
}) {
  const ownerId = requireOwner(ownerContext);
  const query = readInput(input);
  const resolvedResources = resources ?? (await getGenerationResources());
  const [account, activities, spendSummary] = await Promise.all([
    repository.findCreditAccount(resolvedResources.pool, { ownerId }),
    repository.listCreditActivities(resolvedResources.pool, { ...query, ownerId }),
    repository.summarizeCreditActivitySpend(resolvedResources.pool, { ownerId }),
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
    items: activities.items,
    nextCursor: encodeCursor(activities.next, query.filter),
    spendSummary,
  };
}

const PREVIEW_ITEMS = Object.freeze([
  Object.freeze({
    amount: "-20",
    batchReference: "2b89ec79-84e6-4caa-aba8-db339ae999e0",
    category: "image_generation",
    completedAt: "2026-09-09T06:32:18.000Z",
    creditAmount: "20",
    id: "act_11111111111111111111111111111111",
    kind: "generation",
    occurredAt: "2026-09-09T06:31:42.000Z",
    status: "spent",
    unit: "credit-cny-cent",
  }),
  Object.freeze({
    amount: "0",
    batchReference: "ab712c66-3528-4f66-9c67-9ecb4e7d9991",
    category: "image_generation",
    completedAt: "2026-09-08T11:08:31.000Z",
    creditAmount: "40",
    id: "act_22222222222222222222222222222222",
    kind: "generation",
    occurredAt: "2026-09-08T11:07:48.000Z",
    status: "released",
    unit: "credit-cny-cent",
  }),
  Object.freeze({
    amount: "20",
    batchReference: null,
    category: "other",
    completedAt: null,
    creditAmount: "20",
    id: "act_33333333333333333333333333333333",
    kind: "promotion",
    occurredAt: "2026-09-07T03:15:00.000Z",
    status: "credited",
    unit: "credit-cny-cent",
  }),
  Object.freeze({
    amount: "200",
    batchReference: null,
    category: "other",
    completedAt: null,
    creditAmount: "200",
    id: "act_44444444444444444444444444444444",
    kind: "welcome",
    occurredAt: "2026-09-02T02:00:00.000Z",
    status: "credited",
    unit: "credit-cny-cent",
  }),
]);

function previewMatches(item, filter) {
  if (filter === "all") return true;
  if (filter === "spend") return item.status === "processing" || item.status === "spent" || item.status === "expired" || (item.status === "adjusted" && item.amount.startsWith("-"));
  if (filter === "receive") return item.status === "credited" || (item.status === "adjusted" && !item.amount.startsWith("-"));
  return item.status === "released" || item.status === "refunded";
}

export function readPreviewCreditActivities({ input = {} } = {}) {
  const query = readInput(input);
  return {
    account: {
      availableCredits: "200",
      reservedCredits: "0",
      transferableCredits: "0",
      unit: "credit-cny-cent",
      version: "4",
    },
    items: PREVIEW_ITEMS.filter((item) => previewMatches(item, query.filter)).slice(0, query.limit),
    nextCursor: null,
    spendSummary: {
      thisMonth: "60",
      thisWeek: "20",
      today: "20",
    },
  };
}
