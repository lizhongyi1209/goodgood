export class AuthenticationError extends Error {
  constructor(code, message, status = 401, options = {}) {
    super(message);
    this.name = "AuthenticationError";
    this.code = code;
    this.retryAfterSeconds = options.retryAfterSeconds ?? null;
    this.retryable = options.retryable ?? false;
    this.status = status;
  }
}

export function sessionExpiredError() {
  return new AuthenticationError(
    "SESSION_EXPIRED",
    "登录状态已失效，请重新登录。",
  );
}

export function authenticationRequestError(
  code,
  message = "登录请求无效，请重新开始登录。",
  status = 400,
) {
  return new AuthenticationError(code, message, status);
}

export function authenticationProviderError() {
  return new AuthenticationError(
    "AUTH_PROVIDER_UNAVAILABLE",
    "登录服务暂时不可用，请稍后重试。",
    503,
  );
}

export function authenticationRateLimitError(retryAfterSeconds) {
  return new AuthenticationError(
    "EMAIL_RATE_LIMITED",
    `请求过于频繁，请在 ${retryAfterSeconds} 秒后重试。`,
    429,
    { retryAfterSeconds },
  );
}

export function emailCodeInvalidError() {
  return new AuthenticationError(
    "EMAIL_CODE_INVALID",
    "验证码无效或已过期，请重新获取。",
    400,
  );
}
