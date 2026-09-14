"use client";
import type { CasePreparation } from "./http-inspiration-boundary";
import { PrivateObjectImage } from "@/components/ui/private-object-image";

export function CaseComparisonSettings({
  options,
  selectedId,
  mode,
  busy,
  onSelect,
  onMode,
}: {
  options: CasePreparation["beforeOptions"];
  selectedId: string;
  mode: "side_by_side" | "hover";
  busy: boolean;
  onSelect: (id: string) => void;
  onMode: (mode: "side_by_side" | "hover") => void;
}) {
  return (
    <section
      className="case-comparison-settings"
      aria-labelledby="case-comparison-heading"
    >
      <h2 id="case-comparison-heading">效果对比</h2>
      <p className="case-field-hint">
        选择本作品的参考图作为变化前，生成结果作为效果图。
      </p>
      {options.length ? (
        <fieldset className="case-reference-choice">
          <legend>变化前 · 选择参考图</legend>
          <div className="case-reference-options">
            {options.map((item, index) => (
              <label
                key={item.id}
                className={selectedId === item.id ? "is-selected" : ""}
              >
                <input
                  type="radio"
                  name="before-image"
                  checked={selectedId === item.id}
                  disabled={busy}
                  onChange={() => onSelect(item.id)}
                />
                <PrivateObjectImage src={item.url} alt="" />
                <span>
                  参考图 {index + 1} · {item.name}
                </span>
              </label>
            ))}
            <label
              className={`case-no-comparison ${selectedId ? "" : "is-selected"}`}
            >
              <input
                type="radio"
                name="before-image"
                checked={!selectedId}
                disabled={busy}
                onChange={() => onSelect("")}
              />
              <span>仅展示效果图</span>
            </label>
          </div>
          <p className="case-field-hint">
            只公开选中的参考图，其余参考素材保持私有。
          </p>
        </fieldset>
      ) : (
        <p className="case-comparison-empty">
          这张作品没有可用于对比的参考图，将只展示生成效果图。
        </p>
      )}
      <fieldset
        className="case-choice is-inline"
        disabled={busy || !selectedId}
      >
        <legend>展示方式</legend>
        <label>
          <input
            type="radio"
            name="comparison"
            checked={mode === "side_by_side"}
            onChange={() => onMode("side_by_side")}
          />
          左右并排
        </label>
        <label>
          <input
            type="radio"
            name="comparison"
            checked={mode === "hover"}
            onChange={() => onMode("hover")}
          />
          鼠标划过
        </label>
      </fieldset>
      {!selectedId && options.length > 0 && (
        <p className="case-field-hint">
          选中一张变化前参考图后，可设置对比展示方式。
        </p>
      )}
    </section>
  );
}

export function casePublicationIssue({
  consent,
  title,
  prompt,
}: {
  consent: boolean;
  title: string;
  prompt: string;
}) {
  if (!consent) return "请先勾选发布确认，再发布到灵感板。";
  if (!title.trim()) return "请填写案例名称。";
  if (!prompt.trim()) return "请填写预设提示词。";
  return null;
}
