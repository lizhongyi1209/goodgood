"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type WheelEvent as ReactWheelEvent } from "react";
import Image from "next/image";
import { CreationComposer } from "@/features/creation/creation-composer";
import { VideoCreationComposer } from "@/features/creation/video-creation-composer";
import { MixedMediaStylePreview } from "@/features/creation/mixed-media-style-preview";
import { SeedanceModelIcon } from "@/features/models/seedance-model-icon";
import {
  appendVideoAssetMaterials,
  type VideoAssetMaterial,
  type VideoAssetMediaFilter,
} from "@/features/creation/video-asset-selection";
import {
  DEFAULT_VIDEO_DURATION_SECONDS,
  DEFAULT_VIDEO_GENERATION_MODE,
  DEFAULT_VIDEO_MODEL_ID,
  DEFAULT_VIDEO_PROVIDER_LINE,
  DEFAULT_VIDEO_RATIO,
  DEFAULT_VIDEO_RESOLUTION,
  countVideoReferences,
  getVideoGenerationModel,
  getVideoReferenceLimits,
  normalizeVideoReferencesForMode,
  resolveVideoDuration,
  resolveVideoResolution,
  videoReferenceCapacityError,
  videoReferenceFileError,
  videoReferenceMediaTypeForFile,
  type CreationMode,
  type VideoAspectRatio,
  type VideoGenerationMode,
  type VideoGenerationModelId,
  type VideoProviderLine,
  type VideoReference,
  type VideoReferenceMediaType,
  type VideoReferenceRole,
  type VideoResolution,
} from "@/features/creation/video-generation-options";
import {
  formatPixelDimensions,
  formatGenerationResolution,
  getGenerationPixelDimensions,
  getSharedPixelDimensions,
  getGenerationRatio,
  getGenerationResolutionLabel,
  gptImageBackgroundLabel,
  gptImageOutputFormatLabel,
  gptImageQualityLabel,
  isGenerationCountSupported,
  resolveGenerationAspectRatioForModel,
  resolveGenerationCountForModel,
  resolveGenerationThinkingLevelForModel,
  resolveGoogleSearchForModel,
  resolveGptImageOptionsForModel,
} from "@/features/creation/generation-options";
import {
  isGenerationJobActive,
  toGenerationUiStage,
} from "@/features/creation/generation-job";
import {
  getActiveGenerationRuns,
  getFailedGenerationRuns,
  getGenerationRunSlots,
  getPersistentGenerationJobIds,
  getSucceededGenerationJobIds,
  upsertGenerationRun,
  type TrackedGenerationRun,
} from "@/features/creation/generation-runs";
import {
  MOCK_GENERATION_OUTPUTS,
} from "@/features/creation/mock-generation-boundary";
import { createHttpGenerationBoundary } from "@/features/creation/http-generation-boundary";
import {
  readLocalVideoPreviewAvailability,
  submitLocalVideoPreview,
  type LocalVideoPreviewAvailability,
  type LocalVideoPreviewJob,
} from "@/features/creation/http-video-preview-boundary";
import { uploadReferenceFiles } from "@/features/references/http-reference-upload";
import {
  listReferenceMaterials,
  type ReferenceMaterial,
} from "@/features/references/http-reference-library";
import {
  appendReferenceMaterials,
  reorderReferences,
} from "@/features/references/reference-selection";
import {
  SESSION_EXPIRED_EVENT,
  authenticationErrorMessage,
  beginAuthentication,
  readAuthenticationSession,
  signOut,
  type AuthenticationSession,
} from "@/features/auth/http-auth-boundary";
import { AccountAccessGate } from "@/features/auth/account-access-gate";
import { AuthenticationGate } from "@/features/auth/authentication-gate";
import {
  listAssets,
  readAssetDownloadUrl,
} from "@/features/assets/http-asset-boundary";
import {
  ImageDownloadError,
  saveImageToLocal,
} from "@/features/assets/image-download";
import {
  findBillingQuote,
  readBillingSummary,
} from "@/features/billing/http-billing-boundary";
import { CreditActivityView } from "@/features/billing/credit-activity-view";
import { DistributionView } from "@/features/distribution/distribution-view";
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
  isGptImageModelId,
  type GenerationAspectRatio,
  type GenerationCount,
  type GenerationInputSnapshot,
  type GenerationJob,
  type GenerationModelId,
  type GenerationOutput,
  type GenerationReference,
  type GenerationResolution,
  type GenerationThinkingLevel,
  type GptImageBackground,
  type GptImageOutputFormat,
  type GptImageQuality,
} from "@/shared/contracts/generation";
import type { ProjectRecord } from "@/shared/contracts/project";
import type { BillingSummary } from "@/shared/contracts/billing";
import type {
  CreationDraftRecord,
  CreationDraftState,
} from "@/shared/contracts/draft";
import { WorkspaceSwitcher } from "@/features/organizations/workspace-switcher";
import type { WorkspaceRecord } from "@/features/organizations/http-organization-boundary";
import {
  Dialog,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  AudioLines,
  Brush,
  Check,
  CircleAlert,
  CircleDot,
  Clock3,
  Coins,
  Compass,
  Download,
  FolderOpen,
  FolderPlus,
  Film,
  HelpCircle,
  ImagePlus,
  Images,
  LayoutGrid,
  LoaderCircle,
  LogIn,
  LogOut,
  MoreHorizontal,
  Network,
  Plus,
  RefreshCw,
  Settings2,
  UserRoundCog,
  X,
} from "lucide-react";

type ReferenceImage = GenerationReference;
type AssetBatch = {
  id: string;
  createdAt: string;
  dateLabel: string;
  time: string;
  prompt: string;
  modelId: GenerationModelId;
  aspectRatio: GenerationAspectRatio;
  resolution: GenerationResolution;
  count: GenerationCount;
  thinkingLevel: GenerationThinkingLevel;
  googleSearch: boolean;
  quality: GptImageQuality;
  background: GptImageBackground;
  outputFormat: GptImageOutputFormat;
  referenceCount: number;
  images: readonly GenerationOutput[];
};
type ActiveView = "create" | "projects" | "assets" | "credits" | "distribution";
type DestructiveCreationIntent =
  | { kind: "new" }
  | { kind: "project"; projectId: string; projectName: string };
type DraftConflictState = Readonly<{
  currentDraft: CreationDraftRecord | null;
}>;
type CreationStreamItem =
  | { kind: "skeleton"; key: string; ratio: number; index: number }
  | { kind: "image"; key: string; detailKey: string; ratio: number; batch: AssetBatch; image: GenerationOutput; index: number };
type AssetGalleryItem = { key: string; ratio: number; batch: AssetBatch; image: GenerationOutput; index: number };
type DetailImage = AssetGalleryItem;

function localVideoStatusLabel(status: string, progress: number | null) {
  if (status === "submitting") return "正在提交";
  if (status === "queued") return "已排队";
  if (status === "in_progress") return progress === null ? "正在生成" : `正在生成 ${progress}%`;
  if (status === "completed") return "生成完成";
  if (status === "failed") return "生成失败";
  return "正在处理";
}
type DetailSource = "creation" | "assets";
type AssetDetailNavigationState = Readonly<{
  returnHref: string;
  scrollY: number;
  source: DetailSource;
}>;
const videoAssetMediaFilters = [
  { id: "all", label: "全部" },
  { id: "image", label: "图片" },
  { id: "video", label: "视频" },
  { id: "audio", label: "音频" },
] as const satisfies readonly Readonly<{
  id: VideoAssetMediaFilter;
  label: string;
}>[];

const ASSET_DETAIL_HISTORY_KEY = "goodgoodAssetDetail";

function readAssetDetailNavigationState(state: unknown): AssetDetailNavigationState | null {
  if (!state || typeof state !== "object") return null;
  const candidate = (state as Record<string, unknown>)[ASSET_DETAIL_HISTORY_KEY];
  if (!candidate || typeof candidate !== "object") return null;
  const detail = candidate as Record<string, unknown>;
  if (
    detail.source !== "creation" &&
    detail.source !== "assets"
  ) return null;
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
  thinkingLevel: "high",
  googleSearch: false,
  quality: "auto",
  background: "auto",
  outputFormat: "png",
});
const initialAssetBatches: AssetBatch[] = [
  {
    id: "GG-240827",
    createdAt: "2026-09-08T10:16:00.000Z",
    dateLabel: "今天",
    time: "10:16",
    prompt: defaultPrompt,
    modelId: "nano-banana-2",
    aspectRatio: "4:5",
    resolution: "2K",
    count: 4,
    thinkingLevel: "low",
    googleSearch: false,
    quality: "auto",
    background: "auto",
    outputFormat: "png",
    referenceCount: 0,
    images: MOCK_GENERATION_OUTPUTS.map((image) => ({
      ...image,
      id: `preview-GG-240827-${image.id}`,
    })),
  },
  {
    id: "GG-236814",
    createdAt: "2026-09-07T20:42:00.000Z",
    dateLabel: "昨天",
    time: "20:42",
    prompt: "参考图 1 的服装轮廓与参考图 2 的光影质感，创作一组冷调高级成衣广告，保留自然皮肤纹理与真实面料细节。",
    modelId: "nano-banana-pro",
    aspectRatio: "1:1",
    resolution: "4K",
    count: 2,
    thinkingLevel: "low",
    googleSearch: false,
    quality: "auto",
    background: "auto",
    outputFormat: "png",
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
    createdAt: job.createdAt,
    dateLabel,
    id: job.id,
    images: job.outputs,
    background: job.input.background ?? "auto",
    googleSearch: job.input.googleSearch ?? false,
    modelId: job.input.modelId,
    prompt: job.input.prompt,
    referenceCount: job.input.references.length,
    resolution: job.input.resolution,
    outputFormat: resolveGptImageOptionsForModel(job.input.modelId, job.input).outputFormat,
    quality: job.input.quality ?? "auto",
    thinkingLevel:
      job.input.thinkingLevel ??
      resolveGenerationThinkingLevelForModel(job.input.modelId),
    time: new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      hour12: false,
      minute: "2-digit",
    }).format(createdAt),
  };
}

function newestAssetBatches(batches: readonly AssetBatch[]) {
  return [...batches].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt));
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

function formatMaterialSize(byteSize: number) {
  if (byteSize >= 1024 * 1024) return `${(byteSize / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(byteSize / 1024))} KB`;
}

function perImageCreditAmount(total: string, count: GenerationCount): string {
  try {
    return (BigInt(total) / BigInt(count)).toString();
  } catch {
    return total;
  }
}

function accountIdentityLabel(session: AuthenticationSession) {
  if (session.account.role === "site_owner") return "站长";
  if (session.account.businessRole === "enterprise") return "企业";
  if (session.account.businessRole === "distributor") return "分销商";
  return "个人";
}

