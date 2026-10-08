"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, AudioLines, FolderPlus, Link, Plus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";
import { downloadCanvasImageLink } from "./canvas-asset-addition.mjs";
import { archiveCanvasAssetUpload, CANVAS_ASSET_LIBRARY_UPDATED_EVENT, uploadCanvasAssetFile, type UploadedCanvasAsset } from "./canvas-asset-upload";
import styles from "./canvas-asset-panel.module.css";

type UploadRow = Readonly<{
  clientId: string;
  file: File;
  folderId: string | null;
  previewUrl?: string;
  asset?: UploadedCanvasAsset;
  state: "uploading" | "failed" | "archive-failed" | "ready";
  message?: string;
}>;

export function CanvasAssetAddCard({ folderId, readyAssetKeys, onCreateFolder, folderBusy }: Readonly<{
  folderId: string | null;
  readyAssetKeys: ReadonlySet<string>;
  onCreateFolder: () => void;
  folderBusy: boolean;
}>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [rows, setRows] = useState<readonly UploadRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const busyRef = useRef(false);
  const rowMapRef = useRef(new Map<string, UploadRow>());
  const downloadRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const chosenFolderRef = useRef<string | null>(null);
  const linkRowRef = useRef<Readonly<{ value: string; clientId: string }> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    const rowMap = rowMapRef.current;
    return () => {
      mountedRef.current = false;
      downloadRef.current?.abort();
      for (const row of rowMap.values()) if (row.previewUrl) URL.revokeObjectURL(row.previewUrl);
      // Private uploads already started are allowed to finish and enter the library.
    };
  }, []);

  useEffect(() => {
    if (!linkOpen) return;
    const frame = requestAnimationFrame(() => linkInputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [linkOpen]);

  useEffect(() => {
    const completed = [...rowMapRef.current.values()].filter((row) => row.state === "ready" && row.asset && readyAssetKeys.has(`${row.asset.kind}:${row.asset.id}`));
    if (!completed.length) return;
    for (const row of completed) {
      if (row.previewUrl) URL.revokeObjectURL(row.previewUrl);
      rowMapRef.current.delete(row.clientId);
    }
    setRows([...rowMapRef.current.values()]);
  }, [readyAssetKeys]);

  function storeRow(row: UploadRow) {
    rowMapRef.current.set(row.clientId, row);
    if (mountedRef.current) setRows([...rowMapRef.current.values()]);
  }

  function makeRow(file: File, destinationFolderId: string | null) {
    const row: UploadRow = {
      clientId: crypto.randomUUID(), file, folderId: destinationFolderId, state: "uploading",
      previewUrl: file.type.startsWith("image/") || file.type.startsWith("video/") ? URL.createObjectURL(file) : undefined,
    };
    storeRow(row);
    return row;
  }

  async function runRow(clientId: string): Promise<boolean> {
    let row = rowMapRef.current.get(clientId);
    if (!row) return false;
    row = { ...row, state: "uploading", message: undefined };
    storeRow(row);
    try {
      const asset = row.asset ?? await uploadCanvasAssetFile(row.file, row.clientId);
      row = { ...row, asset };
      storeRow(row);
      await archiveCanvasAssetUpload(asset, row.folderId);
      storeRow({ ...row, state: "ready", message: undefined });
      return true;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "上传失败，请重试。";
      storeRow({ ...row, state: row.asset ? "archive-failed" : "failed", message: row.asset ? `已上传至全部资产，但放入文件夹失败：${message}` : message });
      return false;
    } finally {
      if (row.asset) window.dispatchEvent(new Event(CANVAS_ASSET_LIBRARY_UPDATED_EVENT));
    }
  }

  async function uploadFiles(files: readonly File[], destinationFolderId: string | null) {
    if (busyRef.current || !files.length) return;
    busyRef.current = true;
    setBusy(true);
    const targets = files.map((file) => makeRow(file, destinationFolderId));
    try { for (const row of targets) await runRow(row.clientId); }
    finally { busyRef.current = false; if (mountedRef.current) setBusy(false); }
  }

  async function retryRow(clientId: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const added = await runRow(clientId);
      if (added && mountedRef.current && linkRowRef.current?.clientId === clientId) {
        setLinkDraft(""); setLinkError(null); linkRowRef.current = null; setLinkOpen(false); setMenuOpen(false);
      }
    }
    finally { busyRef.current = false; if (mountedRef.current) setBusy(false); }
  }

  async function submitLink() {
    if (busyRef.current || !linkDraft.trim()) return;
    busyRef.current = true;
    setBusy(true); setLinkBusy(true); setLinkError(null);
    const value = linkDraft.trim();
    const controller = new AbortController();
    downloadRef.current = controller;
    try {
      let clientId = linkRowRef.current?.value === value ? linkRowRef.current.clientId : undefined;
      if (!clientId || !rowMapRef.current.has(clientId)) {
        const file = await downloadCanvasImageLink(value, { signal: controller.signal, fetchImplementation: goodGoodApiFetch });
        if (!mountedRef.current || controller.signal.aborted) return;
        clientId = makeRow(file, folderId).clientId;
        linkRowRef.current = { value, clientId };
      }
      // From here, closing the panel may stop the download controller, but not the upload.
      const added = await runRow(clientId);
      if (!mountedRef.current) return;
      if (added) { setLinkDraft(""); linkRowRef.current = null; setLinkOpen(false); setMenuOpen(false); }
      else setLinkError(rowMapRef.current.get(clientId)?.message ?? "添加失败，请重试。");
    } catch (cause) {
      if (mountedRef.current && !controller.signal.aborted) setLinkError(cause instanceof Error ? cause.message : "图片链接无法读取，请重试或上传文件。");
    } finally {
      if (downloadRef.current === controller) downloadRef.current = null;
      busyRef.current = false;
      if (mountedRef.current) { setBusy(false); setLinkBusy(false); }
    }
  }

  function dismissRow(row: UploadRow) {
    if (row.state === "uploading") return;
    if (row.previewUrl) URL.revokeObjectURL(row.previewUrl);
    rowMapRef.current.delete(row.clientId);
    setRows([...rowMapRef.current.values()]);
  }

  function changeLinkOpen(open: boolean) {
    if (!open) downloadRef.current?.abort();
    setLinkOpen(open);
  }

  return <>
    <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.mp4,.mov,.mp3,.wav,image/jpeg,image/png,video/mp4,video/quicktime,audio/mpeg,audio/wav" multiple hidden
      onChange={(event) => {
        const files = Array.from(event.currentTarget.files ?? []);
        event.currentTarget.value = "";
        void uploadFiles(files, chosenFolderRef.current);
      }} />
    <DropdownMenu open={menuOpen} onOpenChange={(open) => { setMenuOpen(open); if (!open) changeLinkOpen(false); }}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" className={styles.addCard} aria-label="添加资产" disabled={busy}><Plus size={24} strokeWidth={1.5} aria-hidden="true" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" sideOffset={8} collisionPadding={12} className={styles.addMenu}>
        <DropdownMenuItem disabled={folderBusy} className={styles.addMenuItem} onSelect={onCreateFolder}><FolderPlus size={16} aria-hidden="true" />创建文件夹</DropdownMenuItem>
        <DropdownMenuItem disabled={busy} className={styles.addMenuItem} onSelect={() => { chosenFolderRef.current = folderId; inputRef.current?.click(); }}><Upload size={16} aria-hidden="true" />上传文件</DropdownMenuItem>
        <DropdownMenuSub open={linkOpen} onOpenChange={changeLinkOpen}>
          <DropdownMenuSubTrigger disabled={busy && !linkBusy} className={styles.addMenuItem}><Link size={16} aria-hidden="true" />链接</DropdownMenuSubTrigger>
          <DropdownMenuPortal>
          <DropdownMenuSubContent sideOffset={8} collisionPadding={12} className={styles.linkMenu}>
            <form className={styles.linkForm} aria-label="添加图片链接" onSubmit={(event) => { event.preventDefault(); void submitLink(); }}
              onKeyDown={(event) => { if (event.key !== "Escape") event.stopPropagation(); }}>
              <div className={styles.linkField}>
                <Input ref={linkInputRef} type="url" required placeholder="粘贴图片链接" value={linkDraft} disabled={linkBusy}
                  aria-label="图片直链" aria-invalid={Boolean(linkError)} aria-describedby={linkError ? "canvas-image-link-error" : undefined}
                  onChange={(event) => { setLinkDraft(event.target.value); setLinkError(null); }} />
                <Button type="submit" variant="ghost" size="icon-sm" disabled={busy || !linkDraft.trim()} aria-label={linkBusy ? "正在添加图片" : "添加图片链接"}><ArrowUp size={16} aria-hidden="true" /></Button>
              </div>
              {linkBusy && <p className={styles.linkStatus} role="status">正在添加图片…</p>}
              {linkError && <p id="canvas-image-link-error" className={styles.linkError} role="alert">{linkError}</p>}
            </form>
          </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
    {rows.map((row) => <div key={row.clientId} className={styles.pendingCard} aria-label={`添加 ${row.file.name}`}>
      <div className={styles.pendingVisual} data-uploading={row.state === "uploading" || undefined}>
        {row.file.type.startsWith("image/") && row.previewUrl ? <PrivateObjectImage src={row.previewUrl} alt="" />
          : row.file.type.startsWith("video/") && row.previewUrl ? <video src={row.previewUrl} muted playsInline preload="metadata" aria-hidden="true" />
          : <AudioLines size={28} strokeWidth={1.6} aria-hidden="true" />}
      </div>
      {row.state === "uploading" ? <span className={styles.uploadStatus} role="status">{row.asset ? "正在放入文件夹…" : "正在上传…"}</span>
        : row.state === "ready" ? <span className={styles.uploadStatus} role="status">已添加，正在刷新…</span>
        : <div className={styles.uploadFailure}>
          <p role="alert">{row.message}</p>
          <div className={styles.uploadActions}>
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void retryRow(row.clientId)}>{row.asset ? "重试归档" : "重试"}</Button>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => dismissRow(row)} aria-label={`移除 ${row.file.name} 的失败提示`}><X size={13} aria-hidden="true" /></Button>
          </div>
        </div>}
    </div>)}
  </>;
}
