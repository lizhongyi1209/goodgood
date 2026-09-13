export class DistributionError extends Error {
  constructor(code, message, status = 400, retryable = false) {
    super(message);
    this.name = "DistributionError";
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

export function businessRoleRequiredError() {
  return new DistributionError(
    "BUSINESS_ROLE_REQUIRED",
    "仅分销商身份可使用个人积分划拨，企业身份请使用成员创作额度。",
    403,
  );
}
