export class ProjectRequestError extends Error {
  constructor(code, message, status = 400, retryable = false) {
    super(message);
    this.name = "ProjectRequestError";
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

export class ProjectPersistenceError extends Error {
  constructor(code, message, status = 500, retryable = false) {
    super(message);
    this.name = "ProjectPersistenceError";
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}
