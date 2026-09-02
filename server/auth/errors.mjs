export class AuthenticationError extends Error {
  constructor(code, message, status = 401) {
    super(message);
    this.name = "AuthenticationError";
    this.code = code;
    this.retryable = false;
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
