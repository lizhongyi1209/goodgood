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
    "当前账户没有可分配积分的企业或分销商身份。",
    403,
  );
}
