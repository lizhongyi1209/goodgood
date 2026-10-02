"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AudioLines, Check, ChevronDown, ChevronRight, CircleAlert, Download, Folder, FolderPlus, Grid2X2, ImagePlus, List, LoaderCircle, MoreHorizontal, Pencil, Play, Plus, RefreshCw, Search, Trash2, Upload, WandSparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { Dialog as DialogPrimitive } from "radix-ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import { ImageViewer } from "./image-viewer";
import { attachAssetVideoHoverPlayback, type AssetVideoHoverPlayback } from "./asset-video-hover-playback.mjs";
import { uploadReferenceFiles } from "@/features/references/http-reference-upload";
import type { ReferenceMaterial } from "@/features/references/http-reference-library";
import { uploadPrivateVideoMaterial, type PrivateVideoMaterial } from "@/features/creation/http-video-materials";
import { uploadPrivateAudioMaterial, type PrivateAudioMaterial } from "@/features/assets/http-audio-materials";
import { createAssetFolder, deleteAssetFolder, listAssetOrganization, renameAssetFolder, saveAssetOrganization, type AssetArrangement, type AssetFolder, type OrganizedAssetKind } from "@/features/assets/http-asset-organization";
import { deleteAsset, deleteUploadedAsset, readAssetDownloadUrl } from "@/features/assets/http-asset-boundary";
import { ImageDownloadError, saveImageToLocal } from "@/features/assets/image-download";
import { listPrivateTextAssets, deletePrivateTextAsset, downloadPrivateTextAsset, type TextAssetSummary } from "./http-text-assets";
import { TextAssetThumbnail, TextAssetViewer } from "./text-asset-preview";
import { TEXT_ASSETS_UPDATED_EVENT } from "@/shared/contracts/text-assets.mjs";
import { PRIVATE_AUDIO_UPLOAD_MAX_BYTES, PRIVATE_IMAGE_UPLOAD_MAX_BYTES, PRIVATE_VIDEO_UPLOAD_MAX_BYTES } from "@/shared/contracts/upload-limits.mjs";
import styles from "./asset-workspace.module.css";

type Media = "image" | "video" | "audio" | "text";
type Filter = "all" | Media;
type SourceFilter = "all" | "uploaded" | "generated";
type ViewMode = "grid" | "list";
export type GeneratedAssetCard = Readonly<{
  id: string; detailKey: string; createdAt: string; previewUrl: string; ordinal: number;
  prompt: string; width?: number; height?: number;
}>;
type LibraryItem = Readonly<{
  id: string; kind: OrganizedAssetKind; media: Media; name: string; createdAt: string;
  previewUrl?: string; url?: string; size?: number; detailKey?: string;
  width?: number; height?: number; ordinal?: number;
  previewText?: string;
}>;
type ArrangementLookup = ReadonlyMap<string, AssetArrangement>;
type UploadRow = Readonly<{ id: string; file: File; state: "waiting" | "uploading" | "ready" | "failed"; message?: string }>;

type Props = Readonly<{
  workspaceId: string | null;
  enabled: boolean;
  generated: readonly GeneratedAssetCard[];
  references: readonly ReferenceMaterial[];
  videos: readonly PrivateVideoMaterial[];
  audios: readonly PrivateAudioMaterial[];
  historyLoading: boolean;
  libraryLoading: boolean;
  historyError: string | null;
  libraryError: string | null;
  onRetry: () => void;
  onRefresh: () => Promise<void>;
  onDeleteGenerated: (assetId: string) => Promise<void>;
  onOpenGenerated: (detailKey: string) => void;
  onUseReference: (material: ReferenceMaterial) => void;
  onUseVideo: (material: PrivateVideoMaterial) => void;
  onUseAudio: (material: PrivateAudioMaterial) => void;
}>;

const mediaFilters: readonly Readonly<{ id: Filter; label: string }>[] = [
  { id: "all", label: "全部" }, { id: "image", label: "图片" },
  { id: "video", label: "视频" }, { id: "audio", label: "音频" },
  { id: "text", label: "文本" },
];

