"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, ChevronLeft, CircleAlert, Folder, FolderPlus, ImagePlus, Images, LoaderCircle, Pencil, Plus, RefreshCw, Search, Upload, X } from "lucide-react";
import { Dialog, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { Dialog as DialogPrimitive } from "radix-ui";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import { uploadReferenceFiles } from "@/features/references/http-reference-upload";
import type { ReferenceMaterial } from "@/features/references/http-reference-library";
import { uploadPrivateVideoMaterial, type PrivateVideoMaterial } from "@/features/creation/http-video-materials";
import { uploadPrivateAudioMaterial, type PrivateAudioMaterial } from "@/features/assets/http-audio-materials";
import { createAssetFolder, deleteAssetFolder, listAssetOrganization, renameAssetFolder, saveAssetOrganization, type AssetArrangement, type AssetFolder, type OrganizedAssetKind } from "@/features/assets/http-asset-organization";
import { PRIVATE_AUDIO_UPLOAD_MAX_BYTES, PRIVATE_IMAGE_UPLOAD_MAX_BYTES, PRIVATE_VIDEO_UPLOAD_MAX_BYTES } from "@/shared/contracts/upload-limits.mjs";
import styles from "./asset-workspace.module.css";

type Media = "image" | "video" | "audio";
type Filter = "all" | Media;
export type GeneratedAssetCard = Readonly<{
  id: string; detailKey: string; createdAt: string; previewUrl: string; name: string;
  prompt: string; width?: number; height?: number;
}>;
type LibraryItem = Readonly<{
  id: string; kind: OrganizedAssetKind; media: Media; name: string; createdAt: string;
  previewUrl?: string; url?: string; size?: number; detailKey?: string;
}>;
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
  onOpenGenerated: (detailKey: string) => void;
  onUseReference: (material: ReferenceMaterial) => void;
  onUseVideo: (material: PrivateVideoMaterial) => void;
  onUseAudio: (material: PrivateAudioMaterial) => void;
}>;

