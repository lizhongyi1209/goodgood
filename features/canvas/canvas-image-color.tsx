"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReactFlow, useStore } from "@xyflow/react";
import { Check, ChevronDown, Eye, ImageOff, LoaderCircle, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import { Slider } from "@/components/ui/slider";
import { listAssets } from "@/features/assets/http-asset-boundary";
import { listAssetOrganization } from "@/features/assets/http-asset-organization";
import { imageDownloadFilename } from "@/features/assets/image-download";
import { listReferenceMaterials } from "@/features/references/http-reference-library";
import type { GenerationReference } from "@/shared/contracts/generation";
import { privateCanvasImageUrls, privateImageUrls } from "@/shared/private-image-urls.mjs";
import { CanvasImageColorContext } from "./canvas-image-color-context";
import { COLOR_DEFAULTS, COLOR_IDENTITY, colorStatistics, createColorLut, matchColorStatistics, type ColorMatch, type ColorParameters, type ColorStatistics } from "./canvas-image-color-model.mjs";
import { createColorPreview, exportColorImage, readColorPixels } from "./canvas-image-color-renderer";
import { canvasCropImageForNode, loadCanvasCropImage, type CanvasCropCommit, type CanvasCropImage, type CanvasCropRequest } from "./canvas-image-crop-image";
import type { CanvasNode } from "./canvas-workspace";
import styles from "./canvas-image-color.module.css";

type ReferenceImage = CanvasCropImage & Readonly<{ previewUrl: string }>;
type ColorRequest = CanvasCropRequest & Readonly<{ ownerKey: string; references: readonly ReferenceImage[]; trigger: HTMLButtonElement }>;
type LoadedImage = Awaited<ReturnType<typeof loadCanvasCropImage>>;
type ImageState = Readonly<{ loaded: LoadedImage; pixels: ImageData; statistics: ColorStatistics | null }>;

function referenceImage(kind: "asset" | "reference", id: string, name: string): ReferenceImage {
  return { nodeId: "", imageId: id, key: `${kind}:${id}`, name,
    contentUrl: privateImageUrls(kind, id).contentUrl, previewUrl: privateCanvasImageUrls(kind, id).previewUrl };
}

export function CanvasImageColorProvider({ children, enabled, libraryEnabled, ownerKey, pageKey, onCommit }: Readonly<{
  children: ReactNode; enabled: boolean; libraryEnabled: boolean; ownerKey: string; pageKey: string; onCommit: (commit: CanvasCropCommit) => boolean;
}>) {
  const [request, setRequest] = useState<ColorRequest | null>(null);
  const visible = enabled && request?.ownerKey === ownerKey && request.pageId === pageKey ? request : null;
  useEffect(() => { setRequest(null); }, [enabled, ownerKey, pageKey]);
  return <CanvasImageColorContext.Provider value={{ enabled, openColor: (image, references, trigger) => {
    if (!enabled) return;
    const seen = new Set([image.key]);
    const candidates = references.flatMap((item: GenerationReference) => {
      if (item.status !== "ready" || !item.id) return [];
      const candidate = referenceImage("reference", item.id, item.name);
      if (seen.has(candidate.key)) return [];
      seen.add(candidate.key); return [candidate];
    });
    setRequest({ ...image, references: candidates, trigger, ownerKey, pageId: pageKey, sessionId: crypto.randomUUID() });
  } }}>
    {children}
    {visible && <ColorDialog key={visible.sessionId} request={visible} libraryEnabled={libraryEnabled} onCommit={onCommit} onClose={() => setRequest(null)} />}
  </CanvasImageColorContext.Provider>;
}

function ReferencePicker({ request, selected, libraryEnabled, disabled, onSelect, onClear }: Readonly<{
  request: ColorRequest; selected: ReferenceImage | null; libraryEnabled: boolean; disabled: boolean; onSelect: (image: ReferenceImage) => void; onClear: () => void;
}>) {
  const [open, setOpen] = useState(!selected);
  const [source, setSource] = useState<"references" | "assets">(request.references.length ? "references" : "assets");
  const [assets, setAssets] = useState<readonly ReferenceImage[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState("");
  useEffect(() => {
    if (!open || source !== "assets" || !libraryEnabled) return;
    let active = true; setLoading(true); setError(null);
    void Promise.allSettled([listAssets(), listReferenceMaterials(), listAssetOrganization(null)]).then(([generated, uploaded, organization]) => {
      if (!active) return;
      const names = new Map(organization.status === "fulfilled" ? organization.value.arrangements.map((item) => [`${item.kind}:${item.id}`, item.displayName] as const) : []);
      const items: Array<ReferenceImage & { createdAt: string }> = [];
      if (generated.status === "fulfilled") for (const job of generated.value) for (const [index, output] of job.outputs.entries()) {
        items.push({ ...referenceImage("asset", output.id, names.get(`generated:${output.id}`) ?? imageDownloadFilename(job.createdAt, index + 1, output.previewUrl)), createdAt: job.createdAt });
      }
      if (uploaded.status === "fulfilled") for (const item of uploaded.value) items.push({ ...referenceImage("reference", item.id, names.get(`reference:${item.id}`) ?? item.name), createdAt: item.uploadedAt });
      const seen = new Set([request.key]);
      setAssets(items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).filter((item) => {
        if (seen.has(item.key)) return false; seen.add(item.key); return true;
      }));
      if (generated.status === "rejected" || uploaded.status === "rejected" || organization.status === "rejected") setError("部分资产未能读取，请重试。");
      setLoading(false);
    });
    return () => { active = false; };
  }, [open, source, libraryEnabled, attempt, request.key]);
  const choices = source === "references" ? request.references : (assets ?? []).filter((item) => item.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <section className={styles.reference} aria-label="校色参考图">
    <button type="button" className={styles.referenceButton} disabled={disabled} onClick={() => setOpen((value) => !value)} aria-expanded={open}>
      {selected ? <PrivateObjectImage src={selected.previewUrl} alt="" className={styles.referenceThumb} /> : <span className={styles.referenceThumb}><ImageOff size={18} strokeWidth={1.5} /></span>}
      <span><span className={styles.referenceLabel}>参考图</span><span className={styles.referenceName}>{selected?.name ?? "选择图片进行自动校色"}</span></span>
      <ChevronDown size={15} strokeWidth={1.7} aria-hidden="true" />
    </button>
    {open && <div className={styles.referenceChoices}>
      <div className={styles.tabs} role="group" aria-label="参考图来源">
        <Button variant="ghost" size="sm" disabled={disabled} aria-pressed={source === "references"} onClick={() => setSource("references")}>参考图</Button>
        <Button variant="ghost" size="sm" disabled={disabled} aria-pressed={source === "assets"} onClick={() => setSource("assets")}>资产</Button>
      </div>
      {selected && <Button variant="ghost" size="sm" className={styles.manual} disabled={disabled} onClick={() => { onClear(); setOpen(false); }}>仅手动调整</Button>}
      {source === "assets" && libraryEnabled && <Input value={search} disabled={disabled} placeholder="搜索图片" aria-label="搜索资产图片" onChange={(event) => setSearch(event.target.value)} className={styles.search} />}
      {error && source === "assets" && <div className={styles.inlineError} role="alert">{error}<Button variant="ghost" size="sm" disabled={loading || disabled} onClick={() => setAttempt((value) => value + 1)}>重试</Button></div>}
      <div className={styles.choices} aria-busy={loading && source === "assets"}>
        {choices.map((item) => <button type="button" key={item.key} disabled={disabled} className={styles.choice} aria-label={`用${item.name}校色`} title={item.name} aria-pressed={selected?.key === item.key} onClick={() => { onSelect(item); setOpen(false); }}>
          <PrivateObjectImage src={item.previewUrl} alt="" loading="lazy" />
          {selected?.key === item.key && <span className={styles.chosen}><Check size={12} /></span>}
        </button>)}
      </div>
      {!choices.length && <p className={styles.empty} role="status">{source === "references" ? "这张图片没有参考图，可从资产选择。" : !libraryEnabled ? "登录后可从资产选择图片。" : loading ? "正在读取资产…" : error ? "请重试读取资产。" : search.trim() ? "没有找到匹配的图片。" : "资产中暂无其他图片。"}</p>}
    </div>}
  </section>;
}

const PARAMETERS: readonly Readonly<{ key: keyof ColorParameters; label: string; min: number; max: number; step?: number; ends: readonly [string, string] }>[] = [
  { key: "strength", label: "自动校色强度", min: 0, max: 100, ends: ["原色", "参考色调"] },
  { key: "temperature", label: "色温", min: -100, max: 100, ends: ["冷", "暖"] },
  { key: "tint", label: "色调", min: -100, max: 100, ends: ["绿", "洋红"] },
  { key: "saturation", label: "饱和度", min: -100, max: 100, ends: ["低", "高"] },
  { key: "exposure", label: "曝光", min: -2, max: 2, step: .05, ends: ["暗", "亮"] },
  { key: "contrast", label: "对比度", min: -100, max: 100, ends: ["低", "高"] },
];

function ColorDialog({ request, libraryEnabled, onClose, onCommit }: Readonly<{
  request: ColorRequest; libraryEnabled: boolean; onClose: () => void; onCommit: (commit: CanvasCropCommit) => boolean;
}>) {
  const flow = useReactFlow<CanvasNode>();
  const liveNode = useStore((state) => state.nodeLookup.get(request.nodeId));
  const [reference, setReference] = useState<ReferenceImage | null>(request.references[0] ?? null);
  const [image, setImage] = useState<ImageState | null>(null);
  const [match, setMatch] = useState<ColorMatch | null>(null);
  const [parameters, setParameters] = useState<ColorParameters>(COLOR_DEFAULTS);
  const [matching, setMatching] = useState(Boolean(reference));
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [sourceAttempt, setSourceAttempt] = useState(0);
  const [matchAttempt, setMatchAttempt] = useState(0);
  const [showOriginal, setShowOriginal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<ReturnType<typeof createColorPreview> | null>(null);
  const lifecycleRef = useRef<AbortController | null>(null);
  const savingRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const parametersRef = useRef(parameters); parametersRef.current = parameters;
  const closeRef = useRef(onClose); closeRef.current = onClose;
  const parametersKey = JSON.stringify(parameters);
  useEffect(() => {
    const controller = new AbortController(); lifecycleRef.current = controller;
    return () => { controller.abort(); if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); };
  }, []);
  useEffect(() => {
    const current = canvasCropImageForNode(flow.getNode(request.nodeId), request.imageId);
    if (!liveNode?.selected || !current || current.key !== request.key) closeRef.current();
  }, [flow, liveNode, request]);
  useEffect(() => {
    const controller = new AbortController(); let loaded: LoadedImage | null = null;
    setImage(null); setSourceError(null); setPreviewError(null); setSaveError(null);
    void loadCanvasCropImage(request, controller.signal).then((resource) => {
      loaded = resource; controller.signal.throwIfAborted();
      const pixels = readColorPixels(resource.image);
      let statistics: ColorStatistics | null = null;
      try { statistics = colorStatistics(pixels.data); } catch { /* Uniform black/white or transparent images still support manual editing. */ }
      setImage({ loaded: resource, pixels, statistics });
    }).catch((cause) => {
      if (!controller.signal.aborted) setSourceError(cause instanceof Error ? cause.message : "图片无法读取，请重试。");
    });
    return () => { controller.abort(); loaded?.dispose(); };
  }, [request, sourceAttempt]);
  useEffect(() => {
    const controller = new AbortController(); let resource: LoadedImage | null = null;
    setMatch(null); setMatchError(null); setSaveError(null);
    if (!image || !reference) { setMatching(false); return () => controller.abort(); }
    if (!image.statistics) { setMatching(false); setMatchError("当前图片缺少可匹配的颜色，可以手动调整。"); return () => controller.abort(); }
    const sourceStatistics = image.statistics;
    setMatching(true);
    void loadCanvasCropImage(reference, controller.signal).then((loaded) => {
      resource = loaded; controller.signal.throwIfAborted();
      try {
        const statistics = colorStatistics(readColorPixels(loaded.image, 384).data);
        const result = matchColorStatistics(sourceStatistics, statistics);
        if (!controller.signal.aborted) { setMatch(result); setMatching(false); }
      } finally { loaded.dispose(); resource = null; }
    }).catch((cause) => {
      if (!controller.signal.aborted) { setMatchError(cause instanceof Error ? cause.message : "参考图校色失败，请重试。"); setMatching(false); }
    });
    return () => { controller.abort(); resource?.dispose(); };
  }, [image, reference, matchAttempt]);
  useEffect(() => {
    setPreviewReady(false); if (!image || !surfaceRef.current) return;
    const preview = createColorPreview(image.pixels); previewRef.current = preview;
    surfaceRef.current.appendChild(preview.canvas);
    return () => { previewRef.current = null; preview.dispose(); };
  }, [image]);
  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    let active = true;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const lut = createColorLut(match ?? COLOR_IDENTITY, parametersRef.current);
      void preview.draw(lut, showOriginal).then(() => { if (active) { setPreviewReady(true); setPreviewError(null); } }, (cause) => {
        if (active && !(cause instanceof DOMException && cause.name === "AbortError")) setPreviewError(cause instanceof Error ? cause.message : "预览暂时无法显示，请重试。");
      });
    });
    return () => { active = false; if (frameRef.current !== null) { cancelAnimationFrame(frameRef.current); frameRef.current = null; } };
  }, [image, match, parametersKey, showOriginal]);
  const ready = Boolean(image && previewReady && !previewError && !matching && (!reference || match));
  const save = async () => {
    const controller = lifecycleRef.current;
    if (!ready || !image || !controller || controller.signal.aborted || savingRef.current) return;
    savingRef.current = true; setSaving(true); setSaveError(null);
    try {
      // Snapshot the committed parameters; an unfinished preview frame must not
      // make export save the previous slider value or the temporary before view.
      const lut = createColorLut(match ?? COLOR_IDENTITY, parametersRef.current);
      const file = await exportColorImage(image.loaded.image, lut, request.name, image.loaded.blob, controller.signal);
      controller.signal.throwIfAborted();
      if (!onCommit({ request, file, width: image.loaded.image.naturalWidth, height: image.loaded.image.naturalHeight, createCopy: true })) throw new Error("来源图片已变更，请重新打开调色。");
      closeRef.current();
    } catch (cause) {
      if (!controller.signal.aborted) setSaveError(cause instanceof Error ? cause.message : "图片保存失败，请重试。");
    } finally { savingRef.current = false; if (!controller.signal.aborted) setSaving(false); }
  };
  const cancel = () => { lifecycleRef.current?.abort(); onClose(); };
  return <Dialog open onOpenChange={(open) => { if (!open) cancel(); }}>
    <DialogContent className={`${styles.dialog} nodrag nopan nowheel nokey`} overlayClassName={styles.overlay} showCloseButton={false}
      onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}
      onCloseAutoFocus={(event) => { event.preventDefault(); if (request.trigger.isConnected) request.trigger.focus({ preventScroll: true }); }}>
      <header className={styles.header}>
        <DialogTitle className={styles.title}>调色</DialogTitle>
        <DialogDescription className="sr-only">按参考图自动调整色调，再实时微调参数。保存新的图片，保留原图。</DialogDescription>
        <Button variant="ghost" size="icon" aria-label="关闭调色" className={styles.close} onClick={cancel}><X size={18} strokeWidth={1.7} /></Button>
      </header>
      <div className={styles.body}>
        <section className={styles.preview} aria-label="调色预览">
          <div className={styles.surface} ref={surfaceRef} aria-busy={!previewReady || matching} />
          <div className={styles.previewTools}>
            <span className={styles.status} role="status">{!image ? "正在读取图片…" : matching ? "正在匹配参考色调…" : match ? "已按参考图调整" : reference ? "参考图暂时无法匹配" : "选择参考图，或手动调整"}</span>
            <Button variant="ghost" size="sm" disabled={!previewReady || saving} aria-pressed={showOriginal} onClick={() => setShowOriginal((value) => !value)}><Eye size={14} strokeWidth={1.7} />{showOriginal ? "查看调整后" : "查看调整前"}</Button>
          </div>
          {showOriginal && previewReady && <span className={styles.beforeLabel}>调整前</span>}
          {(!image || previewError) && <div className={styles.surfaceStatus} role={sourceError || previewError ? "alert" : "status"}>
            {sourceError || previewError ? <><ImageOff size={24} strokeWidth={1.5} /><span>{sourceError || previewError}</span><Button variant="ghost" size="sm" onClick={() => setSourceAttempt((value) => value + 1)}>重试</Button></>
              : <><LoaderCircle size={20} className="animate-spin motion-reduce:animate-none" /><span>正在读取图片…</span></>}
          </div>}
        </section>
        <aside className={styles.panel} aria-label="调色参数">
          <ReferencePicker request={request} selected={reference} libraryEnabled={libraryEnabled} disabled={saving} onSelect={(value) => {
            setMatch(null); setMatching(true); setMatchError(null); setParameters(COLOR_DEFAULTS); setShowOriginal(false); setReference(value); setMatchAttempt((value) => value + 1);
          }} onClear={() => { setReference(null); setMatch(null); setMatchError(null); setMatching(false); setParameters(COLOR_DEFAULTS); setShowOriginal(false); }} />
          {matchError && <div className={styles.inlineError} role="alert"><span>{matchError}</span><Button variant="ghost" size="sm" disabled={saving || matching} onClick={() => setMatchAttempt((value) => value + 1)}>重新匹配</Button></div>}
          <div className={styles.parameters}>
            {PARAMETERS.map((item) => <div className={styles.parameter} key={item.key}>
              <div className={styles.parameterLabel}><span id={`color-${request.sessionId}-${item.key}`}>{item.label}</span><output>{item.key === "exposure" ? parameters[item.key].toFixed(2) : parameters[item.key]}{item.key === "strength" ? "%" : ""}</output></div>
              <Slider value={[parameters[item.key]]} min={item.min} max={item.max} step={item.step ?? 1} disabled={saving || !image || matching || (item.key === "strength" && !match)} aria-labelledby={`color-${request.sessionId}-${item.key}`} className={styles.slider}
                onValueChange={([value]) => { if (value !== undefined) { setParameters((current) => ({ ...current, [item.key]: value })); setSaveError(null); } }} />
              <div className={styles.ends} aria-hidden="true"><span>{item.ends[0]}</span><span>{item.ends[1]}</span></div>
            </div>)}
          </div>
          <Button variant="ghost" size="sm" className={styles.reset} disabled={saving || !image || matching} onClick={() => { setParameters(COLOR_DEFAULTS); setShowOriginal(false); setSaveError(null); }}><RotateCcw size={14} strokeWidth={1.7} />{match ? "恢复自动调整" : "重置调整"}</Button>
        </aside>
      </div>
      <footer className={styles.footer}>
        <span className={styles.saveMessage} role={saveError ? "alert" : undefined}>{saveError ?? "保存为新图片，保留原图"}</span>
        <div><Button variant="ghost" onClick={cancel}>取消</Button><Button disabled={!ready || saving} onClick={() => { void save(); }}>{saving && <LoaderCircle size={15} className="animate-spin motion-reduce:animate-none" />}{saving ? "正在保存…" : "保存新图片"}</Button></div>
      </footer>
    </DialogContent>
  </Dialog>;
}
