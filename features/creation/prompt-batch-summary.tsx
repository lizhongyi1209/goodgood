import { parsePromptBatch } from "@/shared/contracts/prompt-batch.mjs";

export function PromptBatchSummary({ prompt, count, media }: { prompt: string; count: number; media: "image" | "video" }) {
  const batch = parsePromptBatch(prompt);
  if (!batch.hasSeparator) return null;
  return <div className="prompt-batch-summary" role="status" aria-live="polite">
    {batch.prompts.length ? <>批量提示词 · {batch.prompts.length} 段 × {count} = {batch.prompts.length * count} {media === "image" ? "张图片" : "个视频"} · 并发生成</> : "没有有效提示词，请在分隔符之间输入内容"}
  </div>;
}
