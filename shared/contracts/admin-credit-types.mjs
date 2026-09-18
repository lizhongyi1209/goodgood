export const ADMIN_CREDIT_TYPES = Object.freeze([
  "paid_recharge", "gift", "promotion", "test", "service_compensation", "other",
]);

// Single source of truth for the manual credit-grant ceiling. The site owner
// caps one entry at RMB 10,000, which is 1,000,000 credits at the accepted
// 100 credits / CNY. Enforced in the browser, in both server checks, and by
// the administrative_actions_status_check constraint (migration 0044); change
// those together.
export const ADMIN_CREDIT_AMOUNT_MAX = 1_000_000;

export const ADMIN_CREDIT_TYPE_LABELS = Object.freeze({
  paid_recharge: "充值", gift: "赠送", promotion: "活动奖励",
  test: "测试", service_compensation: "服务补偿", other: "其他",
});
