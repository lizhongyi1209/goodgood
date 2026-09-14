"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  creditsToYuan,
  yuanToCredits,
} from "@/shared/contracts/model-pricing.mjs";
import {
  calculateTokenQuote,
  readSeedanceCompletionTokens,
} from "@/shared/contracts/seedance-token-pricing.mjs";

type DraftPrices = Record<
  string,
  { output: string; input: string; billing?: "tokens" }
>;

export function VideoTokenPricingEditor({
  resolutions,
  prices,
  onChange,
}: {
  resolutions: readonly string[];
  prices: DraftPrices;
  onChange: (prices: DraftPrices) => void;
}) {
  const [resolution, setResolution] = useState(resolutions[0]);
  const [tokens, setTokens] = useState("50638");
  const [reference, setReference] = useState("none");
  const [response, setResponse] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const tokenPrices = Object.fromEntries(
    Object.entries(prices).filter(([, price]) => price.billing === "tokens"),
  );
  const legacy = Object.values(prices).some(
    (price) => price.billing !== "tokens",
  );
  function update(key: string, field: "output" | "input", value: string) {
    onChange({
      ...tokenPrices,
      [key]: {
        billing: "tokens",
        output: tokenPrices[key]?.output ?? "",
        input: tokenPrices[key]?.input ?? "",
        [field]: value,
      },
    });
  }
  let quote: { credits: number; yuan: string } | null = null;
  try {
    const price = tokenPrices[resolution];
    if (price && /^\d+$/.test(tokens))
      quote = calculateTokenQuote(
        {
          [resolution]: {
            billing: "tokens",
            output: yuanToCredits(price.output),
            input: yuanToCredits(price.input),
          },
        },
        {
          resolution,
          completionTokens: Number(tokens),
          hasReferenceVideo: reference === "video",
        },
      );
  } catch {
    /* Keep incomplete prices editable. */
  }
  function parse() {
    try {
      const value = readSeedanceCompletionTokens(JSON.parse(response));
      if (value === null)
        throw new Error(
          "未找到有效的 completion_tokens。请检查 metadata.usage 或 usage；不使用 total_tokens 代替。",
        );
      setTokens(String(value));
      setParseError(null);
    } catch (failure) {
      setParseError(
        failure instanceof SyntaxError
          ? "响应不是有效 JSON，输入已保留。"
          : failure instanceof Error
            ? failure.message
            : "无法读取用量。",
      );
    }
  }
  return (
    <section aria-label="视频 tokens 定价" className="space-y-5">
      <div>
        <h3 className="text-sm font-medium">按实际 tokens 定价</h3>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          单位：人民币 / 百万 tokens。根据是否上传参考视频选择一档费率，按
          completion_tokens 计算整单价格；两档不相加。参考图片、音频不单独加价。
        </p>
        {legacy && (
          <p className="mt-2 text-xs text-zinc-500">
            当前保存的是旧秒价，请重新填写全部 token 售价后保存。
          </p>
        )}
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-[48px_minmax(0,1fr)_minmax(0,1fr)] gap-3 text-[11px] text-zinc-500">
          <span>分辨率</span>
          <span>无参考视频 · 元/百万 tokens</span>
          <span>含参考视频 · 元/百万 tokens</span>
        </div>
        {resolutions.map((key) => (
          <div
            key={key}
            className="grid grid-cols-[48px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3"
          >
            <span className="text-xs font-medium">{key}</span>
            {(["output", "input"] as const).map((field) => (
              <Input
                key={field}
                aria-label={`${key} ${field === "output" ? "无参考视频" : "含参考视频"} token 售价`}
                inputMode="decimal"
                placeholder="未定价"
                value={tokenPrices[key]?.[field] ?? ""}
                onChange={(event) => update(key, field, event.target.value)}
              />
            ))}
          </div>
        ))}
      </div>
      <section
        aria-label="tokens 价格试算"
        className="rounded-2xl bg-zinc-50 p-4"
      >
        <h3 className="text-sm font-medium">实际用量试算</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-zinc-500">
            分辨率
            <Select value={resolution} onValueChange={setResolution}>
              <SelectTrigger aria-label="tokens 试算分辨率" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {resolutions.map((key) => (
                  <SelectItem key={key} value={key}>
                    {key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="text-xs text-zinc-500">
            参考视频
            <Select value={reference} onValueChange={setReference}>
              <SelectTrigger aria-label="试算参考视频" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">无参考视频</SelectItem>
                <SelectItem value="video">含参考视频</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="text-xs text-zinc-500">
            completion_tokens
            <Input
              aria-label="实际 completion_tokens"
              className="mt-1"
              inputMode="numeric"
              value={tokens}
              onChange={(event) => setTokens(event.target.value)}
            />
          </label>
        </div>
        <p className="mt-3 text-[11px] leading-5 text-zinc-500">
          人民币金额 = tokens × 所选单价 ÷ 1,000,000。积分 = 金额 ×
          100，整单向上取整一次。
        </p>
        <p aria-live="polite" className="mt-3 text-sm">
          {quote
            ? `计算金额 ¥${quote.yuan} · 应扣 ${quote.credits} 积分（¥${creditsToYuan(quote.credits)}）`
            : "填写有效价格与实际用量后显示结果。"}
        </p>
        <label className="mt-4 block text-xs text-zinc-500">
          粘贴接口响应（可选）
          <Textarea
            aria-label="Seedance 响应 JSON"
            className="mt-2 min-h-20 bg-white font-mono text-xs"
            placeholder={'{"metadata":{"usage":{"completion_tokens":50638}}}'}
            value={response}
            onChange={(event) => setResponse(event.target.value)}
          />
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={parse}
        >
          读取 tokens
        </Button>
        {parseError && (
          <p role="alert" className="mt-2 text-xs text-destructive">
            {parseError}
          </p>
        )}
        <p className="mt-2 text-[11px] text-zinc-400">
          这里只试算，不提交生成、不扣积分。参考视频状态请按实际请求选择。
        </p>
      </section>
    </section>
  );
}
