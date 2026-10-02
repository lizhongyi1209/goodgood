"use client";

import { useCallback, useContext, useEffect, useRef, useState, type CSSProperties } from "react";
import { Handle, NodeToolbar, Position, useReactFlow, useStore, type NodeProps } from "@xyflow/react";
import { ChevronsLeft, ChevronsRight, ImageIcon } from "lucide-react";

import { CanvasAdaptiveImage } from "./canvas-adaptive-image";
import { CanvasImageViewButton, canvasGenerationViewerItems } from "./canvas-image-view-button";
import type { GenerationJob } from "@/shared/contracts/generation";
import { initialCanvasImageSize } from "./canvas-image-size.mjs";
import { CanvasGeneratorHostContext } from "./canvas-generator-host";
import { CanvasImageCropToolbar, useCanvasImageCrop } from "./canvas-image-crop";
import { canvasCropImageForNode } from "./canvas-image-crop-image";
import { canvasGeneratorJobs, canvasGeneratorOutputs, canvasImageJobIsActive } from "./canvas-image-prompt-batch.mjs";
import type { CanvasGeneratorNodeType, CanvasNode } from "./canvas-workspace";
import styles from "./canvas-workspace.module.css";
import assetStyles from "./canvas-asset-panel.module.css";

export type CanvasGeneratorNodeData = Record<string, unknown> & {
  sequence?: number;
  job?: GenerationJob;
  jobs?: readonly GenerationJob[];
  imageSized?: boolean;
};

export function CanvasGeneratorNode({ id, data, selected }: NodeProps<CanvasGeneratorNodeType>) {
  const { request: cropRequest } = useCanvasImageCrop();
  const [selectedOutputId, setSelectedOutputId] = useState<string | null>(null);
  const [readyOutputs, setReadyOutputs] = useState<ReadonlySet<string>>(new Set());
  const onHostChange = useContext(CanvasGeneratorHostContext);
  const setHost = useCallback((element: HTMLDivElement | null) => onHostChange(id, element), [id, onHostChange]);
  const flow = useReactFlow<CanvasNode>();
  const jobs = canvasGeneratorJobs(data);
  const outputs = canvasGeneratorOutputs(data);
  const viewerImages = canvasGenerationViewerItems(jobs);
  const outputKey = jobs.map((job) => job.id).join(":");
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
  const stackCount = outputs.length;
  const stacked = stackCount > 1;
  const stackOffset = Math.min(10, Math.max(6, nodeWidth * 0.03));
  const expanded = stacked && expandedKey === outputKey;
  const currentOutput = expanded ? outputs.find((item) => item.id === selectedOutputId) ?? output : output;
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
      <CanvasImageCropToolbar image={cropImage} selected={selected} offsetX={expanded && currentOutput ? outputs.indexOf(currentOutput) * (nodeWidth + 12) : 0} />
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
      <div className={`${styles.generatorNode} ${assetStyles.visualFrame} ${output ? styles.generatedGenerator : ""} ${generating ? styles.generatorShimmering : ""} ${stacked ? styles.generatorBatch : ""}`}
        data-canvas-crop-image={!stacked ? output?.id : undefined}
        ref={bodyRef}
        data-canvas-stack-count={stackCount}
        data-canvas-stack-expanded={expanded}
        role={output ? "group" : "img"}
        aria-label={`图片生成 ${data.sequence ?? 1}${generating ? "，生成中" : output ? `，已生成 ${stackCount} 张图片` : ""}`}
        aria-busy={generating || undefined}>
        {generating && !output ? null : stacked ? outputs.map((item, index) => {
          const previewDepth = Math.min(index, 2);
          const hidden = !expanded && index > 2;
          return (
            <div key={item.id}
              data-canvas-crop-image={item.id}
              onPointerDown={() => { if (expanded && !cropRequest) setSelectedOutputId(item.id); }}
              className={`${styles.generatorStackItem} ${assetStyles.visualFrame} ${index === 0 ? styles.generatorStackItemActive : ""} ${hidden ? styles.generatorStackItemHidden : ""}`}
              aria-hidden={hidden || undefined}
              style={{ position: "absolute", "--canvas-stack-x": `${expanded ? index * (nodeWidth + 12) : previewDepth * stackOffset}px`,
                "--canvas-stack-y": `${expanded ? 0 : previewDepth * 4}px`,
                zIndex: expanded ? 1 : Math.max(0, 3 - index) } as CSSProperties}>
              <CanvasAdaptiveImage src={item.previewUrl} assetId={item.id} detailEnabled={expanded || index === 0} alt={`图片生成 ${data.sequence ?? 1} 的第 ${index + 1} 张结果`}
                className={styles.generatorImage} loading="eager"
                onLoad={(event) => markOutputReady(item, event.currentTarget)}
                onError={() => setReadyOutputs((current) => { const next = new Set(current); next.delete(`${item.id}:${item.previewUrl}`); return next; })} />
              {(expanded || index === 0) && <CanvasImageViewButton items={viewerImages} imageKey={item.id}
                disabled={Boolean(cropRequest) || !readyOutputs.has(`${item.id}:${item.previewUrl}`)} />}
            </div>
          );
        }) : output ? <CanvasAdaptiveImage src={output.previewUrl} assetId={output.id} alt={`图片生成 ${data.sequence ?? 1} 的生成结果`} className={styles.generatorImage}
          loading="eager" onLoad={(event) => markOutputReady(output, event.currentTarget)}
          onError={() => setReadyOutputs((current) => { const next = new Set(current); next.delete(`${output.id}:${output.previewUrl}`); return next; })} />
          : <ImageIcon size={32} strokeWidth={1.35} aria-hidden="true" />}
        {!stacked && output && <CanvasImageViewButton items={viewerImages} imageKey={output.id}
          disabled={Boolean(cropRequest) || !readyOutputs.has(`${output.id}:${output.previewUrl}`)} />}
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
        {!selected && jobs.some((job) => job.state === "failed" || job.state === "cancelled")
          ? <span className={styles.generatorFailure} role="alert">{jobs.length > 1 ? "部分提示词未完成，选中节点查看。" : jobs[0]?.error?.message ?? "生成未完成，请检查设置后重试。"}</span> : null}
      </div>
      <Handle type="target" id="reference" position={Position.Left} className={styles.generatorInputHandle} aria-label="连接图片或文本" title="图片或文本" />
      <NodeToolbar isVisible={cropRequest?.nodeId === id ? false : undefined} position={Position.Bottom} offset={12} align={align} style={{ width: toolbarWidth }} className={`${styles.generatorToolbar} nodrag nopan nowheel`}>
        <div ref={setHost} className={styles.generatorComposerHost} />
      </NodeToolbar>
    </>
  );
}
