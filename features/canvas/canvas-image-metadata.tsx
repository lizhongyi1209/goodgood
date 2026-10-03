"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReactFlow } from "@xyflow/react";
import { Camera, ClipboardPaste, Copy, Download, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import { IMAGE_METADATA_FIELDS, copyImageMetadataJson, parseImageMetadataJson, readImageFileC2pa, readImageFileMetadata, writeImageFileMetadata, type ImageFileMetadataFields } from "@/features/assets/image-file-metadata.mjs";
import { PRIVATE_IMAGE_UPLOAD_MAX_BYTES } from "@/shared/contracts/upload-limits.mjs";
import { privateImageUrls } from "@/shared/private-image-urls.mjs";
import type { GenerationReference } from "@/shared/contracts/generation";
import { canvasGeneratorJobs } from "./canvas-image-prompt-batch.mjs";
import { readCanvasCropImageBlob, type CanvasCropCommit, type CanvasCropImage, type CanvasCropRequest } from "./canvas-image-crop-image";
import type { CanvasNode } from "./canvas-workspace";
import { CanvasImageMetadataContext } from "./canvas-image-metadata-context";
import styles from "./canvas-image-metadata.module.css";

type MetadataRequest = CanvasCropRequest & Readonly<{ references: readonly GenerationReference[]; trigger: HTMLButtonElement }>;
type Original = Readonly<{ bytes: Uint8Array<ArrayBuffer>; blob: Blob; metadata: ReturnType<typeof readImageFileMetadata>; width: number; height: number }>;

export function CanvasImageMetadataProvider({ children, enabled, ownerKey, pageKey, onCommit }: Readonly<{
  children: ReactNode; enabled: boolean; ownerKey: string; pageKey: string; onCommit: (commit: CanvasCropCommit) => boolean;
}>) {
  const flow = useReactFlow<CanvasNode>();
  const [request, setRequest] = useState<Readonly<{ value: MetadataRequest; ownerKey: string }> | null>(null);
  const visible = enabled && request?.ownerKey === ownerKey && request.value.pageId === pageKey ? request.value : null;
  useEffect(() => { setRequest(null); }, [enabled, ownerKey, pageKey]);
  return <CanvasImageMetadataContext.Provider value={{ enabled, openMetadata: (image, trigger) => {
    if (!enabled) return;
    const node = flow.getNode(image.nodeId);
    const job = node?.type === "imageGenerator" ? canvasGeneratorJobs(node.data).find((item) => item.outputs.some((output) => output.id === image.imageId))
      : node?.type === "imageResult" ? node.data.job : undefined;
    const seen = new Set([image.key]);
    const references = (job?.input.references ?? []).filter((reference) => {
      if (reference.status !== "ready" || !reference.id || seen.has(`reference:${reference.id}`)) return false;
      seen.add(`reference:${reference.id}`);
      return true;
    });
    setRequest({ ownerKey, value: { ...image, references, trigger, pageId: pageKey, sessionId: crypto.randomUUID() } });
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
  const result = writeImageFileMetadata(original.bytes, fields, { orientation: original.metadata.orientation });
  signal.throwIfAborted();
  if (result.bytes.length > PRIVATE_IMAGE_UPLOAD_MAX_BYTES) throw new Error("处理后的副本超过 20 MB，无法保存。请使用较小的原图。");
  const basename = name.replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "_").slice(0, 100).trim() || "GoodGood图片";
  const file = new File([result.bytes], `${basename}_元数据.${result.extension}`, { type: result.mimeType });
  return { file, width: original.width, height: original.height };
}

function startDownload(file: File) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = file.name; anchor.style.display = "none";
  try { document.body.appendChild(anchor); anchor.click(); }
  finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 60_000); }
}

