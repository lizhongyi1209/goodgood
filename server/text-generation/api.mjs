import { sessionExpiredError } from "../auth/errors.mjs";
import { getGenerationResources } from "../generation/resources.mjs";
import { resolveWorkspaceAccess } from "../organizations/workspace-access.mjs";
import { TEXT_GENERATION_CREDIT_COST } from "../../shared/contracts/text-generation.mjs";
import { textGenerationError, TextGenerationError } from "./errors.mjs";
import { validateTextGeneration, textGenerationId } from "./validation.mjs";
import { beginTextGeneration, finishTextGeneration, readTextGeneration, recoverExpiredTextGenerations } from "./repository.mjs";
import { resolveTextMedia } from "./media.mjs";
import { streamTextProvider, textProviderConfig } from "./provider.mjs";

function owner(context) { if (!context?.ownerId) throw sessionExpiredError(); return context.ownerId; }
const activeGenerations = new Map();
function publicJob(job) {
  return { requestId: job.id, state: job.state, markdown: job.output_markdown,
    error: job.error_code ? { code: job.error_code, message: job.state === "cancelled" ? "已停止生成，预留积分已退回。" : "上次生成未完成，已退回预留积分。" } : null };
}
export async function getTextGeneration({ ownerContext, workspaceId, requestId }) {
  const ownerId = owner(ownerContext);
  const resources = await getGenerationResources();
  await recoverExpiredTextGenerations(resources.pool);
  return publicJob(await readTextGeneration(resources.pool, { ownerId, workspaceId, requestId: textGenerationId(requestId) }));
}
export async function cancelTextGeneration({ ownerContext, workspaceId, requestId }) {
  const ownerId = owner(ownerContext);
  const resources = await getGenerationResources();
  const job = await readTextGeneration(resources.pool, { ownerId, workspaceId, requestId: textGenerationId(requestId) });
  if (job.state !== "running") return publicJob(job);
  const cancel = activeGenerations.get(job.id);
  const result = cancel ? await cancel() : await finishTextGeneration(resources.pool,
    { jobId: job.id, state: "cancelled", output: job.output_markdown, errorCode: "TEXT_GENERATION_CANCELLED" });
  return publicJob(result ?? await readTextGeneration(resources.pool, { ownerId, workspaceId, requestId: job.id }));
}

// Reservation precedes response headers; provider execution starts only when the stream is consumed.
export async function prepareTextGeneration({ ownerContext, workspaceId, input: raw, signal, resources: supplied,
  providerStream = streamTextProvider, mediaResolver = resolveTextMedia, workspaceResolver = resolveWorkspaceAccess,
  transactions = { begin: beginTextGeneration, finish: finishTextGeneration, recover: recoverExpiredTextGenerations } }) {
  const ownerId = owner(ownerContext);
  const input = validateTextGeneration(raw);
  const resources = supplied ?? await getGenerationResources();
  const workspace = await workspaceResolver(resources.pool, { ownerId, workspaceId });
  const config = textProviderConfig(resources.config.provider);
  await transactions.recover(resources.pool);
  const mediaContent = await mediaResolver(resources, { media: input.media, ownerId, workspaceId: workspace.id, signal });
  signal.throwIfAborted();
  const { job, created } = await transactions.begin(resources.pool, { input, ownerId, workspaceId: workspace.id });
  if (!created && job.state !== "succeeded") {
    throw new TextGenerationError(job.state === "running" ? "TEXT_GENERATION_IN_PROGRESS" : "TEXT_GENERATION_ALREADY_CLOSED",
      job.state === "running" ? "这次生成正在进行，请等待完成。" : "这次生成已结束，请重新提交。", 409);
  }
  let terminal = !created;
  let output = "";
  const internal = new AbortController();
  const streamSignal = AbortSignal.any([signal, internal.signal]);
  async function close(state, errorCode) {
    if (terminal) return;
    const result = await transactions.finish(resources.pool, { jobId: job.id, state, output, errorCode });
    terminal = true;
    return result;
  }
  // Also used if the browser disconnects between reservation and reading the first event.
  const cancel = async () => {
    internal.abort();
    try { return await close("cancelled", "TEXT_GENERATION_CANCELLED"); }
    finally { if (activeGenerations.get(job.id) === cancel) activeGenerations.delete(job.id); }
  };
  if (created) activeGenerations.set(job.id, cancel);
  async function* events() {
    try {
      streamSignal.throwIfAborted();
      yield { type: "start", requestId: job.id, creditAmount: TEXT_GENERATION_CREDIT_COST, cached: !created };
      if (!created) {
        yield { type: "delta", text: job.output_markdown };
      } else {
        for await (const text of providerStream({ config, input, mediaContent, signal: streamSignal })) {
          streamSignal.throwIfAborted();
          output += text;
          yield { type: "delta", text };
        }
        if (!output.trim()) throw new TextGenerationError("TEXT_OUTPUT_EMPTY", "模型没有返回文本，请调整输入后重试。", 503);
        streamSignal.throwIfAborted();
        const result = await close("succeeded", null);
        if (result?.state !== "succeeded") throw new TextGenerationError("TEXT_GENERATION_INTERRUPTED", "这次生成已停止，请重新提交。", 409);
      }
      yield { type: "done", requestId: job.id };
    } catch (error) {
      const failure = textGenerationError(error);
      await close(streamSignal.aborted ? "cancelled" : "failed", streamSignal.aborted ? "TEXT_GENERATION_CANCELLED" : failure.body.error.code);
      if (!streamSignal.aborted) yield { type: "error", ...failure.body.error };
    } finally {
      await cancel();
    }
  }
  return { events: events(), cancel };
}

export function encodeTextEvent(event) { return `data: ${JSON.stringify(event)}\n\n`; }
