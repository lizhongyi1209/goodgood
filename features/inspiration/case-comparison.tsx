"use client";
import { useState } from "react";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import type { CaseImage } from "./http-inspiration-boundary";
import type { PointerEvent } from "react";

export function CaseWipe({
  before,
  after,
  title,
  compact = false,
}: {
  before: CaseImage;
  after: CaseImage;
  title: string;
  compact?: boolean;
}) {
  const [position, setPosition] = useState(0);
  function move(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setPosition(
      Math.max(
        0,
        Math.min(100, ((event.clientX - rect.left) / rect.width) * 100),
      ),
    );
  }
  return (
    <div
      className={`case-wipe ${compact ? "is-compact" : ""}`}
      style={{
        aspectRatio:
          after.width && after.height ? after.width / after.height : 4 / 3,
      }}
      onPointerEnter={move}
      onPointerMove={move}
      onPointerLeave={() => setPosition(0)}
    >
      <PrivateObjectImage src={after.url} alt={`${title} · 处理后`} />
      <div
        className="case-wipe-before"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <PrivateObjectImage src={before.url} alt={`${title} · 处理前`} />
      </div>
      {position > 0 && (
        <>
          <span className="case-wipe-label is-before">处理前</span>
          <span className="case-wipe-label is-after">处理后</span>
          <span
            className="case-wipe-divider"
            style={{ left: `${position}%` }}
            aria-hidden="true"
          >
            <span>↔</span>
          </span>
        </>
      )}
      {!compact && (
        <input
          type="range"
          min={0}
          max={100}
          value={position}
          aria-label="调整前后对比位置"
          onFocus={() => setPosition(50)}
          onBlur={() => setPosition(0)}
          onChange={(event) => setPosition(Number(event.target.value))}
        />
      )}
    </div>
  );
}

export function CaseComparison({
  before,
  after,
  title,
  mode = "side_by_side",
}: {
  before: CaseImage | null;
  after: CaseImage;
  title: string;
  mode?: "side_by_side" | "hover";
}) {
  if (before && mode === "hover")
    return (
      <figure className="case-wipe-figure">
        <CaseWipe before={before} after={after} title={title} />
        <figcaption>划过图片查看对比，也可用方向键调整</figcaption>
      </figure>
    );
  return (
    <div className={`case-comparison ${before ? "has-before" : ""}`}>
      {before && (
        <figure>
          <PrivateObjectImage src={before.url} alt={`${title} · 处理前`} />
          <figcaption>处理前</figcaption>
        </figure>
      )}
      <figure>
        <PrivateObjectImage src={after.url} alt={`${title} · 处理后`} />
        <figcaption>{before ? "处理后" : "效果图"}</figcaption>
      </figure>
    </div>
  );
}
