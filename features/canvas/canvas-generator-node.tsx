"use client";

import { useCallback, useContext, useEffect, useRef, useState, type CSSProperties } from "react";
import { Handle, NodeToolbar, Position, useReactFlow, useStore, type NodeProps } from "@xyflow/react";
import { ChevronsLeft, ChevronsRight, ImageIcon } from "lucide-react";

import { PrivateObjectImage } from "@/components/ui/private-object-image";
import type { GenerationJob } from "@/shared/contracts/generation";
import { initialCanvasImageSize } from "./canvas-image-size.mjs";
import { CanvasGeneratorHostContext } from "./canvas-generator-host";
import type { CanvasGeneratorNodeType, CanvasNode } from "./canvas-workspace";
import styles from "./canvas-workspace.module.css";

export type CanvasGeneratorNodeData = Record<string, unknown> & {
  sequence?: number;
  job?: GenerationJob;
  imageSized?: boolean;
};

export function CanvasGeneratorNode({ id, data, selected }: NodeProps<CanvasGeneratorNodeType>) {
  const onHostChange = useContext(CanvasGeneratorHostContext);
  const setHost = useCallback((element: HTMLDivElement | null) => onHostChange(id, element), [id, onHostChange]);
  const flow = useReactFlow<CanvasNode>();
  const outputs = data.job?.state === "succeeded" ? data.job.outputs : [];
  const outputKey = `${data.job?.id ?? "empty"}:${outputs.map((item) => item.id).join(":")}`;
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const output = outputs[0];
  const pixelWidth = output?.width;
  const pixelHeight = output?.height;
  const dimensions = typeof pixelWidth === "number" && Number.isFinite(pixelWidth) && pixelWidth > 0 &&
    typeof pixelHeight === "number" && Number.isFinite(pixelHeight) && pixelHeight > 0
    ? `${Math.round(pixelWidth)}×${Math.round(pixelHeight)}`
    : null;
  const generating = data.job?.state === "queued" || data.job?.state === "running" || data.job?.state === "refining";
  const screenLeft = useStore((state) => {
    const node = state.nodeLookup.get(id);
    return (node?.internals.positionAbsolute.x ?? 0) * state.transform[2] + state.transform[0];
  });
  const nodeWidth = useStore((state) => {
    const node = state.nodeLookup.get(id);
    return node?.measured?.width ?? (typeof node?.style?.width === "number" ? node.style.width : 238);
  });
  const stackCount = outputs.length;
  const stacked = stackCount > 1;
  const stackOffset = Math.min(10, Math.max(6, nodeWidth * 0.03));
  const expanded = stacked && expandedKey === outputKey;
  useEffect(() => {
    bodyRef.current?.dispatchEvent(new CustomEvent("canvas-visible-bounds-change", { bubbles: true }));
  }, [expanded, nodeWidth, outputKey, stackCount]);
  const zoom = useStore((state) => state.transform[2]);
  const viewportWidth = useStore((state) => state.width);
  const visibleLeft = typeof document === "undefined" ? 0 : document.getElementById("canvas-asset-sidebar")?.getBoundingClientRect().right ?? 0;
  const desiredWidth = Math.min(660, Math.max(120, viewportWidth - visibleLeft - 30));
  const center = screenLeft + nodeWidth * zoom / 2;
  let align: "start" | "center" | "end" = "center";
  let toolbarWidth = desiredWidth;
  if (center - desiredWidth / 2 < visibleLeft + 15) {
    align = "start";
    toolbarWidth = Math.min(desiredWidth, Math.max(120, viewportWidth - screenLeft - 15));
  } else if (center + desiredWidth / 2 > viewportWidth - 15) {
    align = "end";
    toolbarWidth = Math.min(desiredWidth, Math.max(120, screenLeft + nodeWidth * zoom - visibleLeft - 15));
  }

  const sizeGeneratorFromImage = (naturalWidth: number, naturalHeight: number) => {
    if (data.imageSized) return;
    const size = initialCanvasImageSize(naturalWidth, naturalHeight);
    if (!size) return;
    flow.updateNode(id, (node: CanvasNode) => node.type !== "imageGenerator" || node.data.imageSized ? {} : {
      style: { ...node.style, ...size }, data: { ...node.data, imageSized: true },
    });
  };

  useEffect(() => {
    if (!selected) return;
    let first = 0;
    let second = 0;
    first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        const surface = document.getElementById("canvas-workspace-surface");
        const toolbar = Array.from(document.querySelectorAll<HTMLElement>(".react-flow__node-toolbar"))
          .find((element) => element.dataset.id === id);
        if (!surface || !toolbar) return;
        const overflow = toolbar.getBoundingClientRect().bottom - surface.getBoundingClientRect().bottom + 14;
        if (overflow > 0) {
          const viewport = flow.getViewport();
          void flow.setViewport({ ...viewport, y: viewport.y - overflow }, { duration: 180 });
        }
      });
    });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [flow, id, selected]);

  return (
    <>
      <div className={`${styles.imageMetadata} ${nodeWidth < 110 ? styles.imageMetadataCompact : ""} ${nodeWidth < 90 ? styles.imageMetadataIconOnly : ""}`}>
        <span className={styles.imageMetadataName}>
          <span className={styles.generatorMetadataIcon}>
            <ImageIcon size={12} />
            <svg className={styles.generatorMetadataSparkle} viewBox="0 0 8 8" focusable="false">
              <path d="M4 0.5 4.65 3.35 7.5 4 4.65 4.65 4 7.5 3.35 4.65 0.5 4 3.35 3.35Z" />
            </svg>
          </span>
          <span className={styles.imageMetadataNameText}>图片生成器 {data.sequence ?? 1}</span>
        </span>
        {dimensions && <span className={styles.imageMetadataSize} aria-label={`原始尺寸 ${dimensions} 像素`}>{dimensions}</span>}
      </div>
      <div className={`${styles.generatorNode} ${output ? styles.generatedGenerator : ""} ${generating ? styles.generatorShimmering : ""} ${stacked ? styles.generatorBatch : ""}`}
        ref={bodyRef}
        data-canvas-stack-count={stackCount}
        data-canvas-stack-expanded={expanded}
        role={stacked ? "group" : "img"}
        aria-label={`图片生成器 ${data.sequence ?? 1}${generating ? "，生成中" : output ? `，已生成 ${stackCount} 张图片` : ""}`}
        aria-busy={generating || undefined}>
        {generating ? null : stacked ? outputs.map((item, index) => {
          const previewDepth = Math.min(index, 2);
          const hidden = !expanded && index > 2;
          return (
            <div key={item.id}
              className={`${styles.generatorStackItem} ${index === 0 ? styles.generatorStackItemActive : ""} ${hidden ? styles.generatorStackItemHidden : ""}`}
              aria-hidden={hidden || undefined}
              style={{ "--canvas-stack-x": `${expanded ? index * (nodeWidth + 12) : previewDepth * stackOffset}px`,
                "--canvas-stack-y": `${expanded ? 0 : previewDepth * 4}px`,
                zIndex: stackCount - index } as CSSProperties}>
              <PrivateObjectImage src={item.previewUrl} alt={`图片生成器 ${data.sequence ?? 1} 的第 ${index + 1} 张结果`}
                className={styles.generatorImage} loading="eager"
                onLoad={index === 0 ? (event) => sizeGeneratorFromImage(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight) : undefined} />
            </div>
          );
        }) : output ? <PrivateObjectImage src={output.previewUrl} alt={`图片生成器 ${data.sequence ?? 1} 的生成结果`} className={styles.generatorImage}
          loading="eager" onLoad={(event) => sizeGeneratorFromImage(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)} />
          : <ImageIcon size={32} strokeWidth={1.35} aria-hidden="true" />}
        {stacked && <button type="button" className={`${styles.generatorStackToggle} nodrag nopan nowheel`}
          aria-label={expanded ? "收起本批图片" : `展开本批 ${stackCount} 张图片`}
          aria-expanded={expanded}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            setExpandedKey((current) => current === outputKey ? null : outputKey);
          }}>
          {expanded ? <ChevronsLeft size={14} aria-hidden="true" /> : <ChevronsRight size={14} aria-hidden="true" />}
        </button>}
        {data.job?.state === "failed" || data.job?.state === "cancelled" ? <span className={styles.generatorFailure} role="alert">{data.job.error?.message ?? "生成未完成，请检查设置后重试。"}</span> : null}
      </div>
      <Handle type="target" id="reference" position={Position.Left} className={styles.generatorInputHandle} aria-label="连接参考图" />
      <NodeToolbar position={Position.Bottom} offset={12} align={align} style={{ width: toolbarWidth }} className={`${styles.generatorToolbar} nodrag nopan nowheel`}>
        <div ref={setHost} className={styles.generatorComposerHost} />
      </NodeToolbar>
    </>
  );
}
