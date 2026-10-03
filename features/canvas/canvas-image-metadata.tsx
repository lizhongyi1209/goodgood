"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Camera, ClipboardPaste, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import { IMAGE_METADATA_FIELDS, copyImageMetadataJson, parseImageMetadataJson, readImageFileC2pa, readImageFileMetadata, writeImageFileMetadata, type ImageFileMetadataFields } from "@/features/assets/image-file-metadata.mjs";
import { PRIVATE_IMAGE_UPLOAD_MAX_BYTES } from "@/shared/contracts/upload-limits.mjs";
import { privateImageUrls } from "@/shared/private-image-urls.mjs";
import { readCanvasCropImageBlob, type CanvasCropCommit, type CanvasCropImage, type CanvasCropRequest } from "./canvas-image-crop-image";
import { CanvasImageMetadataContext } from "./canvas-image-metadata-context";
import styles from "./canvas-image-metadata.module.css";

type MetadataRequest = CanvasCropRequest & Readonly<{ trigger: HTMLButtonElement }>;
type Original = Readonly<{ bytes: Uint8Array<ArrayBuffer>; blob: Blob; metadata: ReturnType<typeof readImageFileMetadata>; width: number; height: number }>;

function editableMetadataFields(fields: ImageFileMetadataFields): ImageFileMetadataFields {
  return Object.fromEntries(IMAGE_METADATA_FIELDS
    .filter((field) => field.group !== "位置信息" && fields[field.key] !== undefined)
    .map((field) => [field.key, fields[field.key]]));
}

export function CanvasImageMetadataProvider({ children, enabled, ownerKey, pageKey, onCommit }: Readonly<{
  children: ReactNode; enabled: boolean; ownerKey: string; pageKey: string; onCommit: (commit: CanvasCropCommit) => boolean;
}>) {
  const [request, setRequest] = useState<Readonly<{ value: MetadataRequest; ownerKey: string }> | null>(null);
  const visible = enabled && request?.ownerKey === ownerKey && request.value.pageId === pageKey ? request.value : null;
  useEffect(() => { setRequest(null); }, [enabled, ownerKey, pageKey]);
  return <CanvasImageMetadataContext.Provider value={{ enabled, openMetadata: (image, trigger) => {
    if (!enabled) return;
    setRequest({ ownerKey, value: { ...image, trigger, pageId: pageKey, sessionId: crypto.randomUUID() } });
  } }}>
    {children}
    {visible && <CanvasImageMetadataDialog key={visible.sessionId} request={visible} onClose={() => setRequest(null)} onCommit={onCommit} />}
  </CanvasImageMetadataContext.Provider>;
}

async function decodeDimensions(blob: Blob, signal: AbortSignal) {
  let image: ImageBitmap;
  try { image = await createImageBitmap(blob); }
  catch (cause) { signal.throwIfAborted(); throw new Error("原图无法解码，请重新选择完整的 JPEG 或 PNG 图片。", { cause }); }
  try { signal.throwIfAborted(); return { width: image.width, height: image.height }; }
  finally { image.close(); }
}

async function metadataFile(original: Original, fields: ImageFileMetadataFields, name: string, signal: AbortSignal) {
  signal.throwIfAborted();
  // Preserve the target's existing coordinates; pasted parameters cannot add them.
  const location = original.metadata.fields.latitude && original.metadata.fields.longitude
    ? { latitude: original.metadata.fields.latitude, longitude: original.metadata.fields.longitude } : {};
  const result = writeImageFileMetadata(original.bytes, { ...editableMetadataFields(fields), ...location }, { orientation: original.metadata.orientation });
  signal.throwIfAborted();
  if (result.bytes.length > PRIVATE_IMAGE_UPLOAD_MAX_BYTES) throw new Error("处理后的副本超过 20 MB，无法保存。请使用较小的原图。");
  const basename = name.replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "_").slice(0, 100).trim() || "GoodGood图片";
  const file = new File([result.bytes], `${basename}_元数据.${result.extension}`, { type: result.mimeType });
  return { file, width: original.width, height: original.height };
}

