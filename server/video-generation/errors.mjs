import { sanitizeFailureDiagnostic } from "../generation/failure-diagnostics.mjs";
export class VideoGenerationError extends Error {
  constructor(code, message, status = 400, diagnostics = null) {
    super(message); this.name = "VideoGenerationError"; this.code = code; this.status = status;
    this.diagnostics = sanitizeFailureDiagnostic(diagnostics);
  }
}
export function videoGenerationError(error) {
  const known = typeof error?.code === "string" && Number.isInteger(error?.status ?? error?.statusCode);
  return { status: known ? (error.status ?? error.statusCode) : 503,
    body: { error: { code: known ? error.code : "VIDEO_GENERATION_UNAVAILABLE", message: known ? error.message : "视频生成暂不可用，请稍后重试。" } } };
}