function CanvasImageMetadataDialog({ request, onClose, onCommit }: Readonly<{
  request: MetadataRequest; onClose: () => void; onCommit: (commit: CanvasCropCommit) => boolean;
}>) {
  const [original, setOriginal] = useState<Original | null>(null);
  const [fields, setFields] = useState<ImageFileMetadataFields>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"extract" | "save" | "download" | "copy" | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const lifecycle = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const [referencesOpen, setReferencesOpen] = useState(false);
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
        metadataError = "原有元数据无法完整解析。可以手动填写参数，或关闭后使用「去除AI」。";
      }
      const dimensions = await decodeDimensions(blob, controller.signal);
      controller.signal.throwIfAborted();
      setOriginal({ bytes, blob, metadata, ...dimensions }); setFields(metadata.fields); setLoading(false);
      setError(metadataError);
      setNotice(Object.keys(metadata.fields).length ? "已填入这张图片现有的参数。" : metadata.hasMetadata ? "没有可编辑的拍摄参数；清理请使用图片快捷栏的「去除AI」。" : "这张图片没有元数据，可手动填写或粘贴参数。");
    })().catch((cause) => { if (!controller.signal.aborted) { setLoading(false); setError(cause instanceof Error ? cause.message : "原图读取失败，请重试。"); } });
    return () => { controller.abort(); };
  }, [request, attempt]);

  const extract = async (read: () => Promise<Blob>, sourceName: string) => {
    if (busyRef.current || !original || !lifecycle.current) return;
    const signal = lifecycle.current.signal;
    busyRef.current = true; setBusy("extract"); setError(null);
    try {
      const blob = await read(); signal.throwIfAborted();
      if (blob.size > PRIVATE_IMAGE_UPLOAD_MAX_BYTES) throw new Error("请选择 20 MB 以内的 JPEG 或 PNG 参考图。");
      const bytes = new Uint8Array(await blob.arrayBuffer()); signal.throwIfAborted();
      const metadata = readImageFileMetadata(bytes);
      if (!Object.keys(metadata.fields).length) throw new Error("这张参考图没有可提取的常用拍摄参数；已填写内容已保留。");
      setFields(metadata.fields); setReferencesOpen(false);
      setNotice(`已从「${sourceName}」提取参数，保存后写入图片副本。`);
    } catch (cause) { if (!signal.aborted) setError(cause instanceof Error ? cause.message : "参考图元数据提取失败，请重试。"); }
    finally { busyRef.current = false; if (!signal.aborted) setBusy(null); }
  };

  const commit = async (download: boolean) => {
    if (!original || busyRef.current || !lifecycle.current) return;
    const signal = lifecycle.current.signal;
    busyRef.current = true; setBusy(download ? "download" : "save"); setError(null);
    try {
      const result = await metadataFile(original, fields, request.name, signal);
      if (download) { startDownload(result.file); setNotice("已开始下载处理后的图片副本。"); }
      else if (onCommit({ request, ...result, createCopy: true })) onClose();
      else throw new Error("当前图片或页面已变化，请关闭弹框后重新打开。");
    } catch (cause) { if (!signal.aborted) setError(cause instanceof Error ? cause.message : "副本保存失败，请重试。"); }
    finally { busyRef.current = false; if (!signal.aborted) setBusy(null); }
  };

  const disabled = loading || !original || busy !== null;
  const restore = () => {
    if (!original) return;
    setFields(original.metadata.fields); setError(null); setNotice("已还原这张图片原有的参数。");
  };
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
        <div><DialogTitle className={styles.title}>添加数据</DialogTitle><DialogDescription className={styles.description}>编辑当前图片的元数据，保存为新的图片副本。</DialogDescription></div>
        <DialogClose asChild><Button type="button" variant="ghost" size="icon-sm" aria-label="关闭元数据弹框"><X size={18} strokeWidth={1.5} /></Button></DialogClose>
      </header>
      <div className={styles.body} aria-busy={loading || busy !== null}>
        <div className={styles.current}>
          <span className={styles.preview}>{previewFailed ? <Camera size={22} aria-hidden="true" /> : <PrivateObjectImage src={previewUrl} alt="" onError={() => setPreviewFailed(true)} />}</span>
          <div><strong title={request.name}>{request.name}</strong><p>当前图片 · {original ? `${original.width} × ${original.height} · ${original.metadata.format.toUpperCase()}` : loading ? "正在读取原图" : "原图尚未读取"}</p></div>
          <Button type="button" variant="ghost" size="sm" onClick={restore} disabled={disabled} aria-label="还原当前图片原有参数"><RotateCcw size={14} aria-hidden="true" />还原</Button>
        </div>
        {loading && <p className={styles.status} role="status">正在读取图片元数据…</p>}
        {!loading && !original && <Button type="button" variant="secondary" size="sm" onClick={() => setAttempt((value) => value + 1)}>重新读取原图</Button>}
        {original && <p className={styles.status} role="status">
          {original.metadata.c2pa === "present" ? "发现内嵌 C2PA 内容凭证，尚未验证签名。" : original.metadata.c2pa === "unreadable" ? "内容凭证检测未完成：文件中的凭证数据无法完整识别。" : "未发现内嵌 C2PA 内容凭证。"}
          {original.metadata.c2pa !== "absent" && " 普通编辑可能使原凭证失效；清理请使用「去除AI」。"}
        </p>}
        {original && original.metadata.c2pa !== "absent" && <p className={styles.status}>此处仅处理文件内数据，不清除隐形水印或外部凭证，也不用于判定图片是否由 AI 生成。</p>}
        <div className={styles.tools}>
          {!!request.references.length && <Button type="button" variant="ghost" size="sm" disabled={disabled} aria-expanded={referencesOpen} onClick={() => setReferencesOpen((value) => !value)}>{busy === "extract" ? "正在提取…" : "从参考图提取"}</Button>}
          <Button type="button" variant="ghost" size="sm" disabled={disabled || !Object.values(fields).some(Boolean)} onClick={() => void copy()}><Copy size={14} aria-hidden="true" />复制参数</Button>
          <Button type="button" variant="ghost" size="sm" disabled={disabled} aria-expanded={pasteOpen} onClick={() => setPasteOpen((value) => !value)}><ClipboardPaste size={14} aria-hidden="true" />粘贴参数</Button>
        </div>
        {referencesOpen && <div className={styles.references} aria-label="实际使用的参考图">{request.references.map((reference) => <Button key={reference.id} type="button" variant="ghost" disabled={disabled} className={styles.reference}
          onClick={() => { const urls = privateImageUrls("reference", reference.id); void extract(() => readCanvasCropImageBlob({ nodeId: request.nodeId, imageId: reference.id, key: `reference:${reference.id}`, name: reference.name, contentUrl: urls.contentUrl }, lifecycle.current!.signal), reference.name); }}>
          <span>{reference.name}</span><span>提取</span>
        </Button>)}</div>}
        {pasteOpen && <div className={styles.paste}>
          <label htmlFor={`metadata-paste-${request.sessionId}`}>元数据 JSON</label>
          <textarea id={`metadata-paste-${request.sessionId}`} value={pasteText} onChange={(event) => setPasteText(event.target.value)} rows={5} maxLength={20_000} placeholder="粘贴通过「复制参数」得到的内容" disabled={disabled} />
          <Button type="button" size="sm" variant="secondary" disabled={disabled || !pasteText.trim()} onClick={() => {
            try {
              const values = parseImageMetadataJson(pasteText);
              if (!Object.keys(values).length) throw new Error("粘贴内容中没有可填写的参数；已有内容已保留。");
              setFields(values); setError(null); setPasteOpen(false); setNotice("已填入粘贴的参数，保存后写入副本。");
            } catch (cause) { setError(cause instanceof Error ? cause.message : "元数据 JSON 无效。"); }
          }}>填入参数</Button>
        </div>}
        <p className={styles.status} role="status" aria-live="polite">{notice}</p>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.form}>{["拍摄参数", "图片信息", "位置信息"].map((group) => <fieldset key={group} disabled={disabled}>
          <legend>{group}</legend><div className={styles.fields}>{IMAGE_METADATA_FIELDS.filter((field) => field.group === group).map((field) => <label key={field.key}>
            <span>{field.label}</span><Input value={fields[field.key] ?? ""} placeholder={field.placeholder} maxLength={500}
              inputMode={group === "位置信息" ? "decimal" : undefined} onChange={(event) => {
                setFields((current) => ({ ...current, [field.key]: event.target.value })); setError(null); setNotice("保存后将表单参数写入图片副本。");
              }} />
          </label>)}</div>
        </fieldset>)}</div>
      </div>
      <footer className={styles.footer}>
        <span className={styles.status}>清理请使用「去除AI」</span>
        <div><Button type="button" variant="secondary" size="sm" disabled={disabled || !Object.values(fields).some(Boolean)} onClick={() => void commit(true)}><Download size={14} aria-hidden="true" />{busy === "download" ? "正在导出…" : "下载副本"}</Button>
          <Button type="button" size="sm" disabled={disabled || !Object.values(fields).some(Boolean)} onClick={() => void commit(false)}>{busy === "save" ? "正在保存…" : "保存副本"}</Button></div>
      </footer>
    </DialogContent>
  </Dialog>;
}
