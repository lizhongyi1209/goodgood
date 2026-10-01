"use client";

import Image from "next/image";
import { createPortal, flushSync } from "react-dom";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
} from "react";
import { addEdge, applyEdgeChanges, useNodesState, type BuiltInEdge, type Connection, type Edge, type EdgeChange, type NodeChange, type ReactFlowInstance } from "@xyflow/react";
import { ChevronDown, ImageIcon, LoaderCircle, Maximize2, Minimize2, X } from "lucide-react";

import { Attachment, AttachmentGroup } from "@/components/ui/attachment";
import { Button } from "@/components/ui/button";
import { CreditIcon } from "@/components/ui/credit-icon";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AccountAccessGate } from "@/features/auth/account-access-gate";
import { authenticationEntryPath } from "@/features/auth/authentication-navigation";
import {
  readAuthenticationSession,
  goodGoodApiFetch,
  SESSION_EXPIRED_EVENT,
  signOut,
  type AuthenticationSession,
} from "@/features/auth/http-auth-boundary";
import { findBillingQuote, readBillingSummary } from "@/features/billing/http-billing-boundary";
import { CreditUsageDialog } from "@/features/billing/credit-usage-dialog";
import { readAssetDownloadUrl } from "@/features/assets/http-asset-boundary";
import { createHttpGenerationBoundary } from "@/features/creation/http-generation-boundary";
import {
  getCanvasGenerationRatioOptions,
  getCanvasGenerationResolutionOptions,
  getGptImageQualityOptions,
  resolveGptImageOptionsForModel,
  resolveCanvasGenerationAspectRatioForModel,
  resolveCanvasGenerationCountForModel,
} from "@/features/creation/generation-options";
import { createGenerationInputSnapshot } from "@/features/creation/generation-snapshot";
import { GENERATION_MODEL_CATALOG, getGenerationModel } from "@/features/models/catalog";
import { uploadReferenceFiles } from "@/features/references/http-reference-upload";
import { listReferenceMaterials } from "@/features/references/http-reference-library";
import { listPrivateVideoMaterials, uploadPrivateVideoMaterial } from "@/features/creation/http-video-materials";
import { listPrivateAudioMaterials } from "@/features/assets/http-audio-materials";
import { privateImageUrls } from "@/shared/private-image-urls.mjs";
import { workspaceRequestHeaders } from "@/features/organizations/workspace-request";
import type { BillingSummary } from "@/shared/contracts/billing";
import {
  isGptImageModelId,
  MAX_GENERATION_REFERENCES,
  type GenerationAspectRatio,
  type GenerationCount,
  type GenerationInputSnapshot,
  type GenerationJob,
  type GenerationModelId,
  type GenerationReference,
  type GenerationResolution,
  type GptImageQuality,
  type GptImageBackground,
  type GptImageOutputFormat,
} from "@/shared/contracts/generation";
import { CanvasWorkspace, canvasReferenceEdgeCurvature, canvasReferenceEdgeStyle, type CanvasAudioNodeType, type CanvasGeneratorNodeType, type CanvasNode, type CanvasSourceNode, type CanvasVideoNode } from "./canvas-workspace";
import { CanvasGeneratorSettingsContent } from "./canvas-generator-settings-popover";
import { CanvasGenerationCountControl } from "./canvas-generation-count-control";
import type { CanvasLibraryAsset } from "./canvas-asset-panel";
import { upsertCanvasJobNodes } from "./canvas-job-nodes.mjs";
import { initialCanvasImageSize } from "./canvas-image-size.mjs";
import { canvasImagePositions, selectCanvasImageFiles, selectCanvasMediaFiles } from "./canvas-local-images.mjs";
import { videoFrameMatches } from "./canvas-video-size";
import { readCanvasProject } from "./canvas-project-boundary";
import {
  readLocalCanvasFile,
  readLocalCanvasProject,
  removeLocalCanvasFile,
  writeLocalCanvasFile,
  writeLocalCanvasProject,
  type LocalCanvasProject,
} from "./canvas-project-local";
import { CanvasProjectSync, localCanvasProjectFromRemote, type CanvasSaveState } from "./canvas-project-sync";
import { snapshotCanvasProject } from "./canvas-project-snapshot";
import { readCanvasViewport, saveCanvasViewport, readCanvasActivePage, saveCanvasActivePage } from "./canvas-project-session";
import { CANVAS_PROJECT_DEFAULT_PAGE_ID, CANVAS_PROJECT_MAX_PAGES, getCanvasProjectPages } from "@/shared/contracts/canvas-project";
import { canvasPageHasActiveWork, emptyCanvasRuntimePage, nextCanvasPageName, pagedCanvasProjectDocument, type CanvasRuntimePage } from "./canvas-project-pages";
import { CanvasProjectPagesBar, CanvasPageDeleteDialog } from "./canvas-project-pages-bar";
import styles from "./canvas-page.module.css";
import canvasWorkspaceStyles from "./canvas-workspace.module.css";

function clearCanvasInterfaceSelection(root: HTMLElement, target: EventTarget | null) {
  if (target instanceof Element && target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='textbox']")) return;
  const selection = root.ownerDocument.getSelection();
  if (!selection || selection.isCollapsed) return;
  for (let index = 0; index < selection.rangeCount; index += 1) {
    if (selection.getRangeAt(index).intersectsNode(root)) {
      selection.removeAllRanges();
      return;
    }
  }
}

type CanvasReference = {
  clientId: string;
  file?: File;
  previewUrl: string;
  reference: GenerationReference;
};

type LocalCanvasUpload = {
  file: File;
  pageId: string;
  controller: AbortController | null;
  uploadedId?: string;
};

type CanvasModel = {
  id: GenerationModelId;
  catalogId?: string;
  name: string;
};

type CanvasGeneratorDraft = {
  prompt: string;
  modelKey: string | null;
  ratio: GenerationAspectRatio;
  resolution: GenerationResolution;
  count: GenerationCount;
  quality?: GptImageQuality;
  background?: GptImageBackground;
  outputFormat?: GptImageOutputFormat;
};

type CanvasGraphFrame = {
  key: string;
  nodes: CanvasNode[];
  edges: Edge[];
  drafts: Record<string, CanvasGeneratorDraft>;
  references: Record<string, CanvasReference[]>;
  converted: Record<string, GenerationReference>;
};

type CanvasClipboard = Omit<CanvasGraphFrame, "key"> & { pasteCount: number };

function canvasGraphIsStable(nodes: readonly CanvasNode[], references: Record<string, CanvasReference[]>, converted: Record<string, GenerationReference>) {
  return nodes.every((node) =>
    (node.type !== "sourceImage" && node.type !== "sourceVideo" || !node.data.uploadState) &&
    (node.type !== "imageResult" || !node.data.job.id.startsWith("pending_")) &&
    (node.type !== "imageGenerator" || !node.data.job || !["queued", "running", "refining"].includes(node.data.job.state))) &&
    Object.values(references).every((items) => items.every((item) => item.reference.status === "ready")) &&
    Object.values(converted).every((item) => item.status === "ready");
}

function cleanCanvasNode(node: CanvasNode): CanvasNode {
  if (node.type === "sourceImage" || node.type === "sourceVideo") {
    return { ...node, position: { ...node.position }, style: { ...node.style }, selected: false,
      data: { ...node.data, localPreviewUrl: undefined, onPreviewReady: undefined } } as CanvasNode;
  }
  return { ...node, position: { ...node.position }, style: { ...node.style }, selected: false };
}

function cleanCanvasReference(item: CanvasReference): CanvasReference {
  const previewUrl = privateImageUrls("reference", item.reference.id).contentUrl;
  return { clientId: item.clientId, previewUrl, reference: { ...item.reference, url: previewUrl } };
}

function canvasGraphFrame(nodes: readonly CanvasNode[], edges: readonly Edge[], drafts: Record<string, CanvasGeneratorDraft>,
  references: Record<string, CanvasReference[]>, converted: Record<string, GenerationReference>): CanvasGraphFrame {
  const cleanNodes = nodes.map(cleanCanvasNode);
  const cleanEdges = edges.map((edge) => ({ ...edge, selected: false }));
  const cleanReferences = Object.fromEntries(Object.entries(references).map(([id, items]) => [id, items.map(cleanCanvasReference)]));
  const document = snapshotCanvasProject({ nodes: cleanNodes, edges: cleanEdges, draftsByGenerator: drafts,
    referencesByGenerator: cleanReferences, convertedReferences: converted, viewport: { x: 0, y: 0, zoom: 1 } });
  return { key: JSON.stringify({ nodes: document.nodes, edges: document.edges }), nodes: cleanNodes, edges: cleanEdges,
    drafts: { ...drafts }, references: cleanReferences, converted: { ...converted } };
}

const DEFAULT_GENERATOR_DRAFT: CanvasGeneratorDraft = {
  prompt: "", modelKey: null, ratio: "adaptive", resolution: "2K", count: 1,
};

function defaultCanvasResolutionForModel(modelId: GenerationModelId): GenerationResolution {
  return modelId === "nano-banana-2" || modelId === "nano-banana-pro" ? "2K" : "1K";
}

type LinkedCanvasReference = {
  edgeId: string;
  reference: GenerationReference;
  previewUrl: string;
};

function imageSourceAsset(node: CanvasNode | undefined) {
  if (node?.type === "sourceImage") return {
    assetId: node.data.assetId,
    generated: node.data.assetKind === "generated",
    name: node.data.name,
    previewUrl: node.data.previewUrl,
  };
  if (node?.type === "imageResult") {
    const output = node.data.job.outputs[node.data.index];
    if (!output?.id) return null;
    return { assetId: output.id, generated: true, name: `生成图片 ${node.data.index + 1}`, previewUrl: output.previewUrl };
  }
  return null;
}

function redundantGeneratorBatchNodeIds(nodes: readonly CanvasNode[]) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const redundant = new Set<string>();
  for (const generator of nodes) {
    if (generator.type !== "imageGenerator" || generator.data.job?.state !== "succeeded") continue;
    for (let index = 1; index < generator.data.job.outputs.length; index += 1) {
      const id = `canvas-${generator.id}-${generator.data.job.id}-${index}`;
      const candidate = nodeById.get(id);
      if (candidate?.type === "imageResult" && candidate.data.job.id === generator.data.job.id && candidate.data.index === index) {
        redundant.add(id);
      }
    }
  }
  return redundant;
}

const CANVAS_MODEL_ORDER: readonly GenerationModelId[] = [
  "nano-banana-pro",
  "nano-banana-2",
  "gpt-image-2.5-sunburst",
  "gpt-image-2.5-flare",
  "gpt-image-2",
  "seedream-5.0-pro",
];

const CANVAS_MODEL_LABELS: Partial<Record<GenerationModelId, string>> = {
  "gpt-image-2.5-sunburst": "GPT Image 2.5 Sunburst",
  "gpt-image-2.5-flare": "GPT Image 2.5 Flare",
  "gpt-image-2": "GPT Image 2",
  "seedream-5.0-pro": "Seedream 5.0 Pro",
};

const DEFAULT_CANVAS_NAME = "未命名画布";

const generationBoundary = createHttpGenerationBoundary();

async function readCanvasImageSize(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const pixelWidth = bitmap.width;
    const pixelHeight = bitmap.height;
    const size = initialCanvasImageSize(pixelWidth, pixelHeight);
    bitmap.close();
    return size ? { ...size, pixelWidth, pixelHeight } : null;
  } catch {
    return null;
  }
}

function ratioGlyphSize(ratio: GenerationAspectRatio) {
  const [width, height] = ratio.split(":").map(Number);
  const scale = 20 / Math.max(width, height);
  return { width: Math.max(7, Math.round(width * scale)), height: Math.max(7, Math.round(height * scale)) };
}

function availableModels(summary: BillingSummary | null): CanvasModel[] {
  if (!summary) return [];
  const quoted = (modelId: GenerationModelId, catalogId?: string) =>
    summary.quotes.some((quote) =>
      quote.modelId === modelId &&
      (quote.catalogModelId ?? quote.modelId) === (catalogId ?? modelId) &&
      (quote.imageLine ?? "special") === "special" &&
      (quote.quality === undefined || quote.quality === "auto"),
    );
  const models = summary.models
    ? summary.models
      .filter((model) => model.enabled && model.mediaType === "image")
      .filter((model) => GENERATION_MODEL_CATALOG.some((item) => item.id === model.adapterId))
      .map((model) => ({
        id: model.adapterId as GenerationModelId,
        catalogId: model.id,
        name: CANVAS_MODEL_LABELS[model.adapterId as GenerationModelId] ?? model.name,
      }))
      .filter((model) => model.id === "seedream-5.0-pro" || quoted(model.id, model.catalogId))
    : GENERATION_MODEL_CATALOG
      .filter((model) => quoted(model.id))
      .map((model) => ({ id: model.id, name: CANVAS_MODEL_LABELS[model.id] ?? model.name }));
  return models.sort((left, right) =>
    CANVAS_MODEL_ORDER.indexOf(left.id) - CANVAS_MODEL_ORDER.indexOf(right.id),
  );
}

