"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type WheelEvent as ReactWheelEvent } from "react";
import Image from "next/image";
import { CreationComposer } from "@/features/creation/creation-composer";
import {
  getGenerationRatio,
  getGenerationResolutionLabel,
} from "@/features/creation/generation-options";
import {
  isGenerationJobActive,
  toGenerationUiStage,
} from "@/features/creation/generation-job";
import {
  MOCK_GENERATION_OUTPUTS,
} from "@/features/creation/mock-generation-boundary";
import { createHttpGenerationBoundary } from "@/features/creation/http-generation-boundary";
import { uploadReferenceFiles } from "@/features/references/http-reference-upload";
import {
  SESSION_EXPIRED_EVENT,
  authenticationErrorMessage,
  beginAuthentication,
  readAuthenticationSession,
  signOut,
  type AuthenticationSession,
} from "@/features/auth/http-auth-boundary";
import { AccountAccessGate } from "@/features/auth/account-access-gate";
import { listAssets } from "@/features/assets/http-asset-boundary";
import {
  availableImageCount,
  findBillingQuote,
  readBillingSummary,
} from "@/features/billing/http-billing-boundary";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import {
  DraftBoundaryError,
  deleteCreationDraft,
  readCreationDraft,
  saveCreationDraft,
} from "@/features/drafts/http-draft-boundary";
import {
  navigateWorkspace,
  parseWorkspaceRoute,
  WORKSPACE_NAVIGATION_EVENT,
} from "@/features/navigation/workspace-route.mjs";
import {
  listProjects,
  readProject,
  saveProject,
} from "@/features/projects/http-project-boundary";
import {
  createComposerCheckpoint,
  hasMeaningfulUnsavedChanges,
} from "@/features/projects/unsaved-changes.mjs";
import {
  createGenerationInputSnapshot,
  restoreGenerationInputSnapshot,
} from "@/features/creation/generation-snapshot";
import {
  DEFAULT_GENERATION_MODEL_ID,
  getGenerationModel,
} from "@/features/models/catalog";
import {
  MAX_GENERATION_REFERENCES,
  type GenerationAspectRatio,
  type GenerationCount,
  type GenerationInputSnapshot,
  type GenerationJob,
  type GenerationModelId,
  type GenerationOutput,
  type GenerationReference,
  type GenerationResolution,
} from "@/shared/contracts/generation";
import type { ProjectRecord } from "@/shared/contracts/project";
import type { BillingSummary } from "@/shared/contracts/billing";
import type {
  CreationDraftRecord,
  CreationDraftState,
} from "@/shared/contracts/draft";
import {
  Dialog,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Toaster } from "@/components/ui/sonner";
import { Dialog as DialogPrimitive } from "radix-ui";
import { toast } from "sonner";
import {
  Bookmark,
  Brush,
  Check,
  CircleAlert,
  Clock3,
  Compass,
  Download,
  FolderOpen,
  FolderPlus,
  HelpCircle,
  Images,
  LayoutGrid,
  LoaderCircle,
  LogIn,
  LogOut,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Settings2,
  UserRoundCog,
  X,
} from "lucide-react";

type ReferenceImage = GenerationReference;
type AssetBatch = {
  id: string;
  dateLabel: string;
  time: string;
  prompt: string;
  modelId: GenerationModelId;
  aspectRatio: GenerationAspectRatio;
  resolution: GenerationResolution;
  count: GenerationCount;
  referenceCount: number;
  images: readonly GenerationOutput[];
};
type ActiveView = "create" | "projects" | "assets";
type DestructiveCreationIntent =
  | { kind: "new" }
  | { kind: "project"; projectId: string; projectName: string };
type DraftConflictState = Readonly<{
  currentDraft: CreationDraftRecord | null;
}>;
type CreationStreamItem =
  | { kind: "skeleton"; key: string; ratio: number; index: number }
  | { kind: "image"; key: string; ratio: number; batch: AssetBatch; image: GenerationOutput; index: number };
type AssetGalleryItem = { key: string; ratio: number; batch: AssetBatch; image: GenerationOutput; index: number };
type DetailImage = AssetGalleryItem;
type DetailSource = "creation" | "assets";
type AssetDetailNavigationState = Readonly<{
  returnHref: string;
  scrollY: number;
  source: DetailSource;
}>;

const ASSET_DETAIL_HISTORY_KEY = "goodgoodAssetDetail";

function readAssetDetailNavigationState(state: unknown): AssetDetailNavigationState | null {
  if (!state || typeof state !== "object") return null;
  const candidate = (state as Record<string, unknown>)[ASSET_DETAIL_HISTORY_KEY];
  if (!candidate || typeof candidate !== "object") return null;
  const detail = candidate as Record<string, unknown>;
  if (detail.source !== "creation" && detail.source !== "assets") return null;
  if (
    typeof detail.returnHref !== "string" ||
    !detail.returnHref.startsWith("/") ||
    detail.returnHref.startsWith("//")
  ) return null;
  if (typeof detail.scrollY !== "number" || !Number.isFinite(detail.scrollY) || detail.scrollY < 0) return null;
  return {
    returnHref: detail.returnHref,
    scrollY: detail.scrollY,
    source: detail.source,
  };
}

const defaultPrompt = "一位年轻的亚洲女性模特，身穿银灰色未来感服装，站在冷白色摄影棚中。极简构图，柔和硬光，真实皮肤质感，高级时尚摄影。";
const emptyComposerCheckpoint = createComposerCheckpoint({
  aspectRatio: "1:1",
  count: 1,
  modelId: DEFAULT_GENERATION_MODEL_ID,
  prompt: "",
  references: [],
  resolution: "1K",
});
const initialAssetBatches: AssetBatch[] = [
  {
    id: "GG-240827",
    dateLabel: "今天",
    time: "10:16",
    prompt: defaultPrompt,
    modelId: "nano-banana-2",
    aspectRatio: "4:5",
    resolution: "2K",
    count: 4,
    referenceCount: 0,
    images: MOCK_GENERATION_OUTPUTS.map((image) => ({
      ...image,
      id: `preview-GG-240827-${image.id}`,
    })),
  },
  {
    id: "GG-236814",
    dateLabel: "昨天",
    time: "20:42",
    prompt: "参考图 1 的服装轮廓与参考图 2 的光影质感，创作一组冷调高级成衣广告，保留自然皮肤纹理与真实面料细节。",
    modelId: "nano-banana-pro",
    aspectRatio: "1:1",
    resolution: "4K",
    count: 2,
    referenceCount: 2,
    images: MOCK_GENERATION_OUTPUTS.slice(0, 2).map((image) => ({
      ...image,
      id: `preview-GG-236814-${image.id}`,
    })),
  },
];
function getDetailImages(batches: AssetBatch[]): DetailImage[] {
  return batches.flatMap((batch) => {
    const batchRatio = getGenerationRatio(batch.aspectRatio);
    return batch.images.map((image, index) => ({
      key: `${batch.id}-${image.id}`,
      ratio: batchRatio.value,
      batch,
      image,
      index,
    }));
  });
}

function generationJobToAssetBatch(job: GenerationJob): AssetBatch {
  const createdAt = new Date(job.createdAt);
  const today = new Date();
  const dateLabel = createdAt.toDateString() === today.toDateString()
    ? "今天"
    : new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(createdAt);
  return {
    aspectRatio: job.input.aspectRatio,
    count: job.input.count,
    dateLabel,
    id: job.id,
    images: job.outputs,
    modelId: job.input.modelId,
    prompt: job.input.prompt,
    referenceCount: job.input.references.length,
    resolution: job.input.resolution,
    time: new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      hour12: false,
      minute: "2-digit",
    }).format(createdAt),
  };
}

function projectAssetBatches(project: ProjectRecord) {
  return project.batches
    .filter((batch) => batch.state === "succeeded")
    .map(generationJobToAssetBatch);
}

function formatProjectUpdated(updatedAt: string) {
  const updated = new Date(updatedAt);
  const today = new Date();
  if (updated.toDateString() === today.toDateString()) {
    return `今天 ${new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      hour12: false,
      minute: "2-digit",
    }).format(updated)}`;
  }
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
  }).format(updated);
}

