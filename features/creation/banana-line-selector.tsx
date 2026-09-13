"use client";

import {
  BANANA_LINES,
  imageLineName,
  isBananaLineReady,
  modelBananaLines,
} from "@/shared/contracts/banana-lines.mjs";
import type {
  BananaLine,
  GenerationModelId,
  GenerationResolution,
} from "@/shared/contracts/generation";
import type { ManagedModel } from "@/shared/contracts/model-management";

export function BananaLineSelector({
  modelId,
  model,
  resolution,
  value,
  onChange,
}: {
  modelId: GenerationModelId;
  model?: ManagedModel;
  resolution: GenerationResolution;
  value: BananaLine;
  onChange: (line: BananaLine) => void;
}) {
  const lines = model ? modelBananaLines(model) : null;
  const available = (id: string) =>
    isBananaLineReady(modelId, id) &&
    (model
      ? model.enabled &&
        lines?.[id]?.enabled &&
        Boolean(lines[id].prices[resolution])
      : id === "special");
  return (
    <div className="gpt-image-model-options">
      <div className="gpt-image-option-section">
        <label>线路</label>
        <div className="gpt-image-option-options format" aria-label="图片线路">
          {BANANA_LINES.map(({ id, name }) => (
            <button
              key={id}
              type="button"
              className={value === id ? "selected" : ""}
              aria-pressed={value === id}
              disabled={!available(id)}
              title={!available(id) ? `${name}线路尚未启用或定价` : undefined}
              onClick={() => onChange(id as BananaLine)}
            >
              {name}
            </button>
          ))}
        </div>
        {!available(value) && (
          <p className="mt-2 text-xs text-zinc-500">
            {imageLineName(value)}线路当前不可用，请选择其他线路。
          </p>
        )}
      </div>
    </div>
  );
}
