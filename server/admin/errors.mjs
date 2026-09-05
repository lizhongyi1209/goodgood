export class AdministrationError extends Error {
  constructor(code, message, status = 400, retryable = false) {
    super(message);
    this.name = "AdministrationError";
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

export function adminAccessDeniedError() {
  return new AdministrationError(
    "ADMIN_ACCESS_DENIED",
    "只有站长可以访问账户管理。",
    403,
  );
}
