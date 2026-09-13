import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";
import type {
  ManagedModel,
  ModelDirectory,
} from "@/shared/contracts/model-management";

async function modelPayload<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as { error?: { message?: string } };
  if (!response.ok)
    throw new Error(
      payload.error?.message ?? "模型管理暂时不可用，请稍后重试。",
    );
  return payload as T;
}
export async function readModelManagement(): Promise<ModelDirectory> {
  return modelPayload(
    await goodGoodApiFetch("/api/admin/models/query", {
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        "x-goodgood-admin-action": "1",
      },
      body: "{}",
    }),
  );
}
export async function saveModelManagement(
  model: Omit<ManagedModel, "updatedAt" | "version"> & {
    version: number | null;
  },
): Promise<{ model: ManagedModel }> {
  return modelPayload(
    await goodGoodApiFetch("/api/admin/models/save", {
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        "x-goodgood-admin-action": "1",
      },
      body: JSON.stringify(model),
    }),
  );
}
