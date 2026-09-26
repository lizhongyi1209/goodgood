"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, Check, ChevronDown, ChevronLeft, CircleAlert, Download, Folder, FolderPlus, Grid2X2, ImagePlus, List, LoaderCircle, Minus, MoreHorizontal, Pencil, Plus, RefreshCw, Search, Trash2, Upload, WandSparkles, X } from "lucide-react";
import { Dialog, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { Dialog as DialogPrimitive } from "radix-ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import { uploadReferenceFiles } from "@/features/references/http-reference-upload";
import type { ReferenceMaterial } from "@/features/references/http-reference-library";
import { uploadPrivateVideoMaterial, type PrivateVideoMaterial } from "@/features/creation/http-video-materials";
import { uploadPrivateAudioMaterial, type PrivateAudioMaterial } from "@/features/assets/http-audio-materials";
import { createAssetFolder, deleteAssetFolder, listAssetOrganization, renameAssetFolder, saveAssetOrganization, type AssetArrangement, type AssetFolder, type OrganizedAssetKind } from "@/features/assets/http-asset-organization";
import { deleteAsset, deleteUploadedAsset, readAssetDownloadUrl } from "@/features/assets/http-asset-boundary";
import { ImageDownloadError, saveImageToLocal } from "@/features/assets/image-download";
import { PRIVATE_AUDIO_UPLOAD_MAX_BYTES, PRIVATE_IMAGE_UPLOAD_MAX_BYTES, PRIVATE_VIDEO_UPLOAD_MAX_BYTES } from "@/shared/contracts/upload-limits.mjs";
import styles from "./asset-workspace.module.css";

type Media = "image" | "video" | "audio";
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
];

