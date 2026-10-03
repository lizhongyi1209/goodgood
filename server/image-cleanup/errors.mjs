import { AuthenticationError } from "../auth/errors.mjs";
import { OrganizationError } from "../organizations/errors.mjs";
import { BillingPersistenceError } from "../billing/repository.mjs";
import { ReferenceRequestError } from "../references/errors.mjs";

export class ImageCleanupError extends Error {
  constructor(code, message, status = 400) { super(message); this.name = "ImageCleanupError"; this.code = code; this.status = status; }
}
export function imageCleanupApiError(error) {
  const known = error instanceof ImageCleanupError || error instanceof AuthenticationError || error instanceof OrganizationError || error instanceof BillingPersistenceError || error instanceof ReferenceRequestError;
  return { status: known ? error.status : 503, body: { error: {
    code: known ? error.code : "IMAGE_CLEANUP_UNAVAILABLE",
    message: known ? error.message : "去除AI暂时无法完成，请重试以确认本次结果。",
    retryable: !known || error.status >= 500,
  } } };
}
