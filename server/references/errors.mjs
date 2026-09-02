export class ReferenceRequestError extends Error {
  constructor(code, message, status = 400, retryable = false) {
    super(message);
    this.name = "ReferenceRequestError";
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

export class ReferencePersistenceError extends Error {
  constructor(code, message, status = 500) {
    super(message);
    this.name = "ReferencePersistenceError";
    this.code = code;
    this.retryable = status >= 500;
    this.status = status;
  }
}
