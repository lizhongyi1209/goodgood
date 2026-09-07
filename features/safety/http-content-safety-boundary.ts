import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";

export type ContentReportCategory = Readonly<{
  code:
    | "child_safety"
    | "non_consensual_intimate"
    | "fraud_impersonation"
    | "extremism_violence"
    | "illegal_activity"
    | "privacy_ip"
    | "other";
  label: string;
}>;

export type ContentPolicyState = Readonly<{
  accepted: boolean;
  acceptedAt: string | null;
  policy: Readonly<{
    documentHash: string;
    obligations: readonly string[];
    prohibited: readonly ContentReportCategory[];
    response: readonly string[];
    title: string;
    version: string;
  }>;
  reportCategories: readonly ContentReportCategory[];
}>;

export type OpenContentReport = Readonly<{
  assetAvailable: boolean;
  assetId: string | null;
  category: ContentReportCategory["code"];
  createdAt: string;
  id: string;
  targetEmail: string;
  targetOwnerId: string;
  targetStatus: "pending" | "active" | "suspended";
}>;

export type ContentReportPreview = Readonly<{
  aspectRatio: string;
  assetId: string;
  category: ContentReportCategory["code"];
  mimeType: string;
  modelId: string;
  previewUrl: string;
  prompt: string;
  reportId: string;
  requestedCount: number;
}>;

type ErrorEnvelope = Readonly<{
  error?: Readonly<{
    code?: string;
    message?: string;
    requestId?: string;
    retryable?: boolean;
  }>;
}>;

const MUTATION_HEADERS = {
  "content-type": "application/json",
  "x-goodgood-content-safety-action": "1",
};

async function safetyJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T | ErrorEnvelope;
  if (!response.ok) {
    const failure = payload as ErrorEnvelope;
    const message = failure.error?.message ?? "内容安全服务暂时不可用，请稍后重试。";
    throw new Error(
      failure.error?.requestId
        ? `${message}（请求编号：${failure.error.requestId}）`
        : message,
    );
  }
  return payload as T;
}

export async function readCurrentContentPolicy(): Promise<ContentPolicyState> {
  return safetyJson<ContentPolicyState>(
    await goodGoodApiFetch("/api/content-policy", { cache: "no-store" }),
  );
}

export async function acceptCurrentContentPolicy(policy: {
  documentHash: string;
  version: string;
}) {
  return safetyJson<{
    acceptedAt: string;
    created: boolean;
    documentHash: string;
    version: string;
  }>(
    await goodGoodApiFetch("/api/content-policy", {
      body: JSON.stringify(policy),
      headers: {
        ...MUTATION_HEADERS,
        "idempotency-key": `policy-${crypto.randomUUID()}`,
      },
      method: "POST",
    }),
  );
}

export async function createAssetContentReport(input: {
  assetId: string;
  category: ContentReportCategory["code"];
}) {
  return safetyJson<{
    assetId: string | null;
    category: ContentReportCategory["code"];
    created: boolean;
    createdAt: string;
    id: string;
    resolution: null;
    resolvedAt: null;
    state: "open";
  }>(
    await goodGoodApiFetch("/api/content-reports", {
      body: JSON.stringify(input),
      headers: {
        ...MUTATION_HEADERS,
        "idempotency-key": `report-${crypto.randomUUID()}`,
      },
      method: "POST",
    }),
  );
}

export async function readContentReportPreview(reportId: string) {
  return safetyJson<ContentReportPreview>(
    await goodGoodApiFetch(
      `/api/admin/content-reports/${encodeURIComponent(reportId)}/preview`,
      {
        body: "{}",
        headers: {
          ...MUTATION_HEADERS,
          "idempotency-key": `moderation-preview-${crypto.randomUUID()}`,
        },
        method: "POST",
      },
    ),
  );
}

export async function resolveContentReport(input: {
  action: "restore" | "remove";
  reason: string;
  reportId: string;
}) {
  return safetyJson<{
    action: "restore" | "remove";
    created: boolean;
    reportId: string;
  }>(
    await goodGoodApiFetch(
      `/api/admin/content-reports/${encodeURIComponent(input.reportId)}/resolution`,
      {
        body: JSON.stringify({ action: input.action, reason: input.reason }),
        headers: {
          ...MUTATION_HEADERS,
          "idempotency-key": `moderation-resolve-${crypto.randomUUID()}`,
        },
        method: "POST",
      },
    ),
  );
}
