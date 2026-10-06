"use client";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Handle, NodeToolbar, Position, useReactFlow, useStore, type NodeProps } from "@xyflow/react";
import { ChevronDown, Download, FileText, Film, LoaderCircle, Maximize2, Play, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Attachment, AttachmentGroup } from "@/components/ui/attachment";
import { CreditIcon } from "@/components/ui/credit-icon";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import { KlingModelIcon } from "@/features/models/kling-model-icon";
import { privateImageUrls } from "@/shared/private-image-urls.mjs";
import { VIDEO_GENERATION_MODELS, VIDEO_GENERATION_TYPES, VIDEO_ACTIVE_STATES, defaultVideoRole, videoGenerationProblem,
  type CanvasVideoGenerationDraft, type VideoGenerationInput, type VideoGenerationMedia, type VideoGenerationStatus, type VideoGenerationType, type VideoMaterial, type VideoModelId, type VideoRole } from "@/shared/contracts/video-generation.mjs";
import { listPrivateVideoMaterials } from "@/features/creation/http-video-materials";
import { CanvasTextGenerationContext as CanvasGenerationContext } from "./canvas-text-generation-context";
import { canvasTextGenerationInputs } from "./canvas-text-generation-input";
import { CanvasImageResizeControls } from "./canvas-image-resize-controls";
import { CanvasMediaMetadata } from "./canvas-media-metadata";
import { CanvasVideoGenerationProgress } from "./canvas-video-generation-feedback";
import { fittedCanvasVideoSize } from "./canvas-video-size";
import { attachCanvasVideoPreviewPlayback } from "./canvas-video-preview-playback.mjs";
import { CANVAS_ASSET_LIBRARY_UPDATED_EVENT } from "./canvas-asset-upload";
import { CanvasVideoGeneratorPrompt } from "./canvas-video-generator-prompt";
import { CanvasVideoGeneratorSettings } from "./canvas-video-generator-settings";
import { CanvasVideoTypeSelect } from "./canvas-video-type-select";
import { CanvasVideoStoryboardControl } from "./canvas-video-storyboard-control";
import { canvasVideoStoryboardShots } from "./canvas-video-storyboard.mjs";
import { canvasVideoGenerationBatchInputs } from "./canvas-video-generation-batch.mjs";
import { canvasVideoDraftForMaterials, canvasVideoDraftForModel, canvasVideoDraftForType, canvasVideoParameterVisibility, canvasVideoSubmissionType, canvasVideoTypeAvailability, canvasVideoUiRolesForType } from "./canvas-video-material-modes.mjs";
import { CanvasVideoGenerationError, quoteCanvasVideo, readCanvasVideoCapabilities, submitCanvasVideo, readCanvasVideo, downloadCanvasVideo, retryCanvasVideoSave, retryCanvasVideo, type VideoCreditQuote } from "./http-video-generation";
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
function rejectedVideoStatus(requestId: string, message: string): VideoGenerationStatus {
  return { requestId, state: "failed", progress: null, reservedCredits: 0, chargedCredits: 0, output: null,
    error: { code: "VIDEO_SUBMISSION_REJECTED", message } };
}
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
  const [storyboardMenuOpen, setStoryboardMenuOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false); const [priceRevision, setPriceRevision] = useState(0);
  const [posting, setPosting] = useState(false); const [message, setMessage] = useState("");
  const [quote, setQuote] = useState<VideoCreditQuote | null>(null); const [retryQuote, setRetryQuote] = useState<VideoCreditQuote | null>(null); const [quoteError, setQuoteError] = useState(""); const [pollRevision, setPollRevision] = useState(0);
  const [directPreviews, setDirectPreviews] = useState<Record<string, string>>({}); const [playing, setPlaying] = useState(false);
  const [countEnabled, setCountEnabled] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playbackRef = useRef<ReturnType<typeof attachCanvasVideoPreviewPlayback> | null>(null);
  const scope = `${context.ownerKey}:${context.workspaceId ?? "personal"}:${context.pageId}`;
  const scopeRef = useRef(scope); scopeRef.current = scope;
  const mounted = useRef(true); useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const noticesRef = useRef(new Set<string>()); const actionRef = useRef(false);
  const previewRefreshAttempted = useRef(false);
  useEffect(() => { previewRefreshAttempted.current = false; }, [data.outputAssetId]);
  const storedDraft = data.videoGeneration; const count = storedDraft.count ?? 1;
  const job = storedDraft.submissionError && storedDraft.requestId ? rejectedVideoStatus(storedDraft.requestId, storedDraft.submissionError) : data.job;
  const totalCredits = quote ? quote.credits * count : null;
  const active = Boolean(storedDraft.requestId && (!job || VIDEO_ACTIVE_STATES.includes(job.state) || ["submission_unknown", "save_failed"].includes(job.state)));
  const locked = active || posting || !context.enabled;
  const sequence = Math.max(1, nodes.filter((node) => node.type === "videoGenerator").findIndex((node) => node.id === id) + 1);
  const title = `视频生成 ${sequence}`;
  const connected = canvasTextGenerationInputs(nodes, edges, id);
  const connectedText = connected.filter((item) => item.kind === "text").map((item) => (item.text ?? "").trim()).filter(Boolean).join("\n\n");
  const inputs: InputView[] = [
    ...connected.map((item): InputView => {
      const material: VideoMaterial | undefined = item.kind === "image" && item.media ? { kind: "image", assetKind: item.media.assetKind, assetId: item.media.assetId, name: item.name }
        : item.kind === "video" && item.videoAssetId ? { kind: "video", assetKind: "video", assetId: item.videoAssetId, name: item.name } : undefined;
      const key = `edge:${item.edgeId}`; const role = item.kind !== "text" ? storedDraft.roles[key] : undefined;
      return { key, edgeId: item.edgeId, kind: item.kind, name: item.name, material, role, previewUrl: item.previewUrl, text: item.text, unavailable: item.unavailable };
    }),
    ...storedDraft.materials.map((item): InputView => {
      const key = `direct:${item.assetKind}:${item.assetId}`;
      return { key, kind: item.kind, name: item.name, material: item, role: storedDraft.roles[key] ?? item.role,
        previewUrl: item.kind === "image" ? privateImageUrls(item.assetKind === "generated" ? "asset" : "reference", item.assetId).previewUrl : directPreviews[item.assetId],
        unavailable: item.kind === "video" && !directPreviews[item.assetId] };
    }),
  ];
  const typeOptions = canvasVideoTypeAvailability(inputs);
  const draft = locked ? storedDraft : canvasVideoDraftForMaterials(storedDraft, inputs);
  let imageIndex = 0;
  const views: InputView[] = inputs.map((item) => {
    const index = item.kind === "image" ? imageIndex++ : 0;
    return { ...item, role: item.kind === "text" ? undefined : draft.roles[item.key] ?? item.role ?? defaultVideoRole(draft.type, item.kind, index) };
  });
  const manualShots = draft.shots.length > 0 && !["motion_control", "video_edit"].includes(draft.type);
  const combinedPrompt = manualShots ? "" : [connectedText, draft.prompt].map((text) => text.trim()).filter(Boolean).join("\n\n");
  const media: VideoGenerationMedia[] = views.flatMap((view) => view.material && view.role ? [{ ...view.material, role: view.role }] : []);
  const hasFeatureVideo = media.some((item) => item.role === "feature_video");
  const parameterVisibility = { ...canvasVideoParameterVisibility(draft.type, views), duration: draft.type !== "motion_control" && !manualShots };
  const fields = { modelId: draft.modelId, type: canvasVideoSubmissionType(draft.type, media), prompt: combinedPrompt, resolution: draft.resolution, duration: draft.duration, aspectRatio: draft.aspectRatio,
    audio: hasFeatureVideo ? "off" as const : draft.audio, multiShot: hasFeatureVideo || draft.multiShot, characterOrientation: draft.characterOrientation,
    shots: manualShots ? canvasVideoStoryboardShots(draft.shots, connectedText) : [] };
  const problem = views.some((view) => view.unavailable) ? "连接素材尚未就绪。"
    : typeOptions.find((item) => item.id === draft.type)?.reason || videoGenerationProblem({ ...fields, media });
  const motionVideoId = media.find((item) => item.kind === "video")?.assetId;
  const quoteInput = useMemo(() => ({ modelId: draft.modelId, type: draft.type, resolution: draft.resolution, duration: draft.duration, characterOrientation: draft.characterOrientation,
    ...(draft.type === "motion_control" && motionVideoId ? { videoAssetId: motionVideoId } : {}) }), [draft.modelId, draft.type, draft.resolution, draft.duration, draft.characterOrientation, motionVideoId]);
  const updateDraft = (patch: Partial<CanvasVideoGenerationDraft>) => { flow.updateNodeData(id, (node) => node.type === "videoGenerator" ? { videoGeneration: { ...node.data.videoGeneration, ...patch } } : {}); };
  useEffect(() => {
    if (locked || draft === storedDraft) return;
    // Only reconcile this editable draft. Frozen requests and retries retain their original inputs.
    flow.updateNodeData(id, (node) => node.type === "videoGenerator" && node.data.videoGeneration === storedDraft
      ? { videoGeneration: draft } : {});
  }, [draft, storedDraft, flow, id, locked]);
  const validScope = (expected: string, nodeId = id) => mounted.current && scopeRef.current === expected && flow.getNode(nodeId)?.type === "videoGenerator";
  const receive = (status: VideoGenerationStatus, expectedScope: string, nodeId = id) => {
    if (!validScope(expectedScope, nodeId)) return;
    const node = flow.getNode(nodeId); if (node?.type !== "videoGenerator" || node.data.videoGeneration.requestId !== status.requestId) return;
    if (JSON.stringify(node.data.job) !== JSON.stringify(status)) flow.updateNodeData(nodeId, { job: status,
      videoGeneration: { ...node.data.videoGeneration, submissionError: undefined },
      ...(status.output ? { outputAssetId: status.output.id, previewUrl: status.output.url, pixelWidth: status.output.pixelWidth, pixelHeight: status.output.pixelHeight, durationSeconds: status.output.durationSeconds } : {}) });
    if (["succeeded", "failed"].includes(status.state) && !noticesRef.current.has(status.requestId)) {
      noticesRef.current.add(status.requestId); context.onBillingChanged();
      if (status.output) window.dispatchEvent(new CustomEvent(CANVAS_ASSET_LIBRARY_UPDATED_EVENT, { detail: { ownerKey: context.ownerKey } }));
    }
  };
  useEffect(() => {
    setCountEnabled(false);
    if (!context.enabled) return;
    const controller = new AbortController();
    void readCanvasVideoCapabilities(context.workspaceId, controller.signal).then((capabilities) => {
      if (!controller.signal.aborted) setCountEnabled(capabilities.enabled && Array.isArray(capabilities.counts) &&
        [1, 2, 4].every((value) => capabilities.counts!.includes(value as 1 | 2 | 4)));
    }).catch(() => {});
    return () => controller.abort();
  }, [context.enabled, context.workspaceId, scope]);
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
    const requestId = draft.requestId; if (!requestId || draft.submissionError || !context.enabled) return;
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
  }, [draft.requestId, draft.submissionError, context.enabled, context.workspaceId, scope, pollRevision]);
  useEffect(() => {
    if (!selected || locked) { setModelOpen(false); setTypeOpen(false); if (!selected) setParametersOpen(false); }
    if (!selected || locked || !parameterVisibility.storyboard) setStoryboardMenuOpen(false);
  }, [selected, locked, parameterVisibility.storyboard]);
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
    if (locked || !typeOptions.some((item) => item.id === type && item.enabled)) return;
    updateDraft(canvasVideoDraftForType(draft, type, inputs));
    setMessage("");
  };
  const changeModel = (modelId: VideoModelId) => {
    if (locked) return;
    const plan = canvasVideoDraftForModel(draft, modelId, inputs);
    if (plan.draft === draft) return;
    const removed = new Set(plan.removedKeys);
    const edgeIds = inputs.flatMap((item) => item.edgeId && removed.has(item.key) ? [item.edgeId] : []);
    if (edgeIds.length) context.onRemoveInputs(edgeIds);
    updateDraft(plan.draft);
    setQuote(null); setQuoteError("");
    setMessage(removed.size ? `已移除 ${removed.size} 个多余参考。` : "");
  };
  const generate = async (retry = false) => {
    const acceptedQuote = retry ? retryQuote : quote;
    if (actionRef.current || locked || !acceptedQuote || !retry && (problem || count > 1 && !countEnabled)) return;
    const expected = scope; const previousId = draft.requestId; const requestId = crypto.randomUUID();
    actionRef.current = true; setPosting(true); setMessage("");
    try {
      const projectId = context.beforeGenerate();
      const input: VideoGenerationInput = retry && draft.lastInput ? { ...draft.lastInput, requestId, quotedCredits: acceptedQuote.credits }
        : { ...fields, requestId, projectId, media, quotedCredits: acceptedQuote.credits };
      const current = flow.getNode(id); if (current?.type !== "videoGenerator") return;
      const inputs = canvasVideoGenerationBatchInputs(input, retry ? 1 : count, () => crypto.randomUUID());
      const plan = inputs.map((frozen, index) => ({ input: frozen, nodeId: index === 0 ? id : `video-generator-${crypto.randomUUID()}` }));
      const resultData = (videoGeneration: CanvasVideoGenerationDraft): CanvasVideoGeneratorNodeData => ({ videoGeneration,
        job: undefined, outputAssetId: undefined, previewUrl: undefined, pixelWidth: undefined, pixelHeight: undefined, durationSeconds: undefined });
      const originalData = resultData({ ...draft, requestId, lastInput: inputs[0], submissionError: undefined });
      const resultWidth = Number(current.style?.width ?? current.width ?? 320);
      const siblings: CanvasVideoGeneratorNodeType[] = plan.slice(1).map((item, index) => ({
        id: item.nodeId, type: "videoGenerator", selected: false, ...(current.parentId ? { parentId: current.parentId } : {}),
        position: { x: current.position.x + (index + 1) * (resultWidth + 24), y: current.position.y },
        style: { width: resultWidth, height: Number(current.style?.height ?? current.height ?? 180) },
        data: resultData({ ...draft, count: 1, prompt: item.input.prompt,
          shots: item.input.shots.map((shot) => ({ ...shot })), materials: item.input.media.map((material) => ({ ...material })),
          roles: {}, requestId: item.input.requestId, lastInput: item.input, submissionError: undefined }),
      }));
      // Publish all slots together, before the first paid request can start.
      flow.setNodes((currentNodes) => [...currentNodes.map((node) => node.id === id && node.type === "videoGenerator"
        ? { ...node, data: { ...node.data, ...originalData } } : node), ...siblings]);
      const submissions = await Promise.allSettled(plan.map(async (item) => {
        try {
          const status = retry && previousId && !draft.submissionError
            ? await retryCanvasVideo(previousId, { requestId: item.input.requestId, quotedCredits: acceptedQuote.credits }, context.workspaceId, AbortSignal.timeout(120_000))
            : await submitCanvasVideo(item.input, context.workspaceId, AbortSignal.timeout(120_000));
          receive(status, expected, item.nodeId);
        } catch (error) {
          if (!validScope(expected, item.nodeId)) return;
          const errorMessage = (error instanceof Error ? error.message : "提交连接中断，正在确认任务状态。")
            .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").slice(0, 1000) || "视频请求未被接收，请重试。";
          if (item.nodeId === id) setMessage(errorMessage);
          if (error instanceof CanvasVideoGenerationError && ((error.status ?? 0) >= 400 && (error.status ?? 0) < 500 || error.code === "VIDEO_PROVIDER_UNAVAILABLE")) {
            const target = flow.getNode(item.nodeId);
            if (target?.type === "videoGenerator" && target.data.videoGeneration.requestId === item.input.requestId) {
              if (!countEnabled && item.nodeId === id) flow.updateNodeData(id, current.data);
              else flow.updateNodeData(item.nodeId, { videoGeneration: { ...target.data.videoGeneration, submissionError: errorMessage },
                  job: rejectedVideoStatus(item.input.requestId, errorMessage) });
            }
            if (error.code === "VIDEO_PRICE_CHANGED") setPriceRevision((value) => value + 1);
          }
        }
      }));
      const unexpectedFailure = submissions.find((result) => result.status === "rejected");
      if (unexpectedFailure?.status === "rejected") throw unexpectedFailure.reason;
      if (validScope(expected)) context.onBillingChanged();
    } catch (error) {
      if (!validScope(expected)) return;
      setMessage(error instanceof Error ? error.message : "提交连接中断，正在确认任务状态。");
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
  const ready = !locked && !problem && Boolean(quote) && (count === 1 || countEnabled); const motion = draft.type === "motion_control";
  const previewAudio = parameterVisibility.audio ? draft.audio : "off";
  const audioLabel = previewAudio === "off" ? "静音" : previewAudio === "original" ? "保留原声" : "生成音频";
  const AudioIcon = previewAudio === "off" ? VolumeX : Volume2;
  const parameterPreview = [parameterVisibility.aspectRatio ? draft.aspectRatio : null,
    draft.resolution === "4k" ? "4K" : draft.resolution,
    motion ? "随视频" : `${draft.duration}s`, `${count}个`].filter(Boolean).join(" · ");
  const type = VIDEO_GENERATION_TYPES.find((item) => item.id === draft.type)!;
  const sendHint = !context.enabled ? "画布准备好后可生成" : locked ? "当前任务进行中" : problem || quoteError || "生成视频（Ctrl/⌘ + Enter）";
  const validationNotice = problem === "请输入视频描述。" ? "" : problem;
  const inlineNotice = message || job?.error?.message || (!active && (validationNotice || quoteError));
  return <TooltipProvider delayDuration={180}>
    <CanvasMediaMetadata kind="video" name={title} nodeWidth={width} pixelWidth={data.previewUrl ? data.pixelWidth : undefined} pixelHeight={data.previewUrl ? data.pixelHeight : undefined} />
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
          : <CanvasVideoGenerationProgress key={`${scope}:${draft.requestId}`} attemptKey={`${scope}:${draft.requestId}`}
              state={job?.state ?? "queued"} progress={job?.progress ?? null} />}
      </div> : <Film size={28} aria-hidden="true" />}
    </article>
    {selected && <CanvasImageResizeControls />}
    <Handle type="target" position={Position.Left} id="reference" className={workspaceStyles.generatorInputHandle} aria-label="接收文本、图片或视频" />
    <Handle type="source" position={Position.Right} id="video" className={workspaceStyles.referenceOutputHandle} aria-label="输出视频" />
    <NodeToolbar isVisible={selected} position={Position.Bottom} offset={12} align={align} className={`${workspaceStyles.generatorToolbar} nodrag nopan nowheel`} style={{ width: toolbarWidth }}>
      <section className={`${composerStyles.composer} ${composerStyles.composerAttached}`} aria-label="视频生成工具" onPointerDown={(event) => event.stopPropagation()} onWheel={(event) => event.stopPropagation()}>
        <AttachmentGroup className={`${composerStyles.referenceTray} ${styles.tray}`} role="group" aria-label="输入附件">
          {views.map((view) => <div key={view.key} className={styles.material} data-unavailable={view.unavailable || undefined}
            data-invalid={view.kind !== "text" && (!view.role || !canvasVideoUiRolesForType(draft.type, view.kind).includes(view.role)) || undefined}>
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
              {draft.type === "first_last_frame" && view.kind === "image" &&
                (view.role === "first_frame" || view.role === "last_frame") &&
                <span className={styles.frameLabel}>{view.role === "first_frame" ? "首帧" : "尾帧"}</span>}
            </Attachment>
          </div>)}
        </AttachmentGroup>
        <CanvasVideoGeneratorPrompt id={`video-prompt-${id}`} value={manualShots ? draft.shots.map((shot, index) => `场景 ${index + 1} · ${shot.seconds}s\n${shot.text}`).join("\n\n") : draft.prompt} readOnly={locked || manualShots} maxLength={motion ? 2500 : 3072} width={toolbarWidth}
          placeholder={manualShots ? "点击分镜编辑场景…" : connected.some((item) => item.kind === "text") ? "补充视频描述（追加在连接文本之后）…" : `${type.hint}…`} canGenerate={ready}
          onInteract={() => { setModelOpen(false); setTypeOpen(false); setParametersOpen(false); setStoryboardMenuOpen(false); }}
          onChange={(prompt) => { setMessage(""); updateDraft({ prompt }); }} onGenerate={() => void generate()} />
        <div className={`${composerStyles.tools} ${styles.footer}`}>
          <div className={styles.controls}>
            <Popover open={parametersOpen} onOpenChange={(open) => { setParametersOpen(open); if (open) { setModelOpen(false); setTypeOpen(false); setStoryboardMenuOpen(false); } }}>
              <PopoverTrigger asChild data-slot="button">
                <Button id={`video-parameters-${id}-trigger`} type="button" variant="ghost" size="sm" className={composerStyles.settingsTrigger} disabled={locked} aria-label={`视频参数：${parameterPreview}，${audioLabel}`}
                  aria-controls={`video-parameters-${id}`}>
                  <span className={styles.parameterPreview}>
                    <span>{parameterPreview}</span><span aria-hidden="true">·</span>
                    <Tooltip>
                      <TooltipTrigger asChild><span className={styles.parameterAudio} aria-label={audioLabel}>
                        <AudioIcon size={14} strokeWidth={1.5} aria-hidden="true" />
                      </span></TooltipTrigger>
                      <TooltipContent side="top">{audioLabel}</TooltipContent>
                    </Tooltip>
                  </span>
                  <ChevronDown size={13} aria-hidden="true" />
                </Button>
              </PopoverTrigger>
              <CanvasVideoGeneratorSettings id={`video-parameters-${id}`} draft={draft} visibility={parameterVisibility} disabled={locked} countEnabled={countEnabled} onChange={updateDraft} />
            </Popover>
            <div className={styles.typeAndStoryboard}>
            <CanvasVideoTypeSelect value={draft.type} modelId={draft.modelId} options={typeOptions} open={typeOpen} disabled={locked}
              onOpenChange={(open) => { setTypeOpen(open); if (open) { setModelOpen(false); setParametersOpen(false); setStoryboardMenuOpen(false); } }} onValueChange={changeType} />
            {parameterVisibility.storyboard && <CanvasVideoStoryboardControl id={`video-storyboard-${id}`} draft={draft}
              connectedText={connectedText} disabled={locked || !selected} open={storyboardMenuOpen}
              onOpenChange={(open) => { setStoryboardMenuOpen(open); if (open) { setModelOpen(false); setTypeOpen(false); setParametersOpen(false); } }}
              onApply={(patch) => { updateDraft(patch); setMessage(""); }} />}
            </div>
          </div>
          <span className={composerStyles.toolSpacer} />
          <div className={styles.actions}>
            <Select open={modelOpen} onOpenChange={(open) => { setModelOpen(open); if (open) { setTypeOpen(false); setParametersOpen(false); setStoryboardMenuOpen(false); } }} value={draft.modelId}
              onValueChange={(value) => changeModel(value as VideoModelId)} disabled={locked}>
              <SelectTrigger size="sm" className={composerStyles.modelSelect} aria-label="视频模型"><SelectValue /></SelectTrigger>
              <SelectContent position="popper" align="end" className={`${composerStyles.modelMenu} nodrag nopan nowheel`}>
                {VIDEO_GENERATION_MODELS.map((item) => <SelectItem key={item.id} value={item.id}>
                  <KlingModelIcon />{item.name}
                </SelectItem>)}
              </SelectContent>
            </Select>
            <Tooltip><TooltipTrigger asChild><span>
              <Button type="button" className={composerStyles.generate} disabled={!ready} aria-busy={posting}
                aria-label={totalCredits !== null ? `生成 ${count} 个视频，本次 ${totalCredits} 积分` : "生成视频，当前规格暂无报价"} onClick={() => void generate()}>
                <span className={composerStyles.generateCost}>
                  {posting ? <LoaderCircle className={`size-[1em] ${composerStyles.loadingIcon}`} /> : <CreditIcon className="size-[1em]" />}
                  {totalCredits ?? "—"}
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
    <Dialog open={viewerOpen && Boolean(data.previewUrl)} onOpenChange={setViewerOpen}><DialogContent className="nodrag nopan nowheel sm:max-w-4xl"><DialogTitle>{title}</DialogTitle><DialogDescription className="sr-only">播放生成的视频</DialogDescription>{data.previewUrl && <VideoPreview url={data.previewUrl} label={title} controls className={styles.viewerVideo} />}</DialogContent></Dialog>
  </TooltipProvider>;
}