function metadataDialogError(cause: unknown, fallback: string) {
  const message = cause instanceof Error ? cause.message : fallback;
  return /c2pa|jumbf|内容凭证/i.test(message) ? "这张图片的数据无法完整处理，请使用完整原图重试。" : message;
}

function CanvasImageMetadataDialog({ request, onClose, onCommit }: Readonly<{
  request: MetadataRequest; onClose: () => void; onCommit: (commit: CanvasCropCommit) => boolean;
}>) {
  const [original, setOriginal] = useState<Original | null>(null);
  const [fields, setFields] = useState<ImageFileMetadataFields>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"save" | "copy" | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const lifecycle = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const previewUrl = privateImageUrls(request.key.startsWith("asset:") ? "asset" : "reference", request.imageId).previewUrl;
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    lifecycle.current = controller;
    setLoading(true); setError(null); setOriginal(null); setNotice("");
    void (async () => {
      const blob = await readCanvasCropImageBlob(request, controller.signal);
      if (blob.size > PRIVATE_IMAGE_UPLOAD_MAX_BYTES) throw new Error("请选择 20 MB 以内的 JPEG 或 PNG 原图。");
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let metadata: ReturnType<typeof readImageFileMetadata>;
      let metadataError: string | null = null;
      try { metadata = readImageFileMetadata(bytes); }
      catch {
        // A malformed EXIF profile need not make a decodable image impossible
        // to clean. Container corruption still fails closed here.
        const stripped = writeImageFileMetadata(bytes, {}, { clear: true });
        metadata = { ...readImageFileMetadata(stripped.bytes), hasMetadata: true, c2pa: readImageFileC2pa(bytes) };
        metadataError = "原有参数无法完整读取，可以手动填写参数。";
      }
      const dimensions = await decodeDimensions(blob, controller.signal);
      controller.signal.throwIfAborted();
      const editableFields = editableMetadataFields(metadata.fields);
      setOriginal({ bytes, blob, metadata, ...dimensions }); setFields(editableFields); setLoading(false);
      setError(metadataError);
      setNotice(Object.keys(editableFields).length ? "已填入这张图片现有的参数。" : "这张图片没有可填写的参数，可手动填写或粘贴。");
    })().catch((cause) => { if (!controller.signal.aborted) { setLoading(false); setError(metadataDialogError(cause, "原图读取失败，请重试。")); } });
    return () => { controller.abort(); };
  }, [request, attempt]);

  const commit = async () => {
    if (!original || busyRef.current || !lifecycle.current) return;
    const signal = lifecycle.current.signal;
    busyRef.current = true; setBusy("save"); setError(null);
    try {
      const result = await metadataFile(original, fields, request.name, signal);
      if (onCommit({ request, ...result, createCopy: true })) onClose();
      else throw new Error("当前图片或页面已变化，请关闭弹框后重新打开。");
    } catch (cause) { if (!signal.aborted) setError(metadataDialogError(cause, "添加失败，请重试。")); }
    finally { busyRef.current = false; if (!signal.aborted) setBusy(null); }
  };

  const disabled = loading || !original || busy !== null;
  const copy = async () => {
    if (busyRef.current) return;
    const signal = lifecycle.current?.signal;
    busyRef.current = true; setBusy("copy"); setError(null);
    try {
      const text = copyImageMetadataJson(fields);
      if (!navigator.clipboard?.writeText) throw new Error("当前浏览器无法复制；可在「粘贴参数」中手动复制 JSON。");
      await navigator.clipboard.writeText(text);
      if (!signal?.aborted) setNotice("参数已复制，可在另一张图片的弹框中粘贴。");
    } catch (cause) {
      if (!signal?.aborted) {
        setError(cause instanceof Error ? cause.message : "复制失败，请手动复制 JSON。");
        try { setPasteText(copyImageMetadataJson(fields)); setPasteOpen(true); } catch { /* Keep the field validation error visible. */ }
      }
    } finally { busyRef.current = false; if (!signal?.aborted) setBusy(null); }
  };

  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className={`${styles.dialog} nodrag nopan nowheel nokey`} overlayClassName={styles.overlay} showCloseButton={false}
      onCloseAutoFocus={(event) => { event.preventDefault(); if (request.trigger.isConnected) request.trigger.focus({ preventScroll: true }); }}
      onKeyDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()} onWheel={(event) => event.stopPropagation()}>
      <header className={styles.header}>
        <div><DialogTitle className={styles.title}>添加数据</DialogTitle><DialogDescription className={styles.description}>填写图片参数，确认后保存为新图片。</DialogDescription></div>
        <DialogClose asChild><Button type="button" variant="ghost" size="icon-sm" aria-label="关闭添加数据弹框"><X size={18} strokeWidth={1.5} /></Button></DialogClose>
      </header>
      <div className={styles.body} aria-busy={loading || busy !== null}>
        <div className={styles.current}>
          <span className={styles.preview}>{previewFailed ? <Camera size={22} aria-hidden="true" /> : <PrivateObjectImage src={previewUrl} alt="" onError={() => setPreviewFailed(true)} />}</span>
          <div><strong title={request.name}>{request.name}</strong><p>当前图片 · {original ? `${original.width} × ${original.height} · ${original.metadata.format.toUpperCase()}` : loading ? "正在读取原图" : "原图尚未读取"}</p></div>
        </div>
        {loading && <p className={styles.status} role="status">正在读取图片参数…</p>}
        {!loading && !original && <Button type="button" variant="secondary" size="sm" onClick={() => setAttempt((value) => value + 1)}>重新读取原图</Button>}
        <div className={styles.tools}>
          <Button type="button" variant="ghost" size="sm" disabled={disabled || !Object.values(fields).some(Boolean)} onClick={() => void copy()}><Copy size={14} aria-hidden="true" />复制参数</Button>
          <Button type="button" variant="ghost" size="sm" disabled={disabled} aria-expanded={pasteOpen} onClick={() => setPasteOpen((value) => !value)}><ClipboardPaste size={14} aria-hidden="true" />粘贴参数</Button>
        </div>
        {pasteOpen && <div className={styles.paste}>
          <label htmlFor={`metadata-paste-${request.sessionId}`}>元数据 JSON</label>
          <textarea id={`metadata-paste-${request.sessionId}`} value={pasteText} onChange={(event) => setPasteText(event.target.value)} rows={5} maxLength={20_000} placeholder="粘贴通过「复制参数」得到的内容" disabled={disabled} />
          <Button type="button" size="sm" variant="secondary" disabled={disabled || !pasteText.trim()} onClick={() => {
            try {
              const values = editableMetadataFields(parseImageMetadataJson(pasteText));
              if (!Object.keys(values).length) throw new Error("粘贴内容中没有可填写的参数；已有内容已保留。");
              setFields(values); setError(null); setPasteOpen(false); setNotice("已填入粘贴的参数，点击「确认添加」保存。");
            } catch (cause) { setError(cause instanceof Error ? cause.message : "元数据 JSON 无效。"); }
          }}>填入参数</Button>
        </div>}
        <p className={styles.status} role="status" aria-live="polite">{notice}</p>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.form}>{["拍摄参数", "图片信息"].map((group) => <fieldset key={group} disabled={disabled}>
          <legend>{group}</legend><div className={styles.fields}>{IMAGE_METADATA_FIELDS.filter((field) => field.group === group).map((field) => <label key={field.key}>
            <span>{field.label}</span><Input value={fields[field.key] ?? ""} placeholder={field.placeholder} maxLength={500}
              onChange={(event) => {
                setFields((current) => ({ ...current, [field.key]: event.target.value })); setError(null); setNotice("确认后将表单参数写入新图片。");
              }} />
          </label>)}</div>
        </fieldset>)}</div>
      </div>
      <footer className={styles.footer}>
        <Button type="button" size="sm" disabled={disabled || !Object.values(fields).some(Boolean)} onClick={() => void commit()}>{busy === "save" ? "正在添加…" : "确认添加"}</Button>
      </footer>
    </DialogContent>
  </Dialog>;
}
