import sharp from "sharp";

export class NormalizedProviderError extends Error {
  constructor({ code, message, retryable = true, title = "本次生成未完成" }) {
    super(message);
    this.name = "NormalizedProviderError";
    this.code = code;
    this.retryable = retryable;
    this.title = title;
  }
}

async function providerFetch(
  url,
  options,
  timeoutMs = 5_000,
  fetchImplementation = fetch,
) {
  let response;
  try {
    response = await fetchImplementation(url, {
      ...options,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new NormalizedProviderError({
      code: "CAPACITY_BUSY",
      message: "生成服务暂时不可达。输入内容已保留，请稍后重试。",
    });
  }

  if (!response.ok) {
    throw new NormalizedProviderError({
      code: response.status === 429 ? "CAPACITY_BUSY" : "INTERNAL_ERROR",
      message: "生成服务暂时不可用。输入内容已保留，请稍后重试。",
    });
  }
  return response;
}

export async function createProviderTask({ attempt, config, job, references = [] }) {
  const response = await providerFetch(
    `${config.baseUrl}/v1/generations`,
    {
      body: JSON.stringify({
        aspectRatio: job.aspect_ratio,
        idempotencyKey: `${job.id}:${attempt.ordinal}`,
        jobId: job.id,
        modelId: job.model_id,
        prompt: job.prompt,
        references,
        retryOfJobId: job.retry_of_job_id,
        resolution: job.resolution,
      }),
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
      },
      method: "POST",
    },
  );
  const payload = await response.json();
  if (!payload?.taskId) {
    throw new NormalizedProviderError({
      code: "INTERNAL_ERROR",
      message: "生成服务返回了无法识别的任务。输入内容已保留，请重试。",
    });
  }
  return payload.taskId;
}

export async function pollProviderTask({ config, onRefining, taskId }) {
  const deadline = Date.now() + config.timeoutMs;
  let refiningNotified = false;

  while (Date.now() < deadline) {
    const response = await providerFetch(
      `${config.baseUrl}/v1/generations/${encodeURIComponent(taskId)}`,
      { headers: { authorization: `Bearer ${config.apiKey}` } },
    );
    const payload = await response.json();
    if (payload.state === "succeeded" && payload.output?.url) {
      return payload.output;
    }
    if (payload.state === "failed") {
      throw new NormalizedProviderError({
        code: payload.error?.code === "MODEL_REJECTED" ? "MODEL_REJECTED" : "INTERNAL_ERROR",
        message:
          payload.error?.code === "MODEL_REJECTED"
            ? "模型未接受本次请求。你可以修改提示词或设置后重试。"
            : "生成服务未能完成任务。输入内容已保留，请重试。",
        retryable: payload.error?.retryable !== false,
      });
    }
    if (!refiningNotified && payload.state === "processing") {
      refiningNotified = true;
      await onRefining();
    }
    await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs));
  }

  throw new NormalizedProviderError({
    code: "MODEL_TIMEOUT",
    message: "模型服务响应超时。提示词与生成参数均已保留，你可以直接重试。",
  });
}

async function downloadProviderOutputOnce(output, fetchImplementation) {
  const response = await providerFetch(
    output.url,
    {},
    10_000,
    fetchImplementation,
  );
  const contentType = (response.headers.get("content-type") ?? output.mimeType)
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (!contentType?.startsWith("image/")) {
    throw new NormalizedProviderError({
      code: "INTERNAL_ERROR",
      message: "生成结果格式无法识别。输入内容已保留，请重试。",
    });
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 25 * 1024 * 1024) {
    throw new NormalizedProviderError({
      code: "INTERNAL_ERROR",
      message: "生成结果大小异常。输入内容已保留，请重试。",
    });
  }
  let metadata;
  try {
    metadata = await sharp(bytes, { failOn: "error" }).metadata();
  } catch {
    throw new NormalizedProviderError({
      code: "INTERNAL_ERROR",
      message: "生成结果无法完整解码。输入内容已保留，请重试。",
    });
  }
  const decodedContentType = Object.freeze({
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  })[metadata.format];
  if (
    !decodedContentType ||
    !Number.isInteger(metadata.width) ||
    !Number.isInteger(metadata.height) ||
    metadata.width <= 0 ||
    metadata.height <= 0 ||
    metadata.width * metadata.height > 40_000_000 ||
    (contentType !== "application/octet-stream" && contentType !== decodedContentType)
  ) {
    throw new NormalizedProviderError({
      code: "INTERNAL_ERROR",
      message: "生成结果格式无法识别。输入内容已保留，请重试。",
    });
  }
  try {
    await sharp(bytes, { failOn: "error" }).raw().toBuffer();
  } catch {
    throw new NormalizedProviderError({
      code: "INTERNAL_ERROR",
      message: "生成结果无法完整解码。输入内容已保留，请重试。",
    });
  }
  return {
    bytes,
    contentType: decodedContentType,
    height: metadata.height,
    width: metadata.width,
  };
}

export async function downloadProviderOutput(
  output,
  {
    fetchImplementation = fetch,
    maxAttempts = 1,
    retryDelayMs = 250,
    sleep = (milliseconds) =>
      new Promise((resolve) => setTimeout(resolve, milliseconds)),
  } = {},
) {
  if (!Number.isInteger(maxAttempts) || maxAttempts <= 0) {
    throw new Error("Provider output attempts must be a positive integer.");
  }
  if (!Number.isInteger(retryDelayMs) || retryDelayMs < 0) {
    throw new Error("Provider output retry delay must be a non-negative integer.");
  }

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await downloadProviderOutputOnce(output, fetchImplementation);
    } catch (error) {
      lastError = error;
      if (
        !(error instanceof NormalizedProviderError) ||
        error.retryable === false ||
        attempt === maxAttempts
      ) {
        throw error;
      }
      await sleep(retryDelayMs);
    }
  }
  throw lastError;
}
