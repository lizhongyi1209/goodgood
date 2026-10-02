"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent } from "react";
import { AudioLines, Check, ChevronLeft, Folder, FolderOpen, ImageOff, Maximize2, Pause, Pencil, Play, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImageViewer } from "@/features/assets/image-viewer";
import { describeViewerGeneration, type ImageViewerMetadata } from "@/features/assets/image-viewer-details";
import { deleteAsset, deleteUploadedAsset, listAssets } from "@/features/assets/http-asset-boundary";
import { createAssetFolder, deleteAssetFolder, listAssetOrganization, renameAssetFolder, renameAssetItem, saveAssetOrganization, type AssetArrangement, type AssetFolder, type OrganizedAssetKind } from "@/features/assets/http-asset-organization";
import { listPrivateAudioMaterials } from "@/features/assets/http-audio-materials";
import { imageDownloadFilename } from "@/features/assets/image-download";
import { listPrivateVideoMaterials } from "@/features/creation/http-video-materials";
import { listReferenceMaterials } from "@/features/references/http-reference-library";
import { privateImageUrls } from "@/shared/private-image-urls.mjs";
import { CanvasAssetAddCard } from "./canvas-asset-add-card";
import { canvasAssetDeleteNotice, canvasFolderNameError, deleteCanvasLibraryEntry, nextCanvasFolderName, removeCanvasLibraryEntry, type CanvasLibraryDeleteTarget } from "./canvas-asset-management.mjs";
import { CANVAS_ASSET_LIBRARY_UPDATED_EVENT } from "./canvas-asset-upload";
import { CANVAS_ASSET_DRAG_TYPE, createCanvasFolderMover, planCanvasFolderMove, selectCanvasFolderItems, type CanvasFolderMover, type CanvasFolderMoveState } from "./canvas-folder-drop.mjs";
import { attachCanvasVideoPreviewPlayback, type CanvasVideoPreviewPlayback } from "./canvas-video-preview-playback.mjs";
import styles from "./canvas-asset-panel.module.css";

export type CanvasLibraryAsset = Readonly<{
  id: string;
  kind: OrganizedAssetKind;
  media: "image" | "video" | "audio";
  name: string;
  createdAt: string;
  previewUrl?: string;
  sourceUrl?: string;
  width?: number;
  height?: number;
}>;

type AssetPanelData = Readonly<{
  folders: readonly AssetFolder[];
  arrangements: readonly AssetArrangement[];
  items: readonly CanvasLibraryAsset[];
  mediaRevision: number;
  generationMetadata: ReadonlyMap<string, ImageViewerMetadata>;
}>;

type MediaDimensions = Readonly<{ width: number; height: number }>;

