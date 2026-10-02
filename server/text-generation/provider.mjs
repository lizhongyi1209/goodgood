import { readFileSync } from "node:fs";
import { getTextGenerationModel, TEXT_GENERATION_REASONING_EFFORT, TEXT_GENERATION_MAX_OUTPUT } from "../../shared/contracts/text-generation.mjs";
import { readServerSentEvents } from "../../shared/server-sent-events.mjs";
import { TextGenerationError } from "./errors.mjs";

export function textProviderConfig(provider, environment = process.env) {
  let key = environment.TEXT_GENERATION_API_KEY?.trim() || provider.apiKey;
  if (environment.TEXT_GENERATION_API_KEY_FILE) key = readFileSync(environment.TEXT_GENERATION_API_KEY_FILE, "utf8").trim();
  const base = new URL(environment.TEXT_GENERATION_API_BASE_URL || provider.baseUrl);
  if (!key || base.username || base.password || base.search || base.hash ||
      !(base.protocol === "https:" || base.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname))) {
    throw new TextGenerationError("TEXT_PROVIDER_NOT_CONFIGURED", "文本模型暂未配置，请稍后再试。", 503);
  }
  const root = base.href.replace(/\/$/, "");
  return { key, url: `${root}${base.pathname.replace(/\/$/, "").endsWith("/v1") ? "" : "/v1"}/chat/completions` };
}

function contentText(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.filter((part) => part?.type === "text" && typeof part.text === "string").map((part) => part.text).join("");
  return "";
}
export async function* streamTextProvider({ config, input, mediaContent, signal, fetchImpl = fetch }) {
  const timeout = AbortSignal.timeout(10 * 60_000);
  const combined = AbortSignal.any([signal, timeout]);
  let length = 0;
  let completed = false;
  const model = getTextGenerationModel(input.modelId);
  try {
    const response = await fetchImpl(config.url, {
      method: "POST", signal: combined, redirect: "error",
      headers: { authorization: `Bearer ${config.key}`, "content-type": "application/json", accept: "text/event-stream" },
      body: JSON.stringify({ model: model.providerModel, stream: true, reasoning_effort: TEXT_GENERATION_REASONING_EFFORT,
        messages: [...input.history, { role: "user", content: [
          { type: "text", text: input.prompt || "请分析输入素材。" }, ...mediaContent,
        ] }] }),
    });
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      throw new TextGenerationError("TEXT_PROVIDER_REJECTED", "模型暂时无法响应，请稍后重试。", 503);
    }
    if (!response.headers.get("content-type")?.includes("text/event-stream")) {
      await response.body.cancel();
      throw new TextGenerationError("TEXT_PROVIDER_STREAM_UNSUPPORTED", "该模型暂未返回流式内容，请稍后重试。", 503);
    }
    for await (const event of readServerSentEvents(response.body, combined)) {
      if (event === "[DONE]") { completed = true; break; }
      let chunk;
      try { chunk = JSON.parse(event); } catch { throw new TextGenerationError("TEXT_PROVIDER_STREAM_INVALID", "模型返回内容中断，请重试。", 503); }
      if (chunk.error) throw new TextGenerationError("TEXT_PROVIDER_REJECTED", "模型暂时无法响应，请稍后重试。", 503);
      const choice = chunk.choices?.[0];
      const text = contentText(choice?.delta?.content);
      if (text) {
        length += text.length;
        if (length > TEXT_GENERATION_MAX_OUTPUT) throw new TextGenerationError("TEXT_OUTPUT_TOO_LONG", "生成内容超过长度上限，请缩小需求后重试。", 422);
        yield text;
      }
      if (choice?.finish_reason) {
        if (choice.finish_reason !== "stop") throw new TextGenerationError("TEXT_OUTPUT_INCOMPLETE", "模型未完整生成内容，请调整需求后重试。", 422);
        completed = true;
      }
    }
    if (!completed || !length) throw new TextGenerationError("TEXT_OUTPUT_EMPTY", length ? "生成连接中断，请重试。" : "模型没有返回文本，请调整输入后重试。", 503);
  } catch (error) {
    if (signal.aborted) throw signal.reason;
    if (timeout.aborted) throw new TextGenerationError("TEXT_GENERATION_TIMEOUT", "生成超时，已保留内容，请稍后重试。", 504);
    throw error instanceof TextGenerationError ? error : new TextGenerationError("TEXT_PROVIDER_UNAVAILABLE", "模型连接暂不可用，请稍后重试。", 503);
  }
}
