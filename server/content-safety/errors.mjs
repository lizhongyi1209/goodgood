export class ContentSafetyError extends Error {
  constructor(code, message, status = 400, retryable = false) {
    super(message);
    this.name = "ContentSafetyError";
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

export function contentSafetyAccessDeniedError() {
  return new ContentSafetyError(
    "CONTENT_SAFETY_ACCESS_DENIED",
    "只有站长可以处理内容举报。",
    403,
  );
}
