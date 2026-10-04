"use client";

import { useCallback, useContext, useEffect, useRef, useState, type CSSProperties } from "react";
import { Handle, NodeToolbar, Position, useReactFlow, useStore, type NodeProps } from "@xyflow/react";
import { ChevronsLeft, ChevronsRight, ImageIcon, RotateCcw } from "lucide-react";

import { CanvasAdaptiveImage } from "./canvas-adaptive-image";
import { CanvasImageViewButton, canvasGenerationViewerItems } from "./canvas-image-view-button";
import type { GenerationJob } from "@/shared/contracts/generation";
import { initialCanvasImageSize } from "./canvas-image-size.mjs";
import { CanvasGeneratorHostContext } from "./canvas-generator-host";
import { CanvasImageCropToolbar, useCanvasImageCrop } from "./canvas-image-crop";
import { canvasCropImageForNode } from "./canvas-image-crop-image";
import { canvasGeneratorJobs, canvasGeneratorOutputs, canvasImageJobIsActive } from "./canvas-image-prompt-batch.mjs";
import { canvasGeneratorSlots, canvasGeneratorResultSlots, canvasImageSlotCanRetry, type CanvasImageSlot } from "./canvas-image-slots.mjs";
import type { CanvasGeneratorNodeType, CanvasNode } from "./canvas-workspace";
import styles from "./canvas-workspace.module.css";
import assetStyles from "./canvas-asset-panel.module.css";

export type CanvasGeneratorNodeData = Record<string, unknown> & {
  sequence?: number;
  job?: GenerationJob;
  jobs?: readonly GenerationJob[];
  slots?: readonly CanvasImageSlot[];
  onRetrySlot?: (index: number) => void;
  imageSized?: boolean;
};

