"use client";

import { useEffect, useRef, useState, type CSSProperties, type WheelEvent as ReactWheelEvent } from "react";
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
  MoreHorizontal,
  Plus,
  RefreshCw,
  Settings2,
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
type Project = {
  id: string;
  name: string;
  updated: string;
  coverPosition: string;
  batches: AssetBatch[];
};
type ActiveView = "create" | "projects" | "assets";
type CreationStreamItem =
  | { kind: "skeleton"; key: string; ratio: number; index: number }
  | { kind: "image"; key: string; ratio: number; batch: AssetBatch; image: GenerationOutput; index: number };
type AssetGalleryItem = { key: string; ratio: number; batch: AssetBatch; image: GenerationOutput; index: number };
type DetailImage = AssetGalleryItem;

const defaultPrompt = "一位年轻的亚洲女性模特，身穿银灰色未来感服装，站在冷白色摄影棚中。极简构图，柔和硬光，真实皮肤质感，高级时尚摄影。";
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
    images: MOCK_GENERATION_OUTPUTS,
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
    images: MOCK_GENERATION_OUTPUTS.slice(0, 2),
  },
];
const initialProjects: Project[] = [
  {
    id: "project-silver-fashion",
    name: "银色未来服装视觉",
    updated: "今天 10:16",
    coverPosition: "50% 38%",
    batches: initialAssetBatches,
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

export default function Home() {
  const referenceObjectUrlsRef = useRef(new Set<string>());
  const assetPulseTimerRef = useRef<number | null>(null);
  const detailWheelTimerRef = useRef<number | null>(null);
  const detailThumbnailRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [generationBoundary] = useState(createHttpGenerationBoundary);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GenerationModelId>(DEFAULT_GENERATION_MODEL_ID);
  const [selectedRatio, setSelectedRatio] = useState<GenerationAspectRatio>("4:5");
  const [resolution, setResolution] = useState<GenerationResolution>("2K");
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
  const [assetMode, setAssetMode] = useState<"batches" | "gallery">("batches");
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [currentProject, setCurrentProject] = useState<{ id: string; name: string } | null>(null);
  const [projectDrawerOpen, setProjectDrawerOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItems, setDetailItems] = useState<DetailImage[]>([]);
  const [detailIndex, setDetailIndex] = useState(0);
  const activeRatio = getGenerationRatio(selectedRatio);
  const activeModel = getGenerationModel(selectedModel);
  const generationStage = toGenerationUiStage(generationJob?.state ?? null);
  const isGenerating = generationJob ? isGenerationJobActive(generationJob.state) : false;
  const generationError = generationJob?.error ?? null;
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

  useEffect(() => {
    if (!detailOpen) return;
    detailThumbnailRefs.current[detailIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [detailIndex, detailOpen]);

  useEffect(() => {
    if (!detailOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        setDetailIndex((current) => Math.min(current + 1, detailItems.length - 1));
      }
      if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        setDetailIndex((current) => Math.max(current - 1, 0));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [detailItems.length, detailOpen]);

  useEffect(() => () => {
    if (detailWheelTimerRef.current) window.clearTimeout(detailWheelTimerRef.current);
  }, []);

  useEffect(() => () => {
    referenceObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    referenceObjectUrlsRef.current.clear();
  }, []);

  const handleReferenceFiles = (files: readonly File[]) => {
    if (!files.length) return;

    const remaining = MAX_GENERATION_REFERENCES - referenceImages.length;
    if (remaining <= 0) {
      toast.info(`最多可添加 ${MAX_GENERATION_REFERENCES} 张参考图`);
      return;
    }

    const accepted = files.slice(0, remaining).map((file, index) => {
      const url = URL.createObjectURL(file);
      referenceObjectUrlsRef.current.add(url);
      return {
        id: `${Date.now()}-${index}-${file.name}`,
        url,
        name: file.name,
      };
    });
    setReferenceImages((current) => [...current, ...accepted]);
    if (files.length > remaining) toast.info(`已添加 ${accepted.length} 张，参考图最多 ${MAX_GENERATION_REFERENCES} 张`);
    else toast.success(`已添加 ${accepted.length} 张参考图`);
  };

  const removeReference = (image: ReferenceImage) => {
    setReferenceImages((current) => current.filter((item) => item.id !== image.id));
  };

  const handleAssetNav = () => {
    if (assetPulseTimerRef.current) window.clearTimeout(assetPulseTimerRef.current);
    setAssetPulse(false);
    setNewAssetCount(0);
    setActiveView("assets");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCreateNav = () => {
    setActiveView("create");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleProjectsNav = () => {
    setActiveView("projects");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startNewCreation = () => {
    referenceObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    referenceObjectUrlsRef.current.clear();
    setReferenceImages([]);
    setPrompt("");
    setCreationBatches([]);
    setCurrentProject(null);
    setGenerationJob(null);
    setDrawerOpen(false);
    setActiveView("create");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const restoreProject = (project: Project) => {
    const latestBatch = project.batches[0];
    setCurrentProject({ id: project.id, name: project.name });
    setCreationBatches(project.batches);
    setSavedImages(project.batches.flatMap((batch) => batch.images.map((image) => `${batch.id}-${image.id}`)));
    setPrompt(latestBatch.prompt);
    setSelectedModel(latestBatch.modelId);
    setSelectedRatio(latestBatch.aspectRatio);
    setResolution(latestBatch.resolution);
    setGenerationCount(latestBatch.count);
    setGenerationJob(null);
    setActiveView("create");
    toast.success("项目已恢复，可以继续创作");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openProjectDrawer = () => {
    const suggestedName = /银灰|未来感|时尚摄影/.test(prompt)
      ? "银色未来服装视觉"
      : prompt.trim().split(/[，。,.]/)[0].slice(0, 18) || "未命名创作项目";
    setProjectName(currentProject?.name ?? suggestedName);
    setProjectDrawerOpen(true);
  };

  const saveCurrentProject = () => {
    if (!creationBatches.length) return;
    const name = projectName.trim() || "未命名创作项目";
    const id = currentProject?.id ?? `project-${Date.now()}`;
    const nextProject: Project = {
      id,
      name,
      updated: "刚刚",
      coverPosition: creationBatches[0]?.images[0]?.previewPosition ?? "50% 45%",
      batches: creationBatches,
    };
    setProjects((current) => [nextProject, ...current.filter((project) => project.id !== id)]);
    setCurrentProject({ id, name });
    setProjectDrawerOpen(false);
    toast.success("项目已保存，后续创作将自动归入此项目");
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
          ? { ...project, updated: "刚刚", batches: nextBatches, coverPosition: nextBatch.images[0]?.previewPosition ?? project.coverPosition }
          : project));
      }
      return nextBatches;
    });
    setAssetBatches((current) => [nextBatch, ...current]);
    setNewAssetCount(completedJob.outputs.length);
    setAssetPulse(true);
    if (assetPulseTimerRef.current) window.clearTimeout(assetPulseTimerRef.current);
    assetPulseTimerRef.current = window.setTimeout(() => setAssetPulse(false), 4200);
  };

  const runGeneration = async (snapshot: GenerationInputSnapshot) => {
    if (isGenerating) return;

    setDrawerOpen(false);
    const terminalJob = await generationBoundary.service.submit(
      snapshot,
      setGenerationJob,
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
    if (referenceImages.length > 0) {
      toast.error("持久参考图上传将在下一阶段启用，请先移除参考图");
      return;
    }
    if (
      selectedModel !== "nano-banana-2" ||
      selectedRatio !== "4:5" ||
      resolution !== "2K" ||
      generationCount !== 1
    ) {
      toast.error("当前持久生成链路支持 Nano Banana 2、4:5、高清、1 张图片");
      return;
    }

    const snapshot = createGenerationInputSnapshot({
      prompt,
      references: referenceImages,
      modelId: selectedModel,
      aspectRatio: selectedRatio,
      resolution,
      count: generationCount,
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
    void generationBoundary.retry(generationJob, setGenerationJob).then((terminalJob) => {
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

  const openImageDetail = (items: DetailImage[], imageKey: string) => {
    const nextIndex = items.findIndex((item) => item.key === imageKey);
    if (nextIndex < 0) return;
    setDetailItems(items);
    setDetailIndex(nextIndex);
    setDetailOpen(true);
  };

  const handleDetailWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaY) < 18 || detailWheelTimerRef.current || detailItems.length < 2) return;
    event.preventDefault();
    setDetailIndex((current) => event.deltaY > 0
      ? Math.min(current + 1, detailItems.length - 1)
      : Math.max(current - 1, 0));
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
        onClick={() => openImageDetail(creationDetailItems, item.key)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openImageDetail(creationDetailItems, item.key);
          }
        }}
      >
        <Image
          src={item.image.previewUrl}
          alt={`${itemModel.name} 生成的视觉作品 ${item.index + 1}`}
          fill
          unoptimized
          sizes="(max-width: 760px) 50vw, 25vw"
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
        onClick={() => openImageDetail(assetDetailItems, item.key)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openImageDetail(assetDetailItems, item.key);
          }
        }}
      >
        <Image
          src={item.image.previewUrl}
          alt={`${item.batch.id} 画廊图片 ${item.index + 1}`}
          fill
          unoptimized
          sizes="(max-width: 760px) 50vw, 25vw"
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
        </nav>

        <div className="sidebar-footer">
          <button className="side-nav-item"><HelpCircle size={17} /><span>帮助</span></button>
          <div className="account-card"><div className="avatar">LZ</div><div><strong>Li Zhongyi</strong><small>2,480 点数</small></div><MoreHorizontal size={16} /></div>
        </div>
      </aside>

      <section className="main-stage">
        <header className="mobile-bar">
          <div className="mobile-brand" role="img" aria-label="GoodGood"><Image className="brand-mark" src="/goodgood-mark.svg" alt="" width={27} height={20} /><Image className="wordmark-image" src="/goodgood-wordmark.svg" alt="" width={84} height={19} /></div>
          <button className="top-avatar">LZ</button>
        </header>

        <div className={`content-wrap ${activeView !== "create" ? "asset-content-wrap" : ""}`}>
          {activeView === "create" ? <>
          <CreationComposer
            prompt={prompt}
            references={referenceImages}
            modelId={selectedModel}
            aspectRatio={selectedRatio}
            resolution={resolution}
            count={generationCount}
            drawerOpen={drawerOpen}
            isGenerating={isGenerating}
            onPromptChange={setPrompt}
            onReferenceFiles={handleReferenceFiles}
            onRemoveReference={removeReference}
            onModelChange={setSelectedModel}
            onAspectRatioChange={setSelectedRatio}
            onResolutionChange={setResolution}
            onCountChange={setGenerationCount}
            onDrawerOpenChange={setDrawerOpen}
            onGenerate={handleGenerate}
          />

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
                  {currentProject && <button className="new-session-button" aria-label="退出当前项目并开始新创作" disabled={isGenerating} onClick={startNewCreation}><Plus size={15} />新建创作</button>}
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
                    <button className="error-retry" title="使用失败任务的原始参数和参考图" onClick={retryFailedGeneration}><RefreshCw size={14} />重新生成</button>
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
                <button className="new-creation-button" onClick={startNewCreation}><Plus size={15} />新建创作</button>
              </header>
              <div className="project-grid">
                {projects.map((project) => {
                  const imageCount = project.batches.reduce((total, batch) => total + batch.images.length, 0);
                  return (
                    <article className="project-card" key={project.id}>
                      <button className="project-cover" onClick={() => restoreProject(project)} aria-label={`打开项目 ${project.name}`}>
                        <Image src="/nano-fashion.png" alt={`${project.name} 项目封面`} fill sizes="(max-width: 760px) 100vw, (max-width: 1180px) 50vw, 33vw" style={{ objectPosition: project.coverPosition }} />
                        <span>{imageCount} 张图片</span>
                      </button>
                      <div className="project-card-footer">
                        <div><h2>{project.name}</h2><p>{project.updated} · {project.batches.length} 个生成批次</p></div>
                        <button onClick={() => restoreProject(project)}>继续创作</button>
                      </div>
                    </article>
                  );
                })}
              </div>
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

              {assetMode === "batches" ? Array.from(new Set(assetBatches.map((batch) => batch.dateLabel))).map((dateLabel) => (
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
                                onClick={() => openImageDetail(assetDetailItems, `${batch.id}-${image.id}`)}
                              >
                                <Image
                                  src={image.previewUrl}
                                  alt={`${batch.id} 生成结果 ${index + 1}`}
                                  fill
                                  unoptimized
                                  sizes="(max-width: 760px) 50vw, 176px"
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
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
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
                <button className="image-detail-close" aria-label="关闭图片详情" onClick={() => setDetailOpen(false)}><X size={20} /></button>
                <div className="image-detail-count">{String(detailIndex + 1).padStart(2, "0")} / {String(detailItems.length).padStart(2, "0")}</div>
                <div
                  className={`image-detail-art detail-variant-${(activeDetail.index % 4) + 1}`}
                  style={{ aspectRatio: `${activeDetail.ratio}`, width: `min(calc(100% - 72px), ${activeDetail.ratio * 82}dvh)` }}
                >
                  <Image
                    src={activeDetail.image.previewUrl}
                    alt={`${activeDetailModel?.name} 生成图片 ${activeDetail.index + 1}`}
                    fill
                    unoptimized
                    sizes="(max-width: 760px) 100vw, calc(100vw - 426px)"
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
                      onClick={() => setDetailIndex(index)}
                    >
                      <Image src={item.image.previewUrl} alt="" fill unoptimized sizes="58px" style={{ objectPosition: item.image.previewPosition }} />
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
      <Drawer open={projectDrawerOpen} onOpenChange={setProjectDrawerOpen}>
        <DrawerContent className="project-save-drawer">
          <div className="project-save-shell">
            <DrawerHeader className="project-save-header">
              <DrawerTitle>{currentProject ? "项目设置" : "保存为项目"}</DrawerTitle>
              <DrawerDescription>保存图片、提示词和生成参数，以后可以从这里继续创作。</DrawerDescription>
            </DrawerHeader>
            <div className="project-save-body">
              <div className="project-save-cover">
                <Image src={creationBatches[0]?.images[0]?.previewUrl ?? "/nano-fashion.png"} alt="项目封面预览" fill unoptimized sizes="190px" style={{ objectPosition: creationBatches[0]?.images[0]?.previewPosition ?? "50% 42%" }} />
                <span>{totalCreationImages} 张图片 · {creationBatches.length} 个批次</span>
              </div>
              <label className="project-name-field">
                <span>项目名称</span>
                <input value={projectName} onChange={(event) => setProjectName(event.target.value)} autoFocus maxLength={32} />
              </label>
            </div>
            <div className="project-save-actions">
              <button className="project-save-cancel" onClick={() => setProjectDrawerOpen(false)}>取消</button>
              <button className="project-save-confirm" onClick={saveCurrentProject}>{currentProject ? "保存更改" : "保存项目"}</button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
      <Toaster position="bottom-center" toastOptions={{ duration: 2200 }} />
    </main>
  );
}