export function filterAssetFiles(items: readonly LibraryItem[], arrangements: ArrangementLookup,
  folderId: string | null, search: string, media: Filter, source: SourceFilter): readonly LibraryItem[] {
  const query = search.trim().toLocaleLowerCase();
  return items.filter((item) => {
    const arrangement = arrangements.get(`${item.kind}:${item.id}`);
    return (!folderId || arrangement?.folderId === folderId) &&
      (!query || item.name.toLocaleLowerCase().includes(query)) &&
      (media === "all" || item.media === media) &&
      (source === "all" || (source === "generated" ? item.kind === "generated" : ["reference", "video", "audio"].includes(item.kind)));
  });
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "日期未知" : new Intl.DateTimeFormat("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}

function bytesLabel(value?: number) {
  if (!value) return "";
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Image tiles do not render a caption, so the synthesized internal name
 * (`生成图片 {batch} · {n}`) must not leak into visible or assistive text.
 * Derive a short readable label from the prompt for assistive text and list view.
 */
function imageLabel(item: GeneratedAssetCard) {
  const prompt = item.prompt.trim().replace(/\s+/g, " ");
  return prompt ? `生成图片：${prompt.slice(0, 60)}` : "生成图片";
}

function uploadError(file: File): string | null {
  const allowed: Readonly<Record<string, { extensions: readonly string[]; max: number }>> = {
    "image/jpeg": { extensions: ["jpg", "jpeg"], max: PRIVATE_IMAGE_UPLOAD_MAX_BYTES },
    "image/png": { extensions: ["png"], max: PRIVATE_IMAGE_UPLOAD_MAX_BYTES },
    "video/mp4": { extensions: ["mp4"], max: PRIVATE_VIDEO_UPLOAD_MAX_BYTES },
    "audio/mpeg": { extensions: ["mp3"], max: PRIVATE_AUDIO_UPLOAD_MAX_BYTES },
  };
  const extension = file.name.split(".").pop()?.toLowerCase();
  const format = allowed[file.type];
  if (!format || !extension || !format.extensions.includes(extension)) return "仅支持 JPG/JPEG、PNG、MP4、MP3。";
  if (file.size < 1 || file.size > format.max) return "单个文件须在 20 MB 以内。";
  return null;
}

function VideoTilePreview({ url, enabled }: { url?: string; enabled: boolean }) {
  const surfaceRef = useRef<HTMLSpanElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playbackRef = useRef<AssetVideoHoverPlayback | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const surface = surfaceRef.current;
    const video = videoRef.current;
    if (!surface || !video || !url) return;
    const playback = attachAssetVideoHoverPlayback({
      surface, video, documentTarget: document,
      motion: window.matchMedia("(prefers-reduced-motion: reduce)"),
      createObserver: (callback, options) => new IntersectionObserver(callback, options),
      onPlayingChange: setPlaying,
    });
    playbackRef.current = playback;
    return () => {
      playbackRef.current = null;
      playback.dispose();
    };
  }, [url]);

  useEffect(() => { playbackRef.current?.setEnabled(enabled); }, [url, enabled]);

  return <span ref={surfaceRef} className={styles.videoPreview} aria-hidden="true">
    <video key={url} ref={videoRef} src={url} muted playsInline loop preload="metadata"/>
    {!playing && <span className={styles.videoPlayIcon}><Play size={20} fill="currentColor" strokeWidth={1.5}/></span>}
  </span>;
}

export function AssetWorkspace({ workspaceId, enabled, generated, references, videos, audios,
  historyLoading, libraryLoading, historyError, libraryError,
  onRetry, onRefresh, onDeleteGenerated, onOpenGenerated, onUseReference, onUseVideo, onUseAudio }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedKeys, setSelectedKeys] = useState<readonly string[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<readonly string[]>([]);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [organization, setOrganization] = useState<{ folders: readonly AssetFolder[]; arrangements: readonly AssetArrangement[] }>({ folders: [], arrangements: [] });
  const [organizationLoading, setOrganizationLoading] = useState(true);
  const [organizationError, setOrganizationError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderDialogError, setFolderDialogError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ name: string; url: string; media: Media } | null>(null);
  const [imagePreview, setImagePreview] = useState<Readonly<{ selectedKey: string; returnFocusTo: HTMLElement }> | null>(null);
  const [textPreview, setTextPreview] = useState<Readonly<{ id: string; name: string }> | null>(null);
  const [templates, setTemplates] = useState<readonly TextAssetSummary[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [quickRows, setQuickRows] = useState<readonly UploadRow[]>([]);
  const [quickUploadFolderId, setQuickUploadFolderId] = useState<string | null>(null);
  const [quickUploading, setQuickUploading] = useState(false);
  const [quickTrayCollapsed, setQuickTrayCollapsed] = useState(false);
  const [quickRefreshError, setQuickRefreshError] = useState<string | null>(null);
  const [draggingFolderFiles, setDraggingFolderFiles] = useState(false);
  const quickFileInput = useRef<HTMLInputElement>(null);
  const fileGrid = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) { setOrganizationLoading(false); return; }
    let cancelled = false;
    setOrganizationLoading(true);
    void listAssetOrganization(workspaceId).then((value) => {
      if (!cancelled) { setOrganization(value); setOrganizationError(null); }
    }).catch((cause) => {
      if (!cancelled) setOrganizationError(cause instanceof Error ? cause.message : "暂时无法读取文件夹，请重试。");
    }).finally(() => { if (!cancelled) setOrganizationLoading(false); });
    return () => { cancelled = true; };
  }, [enabled, workspaceId, revision]);

  useEffect(() => {
    let active = true; setTemplates([]); setTemplatesError(null);
    if (!enabled) { setTemplatesLoading(false); return; }
    setTemplatesLoading(true);
    void listPrivateTextAssets(workspaceId).then((items) => { if (active) setTemplates(items); })
      .catch((cause) => { if (active) setTemplatesError(cause instanceof Error ? cause.message : "文本模板读取失败。"); })
      .finally(() => { if (active) setTemplatesLoading(false); });
    return () => { active = false; };
  }, [enabled, workspaceId, revision]);
  useEffect(() => {
    const changed = (event: Event) => {
      if (!(event instanceof CustomEvent) || event.detail?.workspaceId === workspaceId) setRevision((value) => value + 1);
    };
    window.addEventListener(TEXT_ASSETS_UPDATED_EVENT, changed);
    return () => window.removeEventListener(TEXT_ASSETS_UPDATED_EVENT, changed);
  }, [workspaceId]);

  const displayNames = useMemo(() => new Map(organization.arrangements
    .filter((entry) => entry.displayName)
    .map((entry) => [`${entry.kind}:${entry.id}`, entry.displayName!])), [organization.arrangements]);
  const items = useMemo<readonly LibraryItem[]>(() => [
    ...generated.map((item) => ({ id: item.id, kind: "generated" as const, media: "image" as const,
      name: displayNames.get(`generated:${item.id}`) ?? imageLabel(item), createdAt: item.createdAt, previewUrl: item.previewUrl, detailKey: item.detailKey,
      width: item.width, height: item.height, ordinal: item.ordinal })),
    ...references.map((item) => ({ id: item.id, kind: "reference" as const, media: "image" as const,
      name: displayNames.get(`reference:${item.id}`) ?? item.name, createdAt: item.uploadedAt, previewUrl: item.previewUrl, url: item.url,
      size: item.byteSize, width: item.width, height: item.height })),
    ...videos.map((item) => ({ id: item.id, kind: "video" as const, media: "video" as const,
      name: displayNames.get(`video:${item.id}`) ?? item.name, createdAt: item.uploadedAt, url: item.url, size: item.size })),
    ...audios.map((item) => ({ id: item.id, kind: "audio" as const, media: "audio" as const,
      name: displayNames.get(`audio:${item.id}`) ?? item.name, createdAt: item.uploadedAt, url: item.url, size: item.size })),
    ...(enabled ? templates : []).map((item) => ({ id: item.id, kind: "text" as const, media: "text" as const,
      name: displayNames.get(`text:${item.id}`) ?? item.name, createdAt: item.createdAt, previewText: item.previewText })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [generated, references, videos, audios, templates, enabled, displayNames]);
  const arrangements = useMemo(() => new Map(organization.arrangements.map((entry) => [`${entry.kind}:${entry.id}`, entry])), [organization]);
  const visible = filterAssetFiles(items, arrangements, folderId, search, filter, sourceFilter);
  const previewImages = visible.filter((item) => item.kind === "reference" && item.media === "image" && item.url).map((item) => ({
    key: `${item.kind}:${item.id}`, name: item.name, previewUrl: item.previewUrl ?? item.url!, sourceUrl: item.url!, width: item.width, height: item.height,
  }));
  const selectedItems = items.filter((item) => selectedKeys.includes(`${item.kind}:${item.id}`));
  const selectedFolders = organization.folders.filter((folder) => selectedFolderIds.includes(folder.id));
  const rootFolders = !folderId && filter === "all" && sourceFilter === "all"
    ? organization.folders.filter((folder) => folder.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) : [];
  const visibleKeys = visible.map((item) => `${item.kind}:${item.id}`);
  const visibleGridKeys = visibleKeys.join("|");
  const selectedVisibleCount = visibleKeys.filter((key) => selectedKeys.includes(key)).length;
  const activeFolder = organization.folders.find((item) => item.id === folderId);
  const quickReadyCount = quickRows.filter((row) => row.state === "ready").length;
  const quickFailedRows = quickRows.filter((row) => row.state === "failed");
  const loading = historyLoading || libraryLoading || templatesLoading;
  const error = historyError ?? libraryError;

  useLayoutEffect(() => {
    const grid = fileGrid.current;
    if (viewMode !== "grid" || !grid || typeof ResizeObserver === "undefined") return;
    const cards = Array.from(grid.children) as HTMLElement[];
    const placeCard = (card: HTMLElement) => {
      const gap = Number.parseFloat(getComputedStyle(grid).columnGap) || 0;
      const span = `span ${Math.ceil(card.getBoundingClientRect().height + gap)}`;
      if (card.style.gridRowEnd !== span) card.style.gridRowEnd = span;
    };
    cards.forEach(placeCard);
    grid.classList.add(styles.masonryReady);
    const pendingCards = new Set<HTMLElement>();
    let frame: number | null = null;
    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => pendingCards.add(entry.target as HTMLElement));
      if (frame !== null) return;
      // Writing gridRowEnd inside ResizeObserver can trigger another resize before paint.
      frame = requestAnimationFrame(() => {
        frame = null;
        pendingCards.forEach(placeCard);
        pendingCards.clear();
      });
    });
    cards.forEach((card) => observer.observe(card));
    return () => {
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
      pendingCards.clear();
      grid.classList.remove(styles.masonryReady);
      cards.forEach((card) => { card.style.gridRowEnd = ""; });
    };
  }, [viewMode, visibleGridKeys, loading, organizationLoading]);

  useEffect(() => {
    const available = new Set(items.map((item) => `${item.kind}:${item.id}`));
    setSelectedKeys((current) => current.every((key) => available.has(key)) ? current : current.filter((key) => available.has(key)));
  }, [items]);

  useEffect(() => {
    const available = new Set(organization.folders.map((folder) => folder.id));
    setSelectedFolderIds((current) => current.every((id) => available.has(id)) ? current : current.filter((id) => available.has(id)));
  }, [organization.folders]);

  useEffect(() => {
    if (!selectedKeys.length && !selectedFolderIds.length) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setSelectedKeys([]); setSelectedFolderIds([]); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedKeys.length, selectedFolderIds.length]);

  async function downloadItem(item: LibraryItem) {
    if (item.kind === "text") { await downloadPrivateTextAsset(item.id, item.name, workspaceId); return; }
    if (item.kind === "generated") {
      await saveImageToLocal(
        { assetId: item.id, createdAt: item.createdAt, ordinal: item.ordinal ?? 1, previewUrl: item.previewUrl! },
        { resolveDownloadUrl: (assetId) => readAssetDownloadUrl(assetId, workspaceId) },
      );
      return;
    }
    if (!item.url) throw new Error("文件地址暂时不可用，请刷新后重试。");
    const response = await fetch(item.url, { cache: "no-store" });
    if (!response.ok) throw new Error("文件下载失败，请刷新后重试。");
    const blob = await response.blob();
    if (!blob.size) throw new Error("文件内容为空，请刷新后重试。");
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl; link.download = item.name; link.hidden = true;
    document.body.appendChild(link);
    try { link.click(); } finally { link.remove(); window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000); }
  }

  async function downloadItems(targets: readonly LibraryItem[]) {
    if (busy || !targets.length) return;
    setBusy(true); setActionError(null);
    try {
      for (const item of targets) await downloadItem(item);
    } catch (cause) {
      console.error("[GoodGood] asset download failed", {
        message: cause instanceof Error ? cause.message : String(cause),
        stage: cause instanceof ImageDownloadError ? cause.stage : "unknown",
      });
      setActionError(cause instanceof Error ? cause.message : "下载失败，请重试。");
    } finally { setBusy(false); }
  }

  async function deleteItems(targets: readonly LibraryItem[]) {
    if (busy || !targets.length) return;
    const creditNotice = targets.some((item) => item.kind === "generated") ? "已结算的生成积分不会退回。" : "";
    if (!window.confirm(`永久删除选中的 ${targets.length} 个文件？该操作不可恢复。${creditNotice}`)) return;
    setBusy(true); setActionError(null);
    let deletionFailed = false;
    try {
      for (const item of targets) {
        if (item.kind === "generated") await deleteAsset(item.id, workspaceId);
        else if (item.kind === "text") { await deletePrivateTextAsset(item.id, workspaceId); setTemplates((current) => current.filter((entry) => entry.id !== item.id)); }
        else await deleteUploadedAsset(item.kind, item.id, workspaceId);
        setSelectedKeys((current) => current.filter((key) => key !== `${item.kind}:${item.id}`));
        if (item.kind === "generated") await onDeleteGenerated(item.id);
      }
    } catch (cause) {
      deletionFailed = true;
      setActionError(cause instanceof Error ? cause.message : "删除失败，请重试。");
    } finally {
      // A storage failure can follow a committed row change; refresh even when
      // the request failed so a removed file does not remain selectable.
      try { await onRefresh(); }
      catch (cause) { if (!deletionFailed) setActionError(cause instanceof Error ? cause.message : "文件已删除，但刷新失败，请重试。"); }
      setBusy(false);
    }
  }

  async function moveItems(targets: readonly LibraryItem[], nextFolder: string | null) {
    if (busy || !targets.length) return;
    setBusy(true); setActionError(null);
    try {
      for (const item of targets) {
        const arrangement = arrangements.get(`${item.kind}:${item.id}`);
        await saveAssetOrganization(item.kind, item.id, { folderId: nextFolder, tags: arrangement?.tags ?? [] }, workspaceId);
        setSelectedKeys((current) => current.filter((key) => key !== `${item.kind}:${item.id}`));
      }
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "移动失败，请重试。"); }
    finally { setRevision((current) => current + 1); setBusy(false); }
  }

  function applyItemToCreation(item: LibraryItem) {
    if (item.kind === "reference") { const material = references.find((value) => value.id === item.id); if (material) onUseReference(material); }
    else if (item.kind === "video") { const material = videos.find((value) => value.id === item.id); if (material) onUseVideo(material); }
    else if (item.kind === "audio") { const material = audios.find((value) => value.id === item.id); if (material) onUseAudio(material); }
    setSelectedKeys([]);
  }

  function toggleSelection(item: LibraryItem) {
    const key = `${item.kind}:${item.id}`;
    setSelectedFolderIds([]);
    setSelectedKeys((current) => current.includes(key) ? current.filter((value) => value !== key) : [...current, key]);
  }

  function toggleFolderSelection(folder: AssetFolder) {
    setSelectedKeys([]);
    setSelectedFolderIds((current) => current.includes(folder.id)
      ? current.filter((id) => id !== folder.id) : [...current, folder.id]);
  }

  function toggleVisibleSelection() {
    setSelectedFolderIds([]);
    setSelectedKeys((current) => {
      const allSelected = visibleKeys.every((key) => current.includes(key));
      return allSelected ? current.filter((key) => !visibleKeys.includes(key)) : [...new Set([...current, ...visibleKeys])];
    });
  }

  function openFolder(id: string) {
    setFolderId(id);
    setFilter("all");
    setSourceFilter("all");
    setSearch("");
    setSelectedKeys([]);
    setSelectedFolderIds([]);
  }

  function openFolderDialog(folder: AssetFolder | null = null) {
    setEditingFolderId(folder?.id ?? null);
    setNewFolderName(folder?.name ?? "");
    setFolderDialogError(null);
    setFolderDialogOpen(true);
  }

  async function saveFolder() {
    const name = newFolderName.trim();
    if (busy || !name) return;
    setBusy(true); setFolderDialogError(null);
    try {
      if (editingFolderId) await renameAssetFolder(editingFolderId, name, workspaceId);
      else await createAssetFolder(name, workspaceId);
      setFolderDialogOpen(false);
      setEditingFolderId(null);
      setNewFolderName("");
      setRevision((current) => current + 1);
    } catch (cause) { setFolderDialogError(cause instanceof Error ? cause.message : editingFolderId ? "重命名失败，请重试。" : "创建文件夹失败，请重试。"); }
    finally { setBusy(false); }
  }

  async function deleteFolders(targets: readonly AssetFolder[]) {
    if (busy || !targets.length) return;
    if (!window.confirm(`删除选中的 ${targets.length} 个文件夹？其中资产会回到全部资产。`)) return;
    setBusy(true); setActionError(null);
    try {
      for (const folder of targets) {
        await deleteAssetFolder(folder.id, workspaceId);
        setSelectedFolderIds((current) => current.filter((id) => id !== folder.id));
        if (folderId === folder.id) setFolderId(null);
      }
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "删除文件夹失败，请重试。"); }
    finally {
      setRevision((current) => current + 1);
      setBusy(false);
    }
  }

  async function uploadRowToFolder(row: UploadRow, destinationFolderId: string | null): Promise<string | null> {
    const validation = uploadError(row.file);
    if (validation) throw new Error(validation);
    let kind: OrganizedAssetKind;
    let id: string;
    if (row.file.type.startsWith("image/")) {
      const [result] = await uploadReferenceFiles([{ clientId: row.id, file: row.file }], () => {}, workspaceId);
      if (result?.reference.status !== "ready") throw new Error(result?.reference.errorMessage ?? "图片上传失败，请重试。");
      kind = "reference"; id = result.reference.id;
    } else if (row.file.type === "video/mp4") {
      const result = await uploadPrivateVideoMaterial(row.id, row.file, workspaceId);
      kind = "video"; id = result.id;
    } else {
      const result = await uploadPrivateAudioMaterial(row.id, row.file, workspaceId);
      kind = "audio"; id = result.id;
    }
    if (!destinationFolderId) return null;
    try {
      await saveAssetOrganization(kind, id, { folderId: destinationFolderId, tags: [] }, workspaceId);
      return null;
    } catch (cause) {
      return `上传成功，但未能放入文件夹：${cause instanceof Error ? cause.message : "请到全部资产中移动文件。"}`;
    }
  }

  async function uploadQuickRows(targets: readonly UploadRow[], destinationFolderId: string | null) {
    if (busy || !targets.length) return;
    setBusy(true); setQuickUploading(true); setQuickRefreshError(null);
    let uploaded = false;
    try {
      for (const row of targets) {
        setQuickRows((current) => current.map((item) => item.id === row.id ? { ...item, state: "uploading", message: undefined } : item));
        try {
          const warning = await uploadRowToFolder(row, destinationFolderId);
          uploaded = true;
          setQuickRows((current) => current.map((item) => item.id === row.id ? { ...item, state: "ready", message: warning ?? undefined } : item));
        } catch (cause) {
          setQuickRows((current) => current.map((item) => item.id === row.id ? { ...item, state: "failed", message: cause instanceof Error ? cause.message : "上传失败，请重试。" } : item));
        }
      }
      if (uploaded) { await onRefresh(); setRevision((current) => current + 1); }
    } catch (cause) { setQuickRefreshError(cause instanceof Error ? cause.message : "上传完成，但列表刷新失败，请刷新页面。"); }
    finally { setQuickUploading(false); setBusy(false); }
  }

  function chooseQuickFiles(files: FileList | null) {
    if (!files || busy || files.length === 0) return;
    const picked = Array.from(files, (file): UploadRow => ({ id: crypto.randomUUID(), file, state: "waiting" }));
    setQuickRows(picked);
    setQuickUploadFolderId(folderId);
    setQuickTrayCollapsed(false);
    void uploadQuickRows(picked, folderId);
  }

  function openItem(item: LibraryItem, trigger: HTMLButtonElement) {
    if (item.kind === "text") { setTextPreview({ id: item.id, name: item.name }); return; }
    if (item.detailKey) { onOpenGenerated(item.detailKey); return; }
    if (item.media === "image" && item.url) { setImagePreview({ selectedKey: `${item.kind}:${item.id}`, returnFocusTo: trigger }); return; }
    if (item.url) setPreview({ name: item.name, url: item.url, media: item.media });
  }

  function renderFileMenu(item: LibraryItem) {
    return <DropdownMenu>
      <DropdownMenuTrigger asChild><button className={styles.moreButton} aria-label={`${item.name} 的更多操作`} title="更多操作" disabled={busy}><MoreHorizontal size={19}/></button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={styles.fileMenu}>
        <DropdownMenuItem onSelect={() => void downloadItems([item])}><Download size={16}/>下载</DropdownMenuItem>
        {item.kind !== "generated" && item.kind !== "text" && <DropdownMenuItem onSelect={() => applyItemToCreation(item)}><Plus size={16}/>用于创作</DropdownMenuItem>}
        <DropdownMenuSub><DropdownMenuSubTrigger><Folder size={16}/>移动到</DropdownMenuSubTrigger><DropdownMenuSubContent className={styles.fileMenu}>
          <DropdownMenuItem onSelect={() => void moveItems([item], null)}>未分类</DropdownMenuItem>
          {organization.folders.map((folder) => <DropdownMenuItem key={folder.id} onSelect={() => void moveItems([item], folder.id)}>{folder.name}</DropdownMenuItem>)}
        </DropdownMenuSubContent></DropdownMenuSub>
        <DropdownMenuItem variant="destructive" onSelect={() => void deleteItems([item])}><Trash2 size={16}/>删除</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>;
  }

  function renderFolderMenu(folder: AssetFolder) {
    return <DropdownMenu><DropdownMenuTrigger asChild><button className={styles.moreButton} aria-label={`${folder.name} 的更多操作`} title="更多操作" disabled={busy}><MoreHorizontal size={19}/></button></DropdownMenuTrigger><DropdownMenuContent align="end" className={styles.fileMenu}>
      <DropdownMenuItem disabled={busy} onSelect={() => openFolderDialog(folder)}><Pencil size={16}/>重命名</DropdownMenuItem>
      <DropdownMenuItem disabled={busy} variant="destructive" onSelect={() => void deleteFolders([folder])}><Trash2 size={16}/>删除文件夹</DropdownMenuItem>
    </DropdownMenuContent></DropdownMenu>;
  }

  function renderFolderRow(folder: AssetFolder) {
    const selected = selectedFolderIds.includes(folder.id);
    return <article className={`${styles.fileCard} ${styles.folderRow} ${selected ? styles.isSelected : ""} ${selectedFolderIds.length ? styles.listSelecting : ""}`} key={`folder:${folder.id}`}>
      <Checkbox className={styles.listSelect} checked={selected} aria-label={`${selected ? "取消选择" : "选择"}文件夹 ${folder.name}`} disabled={busy} onCheckedChange={() => toggleFolderSelection(folder)}/>
      <button className={styles.folderVisual} aria-label={`打开文件夹 ${folder.name}`} onClick={() => openFolder(folder.id)}><Folder size={20}/></button>
      <div className={styles.fileInfo}><button title={folder.name} onClick={() => openFolder(folder.id)}>{folder.name}</button><time dateTime={folder.createdAt}>{dateLabel(folder.createdAt)}</time><small>—</small></div>
      {renderFolderMenu(folder)}
    </article>;
  }

  function renderFile(item: LibraryItem) {
    const key = `${item.kind}:${item.id}`;
    const selected = selectedKeys.includes(key);
    const listMode = viewMode === "list";
    const aspectRatio = item.width && item.height ? `${item.width} / ${item.height}` : undefined;
    return <article className={`${styles.fileCard} ${item.media === "text" ? styles.textAsset : ""} ${selected ? styles.isSelected : ""} ${selectedKeys.length ? styles.listSelecting : ""}`} key={key}>
      {listMode && <Checkbox className={styles.listSelect} checked={selected} aria-label={`${selected ? "取消选择" : "选择"} ${item.name}`} disabled={busy} onCheckedChange={() => toggleSelection(item)}/>}
      <div className={styles.fileVisual}>
        {item.media === "text" ? <button className={styles.mediaFrame} style={{ aspectRatio: 1 }} onClick={(event) => openItem(item, event.currentTarget)} aria-label={`查看文本模板 ${item.name}`}>
          <TextAssetThumbnail text={item.previewText ?? ""}/>
        </button> : item.media === "image" ? <button className={styles.mediaFrame} style={{ aspectRatio }} onClick={(event) => openItem(item, event.currentTarget)} aria-label={`查看 ${item.name}`}>
          <PrivateObjectImage src={item.previewUrl!} alt={item.name}/>
        </button> : item.media === "video" ? <button className={styles.mediaFrame} onClick={(event) => openItem(item, event.currentTarget)} aria-label={`查看 ${item.name}`}>
          <VideoTilePreview url={item.url} enabled={enabled && !busy && !preview && !imagePreview && !textPreview && !folderDialogOpen}/>
        </button> : <button className={styles.audioFrame} onClick={(event) => openItem(item, event.currentTarget)} aria-label={`播放 ${item.name}`}><AudioLines size={30}/></button>}
        {!listMode && renderFileMenu(item)}
        {!listMode && <Checkbox className={styles.selectButton} checked={selected} aria-label={`${selected ? "取消选择" : "选择"} ${item.name}`} title={selected ? "取消选择" : "选择"} disabled={busy} onCheckedChange={() => toggleSelection(item)}/>}
      </div>
      <div className={styles.fileInfo}><button title={item.name} onClick={(event) => openItem(item, event.currentTarget)}>{item.name}</button><time dateTime={item.createdAt}>{dateLabel(item.createdAt)}</time><small>{item.size ? bytesLabel(item.size) : "—"}</small></div>
      {listMode && renderFileMenu(item)}
    </article>;
  }

  return <section className={styles.workspace} aria-label="资产">
    <input ref={quickFileInput} type="file" accept=".jpg,.jpeg,.png,.mp4,.mp3,image/jpeg,image/png,video/mp4,audio/mpeg" multiple hidden onChange={(event) => { chooseQuickFiles(event.target.files); event.target.value = ""; }}/>
    <header className={styles.header}>
      {activeFolder ? <h1 className={styles.folderBreadcrumb}><button aria-label="返回全部资产" onClick={() => { setFolderId(null); setSearch(""); setSelectedKeys([]); setSelectedFolderIds([]); }}>资产</button><ChevronRight size={18} aria-hidden="true"/><span>{activeFolder.name}</span></h1> : <h1>资产</h1>}
      <div className={styles.headerTools}>
        <div className={styles.iconGroup} role="group" aria-label="文件来源">
          <button className={sourceFilter === "uploaded" ? styles.iconActive : ""} aria-label="已上传" title="已上传" aria-pressed={sourceFilter === "uploaded"} onClick={() => { setSourceFilter(sourceFilter === "uploaded" ? "all" : "uploaded"); setSelectedKeys([]); setSelectedFolderIds([]); }}><Upload size={17}/></button>
          <button className={sourceFilter === "generated" ? styles.iconActive : ""} aria-label="已生成" title="已生成" aria-pressed={sourceFilter === "generated"} onClick={() => { setSourceFilter(sourceFilter === "generated" ? "all" : "generated"); setSelectedKeys([]); setSelectedFolderIds([]); }}><WandSparkles size={17}/></button>
        </div>
        <div className={styles.iconGroup} role="group" aria-label="视图模式">
          <button className={viewMode === "grid" ? styles.iconActive : ""} aria-label="网格视图" title="网格视图" aria-pressed={viewMode === "grid"} onClick={() => setViewMode("grid")}><Grid2X2 size={17}/></button>
          <button className={viewMode === "list" ? styles.iconActive : ""} aria-label="列表视图" title="列表视图" aria-pressed={viewMode === "list"} onClick={() => setViewMode("list")}><List size={18}/></button>
        </div>
        <InputGroup className={styles.search}>
          <InputGroupAddon className={styles.searchAddon}><Search size={16} aria-hidden="true"/></InputGroupAddon>
          <InputGroupInput className={styles.searchInput} value={search} onChange={(event) => { setSearch(event.target.value); setSelectedKeys([]); setSelectedFolderIds([]); }} placeholder={activeFolder ? "在此文件夹中搜索" : "搜索资产"} aria-label={activeFolder ? "在此文件夹中搜索" : "搜索资产"} />
        </InputGroup>
        <DropdownMenu><DropdownMenuTrigger asChild><button className={styles.primaryButton}>新建<ChevronDown size={15}/></button></DropdownMenuTrigger><DropdownMenuContent align="end" className={styles.fileMenu}>
          <DropdownMenuItem disabled={busy} onSelect={() => quickFileInput.current?.click()}><Upload size={16}/>上传文件</DropdownMenuItem>
          <DropdownMenuItem disabled={busy} onSelect={() => openFolderDialog()}><FolderPlus size={16}/>新建文件夹</DropdownMenuItem>
        </DropdownMenuContent></DropdownMenu>
      </div>
    </header>
    {!activeFolder && <div className={styles.filters} role="group" aria-label="资产类型">
      {mediaFilters.map((choice) => <button key={choice.id} className={filter === choice.id ? styles.selectedFilter : ""} aria-pressed={filter === choice.id} onClick={() => { setFilter(choice.id); setSelectedKeys([]); setSelectedFolderIds([]); }}>{choice.label}</button>)}
    </div>}
    {(error || organizationError || actionError || templatesError) && <div className={styles.error} role="alert"><CircleAlert size={16}/>{actionError ?? error ?? organizationError ?? templatesError}<button onClick={() => { setActionError(null); onRetry(); setRevision((current) => current + 1); }}><RefreshCw size={14}/>重试</button></div>}
    {(loading || organizationLoading) && <div className={styles.state} role="status"><LoaderCircle className={styles.spinner} size={18}/>正在读取资产</div>}
    {!loading && !organizationLoading && viewMode === "grid" && rootFolders.length > 0 && <section className={styles.folderSection} aria-label="文件夹"><h2>文件夹</h2>
      <div className={styles.folders}>{rootFolders.map((folder) => {
        const selected = selectedFolderIds.includes(folder.id);
        return <article className={`${styles.folder} ${selected ? styles.isSelected : ""}`} key={folder.id}>
          <div className={styles.folderVisualArea}>
            <button className={styles.folderArt} aria-label={`打开文件夹 ${folder.name}`} onClick={() => openFolder(folder.id)}><Folder size={38} strokeWidth={1.8}/></button>
            {renderFolderMenu(folder)}
            <Checkbox className={styles.selectButton} checked={selected} aria-label={`${selected ? "取消选择" : "选择"}文件夹 ${folder.name}`} title={selected ? "取消选择" : "选择"} disabled={busy} onCheckedChange={() => toggleFolderSelection(folder)}/>
          </div>
          <button className={styles.folderName} title={folder.name} onClick={() => openFolder(folder.id)}>{folder.name}</button>
          <small>{items.filter((item) => arrangements.get(`${item.kind}:${item.id}`)?.folderId === folder.id).length} 个项目</small>
        </article>;
      })}</div>
    </section>}
    {!loading && !organizationLoading && <section className={styles.filesSection} aria-label={viewMode === "list" ? "资产列表" : "项目"}>
      {viewMode === "grid" && !activeFolder && <h2>项目</h2>}
      {viewMode === "list" && (activeFolder || rootFolders.length > 0 || visible.length > 0) && <div className={`${styles.listHead} ${selectedKeys.length || selectedFolderIds.length ? styles.listSelecting : ""}`}>
        {(visible.length > 0 || activeFolder) && <Checkbox className={styles.listSelect} checked={visible.length > 0 && selectedVisibleCount === visible.length ? true : selectedVisibleCount > 0 ? "indeterminate" : false} aria-label={selectedVisibleCount === visible.length && visible.length > 0 ? "取消全选可见文件" : "全选可见文件"} disabled={busy || visible.length === 0} onCheckedChange={toggleVisibleSelection}/>}
        <span className={styles.nameHeading}>名称</span><span>修改日期</span><span>大小</span>
      </div>}
      {visible.length || (viewMode === "list" && rootFolders.length) ? <div ref={fileGrid} className={viewMode === "grid" ? styles.fileGrid : styles.fileList}>
        {viewMode === "list" && rootFolders.map(renderFolderRow)}{visible.map(renderFile)}
      </div> : activeFolder && !search.trim() && filter === "all" && sourceFilter === "all" ? <div className={`${styles.folderUploadEmpty} ${draggingFolderFiles ? styles.folderUploadDragging : ""}`} aria-label={`上传文件到${activeFolder.name}`} onDragOver={(event) => { event.preventDefault(); if (!busy) setDraggingFolderFiles(true); }} onDragLeave={() => setDraggingFolderFiles(false)} onDrop={(event) => { event.preventDefault(); setDraggingFolderFiles(false); chooseQuickFiles(event.dataTransfer.files); }}><Upload size={27} strokeWidth={1.7}/><button disabled={busy} onClick={() => quickFileInput.current?.click()}>上传文件</button></div> : <div className={styles.state}><ImagePlus size={22}/><strong>{folderId ? "没有匹配的资产" : search || filter !== "all" || sourceFilter !== "all" ? "没有匹配的资产" : "还没有资产"}</strong><span>生成结果会自动保存，也可以上传 JPG/JPEG、PNG、MP4 或 MP3。</span></div>}
    </section>}
    {quickRows.length > 0 && <aside className={styles.uploadTray} aria-label="文件上传进度" aria-live="polite">
      <div className={styles.uploadTrayHead}><strong>{quickUploading ? `正在上传 ${quickRows.length} 个文件` : quickFailedRows.length > 0 ? `${quickFailedRows.length} 个文件上传失败` : quickRows.some((row) => row.message) ? "上传完成，部分文件未归档" : "上传完成"}</strong><span>{quickReadyCount}/{quickRows.length}</span><button aria-label={quickTrayCollapsed ? "展开上传详情" : "收起上传详情"} aria-expanded={!quickTrayCollapsed} onClick={() => setQuickTrayCollapsed((current) => !current)}><ChevronDown size={16}/></button>{!quickUploading && <button aria-label="关闭上传进度" onClick={() => { setQuickRows([]); setQuickRefreshError(null); }}><X size={15}/></button>}</div>
      {!quickTrayCollapsed && <div className={styles.uploadTrayBody}><ul>{quickRows.map((row) => <li key={row.id}><span className={styles.uploadTrayIcon}>{row.state === "ready" ? <Check size={16}/> : row.state === "failed" ? <CircleAlert size={16}/> : <LoaderCircle className={styles.spinner} size={16}/>}</span><span className={styles.uploadTrayText}><strong title={row.file.name}>{row.file.name}</strong><small className={row.state === "failed" || row.message ? styles.uploadTrayError : ""}>{row.message ?? ({ waiting: "等待上传", uploading: "正在上传…", ready: "已上传", failed: "上传失败" }[row.state])}</small></span></li>)}</ul>{quickRefreshError && <p role="alert" className={styles.uploadTrayError}>{quickRefreshError}</p>}{quickFailedRows.length > 0 && !quickUploading && <button className={styles.uploadTrayRetry} onClick={() => void uploadQuickRows(quickFailedRows, quickUploadFolderId)}>重试失败文件</button>}</div>}
    </aside>}
    {(selectedItems.length > 0 || selectedFolders.length > 0) && <div className={styles.selectionBar} role="toolbar" aria-label={selectedFolders.length ? "已选文件夹操作" : "已选资产操作"}>
      <span>已选择 {selectedFolders.length || selectedItems.length} 个</span>
      {selectedItems.length > 0 && <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void downloadItems(selectedItems)}><Download size={16}/>下载</Button>}
      {selectedItems.length > 0 && <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="secondary" size="sm" disabled={busy}><Folder size={16}/>移动</Button></DropdownMenuTrigger><DropdownMenuContent side="top" align="center" className={styles.fileMenu}>
        <DropdownMenuItem onSelect={() => void moveItems(selectedItems, null)}>未分类</DropdownMenuItem>
        {organization.folders.map((folder) => <DropdownMenuItem key={folder.id} onSelect={() => void moveItems(selectedItems, folder.id)}>{folder.name}</DropdownMenuItem>)}
      </DropdownMenuContent></DropdownMenu>}
      <Button type="button" variant="destructive" size="sm" className={styles.deleteAction} disabled={busy} onClick={() => selectedFolders.length ? void deleteFolders(selectedFolders) : void deleteItems(selectedItems)}><Trash2 size={16}/>删除</Button>
      <Button type="button" variant="ghost" size="icon-sm" className={styles.closeSelection} aria-label="取消选择" title="取消选择" disabled={busy} onClick={() => { setSelectedKeys([]); setSelectedFolderIds([]); }}><X size={17}/></Button>
    </div>}
    <Dialog open={folderDialogOpen} onOpenChange={(open) => { if (!busy) { setFolderDialogOpen(open); if (!open) setFolderDialogError(null); } }}><DialogContent className={styles.folderDialog} overlayClassName={styles.folderDialogOverlay} showCloseButton={false} onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }} onPointerDownOutside={(event) => { if (busy) event.preventDefault(); }}>
      <DialogTitle>{editingFolderId ? "重命名文件夹" : "新建文件夹"}</DialogTitle>
      <DialogDescription className="sr-only">输入文件夹名称后{editingFolderId ? "保存" : "创建"}。</DialogDescription>
      <form onSubmit={(event) => { event.preventDefault(); void saveFolder(); }}>
        <Label htmlFor="asset-folder-name">文件夹名称</Label>
        <Input id="asset-folder-name" autoFocus maxLength={64} value={newFolderName} disabled={busy} aria-invalid={Boolean(folderDialogError)} aria-describedby={folderDialogError ? "asset-folder-error" : undefined} onFocus={(event) => { if (editingFolderId) event.currentTarget.select(); }} onChange={(event) => { setNewFolderName(event.target.value); if (folderDialogError) setFolderDialogError(null); }}/>
        {folderDialogError && <p id="asset-folder-error" role="alert" className={styles.folderDialogError}>{folderDialogError}</p>}
        <div className={styles.folderDialogActions}><Button type="button" variant="secondary" disabled={busy} onClick={() => setFolderDialogOpen(false)}>取消</Button><Button type="submit" disabled={busy || !newFolderName.trim()}>{busy ? editingFolderId ? "保存中…" : "创建中…" : editingFolderId ? "保存" : "创建"}</Button></div>
      </form>
    </DialogContent></Dialog>
    <TextAssetViewer asset={enabled ? textPreview : null} workspaceId={workspaceId} onClose={() => setTextPreview(null)}/>
    {imagePreview && <ImageViewer items={previewImages} selectedKey={imagePreview.selectedKey} returnFocusTo={imagePreview.returnFocusTo}
      onSelect={(selectedKey) => setImagePreview((current) => current && ({ ...current, selectedKey }))} onClose={() => setImagePreview(null)} />}
    <Dialog open={Boolean(preview)} onOpenChange={(open) => { if (!open) setPreview(null); }}><DialogPortal><DialogOverlay/><DialogPrimitive.Content className={styles.previewDialog} aria-describedby="asset-preview-description"><DialogTitle>{preview?.name ?? "文件预览"}</DialogTitle><DialogDescription id="asset-preview-description">已上传文件预览</DialogDescription>{preview?.media === "video" && <video src={preview.url} controls autoPlay aria-label={preview.name}/>} {preview?.media === "audio" && <audio src={preview.url} controls autoPlay aria-label={preview.name}/>}<button onClick={() => setPreview(null)}>关闭</button></DialogPrimitive.Content></DialogPortal></Dialog>
  </section>;
}