export default function Home({
  workspaceId = null,
}: Readonly<{ workspaceId?: string | null }> = {}) {
  const referenceObjectUrlsRef = useRef(new Set<string>());
  const videoReferenceObjectUrlsRef = useRef(new Set<string>());
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
  const latestGenerationRunKeyRef = useRef<string | null>(null);
  const retryingGenerationRunKeysRef = useRef(new Set<string>());
  const downloadingImageKeysRef = useRef(new Set<string>());
  const [generationBoundary] = useState(() =>
    createHttpGenerationBoundary(workspaceId),
  );
  const [authenticationSession, setAuthenticationSession] = useState<AuthenticationSession | null | undefined>(undefined);
  const [authenticationError, setAuthenticationError] = useState<string | null>(null);
  const [accessStatusRefreshing, setAccessStatusRefreshing] = useState(false);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingRevision, setBillingRevision] = useState(0);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceRecord | null>(null);
  const [workspaceResolutionStatus, setWorkspaceResolutionStatus] = useState<
    "loading" | "ready" | "error"
  >(workspaceId ? "loading" : "ready");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<CreationMode>("image");
  const [mixedMediaStylePreview, setMixedMediaStylePreview] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GenerationModelId>(DEFAULT_GENERATION_MODEL_ID);
  const [selectedRatio, setSelectedRatio] = useState<GenerationAspectRatio>("1:1");
  const [resolution, setResolution] = useState<GenerationResolution>("1K");
  const [generationCount, setGenerationCount] = useState<GenerationCount>(1);
  const [thinkingLevel, setThinkingLevel] = useState<GenerationThinkingLevel>("high");
  const [googleSearch, setGoogleSearch] = useState(false);
  const [quality, setQuality] = useState<GptImageQuality>("auto");
  const [background, setBackground] = useState<GptImageBackground>("auto");
  const [outputFormat, setOutputFormat] = useState<GptImageOutputFormat>("png");
  const [prompt, setPrompt] = useState("");
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoReferences, setVideoReferences] = useState<VideoReference[]>([]);
  const [videoGenerationMode, setVideoGenerationMode] = useState<VideoGenerationMode>(DEFAULT_VIDEO_GENERATION_MODE);
  const [videoModelId, setVideoModelId] = useState<VideoGenerationModelId>(DEFAULT_VIDEO_MODEL_ID);
  const [videoProviderLine, setVideoProviderLine] = useState<VideoProviderLine>(DEFAULT_VIDEO_PROVIDER_LINE);
  const [videoAspectRatio, setVideoAspectRatio] = useState<VideoAspectRatio>(DEFAULT_VIDEO_RATIO);
  const [videoResolution, setVideoResolution] = useState<VideoResolution>(DEFAULT_VIDEO_RESOLUTION);
  const [videoDurationSeconds, setVideoDurationSeconds] = useState(DEFAULT_VIDEO_DURATION_SECONDS);
  const [videoGenerateAudio, setVideoGenerateAudio] = useState(true);
  const [videoInterfaceAvailability, setVideoInterfaceAvailability] = useState<LocalVideoPreviewAvailability>("checking");
  const [videoPreviewJob, setVideoPreviewJob] = useState<LocalVideoPreviewJob | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>("create");
  const [generationRuns, setGenerationRuns] = useState<readonly TrackedGenerationRun[]>([]);
  const [creationBatches, setCreationBatches] = useState<AssetBatch[]>([]);
  const [downloadingImageKeys, setDownloadingImageKeys] = useState<readonly string[]>([]);
  const [newAssetCount, setNewAssetCount] = useState(0);
  const [assetPulse, setAssetPulse] = useState(false);
  const [assetBatches, setAssetBatches] = useState<AssetBatch[]>(initialAssetBatches);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [assetsError, setAssetsError] = useState<string | null>(null);
  const [assetMode, setAssetMode] = useState<"batches" | "gallery">("batches");
  const [assetSection, setAssetSection] = useState<"generated" | "materials">("generated");
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [referenceMaterials, setReferenceMaterials] = useState<readonly ReferenceMaterial[]>([]);
  const [referenceMaterialsLoading, setReferenceMaterialsLoading] = useState(true);
  const [referenceMaterialsError, setReferenceMaterialsError] = useState<string | null>(null);
  const [referenceLibraryOpen, setReferenceLibraryOpen] = useState(false);
  const [referenceLibraryTarget, setReferenceLibraryTarget] = useState<CreationMode>("image");
  const [videoAssetMediaFilter, setVideoAssetMediaFilter] = useState<VideoAssetMediaFilter>("all");
  const [selectedReferenceMaterialIds, setSelectedReferenceMaterialIds] = useState<readonly string[]>([]);
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
  const [detailSource, setDetailSource] = useState<DetailSource>("assets");
  const workspaceAccessReady =
    !workspaceId ||
    (workspaceResolutionStatus === "ready" &&
      activeWorkspace?.kind === "organization" &&
      activeWorkspace.membershipStatus === "active" &&
      activeWorkspace.status === "active");
  const handleWorkspaceChange = useCallback((workspace: WorkspaceRecord | null) => {
    setActiveWorkspace(workspace);
    setWorkspaceResolutionStatus("ready");
  }, []);
  const handleWorkspaceError = useCallback(() => {
    setWorkspaceResolutionStatus("error");
  }, []);
  const activeGenerationRuns = getActiveGenerationRuns(generationRuns);
  const failedGenerationRuns = getFailedGenerationRuns(generationRuns);
  const isGenerating = activeGenerationRuns.length > 0;
  const isVideoGenerating = Boolean(videoPreviewJob && !videoPreviewJob.terminal);
  const hasGenerationError = failedGenerationRuns.length > 0;
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
  const latestActiveJob = activeGenerationRuns[0]?.job ?? null;
  const latestActiveInput = latestActiveJob?.input ?? null;
  const latestActiveStage = toGenerationUiStage(latestActiveJob?.state ?? null);
  const latestActiveModel = latestActiveInput
    ? getGenerationModel(latestActiveInput.modelId)
    : null;
  const stageText = activeGenerationRuns.length > 1
    ? `${activeGenerationRuns.length} 个任务正在并行生成`
    : latestActiveStage === "queued"
    ? "任务已提交，正在准备画面"
    : latestActiveStage === "rendering"
      ? `${latestActiveModel?.name ?? "模型"} 正在生成 ${latestActiveInput?.count ?? 1} 张图片`
      : latestActiveStage === "refining"
        ? "正在完成细节与清晰度处理"
          : "根据当前提示词创建的图像";
  const accountEmail = authenticationSession?.user.email ?? null;
  const accountInitials = accountEmail
    ? accountEmail.split("@")[0].slice(0, 2).toUpperCase()
    : "GG";
  const accountIdentity = authenticationSession
    ? accountIdentityLabel(authenticationSession)
    : null;
  const activeBillingQuote = findBillingQuote(billingSummary, {
    count: generationCount,
    modelId: selectedModel,
    resolution,
  });
  const activePerImageCredits = activeBillingQuote
    ? perImageCreditAmount(activeBillingQuote.creditAmount, generationCount)
    : null;
  const displayedAvailableCredits = workspaceId
    ? activeWorkspace?.credit?.budget?.remainingCredits ?? null
    : billingSummary?.account.availableCredits ?? null;
  const composerBillingLabel = billingLoading
    ? "积分读取中"
    : activeBillingQuote
      ? generationCount === 1
        ? `${activePerImageCredits} 积分/张`
        : `${activePerImageCredits} 积分/张 · 共 ${activeBillingQuote.creditAmount}`
      : "当前模型暂未定价";
  const composerBillingDescription = activeBillingQuote && billingSummary
    ? workspaceId
      ? `每张 ${activePerImageCredits} 积分，本批 ${activeBillingQuote.creditAmount} 积分，成员剩余额度 ${activeWorkspace?.credit?.budget?.remainingCredits ?? "--"}，企业可用 ${activeWorkspace?.credit?.account?.availableCredits ?? "--"}`
      : `每张 ${activePerImageCredits} 积分，本批 ${activeBillingQuote.creditAmount} 积分，当前可用 ${billingSummary.account.availableCredits} 积分`
    : composerBillingLabel;
  const trackedGenerationBatchIds = new Set(getSucceededGenerationJobIds(generationRuns));
  const generationItems: CreationStreamItem[] = getGenerationRunSlots(generationRuns).map((slot) => {
    const runRatio = getGenerationRatio(slot.job.input.aspectRatio);
    if (!slot.output) {
      return {
        kind: "skeleton" as const,
        key: slot.key,
        ratio: runRatio.value,
        index: slot.index,
      };
    }
    const batch = generationJobToAssetBatch(slot.job);
    return {
      batch,
      detailKey: `${batch.id}-${slot.output.id}`,
      image: slot.output,
      index: slot.index,
      key: slot.key,
      kind: "image" as const,
      ratio: runRatio.value,
    };
  });
  const creationItems: CreationStreamItem[] = creationBatches.flatMap((batch) => {
      if (trackedGenerationBatchIds.has(batch.id)) return [];
      const batchRatio = getGenerationRatio(batch.aspectRatio);
      return batch.images.map((image, index) => ({
        kind: "image" as const,
        key: `${batch.id}-${image.id}`,
        detailKey: `${batch.id}-${image.id}`,
        ratio: batchRatio.value,
        batch,
        image,
        index,
      }));
    });
  const creationStreamItems = [...generationItems, ...creationItems];
  const currentComposerCheckpoint = createComposerCheckpoint({
    aspectRatio: selectedRatio,
    count: generationCount,
    background,
    googleSearch,
    modelId: selectedModel,
    prompt,
    references: referenceImages,
    resolution,
    outputFormat,
    quality,
    thinkingLevel,
  });
  const hasUnsavedImageChanges = hasMeaningfulUnsavedChanges({
    checkpoint: composerCheckpoint,
    current: currentComposerCheckpoint,
    hasUnprojectedWork: !currentProject && (
      creationBatches.length > 0 || generationRuns.length > 0
    ),
  });
  const hasVideoDraft =
    videoPrompt.trim().length > 0 ||
    videoReferences.length > 0 ||
    videoGenerationMode !== DEFAULT_VIDEO_GENERATION_MODE ||
    videoModelId !== DEFAULT_VIDEO_MODEL_ID ||
    videoProviderLine !== DEFAULT_VIDEO_PROVIDER_LINE ||
    videoAspectRatio !== DEFAULT_VIDEO_RATIO ||
    videoResolution !== DEFAULT_VIDEO_RESOLUTION ||
    videoDurationSeconds !== DEFAULT_VIDEO_DURATION_SECONDS ||
    videoGenerateAudio !== true;
  const hasUnsavedCreationChanges = hasUnsavedImageChanges || hasVideoDraft;
  const currentDraftState: CreationDraftState = {
    aspectRatio: selectedRatio,
    background,
    count: generationCount,
    googleSearch,
    modelId: selectedModel,
    prompt,
    references: referenceImages,
    resolution,
    outputFormat,
    quality,
    thinkingLevel,
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
      background: "auto" as const,
      modelId: DEFAULT_GENERATION_MODEL_ID,
      googleSearch: false,
      prompt: "",
      references: [],
      resolution: "1K" as const,
      outputFormat: "png" as const,
      quality: "auto" as const,
      thinkingLevel: "high" as const,
    };
    const normalizedState = {
      ...state,
      aspectRatio: resolveGenerationAspectRatioForModel(
        state.modelId,
        state.aspectRatio,
      ),
      count: resolveGenerationCountForModel(state.modelId, state.count),
      thinkingLevel: resolveGenerationThinkingLevelForModel(state.modelId),
      googleSearch: resolveGoogleSearchForModel(
        state.modelId,
        state.googleSearch,
      ),
      ...resolveGptImageOptionsForModel(state.modelId, state),
    };
    setPrompt(normalizedState.prompt);
    setReferenceImages(normalizedState.references.map((reference) => ({ ...reference })));
    setSelectedModel(normalizedState.modelId);
    setSelectedRatio(normalizedState.aspectRatio);
    setResolution(normalizedState.resolution);
    setGenerationCount(normalizedState.count);
    setThinkingLevel(normalizedState.thinkingLevel);
    setGoogleSearch(normalizedState.googleSearch);
    setQuality(normalizedState.quality);
    setBackground(normalizedState.background);
    setOutputFormat(normalizedState.outputFormat);
    draftVersionRef.current = draft?.version ?? null;
    draftSyncedCheckpointRef.current = createComposerCheckpoint(normalizedState);
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
    if (!workspaceId) {
      navigateWorkspace(
        { kind: "asset", assetId: nextAssetId },
        { notify: false, replace: true, state: window.history.state },
      );
    }
  }, [detailItems, routeAssetId, workspaceId]);

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
        setActiveView(
          detailNavigation?.source === "creation"
            ? "create"
            : "assets",
        );
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
          : route.kind === "credits"
            ? "credits"
          : route.kind === "distribution"
            ? "distribution"
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
          setMixedMediaStylePreview(url.searchParams.get("media-preview") === "1");
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
    if (!workspaceAccessReady) return;
    let active = true;
    const editRevision = composerEditRevisionRef.current;
    draftBlockedRef.current = false;
    void readCreationDraft(workspaceId)
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
  }, [
    applyCreationDraft,
    authenticationSession,
    draftLoadRevision,
    workspaceAccessReady,
    workspaceId,
  ]);

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
      background,
      count: generationCount,
      googleSearch,
      modelId: selectedModel,
      prompt,
      references: referenceImages.map((reference) => ({ ...reference })),
      resolution,
      outputFormat,
      quality,
      thinkingLevel,
    };
    draftAutosaveTimerRef.current = window.setTimeout(() => {
      draftAutosaveTimerRef.current = null;
      void queueDraftMutation(async () => {
        if (draftBlockedRef.current) return;
        setDraftSyncing(true);
        try {
          if (checkpoint === emptyComposerCheckpoint) {
            if (draftVersionRef.current !== null) {
              await deleteCreationDraft(draftVersionRef.current, workspaceId);
            }
            draftVersionRef.current = null;
          } else {
            const savedDraft = await saveCreationDraft(
              snapshot,
              draftVersionRef.current,
              workspaceId,
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
    background,
    blockDraftSync,
    currentComposerCheckpoint,
    currentProject,
    draftHydrated,
    draftLoading,
    draftSyncRevision,
    generationCount,
    googleSearch,
    outputFormat,
    prompt,
    quality,
    queueDraftMutation,
    referenceImages,
    resolution,
    routeProjectId,
    selectedModel,
    selectedRatio,
    thinkingLevel,
    workspaceId,
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

  useEffect(() => {
    let active = true;
    void readLocalVideoPreviewAvailability().then((available) => {
      if (active) setVideoInterfaceAvailability(available ? "available" : "unavailable");
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => () => {
    referenceObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    referenceObjectUrlsRef.current.clear();
    videoReferenceObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    videoReferenceObjectUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    if (authenticationSession === undefined) return;
    if (authenticationSession === null || authenticationSession.access.status !== "active") return;
    if (authenticationSession.preview) return;
    if (!workspaceAccessReady) return;
    let active = true;
    void listProjects(workspaceId)
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
  }, [authenticationSession, workspaceAccessReady, workspaceId]);

  useEffect(() => {
    if (
      authenticationSession === undefined ||
      authenticationSession === null ||
      authenticationSession.access.status !== "active"
    ) return;
    if (authenticationSession.preview) {
      const resetPreviewMaterials = window.setTimeout(() => {
        setReferenceMaterials([]);
        setReferenceMaterialsError(null);
        setReferenceMaterialsLoading(false);
      }, 0);
      return () => window.clearTimeout(resetPreviewMaterials);
    }
    if (!workspaceAccessReady) return;
    let active = true;
    void listReferenceMaterials(workspaceId)
      .then((materials) => {
        if (!active) return;
        setReferenceMaterials(materials);
        setReferenceMaterialsError(null);
      })
      .catch((error) => {
        if (!active) return;
        setReferenceMaterialsError(
          error instanceof Error ? error.message : "上传素材暂时无法读取，请重试。",
        );
      })
      .finally(() => {
        if (active) setReferenceMaterialsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authenticationSession, workspaceAccessReady, workspaceId]);

  useEffect(() => {
    if (
      authenticationSession === undefined ||
      authenticationSession === null ||
      authenticationSession.access.status !== "active"
    ) return;
    if (authenticationSession.preview) return;
    if (!workspaceAccessReady) return;
    let active = true;
    void listAssets(workspaceId)
      .then((records) => {
        if (!active) return;
        const batches = records.map(generationJobToAssetBatch);
        setAssetBatches(batches);
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
  }, [authenticationSession, workspaceAccessReady, workspaceId]);

  useEffect(() => {
    if (
      !routeAssetId ||
      authenticationSession === undefined ||
      authenticationSession === null ||
      authenticationSession.access.status !== "active" ||
      !workspaceAccessReady
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
    workspaceAccessReady,
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
    if (!workspaceAccessReady) return;
    let active = true;
    const requestId = ++projectRouteRequestRef.current;
    void readProject(routeProjectId, workspaceId)
      .then((restoredProject) => {
        if (!active || requestId !== projectRouteRequestRef.current) return;
        const restoredBatches = projectAssetBatches(restoredProject);
        const restoredState = {
          ...restoredProject.state,
          aspectRatio: resolveGenerationAspectRatioForModel(
            restoredProject.state.modelId,
            restoredProject.state.aspectRatio,
          ),
          count: resolveGenerationCountForModel(
            restoredProject.state.modelId,
            restoredProject.state.count,
          ),
          thinkingLevel: resolveGenerationThinkingLevelForModel(
            restoredProject.state.modelId,
          ),
          googleSearch: resolveGoogleSearchForModel(
            restoredProject.state.modelId,
            restoredProject.state.googleSearch,
          ),
          ...resolveGptImageOptionsForModel(
            restoredProject.state.modelId,
            restoredProject.state,
          ),
        };
        referenceObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        referenceObjectUrlsRef.current.clear();
        loadedProjectIdRef.current = restoredProject.id;
        setCurrentProject({ id: restoredProject.id, name: restoredProject.name });
        setCreationBatches(restoredBatches);
        setPrompt(restoredState.prompt);
        setReferenceImages(restoredState.references.map((reference) => ({ ...reference })));
        setSelectedModel(restoredState.modelId);
        setSelectedRatio(restoredState.aspectRatio);
        setResolution(restoredState.resolution);
        setGenerationCount(restoredState.count);
        setThinkingLevel(restoredState.thinkingLevel);
        setGoogleSearch(restoredState.googleSearch);
        setQuality(restoredState.quality);
        setBackground(restoredState.background);
        setOutputFormat(restoredState.outputFormat);
        setGenerationRuns(restoredProject.batches
          .filter((batch) => batch.state === "failed" && batch.error !== null)
          .map((batch) => Object.freeze({ key: batch.id, job: batch })));
        setComposerCheckpoint(createComposerCheckpoint(restoredState));
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
  }, [
    authenticationSession,
    projectRouteRevision,
    routeProjectId,
    workspaceAccessReady,
    workspaceId,
  ]);

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
          await deleteCreationDraft(expectedVersion, workspaceId);
          draftVersionRef.current = null;
        } else {
          const savedDraft = await saveCreationDraft(
            snapshot,
            expectedVersion,
            workspaceId,
          );
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
        await deleteCreationDraft(expectedVersion, workspaceId);
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
    setSelectedRatio((current) =>
      resolveGenerationAspectRatioForModel(value, current),
    );
    setGenerationCount((current) =>
      resolveGenerationCountForModel(value, current),
    );
    setThinkingLevel(resolveGenerationThinkingLevelForModel(value));
    setGoogleSearch((current) =>
      resolveGoogleSearchForModel(value, current),
    );
    const nextGptOptions = resolveGptImageOptionsForModel(value);
    setQuality(nextGptOptions.quality);
    setBackground(nextGptOptions.background);
    setOutputFormat(nextGptOptions.outputFormat);
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
    if (!isGenerationCountSupported(selectedModel, value)) return;
    composerEditRevisionRef.current += 1;
    setGenerationCount(value);
  };

  const handleGoogleSearchChange = (enabled: boolean) => {
    if (selectedModel !== "nano-banana-2") return;
    composerEditRevisionRef.current += 1;
    setGoogleSearch(enabled);
  };

  const handleQualityChange = (value: GptImageQuality) => {
    if (!isGptImageModelId(selectedModel)) return;
    composerEditRevisionRef.current += 1;
    setQuality(value);
  };

  const handleBackgroundChange = (value: GptImageBackground) => {
    if (!isGptImageModelId(selectedModel)) return;
    composerEditRevisionRef.current += 1;
    setBackground(value);
    if (value === "transparent" && outputFormat === "jpeg") {
      setOutputFormat("png");
    }
  };

  const handleOutputFormatChange = (value: GptImageOutputFormat) => {
    if (
      !isGptImageModelId(selectedModel) ||
      (background === "transparent" && value === "jpeg")
    ) return;
    composerEditRevisionRef.current += 1;
    setOutputFormat(value);
  };

  const handleCreationModeChange = (mode: CreationMode) => {
    setCreationMode(mode);
  };

  const handleVideoModelChange = (modelId: VideoGenerationModelId) => {
    const capacityError = videoReferenceCapacityError(
      modelId,
      videoReferences,
      videoGenerationMode,
    );
    if (capacityError) {
      toast.error(capacityError);
      return;
    }
    const nextResolution = resolveVideoResolution(modelId, videoResolution);
    const nextDuration = resolveVideoDuration(modelId, videoDurationSeconds);
    if (nextResolution !== videoResolution) {
      toast.info(`${getVideoGenerationModel(modelId).name} 已将清晰度调整为 ${nextResolution}`);
    } else if (nextDuration !== videoDurationSeconds) {
      toast.info(`${getVideoGenerationModel(modelId).name} 最长支持 ${nextDuration} 秒`);
    }
    setVideoModelId(modelId);
    setVideoResolution(nextResolution);
    setVideoDurationSeconds(nextDuration);
  };

  const handleVideoGenerationModeChange = (generationMode: VideoGenerationMode) => {
    const capacityError = videoReferenceCapacityError(
      videoModelId,
      videoReferences,
      generationMode,
    );
    if (capacityError) {
      toast.error(`${capacityError}，请先移除不兼容的素材`);
      return;
    }
    setVideoReferences((current) => [
      ...normalizeVideoReferencesForMode(current, generationMode),
    ]);
    setVideoGenerationMode(generationMode);
  };

  const handleVideoReferenceFiles = (files: readonly File[]) => {
    if (!files.length) return;
    const nextReferences = [...videoReferences];
    let rejectedCount = 0;
    for (const file of files) {
      const mediaType = videoReferenceMediaTypeForFile(file);
      if (!mediaType) {
        rejectedCount += 1;
        toast.error(`${file.name} 的文件格式不受支持`);
        continue;
      }
      const fileError = videoReferenceFileError(file, mediaType);
      if (fileError) {
        rejectedCount += 1;
        toast.error(fileError);
        continue;
      }
      const role: VideoReferenceRole = mediaType === "image"
        ? videoGenerationMode === "multimodal"
          ? "reference_image"
          : nextReferences.some((reference) => reference.mediaType === "image")
            ? "last_frame"
            : "first_frame"
        : mediaType === "video"
          ? "reference_video"
          : "reference_audio";
      const candidate: VideoReference = {
        id: `video_ref_${globalThis.crypto.randomUUID()}`,
        mediaType,
        name: file.name,
        role,
        size: file.size,
        url: "",
      };
      const capacityError = videoReferenceCapacityError(
        videoModelId,
        [...nextReferences, candidate],
        videoGenerationMode,
      );
      if (capacityError) {
        rejectedCount += 1;
        toast.info(capacityError);
        continue;
      }
      const url = URL.createObjectURL(file);
      videoReferenceObjectUrlsRef.current.add(url);
      nextReferences.push({ ...candidate, url });
    }
    if (nextReferences.length !== videoReferences.length) {
      setVideoReferences([...normalizeVideoReferencesForMode(
        nextReferences,
        videoGenerationMode,
      )]);
    }
    if (rejectedCount === 0) {
      toast.success(`已添加 ${files.length} 个参考素材`);
    }
  };

  const removeVideoReference = (reference: VideoReference) => {
    if (videoReferenceObjectUrlsRef.current.delete(reference.url)) {
      URL.revokeObjectURL(reference.url);
    }
    setVideoReferences((current) => [
      ...normalizeVideoReferencesForMode(
        current.filter((item) => item.id !== reference.id),
        videoGenerationMode,
      ),
    ]);
  };

  const handleVideoGenerate = async () => {
    if (!videoPrompt.trim()) {
      toast.error("请先输入视频描述");
      return;
    }
    if (videoInterfaceAvailability !== "available") {
      toast.info("本地视频实测接口未启用，当前提示词、素材与参数已保留");
      return;
    }
    if (videoReferences.length > 0) {
      toast.info("本次页面实测先支持文生视频；请移除素材后提交，素材仍保留在当前会话中");
      return;
    }
    if (isVideoGenerating) return;

    const localTaskId = `local_${globalThis.crypto.randomUUID()}`;
    setVideoPreviewJob({
      taskId: localTaskId,
      status: "submitting",
      progress: 0,
      resultUrl: null,
      error: null,
      terminal: false,
    });
    try {
      const result = await submitLocalVideoPreview({
        prompt: videoPrompt.trim(),
        generationMode: videoGenerationMode,
        modelId: videoModelId,
        line: videoProviderLine,
        ratio: videoAspectRatio,
        resolution: videoResolution,
        duration: videoDurationSeconds,
        generateAudio: videoGenerateAudio,
        references: [],
      }, setVideoPreviewJob);
      if (result.status === "completed" && result.resultUrl) {
        toast.success("视频已生成，可在当前页面播放或下载");
      } else if (result.status === "failed") {
        toast.error(result.error ?? "视频生成失败，输入与参数已保留");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "本地视频实测接口暂时不可用。";
      setVideoPreviewJob({
        taskId: localTaskId,
        status: "failed",
        progress: null,
        resultUrl: null,
        error: message,
        terminal: true,
      });
      toast.error(message);
    }
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
      workspaceId,
    ).then((results) => {
      const readyCount = results.filter(
        (result) => result.reference.status === "ready",
      ).length;
      if (readyCount > 0) void reloadReferenceMaterials();
      if (readyCount === results.length) {
        toast.success(`已上传 ${readyCount} 张参考图`);
      } else if (readyCount > 0) {
        toast.warning(`${readyCount} 张上传完成，${results.length - readyCount} 张失败`);
      } else {
        toast.error("参考图上传失败，请移除失败项后重试");
      }
    });
  };

  const reloadReferenceMaterials = async () => {
    if (!authenticationSession || authenticationSession.access.status !== "active") return;
    if (authenticationSession.preview) {
      setReferenceMaterials([]);
      setReferenceMaterialsError(null);
      setReferenceMaterialsLoading(false);
      return;
    }
    setReferenceMaterialsLoading(true);
    try {
      setReferenceMaterials(await listReferenceMaterials(workspaceId));
      setReferenceMaterialsError(null);
    } catch (error) {
      setReferenceMaterialsError(
        error instanceof Error ? error.message : "上传素材暂时无法读取，请重试。",
      );
    } finally {
      setReferenceMaterialsLoading(false);
    }
  };

  const handleSaveReferenceEdit = async (
    source: GenerationReference,
    file: File,
  ) => {
    const sourceIndex = referenceImages.findIndex((item) => item.id === source.id);
    if (sourceIndex < 0) throw new Error("这张参考图已不在当前创作中。");

    const clientId = globalThis.crypto.randomUUID();
    const [result] = await uploadReferenceFiles(
      [{ clientId, file }],
      () => {},
      workspaceId,
    );
    if (!result || result.reference.status !== "ready") {
      throw new Error(
        result?.reference.errorMessage ?? "编辑后的素材上传失败，请重试。",
      );
    }

    const nextReferences = referenceImages.map((item) =>
      item.id === source.id ? result.reference : item
    );
    if (currentProject) {
      const savedProject = await saveProject({
        batchIds: [...new Set([
          ...creationBatches.map((batch) => batch.id),
          ...getPersistentGenerationJobIds(generationRuns),
        ])],
        name: currentProject.name,
        projectId: currentProject.id,
        state: {
          aspectRatio: selectedRatio,
          background,
          count: generationCount,
          googleSearch,
          modelId: selectedModel,
          prompt,
          references: nextReferences.filter((reference) => reference.status === "ready"),
          resolution,
          outputFormat,
          quality,
          thinkingLevel,
        },
      }, workspaceId);
      setProjects((current) => [
        savedProject,
        ...current.filter((project) => project.id !== savedProject.id),
      ]);
      setComposerCheckpoint(createComposerCheckpoint(savedProject.state));
    }

    const previewUrl = URL.createObjectURL(file);
    composerEditRevisionRef.current += 1;
    referenceObjectUrlsRef.current.add(previewUrl);
    if (referenceObjectUrlsRef.current.delete(source.url)) {
      URL.revokeObjectURL(source.url);
    }
    setReferenceImages((current) => current.map((item) =>
      item.id === source.id
        ? { ...result.reference, url: previewUrl }
        : item
    ));
    await reloadReferenceMaterials();
    toast.success(`编辑结果已保存为新素材，并替换图 ${sourceIndex + 1}`);
  };

  const addMaterialsToReferences = (materials: readonly ReferenceMaterial[]) => {
    const result = appendReferenceMaterials(
      referenceImages,
      materials,
      MAX_GENERATION_REFERENCES,
    );
    if (result.addedCount > 0) {
      composerEditRevisionRef.current += 1;
      setReferenceImages([...result.references]);
    }
    if (result.overflowCount > 0) {
      toast.info(`参考图最多 ${MAX_GENERATION_REFERENCES} 张`);
    } else if (result.duplicateCount > 0 && result.addedCount === 0) {
      toast.info("所选素材已在参考图中");
    }
    return result.addedCount;
  };

  const videoAssetMaterials = [
    ...assetBatches.flatMap((batch) => batch.images.map((image, index): VideoAssetMaterial => ({
      id: image.id,
      mediaType: "image",
      name: `生成图片 ${batch.id} · ${index + 1}`,
      size: 0,
      source: "generated",
      url: image.previewUrl,
      width: image.width,
      height: image.height,
    }))),
    ...referenceMaterials.map((material): VideoAssetMaterial => ({
      id: material.id,
      mediaType: "image",
      name: material.name,
      size: material.byteSize,
      source: "uploaded",
      url: material.url,
      width: material.width,
      height: material.height,
    })),
  ].filter((material, index, materials) =>
    materials.findIndex((candidate) => candidate.id === material.id) === index
  );
  const activeVideoReferenceLimits = getVideoReferenceLimits(
    videoModelId,
    videoGenerationMode,
  );
  const modeCompatibleVideoAssetMaterials = videoAssetMaterials.filter((material) =>
    material.mediaType === "image"
      ? activeVideoReferenceLimits.imageLimit > 0
      : material.mediaType === "video"
        ? activeVideoReferenceLimits.videoLimit > 0
        : activeVideoReferenceLimits.audioLimit > 0
  );
  const filteredVideoAssetMaterials = videoAssetMediaFilter === "all"
    ? modeCompatibleVideoAssetMaterials
    : modeCompatibleVideoAssetMaterials.filter((material) => material.mediaType === videoAssetMediaFilter);
  const imageReferenceLibraryMaterials = referenceMaterials.map((material): VideoAssetMaterial => ({
    id: material.id,
    mediaType: "image",
    name: material.name,
    size: material.byteSize,
    source: "uploaded",
    url: material.url,
    width: material.width,
    height: material.height,
  }));
  const activeReferenceLibraryMaterials = referenceLibraryTarget === "video"
    ? filteredVideoAssetMaterials
    : imageReferenceLibraryMaterials;
  const activeReferenceLibraryLoading = referenceLibraryTarget === "video"
    ? videoAssetMaterials.length === 0 && (assetsLoading || referenceMaterialsLoading)
    : referenceMaterialsLoading;
  const activeReferenceLibraryError = referenceLibraryTarget === "video"
    ? videoAssetMaterials.length === 0 ? assetsError ?? referenceMaterialsError : null
    : referenceMaterialsError;
  const videoAssetMediaCounts = {
    image: videoAssetMaterials.filter((material) => material.mediaType === "image").length,
    video: videoAssetMaterials.filter((material) => material.mediaType === "video").length,
    audio: videoAssetMaterials.filter((material) => material.mediaType === "audio").length,
  };
  const videoAssetTotalRemaining = Math.max(
    0,
    activeVideoReferenceLimits.totalLimit - videoReferences.length,
  );
  const videoAssetMediaRemaining = (mediaType: VideoReferenceMediaType) => {
    const typeLimit = mediaType === "image"
      ? activeVideoReferenceLimits.imageLimit
      : mediaType === "video"
        ? activeVideoReferenceLimits.videoLimit
        : activeVideoReferenceLimits.audioLimit;
    return Math.max(
      0,
      Math.min(
        typeLimit - countVideoReferences(videoReferences, mediaType),
        videoAssetTotalRemaining,
      ),
    );
  };
  const referenceLibraryRemaining = referenceLibraryTarget === "video"
    ? videoAssetMediaFilter === "all"
      ? videoAssetTotalRemaining
      : videoAssetMediaRemaining(videoAssetMediaFilter)
    : Math.max(0, MAX_GENERATION_REFERENCES - referenceImages.length);

  const addMaterialsToVideoReferences = (materials: readonly VideoAssetMaterial[]) => {
    const result = appendVideoAssetMaterials(
      videoReferences,
      materials,
      videoModelId,
      videoGenerationMode,
    );
    if (result.addedCount > 0) setVideoReferences([...result.references]);
    if (result.firstCapacityError) {
      toast.info(result.firstCapacityError);
    } else if (result.duplicateCount > 0 && result.addedCount === 0) {
      toast.info("所选素材已在视频参考素材中");
    }
    return result.addedCount;
  };

  const openReferenceLibrary = (target: CreationMode) => {
    const available = target === "video"
      ? videoAssetTotalRemaining
      : MAX_GENERATION_REFERENCES - referenceImages.length;
    if (available <= 0) {
      toast.info(target === "video"
        ? `${getVideoGenerationModel(videoModelId).name} 的参考素材已达到上限`
        : `最多可添加 ${MAX_GENERATION_REFERENCES} 张参考图`);
      return;
    }
    setReferenceLibraryTarget(target);
    setVideoAssetMediaFilter("all");
    setSelectedReferenceMaterialIds([]);
    setReferenceLibraryOpen(true);
    void reloadReferenceMaterials();
    if (target === "video") void reloadAssets();
  };

  const toggleReferenceMaterial = (materialId: string) => {
    const alreadyUsed = referenceLibraryTarget === "video"
      ? videoReferences.some((reference) => reference.id === materialId)
      : referenceImages.some((reference) => reference.id === materialId);
    if (alreadyUsed) return;
    setSelectedReferenceMaterialIds((current) => {
      if (current.includes(materialId)) {
        return current.filter((id) => id !== materialId);
      }
      if (referenceLibraryTarget === "video") {
        const material = videoAssetMaterials.find((item) => item.id === materialId);
        if (!material) return current;
        const selected = current
          .map((id) => videoAssetMaterials.find((item) => item.id === id))
          .filter((item): item is VideoAssetMaterial => Boolean(item));
        const result = appendVideoAssetMaterials(
          videoReferences,
          [...selected, material],
          videoModelId,
          videoGenerationMode,
        );
        if (result.addedCount !== selected.length + 1) {
          if (result.firstCapacityError) toast.info(result.firstCapacityError);
          return current;
        }
        return [...current, materialId];
      }
      if (current.length >= referenceLibraryRemaining) {
        toast.info(`本次最多还能添加 ${referenceLibraryRemaining} 张图片素材`);
        return current;
      }
      return [...current, materialId];
    });
  };

  const confirmReferenceMaterials = () => {
    const addedCount = referenceLibraryTarget === "video"
      ? addMaterialsToVideoReferences(
          selectedReferenceMaterialIds
            .map((id) => videoAssetMaterials.find((material) => material.id === id))
            .filter((material): material is VideoAssetMaterial => Boolean(material)),
        )
      : addMaterialsToReferences(
          selectedReferenceMaterialIds
            .map((id) => referenceMaterials.find((material) => material.id === id))
            .filter((material): material is ReferenceMaterial => Boolean(material)),
        );
    if (addedCount > 0) toast.success(`已添加 ${addedCount} 个素材`);
    setReferenceLibraryOpen(false);
    setSelectedReferenceMaterialIds([]);
  };

  const handleUseReferenceMaterial = (material: ReferenceMaterial) => {
    const addedCount = addMaterialsToReferences([material]);
    if (addedCount === 0) return;
    toast.success("素材已加入参考图");
    if (!workspaceId) {
      navigateWorkspace(currentProject
        ? { kind: "project", projectId: currentProject.id }
        : { kind: "create" });
    }
    setActiveView("create");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeReference = (image: ReferenceImage) => {
    composerEditRevisionRef.current += 1;
    if (referenceObjectUrlsRef.current.delete(image.url)) {
      URL.revokeObjectURL(image.url);
    }
    setReferenceImages((current) => current.filter((item) => item.id !== image.id));
  };

  const reorderReference = (sourceId: string, targetId: string) => {
    composerEditRevisionRef.current += 1;
    setReferenceImages((current) => [...reorderReferences(current, sourceId, targetId)]);
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

  const handleAuthenticationComplete = async () => {
    const session = await readAuthenticationSession();
    if (!session) throw new Error("登录状态尚未建立，请重新输入验证码。");
    setAuthenticationSession(session);
    setAuthenticationError(null);
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
      const batches = (await listAssets(workspaceId)).map(generationJobToAssetBatch);
      setAssetBatches(batches);
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
    if (!workspaceId) navigateWorkspace({ kind: "assets" });
    setActiveView("assets");
    void reloadAssets();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCreateNav = () => {
    if (!workspaceId) {
      navigateWorkspace(currentProject
        ? { kind: "project", projectId: currentProject.id }
        : { kind: "create" });
    }
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
      setProjects([...(await listProjects(workspaceId))]);
    } catch (error) {
      setProjectsError(error instanceof Error ? error.message : "项目列表暂时不可用，请重试。");
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleProjectsNav = () => {
    if (!workspaceId) navigateWorkspace({ kind: "projects" });
    setActiveView("projects");
    void reloadProjects();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCreditsNav = () => {
    navigateWorkspace({ kind: "credits" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDistributionNav = () => {
    navigateWorkspace({ kind: "distribution" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCreditAccountChange = useCallback((account: BillingSummary["account"]) => {
    setBillingSummary((current) => current ? { ...current, account } : current);
  }, []);

  const startNewCreation = () => {
    composerEditRevisionRef.current += 1;
    clearPersistedCreationDraft();
    referenceObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    referenceObjectUrlsRef.current.clear();
    videoReferenceObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    videoReferenceObjectUrlsRef.current.clear();
    loadedProjectIdRef.current = null;
    setReferenceImages([]);
    setPrompt("");
    setVideoReferences([]);
    setVideoPrompt("");
    setVideoGenerationMode(DEFAULT_VIDEO_GENERATION_MODE);
    setVideoModelId(DEFAULT_VIDEO_MODEL_ID);
    setVideoProviderLine(DEFAULT_VIDEO_PROVIDER_LINE);
    setVideoAspectRatio(DEFAULT_VIDEO_RATIO);
    setVideoResolution(DEFAULT_VIDEO_RESOLUTION);
    setVideoDurationSeconds(DEFAULT_VIDEO_DURATION_SECONDS);
    setVideoGenerateAudio(true);
    setCreationMode("image");
    setCreationBatches([]);
    setCurrentProject(null);
    setGenerationRuns([]);
    latestGenerationRunKeyRef.current = null;
    retryingGenerationRunKeysRef.current.clear();
    setDrawerOpen(false);
    setProjectSaveError(null);
    setProjectCreateKey(null);
    setComposerCheckpoint(emptyComposerCheckpoint);
    setDestructiveCreationIntent(null);
    if (!workspaceId) navigateWorkspace({ kind: "create" });
    setRouteProjectId(null);
    setProjectRestoringId(null);
    setRouteAssetId(null);
    setDetailOpen(false);
    setActiveView("create");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const continueProjectRestore = (projectId: string) => {
    projectRestoreAnnouncementRef.current = true;
    if (workspaceId) {
      projectRouteRequestRef.current += 1;
      setProjectRouteError(null);
      setRouteAssetId(null);
      setDetailOpen(false);
      setRouteProjectId(projectId);
      setProjectRestoringId(projectId);
      setProjectRouteRevision((current) => current + 1);
      setActiveView("create");
      return;
    }
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
      if (!workspaceId) {
        navigateWorkspace({ kind: "project", projectId: project.id });
      }
      setActiveView("create");
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
      ...getPersistentGenerationJobIds(generationRuns),
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
          background,
          count: generationCount,
          googleSearch,
          modelId: selectedModel,
          prompt,
          references: referenceImages.filter((reference) => reference.status === "ready"),
          resolution,
          outputFormat,
          quality,
          thinkingLevel,
        },
      }, workspaceId);
      setProjects((current) => [savedProject, ...current.filter((project) => project.id !== savedProject.id)]);
      loadedProjectIdRef.current = savedProject.id;
      setCurrentProject({ id: savedProject.id, name: savedProject.name });
      setComposerCheckpoint(createComposerCheckpoint(savedProject.state));
      if (!workspaceId) {
        navigateWorkspace(
          { kind: "project", projectId: savedProject.id },
          { notify: false, replace: true },
        );
      }
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

  const recordCompletedGeneration = (
    completedJob: GenerationJob,
    runKey: string,
  ) => {
    const completedInput = completedJob.input;
    const createdAt = new Date(completedJob.createdAt);
    const nextBatch: AssetBatch = {
      id: completedJob.id,
      createdAt: completedJob.createdAt,
      dateLabel: "今天",
      time: new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(createdAt),
      prompt: completedInput.prompt,
      modelId: completedInput.modelId,
      aspectRatio: completedInput.aspectRatio,
      resolution: completedInput.resolution,
      count: completedInput.count,
      background: completedInput.background ?? "auto",
      googleSearch: completedInput.googleSearch ?? false,
      referenceCount: completedInput.references.length,
      outputFormat: resolveGptImageOptionsForModel(
        completedInput.modelId,
        completedInput,
      ).outputFormat,
      quality: completedInput.quality ?? "auto",
      thinkingLevel:
        completedInput.thinkingLevel ??
        resolveGenerationThinkingLevelForModel(completedInput.modelId),
      images: completedJob.outputs,
    };
    setCreationBatches((current) => {
      const nextBatches = newestAssetBatches([
        nextBatch,
        ...current.filter((batch) => batch.id !== nextBatch.id),
      ]);
      if (currentProject) {
        const isLatestSubmission = latestGenerationRunKeyRef.current === runKey;
        setProjects((currentProjects) => currentProjects.map((project) => project.id === currentProject.id
          ? {
              ...project,
              batches: [
                completedJob,
                ...project.batches.filter((batch) => batch.id !== completedJob.id),
              ].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
              state: isLatestSubmission
                ? {
                    aspectRatio: completedInput.aspectRatio,
                    background: completedInput.background ?? "auto",
                    count: completedInput.count,
                    googleSearch: completedInput.googleSearch ?? false,
                    modelId: completedInput.modelId,
                    prompt: completedInput.prompt,
                    references: completedInput.references,
                    resolution: completedInput.resolution,
                    outputFormat: resolveGptImageOptionsForModel(
                      completedInput.modelId,
                      completedInput,
                    ).outputFormat,
                    quality: completedInput.quality ?? "auto",
                    thinkingLevel:
                      completedInput.thinkingLevel ??
                      resolveGenerationThinkingLevelForModel(
                        completedInput.modelId,
                      ),
                  }
                : project.state,
              updatedAt: completedJob.updatedAt,
            }
          : project));
      }
      return nextBatches;
    });
    setAssetBatches((current) => newestAssetBatches([
      nextBatch,
      ...current.filter((batch) => batch.id !== nextBatch.id),
    ]));
    setNewAssetCount(completedJob.outputs.length);
    setAssetPulse(true);
    if (assetPulseTimerRef.current) window.clearTimeout(assetPulseTimerRef.current);
    assetPulseTimerRef.current = window.setTimeout(() => setAssetPulse(false), 4200);
  };

  const observeGenerationJob = (runKey: string, job: GenerationJob) => {
    setGenerationRuns((current) => upsertGenerationRun(current, runKey, job));
    if (
      !job.id.startsWith("pending_") &&
      (job.state === "queued" || !isGenerationJobActive(job.state))
    ) {
      setBillingRevision((current) => current + 1);
    }
    if (
      currentProject &&
      latestGenerationRunKeyRef.current === runKey &&
      !job.id.startsWith("pending_")
    ) {
      setComposerCheckpoint(createComposerCheckpoint(job.input));
    }
  };

  const runGeneration = async (
    snapshot: GenerationInputSnapshot,
    runKey = globalThis.crypto.randomUUID(),
  ) => {
    latestGenerationRunKeyRef.current = runKey;
    setDrawerOpen(false);
    const terminalJob = await generationBoundary.service.submit(
      snapshot,
      (job) => observeGenerationJob(runKey, job),
    );
    if (terminalJob.state === "succeeded") {
      setGenerationRuns((current) => upsertGenerationRun(current, runKey, terminalJob));
      recordCompletedGeneration(terminalJob, runKey);
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
      !(selectedModel === "nano-banana-2" || isGptImageModelId(selectedModel)) ||
      !isGenerationCountSupported(selectedModel, generationCount)
    ) {
      toast.error("Nano Banana 2 和 GPT IMAGE 系列当前支持 1、2、4 张");
      return;
    }

    const snapshot = createGenerationInputSnapshot({
      prompt,
      references: referenceImages,
      modelId: selectedModel,
      aspectRatio: selectedRatio,
      resolution,
      count: generationCount,
      background,
      thinkingLevel,
      googleSearch,
      outputFormat,
      quality,
      projectId: currentProject?.id ?? null,
    });
    void runGeneration(snapshot);
  };

  const retryFailedGeneration = async (run: TrackedGenerationRun) => {
    if (
      run.job.state !== "failed" ||
      retryingGenerationRunKeysRef.current.has(run.key)
    ) return;
    retryingGenerationRunKeysRef.current.add(run.key);
    latestGenerationRunKeyRef.current = run.key;
    try {
      if (run.job.id.startsWith("pending_")) {
        await runGeneration(run.job.input, run.key);
        return;
      }
      setDrawerOpen(false);
      const terminalJob = await generationBoundary.retry(
        run.job,
        (job) => observeGenerationJob(run.key, job),
      );
      if (terminalJob.state === "succeeded") {
        setGenerationRuns((current) => upsertGenerationRun(current, run.key, terminalJob));
        recordCompletedGeneration(terminalJob, run.key);
      }
    } finally {
      retryingGenerationRunKeysRef.current.delete(run.key);
    }
  };

  const restoreFailedGenerationSettings = (snapshot: GenerationInputSnapshot) => {
    const restored = restoreGenerationInputSnapshot(snapshot);
    const restoredAspectRatio = resolveGenerationAspectRatioForModel(
      restored.modelId,
      restored.aspectRatio,
    );
    const restoredCount = resolveGenerationCountForModel(
      restored.modelId,
      restored.count,
    );
    setPrompt(restored.prompt);
    setReferenceImages(restored.references);
    setSelectedModel(restored.modelId);
    setSelectedRatio(restoredAspectRatio);
    setResolution(restored.resolution);
    setGenerationCount(restoredCount);
    setThinkingLevel(resolveGenerationThinkingLevelForModel(restored.modelId));
    setGoogleSearch(resolveGoogleSearchForModel(
      restored.modelId,
      restored.googleSearch,
    ));
    const restoredGptOptions = resolveGptImageOptionsForModel(
      restored.modelId,
      restored,
    );
    setQuality(restoredGptOptions.quality);
    setBackground(restoredGptOptions.background);
    setOutputFormat(restoredGptOptions.outputFormat);
    setDrawerOpen(true);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    toast.success("已恢复失败任务的原始提示词、参考图与参数");
  };

  const downloadImage = async (batch: AssetBatch, image: GenerationOutput, index: number) => {
    const imageKey = `${batch.id}-${image.id}`;
    if (downloadingImageKeysRef.current.has(imageKey)) return;
    const saveRequest = saveImageToLocal(
      {
        assetId: image.id,
        createdAt: batch.createdAt,
        ordinal: index + 1,
        previewUrl: image.previewUrl,
      },
      {
        resolveDownloadUrl: (assetId) =>
          readAssetDownloadUrl(assetId, workspaceId),
      },
    );
    downloadingImageKeysRef.current.add(imageKey);
    setDownloadingImageKeys((current) => [...current, imageKey]);
    try {
      await saveRequest;
      toast.success("图片下载已开始");
    } catch (error) {
      console.error("[GoodGood] image download failed", {
        assetId: image.id,
        message: error instanceof Error ? error.message : String(error),
        stage: error instanceof ImageDownloadError ? error.stage : "unknown",
      });
      toast.error("下载失败，请重试");
    } finally {
      downloadingImageKeysRef.current.delete(imageKey);
      setDownloadingImageKeys((current) => current.filter((key) => key !== imageKey));
    }
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
    setDetailSource(source);
    setRouteAssetId(nextDetail.image.id);
    if (!workspaceId) {
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
    }
  };

  const closeImageDetail = () => {
    setDetailOpen(false);
    if (workspaceId) {
      setRouteAssetId(null);
      setActiveView(detailSource === "creation" ? "create" : "assets");
      return;
    }
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

    const itemModel = getGenerationModel(item.batch.modelId);
    const itemDimensions = item.image.width && item.image.height
      ? { width: item.image.width, height: item.image.height }
      : getGenerationPixelDimensions(
          item.batch.modelId,
          item.batch.aspectRatio,
          item.batch.resolution,
        );
    const isDownloading = downloadingImageKeys.includes(`${item.batch.id}-${item.image.id}`);
    return (
      <article
        className="creation-card"
        key={item.key}
        style={{ aspectRatio: `${item.ratio}`, "--reveal-delay": `${item.index * 70}ms` } as CSSProperties}
        role="button"
        tabIndex={0}
        aria-label={`查看 ${itemModel.name} 生成的视觉作品 ${item.index + 1}`}
        onClick={() => openImageDetail(creationDetailItems, item.detailKey, "creation")}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openImageDetail(creationDetailItems, item.detailKey, "creation");
          }
        }}
      >
        <PrivateObjectImage
          src={item.image.previewUrl}
          alt={`${itemModel.name} 生成的视觉作品 ${item.index + 1}`}
          style={{ objectPosition: item.image.previewPosition }}
        />
        <span className="creation-card-meta">{formatPixelDimensions(itemDimensions)}</span>
        <div className="image-actions">
          <button className="download-button" disabled={isDownloading} aria-label={isDownloading ? "正在下载图片" : "下载到本地"} onClick={(event) => { event.stopPropagation(); void downloadImage(item.batch, item.image, item.index); }}>{isDownloading ? <LoaderCircle className="download-spinner" size={15} /> : <Download size={15} />}</button>
        </div>
      </article>
    );
  };

  const renderCreationColumns = (items: CreationStreamItem[], columnCount: number) => Array.from({ length: columnCount }, (_, columnIndex) => (
    <div className="creation-column" key={`creation-column-${columnCount}-${columnIndex}`}>
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
        className={isSelected ? "asset-gallery-card selected" : "asset-gallery-card"}
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
        <span className="asset-gallery-caption"><strong>{formatGenerationResolution(item.batch.resolution, item.image)}</strong><small>{itemRatio.label} · {item.batch.time} · {itemModel.name}</small></span>
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

  const renderReferenceMaterialCard = (material: ReferenceMaterial) => {
    const alreadyUsed = referenceImages.some((reference) => reference.id === material.id);
    return (
      <article className="reference-material-card" key={material.id}>
        <div className="reference-material-image" style={{ aspectRatio: `${material.width} / ${material.height}` }}>
          <PrivateObjectImage src={material.url} alt={material.name} />
        </div>
        <div className="reference-material-copy">
          <strong title={material.name}>{material.name}</strong>
          <span>{material.width} × {material.height} · {formatMaterialSize(material.byteSize)}</span>
          <small>{formatProjectUpdated(material.uploadedAt)}</small>
        </div>
        <button
          className="reference-material-use"
          disabled={alreadyUsed || referenceImages.length >= MAX_GENERATION_REFERENCES}
          onClick={() => handleUseReferenceMaterial(material)}
        >
          {alreadyUsed ? <><Check size={14} />已在创作中</> : <><Plus size={14} />用于创作</>}
        </button>
      </article>
    );
  };

  const renderReferenceMaterialColumns = (columnCount: number) =>
    Array.from({ length: columnCount }, (_, columnIndex) => (
      <div className="reference-material-column" key={`reference-material-column-${columnCount}-${columnIndex}`}>
        {referenceMaterials
          .filter((_, materialIndex) => materialIndex % columnCount === columnIndex)
          .map(renderReferenceMaterialCard)}
      </div>
    ));

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand" role="img" aria-label="GoodGood">
          <Image className="brand-mark" src="/goodgood-mark.svg" alt="" width={29} height={22} />
          <Image className="wordmark-image sidebar-wordmark" src="/goodgood-wordmark.svg" alt="" width={89} height={20} />
        </div>

        <WorkspaceSwitcher
          activeWorkspaceId={workspaceId}
          enabled={Boolean(
            authenticationSession &&
              !authenticationSession.preview &&
              authenticationSession.access.status === "active",
          )}
          onWorkspaceChange={handleWorkspaceChange}
          onWorkspaceError={handleWorkspaceError}
        />

        <nav className="side-nav" aria-label="主导航">
          <button className={`side-nav-item ${activeView === "create" ? "active" : ""}`} onClick={handleCreateNav}><Brush size={17} strokeWidth={1.8} /><span>创作</span></button>
          <button className="side-nav-item"><Compass size={17} /><span>探索</span></button>
          <button className={`side-nav-item ${activeView === "projects" ? "active" : ""}`} onClick={handleProjectsNav}><FolderOpen size={17} /><span>项目</span></button>
          <button className={`side-nav-item asset-nav ${activeView === "assets" ? "active" : ""} ${assetPulse ? "has-new-assets" : ""}`} onClick={handleAssetNav}>
            <Images size={17} /><span>资产库</span>
            {newAssetCount > 0 && <em className="asset-new-count">+{newAssetCount}</em>}
          </button>
          {authenticationSession?.account.businessRole && (
            <button
              className={`side-nav-item ${activeView === "distribution" ? "active" : ""}`}
              onClick={handleDistributionNav}
            >
              <Network size={17} /><span>积分分配</span>
            </button>
          )}
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
          {authenticationSession?.access.status === "active" && (
            <button
              className={`side-nav-item ${activeView === "credits" ? "active" : ""}`}
              onClick={handleCreditsNav}
            >
              <Coins size={17} /><span>积分记录</span>
            </button>
          )}
          {authenticationSession && accountIdentity ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="account-card"
                  type="button"
                  aria-label={`打开 ${accountEmail ?? "GoodGood 用户"} 的账户菜单`}
                >
                  <span className="avatar">{accountInitials}</span>
                  <strong className="account-card-username">{accountEmail ?? "GoodGood 用户"}</strong>
                  <MoreHorizontal className="account-card-more" aria-hidden="true" size={17} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="account-menu"
                collisionPadding={12}
                side="right"
                sideOffset={10}
              >
                <div className="account-menu-details" role="group" aria-label="账户信息">
                  <div className="account-menu-detail">
                    <UserRoundCog aria-hidden="true" size={17} />
                    <span>身份</span>
                    <strong>{accountIdentity}</strong>
                  </div>
                  <div className="account-menu-detail">
                    <CircleDot aria-hidden="true" size={17} />
                    <span>{workspaceId ? "企业剩余额度" : "积分余额"}</span>
                    <strong
                      aria-label={billingSummary ? `${workspaceId ? "企业剩余额度" : "积分余额"} ${displayedAvailableCredits ?? "--"}` : undefined}
                      aria-live="polite"
                      className={billingSummary ? "account-menu-credit" : ""}
                      role="status"
                    >
                      {billingLoading
                        ? "读取中"
                        : billingError
                          ? "暂不可用"
                          : displayedAvailableCredits ?? "暂不可用"}
                    </strong>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="account-menu-logout" onSelect={() => void handleLogout()}>
                  <LogOut aria-hidden="true" size={17} />
                  <span>退出登录</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button className="account-card" type="button" onClick={handleLogin}>
              <span className="avatar">{accountInitials}</span>
              <strong className="account-card-username">登录 GoodGood</strong>
              <LogIn className="account-card-more" aria-hidden="true" size={17} />
            </button>
          )}
        </div>
      </aside>

      <section className="main-stage">
        <header className="mobile-bar">
          <div className="mobile-brand" role="img" aria-label="GoodGood"><Image className="brand-mark" src="/goodgood-mark.svg" alt="" width={27} height={20} /><Image className="wordmark-image" src="/goodgood-wordmark.svg" alt="" width={84} height={19} /></div>
          <div className="mobile-workspace-switcher">
            <WorkspaceSwitcher
              activeWorkspaceId={workspaceId}
              enabled={Boolean(
                authenticationSession &&
                  !authenticationSession.preview &&
                  authenticationSession.access.status === "active",
              )}
              onWorkspaceChange={handleWorkspaceChange}
              onWorkspaceError={handleWorkspaceError}
            />
          </div>
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
            {authenticationSession?.account.businessRole && (
              <button
                className="top-avatar"
                aria-label="积分分配"
                onClick={handleDistributionNav}
              >
                <Network size={16} />
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
                <button className="mobile-credit-balance" onClick={handleCreditsNav} aria-label="查看积分记录">
                  {billingLoading ? "--" : displayedAvailableCredits ?? "--"} 积分
                </button>
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
          {workspaceId && workspaceResolutionStatus === "loading" ? (
            <section className="project-library-state project-route-state" role="status">
              <LoaderCircle size={18} />正在验证企业工作区权限
            </section>
          ) : workspaceId && workspaceResolutionStatus === "error" ? (
            <section className="project-library-state project-library-error project-route-state" role="alert">
              <CircleAlert size={18} />
              <span>企业工作区暂时无法验证，请重试或返回个人工作区。</span>
              <button onClick={() => window.location.reload()}><RefreshCw size={14} />重试</button>
              <button onClick={() => window.location.assign("/create")}><Brush size={14} />个人工作区</button>
            </section>
          ) : workspaceId && !workspaceAccessReady ? (
            <section className="project-library-state project-library-error project-route-state" role="alert">
              <CircleAlert size={18} />
              <span>你没有权限访问这个企业工作区，成员资格可能已暂停或移除。</span>
              <button onClick={() => window.location.assign("/create")}><Brush size={14} />返回个人工作区</button>
            </section>
          ) : activeView === "create" ? routeProjectId && projectRestoringId === routeProjectId ? (
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
          {creationMode === "image" ? (
            <CreationComposer
              mode={creationMode}
              prompt={prompt}
              references={referenceImages}
              modelId={selectedModel}
              aspectRatio={selectedRatio}
              resolution={resolution}
              count={generationCount}
              googleSearch={googleSearch}
              quality={quality}
              background={background}
              outputFormat={outputFormat}
              drawerOpen={drawerOpen}
              isGenerating={isGenerating}
              billingLabel={composerBillingLabel}
              billingDescription={composerBillingDescription}
              onModeChange={handleCreationModeChange}
              onPromptChange={handlePromptChange}
              onReferenceFiles={handleReferenceFiles}
              onOpenReferenceLibrary={() => openReferenceLibrary("image")}
              onRemoveReference={removeReference}
              onReorderReference={reorderReference}
              referenceEditorMaterials={referenceMaterials}
              onSaveReferenceEdit={handleSaveReferenceEdit}
              onModelChange={handleModelChange}
              onAspectRatioChange={handleAspectRatioChange}
              onResolutionChange={handleResolutionChange}
              onCountChange={handleGenerationCountChange}
              onGoogleSearchChange={handleGoogleSearchChange}
              onQualityChange={handleQualityChange}
              onBackgroundChange={handleBackgroundChange}
              onOutputFormatChange={handleOutputFormatChange}
              onDrawerOpenChange={setDrawerOpen}
              onGenerate={handleGenerate}
            />
          ) : (
            <VideoCreationComposer
              mode={creationMode}
              prompt={videoPrompt}
              references={videoReferences}
              generationMode={videoGenerationMode}
              modelId={videoModelId}
              providerLine={videoProviderLine}
              aspectRatio={videoAspectRatio}
              resolution={videoResolution}
              durationSeconds={videoDurationSeconds}
              generateAudio={videoGenerateAudio}
              drawerOpen={drawerOpen}
              interfaceAvailability={videoInterfaceAvailability}
              isGenerating={isVideoGenerating}
              onModeChange={handleCreationModeChange}
              onPromptChange={setVideoPrompt}
              onReferenceFiles={handleVideoReferenceFiles}
              onOpenReferenceLibrary={() => openReferenceLibrary("video")}
              onRemoveReference={removeVideoReference}
              onGenerationModeChange={handleVideoGenerationModeChange}
              onModelChange={handleVideoModelChange}
              onProviderLineChange={setVideoProviderLine}
              onAspectRatioChange={setVideoAspectRatio}
              onResolutionChange={setVideoResolution}
              onDurationChange={setVideoDurationSeconds}
              onGenerateAudioChange={setVideoGenerateAudio}
              onDrawerOpenChange={setDrawerOpen}
              onGenerate={() => void handleVideoGenerate()}
            />
          )}

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

          {authenticationSession?.preview && mixedMediaStylePreview ? <MixedMediaStylePreview /> : creationMode === "video" && videoPreviewJob ? (
            <section className="video-preview-result" aria-label="本地视频实测结果" aria-live="polite">
              <header>
                <div className="video-preview-result-title">
                  <SeedanceModelIcon />
                  <div>
                    <strong>{getVideoGenerationModel(videoModelId).name}</strong>
                    <small>{videoProviderLine === "standard" ? "标准线路" : "备用线路"} · {videoResolution} · {videoDurationSeconds} 秒</small>
                  </div>
                </div>
                <span className={`video-preview-status ${videoPreviewJob.status}`}>
                  {!videoPreviewJob.terminal && <LoaderCircle className="spin" size={13} />}
                  {localVideoStatusLabel(videoPreviewJob.status, videoPreviewJob.progress)}
                </span>
              </header>
              {videoPreviewJob.resultUrl ? (
                <video controls playsInline src={videoPreviewJob.resultUrl} aria-label="Seedance 生成视频" />
              ) : videoPreviewJob.error ? (
                <div className="video-preview-error" role="alert">
                  <CircleAlert size={17} />
                  <span>{videoPreviewJob.error}</span>
                </div>
              ) : (
                <div className="video-preview-pending">
                  <LoaderCircle className="spin" size={20} />
                  <span>任务已提交，页面会持续查询同一个任务，不会重复创建。</span>
                </div>
              )}
              <footer>
                <span>{videoPreviewJob.taskId.startsWith("local_") ? "正在获取任务编号" : videoPreviewJob.taskId}</span>
                <span>本地实测 · 不写入资产库</span>
              </footer>
            </section>
          ) : !isGenerating && !hasGenerationError && creationBatches.length === 0 ? (
            <section className="creation-empty-state" aria-label="尚未开始创作">
              <Image src="/goodgood-mark.svg" alt="" width={32} height={24} />
              <h2>{creationMode === "video" ? "描述你想创作的视频" : "描述你想创作的画面"}</h2>
              <p>{creationMode === "video" ? "输入提示词，或添加图片、视频和音频素材" : "输入提示词，或上传参考图片开始"}</p>
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

              {failedGenerationRuns.map((run) => {
                const generationError = run.job.error;
                if (!generationError) return null;
                const runInput = run.job.input;
                const runRatio = getGenerationRatio(runInput.aspectRatio);
                const submissionUnknown = generationError.code === "SUBMISSION_UNKNOWN";
                return (
                <div className="generation-error-strip" key={run.key} role="alert">
                  <span className="generation-error-icon"><CircleAlert size={18} /></span>
                  <div className="generation-error-copy">
                    <div className="generation-error-heading">
                      <h3>{generationError.title}</h3>
                      <span>{runInput.count} 张未生成</span>
                    </div>
                    <p>{generationError.message}</p>
                    <small>{generationError.code} · {run.job.id} · {runRatio.label} · {getGenerationResolutionLabel(runInput.resolution)} · {runInput.references.length > 0 ? `${runInput.references.length} 张参考图` : "无参考图"}</small>
                  </div>
                  <div className="generation-error-actions">
                    <button
                      className="error-retry"
                      title={submissionUnknown ? "将创建新的上游任务，并可能再次计费" : "使用失败任务的原始参数和参考图"}
                      onClick={() => void retryFailedGeneration(run)}
                    >
                      <RefreshCw size={14} />
                      {submissionUnknown ? "再次提交（将再次计费）" : "重新生成"}
                    </button>
                    <button className="error-settings" title="恢复失败任务的输入后调整" onClick={() => restoreFailedGenerationSettings(runInput)}><Settings2 size={14} />修改设置</button>
                  </div>
                </div>
                );
              })}

              {creationStreamItems.length > 0 && (
                <div className="creation-masonry-frame" aria-live="polite" aria-label="生成任务与创作结果">
                  <div className="creation-masonry desktop-creation-masonry">{renderCreationColumns(creationStreamItems, 4)}</div>
                  <div className="creation-masonry mobile-creation-masonry">{renderCreationColumns(creationStreamItems, 2)}</div>
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
          ) : activeView === "credits" ? (
            <CreditActivityView
              enabled={Boolean(authenticationSession && authenticationSession.access.status === "active")}
              onAccountChange={handleCreditAccountChange}
              onBack={handleCreateNav}
            />
          ) : activeView === "distribution" ? (
            <DistributionView
              enabled={Boolean(
                authenticationSession &&
                  authenticationSession.access.status === "active" &&
                  authenticationSession.account.businessRole,
              )}
              onAccountChange={handleCreditAccountChange}
              onBack={handleCreateNav}
            />
          ) : (
            <section className="asset-library-view" aria-label="资产库">
              <header className="asset-library-header">
                <div><small>GOODGOOD ASSETS</small><h1>资产库</h1><p>{assetSection === "generated" ? "每一次生成，都按任务批次完整保留。" : "上传一次，随时作为参考素材再次使用。"}</p></div>
                <div className="asset-library-controls">
                  <div className="asset-view-toggle asset-section-toggle" aria-label="资产类型">
                    <button className={assetSection === "generated" ? "active" : ""} aria-pressed={assetSection === "generated"} onClick={() => setAssetSection("generated")}><Images size={14} />生成图片</button>
                    <button className={assetSection === "materials" ? "active" : ""} aria-pressed={assetSection === "materials"} onClick={() => setAssetSection("materials")}><ImagePlus size={14} />上传素材</button>
                  </div>
                  {assetSection === "generated" && (
                    <div className="asset-view-toggle" aria-label="生成图片展示模式">
                      <button className={assetMode === "batches" ? "active" : ""} aria-pressed={assetMode === "batches"} onClick={() => setAssetMode("batches")}><Clock3 size={14} />批次</button>
                      <button className={assetMode === "gallery" ? "active" : ""} aria-pressed={assetMode === "gallery"} onClick={() => setAssetMode("gallery")}><LayoutGrid size={14} />画廊</button>
                    </div>
                  )}
                  {assetSection === "generated" && assetMode === "gallery" && selectedAssetIds.length > 0 && <span className="asset-selection-summary">已选 {selectedAssetIds.length}</span>}
                  <button className="asset-return-button" onClick={handleCreateNav}><Brush size={15} />返回创作</button>
                </div>
              </header>

              {assetSection === "materials" ? (
                referenceMaterialsLoading ? (
                  <div className="asset-library-state" role="status"><LoaderCircle size={18} />正在读取上传素材</div>
                ) : referenceMaterialsError ? (
                  <div className="asset-library-state asset-library-error" role="alert">
                    <CircleAlert size={18} />
                    <span>{referenceMaterialsError}</span>
                    <button onClick={() => void reloadReferenceMaterials()}><RefreshCw size={14} />重试</button>
                  </div>
                ) : referenceMaterials.length === 0 ? (
                  <div className="asset-library-state asset-library-empty">
                    <ImagePlus size={20} />
                    <strong>还没有上传素材</strong>
                    <span>在创作器上传参考图后，会自动保存在这里。</span>
                  </div>
                ) : (
                  <div className="reference-material-grid">
                    <div className="reference-material-masonry desktop-reference-material-masonry">{renderReferenceMaterialColumns(4)}</div>
                    <div className="reference-material-masonry mobile-reference-material-masonry">{renderReferenceMaterialColumns(2)}</div>
                  </div>
                )
              ) : assetRouteError ? (
                <div className="asset-library-state asset-library-error" role="alert">
                  <CircleAlert size={18} />
                  <span>{assetRouteError}</span>
                  <button onClick={retryAssetRoute}><RefreshCw size={14} />重试</button>
                  <button onClick={handleAssetNav}><Images size={14} />返回资产库</button>
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
                              <span>{batchModel.name}</span><span>{batchRatio.label}</span><span>{formatGenerationResolution(batch.resolution, getSharedPixelDimensions(batch.images))}</span><span>{batch.count} 张</span>{batch.referenceCount > 0 && <span>{batch.referenceCount} 张参考</span>}
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
        open={referenceLibraryOpen}
        onOpenChange={(open) => {
          setReferenceLibraryOpen(open);
          if (!open) setSelectedReferenceMaterialIds([]);
        }}
      >
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content className="reference-library-dialog">
            <header className="reference-library-dialog-header">
              <div>
                <DialogTitle>从资产库选择</DialogTitle>
                <DialogDescription>
                  {referenceLibraryTarget === "video"
                    ? videoGenerationMode === "first_last_frame"
                      ? `首尾帧模式只使用图片；按选择顺序作为首帧和尾帧，还可添加 ${referenceLibraryRemaining} 张。`
                      : videoAssetMediaFilter === "all"
                        ? `多模态模式可复用图片、视频和音频；总计还可添加 ${referenceLibraryRemaining} 个，单类型遵循模型上限。`
                        : `${videoAssetMediaFilters.find((filter) => filter.id === videoAssetMediaFilter)?.label}资产最多还可添加 ${referenceLibraryRemaining} 个。`
                    : `已上传的素材无需再次上传，最多还可添加 ${referenceLibraryRemaining} 张。`}
                </DialogDescription>
              </div>
              <button aria-label="关闭素材选择" onClick={() => setReferenceLibraryOpen(false)}><X size={18} /></button>
            </header>

            <div className="reference-library-dialog-body">
              {referenceLibraryTarget === "video" && (
                <div className="video-asset-media-filters" role="group" aria-label="筛选资产类型">
                  {videoAssetMediaFilters.map((filter) => {
                    const count = filter.id === "all"
                      ? modeCompatibleVideoAssetMaterials.length
                      : videoAssetMediaCounts[filter.id];
                    const unsupported = filter.id === "video"
                      ? activeVideoReferenceLimits.videoLimit === 0
                      : filter.id === "audio"
                        ? activeVideoReferenceLimits.audioLimit === 0
                        : filter.id === "image"
                          ? activeVideoReferenceLimits.imageLimit === 0
                          : false;
                    return (
                      <button
                        key={filter.id}
                        className={videoAssetMediaFilter === filter.id ? "selected" : ""}
                        aria-pressed={videoAssetMediaFilter === filter.id}
                        disabled={unsupported}
                        onClick={() => {
                          setVideoAssetMediaFilter(filter.id);
                          setSelectedReferenceMaterialIds([]);
                        }}
                      >
                        {filter.label}<small>{count}</small>
                      </button>
                    );
                  })}
                </div>
              )}
              {activeReferenceLibraryLoading ? (
                <div className="reference-library-dialog-state" role="status"><LoaderCircle size={18} />正在读取资产</div>
              ) : activeReferenceLibraryError ? (
                <div className="reference-library-dialog-state reference-library-dialog-error" role="alert">
                  <CircleAlert size={18} />
                  <span>{activeReferenceLibraryError}</span>
                  <button onClick={() => {
                    void reloadReferenceMaterials();
                    if (referenceLibraryTarget === "video") void reloadAssets();
                  }}><RefreshCw size={14} />重试</button>
                </div>
              ) : activeReferenceLibraryMaterials.length === 0 ? (
                <div className="reference-library-dialog-state reference-library-dialog-empty">
                  {referenceLibraryTarget === "video" && videoAssetMediaFilter === "video"
                    ? <Film size={20} />
                    : referenceLibraryTarget === "video" && videoAssetMediaFilter === "audio"
                      ? <AudioLines size={20} />
                      : <ImagePlus size={20} />}
                  <strong>{referenceLibraryTarget === "video"
                    ? videoAssetMediaFilter === "all"
                      ? "还没有可用的媒体资产"
                      : `暂无${videoAssetMediaFilters.find((filter) => filter.id === videoAssetMediaFilter)?.label}资产`
                    : "还没有上传素材"}</strong>
                  <span>{referenceLibraryTarget === "video"
                    ? "资产库中的图片、视频和音频会按类型显示在这里。"
                    : "关闭窗口后，从参考图按钮选择“上传本地图片”。"}</span>
                </div>
              ) : (
                <div className="reference-library-picker-grid">
                  {activeReferenceLibraryMaterials.map((material) => {
                    const alreadyUsed = referenceLibraryTarget === "video"
                      ? videoReferences.some((reference) => reference.id === material.id)
                      : referenceImages.some((reference) => reference.id === material.id);
                    const selected = selectedReferenceMaterialIds.includes(material.id);
                    const mediaTypeLabel = material.mediaType === "image"
                      ? "图片"
                      : material.mediaType === "video"
                        ? "视频"
                        : "音频";
                    const metadata = material.mediaType === "image" && material.width && material.height
                      ? `${material.width} × ${material.height}`
                      : material.durationSeconds
                        ? `${material.durationSeconds} 秒`
                        : mediaTypeLabel;
                    return (
                      <button
                        className={`reference-library-picker-card ${selected ? "selected" : ""} ${alreadyUsed ? "already-used" : ""}`}
                        key={material.id}
                        aria-label={alreadyUsed
                          ? `${material.name} 已在${referenceLibraryTarget === "video" ? "视频参考素材" : "参考图"}中`
                          : `${selected ? "取消选择" : "选择"} ${material.name}`}
                        aria-pressed={selected}
                        disabled={alreadyUsed}
                        onClick={() => toggleReferenceMaterial(material.id)}
                      >
                        <span className={`reference-library-picker-image ${material.mediaType}`}>
                          {material.mediaType === "image" ? (
                            <PrivateObjectImage src={material.url} alt="" />
                          ) : material.mediaType === "video" ? (
                            <video src={material.url} muted preload="metadata" aria-label={material.name} />
                          ) : (
                            <span className="reference-library-media-placeholder"><AudioLines size={24} /></span>
                          )}
                          {referenceLibraryTarget === "video" && (
                            <span className="reference-library-media-kind">{mediaTypeLabel}</span>
                          )}
                          <i>{alreadyUsed ? <Check size={14} /> : selected ? <Check size={14} /> : null}</i>
                        </span>
                        <span className="reference-library-picker-copy">
                          <strong title={material.name}>{material.name}</strong>
                          <small>{metadata}{referenceLibraryTarget === "video" && material.source === "generated" ? " · 生成资产" : ""}</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <footer className="reference-library-dialog-footer">
              <span>{selectedReferenceMaterialIds.length > 0
                ? `已选 ${selectedReferenceMaterialIds.length} ${referenceLibraryTarget === "video" ? "个" : "张"}`
                : referenceLibraryTarget === "video"
                  ? "选择后按原顺序加入视频参考素材"
                  : "选择后按原顺序加入参考图"}</span>
              <div>
                <button className="reference-library-cancel" onClick={() => setReferenceLibraryOpen(false)}>取消</button>
                <button className="reference-library-confirm" disabled={selectedReferenceMaterialIds.length === 0} onClick={confirmReferenceMaterials}>添加{selectedReferenceMaterialIds.length > 0 ? ` ${selectedReferenceMaterialIds.length} ${referenceLibraryTarget === "video" ? "个" : "张"}` : ""}</button>
              </div>
            </footer>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
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
                  className="image-detail-art"
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
                    <button className="download-button" disabled={downloadingImageKeys.includes(`${activeDetail.batch.id}-${activeDetail.image.id}`)} aria-label={downloadingImageKeys.includes(`${activeDetail.batch.id}-${activeDetail.image.id}`) ? "正在下载图片" : "下载图片"} onClick={() => void downloadImage(activeDetail.batch, activeDetail.image, activeDetail.index)}>{downloadingImageKeys.includes(`${activeDetail.batch.id}-${activeDetail.image.id}`) ? <LoaderCircle className="download-spinner" size={17} /> : <Download size={17} />}</button>
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
                    <div><dt>分辨率</dt><dd>{formatGenerationResolution(activeDetail.batch.resolution, activeDetail.image)}</dd></div>
                    <div><dt>批次</dt><dd>{activeDetail.batch.count} 张</dd></div>
                    <div><dt>参考图</dt><dd>{activeDetail.batch.referenceCount ? `${activeDetail.batch.referenceCount} 张` : "无"}</dd></div>
                    {activeDetail.batch.modelId === "nano-banana-2" && (
                      <div><dt>谷歌搜索</dt><dd>{activeDetail.batch.googleSearch ? "开启" : "关闭"}</dd></div>
                    )}
                    {isGptImageModelId(activeDetail.batch.modelId) && (
                      <>
                        <div><dt>质量</dt><dd>{gptImageQualityLabel(activeDetail.batch.quality)}</dd></div>
                        <div><dt>背景</dt><dd>{gptImageBackgroundLabel(activeDetail.batch.background)}</dd></div>
                        <div><dt>输出格式</dt><dd>{gptImageOutputFormatLabel(activeDetail.batch.outputFormat)}</dd></div>
                      </>
                    )}
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
                      className={index === detailIndex ? "image-detail-thumbnail active" : "image-detail-thumbnail"}
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
        <AuthenticationGate
          initialError={authenticationError}
          onAuthenticated={handleAuthenticationComplete}
          onHostedLogin={handleLogin}
        />
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
