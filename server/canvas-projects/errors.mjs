export class CanvasProjectError extends Error {
  constructor(code, message, status = 400, retryable = false) {
    super(message);
    this.name = "CanvasProjectError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}
