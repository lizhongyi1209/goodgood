"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { Handle, NodeToolbar, Position, useReactFlow, useStore, type NodeProps } from "@xyflow/react";
import { ArrowUp, ChevronDown, FileText, Film, LoaderCircle, Square, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TextModelIcon } from "@/features/models/text-model-icon";
import { TEXT_GENERATION_MODELS, TEXT_GENERATION_PRESETS, getTextGenerationPreset, DEFAULT_TEXT_GENERATION_MODEL, TEXT_GENERATION_CREDIT_COST, TEXT_GENERATION_CANCELLATION_CREDIT_COST, TEXT_GENERATION_MAX_PROMPT,
  TEXT_GENERATION_MAX_HISTORY, type CanvasTextGenerationDraft, type TextGenerationMessage, type TextGenerationModelId } from "@/shared/contracts/text-generation.mjs";
import { CanvasMarkdownNode, type CanvasTextNodeData } from "./canvas-text-node";
import { CanvasTextQuickToolbar } from "./canvas-text-quick-toolbar";
import { canvasMarkdownPlainText } from "./canvas-markdown";
import { canvasTextGenerationInputs } from "./canvas-text-generation-input";
import { CanvasTextGenerationContext } from "./canvas-text-generation-context";
import { canvasVideoFrames } from "./canvas-video-input";
import { CanvasTextGenerationError, cancelCanvasTextGeneration, readCanvasTextGeneration, streamCanvasTextGeneration, type TextGenerationMedia } from "./http-text-generation";
import type { CanvasNode, CanvasTextGeneratorNodeType } from "./canvas-workspace";
import workspaceStyles from "./canvas-workspace.module.css";
import pageStyles from "./canvas-page.module.css";
import styles from "./canvas-text-generator-node.module.css";

export type CanvasTextGeneratorNodeData = CanvasTextNodeData & { textGeneration: CanvasTextGenerationDraft; generating?: boolean };
const recentHistory = (messages: readonly TextGenerationMessage[]) => messages.slice(-TEXT_GENERATION_MAX_HISTORY);
const wait = (signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  const abort = () => { clearTimeout(timer); reject(signal.reason); };
  const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, 1500);
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
});

