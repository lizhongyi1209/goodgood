"use client";

import { ChevronRight } from "lucide-react";
import { modelVideoLines } from "@/shared/contracts/seedance-models.mjs";
import { Button } from "@/components/ui/button";
import {
  MODEL_TEMPLATES,
  creditsToYuan,
} from "@/shared/contracts/model-pricing.mjs";
import type {
  ManagedModel,
  ModelSpecificationPrices,
} from "@/shared/contracts/model-management";
import { modelBananaLines } from "@/shared/contracts/banana-lines.mjs";

function priceRange(values: number[]) {
  const valid = values.filter(
    (value) => Number.isSafeInteger(value) && value > 0,
  );
  if (!valid.length) return "未定价";
  const min = Math.min(...valid),
    max = Math.max(...valid);
  return min === max
    ? `¥${creditsToYuan(min)}`
    : `¥${creditsToYuan(min)}–${creditsToYuan(max)}`;
}

export function modelCardSummary(model: ManagedModel) {
  const template = MODEL_TEMPLATES.find((item) => item.id === model.adapterId);
  const imageLines = modelBananaLines(model);
  const videoLines = modelVideoLines(model);
  const line =
    model.mediaType === "video" ? videoLines?.standard : imageLines?.special;
  const prices: ModelSpecificationPrices = line?.prices ?? model.prices;
  const entries = Object.entries(prices)
    .filter(([key]) => template?.resolutions.includes(key))
    .map(([, price]) => price);
  const tokenRates = entries.filter((price) => price.billing === "tokens");
  return {
    resolutions: template?.resolutions ?? [],
    lineCount: model.mediaType === "video" ? 2 : imageLines ? 3 : 1,
    lineName:
      model.mediaType === "video" ? "标准" : imageLines ? "特价" : "默认",
    lineEnabled: line?.enabled ?? model.enabled,
    output: priceRange(
      model.mediaType === "image"
        ? entries.flatMap((price) =>
            price.qualities
              ? (Object.values(price.qualities) as number[])
              : [price.output],
          )
        : tokenRates.map((price) => price.output),
    ),
    reference: priceRange(tokenRates.map((price) => price.input ?? 0)),
    unit: model.mediaType === "image" ? "元/张" : "元/百万token",
    legacy:
      model.mediaType === "video" &&
      entries.some((price) => price.billing !== "tokens"),
  };
}

export function ModelPricingList({
  models,
  busy,
  onEdit,
  onToggle,
}: {
  models: readonly ManagedModel[];
  busy: boolean;
  onEdit: (model: ManagedModel) => void;
  onToggle: (model: ManagedModel) => void;
}) {
  return (
    <section aria-label="模型列表" className="mt-6 space-y-7">
      {(["image", "video"] as const).map((mediaType) => {
        const group = models.filter((model) => model.mediaType === mediaType);
        if (mediaType === "video")
          group.sort(
            (a, b) =>
              MODEL_TEMPLATES.findIndex((t) => t.id === a.adapterId) -
              MODEL_TEMPLATES.findIndex((t) => t.id === b.adapterId),
          );
        if (!group.length) return null;
        return (
          <section
            key={mediaType}
            aria-label={mediaType === "image" ? "图片模型价格" : "视频模型价格"}
          >
            <h2 className="mb-3 text-sm font-medium">
              {mediaType === "image" ? "图片模型" : "视频模型"}
              <span className="ml-2 text-xs font-normal text-zinc-400">
                {group.length}
              </span>
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-3">
              {group.map((model) => {
                const summary = modelCardSummary(model);
                return (
                  <article
                    key={model.id}
                    aria-label={`${model.name} 价格`}
                    className="flex min-w-0 flex-col rounded-2xl border border-zinc-200/70 bg-white"
                  >
                    <button
                      type="button"
                      aria-label={`${model.name} 价格详情`}
                      aria-haspopup="dialog"
                      disabled={busy}
                      onClick={() => onEdit(model)}
                      className="group flex flex-1 flex-col gap-4 rounded-t-2xl p-4 text-left transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
                    >
                      <div className="flex w-full items-start justify-between gap-3">
                        <h3 className="min-w-0 text-sm font-semibold leading-5">
                          {model.name}
                        </h3>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${model.enabled ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-400"}`}
                        >
                          {model.enabled ? "已启用" : "已禁用"}
                        </span>
                      </div>
                      <div className="flex w-full items-center justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1.5 tabular-nums">
                          <p className="text-[11px] text-zinc-400">
                            {summary.lineName}
                            {summary.lineEnabled ? "" : " · 未启用"}
                            <span className="ml-2">{summary.unit}</span>
                          </p>
                          {mediaType === "image" ? (
                            <p className="text-base font-medium">
                              {summary.output}
                            </p>
                          ) : summary.legacy ? (
                            <p className="text-xs text-zinc-500">
                              待配置 token 价格
                            </p>
                          ) : (
                            <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1 text-xs">
                              <dt className="text-zinc-500">无参考视频</dt>
                              <dd className="text-right font-medium">
                                {summary.output}
                              </dd>
                              <dt className="text-zinc-500">含参考视频</dt>
                              <dd className="text-right font-medium">
                                {summary.reference}
                              </dd>
                            </dl>
                          )}
                        </div>
                        <ChevronRight
                          aria-hidden="true"
                          className="size-4 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                        />
                      </div>
                    </button>
                    <div className="flex items-center justify-between gap-2 px-4 pb-3">
                      <p className="min-w-0 text-[10px] leading-5 text-zinc-400">
                        {summary.resolutions.join(" · ")}
                        <span className="ml-2">{summary.lineCount} 条线路</span>
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 shrink-0 px-2 text-xs"
                        aria-label={`${model.enabled ? "禁用" : "启用"} ${model.name}`}
                        disabled={busy}
                        onClick={() => onToggle(model)}
                      >
                        {model.enabled ? "禁用" : "启用"}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </section>
  );
}