export default function Home() {
  const referenceObjectUrlsRef = useRef(new Set<string>());
  const assetPulseTimerRef = useRef<number | null>(null);
  const detailWheelTimerRef = useRef<number | null>(null);
  const detailThumbnailRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const pendingDetailScrollRef = useRef<number | null>(null);
  const projectRouteRequestRef = useRef(0);
  const projectRestoreAnnouncementRef = useRef(false);
  const loadedProjectIdRef = useRef<string | null>(null);
  const composerEditRevisionRef = useRef(0);
  const draftAutosaveTimerRef = useRef<number | null>(null);
  const draftBlockedRef = useRef(false);
  const draftMutationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const draftSyncedCheckpointRef = useRef(emptyComposerCheckpoint);
  const draftVersionRef = useRef<number | null>(null);
  const [generationBoundary] = useState(createHttpGenerationBoundary);
  const [authenticationSession, setAuthenticationSession] = useState<AuthenticationSession | null | undefined>(undefined);
  const [authenticationError, setAuthenticationError] = useState<string | null>(null);
  const [accessStatusRefreshing, setAccessStatusRefreshing] = useState(false);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingRevision, setBillingRevision] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GenerationModelId>(DEFAULT_GENERATION_MODEL_ID);
  const [selectedRatio, setSelectedRatio] = useState<GenerationAspectRatio>("1:1");
  const [resolution, setResolution] = useState<GenerationResolution>("1K");
  const [generationCount, setGenerationCount] = useState<GenerationCount>(1);
  const [prompt, setPrompt] = useState("");
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>("create");
  const [generationJob, setGenerationJob] = useState<GenerationJob | null>(null);
  const [creationBatches, setCreationBatches] = useState<AssetBatch[]>([]);
  const [savedImages, setSavedImages] = useState<string[]>([]);
  const [newAssetCount, setNewAssetCount] = useState(0);
  const [assetPulse, setAssetPulse] = useState(false);
  const [assetBatches, setAssetBatches] = useState<AssetBatch[]>(initialAssetBatches);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [assetsError, setAssetsError] = useState<string | null>(null);
  const [assetMode, setAssetMode] = useState<"batches" | "gallery">("batches");
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [currentProject, setCurrentProject] = useState<{ id: string; name: string } | null>(null);
  const [projectDrawerOpen, setProjectDrawerOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectCreateKey, setProjectCreateKey] = useState<string | null>(null);
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectSaveError, setProjectSaveError] = useState<string | null>(null);
  const [projectRestoringId, setProjectRestoringId] = useState<string | null>(null);
  const [routeProjectId, setRouteProjectId] = useState<string | null>(null);
  const [projectRouteError, setProjectRouteError] = useState<string | null>(null);
  const [projectRouteRevision, setProjectRouteRevision] = useState(0);
  const [routeAssetId, setRouteAssetId] = useState<string | null>(null);
  const [assetRouteError, setAssetRouteError] = useState<string | null>(null);
  const [assetRouteRevision, setAssetRouteRevision] = useState(0);
  const [composerCheckpoint, setComposerCheckpoint] = useState(emptyComposerCheckpoint);
  const [destructiveCreationIntent, setDestructiveCreationIntent] = useState<DestructiveCreationIntent | null>(null);
  const [draftConflict, setDraftConflict] = useState<DraftConflictState | null>(null);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [draftLoading, setDraftLoading] = useState(true);
  const [draftRetryMode, setDraftRetryMode] = useState<"load" | "save" | null>(null);
  const [draftSyncError, setDraftSyncError] = useState<string | null>(null);
  const [draftSyncRevision, setDraftSyncRevision] = useState(0);
  const [draftSyncing, setDraftSyncing] = useState(false);
  const [draftLoadRevision, setDraftLoadRevision] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItems, setDetailItems] = useState<DetailImage[]>([]);
  const [detailIndex, setDetailIndex] = useState(0);
  const activeRatio = getGenerationRatio(selectedRatio);
  const activeModel = getGenerationModel(selectedModel);
  const generationStage = toGenerationUiStage(generationJob?.state ?? null);
  const isGenerating = generationJob ? isGenerationJobActive(generationJob.state) : false;
  const generationError = generationJob?.error ?? null;
  const submissionUnknown = generationError?.code === "SUBMISSION_UNKNOWN";
  const failedGenerationSnapshot = generationJob?.state === "failed" ? generationJob.input : null;
  const hasGenerationError = generationStage === "failed" && generationError !== null;
  const totalCreationImages = creationBatches.reduce((total, batch) => total + batch.images.length, 0);
  const creationDetailItems = getDetailImages(creationBatches);
  const assetDetailItems = getDetailImages(assetBatches);
  const activeDetail = detailItems[detailIndex] ?? null;
  const activeDetailModel = activeDetail
    ? getGenerationModel(activeDetail.batch.modelId)
    : null;
  const activeDetailRatio = activeDetail
    ? getGenerationRatio(activeDetail.batch.aspectRatio)
    : null;
  const jobInput = generationJob?.input ?? null;
  const jobModel = jobInput ? getGenerationModel(jobInput.modelId) : activeModel;
  const jobRatio = jobInput ? getGenerationRatio(jobInput.aspectRatio) : activeRatio;
  const stageText = generationStage === "queued"
    ? "任务已提交，正在准备画面"
    : generationStage === "rendering"
      ? `${jobModel.name} 正在生成 ${jobInput?.count ?? generationCount} 张图片`
      : generationStage === "refining"
        ? "正在完成细节与清晰度处理"
        : generationStage === "complete"
          ? "生成完成"
          : generationStage === "failed"
            ? "生成失败"
          : "根据当前提示词创建的图像";
  const accountEmail = authenticationSession?.user.email ?? null;
  const accountInitials = accountEmail
    ? accountEmail.split("@")[0].slice(0, 2).toUpperCase()
    : "GG";
  const activeBillingQuote = findBillingQuote(billingSummary, {
    count: 1,
    modelId: selectedModel,
    resolution,
  });
  const launchBillingQuote = findBillingQuote(billingSummary, {
    count: 1,
    modelId: "nano-banana-2",
    resolution: "1K",
  });
  const availableImages = availableImageCount(billingSummary, launchBillingQuote);
  const composerBillingLabel = billingLoading
    ? "积分读取中"
    : activeBillingQuote
      ? `${activeBillingQuote.creditAmount} 积分/张`
      : "当前模型暂未定价";
  const composerBillingDescription = activeBillingQuote && billingSummary
    ? `每张 ${activeBillingQuote.creditAmount} 积分，当前可用 ${billingSummary.account.availableCredits} 积分`
    : composerBillingLabel;
  const generationItems: CreationStreamItem[] = isGenerating
    ? Array.from({ length: jobInput?.count ?? generationCount }, (_, index) => ({
      kind: "skeleton" as const,
      key: `skeleton-${generationJob?.id ?? "pending"}-${index}`,
      ratio: jobRatio.value,
      index,
    }))
    : [];
  const creationItems: CreationStreamItem[] = creationBatches.flatMap((batch) => {
      const batchRatio = getGenerationRatio(batch.aspectRatio);
      return batch.images.map((image, index) => ({
        kind: "image" as const,
        key: `${batch.id}-${image.id}`,
        ratio: batchRatio.value,
        batch,
        image,
        index,
      }));
    });
  const currentComposerCheckpoint = createComposerCheckpoint({
    aspectRatio: selectedRatio,
    count: generationCount,
    modelId: selectedModel,
    prompt,
    references: referenceImages,
    resolution,
  });
  const hasUnsavedCreationChanges = hasMeaningfulUnsavedChanges({
    checkpoint: composerCheckpoint,
    current: currentComposerCheckpoint,
    hasUnprojectedWork: !currentProject && (
      creationBatches.length > 0 || generationJob !== null
    ),
  });
  const currentDraftState: CreationDraftState = {
    aspectRatio: selectedRatio,
    count: generationCount,
    modelId: selectedModel,
    prompt,
    references: referenceImages,
    resolution,
  };
  const queueDraftMutation = useCallback((mutation: () => Promise<void>) => {
    const result = draftMutationQueueRef.current.then(mutation, mutation);
    draftMutationQueueRef.current = result.catch(() => undefined);
    return result;
  }, []);
  const applyCreationDraft = useCallback((draft: CreationDraftRecord | null) => {
    referenceObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    referenceObjectUrlsRef.current.clear();
    const state = draft?.state ?? {
      aspectRatio: "1:1" as const,
      count: 1 as const,
      modelId: DEFAULT_GENERATION_MODEL_ID,
      prompt: "",
      references: [],
      resolution: "1K" as const,
    };
    setPrompt(state.prompt);
    setReferenceImages(state.references.map((reference) => ({ ...reference })));
    setSelectedModel(state.modelId);
    setSelectedRatio(state.aspectRatio);
    setResolution(state.resolution);
    setGenerationCount(state.count);
    draftVersionRef.current = draft?.version ?? null;
    draftSyncedCheckpointRef.current = createComposerCheckpoint(state);
    setDraftSyncRevision((current) => current + 1);
  }, []);
  const blockDraftSync = useCallback((error: unknown) => {
    draftBlockedRef.current = true;
    if (error instanceof DraftBoundaryError && error.code === "DRAFT_CONFLICT") {
      setDraftConflict({ currentDraft: error.currentDraft });
      setDraftSyncError(null);
      setDraftRetryMode(null);
      return;
    }
    setDraftSyncError(
      error instanceof Error
        ? error.message
        : "草稿暂时无法保存，当前内容仍保留在此页面。",
    );
    setDraftRetryMode("save");
  }, []);
  const selectDetailIndex = useCallback((nextIndex: number) => {
    const boundedIndex = Math.max(0, Math.min(nextIndex, detailItems.length - 1));
    const nextAssetId = detailItems[boundedIndex]?.image.id ?? null;
    setDetailIndex(boundedIndex);
    if (!routeAssetId || !nextAssetId || nextAssetId === routeAssetId) return;
    setRouteAssetId(nextAssetId);
    navigateWorkspace(
      { kind: "asset", assetId: nextAssetId },
      { notify: false, replace: true, state: window.history.state },
    );
  }, [detailItems, routeAssetId]);

  useEffect(() => {
    const applyWorkspaceRoute = (event?: Event) => {
      if (event?.type === "popstate") {
        projectRestoreAnnouncementRef.current = false;
      }
      const route = parseWorkspaceRoute(window.location.pathname);
      projectRouteRequestRef.current += 1;
      setProjectRouteError(null);
      if (route.kind === "asset") {
        const detailNavigation = readAssetDetailNavigationState(window.history.state);
        setRouteProjectId(null);
        setProjectRestoringId(null);
        setRouteAssetId(route.assetId);
        setAssetRouteError(null);
        setAssetRouteRevision((current) => current + 1);
        setActiveView(detailNavigation?.source === "creation" ? "create" : "assets");
        return;
      }
      setRouteAssetId(null);
      setAssetRouteError(null);
      setDetailOpen(false);
      if (event?.type === "popstate" && pendingDetailScrollRef.current !== null) {
        const scrollY = pendingDetailScrollRef.current;
        pendingDetailScrollRef.current = null;
        window.requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: "auto" }));
      }
      if (route.kind === "project") {
        if (loadedProjectIdRef.current === route.projectId) {
          setRouteProjectId(null);
          setProjectRestoringId(null);
          setActiveView("create");
          return;
        }
        setRouteProjectId(route.projectId);
        setProjectRestoringId(route.projectId);
        setProjectRouteRevision((current) => current + 1);
        setActiveView("create");
        return;
      }
      setRouteProjectId(null);
      setProjectRestoringId(null);
      setActiveView(route.kind === "projects"
        ? "projects"
        : route.kind === "assets"
          ? "assets"
          : "create");
    };
    const applyInitialRoute = window.setTimeout(applyWorkspaceRoute, 0);
    window.addEventListener("popstate", applyWorkspaceRoute);
    window.addEventListener(WORKSPACE_NAVIGATION_EVENT, applyWorkspaceRoute);
    return () => {
      window.clearTimeout(applyInitialRoute);
      window.removeEventListener("popstate", applyWorkspaceRoute);
      window.removeEventListener(WORKSPACE_NAVIGATION_EVENT, applyWorkspaceRoute);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const url = new URL(window.location.href);
    const callbackError = authenticationErrorMessage(url.searchParams.get("authError"));
    if (url.searchParams.has("authError")) {
      url.searchParams.delete("authError");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
    void readAuthenticationSession()
      .then((session) => {
        if (!active) return;
        setAuthenticationSession(session);
        if (session?.preview) {
          setProjectsLoading(false);
          setAssetsLoading(false);
        }
        if (callbackError) setAuthenticationError(callbackError);
      })
      .catch((error) => {
        if (!active) return;
        setAuthenticationSession(null);
        setAuthenticationError(
          error instanceof Error ? error.message : "登录状态暂时无法确认，请重试。",
        );
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleSessionExpired = () => {
      setAuthenticationSession(null);
      setBillingSummary(null);
      setBillingError(null);
      setBillingLoading(false);
      setAuthenticationError("登录状态已失效，请重新登录。当前创作内容已保留。");
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);

  useEffect(() => {
    if (authenticationSession === undefined) return;
    if (authenticationSession === null || authenticationSession.access.status !== "active") return;
    let active = true;
    void readBillingSummary()
      .then((summary) => {
        if (!active) return;
        setBillingSummary(summary);
      })
      .catch((error) => {
        if (!active) return;
        setBillingError(
          error instanceof Error
            ? error.message
            : "积分信息暂时无法读取，请稍后重试。",
        );
      })
      .finally(() => {
        if (active) setBillingLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authenticationSession, billingRevision]);

  useEffect(() => {
    if (authenticationSession === undefined) return;
    if (
      authenticationSession === null ||
      authenticationSession.preview ||
      authenticationSession.access.status !== "active"
    ) {
      const finishPreview = window.setTimeout(() => {
        setDraftLoading(false);
        setDraftHydrated(true);
      }, 0);
      return () => window.clearTimeout(finishPreview);
    }
    let active = true;
    const editRevision = composerEditRevisionRef.current;
    draftBlockedRef.current = false;
    void readCreationDraft()
      .then((draft) => {
        if (!active) return;
        draftVersionRef.current = draft?.version ?? null;
        draftSyncedCheckpointRef.current = draft
          ? createComposerCheckpoint(draft.state)
          : emptyComposerCheckpoint;
        const route = parseWorkspaceRoute(window.location.pathname);
        if (route.kind !== "project" && draft) {
          if (composerEditRevisionRef.current === editRevision) {
            applyCreationDraft(draft);
            toast.success("已恢复上次未保存的创作");
          } else {
            draftBlockedRef.current = true;
            setDraftConflict({ currentDraft: draft });
          }
        }
        setDraftHydrated(true);
      })
      .catch((error) => {
        if (!active) return;
        draftBlockedRef.current = true;
        setDraftSyncError(
          error instanceof Error
            ? error.message
            : "上次草稿暂时无法读取，当前输入不会被覆盖。",
        );
        setDraftRetryMode("load");
        setDraftHydrated(true);
      })
      .finally(() => {
        if (active) setDraftLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applyCreationDraft, authenticationSession, draftLoadRevision]);

  useEffect(() => {
    if (draftAutosaveTimerRef.current) {
      window.clearTimeout(draftAutosaveTimerRef.current);
      draftAutosaveTimerRef.current = null;
    }
    if (
      !authenticationSession ||
      authenticationSession.preview ||
      authenticationSession.access.status !== "active" ||
      !draftHydrated ||
      draftLoading ||
      currentProject ||
      routeProjectId ||
      draftBlockedRef.current ||
      referenceImages.some((reference) => reference.status !== "ready") ||
      currentComposerCheckpoint === draftSyncedCheckpointRef.current
    ) {
      return;
    }
    const checkpoint = currentComposerCheckpoint;
    const snapshot: CreationDraftState = {
      aspectRatio: selectedRatio,
      count: generationCount,
      modelId: selectedModel,
      prompt,
      references: referenceImages.map((reference) => ({ ...reference })),
      resolution,
    };
    draftAutosaveTimerRef.current = window.setTimeout(() => {
      draftAutosaveTimerRef.current = null;
      void queueDraftMutation(async () => {
        if (draftBlockedRef.current) return;
        setDraftSyncing(true);
        try {
          if (checkpoint === emptyComposerCheckpoint) {
            if (draftVersionRef.current !== null) {
              await deleteCreationDraft(draftVersionRef.current);
            }
            draftVersionRef.current = null;
          } else {
            const savedDraft = await saveCreationDraft(
              snapshot,
              draftVersionRef.current,
            );
            draftVersionRef.current = savedDraft.version;
          }
          draftSyncedCheckpointRef.current = checkpoint;
          setDraftConflict(null);
          setDraftRetryMode(null);
          setDraftSyncError(null);
        } catch (error) {
          blockDraftSync(error);
        } finally {
          setDraftSyncing(false);
          setDraftSyncRevision((current) => current + 1);
        }
      });
    }, 850);
    return () => {
      if (draftAutosaveTimerRef.current) {
        window.clearTimeout(draftAutosaveTimerRef.current);
        draftAutosaveTimerRef.current = null;
      }
    };
  }, [
    authenticationSession,
    blockDraftSync,
    currentComposerCheckpoint,
    currentProject,
    draftHydrated,
    draftLoading,
    draftSyncRevision,
    generationCount,
    prompt,
    queueDraftMutation,
    referenceImages,
    resolution,
    routeProjectId,
    selectedModel,
    selectedRatio,
  ]);

  useEffect(() => {
    if (!detailOpen) return;
    detailThumbnailRefs.current[detailIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [detailIndex, detailOpen]);

  useEffect(() => {
    if (!detailOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        selectDetailIndex(detailIndex + 1);
      }
      if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        selectDetailIndex(detailIndex - 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [detailIndex, detailOpen, selectDetailIndex]);

  useEffect(() => () => {
    if (detailWheelTimerRef.current) window.clearTimeout(detailWheelTimerRef.current);
    if (draftAutosaveTimerRef.current) window.clearTimeout(draftAutosaveTimerRef.current);
  }, []);

  useEffect(() => () => {
    referenceObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    referenceObjectUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    if (authenticationSession === undefined) return;
    if (authenticationSession === null || authenticationSession.access.status !== "active") return;
    if (authenticationSession.preview) return;
    let active = true;
    void listProjects()
      .then((records) => {
        if (!active) return;
        setProjects([...records]);
        setProjectsError(null);
      })
      .catch((error) => {
        if (!active) return;
        setProjectsError(error instanceof Error ? error.message : "项目列表暂时不可用，请重试。");
      })
      .finally(() => {
        if (active) setProjectsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authenticationSession]);

  useEffect(() => {
    if (
      authenticationSession === undefined ||
      authenticationSession === null ||
      authenticationSession.access.status !== "active"
    ) return;
    if (authenticationSession.preview) return;
    let active = true;
    void listAssets()
      .then((records) => {
        if (!active) return;
        const batches = records.map(generationJobToAssetBatch);
        setAssetBatches(batches);
        setSavedImages(
          batches.flatMap((batch) =>
            batch.images.map((image) => `${batch.id}-${image.id}`),
          ),
        );
        setSelectedAssetIds([]);
        setAssetsError(null);
      })
      .catch((error) => {
        if (!active) return;
        setAssetsError(
          error instanceof Error ? error.message : "资产库暂时无法读取，请重试。",
        );
      })
      .finally(() => {
        if (active) setAssetsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authenticationSession]);

  useEffect(() => {
    if (
      !routeAssetId ||
      authenticationSession === undefined ||
      authenticationSession === null ||
      authenticationSession.access.status !== "active"
    ) return;
    if (assetsLoading) return;
    const applyAssetRoute = window.setTimeout(() => {
      const detailNavigation = readAssetDetailNavigationState(window.history.state);
      const creationScope = getDetailImages(creationBatches);
      const assetScope = getDetailImages(assetBatches);
      const scopes = detailNavigation?.source === "creation"
        ? [creationScope, assetScope]
        : [assetScope];
      const scope = scopes.find((items) =>
        items.some((item) => item.image.id === routeAssetId),
      );
      const nextIndex = scope?.findIndex((item) => item.image.id === routeAssetId) ?? -1;
      if (scope && nextIndex >= 0) {
        setDetailItems(scope);
        setDetailIndex(nextIndex);
        setDetailOpen(true);
        setAssetRouteError(null);
        return;
      }
      setDetailOpen(false);
      setAssetRouteError(
        assetsError ?? "这张图片不存在，或当前账号无权访问。",
      );
    }, 0);
    return () => window.clearTimeout(applyAssetRoute);
  }, [
    assetBatches,
    assetRouteRevision,
    assetsError,
    assetsLoading,
    authenticationSession,
    creationBatches,
    routeAssetId,
  ]);

  useEffect(() => {
    if (!routeProjectId) return;
    if (
      authenticationSession === undefined ||
      authenticationSession === null ||
      authenticationSession.access.status !== "active"
    ) return;
    if (authenticationSession.preview) {
      const previewFailure = window.setTimeout(() => {
        setProjectRestoringId(null);
        setProjectRouteError("预览模式无法读取持久化项目。");
      }, 0);
      return () => window.clearTimeout(previewFailure);
    }
    let active = true;
    const requestId = ++projectRouteRequestRef.current;
    void readProject(routeProjectId)
      .then((restoredProject) => {
        if (!active || requestId !== projectRouteRequestRef.current) return;
        const restoredBatches = projectAssetBatches(restoredProject);
        const latestBatch = restoredProject.batches[0] ?? null;
        referenceObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        referenceObjectUrlsRef.current.clear();
        loadedProjectIdRef.current = restoredProject.id;
        setCurrentProject({ id: restoredProject.id, name: restoredProject.name });
        setCreationBatches(restoredBatches);
        setSavedImages(restoredBatches.flatMap((batch) => batch.images.map((image) => `${batch.id}-${image.id}`)));
        setPrompt(restoredProject.state.prompt);
        setReferenceImages(restoredProject.state.references.map((reference) => ({ ...reference })));
        setSelectedModel(restoredProject.state.modelId);
        setSelectedRatio(restoredProject.state.aspectRatio);
        setResolution(restoredProject.state.resolution);
        setGenerationCount(restoredProject.state.count);
        setGenerationJob(latestBatch?.state === "failed" ? latestBatch : null);
        setComposerCheckpoint(createComposerCheckpoint(restoredProject.state));
        setProjectRouteError(null);
        if (projectRestoreAnnouncementRef.current) {
          projectRestoreAnnouncementRef.current = false;
          toast.success("项目已恢复，可以继续创作");
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
      .catch((error) => {
        if (!active || requestId !== projectRouteRequestRef.current) return;
        projectRestoreAnnouncementRef.current = false;
        setProjectRouteError(error instanceof Error ? error.message : "项目恢复失败，请重试。");
      })
      .finally(() => {
        if (active && requestId === projectRouteRequestRef.current) {
          setProjectRestoringId(null);
        }
      });
    return () => {
      active = false;
    };
  }, [authenticationSession, routeProjectId, projectRouteRevision]);

  const retryDraftSync = () => {
    setDraftSyncError(null);
    setDraftRetryMode(null);
    setDraftConflict(null);
    draftBlockedRef.current = false;
    if (draftRetryMode === "load") {
      setDraftLoading(true);
      setDraftLoadRevision((current) => current + 1);
      return;
    }
    setDraftSyncRevision((current) => current + 1);
  };

  const keepCurrentDraft = () => {
    if (!draftConflict || isGenerating) return;
    if (referenceImages.some((reference) => reference.status !== "ready")) {
      toast.info("请等待参考图上传完成或移除失败项");
      return;
    }
    const expectedVersion = draftConflict.currentDraft?.version ?? null;
    const checkpoint = currentComposerCheckpoint;
    const snapshot: CreationDraftState = {
      ...currentDraftState,
      references: referenceImages.map((reference) => ({ ...reference })),
    };
    setDraftConflict(null);
    setDraftSyncError(null);
    draftBlockedRef.current = false;
    void queueDraftMutation(async () => {
      setDraftSyncing(true);
      try {
        if (checkpoint === emptyComposerCheckpoint) {
          await deleteCreationDraft(expectedVersion);
          draftVersionRef.current = null;
        } else {
          const savedDraft = await saveCreationDraft(snapshot, expectedVersion);
          draftVersionRef.current = savedDraft.version;
        }
        draftSyncedCheckpointRef.current = checkpoint;
      } catch (error) {
        blockDraftSync(error);
      } finally {
        setDraftSyncing(false);
        setDraftSyncRevision((current) => current + 1);
      }
    });
  };

  const restoreCloudDraft = () => {
    if (!draftConflict || isGenerating) return;
    applyCreationDraft(draftConflict.currentDraft);
    setDraftConflict(null);
    setDraftSyncError(null);
    setDraftRetryMode(null);
    draftBlockedRef.current = false;
    toast.success(
      draftConflict.currentDraft
        ? "已恢复云端草稿"
        : "云端草稿已清除",
    );
  };

  const clearPersistedCreationDraft = () => {
    if (draftAutosaveTimerRef.current) {
      window.clearTimeout(draftAutosaveTimerRef.current);
      draftAutosaveTimerRef.current = null;
    }
    draftSyncedCheckpointRef.current = emptyComposerCheckpoint;
    const expectedVersion = draftConflict
      ? draftConflict.currentDraft?.version ?? null
      : draftVersionRef.current;
    void queueDraftMutation(async () => {
      setDraftSyncing(true);
      try {
        await deleteCreationDraft(expectedVersion);
        draftVersionRef.current = null;
        setDraftConflict(null);
        setDraftSyncError(null);
        setDraftRetryMode(null);
        draftBlockedRef.current = false;
      } catch (error) {
        blockDraftSync(error);
      } finally {
        setDraftSyncing(false);
        setDraftSyncRevision((current) => current + 1);
      }
    });
  };

  const handlePromptChange = (value: string) => {
    composerEditRevisionRef.current += 1;
    setPrompt(value);
  };

  const handleModelChange = (value: GenerationModelId) => {
    composerEditRevisionRef.current += 1;
    setSelectedModel(value);
  };

  const handleAspectRatioChange = (value: GenerationAspectRatio) => {
    composerEditRevisionRef.current += 1;
    setSelectedRatio(value);
  };

  const handleResolutionChange = (value: GenerationResolution) => {
    composerEditRevisionRef.current += 1;
    setResolution(value);
  };

  const handleGenerationCountChange = (value: GenerationCount) => {
    composerEditRevisionRef.current += 1;
    setGenerationCount(value);
  };

  const handleReferenceFiles = (files: readonly File[]) => {
    if (!files.length) return;

    const remaining = MAX_GENERATION_REFERENCES - referenceImages.length;
    if (remaining <= 0) {
      toast.info(`最多可添加 ${MAX_GENERATION_REFERENCES} 张参考图`);
      return;
    }

    composerEditRevisionRef.current += 1;

    const accepted = files.slice(0, remaining).map((file) => {
      const clientId = globalThis.crypto.randomUUID();
      const url = URL.createObjectURL(file);
      referenceObjectUrlsRef.current.add(url);
      return {
        clientId,
        file,
        id: clientId,
        url,
        name: file.name,
        status: "uploading" as const,
      };
    });
    setReferenceImages((current) => [...current, ...accepted]);
    if (files.length > remaining) toast.info(`已添加 ${accepted.length} 张，参考图最多 ${MAX_GENERATION_REFERENCES} 张`);
    void uploadReferenceFiles(
      accepted.map(({ clientId, file }) => ({ clientId, file })),
      (clientId, reference) => {
        setReferenceImages((current) =>
          current.map((item) =>
            item.id === clientId
              ? { ...reference, url: item.url }
              : item,
          ),
        );
      },
    ).then((results) => {
      const readyCount = results.filter(
        (result) => result.reference.status === "ready",
      ).length;
      if (readyCount === results.length) {
        toast.success(`已上传 ${readyCount} 张参考图`);
      } else if (readyCount > 0) {
        toast.warning(`${readyCount} 张上传完成，${results.length - readyCount} 张失败`);
      } else {
        toast.error("参考图上传失败，请移除失败项后重试");
      }
    });
  };

  const removeReference = (image: ReferenceImage) => {
    composerEditRevisionRef.current += 1;
    if (referenceObjectUrlsRef.current.delete(image.url)) {
      URL.revokeObjectURL(image.url);
    }
    setReferenceImages((current) => current.filter((item) => item.id !== image.id));
  };

  const handleLogin = () => {
    setAuthenticationError(null);
    beginAuthentication(`${window.location.pathname}${window.location.search}`);
  };

  const handleLogout = async () => {
    try {
      const redirecting = await signOut();
      if (redirecting) return;
      setAuthenticationSession(null);
      setAuthenticationError(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "退出登录失败，请重试。");
    }
  };

  const handleRefreshAccessStatus = async () => {
    setAccessStatusRefreshing(true);
    try {
      setAuthenticationSession(await readAuthenticationSession());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "暂时无法刷新账户状态，请稍后重试。",
      );
    } finally {
      setAccessStatusRefreshing(false);
    }
  };

  const reloadAssets = async () => {
    if (!authenticationSession || authenticationSession.access.status !== "active") return;
    if (authenticationSession.preview) {
      setAssetBatches(initialAssetBatches);
      setAssetsError(null);
      setAssetsLoading(false);
      return;
    }
    setAssetsLoading(true);
    setAssetsError(null);
    try {
      const batches = (await listAssets()).map(generationJobToAssetBatch);
      setAssetBatches(batches);
      setSavedImages(
        batches.flatMap((batch) =>
          batch.images.map((image) => `${batch.id}-${image.id}`),
        ),
      );
      setSelectedAssetIds([]);
    } catch (error) {
      setAssetsError(
        error instanceof Error ? error.message : "资产库暂时无法读取，请重试。",
      );
    } finally {
      setAssetsLoading(false);
    }
  };

  const handleAssetNav = () => {
    if (assetPulseTimerRef.current) window.clearTimeout(assetPulseTimerRef.current);
    setAssetPulse(false);
    setNewAssetCount(0);
    navigateWorkspace({ kind: "assets" });
    void reloadAssets();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCreateNav = () => {
    navigateWorkspace(currentProject
      ? { kind: "project", projectId: currentProject.id }
      : { kind: "create" });
    setActiveView("create");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reloadProjects = async () => {
    if (!authenticationSession || authenticationSession.access.status !== "active") return;
    if (authenticationSession.preview) {
      setProjects([]);
      setProjectsError(null);
      setProjectsLoading(false);
      return;
    }
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      setProjects([...(await listProjects())]);
    } catch (error) {
      setProjectsError(error instanceof Error ? error.message : "项目列表暂时不可用，请重试。");
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleProjectsNav = () => {
    navigateWorkspace({ kind: "projects" });
    void reloadProjects();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startNewCreation = () => {
    composerEditRevisionRef.current += 1;
    clearPersistedCreationDraft();
    referenceObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    referenceObjectUrlsRef.current.clear();
    loadedProjectIdRef.current = null;
    setReferenceImages([]);
    setPrompt("");
    setCreationBatches([]);
    setCurrentProject(null);
    setGenerationJob(null);
    setDrawerOpen(false);
    setProjectSaveError(null);
    setProjectCreateKey(null);
    setComposerCheckpoint(emptyComposerCheckpoint);
    setDestructiveCreationIntent(null);
    navigateWorkspace({ kind: "create" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const continueProjectRestore = (projectId: string) => {
    projectRestoreAnnouncementRef.current = true;
    navigateWorkspace({ kind: "project", projectId });
  };

  const requestNewCreation = () => {
    if (isGenerating) {
      toast.info("图片仍在生成，请等待当前任务完成后再新建创作");
      return;
    }
    if (hasUnsavedCreationChanges) {
      setDestructiveCreationIntent({ kind: "new" });
      return;
    }
    startNewCreation();
  };

  const restoreProject = (project: ProjectRecord) => {
    if (isGenerating) {
      toast.info("图片仍在生成，请等待当前任务完成后再切换项目");
      return;
    }
    if (loadedProjectIdRef.current === project.id) {
      navigateWorkspace({ kind: "project", projectId: project.id });
      return;
    }
    if (hasUnsavedCreationChanges) {
      setDestructiveCreationIntent({
        kind: "project",
        projectId: project.id,
        projectName: project.name,
      });
      return;
    }
    continueProjectRestore(project.id);
  };

  const confirmDestructiveCreation = () => {
    const intent = destructiveCreationIntent;
    if (!intent) return;
    setDestructiveCreationIntent(null);
    if (intent.kind === "new") {
      startNewCreation();
      return;
    }
    clearPersistedCreationDraft();
    continueProjectRestore(intent.projectId);
  };

  const retryProjectRoute = () => {
    if (!routeProjectId) return;
    setProjectRouteError(null);
    setProjectRestoringId(routeProjectId);
    setProjectRouteRevision((current) => current + 1);
  };

  const openProjectDrawer = () => {
    const suggestedName = /银灰|未来感|时尚摄影/.test(prompt)
      ? "银色未来服装视觉"
      : prompt.trim().split(/[，。,.]/)[0].slice(0, 18) || "未命名创作项目";
    setProjectName(currentProject?.name ?? suggestedName);
    setProjectSaveError(null);
    if (!currentProject && !projectCreateKey) {
      setProjectCreateKey(`project_${globalThis.crypto.randomUUID()}`);
    }
    setProjectDrawerOpen(true);
  };

  const saveCurrentProject = async () => {
    const batchIds = [...new Set([
      ...creationBatches.map((batch) => batch.id),
      ...(generationJob && !generationJob.id.startsWith("pending_") ? [generationJob.id] : []),
    ])];
    if (!batchIds.length || projectSaving) return;
    const name = projectName.trim() || "未命名创作项目";
    const idempotencyKey = projectCreateKey ?? `project_${globalThis.crypto.randomUUID()}`;
    if (!currentProject && !projectCreateKey) setProjectCreateKey(idempotencyKey);
    setProjectSaving(true);
    setProjectSaveError(null);
    const savedFromCreationDraft = currentProject === null;
    try {
      const savedProject = await saveProject({
        batchIds,
        idempotencyKey,
        name,
        projectId: currentProject?.id ?? null,
        state: {
          aspectRatio: selectedRatio,
          count: generationCount,
          modelId: selectedModel,
          prompt,
          references: referenceImages.filter((reference) => reference.status === "ready"),
          resolution,
        },
      });
      setProjects((current) => [savedProject, ...current.filter((project) => project.id !== savedProject.id)]);
      loadedProjectIdRef.current = savedProject.id;
      setCurrentProject({ id: savedProject.id, name: savedProject.name });
      setComposerCheckpoint(createComposerCheckpoint(savedProject.state));
      navigateWorkspace(
        { kind: "project", projectId: savedProject.id },
        { notify: false, replace: true },
      );
      setProjectCreateKey(null);
      setProjectDrawerOpen(false);
      if (savedFromCreationDraft) clearPersistedCreationDraft();
      toast.success("项目已保存，后续创作将自动归入此项目");
    } catch (error) {
      setProjectSaveError(error instanceof Error ? error.message : "项目保存失败，当前创作内容已保留，请重试。");
    } finally {
      setProjectSaving(false);
    }
  };

  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssetIds((current) => current.includes(assetId) ? current.filter((id) => id !== assetId) : [...current, assetId]);
  };

  const recordCompletedGeneration = (completedJob: GenerationJob) => {
    const completedInput = completedJob.input;
    const nextBatch: AssetBatch = {
      id: completedJob.id,
      dateLabel: "今天",
      time: new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()),
      prompt: completedInput.prompt,
      modelId: completedInput.modelId,
      aspectRatio: completedInput.aspectRatio,
      resolution: completedInput.resolution,
      count: completedInput.count,
      referenceCount: completedInput.references.length,
      images: completedJob.outputs,
    };
    setSavedImages((current) => [...current, ...completedJob.outputs.map((result) => `${completedJob.id}-${result.id}`)]);
    setCreationBatches((current) => {
      const nextBatches = [nextBatch, ...current];
      if (currentProject) {
        setProjects((currentProjects) => currentProjects.map((project) => project.id === currentProject.id
          ? {
              ...project,
              batches: [completedJob, ...project.batches.filter((batch) => batch.id !== completedJob.id)],
              state: {
                aspectRatio: completedInput.aspectRatio,
                count: completedInput.count,
                modelId: completedInput.modelId,
                prompt: completedInput.prompt,
                references: completedInput.references,
                resolution: completedInput.resolution,
              },
              updatedAt: completedJob.updatedAt,
            }
          : project));
      }
      return nextBatches;
    });
    setAssetBatches((current) => [
      nextBatch,
      ...current.filter((batch) => batch.id !== nextBatch.id),
    ]);
    setNewAssetCount(completedJob.outputs.length);
    setAssetPulse(true);
    if (assetPulseTimerRef.current) window.clearTimeout(assetPulseTimerRef.current);
    assetPulseTimerRef.current = window.setTimeout(() => setAssetPulse(false), 4200);
  };

  const observeGenerationJob = (job: GenerationJob) => {
    setGenerationJob(job);
    if (
      !job.id.startsWith("pending_") &&
      (job.state === "queued" || !isGenerationJobActive(job.state))
    ) {
      setBillingRevision((current) => current + 1);
    }
    if (currentProject && !job.id.startsWith("pending_")) {
      setComposerCheckpoint(createComposerCheckpoint(job.input));
    }
  };

  const runGeneration = async (snapshot: GenerationInputSnapshot) => {
    if (isGenerating) return;

    setDrawerOpen(false);
    const terminalJob = await generationBoundary.service.submit(
      snapshot,
      observeGenerationJob,
    );
    if (terminalJob.state === "succeeded") {
      recordCompletedGeneration(terminalJob);
    }
  };

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast.error("请先输入画面描述");
      return;
    }
    if (referenceImages.some((reference) => reference.status === "uploading")) {
      toast.info("参考图仍在上传，请稍候");
      return;
    }
    if (referenceImages.some((reference) => reference.status === "failed")) {
      toast.error("请移除上传失败的参考图后再生成");
      return;
    }
    if (
      selectedModel !== "nano-banana-2" ||
      selectedRatio !== "1:1" ||
      resolution !== "1K" ||
      generationCount !== 1
    ) {
      toast.error("当前持久生成链路支持 Nano Banana 2、1:1、标准、1 张图片");
      return;
    }

    const snapshot = createGenerationInputSnapshot({
      prompt,
      references: referenceImages,
      modelId: selectedModel,
      aspectRatio: selectedRatio,
      resolution,
      count: generationCount,
      projectId: currentProject?.id ?? null,
    });
    void runGeneration(snapshot);
  };

  const retryFailedGeneration = () => {
    if (!generationJob || generationJob.state !== "failed") return;
    if (generationJob.id.startsWith("pending_")) {
      void runGeneration(generationJob.input);
      return;
    }
    setDrawerOpen(false);
    void generationBoundary.retry(generationJob, observeGenerationJob).then((terminalJob) => {
      if (terminalJob.state === "succeeded") {
        recordCompletedGeneration(terminalJob);
      }
    });
  };

  const restoreFailedGenerationSettings = () => {
    if (!failedGenerationSnapshot) return;
    const restored = restoreGenerationInputSnapshot(failedGenerationSnapshot);
    setPrompt(restored.prompt);
    setReferenceImages(restored.references);
    setSelectedModel(restored.modelId);
    setSelectedRatio(restored.aspectRatio);
    setResolution(restored.resolution);
    setGenerationCount(restored.count);
    setDrawerOpen(true);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    toast.success("已恢复失败任务的原始提示词、参考图与参数");
  };

  const toggleSave = (assetId: string) => {
    const isSaved = savedImages.includes(assetId);
    setSavedImages((current) => isSaved ? current.filter((id) => id !== assetId) : [...current, assetId]);
    toast.success(isSaved ? "已从资产库移除" : "已重新加入资产库");
  };

  const downloadImage = (batchId: string, imageId: string, previewUrl: string) => {
    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = `goodgood-${batchId}-${imageId}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success("图片已开始下载");
  };

  const openImageDetail = (
    items: DetailImage[],
    imageKey: string,
    source: DetailSource,
  ) => {
    const nextIndex = items.findIndex((item) => item.key === imageKey);
    if (nextIndex < 0) return;
    const nextDetail = items[nextIndex];
    const currentHistoryState = window.history.state && typeof window.history.state === "object"
      ? window.history.state as Record<string, unknown>
      : {};
    setDetailItems(items);
    setDetailIndex(nextIndex);
    setDetailOpen(true);
    navigateWorkspace(
      { kind: "asset", assetId: nextDetail.image.id },
      {
        state: {
          ...currentHistoryState,
          [ASSET_DETAIL_HISTORY_KEY]: {
            returnHref: `${window.location.pathname}${window.location.search}${window.location.hash}`,
            scrollY: window.scrollY,
            source,
          },
        },
      },
    );
  };

  const closeImageDetail = () => {
    setDetailOpen(false);
    const detailNavigation = readAssetDetailNavigationState(window.history.state);
    if (routeAssetId && detailNavigation) {
      pendingDetailScrollRef.current = detailNavigation.scrollY;
      window.history.back();
      return;
    }
    navigateWorkspace({ kind: "assets" }, { replace: true });
  };

  const retryAssetRoute = () => {
    setAssetRouteError(null);
    setAssetRouteRevision((current) => current + 1);
    void reloadAssets();
  };

  const handleDetailWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaY) < 18 || detailWheelTimerRef.current || detailItems.length < 2) return;
    event.preventDefault();
    selectDetailIndex(event.deltaY > 0 ? detailIndex + 1 : detailIndex - 1);
    detailWheelTimerRef.current = window.setTimeout(() => {
      detailWheelTimerRef.current = null;
    }, 280);
  };

  const renderCreationItem = (item: CreationStreamItem) => {
    if (item.kind === "skeleton") {
      return (
        <div className="creation-card creation-skeleton" key={item.key} style={{ aspectRatio: `${item.ratio}` }}>
          <span className="skeleton-feihong" />
          <small>{String(item.index + 1).padStart(2, "0")}</small>
        </div>
      );
    }

    const isSaved = savedImages.includes(item.key);
    const itemModel = getGenerationModel(item.batch.modelId);
    const itemRatio = getGenerationRatio(item.batch.aspectRatio);
    return (
      <article
        className={`creation-card creation-variant-${(item.index % 4) + 1}`}
        key={item.key}
        style={{ aspectRatio: `${item.ratio}`, "--reveal-delay": `${item.index * 70}ms` } as CSSProperties}
        role="button"
        tabIndex={0}
        aria-label={`查看 ${itemModel.name} 生成的视觉作品 ${item.index + 1}`}
        onClick={() => openImageDetail(creationDetailItems, item.key, "creation")}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openImageDetail(creationDetailItems, item.key, "creation");
          }
        }}
      >
        <PrivateObjectImage
          src={item.image.previewUrl}
          alt={`${itemModel.name} 生成的视觉作品 ${item.index + 1}`}
          style={{ objectPosition: item.image.previewPosition }}
        />
        <span className="creation-card-meta">{item.batch.time} · {itemRatio.label}</span>
        <div className="image-actions">
          <button className={isSaved ? "saved" : ""} aria-label={isSaved ? "从资产库移除" : "保存到资产库"} onClick={(event) => { event.stopPropagation(); toggleSave(item.key); }}><Bookmark size={15} fill={isSaved ? "currentColor" : "none"} /></button>
          <button aria-label="下载到本地" onClick={(event) => { event.stopPropagation(); downloadImage(item.batch.id, item.image.id, item.image.previewUrl); }}><Download size={15} /></button>
        </div>
      </article>
    );
  };

  const renderCreationColumns = (items: CreationStreamItem[], columnCount: number, group: "task" | "history") => Array.from({ length: columnCount }, (_, columnIndex) => (
    <div className="creation-column" key={`${group}-column-${columnCount}-${columnIndex}`}>
      {items.filter((_, itemIndex) => itemIndex % columnCount === columnIndex).map(renderCreationItem)}
    </div>
  ));

  const getAssetGalleryItems = (dateLabel: string): AssetGalleryItem[] => assetDetailItems
    .filter((item) => item.batch.dateLabel === dateLabel);

  const renderAssetGalleryCard = (item: AssetGalleryItem) => {
    const isSelected = selectedAssetIds.includes(item.key);
    const itemModel = getGenerationModel(item.batch.modelId);
    const itemRatio = getGenerationRatio(item.batch.aspectRatio);
    return (
      <article
        className={`asset-gallery-card gallery-variant-${(item.index % 4) + 1} ${isSelected ? "selected" : ""}`}
        key={item.key}
        style={{ aspectRatio: `${item.ratio}` }}
        role="button"
        tabIndex={0}
        aria-label={`查看 ${itemRatio.label} 图片详情`}
        onClick={() => openImageDetail(assetDetailItems, item.key, "assets")}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openImageDetail(assetDetailItems, item.key, "assets");
          }
        }}
      >
        <PrivateObjectImage
          src={item.image.previewUrl}
          alt={`${item.batch.id} 画廊图片 ${item.index + 1}`}
          style={{ objectPosition: item.image.previewPosition }}
        />
        <button
          className="asset-gallery-check"
          aria-label={`${isSelected ? "取消选择" : "选择"}这张图片`}
          aria-pressed={isSelected}
          onClick={(event) => { event.stopPropagation(); toggleAssetSelection(item.key); }}
        ><Check size={12} /></button>
        <span className="asset-gallery-caption"><strong>{itemRatio.label}</strong><small>{item.batch.time} · {itemModel.name}</small></span>
      </article>
    );
  };

  const renderAssetGalleryColumns = (dateLabel: string, columnCount: number) => {
    const items = getAssetGalleryItems(dateLabel);
    return Array.from({ length: columnCount }, (_, columnIndex) => (
      <div className="asset-gallery-column" key={`asset-gallery-column-${dateLabel}-${columnCount}-${columnIndex}`}>
        {items.filter((_, itemIndex) => itemIndex % columnCount === columnIndex).map(renderAssetGalleryCard)}
      </div>
    ));
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand" role="img" aria-label="GoodGood">
          <Image className="brand-mark" src="/goodgood-mark.svg" alt="" width={29} height={22} />
          <Image className="wordmark-image sidebar-wordmark" src="/goodgood-wordmark.svg" alt="" width={89} height={20} />
        </div>

        <nav className="side-nav" aria-label="主导航">
          <button className={`side-nav-item ${activeView === "create" ? "active" : ""}`} onClick={handleCreateNav}><Brush size={17} strokeWidth={1.8} /><span>创作</span></button>
          <button className="side-nav-item"><Compass size={17} /><span>探索</span></button>
          <button className={`side-nav-item ${activeView === "projects" ? "active" : ""}`} onClick={handleProjectsNav}><FolderOpen size={17} /><span>项目</span></button>
          <button className={`side-nav-item asset-nav ${activeView === "assets" ? "active" : ""} ${assetPulse ? "has-new-assets" : ""}`} onClick={handleAssetNav}>
            <Images size={17} /><span>资产库</span>
            {newAssetCount > 0 && <em className="asset-new-count">+{newAssetCount}</em>}
          </button>
          <button className="side-nav-item"><LayoutGrid size={17} /><span>灵感板</span></button>
          {authenticationSession?.account.role === "site_owner" && (
            <button
              className="side-nav-item"
              onClick={() => window.location.assign("/admin/users")}
            >
              <UserRoundCog size={17} /><span>账户管理</span>
            </button>
          )}
        </nav>

        <div className="sidebar-footer">
          <button className="side-nav-item"><HelpCircle size={17} /><span>帮助</span></button>
          {authenticationSession && (
            <div
              className={`sidebar-billing ${billingError ? "has-error" : ""}`}
              role={billingError ? "alert" : "status"}
              aria-live="polite"
            >
              {billingLoading ? (
                <span className="sidebar-billing-loading"><LoaderCircle size={12} />正在读取积分</span>
              ) : billingError ? (
                <button onClick={() => {
                  setBillingLoading(true);
                  setBillingError(null);
                  setBillingRevision((current) => current + 1);
                }}>
                  <CircleAlert size={12} />积分暂不可用<RefreshCw size={11} />
                </button>
              ) : billingSummary ? (
                <>
                  <div><span>积分余额</span><strong>{billingSummary.account.availableCredits}</strong></div>
                  <small>
                    {launchBillingQuote?.creditAmount ?? "--"} 积分/张 · 可生成 {availableImages?.toString() ?? "--"} 张
                  </small>
                </>
              ) : null}
            </div>
          )}
          <div className="account-card">
            <div className="avatar">{accountInitials}</div>
            <div>
              <strong>{accountEmail ?? "登录 GoodGood"}</strong>
              <small>{authenticationSession?.preview ? "本地预览" : authenticationSession ? "已登录" : "Google 或邮箱验证码"}</small>
            </div>
            <button
              className="account-session-action"
              aria-label={authenticationSession ? "退出登录" : "登录"}
              onClick={authenticationSession ? () => void handleLogout() : handleLogin}
            >
              {authenticationSession ? <LogOut size={15} /> : <LogIn size={15} />}
            </button>
          </div>
        </div>
      </aside>

      <section className="main-stage">
        <header className="mobile-bar">
          <div className="mobile-brand" role="img" aria-label="GoodGood"><Image className="brand-mark" src="/goodgood-mark.svg" alt="" width={27} height={20} /><Image className="wordmark-image" src="/goodgood-wordmark.svg" alt="" width={84} height={19} /></div>
          <div className="mobile-account">
            {authenticationSession?.account.role === "site_owner" && (
              <button
                className="top-avatar"
                aria-label="账户管理"
                onClick={() => window.location.assign("/admin/users")}
              >
                <UserRoundCog size={16} />
              </button>
            )}
            {authenticationSession && (
              billingError ? (
                <button className="mobile-credit-balance has-error" onClick={() => {
                  setBillingLoading(true);
                  setBillingError(null);
                  setBillingRevision((current) => current + 1);
                }}>积分重试</button>
              ) : (
                <span className="mobile-credit-balance">
                  {billingLoading ? "--" : billingSummary?.account.availableCredits ?? "--"} 积分
                </span>
              )
            )}
            <button
              className="top-avatar"
              aria-label={authenticationSession ? "退出登录" : "登录"}
              onClick={authenticationSession ? () => void handleLogout() : handleLogin}
            >{accountInitials}</button>
          </div>
        </header>

        <div className={`content-wrap ${activeView !== "create" ? "asset-content-wrap" : ""}`}>
          {activeView === "create" ? routeProjectId && projectRestoringId === routeProjectId ? (
            <section className="project-library-state project-route-state" role="status">
              <LoaderCircle size={18} />正在恢复项目
            </section>
          ) : routeProjectId && projectRouteError ? (
            <section className="project-library-state project-library-error project-route-state" role="alert">
              <CircleAlert size={18} />
              <span>{projectRouteError}</span>
              <button onClick={retryProjectRoute}><RefreshCw size={14} />重试</button>
              <button onClick={handleProjectsNav}><FolderOpen size={14} />返回项目</button>
              <button onClick={requestNewCreation}><Plus size={14} />新建创作</button>
            </section>
          ) : <>
          <CreationComposer
            prompt={prompt}
            references={referenceImages}
            modelId={selectedModel}
            aspectRatio={selectedRatio}
            resolution={resolution}
            count={generationCount}
            drawerOpen={drawerOpen}
            isGenerating={isGenerating}
            billingLabel={composerBillingLabel}
            billingDescription={composerBillingDescription}
            onPromptChange={handlePromptChange}
            onReferenceFiles={handleReferenceFiles}
            onRemoveReference={removeReference}
            onModelChange={handleModelChange}
            onAspectRatioChange={handleAspectRatioChange}
            onResolutionChange={handleResolutionChange}
            onCountChange={handleGenerationCountChange}
            onDrawerOpenChange={setDrawerOpen}
            onGenerate={handleGenerate}
          />

          {!currentProject && draftLoading && (
            <div className="draft-sync-state" role="status">
              <LoaderCircle size={13} />正在恢复上次创作
            </div>
          )}
          {!currentProject && !draftLoading && draftConflict && (
            <div className="draft-sync-state draft-sync-conflict" role="alert">
              <CircleAlert size={14} />
              <span>另一窗口已更新草稿。当前内容尚未覆盖云端。</span>
              <button disabled={draftSyncing || isGenerating} onClick={keepCurrentDraft}>保留当前内容</button>
              <button disabled={draftSyncing || isGenerating} onClick={restoreCloudDraft}>恢复云端草稿</button>
            </div>
          )}
          {!currentProject && !draftLoading && !draftConflict && draftSyncError && (
            <div className="draft-sync-state draft-sync-error" role="alert">
              <CircleAlert size={14} />
              <span>{draftSyncError}</span>
              <button onClick={retryDraftSync}>重试</button>
            </div>
          )}
          {!currentProject && !draftLoading && !draftConflict && !draftSyncError && draftSyncing && (
            <div className="draft-sync-state" role="status">
              <LoaderCircle size={13} />正在保存草稿
            </div>
          )}

          {!isGenerating && !hasGenerationError && creationBatches.length === 0 ? (
            <section className="creation-empty-state" aria-label="尚未开始创作">
              <Image src="/goodgood-mark.svg" alt="" width={32} height={24} />
              <h2>描述你想创作的画面</h2>
              <p>输入提示词，或上传参考图片开始</p>
            </section>
          ) : (
            <section className="creation-stream" aria-label="当前创作内容">
              <header className="creation-stream-header">
                <div className="creation-context">
                  {currentProject ? <><FolderOpen size={16} /><strong>{currentProject.name}</strong><span>已自动保存</span></> : <><strong>本次创作</strong><span>{totalCreationImages} 张</span></>}
                </div>
                <div className="creation-stream-actions">
                  {isGenerating && <span className="inline-generation-status" role="status"><LoaderCircle size={14} />{stageText}</span>}
                  {creationBatches.length > 0 && <button className="save-project-button" onClick={openProjectDrawer}><FolderPlus size={15} />{currentProject ? "项目设置" : "保存为项目"}</button>}
                  {currentProject && <button className="new-session-button" aria-label="退出当前项目并开始新创作" disabled={isGenerating} onClick={requestNewCreation}><Plus size={15} />新建创作</button>}
                </div>
              </header>

              {isGenerating && (
                <div className="generation-task-frame" aria-live="polite" aria-label="当前生成任务">
                  <div className="creation-masonry desktop-creation-masonry">{renderCreationColumns(generationItems, 4, "task")}</div>
                  <div className="creation-masonry mobile-creation-masonry">{renderCreationColumns(generationItems, 2, "task")}</div>
                </div>
              )}

              {hasGenerationError && (
                <div className="generation-error-strip" role="alert">
                  <span className="generation-error-icon"><CircleAlert size={18} /></span>
                  <div className="generation-error-copy">
                    <div className="generation-error-heading">
                      <h3>{generationError.title}</h3>
                      <span>{jobInput?.count ?? 0} 张未生成</span>
                    </div>
                    <p>{generationError.message}</p>
                    <small>{generationError.code} · {generationJob?.id} · {jobRatio.label} · {jobInput ? getGenerationResolutionLabel(jobInput.resolution) : ""} · {(jobInput?.references.length ?? 0) > 0 ? `${jobInput?.references.length} 张参考图` : "无参考图"}</small>
                  </div>
                  <div className="generation-error-actions">
                    <button
                      className="error-retry"
                      title={submissionUnknown ? "将创建新的上游任务，并可能再次计费" : "使用失败任务的原始参数和参考图"}
                      onClick={retryFailedGeneration}
                    >
                      <RefreshCw size={14} />
                      {submissionUnknown ? "再次提交（将再次计费）" : "重新生成"}
                    </button>
                    <button className="error-settings" title="恢复失败任务的输入后调整" onClick={restoreFailedGenerationSettings}><Settings2 size={14} />修改设置</button>
                  </div>
                </div>
              )}

              {creationItems.length > 0 && (
                <div className="creation-masonry-frame" aria-live="polite">
                  <div className="creation-masonry desktop-creation-masonry">{renderCreationColumns(creationItems, 4, "history")}</div>
                  <div className="creation-masonry mobile-creation-masonry">{renderCreationColumns(creationItems, 2, "history")}</div>
                </div>
              )}
            </section>
          )}
          </> : activeView === "projects" ? (
            <section className="project-library-view" aria-label="项目">
              <header className="asset-library-header project-library-header">
                <div><small>GOODGOOD PROJECTS</small><h1>项目</h1><p>保存完整的创作过程，随时恢复并继续创作。</p></div>
                <button className="new-creation-button" onClick={requestNewCreation}><Plus size={15} />新建创作</button>
              </header>
              {projectsLoading ? (
                <div className="project-library-state" role="status"><LoaderCircle size={18} />正在读取项目</div>
              ) : projectsError ? (
                <div className="project-library-state project-library-error" role="alert">
                  <CircleAlert size={18} />
                  <span>{projectsError}</span>
                  <button onClick={() => void reloadProjects()}><RefreshCw size={14} />重试</button>
                </div>
              ) : projects.length === 0 ? (
                <div className="project-library-state project-library-empty">
                  <FolderOpen size={20} />
                  <strong>还没有保存的项目</strong>
                  <span>完成一次生成后，即可把当前创作保存为项目。</span>
                </div>
              ) : (
                <div className="project-grid">
                  {projects.map((project) => {
                    const batches = projectAssetBatches(project);
                    const imageCount = batches.reduce((total, batch) => total + batch.images.length, 0);
                    const cover = batches[0]?.images[0] ?? null;
                    const restoring = projectRestoringId === project.id;
                    return (
                      <article className="project-card" key={project.id}>
                        <button disabled={restoring} className="project-cover" onClick={() => void restoreProject(project)} aria-label={`打开项目 ${project.name}`}>
                          <PrivateObjectImage src={cover?.previewUrl ?? "/nano-fashion.png"} alt={`${project.name} 项目封面`} style={{ objectPosition: cover?.previewPosition ?? "50% 45%" }} />
                          <span>{imageCount} 张图片</span>
                        </button>
                        <div className="project-card-footer">
                          <div><h2>{project.name}</h2><p>{formatProjectUpdated(project.updatedAt)} · {project.batches.length} 个生成批次</p></div>
                          <button disabled={restoring} onClick={() => void restoreProject(project)}>{restoring ? "正在恢复" : "继续创作"}</button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          ) : (
            <section className="asset-library-view" aria-label="资产库">
              <header className="asset-library-header">
                <div><small>GOODGOOD ASSETS</small><h1>资产库</h1><p>每一次生成，都按任务批次完整保留。</p></div>
                <div className="asset-library-controls">
                  <div className="asset-view-toggle" aria-label="资产库展示模式">
                    <button className={assetMode === "batches" ? "active" : ""} aria-pressed={assetMode === "batches"} onClick={() => setAssetMode("batches")}><Clock3 size={14} />批次</button>
                    <button className={assetMode === "gallery" ? "active" : ""} aria-pressed={assetMode === "gallery"} onClick={() => setAssetMode("gallery")}><LayoutGrid size={14} />画廊</button>
                  </div>
                  {assetMode === "gallery" && selectedAssetIds.length > 0 && <span className="asset-selection-summary">已选 {selectedAssetIds.length}</span>}
                  <button className="asset-return-button" onClick={handleCreateNav}><Brush size={15} />返回创作</button>
                </div>
              </header>

              {assetRouteError ? (
                <div className="asset-library-state asset-library-error" role="alert">
                  <CircleAlert size={18} />
                  <span>{assetRouteError}</span>
                  <button onClick={retryAssetRoute}><RefreshCw size={14} />重试</button>
                  <button onClick={() => navigateWorkspace({ kind: "assets" }, { replace: true })}><Images size={14} />返回资产库</button>
                </div>
              ) : assetsLoading ? (
                <div className="asset-library-state" role="status"><LoaderCircle size={18} />正在读取资产</div>
              ) : assetsError ? (
                <div className="asset-library-state asset-library-error" role="alert">
                  <CircleAlert size={18} />
                  <span>{assetsError}</span>
                  <button onClick={() => void reloadAssets()}><RefreshCw size={14} />重试</button>
                </div>
              ) : assetBatches.length === 0 ? (
                <div className="asset-library-state asset-library-empty">
                  <Images size={20} />
                  <strong>资产库还是空的</strong>
                  <span>完成一次生成后，图片会自动保存在这里。</span>
                </div>
              ) : assetMode === "batches" ? Array.from(new Set(assetBatches.map((batch) => batch.dateLabel))).map((dateLabel) => (
                <section className="asset-date-group" key={dateLabel}>
                  <h2>{dateLabel}</h2>
                  <div className="asset-batch-list">
                    {assetBatches.filter((batch) => batch.dateLabel === dateLabel).map((batch) => {
                      const batchRatio = getGenerationRatio(batch.aspectRatio);
                      const batchModel = getGenerationModel(batch.modelId);
                      return (
                        <article className="asset-batch-row" key={batch.id}>
                          <div className="asset-batch-time"><strong>{batch.time}</strong><small>{batch.id}</small></div>
                          <div className={`asset-batch-images asset-${batchRatio.mode} asset-count-${batch.images.length}`}>
                            {batch.images.map((image, index) => (
                              <button
                                className="asset-image-frame"
                                key={`${batch.id}-${image.id}`}
                                style={{ aspectRatio: `${batchRatio.value}` }}
                                aria-label={`查看 ${batch.id} 生成结果 ${index + 1}`}
                                onClick={() => openImageDetail(assetDetailItems, `${batch.id}-${image.id}`, "assets")}
                              >
                                <PrivateObjectImage
                                  src={image.previewUrl}
                                  alt={`${batch.id} 生成结果 ${index + 1}`}
                                  style={{ objectPosition: image.previewPosition }}
                                />
                              </button>
                            ))}
                          </div>
                          <div className="asset-batch-details">
                            <p>{batch.prompt}</p>
                            <div className="asset-batch-meta">
                              <span>{batchModel.name}</span><span>{batchRatio.label}</span><span>{getGenerationResolutionLabel(batch.resolution)}</span><span>{batch.count} 张</span>{batch.referenceCount > 0 && <span>{batch.referenceCount} 张参考</span>}
                            </div>
                          </div>
                          <button className="asset-batch-more" aria-label="批次更多操作"><MoreHorizontal size={18} /></button>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )) : (
                <div className="asset-gallery-mode">
                  {Array.from(new Set(assetBatches.map((batch) => batch.dateLabel))).map((dateLabel) => (
                    <section className="asset-gallery-date-group" key={dateLabel}>
                      <h2>{dateLabel}</h2>
                      <div className="asset-gallery-masonry-frame">
                        <div className="asset-gallery-masonry desktop-asset-gallery-masonry">{renderAssetGalleryColumns(dateLabel, 4)}</div>
                        <div className="asset-gallery-masonry mobile-asset-gallery-masonry">{renderAssetGalleryColumns(dateLabel, 2)}</div>
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </section>
      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open) closeImageDetail();
        }}
      >
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content
            className="image-detail-dialog"
            onWheel={handleDetailWheel}
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <DialogTitle className="sr-only">图片详情</DialogTitle>
            <DialogDescription className="sr-only">查看大图、提示词与生成参数，滚动鼠标切换图片。</DialogDescription>
            {activeDetail && (
              <div className="image-detail-layout">
              <section className="image-detail-stage" aria-label="大图预览">
                <button className="image-detail-close" aria-label="关闭图片详情" onClick={closeImageDetail}><X size={20} /></button>
                <div className="image-detail-count">{String(detailIndex + 1).padStart(2, "0")} / {String(detailItems.length).padStart(2, "0")}</div>
                <div
                  className={`image-detail-art detail-variant-${(activeDetail.index % 4) + 1}`}
                  style={{ aspectRatio: `${activeDetail.ratio}`, width: `min(calc(100% - 72px), ${activeDetail.ratio * 82}dvh)` }}
                >
                  <PrivateObjectImage
                    src={activeDetail.image.previewUrl}
                    alt={`${activeDetailModel?.name} 生成图片 ${activeDetail.index + 1}`}
                    loading="eager"
                    style={{ objectPosition: activeDetail.image.previewPosition }}
                  />
                </div>
              </section>

              <aside className="image-detail-info" aria-label="图片信息">
                <header className="image-detail-info-header">
                  <div>
                    <small>{activeDetail.batch.dateLabel} · {activeDetail.batch.time}</small>
                    <strong>{activeDetailModel?.name}</strong>
                  </div>
                  <div className="image-detail-actions">
                    <button
                      className={savedImages.includes(activeDetail.key) ? "saved" : ""}
                      aria-label={savedImages.includes(activeDetail.key) ? "从资产库移除" : "保存到资产库"}
                      onClick={() => toggleSave(activeDetail.key)}
                    ><Bookmark size={17} fill={savedImages.includes(activeDetail.key) ? "currentColor" : "none"} /></button>
                    <button aria-label="下载图片" onClick={() => downloadImage(activeDetail.batch.id, activeDetail.image.id, activeDetail.image.previewUrl)}><Download size={17} /></button>
                  </div>
                </header>

                <div className="image-detail-section image-detail-prompt">
                  <span>提示词</span>
                  <p>{activeDetail.batch.prompt}</p>
                </div>

                <div className="image-detail-section">
                  <span>生成参数</span>
                  <dl className="image-detail-parameters">
                    <div><dt>模型</dt><dd>{activeDetailModel?.name}</dd></div>
                    <div><dt>画面比例</dt><dd>{activeDetailRatio?.label}</dd></div>
                    <div><dt>分辨率</dt><dd>{getGenerationResolutionLabel(activeDetail.batch.resolution)}</dd></div>
                    <div><dt>批次</dt><dd>{activeDetail.batch.count} 张</dd></div>
                    <div><dt>参考图</dt><dd>{activeDetail.batch.referenceCount ? `${activeDetail.batch.referenceCount} 张` : "无"}</dd></div>
                    <div><dt>任务编号</dt><dd>{activeDetail.batch.id}</dd></div>
                  </dl>
                </div>

                <div className="image-detail-wheel-hint">
                  <span className="wheel-hint-icon"><i /></span>
                  <div><strong>滚动切换图片</strong><small>也可以使用方向键</small></div>
                </div>
              </aside>

              <nav className="image-detail-rail" aria-label="全部图片">
                <div className="image-detail-rail-title"><span>全部</span><small>{detailItems.length}</small></div>
                <div className="image-detail-thumbnails">
                  {detailItems.map((item, index) => (
                    <button
                      key={item.key}
                      ref={(element) => { detailThumbnailRefs.current[index] = element; }}
                      className={`image-detail-thumbnail detail-variant-${(item.index % 4) + 1} ${index === detailIndex ? "active" : ""}`}
                      style={{ aspectRatio: `${item.ratio}` }}
                      aria-label={`查看第 ${index + 1} 张图片`}
                      aria-current={index === detailIndex ? "true" : undefined}
                      onClick={() => selectDetailIndex(index)}
                    >
                      <PrivateObjectImage src={item.image.previewUrl} alt="" style={{ objectPosition: item.image.previewPosition }} />
                      <span>{String(index + 1).padStart(2, "0")}</span>
                    </button>
                  ))}
                </div>
              </nav>
              </div>
            )}
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
      <Dialog
        open={destructiveCreationIntent !== null}
        onOpenChange={(open) => {
          if (!open) setDestructiveCreationIntent(null);
        }}
      >
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content className="unsaved-changes-dialog">
            <DialogTitle>当前修改尚未保存</DialogTitle>
            <DialogDescription>
              {destructiveCreationIntent?.kind === "project"
                ? `打开“${destructiveCreationIntent.projectName}”会覆盖当前提示词、参考图和生成参数。`
                : "新建创作会清空当前提示词、参考图和生成参数。"}
            </DialogDescription>
            <div className="unsaved-changes-actions">
              <button
                className="unsaved-changes-cancel"
                onClick={() => setDestructiveCreationIntent(null)}
              >继续编辑</button>
              <button
                className="unsaved-changes-confirm"
                onClick={confirmDestructiveCreation}
              >
                {destructiveCreationIntent?.kind === "project"
                  ? "放弃修改并打开"
                  : "放弃修改并新建"}
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
      <Drawer open={projectDrawerOpen} onOpenChange={setProjectDrawerOpen}>
        <DrawerContent className="project-save-drawer">
          <div className="project-save-shell">
            <DrawerHeader className="project-save-header">
              <DrawerTitle>{currentProject ? "项目设置" : "保存为项目"}</DrawerTitle>
              <DrawerDescription>保存图片、提示词和生成参数，以后可以从这里继续创作。</DrawerDescription>
            </DrawerHeader>
            <div className="project-save-body">
              <div className="project-save-cover">
                <PrivateObjectImage src={creationBatches[0]?.images[0]?.previewUrl ?? "/nano-fashion.png"} alt="项目封面预览" style={{ objectPosition: creationBatches[0]?.images[0]?.previewPosition ?? "50% 42%" }} />
                <span>{totalCreationImages} 张图片 · {creationBatches.length} 个批次</span>
              </div>
              <label className="project-name-field">
                <span>项目名称</span>
                <input value={projectName} onChange={(event) => setProjectName(event.target.value)} autoFocus maxLength={32} />
              </label>
            </div>
            {projectSaveError && <p className="project-save-error" role="alert">{projectSaveError}</p>}
            <div className="project-save-actions">
              <button className="project-save-cancel" disabled={projectSaving} onClick={() => setProjectDrawerOpen(false)}>取消</button>
              <button className="project-save-confirm" disabled={projectSaving || !projectName.trim()} onClick={() => void saveCurrentProject()}>{projectSaving ? "正在保存" : currentProject ? "保存更改" : "保存项目"}</button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
      {authenticationSession === undefined ? (
        <div className="authentication-gate" role="status" aria-label="正在确认登录状态">
          <div className="authentication-card authentication-loading">
            <LoaderCircle size={20} />
            <span>正在确认登录状态</span>
          </div>
        </div>
      ) : authenticationSession === null ? (
        <div className="authentication-gate" role="dialog" aria-modal="true" aria-labelledby="authentication-title">
          <div className="authentication-card">
            <Image src="/goodgood-mark.svg" alt="" width={32} height={24} />
            <h2 id="authentication-title">登录后继续创作</h2>
            <p>使用 Google 账号或邮箱验证码。首次登录会自动注册，无需设置密码。</p>
            {authenticationError && <div className="authentication-error" role="alert">{authenticationError}</div>}
            <button className="authentication-primary" onClick={handleLogin}>
              <LogIn size={16} />
              Google / 邮箱验证码登录
            </button>
          </div>
        </div>
      ) : authenticationSession.access.status !== "active" ? (
        <AccountAccessGate
          busy={accessStatusRefreshing}
          onLogout={() => void handleLogout()}
          onRefresh={() => void handleRefreshAccessStatus()}
          session={authenticationSession}
        />
      ) : null}
      <Toaster position="bottom-center" toastOptions={{ duration: 2200 }} />
    </main>
  );
}
