"use client";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Handle, NodeToolbar, Position, useReactFlow, useStore, type NodeProps } from "@xyflow/react";
import { ChevronDown, Download, FileText, Film, LoaderCircle, Maximize2, Play, Plus, RotateCcw, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Attachment, AttachmentGroup } from "@/components/ui/attachment";
import { CreditIcon } from "@/components/ui/credit-icon";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import { privateImageUrls } from "@/shared/private-image-urls.mjs";
import { VIDEO_GENERATION_MODELS, VIDEO_GENERATION_TYPES, VIDEO_ROLE_LABELS, VIDEO_ACTIVE_STATES, defaultVideoRole, videoRolesForType, videoGenerationProblem,
  type CanvasVideoGenerationDraft, type VideoGenerationInput, type VideoGenerationMedia, type VideoGenerationStatus, type VideoGenerationType, type VideoMaterial, type VideoRole } from "@/shared/contracts/video-generation.mjs";
import { listPrivateVideoMaterials } from "@/features/creation/http-video-materials";
import { CanvasTextGenerationContext as CanvasGenerationContext } from "./canvas-text-generation-context";
import { canvasTextGenerationInputs } from "./canvas-text-generation-input";
import { CanvasImageResizeControls } from "./canvas-image-resize-controls";
import { CanvasMediaMetadata } from "./canvas-media-metadata";
import { fittedCanvasVideoSize } from "./canvas-video-size";
import { attachCanvasVideoPreviewPlayback } from "./canvas-video-preview-playback.mjs";
import { uploadCanvasAssetFile, CANVAS_ASSET_LIBRARY_UPDATED_EVENT } from "./canvas-asset-upload";
import { CanvasVideoMaterialPicker, type VideoPickerMaterial } from "./canvas-video-material-picker";
import { CanvasVideoGeneratorPrompt } from "./canvas-video-generator-prompt";
import { CanvasVideoGeneratorSettings } from "./canvas-video-generator-settings";
import { CanvasVideoGenerationError, quoteCanvasVideo, submitCanvasVideo, readCanvasVideo, downloadCanvasVideo, retryCanvasVideoSave, retryCanvasVideo, type VideoCreditQuote } from "./http-video-generation";
import type { CanvasNode, CanvasVideoGeneratorNodeType } from "./canvas-workspace";
import workspaceStyles from "./canvas-workspace.module.css";
import composerStyles from "./canvas-page.module.css";
import styles from "./canvas-video-generator-node.module.css";

export type CanvasVideoGeneratorNodeData = Record<string, unknown> & {
  videoGeneration: CanvasVideoGenerationDraft; job?: VideoGenerationStatus; outputAssetId?: string; previewUrl?: string;
  pixelWidth?: number; pixelHeight?: number; durationSeconds?: number;
};
type InputView = { key: string; kind: "image" | "video" | "text"; name: string; edgeId?: string; previewUrl?: string; text?: string;
  material?: VideoMaterial; role?: VideoRole; unavailable?: boolean };
