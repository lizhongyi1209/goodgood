export class DraftRequestError extends Error {
  constructor(code, message, status = 400, retryable = false) {
    super(message);
    this.name = "DraftRequestError";
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

export class DraftPersistenceError extends Error {
  constructor(code, message, status = 500, retryable = false) {
    super(message);
    this.name = "DraftPersistenceError";
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

export class DraftConflictError extends DraftRequestError {
  constructor(currentDraft) {
    super(
      "DRAFT_CONFLICT",
      "另一窗口已更新这份草稿，请选择保留当前内容或恢复云端版本。",
      409,
    );
    this.name = "DraftConflictError";
    this.currentDraft = currentDraft;
  }
}
