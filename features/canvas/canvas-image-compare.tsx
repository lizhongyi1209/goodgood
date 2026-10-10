"use client";

import { createContext, useContext, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { ArrowLeftRight, Check, ImageOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import { listAssets } from "@/features/assets/http-asset-boundary";
import { listAssetOrganization } from "@/features/assets/http-asset-organization";
import { imageDownloadFilename } from "@/features/assets/image-download";
import { listReferenceMaterials } from "@/features/references/http-reference-library";
import type { GenerationReference } from "@/shared/contracts/generation";
import { privateCanvasImageUrls } from "@/shared/private-image-urls.mjs";
import { canvasGeneratorJobs } from "./canvas-image-prompt-batch.mjs";
import { createCanvasImagePreviewPool } from "./canvas-image-preview-pool";
import type { CanvasCropImage } from "./canvas-image-crop-image";
import type { CanvasNode } from "./canvas-workspace";
import styles from "./canvas-image-compare.module.css";

type CompareImage = Readonly<{ key: string; name: string; previewUrl: string; detailPreviewUrl: string }>;
type CompareRequest = Readonly<{ current: CompareImage; references: readonly CompareImage[]; pageKey: string; ownerKey: string; returnFocusTo: HTMLButtonElement }>;
type PreviewPool = ReturnType<typeof createCanvasImagePreviewPool>;

function compareImage(kind: "asset" | "reference", id: string, name: string): CompareImage {
  return { key: `${kind}:${id}`, name, ...privateCanvasImageUrls(kind, id) };
}

/** Use the chosen output's frozen input, rather than another slot or the live composer. */
export function canvasImageCompareReferences(node: CanvasNode | undefined, imageId: string): readonly GenerationReference[] {
  const job = node?.type === "imageGenerator"
    ? canvasGeneratorJobs(node.data).find((item) => item.outputs.some((output) => output.id === imageId))
    : node?.type === "imageResult" ? node.data.job : undefined;
  return job?.input.references ?? [];
}

const CompareContext = createContext<Readonly<{
  openCompare: (image: CanvasCropImage, references: readonly GenerationReference[], trigger: HTMLButtonElement) => void;
}>>({ openCompare: () => {} });

export function useCanvasImageCompare() { return useContext(CompareContext); }

export function CanvasImageCompareProvider({ children, enabled, libraryEnabled, pageKey, ownerKey }: Readonly<{
  children: ReactNode; enabled: boolean; libraryEnabled: boolean; pageKey: string; ownerKey: string;
}>) {
  const [request, setRequest] = useState<CompareRequest | null>(null);
  const visible = enabled && request?.pageKey === pageKey && request.ownerKey === ownerKey ? request : null;
  useEffect(() => { Promise.resolve().then(() => setRequest(null)); }, [enabled, pageKey, ownerKey]);
  return <CompareContext.Provider value={{ openCompare: (image, references, returnFocusTo) => {
    if (!enabled) return;
    const kind = image.key.startsWith("asset:") ? "asset" : "reference";
    const current = compareImage(kind, image.imageId, image.name);
    const seen = new Set([current.key]);
    const candidates = references.flatMap((reference) => {
      if (reference.status !== "ready" || !reference.id) return [];
      const item = compareImage("reference", reference.id, reference.name);
      if (seen.has(item.key)) return [];
      seen.add(item.key);
      return [item];
    });
    setRequest({ current, references: candidates, pageKey, ownerKey, returnFocusTo });
  } }}>
    {children}
    {visible && <CanvasImageCompareDialog key={`${visible.ownerKey}:${visible.pageKey}:${visible.current.key}`} request={visible} libraryEnabled={libraryEnabled} onClose={() => setRequest(null)} />}
  </CompareContext.Provider>;
}

function useComparePreview(image: CompareImage | null, pool: PreviewPool, attempt: number) {
  const [state, setState] = useState<Readonly<{ key: string; url?: string; failed?: boolean }> | null>(null);
  useEffect(() => {
    if (!image) return;
    let active = true;
    const handle = pool.acquire(image.detailPreviewUrl, 2048);
    const key = `${image.key}:${attempt}`;
    handle.promise.then((url) => { if (active) setState({ key, url }); }, () => { if (active) setState({ key, failed: true }); });
    return () => { active = false; handle.release(); };
  }, [image, pool, attempt]);
  return image && state?.key === `${image.key}:${attempt}` ? state : null;
}

function CompareThumbnail({ image, selected, onSelect }: Readonly<{ image: CompareImage; selected: boolean; onSelect: () => void }>) {
  const [failed, setFailed] = useState(false);
  return <button type="button" className={styles.thumbnail} aria-label={`选择对比图：${image.name}`} aria-pressed={selected} title={image.name} onClick={onSelect}>
    {failed ? <ImageOff size={20} strokeWidth={1.5} aria-hidden="true" /> : <PrivateObjectImage src={image.previewUrl} alt="" loading="lazy" onError={() => setFailed(true)} />}
    {selected && <span className={styles.selected}><Check size={12} strokeWidth={2} /></span>}
  </button>;
}

function CompareSurface({ current, comparison, pool }: Readonly<{ current: CompareImage; comparison: CompareImage | null; pool: PreviewPool }>) {
  const [position, setPosition] = useState(50);
  const [attempt, setAttempt] = useState(0);
  const currentPreview = useComparePreview(current, pool, attempt);
  const comparisonPreview = useComparePreview(comparison, pool, attempt);
  const frameRef = useRef<number | null>(null);
  const nextPositionRef = useRef(50);
  const ready = Boolean(currentPreview?.url && comparisonPreview?.url);
  const failed = currentPreview?.failed || comparisonPreview?.failed;
  useEffect(() => {
    if (frameRef.current !== null) { cancelAnimationFrame(frameRef.current); frameRef.current = null; }
    nextPositionRef.current = 50; Promise.resolve().then(() => setPosition(50));
  }, [comparison?.key]);
  useEffect(() => () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); }, []);
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!ready) return;
    const box = event.currentTarget.getBoundingClientRect();
    if (!box.width) return;
    nextPositionRef.current = Math.max(0, Math.min(100, (event.clientX - box.left) / box.width * 100));
    if (frameRef.current === null) frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null; setPosition(nextPositionRef.current);
    });
  };
  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 2;
    const next = event.key === "Home" ? 0 : event.key === "End" ? 100
      : event.key === "ArrowLeft" ? position - step : event.key === "ArrowRight" ? position + step : null;
    if (next === null || !ready) return;
    event.preventDefault(); event.stopPropagation();
    if (frameRef.current !== null) { cancelAnimationFrame(frameRef.current); frameRef.current = null; }
    setPosition(Math.max(0, Math.min(100, next)));
  };
  return <div className={styles.surface} data-ready={ready || undefined}>
    {currentPreview?.url && <PrivateObjectImage src={currentPreview.url} alt={`当前图片：${current.name}`} className={styles.image} loading="eager" />}
    {ready && <div className={styles.reveal} style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
      <PrivateObjectImage src={comparisonPreview?.url} alt={`对比图：${comparison?.name}`} className={styles.image} loading="eager" />
    </div>}
    {ready && <>
      <span className={`${styles.imageLabel} ${styles.leftLabel}`}>对比图</span>
      <span className={`${styles.imageLabel} ${styles.rightLabel}`}>当前图片</span>
      <div className={styles.divider} style={{ left: `${position}%` }} aria-hidden="true"><span><ArrowLeftRight size={16} strokeWidth={1.7} /></span></div>
    </>}
    <div className={styles.interaction} role="slider" tabIndex={ready ? 0 : -1} aria-label="左右图片对比" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(position)} aria-valuetext={`对比图 ${Math.round(position)}%，当前图片 ${Math.round(100 - position)}%`} aria-orientation="horizontal" aria-disabled={!ready}
      onKeyDown={keyDown} onPointerMove={(event) => { if (event.pointerType === "mouse" || event.buttons !== 0) move(event); }}
      onPointerDown={(event) => { if (!ready) return; event.currentTarget.focus({ preventScroll: true }); event.currentTarget.setPointerCapture(event.pointerId); move(event); }}
      onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} />
    {!ready && <div className={styles.surfaceStatus} role={failed ? "alert" : "status"}>
      {failed ? <><ImageOff size={24} strokeWidth={1.5} /><span>图片暂时无法读取</span><Button variant="ghost" size="sm" onClick={() => { setAttempt((value) => value + 1); }}>重试</Button></>
        : <span>{!currentPreview?.url ? "正在读取图片…" : comparison ? "正在读取对比图…" : "选择一张图片进行对比"}</span>}
    </div>}
  </div>;
}

