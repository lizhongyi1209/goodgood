"use client";

import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Handle, NodeResizeControl, Position, useReactFlow, useStore, useStoreApi, type NodeProps, type OnResizeEnd } from "@xyflow/react";
import { FolderOpen, ImageOff } from "lucide-react";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import { ImageViewer, type ImageViewerItem } from "@/features/assets/image-viewer";
import { privateImageUrls } from "@/shared/private-image-urls.mjs";
import { CanvasGroupNode, type CanvasGroupNodeType } from "./canvas-group-node";
import { canvasReferenceGroupMembers, imageSourceAsset } from "./canvas-reference-sources.mjs";
import { isCanvasAlbumId } from "./canvas-folder-album.mjs";
import { resizeCanvasGroup } from "./canvas-groups.mjs";
import { useCanvasGroupActions } from "./canvas-group-context";
import type { CanvasNode } from "./canvas-workspace";
import styles from "./canvas-folder-album-node.module.css";
import workspaceStyles from "./canvas-workspace.module.css";

const albumCorners = [
  { position: "top-left", label: "左上角" }, { position: "top-right", label: "右上角" },
  { position: "bottom-left", label: "左下角" }, { position: "bottom-right", label: "右下角" },
] as const;

export function CanvasGroupDisplayNode(props: NodeProps<CanvasGroupNodeType>) {
  return isCanvasAlbumId(props.id) ? <CanvasFolderAlbumNode {...props} /> : <CanvasGroupNode {...props} />;
}

function AlbumThumbnail({ item, index, onOpen }: { item: ImageViewerItem; index: number; onOpen: (button: HTMLButtonElement) => void }) {
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const [attempt, setAttempt] = useState(0);
  return <button type="button" className={styles.thumbnail} aria-label={state === "failed" ? `重试第 ${index + 1} 张图片：${item.name}` : `查看第 ${index + 1} 张图片：${item.name}`}
    title={item.name} aria-busy={state === "loading" || undefined}
    onClick={(event) => {
      event.stopPropagation();
      if (state === "failed") { setAttempt((value) => value + 1); setState("loading"); } else onOpen(event.currentTarget);
    }}>
    {state !== "failed" && <PrivateObjectImage key={attempt} src={item.previewUrl} alt={item.name} loading="lazy" draggable={false}
      onLoad={() => setState("ready")} onError={() => setState("failed")} />}
    {state === "loading" && <span className={styles.imageState}>读取中</span>}
    {state === "failed" && <span className={styles.imageState}><ImageOff size={16} aria-hidden="true" /><span>重试</span></span>}
    <span className={styles.number} aria-hidden="true">{index + 1}</span>
  </button>;
}