const mediaFilters: readonly Readonly<{ id: Filter; label: string }>[] = [
  { id: "all", label: "全部" }, { id: "image", label: "图片" },
  { id: "video", label: "视频" }, { id: "audio", label: "音频" },
];

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
  onRetry, onRefresh, onOpenGenerated, onUseReference, onUseVideo, onUseAudio }: Props) {
  const [section, setSection] = useState<"history" | "library">("history");
  const [filter, setFilter] = useState<Filter>("all");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [organization, setOrganization] = useState<{ folders: readonly AssetFolder[]; arrangements: readonly AssetArrangement[] }>({ folders: [], arrangements: [] });
  const [organizationLoading, setOrganizationLoading] = useState(true);
  const [organizationError, setOrganizationError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [preview, setPreview] = useState<{ name: string; url: string } | null>(null);
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
      name: item.name, createdAt: item.createdAt, previewUrl: item.previewUrl, detailKey: item.detailKey })),
    ...references.map((item) => ({ id: item.id, kind: "reference" as const, media: "image" as const,
      name: item.name, createdAt: item.uploadedAt, previewUrl: item.previewUrl, size: item.byteSize })),
    ...videos.map((item) => ({ id: item.id, kind: "video" as const, media: "video" as const,
      name: item.name, createdAt: item.uploadedAt, url: item.url, size: item.size })),
    ...audios.map((item) => ({ id: item.id, kind: "audio" as const, media: "audio" as const,
      name: item.name, createdAt: item.uploadedAt, url: item.url, size: item.size })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [generated, references, videos, audios]);
  const arrangements = useMemo(() => new Map(organization.arrangements.map((entry) => [`${entry.kind}:${entry.id}`, entry])), [organization]);
  const baseItems = items.filter((item) => {
    const arrangement = arrangements.get(`${item.kind}:${item.id}`);
    return (!folderId || arrangement?.folderId === folderId) &&
      (!search.trim() || `${item.name} ${arrangement?.tags.join(" ") ?? ""}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  });
  const visible = baseItems.filter((item) => filter === "all" || item.media === filter);
  const history = generated.filter(() => filter === "all" || filter === "image");
  const grouped = new Map<string, GeneratedAssetCard[]>();
  for (const item of history) {
    const key = dateLabel(item.createdAt);
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }
  const activeFolder = organization.folders.find((item) => item.id === folderId);
  const loading = section === "history" ? historyLoading : libraryLoading;
  const error = section === "history" ? historyError : libraryError;

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

  return <section className={styles.workspace} aria-label="资产">
    <header className={styles.header}>
      <div><h1>资产</h1><p>{section === "history" ? "生成结果会自动保存在个人资产库。" : "整理创作结果和上传素材。"}</p></div>
      {section === "library" && <button className={styles.primaryButton} onClick={() => { setRows([]); setUploadTags(""); setActionError(null); setUploadFolderId(folderId); setUploadOpen(true); }}><Upload size={16}/>上传资产</button>}
    </header>
    <div className={styles.tabs} role="tablist" aria-label="资产分类">
      <button role="tab" aria-selected={section === "history"} className={section === "history" ? styles.activeTab : ""} onClick={() => { setSection("history"); setFilter("all"); }}>生成记录</button>
      <button role="tab" aria-selected={section === "library"} className={section === "library" ? styles.activeTab : ""} onClick={() => { setSection("library"); setFilter("all"); }}>个人资产库</button>
    </div>
    {section === "library" && <div className={styles.tools}>
      {activeFolder ? <div className={styles.folderActions}><button onClick={() => setFolderId(null)}><ChevronLeft size={15}/>个人资产库</button><span>/ {activeFolder.name}</span><button disabled={busy} title="重命名文件夹" aria-label="重命名文件夹" onClick={() => void editFolder("rename")}><Pencil size={15}/></button><button disabled={busy} onClick={() => void editFolder("delete")}>删除文件夹</button></div> :
        <button onClick={() => void addFolder()} disabled={busy} className={styles.plainButton}><FolderPlus size={17}/>新建文件夹</button>}
      <label className={styles.search}><Search size={16}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索资产或标签" aria-label="搜索资产或标签" /></label>
    </div>}
    {section === "library" && !folderId && organization.folders.length > 0 && <div className={styles.folders}>
      {organization.folders.map((folder) => <button className={styles.folder} key={folder.id} onClick={() => setFolderId(folder.id)}><Folder size={25}/><strong>{folder.name}</strong><span>{items.filter((item) => arrangements.get(`${item.kind}:${item.id}`)?.folderId === folder.id).length} 项</span></button>)}
    </div>}
    <div className={styles.filters} role="group" aria-label="媒体类型">
      {mediaFilters.map((choice) => {
        const source = section === "history" ? generated.map(() => "image" as Media) : baseItems.map((item) => item.media);
        const count = choice.id === "all" ? source.length : source.filter((media) => media === choice.id).length;
        return <button key={choice.id} className={filter === choice.id ? styles.selectedFilter : ""} onClick={() => setFilter(choice.id)}>{choice.label}<span>{count}</span></button>;
      })}
    </div>
    {(error || organizationError || actionError) && <div className={styles.error} role="alert"><CircleAlert size={16}/>{actionError ?? error ?? organizationError}<button onClick={() => { setActionError(null); onRetry(); setRevision((current) => current + 1); }}><RefreshCw size={14}/>重试</button></div>}
    {(loading || (section === "library" && organizationLoading)) && <div className={styles.state} role="status"><LoaderCircle className={styles.spinner} size={18}/>正在读取资产</div>}
    {!loading && section === "history" && (history.length ? Array.from(grouped, ([date, records]) => <section key={date} className={styles.dateGroup}><h2>{date}</h2><div className={styles.grid}>{records.map((item) => <button key={item.detailKey} className={styles.mediaCard} onClick={() => onOpenGenerated(item.detailKey)} aria-label={`查看 ${item.name}`}><span className={styles.mediaFrame}><PrivateObjectImage src={item.previewUrl} alt={item.name}/></span><span className={styles.cardCaption}>{item.name}</span></button>)}</div></section>) : <div className={styles.state}><Images size={22}/><strong>{filter === "all" || filter === "image" ? "还没有生成记录" : `还没有生成${mediaFilters.find((item) => item.id === filter)?.label}记录`}</strong><span>完成生成后，结果会显示在这里。</span></div>)}
    {!loading && !organizationLoading && section === "library" && (visible.length ? <div className={styles.grid}>{visible.map((item) => {
      const arrangement = arrangements.get(`${item.kind}:${item.id}`);
      const open = () => { if (item.detailKey) onOpenGenerated(item.detailKey); };
      return <article className={styles.mediaCard} key={`${item.kind}:${item.id}`}>
        {item.media === "image" ? <button className={styles.mediaFrame} onClick={() => {
          if (item.detailKey) { open(); return; }
          const material = references.find((value) => value.id === item.id);
          if (material) setPreview({ name: material.name, url: material.url });
        }} aria-label={`查看 ${item.name}`}><PrivateObjectImage src={item.previewUrl!} alt={item.name}/></button> :
          item.media === "video" ? <div className={styles.mediaFrame}><video src={item.url} controls preload="none" aria-label={item.name}/></div> :
          <div className={styles.audioFrame}><AudioLines size={34}/><audio src={item.url} controls preload="none" aria-label={item.name}/></div>}
        <div className={styles.cardCopy}><strong title={item.name}>{item.name}</strong><small>{dateLabel(item.createdAt)} {bytesLabel(item.size)}</small>
          <div className={styles.cardActions}>
            {item.kind !== "generated" && <button onClick={() => { if (item.kind === "reference") { const material = references.find((value) => value.id === item.id); if (material) onUseReference(material); } else if (item.kind === "video") { const material = videos.find((value) => value.id === item.id); if (material) onUseVideo(material); } else { const material = audios.find((value) => value.id === item.id); if (material) onUseAudio(material); } }}>用于创作</button>}
            <label>文件夹<select aria-label={`整理 ${item.name} 到文件夹`} disabled={busy} value={arrangement?.folderId ?? ""} onChange={(event) => void updateOrganization(item.kind, item.id, event.target.value || null, arrangement?.tags ?? [])}><option value="">未分类</option>{organization.folders.map((folder) => <option value={folder.id} key={folder.id}>{folder.name}</option>)}</select></label>
            <button onClick={() => { const value = window.prompt("标签，用逗号分隔", arrangement?.tags.join("，") ?? ""); if (value != null) void updateOrganization(item.kind, item.id, arrangement?.folderId ?? null, value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean)); }}>标签{arrangement?.tags.length ? ` ${arrangement.tags.length}` : ""}</button>
          </div>
        </div>
      </article>;
    })}</div> : <div className={styles.state}><ImagePlus size={22}/><strong>{folderId ? "文件夹里还没有资产" : search || filter !== "all" ? "没有匹配的资产" : "个人资产库还是空的"}</strong><span>生成结果会自动入库，也可以上传 JPG/JPEG、PNG、MP4 或 MP3。</span></div>)}
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
    <Dialog open={Boolean(preview)} onOpenChange={(open) => { if (!open) setPreview(null); }}><DialogPortal><DialogOverlay/><DialogPrimitive.Content className={styles.previewDialog} aria-describedby="asset-preview-description"><DialogTitle>{preview?.name ?? "图片预览"}</DialogTitle><DialogDescription id="asset-preview-description">上传图片原图预览</DialogDescription>{preview && <PrivateObjectImage src={preview.url} alt={preview.name}/>}<button onClick={() => setPreview(null)}>关闭</button></DialogPrimitive.Content></DialogPortal></Dialog>
  </section>;
}