export function CanvasGeneratorNode({ id, data, selected }: NodeProps<CanvasGeneratorNodeType>) {
  const { request: cropRequest } = useCanvasImageCrop();
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const [readyOutputs, setReadyOutputs] = useState<ReadonlySet<string>>(new Set());
  const onHostChange = useContext(CanvasGeneratorHostContext);
  const setHost = useCallback((element: HTMLDivElement | null) => onHostChange(id, element), [id, onHostChange]);
  const flow = useReactFlow<CanvasNode>();
  const jobs = canvasGeneratorJobs(data);
  const outputs = canvasGeneratorOutputs(data);
  const slots = canvasGeneratorSlots(data);
  const resultSlots = canvasGeneratorResultSlots(data);
  const viewerImages = canvasGenerationViewerItems(jobs);
  const outputKey = slots.map((slot) => slot.id).join(":");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const output = outputs[0];
  const pixelWidth = output?.width;
  const pixelHeight = output?.height;
  const dimensions = typeof pixelWidth === "number" && Number.isFinite(pixelWidth) && pixelWidth > 0 &&
    typeof pixelHeight === "number" && Number.isFinite(pixelHeight) && pixelHeight > 0
    ? `${Math.round(pixelWidth)}×${Math.round(pixelHeight)}`
    : null;
  const generating = jobs.some(canvasImageJobIsActive);
  const screenLeft = useStore((state) => {
    const node = state.nodeLookup.get(id);
    return (node?.internals.positionAbsolute.x ?? 0) * state.transform[2] + state.transform[0];
  });
  const nodeWidth = useStore((state) => {
    const node = state.nodeLookup.get(id);
    return node?.measured?.width ?? (typeof node?.style?.width === "number" ? node.style.width : 238);
  });
  const stackCount = resultSlots.length;
  const stacked = stackCount > 1;
  const stackOffset = Math.min(10, Math.max(6, nodeWidth * 0.03));
  const expanded = stacked && expandedKey === outputKey;
  const currentResult = expanded ? resultSlots.find((item) => item.key === selectedSlotKey) ?? resultSlots[0] : resultSlots[0];
  const currentOutput = currentResult?.output;
  const cropImage = currentOutput && readyOutputs.has(`${currentOutput.id}:${currentOutput.previewUrl}`)
    ? canvasCropImageForNode({ id, type: "imageGenerator", data, position: { x: 0, y: 0 } }, currentOutput.id) : null;
  const markOutputReady = (item: NonNullable<typeof output>, image: HTMLImageElement) => {
    setReadyOutputs((current) => new Set([...current, `${item.id}:${item.previewUrl}`]));
    if (item.id === output?.id) sizeGeneratorFromImage(image.naturalWidth, image.naturalHeight);
  };
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
          .find((element) => element.dataset.id === id && element.classList.contains(styles.generatorToolbar));
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
      <CanvasImageCropToolbar image={cropImage} selected={selected} offsetX={expanded && currentResult ? resultSlots.indexOf(currentResult) * (nodeWidth + 12) : 0} />
      <div className={`${styles.imageMetadata} ${nodeWidth < 110 ? styles.imageMetadataCompact : ""} ${nodeWidth < 90 ? styles.imageMetadataIconOnly : ""}`}>
        <span className={styles.imageMetadataName}>
          <span className={styles.generatorMetadataIcon}>
            <ImageIcon size={12} />
            <svg className={styles.generatorMetadataSparkle} viewBox="0 0 8 8" focusable="false">
              <path d="M4 0.5 4.65 3.35 7.5 4 4.65 4.65 4 7.5 3.35 4.65 0.5 4 3.35 3.35Z" />
            </svg>
          </span>
          <span className={styles.imageMetadataNameText}>图片生成 {data.sequence ?? 1}</span>
        </span>
        {dimensions && <span className={styles.imageMetadataSize} aria-label={`原始尺寸 ${dimensions} 像素`}>{dimensions}</span>}
      </div>
      <div className={`${styles.generatorNode} ${assetStyles.visualFrame} ${output ? styles.generatedGenerator : ""} ${stacked ? styles.generatorBatch : ""}`}
        data-canvas-crop-image={!stacked ? resultSlots[0]?.output?.id : undefined}
        ref={bodyRef}
        data-canvas-stack-count={stackCount}
        data-canvas-stack-expanded={expanded}
        role={stackCount ? "group" : "img"}
        aria-label={`图片生成 ${data.sequence ?? 1}${stackCount ? `，${stackCount} 个结果位置，已生成 ${outputs.length} 张` : ""}${generating ? "，生成中" : ""}`}
        aria-busy={generating || undefined}>
        {stackCount ? resultSlots.map((slot, index) => {
          const item = slot.output;
          const previewDepth = Math.min(index, 2);
          const hidden = !expanded && index > 2;
          const active = canvasImageJobIsActive(slot.job);
          const failed = ["failed", "cancelled"].includes(slot.job.state);
          return (
            <div key={slot.key}
              data-canvas-crop-image={item?.id}
              data-canvas-result-slot={slot.id}
              data-canvas-slot-state={slot.job.state}
              onPointerDown={() => { if (expanded && !cropRequest) setSelectedSlotKey(slot.key); }}
              className={`${stacked ? styles.generatorStackItem : styles.generatorSingleItem} ${assetStyles.visualFrame} ${index === 0 ? styles.generatorStackItemActive : ""} ${hidden ? styles.generatorStackItemHidden : ""} ${active ? styles.generatorShimmering : ""} ${!item ? styles.generatorSlotEmpty : ""}`}
              aria-hidden={hidden || undefined}
              style={{ position: "absolute", "--canvas-stack-x": `${expanded ? index * (nodeWidth + 12) : previewDepth * stackOffset}px`,
                "--canvas-stack-y": `${expanded ? 0 : previewDepth * 4}px`,
                zIndex: expanded ? 1 : Math.max(0, 3 - index) } as CSSProperties}>
              {item ? <CanvasAdaptiveImage src={item.previewUrl} assetId={item.id} detailEnabled={expanded || index === 0} alt={`图片生成 ${data.sequence ?? 1} 的第 ${index + 1} 张结果`}
                className={styles.generatorImage} loading="eager"
                onLoad={(event) => markOutputReady(item, event.currentTarget)}
                onError={() => setReadyOutputs((current) => { const next = new Set(current); next.delete(`${item.id}:${item.previewUrl}`); return next; })} />
                : failed ? <>
                  <button type="button" className={`${styles.generatorSlotRetry} nodrag nopan nowheel`}
                    tabIndex={hidden || !expanded && index > 0 ? -1 : 0}
                    disabled={!data.onRetrySlot || !canvasImageSlotCanRetry(slot) || Boolean(cropRequest)}
                    aria-label={`重试第 ${index + 1} 张图片`} title={slot.job.error?.message}
                    onPointerDown={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}
                    onClick={(event) => { event.stopPropagation(); data.onRetrySlot?.(slot.slotIndex); }}>
                    <RotateCcw size={18} aria-hidden="true" /><span>重试</span>
                  </button>
                  <span className={styles.generatorSlotStatus} role="status" title={slot.job.error?.message}>
                    {slot.job.error?.code === "SUBMISSION_UNKNOWN" ? "状态待确认" : "生成未完成"}
                  </span>
                </> : <ImageIcon size={32} strokeWidth={1.35} aria-hidden="true" />}
              {item && (expanded || index === 0) && <CanvasImageViewButton items={viewerImages} imageKey={item.id}
                disabled={Boolean(cropRequest) || !readyOutputs.has(`${item.id}:${item.previewUrl}`)} />}
            </div>
          );
        }) : <ImageIcon size={32} strokeWidth={1.35} aria-hidden="true" />}
        {stacked && <button type="button" className={`${styles.generatorStackToggle} nodrag nopan nowheel`}
          disabled={cropRequest?.nodeId === id}
          aria-label={expanded ? "收起本批图片" : `展开本批 ${stackCount} 张图片`}
          aria-expanded={expanded}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            setExpandedKey((current) => current === outputKey ? null : outputKey);
          }}>
          {expanded ? <ChevronsLeft size={14} aria-hidden="true" /> : <ChevronsRight size={14} aria-hidden="true" />}
        </button>}
      </div>
      <Handle type="target" id="reference" position={Position.Left} className={styles.generatorInputHandle} aria-label="连接图片或文本" title="图片或文本"
        role="button" tabIndex={0} onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); event.currentTarget.click(); }
        }} />
      <NodeToolbar isVisible={cropRequest?.nodeId === id ? false : undefined} position={Position.Bottom} offset={12} align={align} style={{ width: toolbarWidth }} className={`${styles.generatorToolbar} nodrag nopan nowheel`}>
        <div ref={setHost} className={styles.generatorComposerHost} />
      </NodeToolbar>
    </>
  );
}
