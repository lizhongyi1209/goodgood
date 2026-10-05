"use client";

import { useMemo, useRef, useState } from "react";
import { Handle, Position, useStore, type NodeProps } from "@xyflow/react";
import { FolderOpen, ImageOff } from "lucide-react";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import { ImageViewer, type ImageViewerItem } from "@/features/assets/image-viewer";
import { privateImageUrls } from "@/shared/private-image-urls.mjs";
import { CanvasGroupNode, type CanvasGroupNodeType } from "./canvas-group-node";
import { canvasReferenceGroupMembers, imageSourceAsset } from "./canvas-reference-sources.mjs";
import { isCanvasAlbumId } from "./canvas-folder-album.mjs";
import type { CanvasNode } from "./canvas-workspace";
import styles from "./canvas-folder-album-node.module.css";

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
    {state !== "failed" && <PrivateObjectImage key={attempt} src={item.previewUrl} alt={item.name} loading="lazy"
      onLoad={() => setState("ready")} onError={() => setState("failed")} />}
    {state === "loading" && <span className={styles.imageState}>读取中</span>}
    {state === "failed" && <span className={styles.imageState}><ImageOff size={16} aria-hidden="true" /><span>重试</span></span>}
    <span className={styles.number} aria-hidden="true">{index + 1}</span>
  </button>;
}

function CanvasFolderAlbumNode({ id, data, selected }: NodeProps<CanvasGroupNodeType>) {
  const nodes = useStore((state) => state.nodes) as CanvasNode[];
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
  return <>
    <section className={styles.album} data-selected={selected || undefined} aria-label={`相册：${data.name}，${items.length} 张图片`}>
      <div className={`${styles.header} canvas-album-drag-handle`}>
        <FolderOpen size={15} aria-hidden="true" /><span title={data.name}>{data.name}</span><small>{items.length} 张</small>
      </div>
      {items.length ? <div className={`${styles.grid} nodrag nopan nowheel nokey`} role="group" aria-label="相册图片" tabIndex={0}>
        {items.map((item, index) => <AlbumThumbnail key={item.key} item={item} index={index} onOpen={(button) => {
          returnFocusRef.current = button; setSelectedKey(item.key);
        }} />)}
      </div> : <div className={styles.empty} role="status"><FolderOpen size={24} strokeWidth={1.4} aria-hidden="true" /><span>文件夹中暂无图片</span></div>}
      <div className={`${styles.caption} canvas-album-drag-handle`}>连接到素材组，一次载入所有图片</div>
    </section>
    <Handle type="source" id="reference" position={Position.Right} className={styles.handle}
      isConnectable={items.length > 0} title={`连接 ${items.length} 张候选图片`} aria-label={`连接相册 ${data.name} 到批量素材组`}
      role="button" tabIndex={items.length ? 0 : -1} onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); event.currentTarget.click(); }
      }} />
    {viewerKey && <ImageViewer items={items} selectedKey={viewerKey} returnFocusTo={returnFocusRef.current}
      onSelect={setSelectedKey} onClose={() => setSelectedKey(null)} mode="canvas" />}
  </>;
}
