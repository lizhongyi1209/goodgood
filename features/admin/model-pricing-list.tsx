"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  MODEL_TEMPLATES,
  creditsToYuan,
} from "@/shared/contracts/model-pricing.mjs";
import type { ManagedModel } from "@/shared/contracts/model-management";

const IMAGE_RESOLUTIONS = ["1K", "2K", "4K"];
const VIDEO_RESOLUTIONS = ["480p", "720p", "1080p", "4K"];
const ROW_LAYOUT = "lg:grid-cols-[minmax(180px,1fr)_minmax(0,2fr)_150px]";

function ModelPrice({
  model,
  resolution,
}: {
  model: ManagedModel;
  resolution: string;
}) {
  const template = MODEL_TEMPLATES.find((item) => item.id === model.adapterId);
  const supported = template?.resolutions.includes(resolution);
  const price = model.prices[resolution];
  return (
    <div className="min-w-0 text-center tabular-nums">
      <p className="mb-2 text-xs text-zinc-400 lg:sr-only">{resolution}</p>
      {!supported ? (
        <p className="text-xs text-zinc-400">不支持</p>
      ) : !price ? (
        <p className="text-xs text-zinc-400">未定价</p>
      ) : model.mediaType === "image" ? (
        <>
          <p className="text-sm font-medium">¥{creditsToYuan(price.output)}</p>
          <p className="mt-1 text-[11px] text-zinc-400">
            {price.output} 积分/张
          </p>
        </>
      ) : (
        <dl className="mx-auto grid max-w-36 grid-cols-[auto_1fr] items-baseline gap-x-2 gap-y-1.5">
          <dt className="text-left text-[11px] text-zinc-400">输出</dt>
          <dd className="text-right">
            <span className="text-sm font-medium">
              ¥{creditsToYuan(price.output)}
            </span>
            <span className="mt-0.5 block text-[10px] text-zinc-400">
              {price.output} 积分/秒
            </span>
          </dd>
          <dt className="text-left text-[11px] text-zinc-400">参考</dt>
          <dd className="text-right">
            <span className="text-xs text-zinc-600">
              ¥{creditsToYuan(price.input ?? 0)}
            </span>
            <span className="mt-0.5 block text-[10px] text-zinc-400">
              {price.input ?? 0} 积分/秒
            </span>
          </dd>
        </dl>
      )}
    </div>
  );
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
    <section aria-label="模型列表" className="mt-7 space-y-9">
      {(["image", "video"] as const).map((mediaType) => {
        const group = models.filter((model) => model.mediaType === mediaType);
        if (!group.length) return null;
        const resolutions =
          mediaType === "image" ? IMAGE_RESOLUTIONS : VIDEO_RESOLUTIONS;
        const priceLayout =
          mediaType === "image" ? "grid-cols-3" : "grid-cols-2 lg:grid-cols-4";
        return (
          <section
            key={mediaType}
            aria-label={mediaType === "image" ? "图片模型价格" : "视频模型价格"}
          >
            <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-sm font-medium">
                {mediaType === "image" ? "图片模型" : "视频模型"}
                <span className="ml-2 text-xs font-normal text-zinc-400">
                  {group.length}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                {mediaType === "image"
                  ? "每张售价"
                  : "每秒售价 · 输出与参考视频分别计价"}
              </p>
            </div>
            <div
              aria-hidden="true"
              className={`hidden items-center gap-x-6 border-b border-zinc-100 pb-3 text-xs text-zinc-400 lg:grid ${ROW_LAYOUT}`}
            >
              <span>模型</span>
              <div className={`grid gap-5 ${priceLayout}`}>
                {resolutions.map((resolution) => (
                  <span key={resolution} className="text-center">
                    {resolution}
                  </span>
                ))}
              </div>
              <span className="text-right">操作</span>
            </div>
            {group.map((model) => (
              <article
                key={model.id}
                aria-label={`${model.name} 价格`}
                className={`grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-5 border-b border-zinc-100 py-5 lg:items-center lg:gap-x-6 ${ROW_LAYOUT}`}
              >
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold leading-5">
                    {model.name}
                  </h3>
                  <p
                    className={`mt-1.5 text-xs ${model.enabled ? "text-primary" : "text-zinc-400"}`}
                  >
                    {model.enabled ? "已启用" : "已禁用"}
                  </p>
                </div>
                <div
                  className={`order-3 col-span-2 grid gap-x-5 gap-y-5 lg:order-2 lg:col-span-1 ${priceLayout}`}
                >
                  {resolutions.map((resolution) => (
                    <ModelPrice
                      key={resolution}
                      model={model}
                      resolution={resolution}
                    />
                  ))}
                </div>
                <div className="order-2 flex justify-end gap-0.5 lg:order-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => onEdit(model)}
                  >
                    <Pencil className="hidden size-3.5 sm:block" />
                    定价
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => onToggle(model)}
                  >
                    {model.enabled ? "禁用" : "启用"}
                  </Button>
                </div>
              </article>
            ))}
          </section>
        );
      })}
    </section>
  );
}
