import { AuthenticationError } from "../auth/errors.mjs";
import { OrganizationError } from "../organizations/errors.mjs";
import { BillingPersistenceError } from "../billing/repository.mjs";

export class TextGenerationError extends Error {
  constructor(code, message, status = 400) { super(message); this.name = "TextGenerationError"; this.code = code; this.status = status; }
}
export function textGenerationError(error) {
  const known = error instanceof TextGenerationError || error instanceof AuthenticationError || error instanceof OrganizationError || error instanceof BillingPersistenceError;
  return { status: known ? error.status : 503, body: { error: {
    code: known ? error.code : "TEXT_GENERATION_UNAVAILABLE",
    message: known ? error.message : "文本生成暂时无法完成，已保留内容，请稍后重试。",
    retryable: !known || error.status >= 500,
  } } };
}