function CanvasImageCompareDialog({ request, libraryEnabled, onClose }: Readonly<{ request: CompareRequest; libraryEnabled: boolean; onClose: () => void }>) {
  const [pool] = useState(createCanvasImagePreviewPool);
  const [source, setSource] = useState<"references" | "assets">(request.references.length ? "references" : "assets");
  const [comparison, setComparison] = useState<CompareImage | null>(request.references[0] ?? null);
  const [assets, setAssets] = useState<readonly CompareImage[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [readAttempt, setReadAttempt] = useState(0);
  const loadedAttemptRef = useRef(-1);
  const [search, setSearch] = useState("");
  useEffect(() => () => pool.dispose(), [pool]);
  useEffect(() => {
    if (source !== "assets" || !libraryEnabled || (assets !== null && loadedAttemptRef.current === readAttempt)) return;
    let active = true;
    setLoading(true); setReadError(null);
    void Promise.allSettled([listAssets(), listReferenceMaterials(), listAssetOrganization(null)]).then(([generated, uploaded, organization]) => {
      if (!active) return;
      const names = new Map(organization.status === "fulfilled" ? organization.value.arrangements.map((item) => [`${item.kind}:${item.id}`, item.displayName] as const) : []);
      const items: Array<CompareImage & { createdAt: string }> = [];
      if (generated.status === "fulfilled") for (const job of generated.value) for (const [index, output] of job.outputs.entries()) {
        items.push({ ...compareImage("asset", output.id, names.get(`generated:${output.id}`) ?? imageDownloadFilename(job.createdAt, index + 1, output.previewUrl)), createdAt: job.createdAt });
      }
      if (uploaded.status === "fulfilled") for (const item of uploaded.value) items.push({ ...compareImage("reference", item.id, names.get(`reference:${item.id}`) ?? item.name), createdAt: item.uploadedAt });
      const seen = new Set([request.current.key]);
      setAssets(items.sort((left, right) => right.createdAt.localeCompare(left.createdAt)).filter((item) => { if (seen.has(item.key)) return false; seen.add(item.key); return true; }));
      if (generated.status === "rejected" || uploaded.status === "rejected" || organization.status === "rejected") setReadError("部分图片或名称未能读取，请重试。");
      loadedAttemptRef.current = readAttempt;
      setLoading(false);
    });
    return () => { active = false; };
  }, [source, libraryEnabled, request.current.key, readAttempt]);
  const choices = source === "references" ? request.references : (assets ?? []).filter((item) => item.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className={`${styles.dialog} nodrag nopan nowheel nokey`} overlayClassName={styles.overlay} showCloseButton={false}
      onCloseAutoFocus={(event) => { event.preventDefault(); if (request.returnFocusTo.isConnected) request.returnFocusTo.focus({ preventScroll: true }); }}
      onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      <header className={styles.header}>
        <DialogTitle className={styles.title}>图片对比</DialogTitle>
        <DialogDescription className="sr-only">选择参考图或资产图片，横向移动鼠标查看左右变化。方向键调整分界，Home 和 End 查看完整图片。</DialogDescription>
        <DialogClose asChild><Button variant="ghost" size="icon" className={styles.close} aria-label="关闭图片对比"><X size={18} strokeWidth={1.7} /></Button></DialogClose>
      </header>
      <CompareSurface current={request.current} comparison={comparison} pool={pool} />
      <div className={styles.caption}><span title={comparison?.name}>{comparison?.name ?? "对比图"}</span><span className={styles.hint}>移动鼠标查看对比</span><span title={request.current.name}>{request.current.name}</span></div>
      <section className={styles.picker} aria-label="选择对比图">
        <div className={styles.pickerHeader}>
          <div className={styles.sources} role="group" aria-label="对比图来源">
            <Button variant="ghost" size="sm" aria-pressed={source === "references"} onClick={() => setSource("references")}>参考图</Button>
            <Button variant="ghost" size="sm" aria-pressed={source === "assets"} onClick={() => setSource("assets")}>资产</Button>
          </div>
          {source === "assets" && libraryEnabled && <Input className={styles.search} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索图片" aria-label="搜索资产图片" />}
        </div>
        {readError && source === "assets" && <div className={styles.readError} role="alert"><span>{readError}</span><Button size="sm" variant="ghost" disabled={loading} onClick={() => setReadAttempt((value) => value + 1)}>重试</Button></div>}
        <div className={styles.choices} aria-busy={source === "assets" && loading}>
          {choices.map((item) => <CompareThumbnail key={item.key} image={item} selected={comparison?.key === item.key} onSelect={() => setComparison(item)} />)}
          {!choices.length && <div className={styles.empty} role="status">{source === "references" ? <><span>这张图片没有参考图</span><Button variant="ghost" size="sm" onClick={() => setSource("assets")}>从资产选择</Button></>
            : !libraryEnabled ? "登录后可从资产选择图片" : loading ? "正在读取资产…" : search.trim() ? "没有找到匹配的图片" : readError ? "图片列表暂时无法读取" : "资产中暂无其他图片"}</div>}
        </div>
      </section>
    </DialogContent>
  </Dialog>;
}
