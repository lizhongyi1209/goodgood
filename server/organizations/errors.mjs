export class OrganizationError extends Error {
  constructor(code, message, status = 400, retryable = false) {
    super(message);
    this.name = "OrganizationError";
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

export function organizationAccessDeniedError() {
  return new OrganizationError(
    "WORKSPACE_ACCESS_DENIED",
    "你没有权限访问这个企业工作区。",
    403,
  );
}

export function organizationConflictError(
  message = "企业信息已发生变化，请刷新后重试。",
) {
  return new OrganizationError("ORGANIZATION_CONFLICT", message, 409);
}

export function organizationIdempotencyConflictError() {
  return new OrganizationError(
    "ORGANIZATION_IDEMPOTENCY_CONFLICT",
    "该操作标识已经用于另一项企业操作。",
    409,
  );
}

export function invitationUnavailableError() {
  return new OrganizationError(
    "INVITATION_UNAVAILABLE",
    "这份企业邀请不可用，请联系企业管理员重新邀请。",
    404,
  );
}

export function organizationCreditUnavailableError() {
  return new OrganizationError(
    "ORGANIZATION_CREDIT_UNAVAILABLE",
    "企业积分账户当前不可用。",
    409,
  );
}

export function organizationCreditInsufficientError() {
  return new OrganizationError(
    "ORGANIZATION_CREDIT_INSUFFICIENT",
    "企业可用积分不足，请联系企业管理员补充积分。",
    409,
  );
}

export function memberBudgetUnavailableError() {
  return new OrganizationError(
    "MEMBER_BUDGET_UNAVAILABLE",
    "你的企业积分额度当前不可用，请联系企业管理员。",
    409,
  );
}

export function memberBudgetInsufficientError() {
  return new OrganizationError(
    "MEMBER_BUDGET_INSUFFICIENT",
    "你的企业积分额度不足，请联系企业管理员调整额度。",
    409,
  );
}

export function memberBudgetConflictError(
  message = "员工额度已经发生变化，请刷新后重试。",
) {
  return new OrganizationError("MEMBER_BUDGET_CONFLICT", message, 409);
}

export function organizationCreditReservationClosedError() {
  return new OrganizationError(
    "ORGANIZATION_CREDIT_RESERVATION_CLOSED",
    "这笔企业积分预留已经结算或释放。",
    409,
  );
}
