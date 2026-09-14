import { AuthenticationError } from '../auth/errors.mjs';
import { newRequestId } from '../observability/http.mjs';
export class JcoinError extends Error {
  constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; }
}
export function jcoinApiError(error) {
  const known = error instanceof JcoinError || error instanceof AuthenticationError;
  const status = known ? error.status : 503;
  return { status, body: { error: { code: known ? error.code : 'JCOIN_UNAVAILABLE', message: known ? error.message : '平台币服务暂时不可用，请稍后重试。', retryable: status >= 500, requestId: newRequestId() } } };
}