export function CanvasPage({ initialProjectId }: Readonly<{ initialProjectId?: string }>) {
  const canvasPageRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const root = canvasPageRef.current;
    if (root) clearCanvasInterfaceSelection(root, root.ownerDocument.activeElement);
  }, []);

  const [session, setSession] = useState<AuthenticationSession | null | undefined>();
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [creditUsageOpen, setCreditUsageOpen] = useState(false);
  const [draftsByGenerator, setDraftsByGenerator] = useState<Record<string, CanvasGeneratorDraft>>({});
  const [promptOverflow, setPromptOverflow] = useState(false);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [canvasName, setCanvasName] = useState(DEFAULT_CANVAS_NAME);
  const [projectId, setProjectId] = useState<string | null>(initialProjectId ?? null);
  const [projectReady, setProjectReady] = useState(false);
  const [projectPages, setProjectPages] = useState<{ id: string; name: string }[]>(() => [{ id: CANVAS_PROJECT_DEFAULT_PAGE_ID, name: "页面1" }]);
  const [activePageId, setActivePageId] = useState<string>(CANVAS_PROJECT_DEFAULT_PAGE_ID);
  const [pageSwitching, setPageSwitching] = useState(false);
  const [deletePageId, setDeletePageId] = useState<string | null>(null);
  const [projectLoadError, setProjectLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<CanvasSaveState>("saving");
  const [saveDetail, setSaveDetail] = useState<string | null>(null);
  const [canvasNameDraft, setCanvasNameDraft] = useState(DEFAULT_CANVAS_NAME);
  const [editingCanvasName, setEditingCanvasName] = useState(false);
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [assetSidebarWidth, setAssetSidebarWidth] = useState<number | null>(null);
  const [referencesByGenerator, setReferencesByGenerator] = useState<Record<string, CanvasReference[]>>({});
  const [composerHost, setComposerHost] = useState<{ id: string; element: HTMLDivElement } | null>(null);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [convertedReferences, setConvertedReferences] = useState<Record<string, GenerationReference>>({});
  const [mediaRevision, setMediaRevision] = useState(0);
  const [submittingGeneratorIds, setSubmittingGeneratorIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [assetRevision, setAssetRevision] = useState(0);
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>([]);
  const [flow, setFlow] = useState<ReactFlowInstance<CanvasNode> | null>(null);
  const flowRef = useRef<ReactFlowInstance<CanvasNode> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const promptAreaRef = useRef<HTMLDivElement>(null);
  const promptScrollbarRef = useRef<HTMLSpanElement>(null);
  const promptScrollbarThumbRef = useRef<HTMLSpanElement>(null);
  const objectUrlsRef = useRef(new Set<string>());
  const localNodeUrlsRef = useRef(new Map<string, string>());
  const localUploadsRef = useRef(new Map<string, LocalCanvasUpload>());
  const referenceUploadsRef = useRef(new Map<string, AbortController>());
  const convertedUploadsRef = useRef(new Map<string, AbortController>());
  const draggedAssetRef = useRef<CanvasLibraryAsset | null>(null);
  const mountedRef = useRef(true);
  const busyRef = useRef(false);
  const busyGeneratorIdsRef = useRef(new Set<string>());
  const automaticResolutionGeneratorIdsRef = useRef(new Set<string>());
  const cancelCanvasNameRef = useRef(false);
  const projectSyncRef = useRef<CanvasProjectSync | null>(null);
  const projectHydratingRef = useRef(false);
  const projectOwnerKeyRef = useRef<string | null>(null);
  const projectSnapshotRef = useRef<(() => Promise<void>) | null>(null);
  const projectSnapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generatedProjectIdRef = useRef<string | null>(null);
  const clipboardRef = useRef<CanvasClipboard | null>(null);
  const historyPastRef = useRef<CanvasGraphFrame[]>([]);
  const historyCurrentRef = useRef<CanvasGraphFrame | null>(null);
  const historyFutureRef = useRef<CanvasGraphFrame[]>([]);
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historySuspendedRef = useRef(false);
  const historyApplyingRef = useRef(false);
  const activePageIdRef = useRef<string>(CANVAS_PROJECT_DEFAULT_PAGE_ID);
  const pagesRef = useRef<CanvasRuntimePage[]>([emptyCanvasRuntimePage()]);
  const pageHistoryRef = useRef(new Map<string, { past: CanvasGraphFrame[]; current: CanvasGraphFrame | null;
    future: CanvasGraphFrame[]; suspended: boolean; clipboard: CanvasClipboard | null }>());
  const pageSwitchingRef = useRef(false);
  const pendingPageOperationsRef = useRef(new Map<string, number>());
  const [projectLoadRevision, setProjectLoadRevision] = useState(0);
  const latestProjectStateRef = useRef({ canvasName, draftsByGenerator, referencesByGenerator, convertedReferences, edges });
  latestProjectStateRef.current = { canvasName, draftsByGenerator, referencesByGenerator, convertedReferences, edges };

  const projectPageNodes = (pageId: string) => pageId === activePageIdRef.current
    ? flowRef.current?.getNodes() ?? nodes : pagesRef.current.find((page) => page.id === pageId)?.nodes ?? [];
  const nodePageId = (nodeId: string) => pagesRef.current.find((page) =>
    projectPageNodes(page.id).some((node) => node.id === nodeId))?.id;
  const projectNode = (id: string) => {
    const pageId = nodePageId(id);
    return pageId ? projectPageNodes(pageId).find((node) => node.id === id) : undefined;
  };
  const beginPageOperation = (pageId: string) => {
    pendingPageOperationsRef.current.set(pageId, (pendingPageOperationsRef.current.get(pageId) ?? 0) + 1);
    setMediaRevision((revision) => revision + 1);
    return () => {
      const remaining = (pendingPageOperationsRef.current.get(pageId) ?? 1) - 1;
      if (remaining) pendingPageOperationsRef.current.set(pageId, remaining);
      else pendingPageOperationsRef.current.delete(pageId);
      if (mountedRef.current) setMediaRevision((revision) => revision + 1);
    };
  };
  const updatePageNodes = (pageId: string, update: (nodes: CanvasNode[]) => CanvasNode[]) => {
    const page = pagesRef.current.find((item) => item.id === pageId);
    if (!page) return;
    if (pageId === activePageIdRef.current && flowRef.current) flowRef.current.setNodes(update);
    else {
      page.nodes = update(page.nodes);
      if (pageId === activePageIdRef.current) setNodes(page.nodes);
      setMediaRevision((revision) => revision + 1);
    }
  };
  const updateProjectNode = (id: string, update: (node: CanvasNode) => Partial<CanvasNode>) => {
    const pageId = nodePageId(id);
    if (pageId) updatePageNodes(pageId, (nodes) => nodes.map((node) => node.id === id ? { ...node, ...update(node) } as CanvasNode : node));
  };
  const activeGeneratorId = composerHost?.id ?? null;
  const submitting = activeGeneratorId ? submittingGeneratorIds.includes(activeGeneratorId) : false;
  const activeGeneratorNode = nodes.find((node) => node.id === activeGeneratorId);
  const activeGeneratorJob = activeGeneratorNode?.type === "imageGenerator" ? activeGeneratorNode.data.job : undefined;
  const generatorEditingLocked = submitting || Boolean(activeGeneratorJob &&
    ["queued", "running", "refining"].includes(activeGeneratorJob.state));
  const { prompt, modelKey, ratio, resolution, count, quality, background, outputFormat } = activeGeneratorId
    ? draftsByGenerator[activeGeneratorId] ?? DEFAULT_GENERATOR_DRAFT
    : DEFAULT_GENERATOR_DRAFT;
  const references = activeGeneratorId ? referencesByGenerator[activeGeneratorId] ?? [] : [];
  const redundantBatchNodeKey = useMemo(
    () => [...redundantGeneratorBatchNodeIds(nodes)].sort().join("\n"),
    [nodes],
  );

  useEffect(() => {
    if (!redundantBatchNodeKey) return;
    const redundantIds = new Set(redundantBatchNodeKey.split("\n"));
    const removedEdgeIds = new Set(edges
      .filter((edge) => redundantIds.has(edge.source) || redundantIds.has(edge.target))
      .map((edge) => edge.id));
    setNodes((current) => current.filter((node) => !redundantIds.has(node.id)));
    if (!removedEdgeIds.size) return;
    setEdges((current) => current.filter((edge) => !removedEdgeIds.has(edge.id)));
    removedEdgeIds.forEach((edgeId) => {
      convertedUploadsRef.current.get(edgeId)?.abort();
      convertedUploadsRef.current.delete(edgeId);
    });
    setConvertedReferences((current) => Object.fromEntries(
      Object.entries(current).filter(([edgeId]) => !removedEdgeIds.has(edgeId)),
    ));
  }, [edges, redundantBatchNodeKey, setNodes]);

  useEffect(() => { setSettingsOpen(false); }, [activeGeneratorId]);

  const fitSettingsViewport = useCallback(async ({ x, y }: { x: number; y: number }) => {
    const instance = flowRef.current;
    if (!instance || !activeGeneratorId || !instance.getNode(activeGeneratorId)) return;
    const viewport = instance.getViewport();
    await instance.setViewport({ ...viewport, x: viewport.x + x, y: viewport.y + y }, { duration: 180 });
  }, [activeGeneratorId]);

  const scheduleProjectSnapshot = useCallback((settled = false) => {
    if (!projectReady || projectHydratingRef.current) return;
    if (projectSnapshotTimerRef.current) clearTimeout(projectSnapshotTimerRef.current);
    const flushSnapshot = () => {
      if (flowRef.current?.getNodes().some((node) => node.dragging || node.resizing)) {
        projectSnapshotTimerRef.current = setTimeout(flushSnapshot, 220);
        return;
      }
      projectSnapshotTimerRef.current = null;
      void projectSnapshotRef.current?.().catch(() => {});
    };
    projectSnapshotTimerRef.current = setTimeout(flushSnapshot, settled ? 0 : 220);
  }, [projectReady]);

  const captureCanvasHistory = useCallback(() => {
    const instance = flowRef.current;
    if (!projectReady || projectHydratingRef.current || historyApplyingRef.current || !instance) return;
    const nodes = instance.getNodes();
    if (nodes.some((node) => node.dragging || node.resizing)) return;
    const current = latestProjectStateRef.current;
    const nodeIds = new Set(nodes.map((node) => node.id));
    const edgeIds = new Set(current.edges.map((edge) => edge.id));
    const references = Object.fromEntries(Object.entries(current.referencesByGenerator).filter(([id]) => nodeIds.has(id)));
    const converted = Object.fromEntries(Object.entries(current.convertedReferences).filter(([id]) => edgeIds.has(id)));
    if (!canvasGraphIsStable(nodes, references, converted)) {
      historySuspendedRef.current = true;
      return;
    }
    const drafts = Object.fromEntries(Object.entries(current.draftsByGenerator).filter(([id]) => nodeIds.has(id)));
    const frame = canvasGraphFrame(nodes, current.edges, drafts, references, converted);
    if (historySuspendedRef.current || !historyCurrentRef.current) {
      historyPastRef.current = [];
      historyFutureRef.current = [];
      historyCurrentRef.current = frame;
      historySuspendedRef.current = false;
    } else if (historyCurrentRef.current.key !== frame.key) {
      historyPastRef.current = [...historyPastRef.current.slice(-39), historyCurrentRef.current];
      historyCurrentRef.current = frame;
      historyFutureRef.current = [];
    } else {
      // Keep generator drafts and direct references current without making text edits graph-history steps.
      historyCurrentRef.current = frame;
    }
  }, [projectReady]);

  const scheduleCanvasHistory = useCallback(() => {
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => {
      historyTimerRef.current = null;
      captureCanvasHistory();
    }, 240);
  }, [captureCanvasHistory]);

  useEffect(() => {
    historyPastRef.current = [];
    historyCurrentRef.current = null;
    historyFutureRef.current = [];
    historySuspendedRef.current = false;
    clipboardRef.current = null;
    pageHistoryRef.current.clear();
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
  }, [projectId]);

  useEffect(() => {
    if (projectReady) scheduleCanvasHistory();
  }, [projectId, projectReady, edges, draftsByGenerator, referencesByGenerator, convertedReferences, scheduleCanvasHistory]);

  const saveCurrentViewport = useCallback(() => {
    if (viewportTimerRef.current) clearTimeout(viewportTimerRef.current);
    viewportTimerRef.current = null;
    const ownerKey = projectOwnerKeyRef.current;
    const projectId = projectSyncRef.current?.id;
    const instance = flowRef.current;
    if (ownerKey && projectId && instance && !projectHydratingRef.current) {
      saveCanvasViewport(ownerKey, projectId, instance.getViewport(), activePageIdRef.current);
    }
  }, []);

  const scheduleViewportPreference = useCallback(() => {
    if (!projectReady || projectHydratingRef.current) return;
    if (viewportTimerRef.current) clearTimeout(viewportTimerRef.current);
    viewportTimerRef.current = setTimeout(saveCurrentViewport, 500);
  }, [projectReady, saveCurrentViewport]);

  useEffect(() => {
    scheduleProjectSnapshot();
  }, [canvasName, draftsByGenerator, referencesByGenerator, convertedReferences, edges, mediaRevision, projectPages, scheduleProjectSnapshot]);

  useEffect(() => () => {
    if (projectSnapshotTimerRef.current) clearTimeout(projectSnapshotTimerRef.current);
    if (viewportTimerRef.current) saveCurrentViewport();
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    projectSyncRef.current?.close();
  }, [saveCurrentViewport]);

  useEffect(() => {
    const persistBeforeLeave = () => {
      if (viewportTimerRef.current) saveCurrentViewport();
      if (projectSnapshotTimerRef.current) {
        clearTimeout(projectSnapshotTimerRef.current);
        projectSnapshotTimerRef.current = null;
        // Normal in-session snapshots are the durable path. This is a best-effort
        // flush for the short interval before the next scheduled write.
        void projectSnapshotRef.current?.().catch(() => {});
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") persistBeforeLeave();
    };
    window.addEventListener("pagehide", persistBeforeLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", persistBeforeLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [saveCurrentViewport]);

  const updateGeneratorDraft = (patch: Partial<CanvasGeneratorDraft>) => {
    if (!activeGeneratorId) return;
    const generatorId = activeGeneratorId;
    if (generatorEditingLocked || busyGeneratorIdsRef.current.has(generatorId)) return;
    setDraftsByGenerator((current) => ({ ...current, [generatorId]: {
      ...DEFAULT_GENERATOR_DRAFT, ...current[generatorId], ...patch,
    } }));
  };

  const handleComposerHostChange = useCallback((id: string, element: HTMLDivElement | null) => {
    setComposerHost((current) => element
      ? current?.id === id && current.element === element ? current : { id, element }
      : current?.id === id ? null : current);
  }, []);

  const syncPromptScrollbar = useCallback(() => {
    const field = promptRef.current;
    const area = promptAreaRef.current;
    const track = promptScrollbarRef.current;
    const thumb = promptScrollbarThumbRef.current;
    if (!field || !area || !track || !thumb) return;

    const scrollRange = field.scrollHeight - field.clientHeight;
    const scrollable = scrollRange > 1;
    const scrollableState = scrollable ? "true" : "false";
    if (area.dataset.scrollable !== scrollableState) area.dataset.scrollable = scrollableState;
    if (!scrollable) return;

    const trackHeight = track.clientHeight;
    const thumbHeight = Math.min(trackHeight, Math.max(28, trackHeight * field.clientHeight / field.scrollHeight));
    const thumbTravel = Math.max(0, trackHeight - thumbHeight);
    thumb.style.height = `${thumbHeight}px`;
    const progress = Math.min(1, Math.max(0, field.scrollTop / scrollRange));
    thumb.style.transform = `translateY(${thumbTravel * progress}px)`;
  }, []);

  const syncPromptLayout = useCallback(() => {
    const field = promptRef.current;
    if (!field) return;
    field.style.height = "auto";
    const contentHeight = field.scrollHeight;
    field.style.height = `${promptExpanded ? contentHeight : Math.min(contentHeight, 188)}px`;
    if (!promptExpanded) setPromptOverflow(contentHeight > field.clientHeight + 1);
    syncPromptScrollbar();
  }, [promptExpanded, syncPromptScrollbar]);

  useLayoutEffect(() => {
    syncPromptLayout();
    window.addEventListener("resize", syncPromptLayout);
    return () => window.removeEventListener("resize", syncPromptLayout);
  }, [syncPromptLayout, activeGeneratorId]);

  useEffect(() => { setFormError(null); setPromptExpanded(false); }, [activeGeneratorId]);

  const refreshSession = useCallback(async () => {
    try {
      const next = await readAuthenticationSession();
      setSessionError(null);
      if (!next) {
        window.location.replace(authenticationEntryPath("login", "/canvas"));
        setSession(null);
        return;
      }
      setSession(next);
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "登录状态暂时无法确认，请重试。");
    }
  }, []);

  const refreshBilling = useCallback(async () => {
    setBillingLoading(true);
    setBillingError(null);
    try {
      const next = await readBillingSummary();
      setBilling(next);
      setBillingError(null);
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : "当前报价暂时无法读取，请重试。");
    } finally {
      setBillingLoading(false);
    }
  }, []);

  const handleCreditAccountChange = useCallback((account: BillingSummary["account"]) => {
    setBilling((current) => current ? { ...current, account } : current);
  }, []);

  useEffect(() => {
    let current = true;
    void readAuthenticationSession().then((next) => {
      if (!current) return;
      if (!next) {
        window.location.replace(authenticationEntryPath("login", "/canvas"));
        setSession(null);
      } else {
        setSession(next);
      }
    }).catch((error: unknown) => {
      if (current) setSessionError(error instanceof Error ? error.message : "登录状态暂时无法确认，请重试。");
    });
    return () => { current = false; };
  }, []);
  useEffect(() => {
    if (session?.access.status !== "active") return;
    let current = true;
    void readBillingSummary().then((next) => {
      if (current) { setBilling(next); setBillingError(null); }
    }).catch((error: unknown) => {
      if (current) setBillingError(error instanceof Error ? error.message : "当前报价暂时无法读取，请重试。");
    }).finally(() => { if (current) setBillingLoading(false); });
    return () => { current = false; };
  }, [session?.access.status]);
  useEffect(() => {
    const expired = () => window.location.replace(authenticationEntryPath("login", "/canvas"));
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
  }, []);
  useEffect(() => {
    mountedRef.current = true;
    const objectUrls = objectUrlsRef.current;
    return () => {
      mountedRef.current = false;
      localUploadsRef.current.forEach((upload) => upload.controller?.abort());
      localUploadsRef.current.clear();
      referenceUploadsRef.current.forEach((controller) => controller.abort());
      referenceUploadsRef.current.clear();
      convertedUploadsRef.current.forEach((controller) => controller.abort());
      convertedUploadsRef.current.clear();
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const models = useMemo(() => availableModels(billing), [billing]);
  useEffect(() => {
    if (!models.length) return;
    const defaultResolution = defaultCanvasResolutionForModel(models[0].id);
    setDraftsByGenerator((current) => {
      let next = current;
      for (const id of automaticResolutionGeneratorIdsRef.current) {
        const draft = current[id];
        if (!draft || draft.modelKey !== null || draft.resolution === defaultResolution) continue;
        next = { ...next, [id]: { ...draft, resolution: defaultResolution } };
      }
      return next;
    });
  }, [models]);
  const changeGeneratorModel = (value: string) => {
    if (!activeGeneratorId) return;
    const selectedModel = models.find((item) => (item.catalogId ?? item.id) === value);
    updateGeneratorDraft({ modelKey: value,
      ...(selectedModel && automaticResolutionGeneratorIdsRef.current.has(activeGeneratorId)
        ? { resolution: defaultCanvasResolutionForModel(selectedModel.id) } : {}),
    });
  };
  const model = models.find((item) => (item.catalogId ?? item.id) === modelKey) ?? models[0];
  const selectedRatio = model ? resolveCanvasGenerationAspectRatioForModel(model.id, ratio) : ratio;
  const selectedCount = model ? resolveCanvasGenerationCountForModel(model.id, count) : count;
  const gptOptions = resolveGptImageOptionsForModel(model?.id ?? "nano-banana-2", { quality, background, outputFormat });
  const gptModel = Boolean(model && isGptImageModelId(model.id));
  const seedreamModel = model?.id === "seedream-5.0-pro";
  const resolutionOptions = model ? getCanvasGenerationResolutionOptions(model.id) : [];
  const pricedResolutions = model
    ? resolutionOptions.filter((value) => Boolean(findBillingQuote(billing, {
        modelId: model.id,
        catalogModelId: model.catalogId,
        count: selectedCount,
        resolution: value,
        quality: gptOptions.quality,
      })))
    : [];
  const shownResolutions = seedreamModel ? resolutionOptions : pricedResolutions;
  const selectedResolution = shownResolutions.includes(resolution) ? resolution : shownResolutions[0];
  const linkedReferences = useMemo<LinkedCanvasReference[]>(() => {
    if (!activeGeneratorId || !flow) return [];
    return edges.filter((edge) => edge.target === activeGeneratorId).map((edge) => {
      const node = flow.getNode(edge.source);
      const asset = imageSourceAsset(node);
      const converted = convertedReferences[edge.id];
      const reference: GenerationReference = asset?.generated
        ? converted ?? { id: edge.id, name: asset.name, url: "", status: "uploading" }
        : asset?.assetId && node?.type === "sourceImage" && node.data.uploadState !== "uploading" && node.data.uploadState !== "failed"
          ? { id: asset.assetId, name: asset.name, url: "", status: "ready" }
          : { id: edge.id, name: asset?.name ?? "图片", url: "", status: node?.type === "sourceImage" && node.data.uploadState === "failed" ? "failed" : "uploading", errorMessage: node?.type === "sourceImage" ? node.data.uploadError : undefined };
      return { edgeId: edge.id, reference, previewUrl: asset?.previewUrl ?? "" };
    });
  }, [activeGeneratorId, flow, edges, convertedReferences, mediaRevision]);
  const displayReferences = [
    ...references.map((item) => ({ key: item.clientId, kind: "direct" as const, reference: item.reference, previewUrl: item.previewUrl })),
    ...linkedReferences.map((item) => ({ key: item.edgeId, kind: "linked" as const, reference: item.reference, previewUrl: item.previewUrl })),
  ];
  const referenceCount = new Set(displayReferences.map((item) => item.reference.id)).size;
  const quote = model && selectedResolution
    ? findBillingQuote(billing, {
        modelId: model.id,
        catalogModelId: model.catalogId,
        count: selectedCount,
        resolution: selectedResolution,
        quality: gptOptions.quality,
        referenceCount,
      })
    : null;
  const referencesBusy = displayReferences.some((item) => item.reference.status === "uploading");
  const referencesFailed = displayReferences.some((item) => item.reference.status === "failed");
  const insufficientCredits = Boolean(
    quote && billing && BigInt(billing.account.availableCredits) < BigInt(quote.creditAmount),
  );
  const canGenerate = Boolean(
    session?.access.status === "active" && !session.preview && quote &&
    prompt.trim() && !referencesBusy && !referencesFailed && !insufficientCredits &&
    !billingLoading && !billingError && !generatorEditingLocked,
  );
  const upload = (generatorId: string, items: CanvasReference[]) => {
    for (const item of items) {
      if (!item.file) continue;
      const controller = new AbortController();
      referenceUploadsRef.current.set(item.clientId, controller);
      const file = item.file;
      void (async () => {
        if (projectOwnerKeyRef.current) {
          try {
            await writeLocalCanvasFile(projectOwnerKeyRef.current, item.clientId, file);
            projectSyncRef.current?.markFilePersistenceReady(item.clientId);
          } catch {
            projectSyncRef.current?.markFilePersistenceFailed(item.clientId);
            setSaveState("local-error");
            setSaveDetail("参考图未能写入本地存储；请检查浏览器存储空间。");
          }
        }
        return uploadReferenceFiles([{ clientId: item.clientId, file }], (clientId, reference) => {
        if (controller.signal.aborted) return;
        setReferencesByGenerator((current) => current[generatorId]
          ? { ...current, [generatorId]: current[generatorId].map((value) => value.clientId === clientId
              ? { ...value, reference: { ...reference, url: value.previewUrl } }
              : value) }
          : current);
        if (reference.status === "ready" && projectOwnerKeyRef.current) {
          const ownerKey = projectOwnerKeyRef.current;
          setTimeout(() => {
            void projectSnapshotRef.current?.().then(() => removeLocalCanvasFile(ownerKey, clientId))
              .then(() => projectSyncRef.current?.markFilePersistenceReady(clientId)).catch(() => {});
          }, 0);
        }
      }, null, controller.signal);
      })().catch(() => {}).finally(() => {
        if (referenceUploadsRef.current.get(item.clientId) === controller) referenceUploadsRef.current.delete(item.clientId);
      });
    }
  };

  const addReferenceFiles = (files: File[]) => {
    if (!files.length) return;
    if (!activeGeneratorId) return;
    if (session?.access.status !== "active" || session.preview) { setFormError("当前无法上传参考图，请确认登录状态。"); return; }
    const accepted: CanvasReference[] = [];
    const { accepted: validFiles, errors } = selectCanvasImageFiles(files);
    setFormError(errors[0] ?? null);
    for (const file of validFiles) {
      if (references.length + linkedReferences.length + accepted.length >= MAX_GENERATION_REFERENCES) {
        setFormError(`最多可添加 ${MAX_GENERATION_REFERENCES} 张参考图。`);
        break;
      }
      const clientId = globalThis.crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      objectUrlsRef.current.add(previewUrl);
      accepted.push({
        clientId, file, previewUrl,
        reference: { id: clientId, name: file.name, status: "uploading", url: previewUrl },
      });
    }
    if (!accepted.length) return;
    historySuspendedRef.current = true;
    const generatorId = activeGeneratorId;
    setReferencesByGenerator((current) => ({ ...current, [generatorId]: [...(current[generatorId] ?? []), ...accepted] }));
    upload(generatorId, accepted);
  };

  const addReferences = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    addReferenceFiles(files);
  };

  const refreshUploadedVideoSource = async (id: string, assetId: string): Promise<boolean> => {
    try {
      const material = (await listPrivateVideoMaterials(null)).find((item) => item.id === assetId);
      const node = projectNode(id);
      if (!mountedRef.current || !material || node?.type !== "sourceVideo" || material.url === node.data.previewUrl) return false;
      updateProjectNode(id, () => ({ data: { ...node.data, previewUrl: material.url } }));
      return true;
    } catch {
      return false;
    }
  };

  const releaseLocalPreview = (id: string) => {
    const localUrl = localNodeUrlsRef.current.get(id);
    if (!localUrl) return;
    URL.revokeObjectURL(localUrl);
    objectUrlsRef.current.delete(localUrl);
    localNodeUrlsRef.current.delete(id);
    updateProjectNode(id, (node) => node.type === "sourceImage" || node.type === "sourceVideo"
      ? { data: { ...node.data, localPreviewUrl: undefined, onPreviewReady: undefined } }
      : {});
  };

  const copyCanvasSelection = () => {
    const instance = flowRef.current;
    if (!instance) return false;
    const selected = instance.getNodes().filter((node) => node.selected);
    if (!selected.length) return false;
    const ids = new Set(selected.map((node) => node.id));
    const current = latestProjectStateRef.current;
    const selectedEdges = current.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));
    const unavailable = selected.some((node) =>
      (node.type === "sourceImage" || node.type === "sourceVideo" || node.type === "sourceAudio") && !node.data.assetId ||
      (node.type === "sourceImage" || node.type === "sourceVideo") && Boolean(node.data.uploadState) ||
      node.type === "imageResult" && (node.data.job.state !== "succeeded" || !node.data.job.outputs[node.data.index]?.id) ||
      node.type === "imageGenerator" && (Boolean(node.data.job && node.data.job.state !== "succeeded") ||
        (current.referencesByGenerator[node.id] ?? []).some((item) => item.reference.status !== "ready")) ||
      selectedEdges.some((edge) => edge.source === node.id && imageSourceAsset(node)?.generated &&
        current.convertedReferences[edge.id]?.status !== "ready"));
    if (unavailable) {
      setFormError("请等待选中素材或参考图准备完成后再复制。");
      return false;
    }
    const drafts = Object.fromEntries(selected.filter((node) => node.type === "imageGenerator")
      .map((node) => [node.id, current.draftsByGenerator[node.id] ?? DEFAULT_GENERATOR_DRAFT]));
    const references = Object.fromEntries(selected.filter((node) => node.type === "imageGenerator")
      .map((node) => [node.id, current.referencesByGenerator[node.id] ?? []]));
    const converted = Object.fromEntries(selectedEdges.flatMap((edge) => current.convertedReferences[edge.id]
      ? [[edge.id, current.convertedReferences[edge.id]] as const] : []));
    const frame = canvasGraphFrame(selected, selectedEdges, drafts, references, converted);
    clipboardRef.current = { nodes: frame.nodes, edges: frame.edges, drafts: frame.drafts,
      references: frame.references, converted: frame.converted, pasteCount: 0 };
    setFormError(null);
    return true;
  };

  const pasteCanvasSelection = () => {
    const instance = flowRef.current;
    const clipboard = clipboardRef.current;
    if (!instance || !clipboard?.nodes.length || !projectReady) return;
    captureCanvasHistory();
    clipboard.pasteCount += 1;
    const offset = 32 * clipboard.pasteCount;
    const ids = new Map(clipboard.nodes.map((node) => [node.id, node.type === "imageGenerator"
      ? `generator-${crypto.randomUUID()}` : node.type === "imageResult"
        ? `canvas-${crypto.randomUUID()}-0` : `asset-${crypto.randomUUID()}`] as const));
    let nextSequence = Math.max(0, ...instance.getNodes().filter((node) => node.type === "imageGenerator")
      .map((node) => node.data.sequence ?? 0));
    const pastedNodes: CanvasNode[] = clipboard.nodes.map((node) => {
      const id = ids.get(node.id)!;
      const base = { ...node, id, position: { x: node.position.x + offset, y: node.position.y + offset }, selected: true };
      if (node.type === "sourceVideo") return { ...base, type: "sourceVideo", data: {
        ...node.data, onRefreshSource: node.data.assetId
          ? () => refreshUploadedVideoSource(id, node.data.assetId!) : undefined,
      } };
      if (node.type === "sourceImage") return { ...base, type: "sourceImage", data: { ...node.data } };
      if (node.type === "sourceAudio") return { ...base, type: "sourceAudio", data: { ...node.data } };
      if (node.type === "imageResult") return { ...base, type: "imageResult", data: {
        ...node.data, onRetry: () => { void runJob(node.data.job.input); },
      } };
      return { ...base, type: "imageGenerator", data: { ...node.data, sequence: ++nextSequence } };
    });
    const pastedEdges = clipboard.edges.map((edge) => ({ ...edge,
      id: `reference-${ids.get(edge.source)}-${ids.get(edge.target)}`,
      source: ids.get(edge.source)!, target: ids.get(edge.target)!, selected: false,
    }));
    const pastedDrafts = Object.fromEntries(Object.entries(clipboard.drafts).map(([id, draft]) => [ids.get(id)!, { ...draft }]));
    const pastedReferences = Object.fromEntries(Object.entries(clipboard.references).map(([id, items]) => [ids.get(id)!,
      items.map((item) => ({ ...item, clientId: crypto.randomUUID(), reference: { ...item.reference } }))]));
    const pastedConverted = Object.fromEntries(clipboard.edges.flatMap((edge, index) => clipboard.converted[edge.id]
      ? [[pastedEdges[index].id, { ...clipboard.converted[edge.id] }] as const] : []));
    instance.setNodes((current) => [...current.map((node) => node.selected ? { ...node, selected: false } : node), ...pastedNodes]);
    setEdges((current) => [...current.map((edge) => edge.selected ? { ...edge, selected: false } : edge), ...pastedEdges]);
    if (Object.keys(pastedDrafts).length) setDraftsByGenerator((current) => ({ ...current, ...pastedDrafts }));
    if (Object.keys(pastedReferences).length) setReferencesByGenerator((current) => ({ ...current, ...pastedReferences }));
    if (Object.keys(pastedConverted).length) setConvertedReferences((current) => ({ ...current, ...pastedConverted }));
    scheduleCanvasHistory();
  };

  const navigateCanvasHistory = (direction: "undo" | "redo") => {
    if (historyTimerRef.current) {
      clearTimeout(historyTimerRef.current);
      historyTimerRef.current = null;
    }
    captureCanvasHistory();
    if (historySuspendedRef.current) return;
    const instance = flowRef.current;
    const current = historyCurrentRef.current;
    const source = direction === "undo" ? historyPastRef.current : historyFutureRef.current;
    const target = source.pop();
    if (!instance || !current || !target) return;
    const destination = direction === "undo" ? historyFutureRef.current : historyPastRef.current;
    destination.push(current);
    historyCurrentRef.current = target;
    historyApplyingRef.current = true;
    const targetIds = new Set(target.nodes.map((node) => node.id));
    for (const node of instance.getNodes()) if (!targetIds.has(node.id)) releaseLocalPreview(node.id);
    const live = latestProjectStateRef.current;
    const currentIds = new Set(instance.getNodes().map((node) => node.id));
    const generators = target.nodes.filter((node) => node.type === "imageGenerator").map((node) => node.id);
    instance.setNodes(target.nodes.map(cleanCanvasNode));
    setEdges(target.edges.map((edge) => ({ ...edge, selected: false })));
    const retainedDrafts = Object.fromEntries(Object.entries(live.draftsByGenerator).filter(([id]) => !currentIds.has(id)));
    const retainedReferences = Object.fromEntries(Object.entries(live.referencesByGenerator).filter(([id]) => !currentIds.has(id)));
    const currentEdgeIds = new Set(live.edges.map((edge) => edge.id));
    const retainedConverted = Object.fromEntries(Object.entries(live.convertedReferences).filter(([id]) => !currentEdgeIds.has(id)));
    setDraftsByGenerator({ ...retainedDrafts, ...Object.fromEntries(generators.map((id) => [id,
      currentIds.has(id) ? live.draftsByGenerator[id] ?? target.drafts[id] ?? DEFAULT_GENERATOR_DRAFT
        : target.drafts[id] ?? DEFAULT_GENERATOR_DRAFT])) });
    setReferencesByGenerator({ ...retainedReferences, ...Object.fromEntries(generators.map((id) => [id,
      currentIds.has(id) ? live.referencesByGenerator[id] ?? target.references[id] ?? [] : target.references[id] ?? []])) });
    setConvertedReferences({ ...retainedConverted, ...target.converted });
    setTimeout(() => { historyApplyingRef.current = false; }, 0);
    scheduleProjectSnapshot();
  };

  const startLocalUpload = (id: string) => {
    const upload = localUploadsRef.current.get(id);
    if (!upload || upload.controller) return;
    if (upload.pageId === activePageIdRef.current) historySuspendedRef.current = true;
    const controller = new AbortController();
    upload.controller = controller;
    const pageId = upload.pageId;
    updatePageNodes(pageId, (nodes) => nodes.map((node) => node.id === id && (node.type === "sourceImage" || node.type === "sourceVideo")
      ? { ...node, data: { ...node.data, uploadState: "uploading", uploadError: undefined } } : node));
    setMediaRevision((current) => current + 1);
    void (async () => {
      try {
        if (projectOwnerKeyRef.current) {
          try {
            await writeLocalCanvasFile(projectOwnerKeyRef.current, id, upload.file);
            projectSyncRef.current?.markFilePersistenceReady(id);
          } catch {
            projectSyncRef.current?.markFilePersistenceFailed(id);
            setSaveState("local-error");
            setSaveDetail("素材未能写入本地存储；请检查浏览器存储空间。");
          }
        }
        let assetId = upload.uploadedId;
        if (!assetId) {
          if (upload.file.type === "video/mp4") {
            const result = await uploadPrivateVideoMaterial(id, upload.file, null, controller.signal);
            assetId = result.id;
          } else {
            const [result] = await uploadReferenceFiles([{ clientId: id, file: upload.file }], () => {}, null, controller.signal);
            if (result?.reference.status !== "ready") throw new Error(result?.reference.errorMessage ?? "图片上传失败，请重试。");
            assetId = result.reference.id;
          }
          upload.uploadedId = assetId;
        }
        controller.signal.throwIfAborted();
        if (!assetId) throw new Error("上传结果缺少素材标识，请重试。");
        const readyAssetId = assetId;
        const isVideo = upload.file.type === "video/mp4";
        const material = isVideo ? (await listPrivateVideoMaterials(null, controller.signal)).find((item) => item.id === readyAssetId) : null;
        if (isVideo && !material) throw new Error("视频已上传，但暂时无法读取，请点击重试。");
        const previewUrl = isVideo ? material!.url : privateImageUrls("reference", readyAssetId).contentUrl;
        if (!mountedRef.current || controller.signal.aborted || localUploadsRef.current.get(id) !== upload) return;
        const finish = (current: CanvasNode[]) => current.map((node) => node.id === id &&
          (node.type === "sourceImage" || node.type === "sourceVideo")
          ? { ...node, selected: true, data: { ...node.data, previewUrl, uploadState: undefined,
              uploadError: undefined, onRetryUpload: undefined, assetId: readyAssetId,
              localPreviewUrl: localNodeUrlsRef.current.get(id),
              onPreviewReady: () => releaseLocalPreview(id),
              ...(isVideo ? { onRefreshSource: () => refreshUploadedVideoSource(id, readyAssetId) } : {}) } }
          : node);
        updatePageNodes(pageId, finish);
        localUploadsRef.current.delete(id);
        setMediaRevision((current) => current + 1);
        setAssetRevision((current) => current + 1);
        if (projectOwnerKeyRef.current) {
          const ownerKey = projectOwnerKeyRef.current;
          setTimeout(() => {
            void projectSnapshotRef.current?.().then(() => removeLocalCanvasFile(ownerKey, id))
              .then(() => projectSyncRef.current?.markFilePersistenceReady(id)).catch(() => {});
          }, 0);
        }
      } catch (cause) {
        if (controller.signal.aborted || !mountedRef.current || localUploadsRef.current.get(id) !== upload) return;
        const message = cause instanceof Error ? cause.message : "上传失败，请重试。";
        updateProjectNode(id, (node) => node.type === "sourceImage" || node.type === "sourceVideo"
          ? { data: { ...node.data, uploadState: "failed", uploadError: message } }
          : {});
        setMediaRevision((current) => current + 1);
      } finally {
        if (localUploadsRef.current.get(id) === upload && upload.controller === controller) upload.controller = null;
      }
    })();
  };

  const addCanvasMedia = async (files: File[], screenPoint: { x: number; y: number }) => {
    const pageId = activePageIdRef.current;
    if (session?.access.status !== "active" || session.preview) {
      setFormError("登录后才能将图片或视频上传到资产库。");
      return;
    }
    const { accepted, errors } = selectCanvasMediaFiles(files);
    setFormError(errors[0] ?? null);
    if (!accepted.length) return;
    const point = flow?.screenToFlowPosition(screenPoint) ?? { x: 0, y: 0 };
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      setFormError("画布位置暂时不可用，请刷新页面后重试。");
      return;
    }
    const positions = canvasImagePositions(point, accepted.length);
    const finishPageOperation = beginPageOperation(pageId);
    try {
    const sizes = await Promise.all(accepted.map((file) =>
      file.type === "video/mp4" ? Promise.resolve(null) : readCanvasImageSize(file)));
    if (!mountedRef.current) return;
    const added: Array<CanvasSourceNode | CanvasVideoNode> = accepted.map((file, index) => {
      const id = `local-${globalThis.crypto.randomUUID()}`;
      const previewUrl = URL.createObjectURL(file);
      objectUrlsRef.current.add(previewUrl);
      localNodeUrlsRef.current.set(id, previewUrl);
      localUploadsRef.current.set(id, { file, pageId, controller: null });
      if (file.type === "video/mp4") {
        return {
          id,
          type: "sourceVideo",
          position: positions[index],
          style: { width: 238, height: 158 },
          data: { name: file.name, previewUrl, uploadState: "uploading", onRetryUpload: () => startLocalUpload(id) },
        };
      }
      return {
        id,
        type: "sourceImage",
        position: positions[index],
        style: { width: sizes[index]?.width ?? 238, height: sizes[index]?.height ?? 158 },
        data: {
          name: file.name,
          previewUrl,
          uploadState: "uploading",
          onRetryUpload: () => startLocalUpload(id),
          imageSized: Boolean(sizes[index]),
          pixelWidth: sizes[index]?.pixelWidth,
          pixelHeight: sizes[index]?.pixelHeight,
        },
      };
    });
    updatePageNodes(pageId, (current) => [...current.map((node) => node.selected ? { ...node, selected: false } : node), ...added]);
    scheduleProjectSnapshot(true);
    for (const node of added) startLocalUpload(node.id);
    } finally { finishPageOperation(); }
  };

  const addLibraryAsset = async (item: CanvasLibraryAsset, screenPoint: { x: number; y: number }) => {
    const pageId = activePageIdRef.current;
    if (!flow) return;
    const point = flow.screenToFlowPosition(screenPoint);
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      setFormError("画布位置暂时不可用，请刷新页面后重试。");
      return;
    }
    const position = canvasImagePositions(point, 1)[0];
    const finishPageOperation = beginPageOperation(pageId);
    try {
      const sourceUrl = item.sourceUrl ?? (item.kind === "generated" ? await readAssetDownloadUrl(item.id, null) : null);
      if (!mountedRef.current) return;
      if (!sourceUrl) throw new Error("资产暂时无法读取，请重试。");
      const id = `asset-${globalThis.crypto.randomUUID()}`;
      const node: CanvasSourceNode | CanvasVideoNode | CanvasAudioNodeType = item.media === "image"
        ? { id, type: "sourceImage", position, style: { width: 238, height: 158 },
            data: { name: item.name, previewUrl: sourceUrl, assetId: item.id, assetKind: item.kind === "generated" ? "generated" : "reference" } }
        : item.media === "video"
          ? { id, type: "sourceVideo", position, style: { width: 238, height: 158 },
              data: { name: item.name, previewUrl: sourceUrl, assetId: item.id } }
          : { id, type: "sourceAudio", position: { x: position.x, y: position.y + 80 },
              data: { name: item.name, sourceUrl, assetId: item.id } };
      captureCanvasHistory();
      updatePageNodes(pageId, (current) => [...current, node]);
      setFormError(null);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "资产暂时无法读取，请重试。");
    } finally { finishPageOperation(); }
  };

  const startGeneratedReferenceImport = (edgeId: string, assetId: string, name: string) => {
    historySuspendedRef.current = true;
    convertedUploadsRef.current.get(edgeId)?.abort();
    const controller = new AbortController();
    convertedUploadsRef.current.set(edgeId, controller);
    setConvertedReferences((current) => ({ ...current, [edgeId]: { id: edgeId, name, url: "", status: "uploading" } }));
    void (async () => {
      try {
        const response = await goodGoodApiFetch("/api/references/from-asset", {
          method: "POST",
          headers: { "content-type": "application/json", ...workspaceRequestHeaders(null) },
          body: JSON.stringify({ assetId }),
          signal: controller.signal,
        });
        const payload = await response.json() as { id?: string; name?: string; status?: string; error?: { message?: string } };
        if (!response.ok) throw new Error(payload.error?.message ?? "无法将生成图片用作参考图，请重试。");
        if (payload.status !== "ready" || !payload.id) throw new Error("参考图还未准备好，请重试。");
        if (convertedUploadsRef.current.get(edgeId) !== controller) return;
        const readyId = payload.id;
        setConvertedReferences((current) => ({ ...current, [edgeId]: { id: readyId, name: payload.name ?? name, url: privateImageUrls("reference", readyId).contentUrl, status: "ready" } }));
      } catch (cause) {
        if (controller.signal.aborted || convertedUploadsRef.current.get(edgeId) !== controller) return;
        setConvertedReferences((current) => ({ ...current, [edgeId]: {
          id: edgeId, name, url: "", status: "failed",
          errorMessage: cause instanceof Error ? cause.message : "参考图导入失败，请重试。",
        } }));
      } finally {
        if (convertedUploadsRef.current.get(edgeId) === controller) convertedUploadsRef.current.delete(edgeId);
      }
    })();
  };

  const forgetConvertedReference = (edgeId: string) => {
    convertedUploadsRef.current.get(edgeId)?.abort();
    convertedUploadsRef.current.delete(edgeId);
    setConvertedReferences((current) => {
      if (!current[edgeId]) return current;
      const next = { ...current };
      delete next[edgeId];
      return next;
    });
  };

  const isValidReferenceConnection = (connection: Connection | Edge) => {
    const instance = flowRef.current;
    if (!instance || !connection.source || !connection.target || connection.source === connection.target ||
        connection.sourceHandle !== "reference" || connection.targetHandle !== "reference") return false;
    const source = instance.getNode(connection.source);
    const target = instance.getNode(connection.target);
    const asset = imageSourceAsset(source);
    if (target?.type !== "imageGenerator" || !asset || (!asset.assetId && source?.type !== "sourceImage")) return false;
    if (source?.type === "sourceImage" && !asset.assetId && !source.data.uploadState) return false;
    const existing = instance.getEdges().filter((edge) => edge.target === target.id);
    if (existing.length + (referencesByGenerator[target.id]?.length ?? 0) >= MAX_GENERATION_REFERENCES) return false;
    if (asset.assetId && !asset.generated && referencesByGenerator[target.id]?.some((item) =>
      item.reference.status === "ready" && item.reference.id === asset.assetId)) return false;
    return !existing.some((edge) => edge.source === connection.source ||
      Boolean(asset.assetId && imageSourceAsset(instance.getNode(edge.source))?.assetId === asset.assetId));
  };

  const connectReference = (connection: Connection) => {
    if (!isValidReferenceConnection(connection)) return;
    captureCanvasHistory();
    const source = flowRef.current?.getNode(connection.source);
    const asset = imageSourceAsset(source);
    if (!asset) return;
    const id = `reference-${connection.source}-${connection.target}`;
    const referenceEdge: BuiltInEdge = {
      ...connection,
      id,
      type: "default",
      animated: true,
      pathOptions: { curvature: canvasReferenceEdgeCurvature },
      style: canvasReferenceEdgeStyle,
    };
    setEdges((current) => addEdge(referenceEdge, current));
    if (asset.generated && asset.assetId) startGeneratedReferenceImport(id, asset.assetId, asset.name);
  };

  const changeEdges = (changes: EdgeChange[]) => {
    for (const change of changes) if (change.type === "remove") forgetConvertedReference(change.id);
    setEdges((current) => applyEdgeChanges(changes, current));
  };

  const createGenerator = (screenPoint: { x: number; y: number }) => {
    const instance = flowRef.current;
    if (!instance) return;
    const position = instance.screenToFlowPosition(screenPoint);
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) return;
    const size = initialCanvasImageSize(238, 238) ?? { width: 238, height: 238 };
    const id = `generator-${globalThis.crypto.randomUUID()}`;
    const sequence = Math.max(0, ...instance.getNodes().filter((node) => node.type === "imageGenerator")
      .map((node) => node.data.sequence ?? 0)) + 1;
    const generator: CanvasGeneratorNodeType = {
      id, type: "imageGenerator", position: { x: position.x - size.width / 2, y: position.y - size.height / 2 },
      style: size, data: { sequence },
    };
    instance.setNodes((current) => [...current.map((node) => node.selected ? { ...node, selected: false } : node), generator]);
    automaticResolutionGeneratorIdsRef.current.add(id);
    setDraftsByGenerator((current) => ({ ...current, [id]: {
      ...DEFAULT_GENERATOR_DRAFT,
      quality: "auto", background: "auto",
      resolution: models[0] ? defaultCanvasResolutionForModel(models[0].id) : DEFAULT_GENERATOR_DRAFT.resolution,
    } }));
  };

  const handleNodesChange = (changes: NodeChange<CanvasNode>[]) => {
    const removed = new Set(changes.filter((change) => change.type === "remove").map((change) => change.id));
    const removedFiles = new Set(removed);
    if (removed.size) {
      const discardedEdges = edges.filter((edge) => removed.has(edge.source) || removed.has(edge.target));
      for (const edge of discardedEdges) forgetConvertedReference(edge.id);
      setEdges((current) => current.filter((edge) => !removed.has(edge.source) && !removed.has(edge.target)));
      for (const id of removed) for (const item of referencesByGenerator[id] ?? []) {
        removedFiles.add(item.clientId);
        referenceUploadsRef.current.get(item.clientId)?.abort();
        referenceUploadsRef.current.delete(item.clientId);
        URL.revokeObjectURL(item.previewUrl);
        objectUrlsRef.current.delete(item.previewUrl);
      }
      setReferencesByGenerator((current) => {
        if (![...removed].some((id) => current[id])) return current;
        const next = { ...current };
        for (const id of removed) delete next[id];
        return next;
      });
      setDraftsByGenerator((current) => {
        if (![...removed].some((id) => current[id])) return current;
        const next = { ...current };
        for (const id of removed) delete next[id];
        return next;
      });
    }
    for (const id of removed) {
      automaticResolutionGeneratorIdsRef.current.delete(id);
      localUploadsRef.current.get(id)?.controller?.abort();
      localUploadsRef.current.delete(id);
      const previewUrl = localNodeUrlsRef.current.get(id);
      if (!previewUrl) continue;
      URL.revokeObjectURL(previewUrl);
      objectUrlsRef.current.delete(previewUrl);
      localNodeUrlsRef.current.delete(id);
    }
    if (removedFiles.size && projectOwnerKeyRef.current) {
      const ownerKey = projectOwnerKeyRef.current;
      setTimeout(() => {
        void Promise.resolve(projectSnapshotRef.current?.()).then(() =>
          Promise.all([...removedFiles].map((id) => removeLocalCanvasFile(ownerKey, id))))
          .then(() => { for (const id of removedFiles) projectSyncRef.current?.markFilePersistenceReady(id); })
          .catch(() => {});
      }, 0);
    }
    // React Flow owns defaultNodes and already applies drag changes to its store.
    // Mirroring every position frame into CanvasPage rerenders the composer and
    // asset sidebar while a node moves, which can make image dragging stutter.
    if (!flow) onNodesChange(changes);
  };

  const onCanvasDragOver = (event: DragEvent<HTMLElement>) => {
    if (draggedAssetRef.current && Array.from(event.dataTransfer.types).includes("application/x-goodgood-canvas-asset")) {
      event.preventDefault();
      const sidebar = document.getElementById("canvas-asset-sidebar")?.getBoundingClientRect();
      const overSidebar = Boolean(sidebar && event.clientX < sidebar.right);
      event.dataTransfer.dropEffect = overSidebar ? "none" : "copy";
      setDropActive(!overSidebar);
      return;
    }
    if (!Array.from(event.dataTransfer.types).includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDropActive(true);
  };

  const onCanvasDrop = (event: DragEvent<HTMLElement>) => {
    const draggedAsset = draggedAssetRef.current;
    if (draggedAsset && Array.from(event.dataTransfer.types).includes("application/x-goodgood-canvas-asset")) {
      event.preventDefault();
      draggedAssetRef.current = null;
      setDropActive(false);
      const sidebar = document.getElementById("canvas-asset-sidebar")?.getBoundingClientRect();
      if (sidebar && event.clientX < sidebar.right) return;
      void addLibraryAsset(draggedAsset, { x: event.clientX, y: event.clientY });
      return;
    }
    if (!event.dataTransfer.files.length) return;
    event.preventDefault();
    setDropActive(false);
    if (event.target instanceof Element && event.target.closest("#canvas-asset-sidebar")) return;
    void addCanvasMedia(Array.from(event.dataTransfer.files), { x: event.clientX, y: event.clientY });
  };

  const removeReference = (generatorId: string, clientId: string) => {
    referenceUploadsRef.current.get(clientId)?.abort();
    referenceUploadsRef.current.delete(clientId);
    const removed = referencesByGenerator[generatorId]?.find((item) => item.clientId === clientId);
    if (removed) {
      URL.revokeObjectURL(removed.previewUrl);
      objectUrlsRef.current.delete(removed.previewUrl);
    }
    setReferencesByGenerator((current) => ({ ...current, [generatorId]: (current[generatorId] ?? []).filter((item) => item.clientId !== clientId) }));
    if (projectOwnerKeyRef.current) {
      const ownerKey = projectOwnerKeyRef.current;
      setTimeout(() => {
        void Promise.resolve(projectSnapshotRef.current?.())
          .then(() => removeLocalCanvasFile(ownerKey, clientId))
          .then(() => projectSyncRef.current?.markFilePersistenceReady(clientId)).catch(() => {});
      }, 0);
    }
  };

  const retryReference = (generatorId: string, clientId: string) => {
    const item = referencesByGenerator[generatorId]?.find((value) => value.clientId === clientId);
    if (!item) return;
    setReferencesByGenerator((current) => ({ ...current, [generatorId]: (current[generatorId] ?? []).map((value) => value.clientId === clientId
      ? { ...value, reference: { ...value.reference, status: "uploading", errorMessage: undefined } }
      : value) }));
    upload(generatorId, [item]);
  };

  const removeLinkedReference = (edgeId: string) => {
    captureCanvasHistory();
    forgetConvertedReference(edgeId);
    setEdges((current) => current.filter((edge) => edge.id !== edgeId));
  };

  const retryLinkedReference = (edgeId: string) => {
    const edge = edges.find((item) => item.id === edgeId);
    const node = edge ? flowRef.current?.getNode(edge.source) : undefined;
    const source = imageSourceAsset(node);
    if (!source) return;
    if (source.generated && source.assetId) startGeneratedReferenceImport(edgeId, source.assetId, source.name);
    else if (node?.type === "sourceImage") node.data.onRetryUpload?.();
  };

  const runJob = async (snapshot: GenerationInputSnapshot, previous?: { runKey: string; job: GenerationJob }) => {
    const pageId = activePageIdRef.current;
    if (busyRef.current) return;
    historySuspendedRef.current = true;
    busyRef.current = true;
    setFormError(null);
    const runKey = previous?.runKey ?? globalThis.crypto.randomUUID();
    const canvasBounds = document.getElementById("canvas-workspace-surface")?.getBoundingClientRect();
    const coveredWidth = assetsOpen ? document.getElementById("canvas-asset-sidebar")?.getBoundingClientRect().width ?? 0 : 0;
    const visibleCenter = flow?.screenToFlowPosition({
      x: canvasBounds ? canvasBounds.left + coveredWidth + (canvasBounds.width - coveredWidth) / 2 : window.innerWidth / 2,
      y: canvasBounds ? canvasBounds.top + canvasBounds.height * 0.38 : window.innerHeight * 0.38,
    }) ?? { x: 0, y: 0 };
    const currentNodes = flow?.getNodes() ?? nodes;
    const rowBottom = currentNodes.reduce((bottom, node) => Math.max(bottom, node.position.y + 350), visibleCenter.y - 120);
    const previousPosition = previous && currentNodes.find((node) => node.id === `canvas-${runKey}-0`)?.position;
    const origin = previousPosition ?? {
      x: visibleCenter.x - (snapshot.count * 254 - 16) / 2,
      y: currentNodes.length ? rowBottom + 24 : visibleCenter.y - 120,
    };
    const observe = (job: GenerationJob) => {
      const upsert = (current: CanvasNode[]) => upsertCanvasJobNodes(current, runKey, job, origin, () => void runJob(job.input, { runKey, job }));
      updatePageNodes(pageId, upsert);
      if (!job.id.startsWith("pending_") && job.state === "queued" || ["succeeded", "failed", "cancelled"].includes(job.state)) {
        void refreshBilling();
      }
    };
    try {
      if (previous?.job.state === "failed" && !previous.job.id.startsWith("pending_")) {
        await generationBoundary.retry(previous.job, observe);
      } else {
        await generationBoundary.service.submit(snapshot, observe);
      }
    } finally {
      busyRef.current = false;
    }
  };

  const runGeneratorJob = async (generatorId: string, snapshot: GenerationInputSnapshot, resumeJob?: GenerationJob) => {
    if (busyGeneratorIdsRef.current.has(generatorId)) return;
    busyGeneratorIdsRef.current.add(generatorId);
    if (nodePageId(generatorId) === activePageIdRef.current) historySuspendedRef.current = true;
    setSubmittingGeneratorIds((current) => [...current, generatorId]);
    setFormError(null);
    const observe = (job: GenerationJob) => {
      const pageId = nodePageId(generatorId);
      const generator = projectNode(generatorId);
      const previousJob = generator?.type === "imageGenerator" ? generator.data.job : undefined;
      const changed = !previousJob || previousJob.id !== job.id || previousJob.state !== job.state ||
        previousJob.outputs.length !== job.outputs.length ||
        previousJob.outputs.some((output, index) => output.id !== job.outputs[index]?.id) ||
        previousJob.error?.message !== job.error?.message;
      if (!changed) return;
      if (!pageId || !generator) {
        if (["succeeded", "failed", "cancelled"].includes(job.state)) void refreshBilling();
        if (job.state === "succeeded") setAssetRevision((current) => current + 1);
        return;
      }
      updatePageNodes(pageId, (current) => current.map((node) => {
        if (node.id !== generatorId || node.type !== "imageGenerator") return node;
        const output = job.state === "succeeded" ? job.outputs[0] : undefined;
        const size = output ? initialCanvasImageSize(output.width ?? NaN, output.height ?? NaN) : null;
        return { ...node,
          ...(size ? { style: { ...node.style, ...size } } : {}),
          data: { ...node.data, job, imageSized: Boolean(size) },
        };
      }));
      if ((!job.id.startsWith("pending_") && job.state === "queued") || ["succeeded", "failed", "cancelled"].includes(job.state)) {
        void refreshBilling();
      }
      if (job.state === "succeeded") setAssetRevision((current) => current + 1);
    };
    try {
      if (resumeJob) {
        observe(resumeJob);
        await generationBoundary.resume(resumeJob, observe);
      } else {
        await generationBoundary.service.submit(snapshot, observe);
      }
    } finally {
      busyGeneratorIdsRef.current.delete(generatorId);
      setSubmittingGeneratorIds((current) => current.filter((id) => id !== generatorId));
      scheduleCanvasHistory();
    }
  };

  const generate = () => {
    if (!activeGeneratorId) return;
    if (session?.access.status !== "active" || session.preview || generatorEditingLocked ||
        busyGeneratorIdsRef.current.has(activeGeneratorId)) return;
    if (!prompt.trim()) { setFormError("请先输入画面描述。"); return; }
    if (prompt.length > 4_000) { setFormError("画面描述不能超过 4000 个字符。"); return; }
    if (referencesBusy) { setFormError("参考图仍在上传，请稍候。"); return; }
    if (referencesFailed) { setFormError("请重试或移除上传失败的参考图。"); return; }
    if (displayReferences.length > MAX_GENERATION_REFERENCES) { setFormError(`最多可添加 ${MAX_GENERATION_REFERENCES} 张参考图。`); return; }
    if (billingLoading || billingError || !model || !selectedResolution || !quote) { setFormError("当前模型报价不可用，请刷新后重试。"); return; }
    if (insufficientCredits) { setFormError("可用积分不足，请先补充积分。"); return; }
    const projectSync = projectSyncRef.current;
    if (!projectSync || projectSync.snapshot.version === null) {
      projectSync?.retry();
      setFormError("项目正在同步，请稍后重试生成。");
      return;
    }
    const snapshot = createGenerationInputSnapshot({
      prompt,
      references: displayReferences.filter((item, index, all) =>
        all.findIndex((candidate) => candidate.reference.id === item.reference.id) === index).map((item) => item.reference),
      modelId: model.id,
      catalogModelId: model.catalogId,
      expectedPriceVersion: quote.priceVersion,
      routingPolicy: "canvas-image-v1",
      ...gptOptions,
      aspectRatio: selectedRatio,
      resolution: selectedResolution,
      count: selectedCount,
      projectId: null,
      canvasProjectId: projectSync.id,
    });
    setDraftsByGenerator((current) => ({ ...current, [activeGeneratorId]: {
      prompt, modelKey: model.catalogId ?? model.id, ratio: selectedRatio,
      resolution: selectedResolution, count: selectedCount,
      ...gptOptions,
    } }));
    void runGeneratorJob(activeGeneratorId, snapshot);
  };

  projectSnapshotRef.current = async () => {
    const sync = projectSyncRef.current;
    const instance = flowRef.current;
    if (!sync || !instance || projectHydratingRef.current) return;
    const current = latestProjectStateRef.current;
    const pages = pagesRef.current.map((page) => {
      const active = page.id === activePageIdRef.current;
      const { schemaVersion: _schemaVersion, ...document } = snapshotCanvasProject({
        nodes: active ? instance.getNodes() : page.nodes,
        edges: active ? current.edges : page.edges,
        draftsByGenerator: current.draftsByGenerator,
        referencesByGenerator: current.referencesByGenerator,
        convertedReferences: current.convertedReferences,
        viewport: page.viewport,
      });
      return { ...document, id: page.id, name: page.name };
    });
    await sync.update(current.canvasName, pagedCanvasProjectDocument(pages));
    await sync.flushLocal();
  };

  const pageDeletionDisabled = (pageId: string) => {
    const page = pagesRef.current.find((item) => item.id === pageId);
    return !page || Boolean(pendingPageOperationsRef.current.get(pageId)) || canvasPageHasActiveWork({ ...page, nodes: projectPageNodes(pageId) }, {
      busyGeneratorIds: busyGeneratorIdsRef.current,
      uploadingNodeIds: new Set([...localUploadsRef.current].filter(([, upload]) => upload.controller).map(([id]) => id)),
      referenceStatuses: referencesByGenerator,
      convertingEdgeIds: new Set(convertedUploadsRef.current.keys()),
    });
  };

  const activateProjectPage = async (pageId: string) => {
    const instance = flowRef.current;
    const page = pagesRef.current.find((item) => item.id === pageId);
    if (!instance || !page) return;
    const previous = pagesRef.current.find((item) => item.id === activePageIdRef.current);
    if (previous) {
      previous.nodes = instance.getNodes().map((node) => ({ ...node, selected: false }));
      previous.edges = latestProjectStateRef.current.edges.map((edge) => ({ ...edge, selected: false }));
      pageHistoryRef.current.set(previous.id, { past: historyPastRef.current, current: historyCurrentRef.current,
        future: historyFutureRef.current, suspended: historySuspendedRef.current, clipboard: clipboardRef.current });
    }
    projectHydratingRef.current = true;
    const history = pageHistoryRef.current.get(pageId);
    historyPastRef.current = history?.past ?? [];
    historyCurrentRef.current = history?.current ?? null;
    historyFutureRef.current = history?.future ?? [];
    historySuspendedRef.current = history?.suspended ?? false;
    clipboardRef.current = history?.clipboard ?? null;
    activePageIdRef.current = pageId;
    setActivePageId(pageId);
    setComposerHost(null);
    setSettingsOpen(false);
    setPromptExpanded(false);
    setFormError(null);
    setDeletePageId(null);
    const edges = page.edges.map((edge) => ({ ...edge, selected: false }));
    latestProjectStateRef.current = { ...latestProjectStateRef.current, edges };
    // React Flow batches setNodes. Finish the page replacement before taking a
    // snapshot so the next page cannot briefly serialize the previous graph.
    flushSync(() => {
      instance.setNodes(page.nodes.map((node) => ({ ...node, selected: false })));
      setEdges(edges);
    });
    const ownerKey = projectOwnerKeyRef.current;
    const id = projectSyncRef.current?.id;
    await instance.setViewport(ownerKey && id ? readCanvasViewport(ownerKey, id, pageId) ?? page.viewport : page.viewport);
    if (ownerKey && id) saveCanvasActivePage(ownerKey, id, pageId);
    projectHydratingRef.current = false;
  };

  const switchProjectPage = async (pageId: string) => {
    if (pageId === activePageIdRef.current || pageSwitchingRef.current || !projectReady) return;
    pageSwitchingRef.current = true;
    setPageSwitching(true);
    try {
      if (projectSnapshotTimerRef.current) clearTimeout(projectSnapshotTimerRef.current);
      projectSnapshotTimerRef.current = null;
      if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
      captureCanvasHistory();
      saveCurrentViewport();
      await projectSnapshotRef.current?.();
      await activateProjectPage(pageId);
      await projectSnapshotRef.current?.();
    } catch {
      setFormError("本地保存失败，请检查浏览器存储空间后再切换页面。");
    } finally {
      projectHydratingRef.current = false;
      pageSwitchingRef.current = false;
      setPageSwitching(false);
    }
  };

  const addProjectPage = async () => {
    if (!projectReady || pageSwitchingRef.current || pagesRef.current.length >= CANVAS_PROJECT_MAX_PAGES) return;
    pageSwitchingRef.current = true;
    setPageSwitching(true);
    try {
      captureCanvasHistory();
      saveCurrentViewport();
      await projectSnapshotRef.current?.();
      const page = emptyCanvasRuntimePage(`page-${crypto.randomUUID()}`, nextCanvasPageName(pagesRef.current));
      pagesRef.current = [...pagesRef.current, page];
      setProjectPages(pagesRef.current.map(({ id, name }) => ({ id, name })));
      await activateProjectPage(page.id);
      await projectSnapshotRef.current?.();
    } catch {
      setSaveState("local-error");
      setSaveDetail("新增页面未能保存到本机，请检查浏览器存储空间并重试同步。");
    } finally {
      projectHydratingRef.current = false;
      pageSwitchingRef.current = false;
      setPageSwitching(false);
    }
  };

  const deleteProjectPage = async () => {
    const pageId = deletePageId;
    if (!pageId || pageSwitchingRef.current || pagesRef.current.length <= 1 || pageDeletionDisabled(pageId)) return;
    pageSwitchingRef.current = true;
    setPageSwitching(true);
    try {
      saveCurrentViewport();
      await projectSnapshotRef.current?.();
      if (pageDeletionDisabled(pageId)) return;
      const index = pagesRef.current.findIndex((page) => page.id === pageId);
      const deleted = pagesRef.current[index];
      if (!deleted) return;
      if (pageId === activePageIdRef.current) await activateProjectPage(pagesRef.current[index > 0 ? index - 1 : 1].id);
      pagesRef.current = pagesRef.current.filter((page) => page.id !== pageId);
      pageHistoryRef.current.delete(pageId);
      const nodeIds = new Set(deleted.nodes.map((node) => node.id));
      const edgeIds = new Set(deleted.edges.map((edge) => edge.id));
      const removedFiles = [...nodeIds];
      for (const id of nodeIds) {
        releaseLocalPreview(id);
        localUploadsRef.current.get(id)?.controller?.abort();
        localUploadsRef.current.delete(id);
        automaticResolutionGeneratorIdsRef.current.delete(id);
        for (const item of referencesByGenerator[id] ?? []) {
          removedFiles.push(item.clientId);
          referenceUploadsRef.current.get(item.clientId)?.abort();
          referenceUploadsRef.current.delete(item.clientId);
          if (objectUrlsRef.current.delete(item.previewUrl)) URL.revokeObjectURL(item.previewUrl);
        }
      }
      for (const id of edgeIds) {
        convertedUploadsRef.current.get(id)?.abort();
        convertedUploadsRef.current.delete(id);
      }
      const removeKeys = <T,>(entries: Record<string, T>, ids: Set<string>) => Object.fromEntries(Object.entries(entries).filter(([id]) => !ids.has(id)));
      const latest = latestProjectStateRef.current;
      const drafts = removeKeys(latest.draftsByGenerator, nodeIds);
      const references = removeKeys(latest.referencesByGenerator, nodeIds);
      const converted = removeKeys(latest.convertedReferences, edgeIds);
      latestProjectStateRef.current = { ...latest, draftsByGenerator: drafts, referencesByGenerator: references, convertedReferences: converted };
      setDraftsByGenerator(drafts);
      setReferencesByGenerator(references);
      setConvertedReferences(converted);
      setProjectPages(pagesRef.current.map(({ id, name }) => ({ id, name })));
      setDeletePageId(null);
      await projectSnapshotRef.current?.();
      const ownerKey = projectOwnerKeyRef.current;
      if (ownerKey) for (const id of removedFiles) {
        await removeLocalCanvasFile(ownerKey, id).catch(() => {});
        projectSyncRef.current?.markFilePersistenceReady(id);
      }
    } catch {
      setSaveState("local-error");
      setSaveDetail("页面修改未能保存到本机，请检查浏览器存储空间并重试同步。");
    } finally {
      projectHydratingRef.current = false;
      pageSwitchingRef.current = false;
      setPageSwitching(false);
    }
  };

  useEffect(() => {
    if (!session || session.access.status !== "active" || !flow) return;
    if (session.preview) {
      setProjectReady(true);
      return;
    }
    const ownerKey = session.user.id ?? session.user.email;
    if (!ownerKey) {
      setProjectLoadError("无法确认画布所属账户，请重新登录后重试。");
      return;
    }
    const id = initialProjectId ?? generatedProjectIdRef.current ?? crypto.randomUUID();
    generatedProjectIdRef.current = id;
    let active = true;
    if (viewportTimerRef.current) saveCurrentViewport();
    projectSyncRef.current?.close();
    projectSyncRef.current = null;
    projectHydratingRef.current = true;
    projectOwnerKeyRef.current = ownerKey;
    setProjectReady(false);
    setProjectLoadError(null);
    setProjectId(id);
    if (!initialProjectId) window.history.replaceState(window.history.state, "", `/canvas/${id}`);

    const restore = async (entry: LocalCanvasProject) => {
      const savedPages = getCanvasProjectPages(entry.document);
      const preferredPageId = readCanvasActivePage(ownerKey, entry.id);
      const activeSavedPage = savedPages.find((page) => page.id === preferredPageId) ?? savedPages[0];
      // Recover all pages once so uploads and confirmed jobs keep updating their origin page.
      const document = {
        nodes: savedPages.flatMap((page) => page.nodes),
        edges: savedPages.flatMap((page) => page.edges),
        generators: Object.assign({}, ...savedPages.map((page) => page.generators)),
        convertedReferences: Object.assign({}, ...savedPages.map((page) => page.convertedReferences ?? {})),
      } as Pick<import("@/shared/contracts/canvas-project").CanvasPageDocument, "nodes" | "edges" | "generators" | "convertedReferences">;
      const hasVideo = document.nodes.some((node) => node.type === "sourceVideo" && node.asset);
      const hasAudio = document.nodes.some((node) => node.type === "sourceAudio" && node.asset);
      const hasReferences = Object.values(document.generators).some((generator) => generator.directReferenceIds.length > 0);
      const [videoMaterials, audioMaterials, referenceMaterials] = await Promise.all([
        hasVideo ? listPrivateVideoMaterials(null).catch(() => []) : Promise.resolve([]),
        hasAudio ? listPrivateAudioMaterials(null).catch(() => []) : Promise.resolve([]),
        hasReferences ? listReferenceMaterials(null).catch(() => []) : Promise.resolve([]),
      ]);
      const restoredNodes = await Promise.all(document.nodes.map(async (saved): Promise<CanvasNode | null> => {
        const style = saved.size ? { width: saved.size.width, height: saved.size.height } : undefined;
        const base = { id: saved.id, position: saved.position, ...(style ? { style } : {}) };
        if (saved.type === "imageGenerator") {
          const job = saved.jobId
            ? saved.jobId.startsWith("pending_") ? saved.localJob : await goodGoodApiFetch(
              `/api/generations/${encodeURIComponent(saved.jobId)}`, { cache: "no-store" },
            ).then((response) => response.ok ? response.json() as Promise<GenerationJob> : Promise.reject()).catch(() => saved.localJob)
            : undefined;
          const restoredJob: GenerationJob | undefined = job?.id.startsWith("pending_") &&
            ["queued", "running", "refining"].includes(job.state)
            ? { ...job, state: "failed", error: {
              code: "SUBMISSION_UNKNOWN", title: "生成状态未确认",
              message: "请求可能仍在处理，请先检查资产库，再决定是否重新生成。", retryable: false,
            } } : job;
          const sequence = saved.sequence ?? document.nodes.filter((item) => item.type === "imageGenerator")
            .findIndex((item) => item.id === saved.id) + 1;
          return { ...base, type: "imageGenerator",
            data: { sequence, job: restoredJob, imageSized: Boolean(style && restoredJob?.outputs[0]) } };
        }
        if (saved.type === "sourceImage" || saved.type === "sourceVideo") {
          let previewUrl = "";
          let pendingFile: File | null = null;
          if (saved.pendingFileId) {
            pendingFile = await readLocalCanvasFile(ownerKey, saved.pendingFileId).catch(() => null);
            if (pendingFile) {
              previewUrl = URL.createObjectURL(pendingFile);
              objectUrlsRef.current.add(previewUrl);
              localNodeUrlsRef.current.set(saved.id, previewUrl);
              localUploadsRef.current.set(saved.id, { file: pendingFile,
                pageId: savedPages.find((page) => page.nodes.some((node) => node.id === saved.id))!.id, controller: null });
            }
          } else if (saved.asset?.kind === "reference") {
            previewUrl = privateImageUrls("reference", saved.asset.id).contentUrl;
          } else if (saved.asset?.kind === "generated") {
            previewUrl = privateImageUrls("asset", saved.asset.id).contentUrl;
          } else if (saved.asset?.kind === "video") {
            previewUrl = videoMaterials.find((item) => item.id === saved.asset?.id)?.url ?? "";
          }
          const uploadState = saved.pendingFileId ? "failed" as const : undefined;
          const uploadError = saved.pendingFileId
            ? pendingFile ? "素材尚未上传，网络恢复后可重试。" : "本地素材文件不可用，请重新添加。"
            : undefined;
          if (saved.type === "sourceImage") return {
            ...base, type: "sourceImage",
            data: {
              name: saved.name ?? "图片",
              previewUrl,
              assetId: saved.asset?.id,
              assetKind: saved.asset?.kind === "generated" ? "generated" : "reference",
              imageSized: Boolean(style),
              pixelWidth: saved.metadata?.pixelWidth,
              pixelHeight: saved.metadata?.pixelHeight,
              uploadState,
              uploadError,
              ...(pendingFile ? { onRetryUpload: () => startLocalUpload(saved.id) } : {}),
            },
          };
          return {
            ...base, type: "sourceVideo",
            data: {
              name: saved.name ?? "视频",
              previewUrl,
              assetId: saved.asset?.id,
              videoSized: videoFrameMatches(style, saved.metadata?.pixelWidth, saved.metadata?.pixelHeight),
              pixelWidth: saved.metadata?.pixelWidth,
              pixelHeight: saved.metadata?.pixelHeight,
              durationSeconds: saved.metadata?.durationSeconds,
              uploadState,
              uploadError,
              ...(pendingFile ? { onRetryUpload: () => startLocalUpload(saved.id) } : {}),
              ...(saved.asset?.id ? { onRefreshSource: () => refreshUploadedVideoSource(saved.id, saved.asset!.id) } : {}),
            },
          };
        }
        if (saved.type === "sourceAudio") {
          const material = audioMaterials.find((item) => item.id === saved.asset?.id);
          return { ...base, type: "sourceAudio", data: {
            name: saved.name ?? material?.name ?? "音频",
            sourceUrl: material?.url ?? "",
            assetId: saved.asset?.id,
          } };
        }
        if (saved.type === "imageResult" && saved.jobId) {
          const job = saved.jobId.startsWith("pending_") ? saved.localJob : await goodGoodApiFetch(
            `/api/generations/${encodeURIComponent(saved.jobId)}`, { cache: "no-store" },
          ).then((response) => response.ok ? response.json() as Promise<GenerationJob> : Promise.reject()).catch(() => saved.localJob);
          if (!job) return null;
          const runKey = /^canvas-(.+)-\d+$/.exec(saved.id)?.[1] ?? crypto.randomUUID();
          return { ...base, type: "imageResult",
            data: {
            job,
            index: saved.index ?? 0,
            imageSized: Boolean(style),
            onRetry: () => {
              if (job.id.startsWith("pending_")) return;
              void runJob(job.input, { runKey, job });
            },
          } };
        }
        return null;
      }));
      if (!active) return;
      const allNodes = restoredNodes.filter((node): node is CanvasNode => node !== null);
      const allEdges = document.edges.map((edge) => ({
        ...edge,
        type: "default", animated: true,
        pathOptions: { curvature: canvasReferenceEdgeCurvature },
        style: canvasReferenceEdgeStyle,
      }));
      pagesRef.current = savedPages.map((page) => {
        const nodeIds = new Set(page.nodes.map((node) => node.id));
        const edgeIds = new Set(page.edges.map((edge) => edge.id));
        return { id: page.id, name: page.name, nodes: allNodes.filter((node) => nodeIds.has(node.id)),
          edges: allEdges.filter((edge) => edgeIds.has(edge.id)), viewport: { ...page.viewport } };
      });
      activePageIdRef.current = activeSavedPage.id;
      setActivePageId(activeSavedPage.id);
      setProjectPages(savedPages.map(({ id, name }) => ({ id, name })));
      const activeRuntimePage = pagesRef.current.find((page) => page.id === activeSavedPage.id)!;
      flow.setNodes(activeRuntimePage.nodes);
      setEdges(activeRuntimePage.edges);
      automaticResolutionGeneratorIdsRef.current.clear();
      setDraftsByGenerator(Object.fromEntries(Object.entries(document.generators).map(([generatorId, value]) => [generatorId, value.draft])));
      const restoredReferences: Record<string, CanvasReference[]> = {};
      for (const [generatorId, generator] of Object.entries(document.generators)) {
        const ready = generator.directReferenceIds.map((referenceId) => {
          const previewUrl = privateImageUrls("reference", referenceId).contentUrl;
          const name = referenceMaterials.find((material) => material.id === referenceId)?.name ?? "参考图";
          return { clientId: referenceId, previewUrl, reference: {
            id: referenceId, name, status: "ready" as const, url: previewUrl,
          } };
        });
        const pending = await Promise.all((generator.pendingReferences ?? []).map(async ({ id: fileId, name }) => {
          const file = await readLocalCanvasFile(ownerKey, fileId).catch(() => null);
          if (!file) return null;
          const previewUrl = URL.createObjectURL(file);
          objectUrlsRef.current.add(previewUrl);
          return { clientId: fileId, file, previewUrl, reference: {
            id: fileId, name, status: "failed" as const, url: previewUrl,
            errorMessage: "参考图尚未上传，网络恢复后可重试。",
          } };
        }));
        restoredReferences[generatorId] = [...ready, ...pending.filter((item): item is NonNullable<typeof item> => item !== null)];
      }
      if (!active) return;
      setReferencesByGenerator(restoredReferences);
      setConvertedReferences(Object.fromEntries(Object.entries(document.convertedReferences ?? {}).map(([edgeId, referenceId]) => [
        edgeId, { id: referenceId, name: "参考图", status: "ready" as const,
          url: privateImageUrls("reference", referenceId).contentUrl },
      ])));
      setCanvasName(entry.name);
      setCanvasNameDraft(entry.name);
      await flow.setViewport(readCanvasViewport(ownerKey, entry.id, activeSavedPage.id) ?? activeSavedPage.viewport);
      if (!active) return;
      projectHydratingRef.current = false;
      const sync = new CanvasProjectSync(ownerKey, entry, (state, detail) => {
        if (!active) return;
        setSaveState(state);
        setSaveDetail(detail ?? null);
      }, (newId) => {
        saveCanvasViewport(ownerKey, newId, flow.getViewport(), activePageIdRef.current);
        saveCanvasActivePage(ownerKey, newId, activePageIdRef.current);
        window.history.replaceState(window.history.state, "", `/canvas/${newId}`);
        setProjectId(newId);
      });
      projectSyncRef.current?.close();
      projectSyncRef.current = sync;
      setSaveState(entry.dirty ? "offline" : "saved");
      setProjectReady(true);
      if (entry.dirty) sync.retry();
      for (const node of restoredNodes) {
        if ((node?.type === "sourceImage" || node?.type === "sourceVideo") && node.data.uploadState === "failed" && localUploadsRef.current.has(node.id) && navigator.onLine) {
          startLocalUpload(node.id);
        }
        if (node?.type === "imageGenerator" && node.data.job && !node.data.job.id.startsWith("pending_") &&
            ["queued", "running", "refining"].includes(node.data.job.state) && navigator.onLine) {
          void runGeneratorJob(node.id, node.data.job.input, node.data.job);
        }
      }
      if (navigator.onLine) for (const [generatorId, refs] of Object.entries(restoredReferences)) {
        upload(generatorId, refs.filter((item) => item.file));
      }
    };

    void (async () => {
      let local: LocalCanvasProject | null = null;
      try { local = await readLocalCanvasProject(ownerKey, id); }
      catch { setSaveState("local-error"); setSaveDetail("本地画布读取失败，请检查浏览器存储空间。"); }
      if (!active) return;
      if (local) {
        // Restore the browser copy immediately. A slow or offline API must not
        // hold a recoverable canvas behind the loading state.
        await restore(local);
        if (!active || local.dirty) return;
        void readCanvasProject(id).then(async (remote) => {
          const sync = projectSyncRef.current;
          if (!active || !sync || sync.snapshot.version !== local.version || sync.snapshot.dirty ||
              projectSnapshotTimerRef.current || remote.version <= (local.version ?? 0)) return;
          const updated = localCanvasProjectFromRemote(remote);
          await writeLocalCanvasProject(ownerKey, updated);
          if (!active || projectSyncRef.current !== sync || sync.snapshot.dirty || projectSnapshotTimerRef.current) return;
          projectHydratingRef.current = true;
          sync.close();
          await restore(updated);
        }).catch(() => {
          // The locally restored version remains usable. A later edit uses CAS,
          // so a server-side change is preserved as a separate project.
        });
        return;
      }
      if (initialProjectId) {
        const remote = await readCanvasProject(id);
        const entry = localCanvasProjectFromRemote(remote);
        await writeLocalCanvasProject(ownerKey, entry);
        if (active) await restore(entry);
        return;
      }
      const entry: LocalCanvasProject = {
        id, name: DEFAULT_CANVAS_NAME, version: null, dirty: true,
        updatedAt: new Date().toISOString(),
        document: { schemaVersion: 2, pages: [{ id: CANVAS_PROJECT_DEFAULT_PAGE_ID, name: "页面1",
          nodes: [], edges: [], generators: {}, viewport: { x: 0, y: 0, zoom: 1 } }] },
      };
      await writeLocalCanvasProject(ownerKey, entry);
      if (active) await restore(entry);
    })().catch((error: unknown) => {
      if (!active) return;
      projectHydratingRef.current = false;
      setProjectLoadError(error instanceof Error ? error.message : "画布项目暂时无法读取，请重试。");
    });
    return () => { active = false; };
  }, [session, flow, initialProjectId, projectLoadRevision, saveCurrentViewport]);

  useEffect(() => {
    if (!projectReady || !session || session.preview) return;
    const resume = () => {
      projectSyncRef.current?.retry();
      for (const [id, item] of localUploadsRef.current) if (!item.controller) startLocalUpload(id);
      for (const [generatorId, refs] of Object.entries(referencesByGenerator)) {
        upload(generatorId, refs.filter((item) => item.file && item.reference.status === "failed"));
      }
      for (const node of pagesRef.current.flatMap((page) => projectPageNodes(page.id))) {
        if (node.type === "imageGenerator" && node.data.job && !node.data.job.id.startsWith("pending_") &&
            ["queued", "running", "refining"].includes(node.data.job.state)) {
          void runGeneratorJob(node.id, node.data.job.input, node.data.job);
        }
      }
    };
    window.addEventListener("online", resume);
    return () => window.removeEventListener("online", resume);
  }, [projectReady, session, referencesByGenerator]);

  if (session && session.access.status !== "active") {
    return <AccountAccessGate session={session} onRefresh={() => void refreshSession()} onLogout={() => void signOut()} />;
  }

  return (
    <main
      id="canvas-active-page"
      ref={canvasPageRef}
      className={`${styles.page} ${assetsOpen ? styles.assetsOpen : ""}`}
      data-canvas-project-id={projectId ?? undefined}
      style={assetSidebarWidth === null ? undefined : { "--canvas-sidebar-preferred-width": `${assetSidebarWidth}px` } as CSSProperties}
      onDragOver={onCanvasDragOver}
      onPointerDownCapture={(event) => clearCanvasInterfaceSelection(event.currentTarget, event.target)}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropActive(false);
      }}
      onDrop={onCanvasDrop}
    >
      <CanvasWorkspace assetsOpen={assetsOpen} onAssetsOpenChange={setAssetsOpen} assetSidebarWidth={assetSidebarWidth} onAssetSidebarWidthChange={setAssetSidebarWidth} assetLibraryEnabled={Boolean(session && session.access.status === "active" && !session.preview)} assetRevision={assetRevision}
        edges={edges} onEdgesChange={changeEdges} onConnect={connectReference} isValidConnection={isValidReferenceConnection}
        onDeleteEdge={removeLinkedReference}
        onSelectAll={() => {
          const instance = flowRef.current;
          if (!instance) return;
          instance.setNodes((current) => current.some((node) => node.selectable !== false && !node.selected)
            ? current.map((node) => node.selectable === false || node.selected ? node : { ...node, selected: true }) : current);
          setEdges((current) => current.some((edge) => edge.selectable !== false && !edge.selected)
            ? current.map((edge) => edge.selectable === false || edge.selected ? edge : { ...edge, selected: true }) : current);
        }}
        onClearSelection={() => {
          flowRef.current?.setNodes((current) => current.some((node) => node.selected)
            ? current.map((node) => node.selected ? { ...node, selected: false } : node) : current);
          setEdges((current) => current.some((edge) => edge.selected)
            ? current.map((edge) => edge.selected ? { ...edge, selected: false } : edge) : current);
        }}
        onCopy={copyCanvasSelection}
        onPaste={pasteCanvasSelection}
        onPasteImages={(files) => {
          if (!projectReady || pageSwitching || !flow) return;
          const bounds = document.getElementById("canvas-workspace-surface")?.getBoundingClientRect();
          if (!bounds) return;
          const coveredWidth = assetsOpen ? document.getElementById("canvas-asset-sidebar")?.getBoundingClientRect().width ?? 0 : 0;
          void addCanvasMedia(files, {
            x: bounds.left + coveredWidth + (bounds.width - coveredWidth) / 2,
            y: bounds.top + bounds.height / 2,
          });
        }}
        onUndo={() => navigateCanvasHistory("undo")}
        onRedo={() => navigateCanvasHistory("redo")}
        onBeforeGraphEdit={captureCanvasHistory}
        onCreateGenerator={createGenerator} onComposerHostChange={handleComposerHostChange}
        onProjectGraphChange={(settled) => { scheduleProjectSnapshot(settled); scheduleCanvasHistory(); }}
        onViewportSettled={scheduleViewportPreference}
        onAssetDragStart={(item) => { draggedAssetRef.current = item; }}
        onAssetDragEnd={() => { draggedAssetRef.current = null; setDropActive(false); }}
        onInit={(instance) => {
        flowRef.current = instance;
        setFlow(instance);
        if (nodes.length) instance.setNodes(nodes);
      }} onNodesChange={handleNodesChange} />
      {pageSwitching && <div className={styles.pageSwitchOverlay} aria-label="正在保存页面" />}
      {dropActive && <div className={styles.dropOverlay} aria-hidden="true">松开以添加素材到画布</div>}
      <header className={styles.header}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className={styles.brandTrigger} aria-label="GoodGood 菜单">
              <Image src="/goodgood-g-icon.svg" alt="" width={20} height={20} className={styles.brandIcon} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="start" sideOffset={8} className={styles.brandMenu}>
            <DropdownMenuItem asChild className={styles.brandMenuItem}>
              <a href="/create">主页</a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {editingCanvasName ? (
          <span className={styles.canvasNameEditor}>
            <span className={styles.canvasNameMirror} aria-hidden="true">{canvasNameDraft || "\u00a0"}</span>
            <Input
              autoFocus
              className={styles.canvasNameInput}
              value={canvasNameDraft}
              size={1}
              maxLength={20}
              aria-label="画布名称，最多 20 字"
              onChange={(event) => setCanvasNameDraft(event.target.value)}
              onFocus={(event) => event.currentTarget.select()}
              onBlur={() => {
                if (cancelCanvasNameRef.current) {
                  cancelCanvasNameRef.current = false;
                  setCanvasNameDraft(canvasName);
                } else {
                  setCanvasName(canvasNameDraft.trim() || DEFAULT_CANVAS_NAME);
                }
                setEditingCanvasName(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  if (event.key === "Escape") cancelCanvasNameRef.current = true;
                  event.currentTarget.blur();
                }
              }}
            />
          </span>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={styles.canvasNameTrigger}
            aria-label={`编辑画布名称，当前 ${canvasName}`}
            onClick={() => {
              setCanvasNameDraft(canvasName);
              setEditingCanvasName(true);
            }}
          >
            <span className={styles.canvasNameText}>{canvasName}</span>
          </Button>
        )}
        {projectReady && <CanvasProjectPagesBar pages={projectPages.map((page) => ({ ...page, deletingDisabled: pageDeletionDisabled(page.id) }))}
          activePageId={activePageId} busy={pageSwitching} onSwitch={(id) => void switchProjectPage(id)}
          onAdd={() => void addProjectPage()} onDeleteRequest={setDeletePageId} />}
        <span className={styles.headerSpacer} />
        {projectReady && !session?.preview && (
          <button type="button" className={styles.saveStatus}
            title={saveDetail ?? (saveState === "saved" ? "所有画布更改已保存" : "点击重试同步画布")}
            aria-label={saveState === "saved" ? "画布已保存" : "画布未同步，点击重试"}
            onClick={() => projectSyncRef.current?.retry()}>
            {saveState === "saved" ? "已保存" : saveState === "saving" ? "保存中…" : "未同步 · 重试"}
          </button>
        )}
        {session?.access.status === "active" && <button type="button" className={styles.balance} aria-label={`打开账户管理，当前余额 ${billing?.account.availableCredits ?? (billingLoading ? "读取中" : "暂不可用")}`} onClick={() => setCreditUsageOpen(true)}><CreditIcon className="size-[1em]" />{billing?.account.availableCredits ?? "--"}</button>}
      </header>

      {!projectReady && <div className={styles.projectLoadOverlay} role={projectLoadError || sessionError ? "alert" : "status"}>
        {projectLoadError || sessionError ? <>
          <span>{projectLoadError ?? `网络暂不可用，暂时无法确认登录。恢复连接后重试读取画布：${sessionError}`}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => {
            if (sessionError) void refreshSession();
            else setProjectLoadRevision((value) => value + 1);
          }}>重试读取画布</Button>
        </> : <span>正在读取画布…</span>}
      </div>}
      {projectReady && saveDetail && saveState !== "saved" && (
        <div className={styles.saveNotice} role="alert">{saveDetail}</div>
      )}

      <CreditUsageDialog
        open={creditUsageOpen && session?.access.status === "active"}
        onOpenChange={setCreditUsageOpen}
        onAccountChange={handleCreditAccountChange}
      />

      <CanvasPageDeleteDialog pageName={projectPages.find((page) => page.id === deletePageId)?.name ?? null}
        disabled={!deletePageId || pageSwitching || pageDeletionDisabled(deletePageId)}
        onCancel={() => setDeletePageId(null)} onConfirm={() => void deleteProjectPage()} />

      {composerHost && createPortal(<section className={`${styles.composer} ${styles.composerAttached}`} aria-label="图片生成工具">
        <input ref={inputRef} className={styles.srOnly} type="file" accept="image/jpeg,image/png" multiple onChange={addReferences} aria-label="选择参考图" />
        <TooltipProvider delayDuration={180}>
          <AttachmentGroup className={styles.referenceTray} role="group" aria-label="参考图">
            {displayReferences.map((item, index) => (
                <Attachment
                  className={`${styles.reference} ${item.reference.status === "uploading" ? canvasWorkspaceStyles.mediaUploading : ""}`}
                  key={item.key}
                  size="xs"
                  state={item.reference.status === "uploading" ? "uploading" : item.reference.status === "failed" ? "error" : "done"}
                  aria-busy={item.reference.status === "uploading" || undefined}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={styles.referenceImageTrigger} tabIndex={0} aria-label={`预览参考图 ${index + 1}：${item.reference.name}${item.reference.status === "uploading" ? "，上传中" : item.reference.status === "failed" ? "，上传失败" : ""}`}>
                        <PrivateObjectImage src={item.previewUrl} alt={item.reference.name} />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center" sideOffset={8} hideArrow className={styles.referencePreview}>
                      <PrivateObjectImage src={item.previewUrl} alt={item.reference.name} loading="eager" />
                    </TooltipContent>
                  </Tooltip>
                  <span className={styles.referenceNumber} aria-hidden="true">{index + 1}</span>
                  {item.reference.status === "failed" && <button type="button" className={styles.referenceRetry} onClick={() => item.kind === "direct" ? retryReference(composerHost.id, item.key) : retryLinkedReference(item.key)} aria-label={`重试参考图 ${item.reference.name}`}>重试</button>}
                  <button type="button" className={styles.referenceRemove} onClick={() => item.kind === "direct" ? removeReference(composerHost.id, item.key) : removeLinkedReference(item.key)} aria-label={`移除参考图 ${index + 1}：${item.reference.name}`}><X size={12} /></button>
                </Attachment>
            ))}
            {displayReferences.length < MAX_GENERATION_REFERENCES && (
              <button type="button" className={styles.referenceAdd} aria-label="添加参考图" onClick={() => inputRef.current?.click()}>
                <ImageIcon size={14} strokeWidth={1.5} aria-hidden="true" />
                <span aria-hidden="true">参考图</span>
              </button>
            )}
          </AttachmentGroup>
        </TooltipProvider>
        <label className={styles.srOnly} htmlFor="canvas-prompt">画面描述</label>
        <div ref={promptAreaRef} className={styles.promptArea}>
          <Textarea
            ref={promptRef}
            id="canvas-prompt"
            className={`${styles.prompt} ${promptExpanded ? styles.promptExpanded : ""}`}
            placeholder="描述你想生成的画面…"
            value={prompt}
            readOnly={generatorEditingLocked}
            maxLength={4000}
            onScroll={syncPromptScrollbar}
            onChange={(event) => {
              updateGeneratorDraft({ prompt: event.target.value });
              syncPromptLayout();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                generate();
              }
            }}
          />
          <span ref={promptScrollbarRef} className={styles.promptScrollbar} aria-hidden="true">
            <span ref={promptScrollbarThumbRef} className={styles.promptScrollbarThumb} />
          </span>
          <span className={styles.promptControlSlot}>
            {(promptOverflow || promptExpanded) && (
              <button
                type="button"
                className={`${styles.promptExpand} ${promptExpanded ? styles.promptExpandActive : ""}`}
                aria-label={promptExpanded ? "收起提示词" : "展开提示词"}
                aria-controls="canvas-prompt"
                aria-expanded={promptExpanded}
                onClick={() => setPromptExpanded((expanded) => !expanded)}
              >
                {promptExpanded ? <Minimize2 size={14} aria-hidden="true" /> : <Maximize2 size={14} aria-hidden="true" />}
              </button>
            )}
          </span>
        </div>
        <div className={styles.tools}>
          <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
            <PopoverTrigger asChild>
              <Button ref={settingsTriggerRef} type="button" variant="ghost" size="sm" className={styles.settingsTrigger} disabled={!model || generatorEditingLocked} aria-label={`图像设置：${selectedRatio === "adaptive" ? "自适应" : selectedRatio}，${selectedResolution ?? "暂无分辨率"}${seedreamModel ? "" : `，数量 ${selectedCount}`}`}>
                {selectedRatio === "adaptive" ? "自适应" : selectedRatio} · {selectedResolution ?? "--"}{!seedreamModel && <> · {selectedCount}</>}
                <ChevronDown size={13} aria-hidden="true" />
              </Button>
            </PopoverTrigger>
            <CanvasGeneratorSettingsContent open={settingsOpen} assetsOpen={assetsOpen} ratioCount={model ? getCanvasGenerationRatioOptions(model.id).length : 0}
              qualityCount={gptModel && model ? getGptImageQualityOptions(model.id).length : 0}
              resolutionCount={shownResolutions.length} showCount={!seedreamModel}
              triggerRef={settingsTriggerRef} onFitViewport={fitSettingsViewport}
              id="canvas-image-settings-panel" className={styles.settingsPanel} aria-label="图像设置">
              <h2 className={styles.settingsTitle}>图像设置</h2>
              {gptModel && model && <div className={styles.settingsSection} data-kind="quality">
                <span className={styles.settingsLabel}>质量</span>
                <ToggleGroup type="single" value={gptOptions.quality} onValueChange={(value) => { if (value) updateGeneratorDraft({ quality: value as GptImageQuality }); }} className={styles.qualityGroup} aria-label="质量">
                  {getGptImageQualityOptions(model.id).map((item) => (
                    <ToggleGroupItem key={item.value} value={item.value} className={styles.qualityOption}>
                      {item.value === "max" ? "极高" : item.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>}
              <div className={styles.settingsSection} data-kind="resolution">
                <span className={styles.settingsLabel}>分辨率</span>
                <ToggleGroup type="single" spacing={8} value={selectedResolution ?? ""} onValueChange={(value) => { if (value) { if (activeGeneratorId) automaticResolutionGeneratorIdsRef.current.delete(activeGeneratorId); updateGeneratorDraft({ resolution: value as GenerationResolution }); } }} className={styles.resolutionGroup} aria-label="分辨率">
                  {shownResolutions.map((value) => <ToggleGroupItem key={value} value={value} className={styles.resolutionOption}>{value}</ToggleGroupItem>)}
                </ToggleGroup>
              </div>
              {gptModel && <div className={`${styles.settingsSection} ${styles.backgroundSetting}`} data-kind="background">
                <label htmlFor="canvas-transparent-background" className={styles.backgroundLabel}>透明背景</label>
                <Switch id="canvas-transparent-background" checked={gptOptions.background === "transparent"}
                  disabled={generatorEditingLocked} onCheckedChange={(checked) => {
                    updateGeneratorDraft({ ...gptOptions, background: checked ? "transparent" : "auto",
                      outputFormat: checked ? "png" : gptOptions.outputFormat });
                  }} />
              </div>}
              <div className={styles.settingsSection} data-kind="ratio">
                <span className={styles.settingsLabel}>宽高比</span>
                <ToggleGroup type="single" spacing={8} value={selectedRatio} onValueChange={(value) => { if (value) updateGeneratorDraft({ ratio: value as GenerationAspectRatio }); }} className={styles.ratioGroup} aria-label="宽高比">
                  {model && getCanvasGenerationRatioOptions(model.id).map((item) => (
                    <ToggleGroupItem key={item.id} value={item.id} className={styles.ratioOption} data-adaptive={item.id === "adaptive" || undefined} aria-label={`宽高比 ${item.id === "adaptive" ? "自适应" : item.id}`}>
                      {item.id !== "adaptive" && <span className={styles.ratioGlyph} style={ratioGlyphSize(item.id)} aria-hidden="true" />}
                      <span>{item.id === "adaptive" ? "自适应" : item.id}</span>
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
              {!seedreamModel && <div className={styles.settingsSection} data-kind="count">
                <span className={styles.settingsLabel}>生成数量</span>
                <CanvasGenerationCountControl key={activeGeneratorId ?? "count"} value={selectedCount}
                  onValueChange={(count) => updateGeneratorDraft({ count })} disabled={!model || generatorEditingLocked} />
              </div>}
            </CanvasGeneratorSettingsContent>
          </Popover>
          <span className={styles.toolSpacer} />
          <Select value={model ? (model.catalogId ?? model.id) : ""} onValueChange={changeGeneratorModel} disabled={!models.length || generatorEditingLocked}>
            <SelectTrigger size="sm" className={styles.modelSelect} aria-label="模型"><SelectValue placeholder={billingLoading ? "读取模型" : "暂无模型"} /></SelectTrigger>
            <SelectContent position="popper" align="end" className={styles.modelMenu}>
              {models.map((item) => (
                <SelectItem key={item.catalogId ?? item.id} value={item.catalogId ?? item.id}>
                  <Image
                    src={getGenerationModel(item.id).icon === "nano"
                      ? "/model-icons/nanobanana.svg"
                      : getGenerationModel(item.id).icon === "bytedance"
                        ? "/model-icons/bytedance-color.svg" : "/model-icons/openai.svg"}
                    alt=""
                    width={16}
                    height={16}
                    className={`shrink-0 ${getGenerationModel(item.id).icon === "bytedance" ? styles.modelIconMonochrome : ""}`}
                    unoptimized
                  />
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" className={styles.generate} disabled={!canGenerate} onClick={generate} aria-busy={submitting} aria-label={quote ? `生成图片，本次 ${quote.creditAmount} 积分` : "生成图片，当前规格暂无报价"}>
            <span className={styles.generateCost}>
              {submitting ? <LoaderCircle className={`size-[1em] ${styles.loadingIcon}`} /> : <CreditIcon className="size-[1em]" />}
              {quote?.creditAmount ?? "—"}
            </span>
          </Button>
        </div>
        {(formError || billingError || sessionError || insufficientCredits || session?.preview) && (
          <div className={styles.message} role="alert">
            <span>{formError ?? billingError ?? sessionError ?? (session?.preview ? "预览模式无法提交生成任务。" : "可用积分不足。")}</span>
            {billingError && <button type="button" onClick={() => void refreshBilling()}>重试读取</button>}
            {sessionError && <button type="button" onClick={() => void refreshSession()}>重试登录</button>}
          </div>
        )}
        {!formError && !billingError && !sessionError && !insufficientCredits && !session?.preview && !quote && (
          <div className={styles.quote} aria-live="polite">
            {billingLoading ? "正在读取报价" : seedreamModel ? "Seedream 5.0 Pro 当前规格尚未配置报价" : "当前规格暂无报价"}
          </div>
        )}
      </section>, composerHost.element)}
    </main>
  );
}
