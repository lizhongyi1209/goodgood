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