const phaseLabels = { queued: "排队中", submitting: "提交中", submission_unknown: "提交结果待确认", running: "生成中", saving: "保存中", save_failed: "保存暂未完成", succeeded: "已完成", failed: "生成未完成" };
function VideoPreview({ url, className, label, controls = false }: Readonly<{ url: string; className?: string; label: string; controls?: boolean }>) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!ref.current || controls) return;
    const video = ref.current; const playback = attachCanvasVideoPreviewPlayback(video, { page: document, reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)") });
    playback.setEnabled(true); playback.setHovering(true);
    return () => playback.dispose();
  }, [url, controls]);
  return <video ref={ref} src={url} className={className} controls={controls} muted={!controls} playsInline loop={!controls} preload="metadata" aria-label={label} />;
}
export function CanvasVideoGeneratorNode({ id, data, selected, width }: NodeProps<CanvasVideoGeneratorNodeType>) {
  const flow = useReactFlow<CanvasNode>(); const context = useContext(CanvasGenerationContext);
  const nodes = useStore((state) => state.nodes as CanvasNode[]); const edges = useStore((state) => state.edges);
  const zoom = useStore((state) => state.transform[2]); const viewportWidth = useStore((state) => state.width);
  const screenLeft = useStore((state) => (state.nodeLookup.get(id)?.internals.positionAbsolute.x ?? 0) * state.transform[2] + state.transform[0]);
  const [modelOpen, setModelOpen] = useState(false); const [typeOpen, setTypeOpen] = useState(false); const [parametersOpen, setParametersOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false); const [viewerOpen, setViewerOpen] = useState(false); const [priceRevision, setPriceRevision] = useState(0);
  const [uploading, setUploading] = useState(false); const [posting, setPosting] = useState(false); const [message, setMessage] = useState("");
  const [quote, setQuote] = useState<VideoCreditQuote | null>(null); const [retryQuote, setRetryQuote] = useState<VideoCreditQuote | null>(null); const [quoteError, setQuoteError] = useState(""); const [pollRevision, setPollRevision] = useState(0);
  const [directPreviews, setDirectPreviews] = useState<Record<string, string>>({}); const [playing, setPlaying] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null); const videoRef = useRef<HTMLVideoElement>(null);
  const playbackRef = useRef<ReturnType<typeof attachCanvasVideoPreviewPlayback> | null>(null);
  const scope = `${context.ownerKey}:${context.workspaceId ?? "personal"}:${context.pageId}`;
  const scopeRef = useRef(scope); scopeRef.current = scope;
  const mounted = useRef(true); useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const noticesRef = useRef(new Set<string>()); const actionRef = useRef(false);
  const previewRefreshAttempted = useRef(false);
  useEffect(() => { previewRefreshAttempted.current = false; }, [data.outputAssetId]);
  const draft = data.videoGeneration; const job = data.job;
  const active = Boolean(draft.requestId && (!job || VIDEO_ACTIVE_STATES.includes(job.state) || ["submission_unknown", "save_failed"].includes(job.state)));
  const locked = active || posting || uploading || !context.enabled;
  const sequence = Math.max(1, nodes.filter((node) => node.type === "videoGenerator").findIndex((node) => node.id === id) + 1);
  const title = `视频生成 ${sequence}`;
  const connected = canvasTextGenerationInputs(nodes, edges, id);
  const combinedPrompt = [...connected.filter((item) => item.kind === "text").map((item) => item.text ?? ""), draft.prompt].map((text) => text.trim()).filter(Boolean).join("\n\n");
  let imageIndex = 0;
  const views: InputView[] = [
    ...connected.map((item): InputView => {
      const material: VideoMaterial | undefined = item.kind === "image" && item.media ? { kind: "image", assetKind: item.media.assetKind, assetId: item.media.assetId, name: item.name }
        : item.kind === "video" && item.videoAssetId ? { kind: "video", assetKind: "video", assetId: item.videoAssetId, name: item.name } : undefined;
      const key = `edge:${item.edgeId}`; const role = item.kind !== "text" ? draft.roles[key] ?? defaultVideoRole(draft.type, item.kind, item.kind === "image" ? imageIndex++ : 0) : undefined;
      return { key, edgeId: item.edgeId, kind: item.kind, name: item.name, material, role, previewUrl: item.previewUrl, text: item.text, unavailable: item.unavailable };
    }),
    ...draft.materials.map((item): InputView => {
      const key = `direct:${item.assetKind}:${item.assetId}`;
      return { key, kind: item.kind, name: item.name, material: item, role: draft.roles[key] ?? item.role ?? defaultVideoRole(draft.type, item.kind, item.kind === "image" ? imageIndex++ : 0),
        previewUrl: item.kind === "image" ? privateImageUrls(item.assetKind === "generated" ? "asset" : "reference", item.assetId).previewUrl : directPreviews[item.assetId],
        unavailable: item.kind === "video" && !directPreviews[item.assetId] };
    }),
  ];
  const media: VideoGenerationMedia[] = views.flatMap((view) => view.material && view.role ? [{ ...view.material, role: view.role }] : []);
  const hasFeatureVideo = media.some((item) => item.role === "feature_video");
  const fields = { modelId: draft.modelId, type: draft.type, prompt: combinedPrompt, resolution: draft.resolution, duration: draft.duration, aspectRatio: draft.aspectRatio,
    audio: hasFeatureVideo ? "off" as const : draft.audio, multiShot: hasFeatureVideo || draft.multiShot, characterOrientation: draft.characterOrientation, shots: draft.shots };
  const problem = views.some((view) => view.unavailable) ? "连接素材尚未就绪。" : views.some((view) => view.kind !== "text" && !view.role) ? "当前生成类型不支持这份素材，请切换类型或移除素材。" : videoGenerationProblem({ ...fields, media });
  const motionVideoId = media.find((item) => item.kind === "video")?.assetId;
  const quoteInput = useMemo(() => ({ modelId: draft.modelId, type: draft.type, resolution: draft.resolution, duration: draft.duration, characterOrientation: draft.characterOrientation,
    ...(draft.type === "motion_control" && motionVideoId ? { videoAssetId: motionVideoId } : {}) }), [draft.modelId, draft.type, draft.resolution, draft.duration, draft.characterOrientation, motionVideoId]);
  const updateDraft = (patch: Partial<CanvasVideoGenerationDraft>) => { flow.updateNodeData(id, (node) => node.type === "videoGenerator" ? { videoGeneration: { ...node.data.videoGeneration, ...patch } } : {}); };
  const validScope = (expected: string) => mounted.current && scopeRef.current === expected && flow.getNode(id)?.type === "videoGenerator";
  const receive = (status: VideoGenerationStatus, expectedScope: string) => {
    if (!validScope(expectedScope)) return;
    const node = flow.getNode(id); if (node?.type !== "videoGenerator" || node.data.videoGeneration.requestId !== status.requestId) return;
    if (JSON.stringify(node.data.job) !== JSON.stringify(status)) flow.updateNodeData(id, { job: status,
      ...(status.output ? { outputAssetId: status.output.id, previewUrl: status.output.url, pixelWidth: status.output.pixelWidth, pixelHeight: status.output.pixelHeight, durationSeconds: status.output.durationSeconds } : {}) });
    if (["succeeded", "failed"].includes(status.state) && !noticesRef.current.has(status.requestId)) {
      noticesRef.current.add(status.requestId); context.onBillingChanged();
      if (status.output) window.dispatchEvent(new CustomEvent(CANVAS_ASSET_LIBRARY_UPDATED_EVENT, { detail: { ownerKey: context.ownerKey } }));
    }
  };
  useEffect(() => {
    setQuote(null); setQuoteError(""); if (!context.enabled || !selected) return;
    if (quoteInput.type === "motion_control" && !quoteInput.videoAssetId) { setQuoteError("添加动作视频后显示积分"); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(() => { void quoteCanvasVideo(quoteInput, context.workspaceId, controller.signal).then(setQuote).catch((error: unknown) => {
      if (!controller.signal.aborted) setQuoteError(error instanceof Error ? error.message : "暂时无法读取视频价格。");
    }); }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [context.enabled, context.workspaceId, scope, selected, quoteInput, priceRevision]);
  const directVideoIds = draft.materials.filter((item) => item.kind === "video").map((item) => item.assetId).join(",");
  useEffect(() => {
    setRetryQuote(null); const frozen = draft.lastInput;
    if (job?.state !== "failed" || !frozen || !context.enabled) return;
    const controller = new AbortController();
    void quoteCanvasVideo({ modelId: frozen.modelId, type: frozen.type, resolution: frozen.resolution, duration: frozen.duration, characterOrientation: frozen.characterOrientation,
      ...(frozen.type === "motion_control" ? { videoAssetId: frozen.media.find((item) => item.kind === "video")?.assetId } : {}) }, context.workspaceId, controller.signal).then((value) => { if (!controller.signal.aborted) setRetryQuote(value); }).catch(() => {});
    return () => controller.abort();
  }, [job?.state, draft.lastInput, context.enabled, context.workspaceId, scope, priceRevision]);
  useEffect(() => {
    if (!context.enabled || !directVideoIds) return;
    const controller = new AbortController();
    void listPrivateVideoMaterials(context.workspaceId, controller.signal).then((items) => { if (!controller.signal.aborted) setDirectPreviews((current) => ({ ...current, ...Object.fromEntries(items.map((item) => [item.id, item.url])) })); }).catch(() => {});
    return () => controller.abort();
  }, [directVideoIds, scope, context.enabled, context.workspaceId]);
  useEffect(() => {
    const requestId = draft.requestId; if (!requestId || !context.enabled) return;
    const controller = new AbortController(); let timer: number | undefined;
    const poll = async () => {
      try {
        const status = await readCanvasVideo(requestId, context.workspaceId, controller.signal); if (controller.signal.aborted) return;
        receive(status, scope); setMessage("");
        if (!VIDEO_ACTIVE_STATES.includes(status.state)) return;
      } catch (error) {
        if (controller.signal.aborted) return;
        setMessage(error instanceof CanvasVideoGenerationError && error.code === "VIDEO_NOT_FOUND" ? "正在确认提交状态，请勿重复生成。" : "连接暂时中断，任务会继续进行。");
      }
      timer = window.setTimeout(() => { void poll(); }, 5000);
    };
    void poll(); return () => { controller.abort(); window.clearTimeout(timer); };
    // Task identity and scope own this recovery loop; edits do not create a new paid request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.requestId, context.enabled, context.workspaceId, scope, pollRevision]);
  useEffect(() => {
    if (!selected || locked) { setModelOpen(false); setTypeOpen(false); if (!selected) setParametersOpen(false); }
  }, [selected, locked]);
  useEffect(() => {
    const video = videoRef.current; if (!video || !data.previewUrl) return;
    const playback = attachCanvasVideoPreviewPlayback(video, { page: document, reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)") });
    playback.setEnabled(true); playbackRef.current = playback;
    return () => { playbackRef.current = null; playback.dispose(); };
  }, [data.previewUrl]);
  useEffect(() => {
    if (!selected) return;
    let first = 0;
    let second = 0;
    first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        const surface = document.getElementById("canvas-workspace-surface");
        const toolbar = Array.from(document.querySelectorAll<HTMLElement>(".react-flow__node-toolbar"))
          .find((element) => element.dataset.id === id && element.classList.contains(workspaceStyles.generatorToolbar));
        if (!surface || !toolbar) return;
        const overflow = toolbar.getBoundingClientRect().bottom - surface.getBoundingClientRect().bottom + 14;
        if (overflow > 0) {
          const viewport = flow.getViewport();
          void flow.setViewport({ ...viewport, y: viewport.y - overflow }, { duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 180 });
        }
      });
    });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [flow, id, selected]);
  const changeType = (type: VideoGenerationType) => {
    const motion = type === "motion_control";
    updateDraft({ type, modelId: motion ? "kling-3.0" : "kling-3.0-omni", resolution: motion && draft.resolution === "4k" ? "1080p" : draft.resolution,
      audio: motion ? "original" : type === "video_edit" ? "off" : draft.audio === "original" ? "off" : draft.audio,
      multiShot: type === "video_edit" || motion ? false : draft.multiShot, shots: type === "video_edit" || motion ? [] : draft.shots });
  };
  const addMaterial = (item: VideoPickerMaterial) => {
    const current = flow.getNode(id); if (current?.type !== "videoGenerator" || locked) return;
    if (current.data.videoGeneration.materials.some((material) => material.assetId === item.assetId && material.assetKind === item.assetKind)) return;
    if (views.filter((view) => view.kind !== "text").length >= 8) { setMessage("一次最多添加八份图片或视频素材。"); return; }
    setDirectPreviews((value) => ({ ...value, [item.assetId]: item.previewUrl }));
    const { previewUrl: _preview, ...material } = item;
    updateDraft({ materials: [...current.data.videoGeneration.materials, material] });
  };
  const upload = async (files: File[]) => {
    if (locked || actionRef.current || !files.length) return;
    const expected = scope; setUploading(true); setMessage("");
    try {
      const capacity = Math.max(0, 8 - views.filter((view) => view.kind !== "text").length);
      for (const file of files.slice(0, capacity)) {
        if (!["image/jpeg", "image/png", "video/mp4"].includes(file.type)) throw new Error("支持 JPG、PNG 图片和 MP4 视频。");
        const asset = await uploadCanvasAssetFile(file, crypto.randomUUID()); if (!validScope(expected)) return;
        const current = flow.getNode(id); if (current?.type !== "videoGenerator" || asset.kind === "audio") continue;
        const material: VideoMaterial = { kind: asset.kind === "video" ? "video" : "image", assetKind: asset.kind, assetId: asset.id, name: file.name.slice(0, 255) };
        if (!current.data.videoGeneration.materials.some((item) => item.assetKind === material.assetKind && item.assetId === material.assetId)) flow.updateNodeData(id, { videoGeneration: { ...current.data.videoGeneration, materials: [...current.data.videoGeneration.materials, material] } });
      }
      if (validScope(expected)) window.dispatchEvent(new CustomEvent(CANVAS_ASSET_LIBRARY_UPDATED_EVENT, { detail: { ownerKey: context.ownerKey } }));
    } catch (error) { if (validScope(expected)) setMessage(error instanceof Error ? error.message : "素材上传失败，请重试。"); }
    finally { if (validScope(expected)) setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };
  const generate = async (retry = false) => {
    const acceptedQuote = retry ? retryQuote : quote;
    if (actionRef.current || locked || !acceptedQuote || !retry && problem) return;
    const expected = scope; const previousId = draft.requestId; const requestId = crypto.randomUUID();
    actionRef.current = true; setPosting(true); setMessage("");
    try {
      const projectId = context.beforeGenerate();
      const input: VideoGenerationInput = retry && draft.lastInput ? { ...draft.lastInput, requestId, quotedCredits: acceptedQuote.credits }
        : { ...fields, requestId, projectId, media, quotedCredits: acceptedQuote.credits };
      flow.updateNodeData(id, { videoGeneration: { ...draft, requestId, lastInput: input }, job: undefined, outputAssetId: undefined, previewUrl: undefined, pixelWidth: undefined, pixelHeight: undefined, durationSeconds: undefined });
      const status = retry && previousId ? await retryCanvasVideo(previousId, { requestId, quotedCredits: acceptedQuote.credits }, context.workspaceId, AbortSignal.timeout(120_000))
        : await submitCanvasVideo(input, context.workspaceId, AbortSignal.timeout(120_000));
      receive(status, expected); if (validScope(expected)) context.onBillingChanged();
    } catch (error) {
      if (!validScope(expected)) return;
      setMessage(error instanceof Error ? error.message : "提交连接中断，正在确认任务状态。");
      if (error instanceof CanvasVideoGenerationError && ((error.status ?? 0) >= 400 && (error.status ?? 0) < 500 || ["VIDEO_PROVIDER_UNAVAILABLE"].includes(error.code))) {
        const current = flow.getNode(id); if (current?.type === "videoGenerator" && current.data.videoGeneration.requestId === requestId) flow.updateNodeData(id, { videoGeneration: { ...current.data.videoGeneration, requestId: previousId, lastInput: draft.lastInput }, job });
        if (error.code === "VIDEO_PRICE_CHANGED") setPriceRevision((value) => value + 1);
      }
    } finally { actionRef.current = false; if (validScope(expected)) setPosting(false); }
  };
  const retrySave = async () => {
    if (!context.enabled || !draft.requestId || actionRef.current) return; actionRef.current = true; const expected = scope; setMessage("");
    try { receive(await retryCanvasVideoSave(draft.requestId, context.workspaceId, AbortSignal.timeout(15_000)), expected); if (validScope(expected)) setPollRevision((value) => value + 1); }
    catch (error) { if (validScope(expected)) setMessage(error instanceof Error ? error.message : "保存暂不可用，请稍后重试。"); }
    finally { actionRef.current = false; }
  };
  const nodeWidth = width ?? 320; const visibleLeft = typeof document === "undefined" ? 0 : document.getElementById("canvas-asset-sidebar")?.getBoundingClientRect().right ?? 0;
  const desiredWidth = Math.min(660, Math.max(120, viewportWidth - visibleLeft - 30));
  const center = screenLeft + nodeWidth * zoom / 2; let align: "start" | "center" | "end" = "center"; let toolbarWidth = desiredWidth;
  if (center - desiredWidth / 2 < visibleLeft + 15) { align = "start"; toolbarWidth = Math.min(desiredWidth, Math.max(120, viewportWidth - screenLeft - 15)); }
  else if (center + desiredWidth / 2 > viewportWidth - 15) { align = "end"; toolbarWidth = Math.min(desiredWidth, Math.max(120, screenLeft + nodeWidth * zoom - visibleLeft - 15)); }
  const ready = !locked && !problem && Boolean(quote); const motion = draft.type === "motion_control";
  const type = VIDEO_GENERATION_TYPES.find((item) => item.id === draft.type)!;
  const sendHint = !context.enabled ? "画布准备好后可生成" : locked ? "当前任务进行中" : problem || quoteError || "生成视频（Ctrl/⌘ + Enter）";
  const validationNotice = problem === "请输入视频描述。" ? "" : problem;
  const inlineNotice = message || job?.error?.message || (!active && (validationNotice || quoteError));
  return <TooltipProvider delayDuration={180}>
    <CanvasMediaMetadata kind="video" name={title} nodeWidth={width} pixelWidth={data.pixelWidth} pixelHeight={data.pixelHeight} />
    <article className={`${workspaceStyles.generatorNode} ${styles.result} ${active && job?.state !== "save_failed" && job?.state !== "submission_unknown" ? workspaceStyles.generatorShimmering : ""}`}
      aria-label={title} aria-busy={active || undefined} onMouseEnter={() => playbackRef.current?.setHovering(true)} onMouseLeave={() => playbackRef.current?.setHovering(false)}>
      {data.previewUrl ? <>
        <video ref={videoRef} src={data.previewUrl} className={styles.video} muted playsInline loop preload="metadata" aria-label={`${title}预览`}
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => {
            if (previewRefreshAttempted.current) { setMessage("视频预览暂不可用，请重新打开画布。"); return; }
            previewRefreshAttempted.current = true;
            if (draft.requestId) void readCanvasVideo(draft.requestId, context.workspaceId, AbortSignal.timeout(15_000)).then((status) => receive(status, scope)).catch(() => { if (validScope(scope)) setMessage("视频预览暂不可用，请重新查询任务。"); });
            else if (data.outputAssetId) void listPrivateVideoMaterials(context.workspaceId).then((items) => {
              const material = items.find((item) => item.id === data.outputAssetId); if (validScope(scope) && material) flow.updateNodeData(id, { previewUrl: material.url });
            }).catch(() => { if (validScope(scope)) setMessage("视频预览暂不可用，请重新打开画布。"); });
          }}
          onLoadedMetadata={(event) => { previewRefreshAttempted.current = false; const video = event.currentTarget; const current = flow.getNode(id); if (current?.type !== "videoGenerator") return;
            const size = fittedCanvasVideoSize({ width: Number(current.style?.width ?? current.width ?? 320), height: Number(current.style?.height ?? current.height ?? 180) }, video.videoWidth, video.videoHeight);
            if (size && (current.data.pixelWidth !== video.videoWidth || current.data.pixelHeight !== video.videoHeight || Math.abs(Number(current.style?.width) / Number(current.style?.height) - video.videoWidth / video.videoHeight) > .01)) flow.updateNode(id, { style: { ...current.style, ...size }, data: { ...current.data, pixelWidth: video.videoWidth, pixelHeight: video.videoHeight, durationSeconds: video.duration } });
          }} />
        {!playing && <button type="button" className={`${styles.play} nodrag nopan`} aria-label="播放视频" onClick={(event) => { event.stopPropagation(); void videoRef.current?.play().catch(() => {}); }}><Play size={17} fill="currentColor" /></button>}
        <div className={`${styles.resultTools} nodrag nopan`}><button type="button" aria-label="查看视频" onClick={() => setViewerOpen(true)}><Maximize2 size={14} /></button>
          {draft.requestId && <button type="button" aria-label="下载视频" onClick={() => { if (draft.requestId) void downloadCanvasVideo(draft.requestId, context.workspaceId, AbortSignal.timeout(15_000)).then(({ url }) => {
            if (!validScope(scope)) return; const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${title}.mp4`; anchor.rel = "noopener"; document.body.append(anchor); anchor.click(); anchor.remove();
          }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : "视频暂时无法下载。")); }}><Download size={14} /></button>}</div>
      </> : job || draft.requestId ? <div className={styles.phase} aria-live="polite">
        {job?.state === "failed" ? <button type="button" className={`${workspaceStyles.generatorSlotRetry} nodrag nopan`} disabled={locked || !retryQuote} onClick={() => void generate(true)}><RotateCcw size={18} /><span>重试{retryQuote ? ` · ${retryQuote.credits} 积分` : ""}</span></button>
          : job?.state === "save_failed" ? <button type="button" className={`${workspaceStyles.generatorSlotRetry} nodrag nopan`} disabled={!context.enabled} onClick={() => void retrySave()}><RotateCcw size={18} /><span>重试保存</span></button>
          : job?.state === "submission_unknown" ? <button type="button" className={`${workspaceStyles.generatorSlotRetry} nodrag nopan`} onClick={() => setPollRevision((value) => value + 1)}><RotateCcw size={18} /><span>查询状态</span></button>
          : job?.state === "succeeded" ? <><Film size={24} /><span>视频已从资产移除</span></>
          : <><LoaderCircle size={22} className={styles.spinner} /><span>{job ? phaseLabels[job.state] : "确认任务中"}</span>{job?.progress !== null && job?.progress !== undefined && <progress aria-label="视频生成进度" value={job.progress} max={100} />}</>}
      </div> : <Film size={28} aria-hidden="true" />}
    </article>
    {selected && <CanvasImageResizeControls />}
    <Handle type="target" position={Position.Left} id="reference" className={workspaceStyles.generatorInputHandle} aria-label="接收文本、图片或视频" />
    <Handle type="source" position={Position.Right} id="video" className={workspaceStyles.referenceOutputHandle} aria-label="输出视频" />
    <NodeToolbar isVisible={selected} position={Position.Bottom} offset={12} align={align} className={`${workspaceStyles.generatorToolbar} nodrag nopan nowheel`} style={{ width: toolbarWidth }}>
      <section className={`${composerStyles.composer} ${composerStyles.composerAttached}`} aria-label="视频生成工具" onPointerDown={(event) => event.stopPropagation()} onWheel={(event) => event.stopPropagation()}>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,video/mp4" multiple hidden onChange={(event) => void upload(Array.from(event.target.files ?? []))} />
        <AttachmentGroup className={`${composerStyles.referenceTray} ${styles.tray}`} role="group" aria-label="输入附件">
          {views.map((view) => <div key={view.key} className={styles.material} data-unavailable={view.unavailable || undefined}
            data-invalid={view.kind !== "text" && (!view.role || !videoRolesForType(draft.type, view.kind).includes(view.role)) || undefined}>
            <Attachment className={composerStyles.reference} size="xs" state={view.unavailable ? "error" : "done"}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className={view.kind === "text" || !view.previewUrl ? composerStyles.referenceTextTrigger : composerStyles.referenceImageTrigger} aria-label={`预览 ${view.name}`}>
                    {view.kind === "image" && view.previewUrl ? <PrivateObjectImage src={view.previewUrl} alt="" />
                      : view.kind === "video" && view.previewUrl ? <video src={view.previewUrl} className={styles.referenceVideo} muted playsInline preload="metadata" />
                      : view.kind === "text" ? <FileText size={20} strokeWidth={1.5} aria-hidden="true" /> : <Film size={20} strokeWidth={1.5} aria-hidden="true" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" align="center" sideOffset={8} hideArrow className={composerStyles.referencePreview}>
                  {view.kind === "image" && view.previewUrl ? <PrivateObjectImage src={view.previewUrl} alt={view.name} loading="eager" />
                    : view.kind === "video" && view.previewUrl ? <VideoPreview url={view.previewUrl} label={view.name} className={styles.previewVideo} />
                    : <p className={composerStyles.referenceTextPreview}>{view.text || view.name}</p>}
                </TooltipContent>
              </Tooltip>
              {view.kind !== "text" && <span className={composerStyles.referenceNumber} aria-hidden="true">{views.filter((item) => item.kind !== "text").findIndex((item) => item.key === view.key) + 1}</span>}
              <button type="button" className={composerStyles.referenceRemove} disabled={locked} aria-label={`移除 ${view.name}`} onClick={() => {
                if (view.edgeId) context.onRemoveInput(view.edgeId);
                else updateDraft({ materials: draft.materials.filter((item) => `direct:${item.assetKind}:${item.assetId}` !== view.key) });
              }}><X size={12} aria-hidden="true" /></button>
            </Attachment>
            {view.kind !== "text" && <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild><button type="button" className={styles.role} disabled={locked || !videoRolesForType(draft.type, view.kind).length}
                aria-label={`设置 ${view.name} 的用途`}>{view.role ? VIDEO_ROLE_LABELS[view.role] : "不支持"}<ChevronDown size={9} aria-hidden="true" /></button></DropdownMenuTrigger>
              <DropdownMenuContent className="nodrag nopan nowheel"><DropdownMenuRadioGroup value={view.role ?? ""} onValueChange={(role) => updateDraft({ roles: { ...draft.roles, [view.key]: role as VideoRole } })}>
                {videoRolesForType(draft.type, view.kind).map((role) => <DropdownMenuRadioItem key={role} value={role}>{VIDEO_ROLE_LABELS[role]}</DropdownMenuRadioItem>)}
              </DropdownMenuRadioGroup></DropdownMenuContent>
            </DropdownMenu>}
          </div>)}
        </AttachmentGroup>
        <CanvasVideoGeneratorPrompt id={`video-prompt-${id}`} value={draft.prompt} readOnly={locked} maxLength={motion ? 2500 : 3072} width={toolbarWidth}
          placeholder={connected.some((item) => item.kind === "text") ? "补充视频描述（追加在连接文本之后）…" : `${type.hint}…`} canGenerate={ready}
          onInteract={() => { setModelOpen(false); setTypeOpen(false); setParametersOpen(false); }}
          onChange={(prompt) => { setMessage(""); updateDraft({ prompt }); }} onGenerate={() => void generate()} />
        <div className={`${composerStyles.tools} ${styles.footer}`}>
          <div className={styles.controls}>
            <DropdownMenu modal={false}>
              <Tooltip>
                <TooltipTrigger asChild><DropdownMenuTrigger asChild data-slot="button">
                  <Button type="button" variant="ghost" size="sm" className={`${composerStyles.settingsTrigger} ${styles.materialAdd}`}
                    disabled={locked || views.filter((view) => view.kind !== "text").length >= 8} aria-label="添加素材">
                    {uploading ? <LoaderCircle size={15} className={styles.spinner} /> : <Plus size={16} strokeWidth={1.5} aria-hidden="true" />}
                  </Button>
                </DropdownMenuTrigger></TooltipTrigger>
                <TooltipContent>添加素材</TooltipContent>
              </Tooltip>
              <DropdownMenuContent className="nodrag nopan nowheel">
                <DropdownMenuItem onSelect={() => fileRef.current?.click()}><Upload size={14} />本地上传</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setPickerOpen(true)}><Film size={14} />从资产选择</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Popover open={parametersOpen} onOpenChange={(open) => { setParametersOpen(open); if (open) { setModelOpen(false); setTypeOpen(false); } }}>
              <PopoverTrigger asChild data-slot="button">
                <Button type="button" variant="ghost" size="sm" className={composerStyles.settingsTrigger} disabled={locked} aria-label="视频参数"
                  aria-controls={`video-parameters-${id}`}>
                  {!motion && <>{media.some((item) => ["first_frame", "feature_video", "base_video"].includes(item.role)) ? "跟随素材" : draft.aspectRatio} · </>}
                  {draft.resolution === "4k" ? "4K" : draft.resolution}{!motion && <> · {draft.duration}s</>}
                  <ChevronDown size={13} aria-hidden="true" />
                </Button>
              </PopoverTrigger>
              <CanvasVideoGeneratorSettings id={`video-parameters-${id}`} draft={draft} media={media} disabled={locked} onChange={updateDraft} />
            </Popover>
            <Select open={typeOpen} onOpenChange={(open) => { setTypeOpen(open); if (open) { setModelOpen(false); setParametersOpen(false); } }} value={draft.type}
              onValueChange={(value) => changeType(value as VideoGenerationType)} disabled={locked}>
              <SelectTrigger size="sm" className={`${composerStyles.modelSelect} ${styles.typeSelect}`} aria-label="生成类型"><SelectValue /></SelectTrigger>
              <SelectContent position="popper" align="start" className={`${composerStyles.modelMenu} nodrag nopan nowheel`}>
                {VIDEO_GENERATION_TYPES.filter((item) => item.modelId === draft.modelId).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <span className={composerStyles.toolSpacer} />
          <div className={styles.actions}>
            <Select open={modelOpen} onOpenChange={(open) => { setModelOpen(open); if (open) { setTypeOpen(false); setParametersOpen(false); } }} value={draft.modelId}
              onValueChange={(value) => changeType(value === "kling-3.0" ? "motion_control" : "text_to_video")} disabled={locked}>
              <SelectTrigger size="sm" className={composerStyles.modelSelect} aria-label="视频模型"><SelectValue /></SelectTrigger>
              <SelectContent position="popper" align="end" className={`${composerStyles.modelMenu} nodrag nopan nowheel`}>
                {VIDEO_GENERATION_MODELS.map((item) => <SelectItem key={item.id} value={item.id}><Film size={16} strokeWidth={1.5} aria-hidden="true" />{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Tooltip><TooltipTrigger asChild><span>
              <Button type="button" className={composerStyles.generate} disabled={!ready} aria-busy={posting}
                aria-label={quote ? `生成视频，本次 ${quote.credits} 积分` : "生成视频，当前规格暂无报价"} onClick={() => void generate()}>
                <span className={composerStyles.generateCost}>
                  {posting ? <LoaderCircle className={`size-[1em] ${composerStyles.loadingIcon}`} /> : <CreditIcon className="size-[1em]" />}
                  {quote?.credits ?? "—"}
                </span>
              </Button>
            </span></TooltipTrigger><TooltipContent>{sendHint}</TooltipContent></Tooltip>
          </div>
        </div>
        {inlineNotice && <div className={composerStyles.message} role={message || job?.error ? "alert" : "status"}><span>{inlineNotice}</span>
          {job?.state === "submission_unknown" && <button type="button" onClick={() => setPollRevision((value) => value + 1)}>重新查询</button>}</div>}
        {job?.error && <details className={styles.diagnostics}><summary>错误详情</summary><pre>{JSON.stringify({ requestId: job.requestId, ...job.error.diagnostics }, null, 2)}</pre></details>}
      </section>
    </NodeToolbar>
    <CanvasVideoMaterialPicker open={pickerOpen && !locked} onOpenChange={setPickerOpen} workspaceId={context.workspaceId} ownerKey={context.ownerKey} onSelect={addMaterial} selectedKeys={media.map((item) => `${item.assetKind}:${item.assetId}`)} />
    <Dialog open={viewerOpen && Boolean(data.previewUrl)} onOpenChange={setViewerOpen}><DialogContent className="nodrag nopan nowheel sm:max-w-4xl"><DialogTitle>{title}</DialogTitle><DialogDescription className="sr-only">播放生成的视频</DialogDescription>{data.previewUrl && <VideoPreview url={data.previewUrl} label={title} controls className={styles.viewerVideo} />}</DialogContent></Dialog>
  </TooltipProvider>;
}