export function CanvasTextGeneratorNode({ id, data, selected, width, height }: NodeProps<CanvasTextGeneratorNodeType>) {
  const flow = useReactFlow<CanvasNode>();
  const context = useContext(CanvasTextGenerationContext);
  const contextRef = useRef(context);
  contextRef.current = context;
  const controllerRef = useRef<AbortController | null>(null);
  const latestRequestRef = useRef<string | null>(null);
  const renderedResultRef = useRef(data.markdown);
  const live = (controller: AbortController) => mountedRef.current && controllerRef.current === controller;
  const mountedRef = useRef(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const nodes = useStore((state) => state.nodes as CanvasNode[]);
  const zoom = useStore((state) => state.transform[2]);
  const edges = useStore((state) => state.edges);
  const inputs = canvasTextGenerationInputs(nodes, edges, id);
  const sequence = Math.max(1, nodes.filter((node) => node.type === "textGenerator").findIndex((node) => node.id === id) + 1);
  const label = `文本生成 ${sequence}`;
  const currentPreset = getTextGenerationPreset(data.textGeneration.presetId);
  const screenLeft = useStore((state) => (state.nodeLookup.get(id)?.internals.positionAbsolute.x ?? 0) * state.transform[2] + state.transform[0]);
  const viewportWidth = useStore((state) => state.width);
  const nodeWidth = width ?? 238;
  const visibleLeft = typeof document === "undefined" ? 0 : document.getElementById("canvas-asset-sidebar")?.getBoundingClientRect().right ?? 0;
  const desiredWidth = Math.min(660, Math.max(120, viewportWidth - visibleLeft - 30));
  const center = screenLeft + nodeWidth * zoom / 2;
  let align: "start" | "center" | "end" = "center";
  let toolbarWidth = desiredWidth;
  if (center - desiredWidth / 2 < visibleLeft + 15) {
    align = "start"; toolbarWidth = Math.min(desiredWidth, Math.max(120, viewportWidth - screenLeft - 15));
  } else if (center + desiredWidth / 2 > viewportWidth - 15) {
    align = "end"; toolbarWidth = Math.min(desiredWidth, Math.max(120, screenLeft + nodeWidth * zoom - visibleLeft - 15));
  }
  const updateDraft = (patch: Partial<CanvasTextGenerationDraft>) => {
    flow.updateNodeData(id, (node) => node.type === "textGenerator" ? { textGeneration: { ...node.data.textGeneration, ...patch } } : {});
  };
  const updateResult = (markdown: string) => {
    if (mountedRef.current) { renderedResultRef.current = markdown; flow.updateNodeData(id, { markdown, text: canvasMarkdownPlainText(markdown) }); }
  };
  const startBusy = () => {
    setBusy(true); setError(""); flow.updateNodeData(id, { generating: true });
  };
  const endBusy = (clearPending: boolean) => {
    if (!mountedRef.current) return;
    setBusy(false); flow.updateNodeData(id, { generating: false });
    if (clearPending) updateDraft({ pendingRequestId: undefined });
    contextRef.current.onBillingChanged();
  };
  const recover = async (requestId: string, signal: AbortSignal) => {
    for (;;) {
      const result = await readCanvasTextGeneration(requestId, contextRef.current.workspaceId, signal);
      signal.throwIfAborted();
      if (result.state !== "running") {
        if (result.markdown) updateResult(result.markdown);
        if (result.state === "failed") setError(result.error?.message ?? "上次生成未完成，已退回预留积分。");
        else if (result.state === "cancelled") setError("");
        return result;
      }
      await wait(signal);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    if (!context.enabled) { setBusy(false); flow.updateNodeData(id, { generating: false }); }
    const node = flow.getNode(id);
    const pending = node?.type === "textGenerator" ? node.data.textGeneration.pendingRequestId : undefined;
    if (context.enabled && pending) {
      latestRequestRef.current = pending;
      const controller = new AbortController();
      controllerRef.current = controller;
      startBusy();
      void recover(pending, controller.signal).then((result) => {
        if (!live(controller)) return;
        const current = flow.getNode(id);
        if (current?.type === "textGenerator") {
          const history = [...(current.data.textGeneration.history ?? [])];
          if (history.at(-1)?.role === "user") updateDraft({ history: result.state === "succeeded"
            ? recentHistory([...history, { role: "assistant", content: result.markdown }]) : history.slice(0, -1) });
        }
        if (result.state === "succeeded") setError("");
        endBusy(true);
      }).catch((failure: unknown) => {
        if (!live(controller)) return;
        if (controller.signal.aborted) { setError(""); endBusy(true); return; }
        setError(failure instanceof Error ? failure.message : "暂时无法恢复生成状态，请稍后重新打开画布。");
        endBusy(failure instanceof CanvasTextGenerationError && failure.code === "TEXT_GENERATION_NOT_FOUND");
      }).finally(() => { if (controllerRef.current === controller) controllerRef.current = null; });
    }
    return () => { mountedRef.current = false; latestRequestRef.current = null; controllerRef.current?.abort(); controllerRef.current = null; };
    // Restore only on mounting/owner/page changes; setting a request ID must not submit or start a second stream.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.enabled, context.ownerKey, context.pageId, flow, id]);
  useEffect(() => {
    const prompt = promptRef.current;
    if (!prompt) return;
    prompt.style.height = "0px";
    prompt.style.height = `${Math.min(188, Math.max(70, prompt.scrollHeight))}px`;
  }, [data.textGeneration.prompt, selected]);

  const generate = async () => {
    if (!context.enabled || controllerRef.current || busy) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    latestRequestRef.current = null;
    let requestId: string | null = null;
    let submitted = false;
    let clearPending = false;
    let queue = "";
    let markdown = "";
    let ticker: ReturnType<typeof setInterval> | undefined;
    const history: TextGenerationMessage[] = (data.textGeneration.history ?? []).map((message) => ({ ...message }));
    if (history.at(-1)?.role === "assistant") history[history.length - 1] = { role: "assistant", content: data.markdown };
    const prompt = [...inputs.filter((item) => item.kind === "text").map((item) => item.text ?? ""), data.textGeneration.prompt].map((text) => text.trim()).filter(Boolean).join("\n\n");
    const historyPrompt = [currentPreset ? `[预设：${currentPreset.name}]` : "", prompt].filter(Boolean).join("\n\n") || "请分析输入素材。";
    try {
      if (inputs.some((item) => item.unavailable)) throw new Error("连接素材尚未准备好，请等待上传或生成完成。");
      if (!prompt && !currentPreset && !inputs.some((item) => item.kind !== "text")) throw new Error("请输入内容、选择预设，或连接文本、图片、视频。");
      if (prompt.length > TEXT_GENERATION_MAX_PROMPT) throw new Error("输入内容过长，请缩小需求后重试。");
      const projectId = context.beforeGenerate();
      startBusy();
      const media: TextGenerationMedia[] = [];
      const seen = new Set<string>();
      for (const item of inputs) {
        if (item.media && !seen.has(item.media.assetId)) { seen.add(item.media.assetId); media.push(item.media); }
        if (item.kind === "video" && item.videoAssetId && item.previewUrl && !seen.has(item.videoAssetId)) {
          seen.add(item.videoAssetId);
          media.push({ kind: "video", assetKind: "video", assetId: item.videoAssetId, frames: await canvasVideoFrames(item.previewUrl, controller.signal) });
        }
      }
      controller.signal.throwIfAborted();
      requestId = crypto.randomUUID();
      latestRequestRef.current = requestId;
      updateDraft({ pendingRequestId: requestId, history: recentHistory([...history, { role: "user", content: historyPrompt }]) });
      clearPending = true;
      const draw = (all = false) => {
        if (!queue || !live(controller)) return;
        let count = all ? queue.length : Math.min(queue.length, 64);
        if (count < queue.length && /[\uD800-\uDBFF]/.test(queue[count - 1])) count += 1;
        markdown += queue.slice(0, count); queue = queue.slice(count); updateResult(markdown);
      };
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      ticker = setInterval(() => draw(reducedMotion), 32);
      submitted = true;
      await streamCanvasTextGeneration({ requestId, projectId, modelId: data.textGeneration.modelId ?? DEFAULT_TEXT_GENERATION_MODEL,
        prompt, presetId: currentPreset?.id, history: history.slice(-TEXT_GENERATION_MAX_HISTORY), media }, context.workspaceId, controller.signal, (event) => {
        if (!live(controller)) return;
        if (event.type === "start") {
          updateResult("");
          flow.updateNode(id, (node) => !data.markdown && node.type === "textGenerator" &&
            (node.width ?? node.style?.width ?? 238) === 238 && (node.height ?? node.style?.height ?? 238) === 238
            ? { width: 360, height: 260, style: { ...node.style, width: 360, height: 260 } } : {});
          contextRef.current.onBillingChanged();
        } else if (event.type === "delta") queue += event.text ?? "";
      });
      while (queue && live(controller)) { controller.signal.throwIfAborted(); await new Promise<void>((resolve) => setTimeout(resolve, 32)); }
      controller.signal.throwIfAborted();
      if (!live(controller)) return;
      updateDraft({ history: recentHistory([...history, { role: "user", content: historyPrompt }, { role: "assistant", content: markdown }]) });
    } catch (failure) {
      clearInterval(ticker);
      if (queue && live(controller)) { markdown += queue; updateResult(markdown); }
      if (!live(controller)) return;
      if (controller.signal.aborted) setError("");
      else if (submitted && requestId && (!(failure instanceof CanvasTextGenerationError) ||
          ["TEXT_STREAM_INTERRUPTED", "TEXT_GENERATION_IN_PROGRESS", "TEXT_GENERATION_UNAVAILABLE"].includes(failure.code))) {
        clearPending = false;
        setError("连接中断，正在恢复结果…");
        try { const result = await recover(requestId, controller.signal); clearPending = true;
          if (result.state === "succeeded") { setError(""); updateDraft({ history: recentHistory([...history,
            { role: "user", content: historyPrompt }, { role: "assistant", content: result.markdown }]) }); return; }
        } catch (recoveryError) {
          if (controller.signal.aborted) { clearPending = true; setError(""); }
          if (!controller.signal.aborted) setError(recoveryError instanceof Error ? recoveryError.message : "暂时无法恢复生成状态，请稍后重新打开画布。");
          if (recoveryError instanceof CanvasTextGenerationError && recoveryError.code === "TEXT_GENERATION_NOT_FOUND") clearPending = true;
        }
      } else setError(failure instanceof Error ? failure.message : "文本生成暂不可用，请稍后重试。");
      if (clearPending) updateDraft({ history });
    } finally {
      clearInterval(ticker);
      if (live(controller)) { endBusy(clearPending); controllerRef.current = null; }
    }
  };

  const currentModel = TEXT_GENERATION_MODELS.find((model) => model.id === data.textGeneration.modelId) ?? TEXT_GENERATION_MODELS[1];
  const showingResult = Boolean(data.markdown || busy || data.textGeneration.pendingRequestId);
  return <TooltipProvider delayDuration={180}>
    <div className={workspaceStyles.imageMetadata}>
      <span className={workspaceStyles.imageMetadataName}>
        <span className={workspaceStyles.generatorMetadataIcon}><FileText size={12} /><svg className={workspaceStyles.generatorMetadataSparkle} viewBox="0 0 8 8" focusable="false"><path d="M4 .5 4.65 3.35 7.5 4 4.65 4.65 4 7.5 3.35 4.65 .5 4 3.35 3.35Z" /></svg></span>
        <span className={workspaceStyles.imageMetadataNameText}>{label}</span>
      </span>
      {busy && <span className={styles.waiting} role="status"><LoaderCircle aria-hidden="true" />生成中</span>}
    </div>
    {showingResult ? <CanvasMarkdownNode id={id} data={data} selected={selected} width={width} height={height} label={label} streaming={busy} showHeader={false} templateDisabled={Boolean(data.textGeneration.pendingRequestId)} /> : <>
      <div className={workspaceStyles.generatorNode} role="img" aria-label={label}><FileText size={32} strokeWidth={1.35} aria-hidden="true" /></div>
      <NodeToolbar isVisible={selected} position={Position.Top} offset={12 + 22 * zoom}>
        <CanvasTextQuickToolbar data={data} nodeId={id} disabled />
      </NodeToolbar>
      <Handle type="source" id="text" position={Position.Right} className={workspaceStyles.referenceOutputHandle} aria-label={`输出${label}的文本`} />
    </>}
    <Handle type="target" id="reference" position={Position.Left} className={workspaceStyles.generatorInputHandle} aria-label="接收文本、图片或视频" title="文本、图片、视频" />
    <NodeToolbar isVisible={selected} position={Position.Bottom} offset={14} align={align} className={`${workspaceStyles.generatorToolbar} nodrag nopan nowheel`} style={{ width: toolbarWidth }}>
      <div className={styles.composer} onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} onContextMenu={(event) => event.stopPropagation()}>
        {inputs.length > 0 && <div className={styles.inputs} aria-label="连接输入">
          {inputs.map((item, index) => <div key={item.edgeId} className={styles.attachmentSlot}>
            <Tooltip><TooltipTrigger asChild>
              <span tabIndex={0} className={`${styles.attachment} ${item.unavailable ? styles.unavailable : ""}`} aria-label={item.name}>
                {item.kind === "image" && item.previewUrl ? <PrivateObjectImage src={item.previewUrl} alt={item.name} /> : item.kind === "video" ? <Film aria-hidden="true" /> : <FileText aria-hidden="true" />}
              </span></TooltipTrigger>
              {item.kind === "image" && item.previewUrl ? (
                <TooltipContent side="top" align="center" sideOffset={8} hideArrow className={pageStyles.referencePreview}>
                  <PrivateObjectImage src={item.previewUrl} alt={item.name} loading="eager" />
                </TooltipContent>
              ) : (
                <TooltipContent side="top" style={{ maxWidth: 280, whiteSpace: "pre-wrap" }}>{item.kind === "text" ? (item.text || "文本为空").slice(0, 400) : item.name}</TooltipContent>
              )}
            </Tooltip>
            <button type="button" className={styles.attachmentRemove}
              aria-label={`移除素材 ${index + 1}：${item.name}`}
              disabled={busy || Boolean(data.textGeneration.pendingRequestId) || !context.enabled}
              onClick={() => context.onRemoveInput(item.edgeId)}><X size={12} aria-hidden="true" /></button>
          </div>)}
        </div>}
        <div className={styles.promptField}>
          {currentPreset && <div className={styles.presetTags} aria-label="已选预设">
            <Badge variant="secondary" className={styles.presetBadge}>
              <span>{currentPreset.name}</span>
              <button type="button" className={styles.presetRemove} aria-label={`移除预设：${currentPreset.name}`} disabled={busy || !context.enabled}
                onClick={() => { updateDraft({ presetId: undefined }); setError(""); promptRef.current?.focus(); }}><X size={12} aria-hidden="true" /></button>
            </Badge>
          </div>}
          <textarea ref={promptRef} className={styles.prompt} aria-label={`${label}的输入`} placeholder={currentPreset ? "补充要求（可选）…" : "输入内容…"} value={data.textGeneration.prompt}
            maxLength={TEXT_GENERATION_MAX_PROMPT} disabled={busy || !context.enabled} onChange={(event) => { updateDraft({ prompt: event.target.value }); setError(""); }}
            onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); void generate(); } }} />
        </div>
        <div className={styles.tools}>
          <div className={styles.settings}>
          <Select value={currentModel.id} disabled={busy || !context.enabled} onValueChange={(modelId) => updateDraft({ modelId: modelId as TextGenerationModelId })}>
            <SelectTrigger className={styles.model} aria-label="文本生成模型"><span className={styles.modelName}><TextModelIcon icon={currentModel.icon} /><span>{currentModel.name}</span></span></SelectTrigger>
            <SelectContent position="popper" side="bottom" align="start">{TEXT_GENERATION_MODELS.map((model) => <SelectItem key={model.id} value={model.id}><span className={styles.modelName}><TextModelIcon icon={model.icon} /><span>{model.name}</span></span></SelectItem>)}</SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><button type="button" className={styles.presetTrigger} disabled={busy || !context.enabled} aria-label="选择文本生成预设">
              <span>预设</span><ChevronDown size={12} aria-hidden="true" />
            </button></DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="start" sideOffset={6} className={styles.presetMenu}>
              {TEXT_GENERATION_PRESETS.map((preset) => <DropdownMenuCheckboxItem key={preset.id} checked={currentPreset?.id === preset.id}
                onCheckedChange={(checked) => { updateDraft({ presetId: checked ? preset.id : undefined }); setError(""); }}>{preset.name}</DropdownMenuCheckboxItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
          <button type="button" className={styles.send} disabled={!context.enabled || !busy && Boolean(data.textGeneration.pendingRequestId)} aria-label={busy ? `停止文本生成，中断扣 ${TEXT_GENERATION_CANCELLATION_CREDIT_COST} 积分` : `生成文本，消耗 ${TEXT_GENERATION_CREDIT_COST} 积分`}
            title={busy ? `停止生成 · 中断扣 ${TEXT_GENERATION_CANCELLATION_CREDIT_COST} 积分` : `生成 · ${TEXT_GENERATION_CREDIT_COST} 积分`} onClick={() => {
              if (busy) {
                setError("");
                const requestId = data.textGeneration.pendingRequestId;
                const pendingHistory = data.textGeneration.history ?? [];
                controllerRef.current?.abort();
                if (requestId) void cancelCanvasTextGeneration(requestId, context.workspaceId).then((result) => {
                  if (!mountedRef.current || latestRequestRef.current !== requestId) return;
                  if (result.state === "succeeded") {
                    // Generation can settle before the final characters finish animating.
                    const current = flow.getNode(id);
                    if (current?.type !== "textGenerator") return;
                    const edited = current.data.markdown !== renderedResultRef.current;
                    const content = edited ? current.data.markdown : result.markdown;
                    if (!edited) updateResult(content);
                    setError("");
                    if (pendingHistory.at(-1)?.role === "user") updateDraft({ history: recentHistory([...pendingHistory, { role: "assistant", content }]) });
                  } else if (result.state === "cancelled") setError("");
                }).finally(() => contextRef.current.onBillingChanged()).catch(() => {});
              } else void generate();
            }}>
            {busy ? <Square size={15} fill="currentColor" aria-hidden="true" /> : <><span className={styles.cost}>{TEXT_GENERATION_CREDIT_COST}</span><ArrowUp size={18} aria-hidden="true" /></>}
          </button>
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </div>
    </NodeToolbar>
  </TooltipProvider>;
}