function CanvasFolderAlbumNode({ id, data, selected }: NodeProps<CanvasGroupNodeType>) {
  const flow = useReactFlow<CanvasNode>();
  const store = useStoreApi<CanvasNode>();
  const actions = useCanvasGroupActions();
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const nodes = useStore((state) => state.nodes) as CanvasNode[];
  const connected = useStore((state) => state.edges.some((edge) => edge.source === id && edge.sourceHandle === "reference"));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);
  const items = useMemo<ImageViewerItem[]>(() => canvasReferenceGroupMembers({ id, type: "group", position: { x: 0, y: 0 }, data }, nodes).flatMap((node) => {
    const asset = imageSourceAsset(node);
    if (!asset?.assetId) return [];
    const urls = privateImageUrls(asset.generated ? "asset" : "reference", asset.assetId);
    return [{ key: node.id, name: asset.name, previewUrl: urls.previewUrl, sourceUrl: urls.contentUrl,
      width: node.type === "sourceImage" ? node.data.pixelWidth : undefined,
      height: node.type === "sourceImage" ? node.data.pixelHeight : undefined }];
  }), [id, data, nodes]);
  const viewerKey = selectedKey && items.some((item) => item.key === selectedKey) ? selectedKey : null;
  // Stable callbacks preserve the native drag gesture across geometry changes.
  const startResize = useCallback(() => {
    actionsRef.current.onBeforeGraphEdit();
    flow.updateNodeData(id, { sizing: "manual" });
  }, [flow, id]);
  const finishResize = useCallback<OnResizeEnd>((_event, frame) => {
    const width = Math.round(frame.width); const height = Math.round(frame.height);
    flow.setNodes((current) => current.map((node) => node.id === id
      ? { ...node, width, height, style: { ...node.style, width, height } } : node));
    actionsRef.current.onProjectGraphChange(true);
  }, [flow, id]);
  const resizeWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>, corner: string) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    const state = store.getState(); const album = flow.getNode(id);
    if (!album) return;
    const step = event.shiftKey ? 50 : 10;
    const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
    const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
    const left = corner.endsWith("left"); const top = corner.startsWith("top");
    const next = resizeCanvasGroup(state.nodes, id, {
      x: album.position.x + (left ? dx : 0), y: album.position.y + (top ? dy : 0),
      width: Number(album.width ?? album.measured?.width ?? album.style?.width) + (left ? -dx : dx),
      height: Number(album.height ?? album.measured?.height ?? album.style?.height) + (top ? -dy : dy),
    });
    if (next === state.nodes) return;
    actionsRef.current.onBeforeGraphEdit(); flow.setNodes(next);
    actionsRef.current.onProjectGraphChange(true);
  };

  return <>
    <header className={`${workspaceStyles.imageMetadata} ${styles.header} canvas-album-drag-handle`}>
      <span className={workspaceStyles.imageMetadataName}>
        <FolderOpen size={12} aria-hidden="true" />
        <span className={workspaceStyles.imageMetadataNameText} title={data.name}>{data.name}</span>
      </span>
      <span className={workspaceStyles.imageMetadataSize} aria-label={`${items.length} 张图片`}>{items.length} 张</span>
    </header>
    <section className={`${styles.album} canvas-album-drag-handle`} data-selected={selected || undefined} aria-label={`相册：${data.name}，${items.length} 张图片`}>
      {items.length ? <div className={`${styles.grid} nopan nowheel nokey`} role="group" aria-label="相册图片" tabIndex={0}>
        {items.map((item, index) => <AlbumThumbnail key={item.key} item={item} index={index} onOpen={(button) => {
          returnFocusRef.current = button; setSelectedKey(item.key);
        }} />)}
      </div> : <div className={styles.empty} role="status"><FolderOpen size={24} strokeWidth={1.4} aria-hidden="true" /><span>文件夹中暂无图片</span></div>}
      <div className={`${styles.caption} canvas-album-drag-handle`}>连接到节点，一次性载入所有图片</div>
    </section>
    <Handle type="source" id="reference" position={Position.Right} className={`${workspaceStyles.referenceOutputHandle} ${styles.handle} nodrag nopan`}
      data-connected={connected || undefined} isConnectable={items.length > 0} isConnectableEnd={false}
      title={`连接 ${items.length} 张候选图片`} aria-label={`连接相册 ${data.name} 到批量素材组`}
      role="button" tabIndex={items.length ? 0 : -1} onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); event.currentTarget.click(); }
      }} />
    {selected && albumCorners.map(({ position, label }) => <NodeResizeControl key={position} position={position}
      minWidth={200} minHeight={120} keepAspectRatio={false}
      className={`${workspaceStyles.resizeControl} ${styles.resizeControl} nodrag nopan nowheel`}
      onResizeStart={startResize} onResizeEnd={finishResize}>
      <button type="button" className={`${workspaceStyles.resizeHotspot} nodrag nopan nowheel nokey`}
        aria-label={`调整相册${label}，方向键调整大小`} title="拖动调整尺寸，或使用方向键（Shift 加快）"
        onKeyDown={(event) => resizeWithKeyboard(event, position)} />
    </NodeResizeControl>)}
    {viewerKey && <ImageViewer items={items} selectedKey={viewerKey} returnFocusTo={returnFocusRef.current}
      onSelect={setSelectedKey} onClose={() => setSelectedKey(null)} mode="canvas" />}
  </>;
}
