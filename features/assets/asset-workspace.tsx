"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, Check, ChevronDown, ChevronLeft, CircleAlert, Download, Folder, FolderPlus, Grid2X2, ImagePlus, List, LoaderCircle, MoreHorizontal, Pencil, Plus, RefreshCw, Search, Trash2, Upload, WandSparkles, X } from "lucide-react";
import { Dialog, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { Dialog as DialogPrimitive } from "radix-ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import { uploadReferenceFiles } from "@/features/references/http-reference-upload";
import type { ReferenceMaterial } from "@/features/references/http-reference-library";
import { uploadPrivateVideoMaterial, type PrivateVideoMaterial } from "@/features/creation/http-video-materials";
import { uploadPrivateAudioMaterial, type PrivateAudioMaterial } from "@/features/assets/http-audio-materials";
import { createAssetFolder, deleteAssetFolder, listAssetOrganization, renameAssetFolder, saveAssetOrganization, type AssetArrangement, type AssetFolder, type OrganizedAssetKind } from "@/features/assets/http-asset-organization";
import { deleteAsset, readAssetDownloadUrl } from "@/features/assets/http-asset-boundary";
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
      (!query || `${item.name} ${arrangement?.tags.join(" ") ?? ""}`.toLocaleLowerCase().includes(query)) &&
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
  const [uploadTags, setUploadTags] = useState("");
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

  async function deleteGeneratedItems(targets: readonly LibraryItem[]) {
    if (busy || !targets.length || targets.some((item) => item.kind !== "generated")) return;
    if (!window.confirm(`删除选中的 ${targets.length} 张图片？该操作不可恢复，已结算的积分不会退回。`)) return;
    setBusy(true); setActionError(null);
    try {
      for (const item of targets) {
        await deleteAsset(item.id, workspaceId);
        setSelectedKeys((current) => current.filter((key) => key !== `${item.kind}:${item.id}`));
        await onDeleteGenerated(item.id);
      }
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "删除失败，请重试。");
    } finally { setBusy(false); }
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

  function editTags(item: LibraryItem) {
    const arrangement = arrangements.get(`${item.kind}:${item.id}`);
    const value = window.prompt("标签，用逗号分隔", arrangement?.tags.join("，") ?? "");
    if (value != null) void updateOrganization(item.kind, item.id, arrangement?.folderId ?? null,
      value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean));
  }

  async function updateOrganization(kind: OrganizedAssetKind, id: string, nextFolder: string | null, tags: readonly string[]) {
    setBusy(true); setActionError(null);
    try {
      await saveAssetOrganization(kind, id, { folderId: nextFolder, tags }, workspaceId);
      setRevision((current) => current + 1);
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "整理资产失败，请重试。"); }
    finally { setBusy(false); }
  }

  async function addFolder() {
    const name = window.prompt("文件夹名称");
    if (name == null) return;
    setBusy(true); setActionError(null);
    try { await createAssetFolder(name, workspaceId); setRevision((current) => current + 1); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : "创建文件夹失败，请重试。"); }
    finally { setBusy(false); }
  }

  async function editFolder(action: "rename" | "delete") {
    if (!activeFolder) return;
    if (action === "delete" && !window.confirm(`删除文件夹“${activeFolder.name}”？其中资产会回到全部资产。`)) return;
    const name = action === "rename" ? window.prompt("文件夹名称", activeFolder.name) : null;
    if (action === "rename" && name == null) return;
    setBusy(true); setActionError(null);
    try {
      if (action === "rename") await renameAssetFolder(activeFolder.id, name!, workspaceId);
      else { await deleteAssetFolder(activeFolder.id, workspaceId); setFolderId(null); }
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
    const tags = uploadTags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean);
    if (tags.length > 8 || tags.some((tag) => tag.length > 24) || new Set(tags.map((tag) => tag.toLocaleLowerCase())).size !== tags.length) {
      setActionError("最多填写 8 个不重复标签，每个不超过 24 字。"); return;
    }
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
        try { if (uploadFolderId || tags.length) await saveAssetOrganization(kind, id, { folderId: uploadFolderId, tags }, workspaceId); }
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

  function renderFile(item: LibraryItem) {
    const key = `${item.kind}:${item.id}`;
    const selected = selectedKeys.includes(key);
    const aspectRatio = item.width && item.height ? `${item.width} / ${item.height}` : undefined;
    return <article className={`${styles.fileCard} ${selected ? styles.isSelected : ""}`} key={key}>
      <div className={styles.fileVisual}>
        {item.media === "image" ? <button className={styles.mediaFrame} style={{ aspectRatio }} onClick={() => openItem(item)} aria-label={`查看 ${item.name}`}>
          <PrivateObjectImage src={item.previewUrl!} alt={item.name}/>
        </button> : item.media === "video" ? <button className={styles.mediaFrame} onClick={() => openItem(item)} aria-label={`查看 ${item.name}`}>
          <video src={item.url} muted preload="metadata" aria-hidden="true"/>
        </button> : <button className={styles.audioFrame} onClick={() => openItem(item)} aria-label={`播放 ${item.name}`}><AudioLines size={30}/></button>}
        <DropdownMenu>
          <DropdownMenuTrigger asChild><button className={styles.moreButton} aria-label={`${item.name} 的更多操作`} title="更多操作" disabled={busy}><MoreHorizontal size={19}/></button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={styles.fileMenu}>
            <DropdownMenuItem onSelect={() => void downloadItems([item])}><Download size={16}/>下载</DropdownMenuItem>
            {item.kind !== "generated" && <DropdownMenuItem onSelect={() => applyItemToCreation(item)}><Plus size={16}/>用于创作</DropdownMenuItem>}
            <DropdownMenuSub><DropdownMenuSubTrigger><Folder size={16}/>移动到</DropdownMenuSubTrigger><DropdownMenuSubContent>
              <DropdownMenuItem onSelect={() => void moveItems([item], null)}>未分类</DropdownMenuItem>
              {organization.folders.map((folder) => <DropdownMenuItem key={folder.id} onSelect={() => void moveItems([item], folder.id)}>{folder.name}</DropdownMenuItem>)}
            </DropdownMenuSubContent></DropdownMenuSub>
            <DropdownMenuItem onSelect={() => editTags(item)}><Pencil size={16}/>编辑标签</DropdownMenuItem>
            {item.kind === "generated" && <DropdownMenuItem variant="destructive" onSelect={() => void deleteGeneratedItems([item])}><Trash2 size={16}/>删除</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
        <button className={styles.selectButton} aria-label={`${selected ? "取消选择" : "选择"} ${item.name}`} aria-pressed={selected} title={selected ? "取消选择" : "选择"} disabled={busy} onClick={() => toggleSelection(item)}><Check size={15}/></button>
      </div>
      <div className={styles.fileInfo}><button title={item.name} onClick={() => openItem(item)}>{item.name}</button><time dateTime={item.createdAt}>{dateLabel(item.createdAt)}</time><small>{item.size ? bytesLabel(item.size) : "—"}</small></div>
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
        <label className={styles.search}><Search size={16}/><input value={search} onChange={(event) => { setSearch(event.target.value); setSelectedKeys([]); }} placeholder="搜索资产" aria-label="搜索资产或标签" /></label>
        <DropdownMenu><DropdownMenuTrigger asChild><button className={styles.primaryButton}>新建<ChevronDown size={15}/></button></DropdownMenuTrigger><DropdownMenuContent align="end" className={styles.fileMenu}>
          <DropdownMenuItem onSelect={() => { setRows([]); setUploadTags(""); setActionError(null); setUploadFolderId(folderId); setUploadOpen(true); }}><Upload size={16}/>上传文件</DropdownMenuItem>
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
    {!loading && !organizationLoading && !folderId && <section className={styles.folderSection} aria-label="文件夹"><h2>文件夹</h2>
      {organization.folders.length ? <div className={styles.folders}>{organization.folders.map((folder) => <button className={styles.folder} key={folder.id} onClick={() => { setFolderId(folder.id); setSelectedKeys([]); }}>
        <span className={styles.folderArt}><Folder size={38} strokeWidth={1.8}/></span><strong>{folder.name}</strong><small>{items.filter((item) => arrangements.get(`${item.kind}:${item.id}`)?.folderId === folder.id).length} 个项目</small>
      </button>)}</div> : <p className={styles.folderEmpty}>还没有文件夹</p>}
    </section>}
    {!loading && !organizationLoading && <section className={styles.filesSection} aria-label="项目"><h2>{activeFolder ? activeFolder.name : "项目"}</h2>
      {viewMode === "list" && visible.length > 0 && <div className={styles.listHead}><span>名称</span><span>修改日期</span><span>大小</span></div>}
      {visible.length ? <div className={viewMode === "grid" ? styles.fileGrid : styles.fileList}>{visible.map(renderFile)}</div> : <div className={styles.state}><ImagePlus size={22}/><strong>{folderId ? "文件夹里还没有资产" : search || filter !== "all" || sourceFilter !== "all" ? "没有匹配的资产" : "还没有资产"}</strong><span>生成结果会自动保存，也可以上传 JPG/JPEG、PNG、MP4 或 MP3。</span></div>}
    </section>}
    {selectedItems.length > 0 && <div className={styles.selectionBar} role="toolbar" aria-label="已选资产操作">
      <span>已选择 {selectedItems.length} 个</span>
      {selectedItems.length === 1 && selectedItems[0].kind !== "generated" && <button className={styles.selectionPrimary} disabled={busy} onClick={() => applyItemToCreation(selectedItems[0])}><Plus size={16}/>用于创作</button>}
      <DropdownMenu><DropdownMenuTrigger asChild><button disabled={busy}><Folder size={16}/>移动</button></DropdownMenuTrigger><DropdownMenuContent side="top" align="center" className={styles.fileMenu}>
        <DropdownMenuItem onSelect={() => void moveItems(selectedItems, null)}>未分类</DropdownMenuItem>
        {organization.folders.map((folder) => <DropdownMenuItem key={folder.id} onSelect={() => void moveItems(selectedItems, folder.id)}>{folder.name}</DropdownMenuItem>)}
      </DropdownMenuContent></DropdownMenu>
      <button disabled={busy} onClick={() => void downloadItems(selectedItems)}><Download size={16}/>下载</button>
      {selectedItems.every((item) => item.kind === "generated") && <button className={styles.deleteAction} disabled={busy} onClick={() => void deleteGeneratedItems(selectedItems)}><Trash2 size={16}/>删除</button>}
      <DropdownMenu><DropdownMenuTrigger asChild><button className={styles.moreSelection} aria-label="更多已选操作" title="更多" disabled={busy}><MoreHorizontal size={17}/></button></DropdownMenuTrigger><DropdownMenuContent side="top" align="end" className={styles.fileMenu}>
        {selectedItems.length === 1 && <DropdownMenuItem onSelect={() => editTags(selectedItems[0])}><Pencil size={16}/>编辑标签</DropdownMenuItem>}
        <DropdownMenuItem onSelect={() => setSelectedKeys([])}><X size={16}/>取消选择</DropdownMenuItem>
      </DropdownMenuContent></DropdownMenu>
      <button className={styles.closeSelection} aria-label="取消选择" title="取消选择" disabled={busy} onClick={() => setSelectedKeys([])}><X size={17}/></button>
    </div>}
    <Dialog open={uploadOpen} onOpenChange={(open) => { if (!busy) setUploadOpen(open); }}><DialogPortal><DialogOverlay/><DialogPrimitive.Content className={styles.dialog} aria-describedby="asset-upload-description" onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }} onPointerDownOutside={(event) => { if (busy) event.preventDefault(); }}>
      <header><div><DialogTitle>上传资产</DialogTitle><DialogDescription id="asset-upload-description">JPG/JPEG、PNG、MP4、MP3；单个文件不超过 20 MB。</DialogDescription></div><button aria-label="关闭上传" disabled={busy} onClick={() => setUploadOpen(false)}><X size={19}/></button></header>
      <div className={styles.dialogBody}>
        <input ref={fileInput} type="file" accept=".jpg,.jpeg,.png,.mp4,.mp3,image/jpeg,image/png,video/mp4,audio/mpeg" multiple hidden onChange={(event) => { chooseFiles(event.target.files); event.target.value = ""; }}/>
        <button className={styles.pickFiles} onClick={() => fileInput.current?.click()} disabled={busy}><Plus size={22}/><span>添加文件</span></button>
        {rows.length > 0 && <ul className={styles.uploadRows}>{rows.map((row) => <li key={row.id}><span title={row.file.name}>{row.file.name}</span><small>{bytesLabel(row.file.size)}</small><em className={row.message ? styles.failed : ""}>{row.message ?? ({ waiting: "等待上传", uploading: "上传中", ready: "已完成", failed: "失败" }[row.state])}</em><button aria-label={`移除 ${row.file.name}`} disabled={busy} onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}><X size={14}/></button></li>)}</ul>}
        <div className={styles.fields}><label>保存位置<select value={uploadFolderId ?? ""} disabled={busy} onChange={(event) => setUploadFolderId(event.target.value || null)}><option value="">未分类</option>{organization.folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label><label>标签（可选）<input value={uploadTags} disabled={busy} onChange={(event) => setUploadTags(event.target.value)} placeholder="多个标签用逗号分隔" /></label></div>
        {actionError && <p className={styles.dialogError} role="alert">{actionError}</p>}
      </div>
      <footer><button onClick={() => setUploadOpen(false)} disabled={busy}>关闭</button><button className={styles.primaryButton} onClick={() => void uploadAll()} disabled={busy || !rows.some((row) => row.state !== "ready")}>{busy ? "上传中…" : "保存"}</button></footer>
    </DialogPrimitive.Content></DialogPortal></Dialog>
    <Dialog open={Boolean(preview)} onOpenChange={(open) => { if (!open) setPreview(null); }}><DialogPortal><DialogOverlay/><DialogPrimitive.Content className={styles.previewDialog} aria-describedby="asset-preview-description"><DialogTitle>{preview?.name ?? "文件预览"}</DialogTitle><DialogDescription id="asset-preview-description">已上传文件预览</DialogDescription>{preview?.media === "image" && <PrivateObjectImage src={preview.url} alt={preview.name}/>} {preview?.media === "video" && <video src={preview.url} controls autoPlay aria-label={preview.name}/>} {preview?.media === "audio" && <audio src={preview.url} controls autoPlay aria-label={preview.name}/>}<button onClick={() => setPreview(null)}>关闭</button></DialogPrimitive.Content></DialogPortal></Dialog>
  </section>;
}