function formatDuration(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return "--:--";
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const tail = String(whole % 60).padStart(2, "0");
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}:${tail}`
    : `${String(minutes).padStart(2, "0")}:${tail}`;
}

function VideoPreview({ src, name, hovering, enabled, loaded, onReady, onDimensions, onError, controls = true }: Readonly<{
  src: string;
  name: string;
  hovering: boolean;
  enabled: boolean;
  loaded: boolean;
  onReady: () => void;
  onDimensions: (dimensions: MediaDimensions) => void;
  onError: () => void;
  controls?: boolean;
}>) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playbackRef = useRef<CanvasVideoPreviewPlayback | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const playback = attachCanvasVideoPreviewPlayback(video, {
      page: document, reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)"),
    });
    playbackRef.current = playback;
    return () => { playbackRef.current = null; playback.dispose(); };
  }, [src]);

  useEffect(() => {
    playbackRef.current?.setEnabled(enabled && loaded);
    playbackRef.current?.setHovering(hovering);
  }, [enabled, hovering, loaded, src]);

  const ready = (video: HTMLVideoElement) => {
    if (!video.seeking && video.readyState >= 2) onReady();
  };

  return <>
    <video ref={videoRef} src={src} muted playsInline loop preload="metadata" onError={onError} aria-hidden="true"
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
      onClick={(event) => {
        if (event.nativeEvent instanceof PointerEvent && event.nativeEvent.pointerType === "touch" && playing) playbackRef.current?.pause();
      }}
      onLoadedMetadata={(event) => {
        const video = event.currentTarget;
        if (video.videoWidth > 0 && video.videoHeight > 0) onDimensions({ width: video.videoWidth, height: video.videoHeight });
        setDuration(Number.isFinite(video.duration) ? video.duration : null);
        // A small real seek makes metadata-only thumbnails decode a frame without playing.
        const firstFrame = Number.isFinite(video.duration) && video.duration > 0 ? Math.min(0.05, video.duration / 2) : 0.05;
        try { video.currentTime = firstFrame; }
        catch { ready(video); }
      }}
      onLoadedData={(event) => ready(event.currentTarget)}
      onCanPlay={(event) => ready(event.currentTarget)}
      onSeeked={(event) => ready(event.currentTarget)} />
    {loaded && <>
      {controls ? <Button type="button" variant="ghost" size="icon-sm" className={styles.videoPlay} data-playing={playing || undefined}
        data-asset-media-control draggable={false} disabled={!enabled} aria-label={`${playing ? "暂停" : "播放"} ${name}`}
        onDoubleClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          if (videoRef.current?.paused) playbackRef.current?.play(); else playbackRef.current?.pause();
        }}>
        {playing ? <Pause size={20} fill="currentColor" aria-hidden="true" /> : <Play size={20} fill="currentColor" aria-hidden="true" />}
      </Button> : <span className={styles.videoThumbnailPlay} data-playing={playing || undefined} aria-hidden="true"><Play size={16} fill="currentColor" /></span>}
      <span className={styles.videoDuration} data-playing={playing || undefined}>{formatDuration(duration)}</span>
    </>}
  </>;
}

function AssetVisual({ item, src, hovering, playbackEnabled, expanded, onError, controls = true }: Readonly<{
  item: CanvasLibraryAsset;
  src?: string;
  hovering: boolean;
  playbackEnabled: boolean;
  expanded: boolean;
  onError: () => void;
  controls?: boolean;
}>) {
  const [loaded, setLoaded] = useState(false);
  const [dimensions, setDimensions] = useState<MediaDimensions | null>(null);
  const className = `${styles.thumbnail} ${expanded ? styles.thumbnailExpanded : ""}`;
  const ratio = item.width && item.height && item.width > 0 && item.height > 0 ? item.width / item.height
    : dimensions ? dimensions.width / dimensions.height : 1;
  const frameStyle = { aspectRatio: ratio, "--video-ratio": ratio } as CSSProperties;

  if (item.media === "audio") {
    return <span className={className}><AudioLines size={15} strokeWidth={1.7} aria-hidden="true" /></span>;
  }
  if (!src) {
    return <span className={className} style={frameStyle}>
      {item.media === "video" ? <Play size={15} aria-hidden="true" /> : <ImageOff size={15} aria-hidden="true" />}
    </span>;
  }
  return <span className={className} style={frameStyle} data-loading={!loaded || undefined} aria-busy={!loaded}>
    {item.media === "image"
      ? <PrivateObjectImage src={src} alt="" loading="lazy" onError={onError}
          onLoad={(event) => {
            const image = event.currentTarget;
            if (image.naturalWidth > 0 && image.naturalHeight > 0) setDimensions({ width: image.naturalWidth, height: image.naturalHeight });
            setLoaded(true);
          }} />
      : <VideoPreview src={src} name={item.name} hovering={hovering} enabled={playbackEnabled} loaded={loaded}
          onReady={() => setLoaded(true)} onDimensions={setDimensions} onError={onError} controls={controls} />}
    {!loaded && <span className={styles.mediaLoading} role="status">读取中…</span>}
  </span>;
}

function AssetPreviewThumbnail({ item }: Readonly<{ item: CanvasLibraryAsset }>) {
  const [hovering, setHovering] = useState(false);
  const [content, setContent] = useState(false);
  const [failed, setFailed] = useState(false);
  const src = content ? item.sourceUrl : item.previewUrl ?? item.sourceUrl;
  return <span className={styles.previewThumbnail}
    onPointerEnter={(event) => { if (event.pointerType === "mouse" || event.pointerType === "pen") setHovering(true); }}
    onPointerLeave={() => setHovering(false)}>
    {failed ? <span className={styles.thumbnail}><ImageOff size={18} aria-hidden="true" /></span>
      : <AssetVisual key={src} item={item} src={src} hovering={hovering} playbackEnabled expanded={false} controls={false}
        onError={() => {
          if (!content && item.sourceUrl && item.sourceUrl !== src) setContent(true); else setFailed(true);
        }} />}
  </span>;
}

function AssetMedia({ item, editing, onRename, onExpand, expandRef, refreshVideo, expanded = false, playbackEnabled = true }: Readonly<{
  item: CanvasLibraryAsset;
  editing: boolean;
  onRename?: () => void;
  onExpand?: (trigger: HTMLButtonElement) => void;
  expandRef?: (trigger: HTMLButtonElement | null) => void;
  refreshVideo: (signal: AbortSignal) => Promise<string | null>;
  expanded?: boolean;
  playbackEnabled?: boolean;
}>) {
  const fallbackUrl = item.media === "image" ? item.sourceUrl : undefined;
  const [phase, setPhase] = useState<"preview" | "content" | "failed">(item.previewUrl ? "preview" : fallbackUrl ? "content" : "failed");
  const [attempt, setAttempt] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [hovering, setHovering] = useState(false);
  const retryRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(false);
  const src = phase === "preview" ? item.previewUrl : phase === "content" ? fallbackUrl : undefined;
  const failed = item.media !== "audio" && phase === "failed";

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; retryRef.current?.abort(); };
  }, []);

  const mediaError = () => {
    // A stale preview error must not advance the already selected content fallback.
    setPhase((current) => current !== phase ? current
      : current === "preview" && fallbackUrl && fallbackUrl !== item.previewUrl ? "content" : "failed");
  };

  const retry = async () => {
    if (retryRef.current) return;
    const controller = new AbortController();
    retryRef.current = controller;
    setRetrying(true);
    setRetryError(null);
    try {
      if (item.media === "video") {
        const url = await refreshVideo(controller.signal);
        if (!url || controller.signal.aborted || !mountedRef.current) return;
      }
      if (!mountedRef.current || controller.signal.aborted) return;
      setAttempt((current) => current + 1);
      setPhase(item.previewUrl ? "preview" : fallbackUrl ? "content" : "failed");
    } catch (cause) {
      if (mountedRef.current && !controller.signal.aborted) setRetryError(cause instanceof Error ? cause.message : "媒体暂时无法读取，请重试。");
    } finally {
      if (retryRef.current === controller) retryRef.current = null;
      if (mountedRef.current && !controller.signal.aborted) setRetrying(false);
    }
  };

  const visualKey = `${src ?? "failed"}:${attempt}`;
  const visual = <AssetVisual key={visualKey} item={item} src={src} hovering={hovering}
    playbackEnabled={playbackEnabled && !editing} expanded={expanded} onError={mediaError} />;
  return <>
    <div className={expanded ? styles.videoPreviewFrame : styles.visualFrame}
      onPointerEnter={(event) => { if (event.pointerType === "mouse" || event.pointerType === "pen") setHovering(true); }}
      onPointerLeave={() => setHovering(false)}>
      {expanded ? visual
        : <span className={styles.visualTrigger} tabIndex={editing ? -1 : 0} role={item.media === "video" ? "group" : "button"} title={item.name}
          aria-label={`${item.media === "image" ? "图片" : item.media === "video" ? "视频" : "音频"} ${item.name}，双击或 F2 重命名`}
          onDoubleClick={() => { if (!editing) onRename?.(); }}
          onKeyDown={(event) => {
            if (event.target === event.currentTarget && !editing && ["F2", "Enter", " "].includes(event.key)) {
              event.preventDefault(); event.stopPropagation(); onRename?.();
            }
          }}>
          {visual}
        </span>}
      {!expanded && item.media !== "audio" && <Button ref={expandRef} type="button" variant="ghost" size="icon-sm" className={styles.expand}
        data-asset-media-control draggable={false} disabled={editing}
        aria-label={`查看${item.media === "video" ? "视频" : "大图"} ${item.name}`} title={item.media === "video" ? "查看视频" : "查看大图"}
        onDragStart={(event) => { event.preventDefault(); event.stopPropagation(); }}
        onDoubleClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}
        onClick={(event) => { event.stopPropagation(); onExpand?.(event.currentTarget); }}><Maximize2 size={14} aria-hidden="true" /></Button>}
    </div>
    {failed && <div className={styles.mediaFailure} data-asset-media-control draggable={false}
      onDragStart={(event) => { event.preventDefault(); event.stopPropagation(); }}
      onDoubleClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      <p role={retrying ? "status" : "alert"}>{retrying ? "正在重新读取…" : retryError ?? `${item.media === "video" ? "视频" : "图片"}暂时无法读取。`}</p>
      <Button type="button" variant="ghost" size="sm" disabled={retrying} aria-label={`重新读取 ${item.name}`}
        onClick={(event) => { event.stopPropagation(); void retry(); }}>重试</Button>
    </div>}
  </>;
}

function VideoViewer({ item, mediaRevision, refreshVideo, returnFocusTo, onClose }: Readonly<{
  item: CanvasLibraryAsset;
  mediaRevision: number;
  refreshVideo: (signal: AbortSignal) => Promise<string | null>;
  returnFocusTo: () => HTMLElement | null;
  onClose: () => void;
}>) {
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className={styles.videoDialog} overlayClassName={styles.videoOverlay} showCloseButton={false}
      onEscapeKeyDown={(event) => { event.preventDefault(); event.stopPropagation(); onClose(); }}
      onCloseAutoFocus={(event) => { event.preventDefault(); returnFocusTo()?.focus({ preventScroll: true }); }}
      onKeyDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
      <DialogTitle className="sr-only">视频预览 {item.name}</DialogTitle>
      <DialogDescription className="sr-only">悬停静音播放，播放按钮可手动播放或暂停。按 Escape 关闭。</DialogDescription>
      <header className={styles.videoViewerHeader}>
        <span title={item.name}>{item.name}</span>
        <Button type="button" variant="ghost" size="icon-sm" className={styles.videoViewerClose} aria-label="关闭视频预览" onClick={onClose}>
          <X size={16} aria-hidden="true" />
        </Button>
      </header>
      <AssetMedia key={`${mediaRevision}:${item.previewUrl ?? ""}:${item.sourceUrl ?? ""}`} item={item} editing={false}
        expanded refreshVideo={refreshVideo} />
    </DialogContent>
  </Dialog>;
}

export function CanvasAssetPanel({ enabled, assetRevision, onClose, onAssetDragStart, onAssetDragEnd }: Readonly<{
  enabled: boolean;
  assetRevision: number;
  onClose: () => void;
  onAssetDragStart: (item: CanvasLibraryAsset) => void;
  onAssetDragEnd: () => void;
}>) {
  const [data, setData] = useState<AssetPanelData | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const requestKey = `${enabled ? "enabled" : "disabled"}:${assetRevision}:${revision}`;
  const [readState, setReadState] = useState({ key: requestKey, loading: enabled, error: null as string | null });
  const currentReadState = readState.key === requestKey
    ? readState
    : { key: requestKey, loading: enabled, error: null };
  const { loading, error } = currentReadState;
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [editingFolder, setEditingFolder] = useState<AssetFolder | null>(null);
  const [folderNameDraft, setFolderNameDraft] = useState("");
  const [folderNameError, setFolderNameError] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);
  const [managementError, setManagementError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<Readonly<{ selectedKey: string; returnFocusTo: HTMLElement }> | null>(null);
  const [videoPreview, setVideoPreview] = useState<Readonly<{ selectedKey: string; returnFocusTo: HTMLElement }> | null>(null);
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null);
  const [moveState, setMoveState] = useState<CanvasFolderMoveState | null>(null);
  const renamePendingRef = useRef(false);
  const managementPendingRef = useRef(false);
  const renameFromMenuRef = useRef(false);
  const cancelRenameRef = useRef(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const expandRefs = useRef(new Map<string, HTMLButtonElement>());
  const readEpochRef = useRef(0);
  const assetDragBlockedRef = useRef(false);
  const draggedKeyRef = useRef<string | null>(null);
  const dataRef = useRef(data);
  const moverRef = useRef<CanvasFolderMover | null>(null);

  useEffect(() => { dataRef.current = data; }, [data]);

  useEffect(() => {
    const mover = createCanvasFolderMover({
      readData: () => dataRef.current,
      save: (kind, id, value) => saveAssetOrganization(kind, id, value, null),
      onState: setMoveState,
      onSaved: (saved) => {
        if (dataRef.current) dataRef.current = {
          ...dataRef.current,
          arrangements: [...dataRef.current.arrangements.filter((entry) => entry.kind !== saved.kind || entry.id !== saved.id), saved],
        };
        setData((current) => current && ({
          ...current,
          arrangements: [...current.arrangements.filter((entry) => entry.kind !== saved.kind || entry.id !== saved.id), saved],
        }));
        // Refresh through the existing library event, so an older list read
        // cannot leave stale membership after the confirmed move.
        window.dispatchEvent(new Event(CANVAS_ASSET_LIBRARY_UPDATED_EVENT));
      },
    });
    moverRef.current = mover;
    return () => { mover.dispose(); moverRef.current = null; };
  }, []);

  useEffect(() => {
    if (moveState?.phase !== "succeeded") return;
    const timer = window.setTimeout(() => setMoveState((current) => current === moveState ? null : current), 1800);
    return () => window.clearTimeout(timer);
  }, [moveState]);

  useEffect(() => {
    const grid = rowsRef.current;
    if (!enabled || !grid || typeof ResizeObserver === "undefined") return;
    const cards = new Set<HTMLElement>();
    const pendingCards = new Set<HTMLElement>();
    let frame: number | null = null;
    let reconcile = true;
    let measureAll = true;
    let gridWidth = -1;

    const flush = () => {
      frame = null;
      if (reconcile) {
        reconcile = false;
        const children = new Set(Array.from(grid.children).filter((child): child is HTMLElement => child instanceof HTMLElement));
        for (const card of cards) {
          if (children.has(card)) continue;
          observer.unobserve(card);
          cards.delete(card);
          pendingCards.delete(card);
        }
        for (const card of children) {
          if (cards.has(card)) continue;
          cards.add(card);
          observer.observe(card);
        }
      }
      const gap = Number.parseFloat(getComputedStyle(grid).columnGap) || 0;
      const targets = measureAll ? cards : pendingCards;
      // Batch every read before any write; observers only schedule the next frame.
      const spans = Array.from(targets, (card) => {
        const box = card.getBoundingClientRect();
        const hidden = card.hidden || box.width <= 0 || getComputedStyle(card).display === "none";
        return { card, span: hidden || box.height <= 0 ? "" : `span ${Math.ceil(box.height + gap)}` };
      });
      measureAll = false;
      pendingCards.clear();
      for (const { card, span } of spans) if (card.style.gridRowEnd !== span) card.style.gridRowEnd = span;
      grid.classList.add(styles.masonryReady);
    };
    const schedule = () => { if (frame === null) frame = requestAnimationFrame(flush); };
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === grid) {
          if (gridWidth !== entry.contentRect.width) { gridWidth = entry.contentRect.width; measureAll = true; }
        } else pendingCards.add(entry.target as HTMLElement);
      }
      schedule();
    });
    // Pending uploads and their hidden file input are owned by the add-card child.
    const mutations = new MutationObserver(() => { reconcile = true; measureAll = true; schedule(); });
    mutations.observe(grid, { childList: true });
    observer.observe(grid);
    schedule();
    return () => {
      observer.disconnect();
      mutations.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
      pendingCards.clear();
      grid.classList.remove(styles.masonryReady);
      for (const card of cards) card.style.gridRowEnd = "";
    };
  }, [enabled]);

  useEffect(() => {
    const refresh = () => setRevision((current) => current + 1);
    window.addEventListener(CANVAS_ASSET_LIBRARY_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(CANVAS_ASSET_LIBRARY_UPDATED_EVENT, refresh);
  }, []);

  useEffect(() => {
    readEpochRef.current += 1;
    const epoch = readEpochRef.current;
    if (!enabled) return;
    let active = true;
    void Promise.all([
      listAssets(null),
      listReferenceMaterials(null),
      listPrivateVideoMaterials(null),
      listPrivateAudioMaterials(null),
      listAssetOrganization(null),
    ]).then(([jobs, references, videos, audios, organization]) => {
      if (!active || epoch !== readEpochRef.current) return;
      readEpochRef.current += 1;
      const names = new Map<string, string | null | undefined>(organization.arrangements.map((entry) => [`${entry.kind}:${entry.id}`, entry.displayName]));
      const items: CanvasLibraryAsset[] = [
        ...jobs.flatMap((job) => job.outputs.map((output, index) => ({
          id: output.id, kind: "generated" as const, media: "image" as const,
          name: names.get(`generated:${output.id}`) ?? imageDownloadFilename(job.createdAt, index + 1, output.previewUrl),
          createdAt: job.createdAt, previewUrl: output.previewUrl, sourceUrl: privateImageUrls("asset", output.id).contentUrl, width: output.width, height: output.height,
        }))),
        ...references.map((item) => ({ id: item.id, kind: "reference" as const, media: "image" as const,
          name: names.get(`reference:${item.id}`) ?? item.name, createdAt: item.uploadedAt, previewUrl: item.previewUrl, sourceUrl: item.url, width: item.width, height: item.height })),
        ...videos.map((item) => ({ id: item.id, kind: "video" as const, media: "video" as const,
          name: names.get(`video:${item.id}`) ?? item.name, createdAt: item.uploadedAt, previewUrl: item.url, sourceUrl: item.url })),
        ...audios.map((item) => ({ id: item.id, kind: "audio" as const, media: "audio" as const,
          name: names.get(`audio:${item.id}`) ?? item.name, createdAt: item.uploadedAt, sourceUrl: item.url })),
      ].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
      const generationMetadata = new Map(jobs.flatMap((job) => job.outputs.map((output) =>
        [`generated:${output.id}`, describeViewerGeneration(job.input, output)] as const)));
      setData({ folders: organization.folders, arrangements: organization.arrangements, items, mediaRevision: readEpochRef.current, generationMetadata });
      setVideoPreview((current) => current && items.some((item) => item.media === "video" && `${item.kind}:${item.id}` === current.selectedKey) ? current : null);
      setReadState({ key: requestKey, loading: false, error: null });
    }).catch((cause: unknown) => {
      if (active && epoch === readEpochRef.current) {
        readEpochRef.current += 1;
        setReadState({
          key: requestKey,
          loading: false,
          error: cause instanceof Error ? cause.message : "资产暂时无法读取，请重试。",
        });
      }
    });
    return () => { active = false; readEpochRef.current += 1; };
  }, [enabled, requestKey]);

  const activeFolder = data?.folders.find((folder) => folder.id === folderId) ?? null;
  const visibleItems = useMemo(() => selectCanvasFolderItems(data, activeFolder?.id ?? null), [data, activeFolder]);
  const readyAssetKeys = useMemo(() => new Set(data?.items.map((item) => `${item.kind}:${item.id}`) ?? []), [data]);
  const previewMedia = visibleItems.filter((item) => item.media !== "audio").map((item) => ({
    key: `${item.kind}:${item.id}`, name: item.name, media: item.media as "image" | "video",
    previewUrl: item.previewUrl ?? item.sourceUrl ?? "",
    sourceUrl: item.sourceUrl ?? item.previewUrl ?? "", width: item.width, height: item.height,
    metadata: data?.generationMetadata.get(`${item.kind}:${item.id}`),
  }));
  const previewVideo = videoPreview ? data?.items.find((item) => item.media === "video" && `${item.kind}:${item.id}` === videoPreview.selectedKey) : undefined;
  const moving = moveState?.phase === "pending";

  const finishAssetDrag = () => {
    draggedKeyRef.current = null;
    setDraggedKey(null);
    setHoveredFolderId(null);
    onAssetDragEnd();
  };

  const folderDragOver = (event: DragEvent<HTMLButtonElement>, folder: AssetFolder) => {
    if (!Array.from(event.dataTransfer.types).includes(CANVAS_ASSET_DRAG_TYPE)) return;
    event.preventDefault();
    event.stopPropagation();
    const canMove = !editingKey && !editingFolder && !managementPendingRef.current && !renamePendingRef.current && !moverRef.current?.isPending()
      && Boolean(planCanvasFolderMove(data, draggedKeyRef.current, folder.id));
    event.dataTransfer.dropEffect = canMove ? "move" : "none";
    setHoveredFolderId(canMove ? folder.id : null);
  };

  const folderDrop = (event: DragEvent<HTMLButtonElement>, folder: AssetFolder) => {
    if (!Array.from(event.dataTransfer.types).includes(CANVAS_ASSET_DRAG_TYPE)) return;
    event.preventDefault();
    event.stopPropagation();
    const key = event.dataTransfer.getData(CANVAS_ASSET_DRAG_TYPE);
    const ownDrag = key === draggedKeyRef.current;
    finishAssetDrag();
    if (ownDrag && !editingKey && !editingFolder && !managementPendingRef.current && !renamePendingRef.current) void moverRef.current?.move(key, folder.id);
  };

  const refreshVideo = async (item: CanvasLibraryAsset, signal: AbortSignal): Promise<string | null> => {
    const epoch = readEpochRef.current;
    const mediaRevision = data?.mediaRevision;
    try {
      const videos = await listPrivateVideoMaterials(null, signal);
      if (signal.aborted || epoch !== readEpochRef.current) return null;
      const video = videos.find((entry) => entry.id === item.id);
      if (!video) throw new Error("此视频暂时不可用，请刷新资产列表。");
      setData((current) => current && !signal.aborted && epoch === readEpochRef.current && current.mediaRevision === mediaRevision ? {
        ...current,
        items: current.items.map((entry) => entry.kind === item.kind && entry.id === item.id
          ? { ...entry, previewUrl: video.url, sourceUrl: video.url } : entry),
      } : current);
      return video.url;
    } catch (cause) {
      if (signal.aborted || epoch !== readEpochRef.current) return null;
      throw cause;
    }
  };

  const beginRename = (item: CanvasLibraryAsset) => {
    if (renamePendingRef.current || managementPendingRef.current || moverRef.current?.isPending()) return;
    cancelRenameRef.current = false;
    setEditingKey(`${item.kind}:${item.id}`);
    setNameDraft(item.name);
    setNameError(null);
  };

  const saveName = async (item: CanvasLibraryAsset) => {
    if (renamePendingRef.current) return;
    const name = nameDraft.trim().replace(/\s+/g, " ");
    if (!name || name.length > 255 || /[\u0000-\u001f\u007f]/.test(nameDraft)) {
      setNameError("名称应为 1–255 个字符。");
      nameInputRef.current?.focus();
      return;
    }
    if (name === item.name) { setEditingKey(null); setNameError(null); return; }
    renamePendingRef.current = true;
    setRenaming(true);
    setNameError(null);
    try {
      const saved = await renameAssetItem(item.kind, item.id, name, null);
      setData((current) => current && ({
        ...current,
        items: current.items.map((entry) => entry.kind === item.kind && entry.id === item.id
          ? { ...entry, name: saved.displayName ?? name } : entry),
        arrangements: [...current.arrangements.filter((entry) => entry.kind !== item.kind || entry.id !== item.id), saved],
      }));
      setEditingKey(null);
    } catch (cause) {
      setNameError(cause instanceof Error ? cause.message : "重命名失败，请重试。");
      requestAnimationFrame(() => nameInputRef.current?.focus());
    } finally {
      renamePendingRef.current = false;
      setRenaming(false);
    }
  };

  const managementBlocked = managing || renaming || moving || Boolean(editingKey) || Boolean(editingFolder);
  const restoreMenuFocus = (event: Event) => {
    if (!renameFromMenuRef.current) return;
    renameFromMenuRef.current = false;
    event.preventDefault();
  };
  const startManagement = () => {
    if (managementPendingRef.current || renamePendingRef.current || moverRef.current?.isPending()) return false;
    managementPendingRef.current = true;
    readEpochRef.current += 1;
    setManaging(true);
    setManagementError(null);
    return true;
  };
  const finishManagement = () => {
    managementPendingRef.current = false;
    setManaging(false);
    // A failed byte deletion may follow a committed metadata transaction.
    window.dispatchEvent(new Event(CANVAS_ASSET_LIBRARY_UPDATED_EVENT));
  };

  const createFolder = async () => {
    if (!dataRef.current || editingKey || editingFolder || !startManagement()) return;
    try {
      const saved = await createAssetFolder(nextCanvasFolderName(dataRef.current.folders), null);
      setData((current) => current && ({ ...current, folders: [...current.folders, saved] }));
      setFolderId(null);
    } catch (cause) {
      setManagementError(cause instanceof Error ? cause.message : "创建文件夹失败，请重试。");
    } finally { finishManagement(); }
  };

  const beginFolderRename = (folder: AssetFolder) => {
    if (managementBlocked || managementPendingRef.current || renamePendingRef.current || moverRef.current?.isPending()) return;
    setEditingFolder(folder);
    setFolderNameDraft(folder.name);
    setFolderNameError(null);
  };
  const saveFolderName = async () => {
    if (!editingFolder || managementPendingRef.current) return;
    const name = folderNameDraft.trim().replace(/\s+/g, " ");
    const validation = canvasFolderNameError(folderNameDraft);
    if (validation) { setFolderNameError(validation); return; }
    if (name === editingFolder.name) { setEditingFolder(null); return; }
    if (!startManagement()) return;
    try {
      const saved = await renameAssetFolder(editingFolder.id, name, null);
      setData((current) => current && ({ ...current, folders: current.folders.map((folder) => folder.id === saved.id ? saved : folder) }));
      setEditingFolder(null);
    } catch (cause) {
      setFolderNameError(cause instanceof Error ? cause.message : "重命名失败，请重试。");
    } finally { finishManagement(); }
  };

  const deleteEntry = async (target: CanvasLibraryDeleteTarget) => {
    if (managementBlocked || managementPendingRef.current || !window.confirm(canvasAssetDeleteNotice(target)) || !startManagement()) return;
    try {
      await deleteCanvasLibraryEntry(target, {
        deleteFolder: (id) => deleteAssetFolder(id, null),
        deleteGenerated: (id) => deleteAsset(id, null),
        deleteUploaded: (kind, id) => deleteUploadedAsset(kind, id, null),
      });
      setData((current) => removeCanvasLibraryEntry(current, target));
      if (target.kind === "folder" && folderId === target.id) setFolderId(null);
      if (target.kind !== "folder") {
        const key = `${target.kind}:${target.id}`;
        setImagePreview((current) => current?.selectedKey === key ? null : current);
        setVideoPreview((current) => current?.selectedKey === key ? null : current);
      }
    } catch (cause) {
      setManagementError(cause instanceof Error ? cause.message : "删除失败，请重试。");
    } finally { finishManagement(); }
  };

  return <section className={styles.panel} aria-label="画布资产"
    onDragOver={(event) => {
      if (!Array.from(event.dataTransfer.types).includes(CANVAS_ASSET_DRAG_TYPE)) return;
      event.preventDefault(); event.stopPropagation();
      event.dataTransfer.dropEffect = "none";
      setHoveredFolderId(null);
    }}
    onDragLeave={(event) => {
      if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) setHoveredFolderId(null);
    }}
    onDrop={(event) => {
      if (!Array.from(event.dataTransfer.types).includes(CANVAS_ASSET_DRAG_TYPE)) return;
      event.preventDefault(); event.stopPropagation(); finishAssetDrag();
    }}>
    <header className={styles.header}>
      {activeFolder ? <>
        <Button type="button" variant="ghost" size="sm" className={styles.back} onClick={() => setFolderId(null)} aria-label="返回资产"><ChevronLeft size={16} aria-hidden="true" />资产</Button>
        <span className={styles.folderTitle} title={activeFolder.name}>{activeFolder.name}</span>
      </> : <h2>资产</h2>}
      <Button ref={closeButtonRef} type="button" variant="ghost" size="icon-sm" className={styles.close} onClick={onClose} aria-label="关闭资产列表"><X size={16} aria-hidden="true" /></Button>
    </header>

    {!enabled ? <p className={styles.state}>演示模式暂不提供资产浏览。</p>
      : <ScrollArea className={styles.scroll}>
          <div ref={rowsRef} className={styles.rows}>
            <CanvasAssetAddCard folderId={activeFolder?.id ?? null} readyAssetKeys={readyAssetKeys}
              folderBusy={managementBlocked || !data || loading} onCreateFolder={() => void createFolder()} />
            {managementError && <div className={styles.refreshError} role="alert"><p>{managementError}</p><Button type="button" variant="ghost" size="sm" onClick={() => { setManagementError(null); setRevision((current) => current + 1); }}>刷新资产</Button></div>}
            {managing && <p className="sr-only" role="status">正在更新资产…</p>}
            {loading && !data && <p className={styles.refreshError} role="status">正在读取资产…</p>}
            {error && <div className={styles.refreshError} role="alert"><p>{error}</p><Button type="button" variant="ghost" size="sm" onClick={() => setRevision((current) => current + 1)}>重试读取</Button></div>}
            {moveState && <div className={moveState.phase === "failed" ? styles.moveFeedback : "sr-only"} role={moveState.phase === "failed" ? "alert" : "status"}>
              <p>{moveState.phase === "pending" ? `正在移入「${moveState.folderName}」…`
                : moveState.phase === "succeeded" ? `已移入「${moveState.folderName}」` : moveState.error}</p>
              {moveState.phase === "failed" && <Button type="button" variant="ghost" size="sm"
                onClick={() => { if (!renamePendingRef.current && !editingKey) void moverRef.current?.move(moveState.key, moveState.folderId); }}>重试移动</Button>}
            </div>}
            {!activeFolder && data?.folders.map((folder) => {
              const available = Boolean(draggedKey && !moving && planCanvasFolderMove(data, draggedKey, folder.id));
              const hovering = available && hoveredFolderId === folder.id;
              const phase = moveState?.folderId === folder.id ? moveState.phase : null;
              return <ContextMenu key={folder.id}><ContextMenuTrigger asChild disabled={managementBlocked} onContextMenu={(event) => { if (managementBlocked) event.preventDefault(); }}>
                <Button type="button" variant="ghost" className={styles.folderCard} data-canvas-asset-context-menu
                data-drop-available={available || undefined} data-drop-hover={hovering || undefined} data-move-state={phase ?? undefined}
                aria-busy={phase === "pending"} onClick={() => setFolderId(folder.id)} aria-label={`打开文件夹 ${folder.name}`}
                onDragEnter={(event) => folderDragOver(event, folder)} onDragOver={(event) => folderDragOver(event, folder)}
                onDragLeave={(event) => {
                  if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) setHoveredFolderId((current) => current === folder.id ? null : current);
                }}
                onDrop={(event) => folderDrop(event, folder)}>
                <span className={styles.folderIcon}>{phase === "succeeded" ? <Check size={28} strokeWidth={1.7} aria-hidden="true" />
                  : hovering || phase === "pending" ? <FolderOpen size={28} strokeWidth={1.5} aria-hidden="true" /> : <Folder size={28} strokeWidth={1.5} aria-hidden="true" />}</span>
                <span className={styles.name} title={folder.name}>{folder.name}</span>
                {(available || phase === "pending" || phase === "succeeded") && <span className={styles.folderDropHint} aria-hidden="true">
                  {phase === "pending" ? "正在整理…" : phase === "succeeded" ? "已移入" : hovering ? "松开移入" : "拖入整理"}
                </span>}
              </Button></ContextMenuTrigger>
                <ContextMenuContent className={styles.assetContextMenu} onCloseAutoFocus={restoreMenuFocus}>
                  <ContextMenuItem className={styles.addMenuItem} disabled={managementBlocked} onSelect={() => { renameFromMenuRef.current = true; beginFolderRename(folder); }}><Pencil size={14} aria-hidden="true" />重命名</ContextMenuItem>
                  <ContextMenuItem className={styles.addMenuItem} disabled={managementBlocked} onSelect={() => void deleteEntry({ ...folder, kind: "folder" })}><Trash2 size={14} aria-hidden="true" />删除</ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>;
            })}
              {visibleItems.map((item) => {
                const key = `${item.kind}:${item.id}`;
                const editing = editingKey === key;
                return <ContextMenu key={key}><ContextMenuTrigger asChild disabled={managementBlocked} onContextMenu={(event) => { if (managementBlocked) event.preventDefault(); }}>
                  <div className={styles.assetCard} data-canvas-asset-context-menu tabIndex={0} aria-label={item.name} draggable={!editing && !moving && !managing}
                  data-dragging={draggedKey === key || undefined} data-move-state={moveState?.key === key ? moveState.phase : undefined}
                  onPointerDownCapture={(event) => { assetDragBlockedRef.current = event.target instanceof Element && Boolean(event.target.closest("[data-asset-media-control]")); }}
                  onDragStart={(event) => {
                    if (editing || editingKey || editingFolder || managementPendingRef.current || renamePendingRef.current || moverRef.current?.isPending() || assetDragBlockedRef.current
                      || (event.target instanceof Element && event.target.closest("[data-asset-media-control]"))) { event.preventDefault(); return; }
                    event.dataTransfer.effectAllowed = item.media === "image" ? "copyMove" : "copy";
                    event.dataTransfer.setData(CANVAS_ASSET_DRAG_TYPE, key);
                    draggedKeyRef.current = key;
                    setDraggedKey(key);
                    onAssetDragStart(item);
                  }}
                  onDragEnd={finishAssetDrag}>
                  <AssetMedia key={`${data?.mediaRevision}:${item.previewUrl ?? ""}:${item.sourceUrl ?? ""}`}
                    item={item} editing={editing} onRename={() => beginRename(item)}
                    expandRef={(trigger) => { if (trigger) expandRefs.current.set(key, trigger); else expandRefs.current.delete(key); }}
                    playbackEnabled={!imagePreview && !previewVideo}
                    onExpand={(trigger) => {
                      if (item.media === "video") setVideoPreview({ selectedKey: key, returnFocusTo: trigger });
                      else setImagePreview({ selectedKey: key, returnFocusTo: trigger });
                    }}
                    refreshVideo={(signal) => refreshVideo(item, signal)} />
                  {editing ? <form className={styles.renameForm} onSubmit={(event) => { event.preventDefault(); void saveName(item); }}>
                    <Input ref={nameInputRef} autoFocus className={styles.nameInput} value={nameDraft} maxLength={255}
                      aria-label={`重命名 ${item.name}`} aria-invalid={Boolean(nameError)} disabled={renaming}
                      onFocus={(event) => event.currentTarget.select()}
                      onChange={(event) => { setNameDraft(event.target.value); setNameError(null); }}
                      onBlur={() => {
                        if (cancelRenameRef.current) { cancelRenameRef.current = false; return; }
                        if (!renamePendingRef.current && !nameError) void saveName(item);
                      }}
                      onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); cancelRenameRef.current = true; setEditingKey(null); setNameError(null); } }} />
                    {nameError && <span className={styles.nameError} role="alert">{nameError}</span>}
                  </form> : item.media === "audio" && <span className={styles.mediaLabel}>音频</span>}
                </div></ContextMenuTrigger>
                  <ContextMenuContent className={styles.assetContextMenu} onCloseAutoFocus={restoreMenuFocus}>
                    <ContextMenuItem className={styles.addMenuItem} disabled={managementBlocked} onSelect={() => { renameFromMenuRef.current = true; beginRename(item); }}><Pencil size={14} aria-hidden="true" />重命名</ContextMenuItem>
                    <ContextMenuItem className={styles.addMenuItem} disabled={managementBlocked} onSelect={() => void deleteEntry(item)}><Trash2 size={14} aria-hidden="true" />删除</ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>;
              })}
            {!loading && !error && !activeFolder && !data?.folders.length && !visibleItems.length && <p className={styles.empty}>还没有资产</p>}
            {!loading && !error && activeFolder && !visibleItems.length && <p className={styles.empty}>此文件夹还没有素材</p>}
          </div>
        </ScrollArea>}
    <Dialog open={Boolean(editingFolder)} onOpenChange={(open) => { if (!open && !managementPendingRef.current) setEditingFolder(null); }}>
      <DialogContent className={styles.folderNameDialog} overlayClassName={styles.folderNameOverlay} showCloseButton={false}
        onEscapeKeyDown={(event) => { if (managementPendingRef.current) event.preventDefault(); }}
        onInteractOutside={(event) => { if (managementPendingRef.current) event.preventDefault(); }}>
        <DialogHeader className={styles.folderNameHeader}>
          <DialogTitle className={styles.folderNameTitle}>重命名</DialogTitle>
          <DialogDescription className="sr-only">修改文件夹名称，最多64个字符。取消保留原名称。</DialogDescription>
        </DialogHeader>
        <form className={styles.folderNameForm} onSubmit={(event) => { event.preventDefault(); void saveFolderName(); }}>
          <label className={styles.folderNameField} htmlFor="canvas-folder-name">
            <span>文件夹名称</span>
            <Input id="canvas-folder-name" className={styles.folderNameInput} autoFocus maxLength={64} value={folderNameDraft} disabled={managing}
              aria-invalid={Boolean(folderNameError)} aria-describedby={folderNameError ? "canvas-folder-name-error" : undefined}
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => { setFolderNameDraft(event.target.value); setFolderNameError(null); }} />
          </label>
          {folderNameError && <p id="canvas-folder-name-error" className={styles.nameError} role="alert">{folderNameError}</p>}
          <div className={styles.folderNameActions}>
            <Button type="button" variant="secondary" size="sm" disabled={managing} onClick={() => setEditingFolder(null)}>取消</Button>
            <Button type="submit" size="sm" disabled={managing || !folderNameDraft.trim()}>{managing ? "保存中…" : "保存"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    {enabled && imagePreview && <ImageViewer mode="canvas" items={previewMedia} selectedKey={imagePreview.selectedKey} returnFocusTo={imagePreview.returnFocusTo}
      renderThumbnail={(selected) => {
        const item = visibleItems.find((asset) => `${asset.kind}:${asset.id}` === selected.key);
        return item && <AssetPreviewThumbnail key={`${item.id}:${data?.mediaRevision}:${item.previewUrl ?? ""}`} item={item} />;
      }}
      renderVideo={(selected) => {
        const item = visibleItems.find((asset) => `${asset.kind}:${asset.id}` === selected.key);
        return item && <div className={styles.viewerVideo}>
          <AssetMedia key={`${item.id}:${data?.mediaRevision}:${item.previewUrl ?? ""}`} item={item} editing={false}
            expanded refreshVideo={(signal) => refreshVideo(item, signal)} />
        </div>;
      }}
      onSelect={(selectedKey) => setImagePreview((current) => current && ({ ...current, selectedKey }))} onClose={() => setImagePreview(null)} />}
    {enabled && videoPreview && previewVideo && <VideoViewer item={previewVideo} mediaRevision={data?.mediaRevision ?? 0}
      refreshVideo={(signal) => refreshVideo(previewVideo, signal)} onClose={() => setVideoPreview(null)}
      returnFocusTo={() => {
        const trigger = expandRefs.current.get(videoPreview.selectedKey) ?? videoPreview.returnFocusTo;
        return trigger.isConnected ? trigger : closeButtonRef.current;
      }} />}
  </section>;
}
