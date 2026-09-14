import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";
import type { OperationsDashboard, OperationsDetail, OperationsLog } from "@/shared/contracts/site-operations";

export async function readOperations<T>(action: "dashboard" | "logs" | "detail", input: object, signal?: AbortSignal): Promise<T> {
  const response = await goodGoodApiFetch(`/api/admin/operations/${action}`, {
    method: "POST", headers: { "content-type": "application/json", "x-goodgood-admin-action": "1" },
    body: JSON.stringify(input), cache: "no-store", signal,
  }).catch(error => {
    if (signal?.aborted) throw error;
    throw new Error("无法连接运营数据，请检查网络后重试。");
  });
  const payload = await response.json().catch(() => { throw new Error("运营数据响应无效，请稍后重试。"); });
  if (!response.ok) {
    const failure = payload as {error?: {message?: string;requestId?: string}};
    throw new Error(`${failure.error?.message ?? "运营数据暂时不可用，请重试。"}${failure.error?.requestId ? `（请求 ${failure.error.requestId}）` : ""}`);
  }
  return payload as T;
}
export const readOperationsDashboard = (input: object, signal?: AbortSignal) => readOperations<OperationsDashboard>("dashboard", input, signal);
export const readOperationsLog = (input: object, signal?: AbortSignal) => readOperations<OperationsLog>("logs", input, signal);
export const readOperationsDetail = (input: object, signal?: AbortSignal) => readOperations<OperationsDetail>("detail", input, signal);