export function filterAssetFiles(items: readonly LibraryItem[], arrangements: ArrangementLookup,
  folderId: string | null, search: string, media: Filter, source: SourceFilter): readonly LibraryItem[] {
  const query = search.trim().toLocaleLowerCase();
  return items.filter((item) => {
    const arrangement = arrangements.get(`${item.kind}:${item.id}`);
    return (!folderId || arrangement?.folderId === folderId) &&
      (!query || item.name.toLocaleLowerCase().includes(query)) &&
      (media === "all" || item.media === media) &&
      (source === "all" || (source === "generated" ? item.kind === "generated" : item.kind !== "generated"));
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

export function AssetWorkspace({ workspaceId, enabled, generated, references, videos, audios,
  historyLoading, libraryLoading, historyError, libraryError,
  onRetry, onRefresh, onDeleteGenerated, onOpenGenerated, onUseReference, onUseVideo, onUseAudio }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedKeys, setSelectedKeys] = useState<readonly string[]>([]);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [organization, setOrganization] = useState<{ folders: readonly AssetFolder[]; arrangements: readonly AssetArrangement[] }>({ folders: [], arrangements: [] });
  const [organizationLoading, setOrganizationLoading] = useState(true);
  const [organizationError, setOrganizationError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [preview, setPreview] = useState<{ name: string; url: string; media: Media } | null>(null);
  const [rows, setRows] = useState<readonly UploadRow[]>([]);
  const [uploadFolderId, setUploadFolderId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

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

  const items = useMemo<readonly LibraryItem[]>(() => [
    ...generated.map((item) => ({ id: item.id, kind: "generated" as const, media: "image" as const,
      name: imageLabel(item), createdAt: item.createdAt, previewUrl: item.previewUrl, detailKey: item.detailKey,
      width: item.width, height: item.height, ordinal: item.ordinal })),
    ...references.map((item) => ({ id: item.id, kind: "reference" as const, media: "image" as const,
      name: item.name, createdAt: item.uploadedAt, previewUrl: item.previewUrl, url: item.url,
      size: item.byteSize, width: item.width, height: item.height })),
    ...videos.map((item) => ({ id: item.id, kind: "video" as const, media: "video" as const,
      name: item.name, createdAt: item.uploadedAt, url: item.url, size: item.size })),
    ...audios.map((item) => ({ id: item.id, kind: "audio" as const, media: "audio" as const,
      name: item.name, createdAt: item.uploadedAt, url: item.url, size: item.size })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [generated, references, videos, audios]);
  const arrangements = useMemo(() => new Map(organization.arrangements.map((entry) => [`${entry.kind}:${entry.id}`, entry])), [organization]);
  const visible = filterAssetFiles(items, arrangements, folderId, search, filter, sourceFilter);
  const selectedItems = items.filter((item) => selectedKeys.includes(`${item.kind}:${item.id}`));
  const rootFolders = !folderId && filter === "all" && sourceFilter === "all"
    ? organization.folders.filter((folder) => folder.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) : [];
  const visibleKeys = visible.map((item) => `${item.kind}:${item.id}`);
  const selectedVisibleCount = visibleKeys.filter((key) => selectedKeys.includes(key)).length;
  const activeFolder = organization.folders.find((item) => item.id === folderId);
  const loading = historyLoading || libraryLoading;
  const error = historyError ?? libraryError;

  useEffect(() => {
    const available = new Set(items.map((item) => `${item.kind}:${item.id}`));
    setSelectedKeys((current) => current.every((key) => available.has(key)) ? current : current.filter((key) => available.has(key)));
  }, [items]);

  useEffect(() => {
    if (!selectedKeys.length) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setSelectedKeys([]); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedKeys.length]);

  async function downloadItem(item: LibraryItem) {
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
    setSelectedKeys((current) => current.includes(key) ? current.filter((value) => value !== key) : [...current, key]);
  }

  function toggleVisibleSelection() {
    setSelectedKeys((current) => {
      const allSelected = visibleKeys.every((key) => current.includes(key));
      return allSelected ? current.filter((key) => !visibleKeys.includes(key)) : [...new Set([...current, ...visibleKeys])];
    });
  }

  async function addFolder() {
    const name = window.prompt("文件夹名称");
    if (name == null) return;
    setBusy(true); setActionError(null);
    try { await createAssetFolder(name, workspaceId); setRevision((current) => current + 1); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : "创建文件夹失败，请重试。"); }
    finally { setBusy(false); }
  }

  async function editFolder(action: "rename" | "delete", target: AssetFolder | undefined = activeFolder) {
    if (!target) return;
    if (action === "delete" && !window.confirm(`删除文件夹“${target.name}”？其中资产会回到全部资产。`)) return;
    const name = action === "rename" ? window.prompt("文件夹名称", target.name) : null;
    if (action === "rename" && name == null) return;
    setBusy(true); setActionError(null);
    try {
      if (action === "rename") await renameAssetFolder(target.id, name!, workspaceId);
      else { await deleteAssetFolder(target.id, workspaceId); if (folderId === target.id) setFolderId(null); }
      setRevision((current) => current + 1);
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "文件夹操作失败，请重试。"); }
    finally { setBusy(false); }
  }

  function chooseFiles(files: FileList | null) {
    if (!files) return;
    setRows((current) => [...current, ...Array.from(files, (file): UploadRow => ({
      id: crypto.randomUUID(), file, state: "waiting", message: uploadError(file) ?? undefined,
    }))]);
  }

  async function uploadAll() {
    setBusy(true); setActionError(null);
    let uploaded = false;
    for (const row of rows.filter((item) => item.state === "waiting" || item.state === "failed")) {
      const validation = uploadError(row.file);
      if (validation) { setRows((current) => current.map((item) => item.id === row.id ? { ...item, state: "failed", message: validation } : item)); continue; }
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, state: "uploading", message: undefined } : item));
      try {
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
        uploaded = true;
        try { if (uploadFolderId) await saveAssetOrganization(kind, id, { folderId: uploadFolderId, tags: [] }, workspaceId); }
        catch (cause) { setActionError(`上传成功，但整理失败：${cause instanceof Error ? cause.message : "请在资产卡片中重试。"}`); }
        setRows((current) => current.map((item) => item.id === row.id ? { ...item, state: "ready", message: undefined } : item));
      } catch (cause) {
        setRows((current) => current.map((item) => item.id === row.id ? { ...item, state: "failed", message: cause instanceof Error ? cause.message : "上传失败，请重试。" } : item));
      }
    }
    if (uploaded) { await onRefresh(); setRevision((current) => current + 1); }
    setBusy(false);
  }

  function openItem(item: LibraryItem) {
    if (item.detailKey) { onOpenGenerated(item.detailKey); return; }
    if (item.url) setPreview({ name: item.name, url: item.url, media: item.media });
  }

  function renderFileMenu(item: LibraryItem) {
    return <DropdownMenu>
      <DropdownMenuTrigger asChild><button className={styles.moreButton} aria-label={`${item.name} 的更多操作`} title="更多操作" disabled={busy}><MoreHorizontal size={19}/></button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={styles.fileMenu}>
        <DropdownMenuItem onSelect={() => void downloadItems([item])}><Download size={16}/>下载</DropdownMenuItem>
        {item.kind !== "generated" && <DropdownMenuItem onSelect={() => applyItemToCreation(item)}><Plus size={16}/>用于创作</DropdownMenuItem>}
        <DropdownMenuSub><DropdownMenuSubTrigger><Folder size={16}/>移动到</DropdownMenuSubTrigger><DropdownMenuSubContent>
          <DropdownMenuItem onSelect={() => void moveItems([item], null)}>未分类</DropdownMenuItem>
          {organization.folders.map((folder) => <DropdownMenuItem key={folder.id} onSelect={() => void moveItems([item], folder.id)}>{folder.name}</DropdownMenuItem>)}
        </DropdownMenuSubContent></DropdownMenuSub>
        <DropdownMenuItem variant="destructive" onSelect={() => void deleteItems([item])}><Trash2 size={16}/>删除</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>;
  }

  function renderFolderRow(folder: AssetFolder) {
    return <article className={`${styles.fileCard} ${styles.folderRow}`} key={`folder:${folder.id}`}>
      <span className={styles.listSelectSpacer} aria-hidden="true"/>
      <button className={styles.folderVisual} aria-label={`打开文件夹 ${folder.name}`} onClick={() => { setFolderId(folder.id); setSelectedKeys([]); }}><Folder size={20}/></button>
      <div className={styles.fileInfo}><button title={folder.name} onClick={() => { setFolderId(folder.id); setSelectedKeys([]); }}>{folder.name}</button><time dateTime={folder.createdAt}>{dateLabel(folder.createdAt)}</time><small>—</small></div>
      <DropdownMenu><DropdownMenuTrigger asChild><button className={styles.moreButton} aria-label={`${folder.name} 的更多操作`} title="更多操作" disabled={busy}><MoreHorizontal size={19}/></button></DropdownMenuTrigger><DropdownMenuContent align="end" className={styles.fileMenu}>
        <DropdownMenuItem onSelect={() => void editFolder("rename", folder)}><Pencil size={16}/>重命名</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={() => void editFolder("delete", folder)}><Trash2 size={16}/>删除文件夹</DropdownMenuItem>
      </DropdownMenuContent></DropdownMenu>
    </article>;
  }

  function renderFile(item: LibraryItem) {
    const key = `${item.kind}:${item.id}`;
    const selected = selectedKeys.includes(key);
    const listMode = viewMode === "list";
    const aspectRatio = item.width && item.height ? `${item.width} / ${item.height}` : undefined;
    return <article className={`${styles.fileCard} ${selected ? styles.isSelected : ""} ${selectedKeys.length ? styles.listSelecting : ""}`} key={key}>
      {listMode && <button className={styles.listSelect} role="checkbox" aria-checked={selected} aria-label={`${selected ? "取消选择" : "选择"} ${item.name}`} disabled={busy} onClick={() => toggleSelection(item)}>{selected && <Check size={12}/>}</button>}
      <div className={styles.fileVisual}>
        {item.media === "image" ? <button className={styles.mediaFrame} style={{ aspectRatio }} onClick={() => openItem(item)} aria-label={`查看 ${item.name}`}>
          <PrivateObjectImage src={item.previewUrl!} alt={item.name}/>
        </button> : item.media === "video" ? <button className={styles.mediaFrame} onClick={() => openItem(item)} aria-label={`查看 ${item.name}`}>
          <video src={item.url} muted preload="metadata" aria-hidden="true"/>
        </button> : <button className={styles.audioFrame} onClick={() => openItem(item)} aria-label={`播放 ${item.name}`}><AudioLines size={30}/></button>}
        {!listMode && renderFileMenu(item)}
        {!listMode && <button className={styles.selectButton} aria-label={`${selected ? "取消选择" : "选择"} ${item.name}`} aria-pressed={selected} title={selected ? "取消选择" : "选择"} disabled={busy} onClick={() => toggleSelection(item)}><Check size={15}/></button>}
      </div>
      <div className={styles.fileInfo}><button title={item.name} onClick={() => openItem(item)}>{item.name}</button><time dateTime={item.createdAt}>{dateLabel(item.createdAt)}</time><small>{item.size ? bytesLabel(item.size) : "—"}</small></div>
      {listMode && renderFileMenu(item)}
    </article>;
  }

  return <section className={styles.workspace} aria-label="资产">
    <header className={styles.header}>
      <h1>资产</h1>
      <div className={styles.headerTools}>
        <div className={styles.iconGroup} role="group" aria-label="文件来源">
          <button className={sourceFilter === "uploaded" ? styles.iconActive : ""} aria-label="已上传" title="已上传" aria-pressed={sourceFilter === "uploaded"} onClick={() => { setSourceFilter(sourceFilter === "uploaded" ? "all" : "uploaded"); setSelectedKeys([]); }}><Upload size={17}/></button>
          <button className={sourceFilter === "generated" ? styles.iconActive : ""} aria-label="已生成" title="已生成" aria-pressed={sourceFilter === "generated"} onClick={() => { setSourceFilter(sourceFilter === "generated" ? "all" : "generated"); setSelectedKeys([]); }}><WandSparkles size={17}/></button>
        </div>
        <div className={styles.iconGroup} role="group" aria-label="视图模式">
          <button className={viewMode === "grid" ? styles.iconActive : ""} aria-label="网格视图" title="网格视图" aria-pressed={viewMode === "grid"} onClick={() => setViewMode("grid")}><Grid2X2 size={17}/></button>
          <button className={viewMode === "list" ? styles.iconActive : ""} aria-label="列表视图" title="列表视图" aria-pressed={viewMode === "list"} onClick={() => setViewMode("list")}><List size={18}/></button>
        </div>
        <label className={styles.search}><Search size={16}/><input value={search} onChange={(event) => { setSearch(event.target.value); setSelectedKeys([]); }} placeholder="搜索资产" aria-label="搜索资产" /></label>
        <DropdownMenu><DropdownMenuTrigger asChild><button className={styles.primaryButton}>新建<ChevronDown size={15}/></button></DropdownMenuTrigger><DropdownMenuContent align="end" className={styles.fileMenu}>
          <DropdownMenuItem onSelect={() => { setRows([]); setActionError(null); setUploadFolderId(folderId); setUploadOpen(true); }}><Upload size={16}/>上传文件</DropdownMenuItem>
          <DropdownMenuItem disabled={busy} onSelect={() => void addFolder()}><FolderPlus size={16}/>新建文件夹</DropdownMenuItem>
        </DropdownMenuContent></DropdownMenu>
      </div>
    </header>
    <div className={styles.filters} role="group" aria-label="资产类型">
      {mediaFilters.map((choice) => <button key={choice.id} className={filter === choice.id ? styles.selectedFilter : ""} aria-pressed={filter === choice.id} onClick={() => { setFilter(choice.id); setSelectedKeys([]); }}>{choice.label}</button>)}
    </div>
    {activeFolder && <div className={styles.folderActions}><button onClick={() => { setFolderId(null); setSelectedKeys([]); }}><ChevronLeft size={15}/>全部资产</button><span>/ {activeFolder.name}</span><button disabled={busy} title="重命名文件夹" aria-label="重命名文件夹" onClick={() => void editFolder("rename")}><Pencil size={15}/></button><button disabled={busy} onClick={() => void editFolder("delete")}>删除文件夹</button></div>}
    {(error || organizationError || actionError) && <div className={styles.error} role="alert"><CircleAlert size={16}/>{actionError ?? error ?? organizationError}<button onClick={() => { setActionError(null); onRetry(); setRevision((current) => current + 1); }}><RefreshCw size={14}/>重试</button></div>}
    {(loading || organizationLoading) && <div className={styles.state} role="status"><LoaderCircle className={styles.spinner} size={18}/>正在读取资产</div>}
    {!loading && !organizationLoading && viewMode === "grid" && rootFolders.length > 0 && <section className={styles.folderSection} aria-label="文件夹"><h2>文件夹</h2>
      <div className={styles.folders}>{rootFolders.map((folder) => <button className={styles.folder} key={folder.id} onClick={() => { setFolderId(folder.id); setSelectedKeys([]); }}>
        <span className={styles.folderArt}><Folder size={38} strokeWidth={1.8}/></span><strong>{folder.name}</strong><small>{items.filter((item) => arrangements.get(`${item.kind}:${item.id}`)?.folderId === folder.id).length} 个项目</small>
      </button>)}</div>
    </section>}
    {!loading && !organizationLoading && <section className={styles.filesSection} aria-label={viewMode === "list" ? "资产列表" : "项目"}>
      {viewMode === "grid" && <h2>{activeFolder ? activeFolder.name : "项目"}</h2>}
      {viewMode === "list" && (rootFolders.length > 0 || visible.length > 0) && <div className={`${styles.listHead} ${selectedKeys.length ? styles.listSelecting : ""}`}>
        {visible.length > 0 ? <button className={styles.listSelect} role="checkbox" aria-checked={selectedVisibleCount === visible.length ? true : selectedVisibleCount > 0 ? "mixed" : false} aria-label={selectedVisibleCount === visible.length ? "取消全选可见文件" : "全选可见文件"} disabled={busy} onClick={toggleVisibleSelection}>{selectedVisibleCount === visible.length ? <Check size={12}/> : selectedVisibleCount > 0 ? <Minus size={12}/> : null}</button> : <span className={styles.listSelectSpacer} aria-hidden="true"/>}
        <span className={styles.nameHeading}>名称</span><span>修改日期</span><span>大小</span>
      </div>}
      {visible.length || (viewMode === "list" && rootFolders.length) ? <div className={viewMode === "grid" ? styles.fileGrid : styles.fileList}>
        {viewMode === "list" && rootFolders.map(renderFolderRow)}{visible.map(renderFile)}
      </div> : <div className={styles.state}><ImagePlus size={22}/><strong>{folderId ? "文件夹里还没有资产" : search || filter !== "all" || sourceFilter !== "all" ? "没有匹配的资产" : "还没有资产"}</strong><span>生成结果会自动保存，也可以上传 JPG/JPEG、PNG、MP4 或 MP3。</span></div>}
    </section>}
    {selectedItems.length > 0 && <div className={styles.selectionBar} role="toolbar" aria-label="已选资产操作">
      <span>已选择 {selectedItems.length} 个</span>
      <button disabled={busy} onClick={() => void downloadItems(selectedItems)}><Download size={16}/>下载</button>
      <DropdownMenu><DropdownMenuTrigger asChild><button disabled={busy}><Folder size={16}/>移动</button></DropdownMenuTrigger><DropdownMenuContent side="top" align="center" className={styles.fileMenu}>
        <DropdownMenuItem onSelect={() => void moveItems(selectedItems, null)}>未分类</DropdownMenuItem>
        {organization.folders.map((folder) => <DropdownMenuItem key={folder.id} onSelect={() => void moveItems(selectedItems, folder.id)}>{folder.name}</DropdownMenuItem>)}
      </DropdownMenuContent></DropdownMenu>
      <button className={styles.deleteAction} disabled={busy} onClick={() => void deleteItems(selectedItems)}><Trash2 size={16}/>删除</button>
      <button className={styles.closeSelection} aria-label="取消选择" title="取消选择" disabled={busy} onClick={() => setSelectedKeys([])}><X size={17}/></button>
    </div>}
    <Dialog open={uploadOpen} onOpenChange={(open) => { if (!busy) setUploadOpen(open); }}><DialogPortal><DialogOverlay/><DialogPrimitive.Content className={styles.dialog} aria-describedby="asset-upload-description" onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }} onPointerDownOutside={(event) => { if (busy) event.preventDefault(); }}>
      <header><div><DialogTitle>上传资产</DialogTitle><DialogDescription id="asset-upload-description">JPG/JPEG、PNG、MP4、MP3；单个文件不超过 20 MB。</DialogDescription></div><button aria-label="关闭上传" disabled={busy} onClick={() => setUploadOpen(false)}><X size={19}/></button></header>
      <div className={styles.dialogBody}>
        <input ref={fileInput} type="file" accept=".jpg,.jpeg,.png,.mp4,.mp3,image/jpeg,image/png,video/mp4,audio/mpeg" multiple hidden onChange={(event) => { chooseFiles(event.target.files); event.target.value = ""; }}/>
        <button className={styles.pickFiles} onClick={() => fileInput.current?.click()} disabled={busy}><Plus size={22}/><span>添加文件</span></button>
        {rows.length > 0 && <ul className={styles.uploadRows}>{rows.map((row) => <li key={row.id}><span title={row.file.name}>{row.file.name}</span><small>{bytesLabel(row.file.size)}</small><em className={row.message ? styles.failed : ""}>{row.message ?? ({ waiting: "等待上传", uploading: "上传中", ready: "已完成", failed: "失败" }[row.state])}</em><button aria-label={`移除 ${row.file.name}`} disabled={busy} onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}><X size={14}/></button></li>)}</ul>}
        <div className={styles.fields}><label>保存位置<select value={uploadFolderId ?? ""} disabled={busy} onChange={(event) => setUploadFolderId(event.target.value || null)}><option value="">未分类</option>{organization.folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label></div>
        {actionError && <p className={styles.dialogError} role="alert">{actionError}</p>}
      </div>
      <footer><button onClick={() => setUploadOpen(false)} disabled={busy}>关闭</button><button className={styles.primaryButton} onClick={() => void uploadAll()} disabled={busy || !rows.some((row) => row.state !== "ready")}>{busy ? "上传中…" : "保存"}</button></footer>
    </DialogPrimitive.Content></DialogPortal></Dialog>
    <Dialog open={Boolean(preview)} onOpenChange={(open) => { if (!open) setPreview(null); }}><DialogPortal><DialogOverlay/><DialogPrimitive.Content className={styles.previewDialog} aria-describedby="asset-preview-description"><DialogTitle>{preview?.name ?? "文件预览"}</DialogTitle><DialogDescription id="asset-preview-description">已上传文件预览</DialogDescription>{preview?.media === "image" && <PrivateObjectImage src={preview.url} alt={preview.name}/>} {preview?.media === "video" && <video src={preview.url} controls autoPlay aria-label={preview.name}/>} {preview?.media === "audio" && <audio src={preview.url} controls autoPlay aria-label={preview.name}/>}<button onClick={() => setPreview(null)}>关闭</button></DialogPrimitive.Content></DialogPortal></Dialog>
  </section>;
}
