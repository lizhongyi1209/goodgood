"use client";

import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type WheelEvent as ReactWheelEvent } from "react";
import { Slider } from "@/components/ui/slider";
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
import { NanoBanana, OpenAI } from "@lobehub/icons";
import { Dialog as DialogPrimitive } from "radix-ui";
import { toast } from "sonner";
import {
  Bookmark,
  Brush,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  Compass,
  Download,
  FolderOpen,
  FolderPlus,
  HelpCircle,
  ImagePlus,
  Images,
  LayoutGrid,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Settings2,
  SlidersHorizontal,
  X,
} from "lucide-react";

const results = [
  { id: "01", className: "result-card result-hero", position: "50% 48%" },
  { id: "02", className: "result-card", position: "72% 35%" },
  { id: "03", className: "result-card", position: "35% 68%" },
  { id: "04", className: "result-card result-wide", position: "62% 56%" },
];

const ratioOptions = [
  { label: "1 : 8", value: 1 / 8, sizes: { "1K": "384 × 3072", "2K": "768 × 6144", "4K": "1536 × 12288" }, mode: "portrait" },
  { label: "1 : 4", value: 1 / 4, sizes: { "1K": "512 × 2048", "2K": "1024 × 4096", "4K": "2048 × 8192" }, mode: "portrait" },
  { label: "9 : 16", value: 9 / 16, sizes: { "1K": "768 × 1376", "2K": "1536 × 2752", "4K": "3072 × 5504" }, mode: "portrait" },
  { label: "2 : 3", value: 2 / 3, sizes: { "1K": "848 × 1264", "2K": "1696 × 2528", "4K": "3392 × 5056" }, mode: "portrait" },
  { label: "3 : 4", value: 3 / 4, sizes: { "1K": "896 × 1200", "2K": "1792 × 2400", "4K": "3584 × 4800" }, mode: "portrait" },
  { label: "4 : 5", value: 4 / 5, sizes: { "1K": "928 × 1152", "2K": "1856 × 2304", "4K": "3712 × 4608" }, mode: "portrait" },
  { label: "1 : 1", value: 1, sizes: { "1K": "1024 × 1024", "2K": "2048 × 2048", "4K": "4096 × 4096" }, mode: "square" },
  { label: "5 : 4", value: 5 / 4, sizes: { "1K": "1152 × 928", "2K": "2304 × 1856", "4K": "4608 × 3712" }, mode: "landscape" },
  { label: "4 : 3", value: 4 / 3, sizes: { "1K": "1200 × 896", "2K": "2400 × 1792", "4K": "4800 × 3584" }, mode: "landscape" },
  { label: "3 : 2", value: 3 / 2, sizes: { "1K": "1264 × 848", "2K": "2528 × 1696", "4K": "5056 × 3392" }, mode: "landscape" },
  { label: "16 : 9", value: 16 / 9, sizes: { "1K": "1376 × 768", "2K": "2752 × 1536", "4K": "5504 × 3072" }, mode: "landscape" },
  { label: "21 : 9", value: 21 / 9, sizes: { "1K": "1584 × 672", "2K": "3168 × 1344", "4K": "6336 × 2688" }, mode: "landscape" },
  { label: "4 : 1", value: 4, sizes: { "1K": "2048 × 512", "2K": "4096 × 1024", "4K": "8192 × 2048" }, mode: "landscape" },
  { label: "8 : 1", value: 8, sizes: { "1K": "3072 × 384", "2K": "6144 × 768", "4K": "12288 × 1536" }, mode: "landscape" },
] as const;

const ratioModes = [
  ["portrait", "竖版"],
  ["square", "方形"],
  ["landscape", "横版"],
] as const;

const ratioDefaults = { portrait: 5, square: 6, landscape: 10 } as const;
const resolutionOptions = [
  { value: "1K", label: "标准" },
  { value: "2K", label: "高清" },
  { value: "4K", label: "超清" },
] as const;
type Resolution = (typeof resolutionOptions)[number]["value"];

const modelOptions = [
  { id: "nano-banana-2", name: "Nano Banana 2", description: "快速，批量", provider: "nano", recommended: true },
  { id: "nano-banana-pro", name: "Nano Banana Pro", description: "高质量资产，视觉优先", provider: "nano", recommended: false },
  { id: "gpt-image-2", name: "GPT IMAGE 2", description: "高真实感，提示词遵循", provider: "openai", recommended: false },
] as const;
type ModelId = (typeof modelOptions)[number]["id"];
type GenerationCount = 1 | 2 | 4;
type GenerationStage = "idle" | "queued" | "rendering" | "refining" | "complete" | "failed";
type GenerationError = { title: string; message: string; code: string };
type ReferenceImage = { id: string; url: string; name: string };
type AssetBatch = {
  id: string;
  dateLabel: string;
  time: string;
  prompt: string;
  model: string;
  ratio: string;
  resolution: string;
  count: number;
  references: number;
  images: typeof results;
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
  | { kind: "image"; key: string; ratio: number; batch: AssetBatch; image: (typeof results)[number]; index: number };
type AssetGalleryItem = { key: string; ratio: number; batch: AssetBatch; image: (typeof results)[number]; index: number };
type DetailImage = AssetGalleryItem;

const defaultPrompt = "一位年轻的亚洲女性模特，身穿银灰色未来感服装，站在冷白色摄影棚中。极简构图，柔和硬光，真实皮肤质感，高级时尚摄影。";
const initialAssetBatches: AssetBatch[] = [
  {
    id: "GG-240827",
    dateLabel: "今天",
    time: "10:16",
    prompt: defaultPrompt,
    model: "Nano Banana 2",
    ratio: "4 : 5",
    resolution: "高清",
    count: 4,
    references: 0,
    images: results,
  },
  {
    id: "GG-236814",
    dateLabel: "昨天",
    time: "20:42",
    prompt: "参考图 1 的服装轮廓与参考图 2 的光影质感，创作一组冷调高级成衣广告，保留自然皮肤纹理与真实面料细节。",
    model: "Nano Banana Pro",
    ratio: "1 : 1",
    resolution: "超清",
    count: 2,
    references: 2,
    images: results.slice(0, 2),
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
const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

function ModelIcon({ provider }: { provider: "nano" | "openai" }) {
  return <span className={`model-icon ${provider}`}>{provider === "nano" ? <NanoBanana.Color size={26} /> : <OpenAI size={25} />}</span>;
}

function getRatioFrame(ratio: number) {
  const max = 96;
  let width = max;
  let height = width / ratio;
  if (height > max) {
    height = max;
    width = height * ratio;
  }
  return {
    x: 60 - width / 2,
    y: 56 - height / 2,
    width,
    height,
    guideX: 60 - height / 2,
    guideY: 56 - width / 2,
    guideWidth: height,
    guideHeight: width,
  };
}

function getDetailImages(batches: AssetBatch[]): DetailImage[] {
  return batches.flatMap((batch) => {
    const batchRatio = ratioOptions.find((option) => option.label === batch.ratio) ?? ratioOptions[5];
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
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  const assetPulseTimerRef = useRef<number | null>(null);
  const errorSimulationRef = useRef(false);
  const detailWheelTimerRef = useRef<number | null>(null);
  const detailThumbnailRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelId>("nano-banana-2");
  const [ratioIndex, setRatioIndex] = useState(5);
  const [resolution, setResolution] = useState<Resolution>("2K");
  const [generationCount, setGenerationCount] = useState<GenerationCount>(1);
  const [prompt, setPrompt] = useState("");
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>("create");
  const [generationStage, setGenerationStage] = useState<GenerationStage>("idle");
  const [generationError, setGenerationError] = useState<GenerationError | null>(null);
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
  const [jobMeta, setJobMeta] = useState({ id: "", model: "Nano Banana 2", ratio: "4 : 5", resolution: "高清", count: 1, references: 0 });
  const activeRatio = ratioOptions[ratioIndex];
  const activeModel = modelOptions.find((model) => model.id === selectedModel) ?? modelOptions[0];
  const ratioFrame = getRatioFrame(activeRatio.value);
  const isGenerating = generationStage === "queued" || generationStage === "rendering" || generationStage === "refining";
  const hasGenerationError = generationStage === "failed" && generationError !== null;
  const totalCreationImages = creationBatches.reduce((total, batch) => total + batch.images.length, 0);
  const creationDetailItems = getDetailImages(creationBatches);
  const assetDetailItems = getDetailImages(assetBatches);
  const activeDetail = detailItems[detailIndex] ?? null;
  const stageText = generationStage === "queued"
    ? "任务已提交，正在准备画面"
    : generationStage === "rendering"
      ? `${jobMeta.model} 正在生成 ${jobMeta.count} 张图片`
      : generationStage === "refining"
        ? "正在完成细节与清晰度处理"
        : generationStage === "complete"
          ? "生成完成"
          : generationStage === "failed"
            ? "生成失败"
          : "根据当前提示词创建的图像";
  const creationItems: CreationStreamItem[] = [
    ...(isGenerating ? Array.from({ length: generationCount }, (_, index) => ({
      kind: "skeleton" as const,
      key: `skeleton-${jobMeta.id}-${index}`,
      ratio: activeRatio.value,
      index,
    })) : []),
    ...creationBatches.flatMap((batch) => {
      const batchRatio = ratioOptions.find((option) => option.label === batch.ratio) ?? ratioOptions[5];
      return batch.images.map((image, index) => ({
        kind: "image" as const,
        key: `${batch.id}-${image.id}`,
        ratio: batchRatio.value,
        batch,
        image,
        index,
      }));
    }),
  ];

  const resizePromptTextarea = (element: HTMLTextAreaElement) => {
    element.style.height = "auto";
    const styles = window.getComputedStyle(element);
    const lineHeight = Number.parseFloat(styles.lineHeight);
    const verticalPadding = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
    const maxHeight = lineHeight * 8 + verticalPadding;
    const nextHeight = Math.min(element.scrollHeight, maxHeight);
    const hasOverflow = element.scrollHeight > maxHeight;
    element.style.height = `${nextHeight}px`;
    element.style.overflowY = hasOverflow ? "auto" : "hidden";
    element.classList.toggle("has-overflow", hasOverflow);
  };

  useEffect(() => {
    const element = promptInputRef.current;
    if (!element) return;
    const handleResize = () => resizePromptTextarea(element);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (promptInputRef.current) resizePromptTextarea(promptInputRef.current);
  }, [prompt]);

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

  const handleReferenceChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const remaining = 10 - referenceImages.length;
    if (remaining <= 0) {
      toast.info("最多可添加 10 张参考图");
      event.target.value = "";
      return;
    }

    const accepted = files.slice(0, remaining).map((file, index) => ({
      id: `${Date.now()}-${index}-${file.name}`,
      url: URL.createObjectURL(file),
      name: file.name,
    }));
    setReferenceImages((current) => [...current, ...accepted]);
    event.target.value = "";
    if (files.length > remaining) toast.info(`已添加 ${accepted.length} 张，参考图最多 10 张`);
    else toast.success(`已添加 ${accepted.length} 张参考图`);
  };

  const openReferencePicker = () => {
    if (referenceImages.length >= 10) {
      toast.info("最多可添加 10 张参考图");
      return;
    }
    referenceInputRef.current?.click();
  };

  const removeReference = (image: ReferenceImage) => {
    URL.revokeObjectURL(image.url);
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
    referenceImages.forEach((image) => URL.revokeObjectURL(image.url));
    setReferenceImages([]);
    setPrompt("");
    setCreationBatches([]);
    setCurrentProject(null);
    setGenerationStage("idle");
    setGenerationError(null);
    setDrawerOpen(false);
    setModelMenuOpen(false);
    setActiveView("create");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const restoreProject = (project: Project) => {
    const latestBatch = project.batches[0];
    setCurrentProject({ id: project.id, name: project.name });
    setCreationBatches(project.batches);
    setSavedImages(project.batches.flatMap((batch) => batch.images.map((image) => `${batch.id}-${image.id}`)));
    setPrompt(latestBatch.prompt);
    const restoredModel = modelOptions.find((model) => model.name === latestBatch.model);
    if (restoredModel) setSelectedModel(restoredModel.id);
    const restoredRatioIndex = ratioOptions.findIndex((option) => option.label === latestBatch.ratio);
    if (restoredRatioIndex >= 0) setRatioIndex(restoredRatioIndex);
    const restoredResolution = resolutionOptions.find((option) => option.label === latestBatch.resolution);
    if (restoredResolution) setResolution(restoredResolution.value);
    if ([1, 2, 4].includes(latestBatch.count)) setGenerationCount(latestBatch.count as GenerationCount);
    setJobMeta({
      id: latestBatch.id,
      model: latestBatch.model,
      ratio: latestBatch.ratio,
      resolution: latestBatch.resolution,
      count: latestBatch.count,
      references: latestBatch.references,
    });
    setGenerationStage("complete");
    setGenerationError(null);
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
      coverPosition: creationBatches[0]?.images[0]?.position ?? "50% 45%",
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

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("请先输入画面描述");
      return;
    }
    if (isGenerating) return;

    const promptSnapshot = prompt.trim();
    const shouldSimulateError = /报错|error|失败/i.test(promptSnapshot) && !errorSimulationRef.current;
    const resolutionLabel = resolutionOptions.find((option) => option.value === resolution)?.label ?? resolution;
    const nextJob = {
      id: `GG-${String(Date.now()).slice(-6)}`,
      model: activeModel.name,
      ratio: activeRatio.label,
      resolution: resolutionLabel,
      count: generationCount,
      references: referenceImages.length,
    };

    setJobMeta(nextJob);
    setModelMenuOpen(false);
    setDrawerOpen(false);
    setGenerationError(null);
    setGenerationStage("queued");
    await wait(650);
    setGenerationStage("rendering");
    await wait(1550);
    if (shouldSimulateError) {
      errorSimulationRef.current = true;
      setGenerationError({
        title: "本次生成未完成",
        message: "模型服务响应超时。提示词、参考图与生成参数均已保留，你可以直接重试。",
        code: "MODEL_TIMEOUT",
      });
      setGenerationStage("failed");
      return;
    }
    setGenerationStage("refining");
    await wait(900);
    const nextResults = results.slice(0, generationCount);
    const nextBatch: AssetBatch = {
      ...nextJob,
      dateLabel: "今天",
      time: new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()),
      prompt: promptSnapshot,
      images: nextResults,
    };
    setSavedImages((current) => [...current, ...nextResults.map((result) => `${nextJob.id}-${result.id}`)]);
    setCreationBatches((current) => {
      const nextBatches = [nextBatch, ...current];
      if (currentProject) {
        setProjects((currentProjects) => currentProjects.map((project) => project.id === currentProject.id
          ? { ...project, updated: "刚刚", batches: nextBatches, coverPosition: nextBatch.images[0]?.position ?? project.coverPosition }
          : project));
      }
      return nextBatches;
    });
    setAssetBatches((current) => [nextBatch, ...current]);
    setNewAssetCount(generationCount);
    setAssetPulse(true);
    if (assetPulseTimerRef.current) window.clearTimeout(assetPulseTimerRef.current);
    assetPulseTimerRef.current = window.setTimeout(() => setAssetPulse(false), 4200);
    setGenerationStage("complete");
  };

  const toggleSave = (assetId: string) => {
    const isSaved = savedImages.includes(assetId);
    setSavedImages((current) => isSaved ? current.filter((id) => id !== assetId) : [...current, assetId]);
    toast.success(isSaved ? "已从资产库移除" : "已重新加入资产库");
  };

  const downloadImage = (batchId: string, imageId: string) => {
    const link = document.createElement("a");
    link.href = "/nano-fashion.png";
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
    return (
      <article
        className={`creation-card creation-variant-${(item.index % 4) + 1}`}
        key={item.key}
        style={{ aspectRatio: `${item.ratio}`, "--reveal-delay": `${item.index * 70}ms` } as CSSProperties}
        role="button"
        tabIndex={0}
        aria-label={`查看 ${item.batch.model} 生成的视觉作品 ${item.index + 1}`}
        onClick={() => openImageDetail(creationDetailItems, item.key)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openImageDetail(creationDetailItems, item.key);
          }
        }}
      >
        <img src="/nano-fashion.png" alt={`${item.batch.model} 生成的视觉作品 ${item.index + 1}`} style={{ objectPosition: item.image.position }} />
        <span className="creation-card-meta">{item.batch.time} · {item.batch.ratio}</span>
        <div className="image-actions">
          <button className={isSaved ? "saved" : ""} aria-label={isSaved ? "从资产库移除" : "保存到资产库"} onClick={(event) => { event.stopPropagation(); toggleSave(item.key); }}><Bookmark size={15} fill={isSaved ? "currentColor" : "none"} /></button>
          <button aria-label="下载到本地" onClick={(event) => { event.stopPropagation(); downloadImage(item.batch.id, item.image.id); }}><Download size={15} /></button>
        </div>
      </article>
    );
  };

  const renderCreationColumns = (columnCount: number) => Array.from({ length: columnCount }, (_, columnIndex) => (
    <div className="creation-column" key={`creation-column-${columnCount}-${columnIndex}`}>
      {creationItems.filter((_, itemIndex) => itemIndex % columnCount === columnIndex).map(renderCreationItem)}
    </div>
  ));

  const getAssetGalleryItems = (dateLabel: string): AssetGalleryItem[] => assetDetailItems
    .filter((item) => item.batch.dateLabel === dateLabel);

  const renderAssetGalleryCard = (item: AssetGalleryItem) => {
    const isSelected = selectedAssetIds.includes(item.key);
    return (
      <article
        className={`asset-gallery-card gallery-variant-${(item.index % 4) + 1} ${isSelected ? "selected" : ""}`}
        key={item.key}
        style={{ aspectRatio: `${item.ratio}` }}
        role="button"
        tabIndex={0}
        aria-label={`查看 ${item.batch.ratio} 图片详情`}
        onClick={() => openImageDetail(assetDetailItems, item.key)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openImageDetail(assetDetailItems, item.key);
          }
        }}
      >
        <img src="/nano-fashion.png" alt={`${item.batch.id} 画廊图片 ${item.index + 1}`} style={{ objectPosition: item.image.position }} />
        <button
          className="asset-gallery-check"
          aria-label={`${isSelected ? "取消选择" : "选择"}这张图片`}
          aria-pressed={isSelected}
          onClick={(event) => { event.stopPropagation(); toggleAssetSelection(item.key); }}
        ><Check size={12} /></button>
        <span className="asset-gallery-caption"><strong>{item.batch.ratio}</strong><small>{item.batch.time} · {item.batch.model}</small></span>
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
          <img className="brand-mark" src="/goodgood-mark.svg" alt="" />
          <img className="wordmark-image sidebar-wordmark" src="/goodgood-wordmark.svg" alt="" />
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
          <div className="mobile-brand" role="img" aria-label="GoodGood"><img className="brand-mark" src="/goodgood-mark.svg" alt="" /><img className="wordmark-image" src="/goodgood-wordmark.svg" alt="" /></div>
          <button className="top-avatar">LZ</button>
        </header>

        <div className={`content-wrap ${activeView !== "create" ? "asset-content-wrap" : ""}`}>
          {activeView === "create" ? <>
          <section className={`composer ${drawerOpen ? "drawer-open" : ""} ${isGenerating ? "is-generating" : ""}`} aria-label="图像生成区域">
            <div className="prompt-row">
              <div className="reference-control">
                <input ref={referenceInputRef} className="reference-input" type="file" accept="image/*" multiple disabled={referenceImages.length >= 10} onChange={handleReferenceChange} />
                <button className="reference-button" aria-label={referenceImages.length >= 10 ? "参考图片已达到上限" : "上传参考图片，最多 10 张"} disabled={referenceImages.length >= 10} onClick={openReferencePicker}>
                  <ImagePlus size={18} />
                </button>
              </div>
              <textarea
                ref={promptInputRef}
                aria-label="画面描述"
                value={prompt}
                rows={1}
                placeholder="描述你想创作的画面…"
                onChange={(event) => { setPrompt(event.target.value); resizePromptTextarea(event.currentTarget); }}
              />
              <div className="prompt-actions">
                <button
                  className={`prompt-action settings-toggle ${drawerOpen ? "active" : ""}`}
                  aria-label="展开生成参数"
                  aria-expanded={drawerOpen}
                  onClick={() => setDrawerOpen((value) => !value)}
                >
                  <SlidersHorizontal size={18} />
                </button>
                <button className={`send-button ${isGenerating ? "generating" : ""}`} aria-label={isGenerating ? "正在生成图片" : "生成图片"} disabled={isGenerating} onClick={handleGenerate}>
                  <span className="feihong-icon" aria-hidden="true" />
                </button>
              </div>
            </div>

            {referenceImages.length > 0 && (
              <div className="reference-tray" aria-label="已添加的参考图片">
                <div className="reference-thumbnails">
                  {referenceImages.map((image, index) => (
                    <div className="reference-thumbnail" key={image.id} title={image.name}>
                      <img src={image.url} alt={`参考图 ${index + 1}`} />
                      <button className="reference-thumbnail-remove" aria-label={`移除参考图 ${index + 1}`} onClick={() => removeReference(image)}><X size={10} /></button>
                    </div>
                  ))}
                  {referenceImages.length < 10 && <button className="reference-add-more" aria-label="继续添加参考图片" onClick={openReferencePicker}><Plus size={15} /><span>添加</span></button>}
                </div>
              </div>
            )}

            <div className="parameter-drawer" aria-hidden={!drawerOpen}>
              <div className="drawer-overflow">
                <div className="drawer-content">
                  <div className="parameter-group model-group">
                    <label>生成模型</label>
                    <div className="model-selector">
                      <button
                        className={`model-trigger ${modelMenuOpen ? "open" : ""}`}
                        aria-expanded={modelMenuOpen}
                        aria-controls="model-options-drawer"
                        onClick={() => setModelMenuOpen((value) => !value)}
                      >
                        <ModelIcon provider={activeModel.provider} />
                        <span className="model-copy"><strong>{activeModel.name}</strong><small>{activeModel.description}</small></span>
                        {activeModel.recommended && <span className="recommended">推荐</span>}
                        <ChevronDown className="model-chevron" size={15} />
                      </button>
                      <div id="model-options-drawer" className={`model-select-drawer ${modelMenuOpen ? "open" : ""}`} aria-hidden={!modelMenuOpen}>
                        <div className="model-select-overflow">
                          <div className="model-options">
                            {modelOptions.map((model) => (
                              <button
                                key={model.id}
                                className={`model-option ${selectedModel === model.id ? "selected" : ""}`}
                                aria-pressed={selectedModel === model.id}
                                onClick={() => { setSelectedModel(model.id); setModelMenuOpen(false); }}
                              >
                                <ModelIcon provider={model.provider} />
                                <span className="model-copy"><strong>{model.name}</strong><small>{model.description}</small></span>
                                {model.recommended && <span className="recommended">推荐</span>}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="parameter-group ratio-group">
                    <label>画面比例</label>
                    <div className="ratio-control">
                      <svg className="ratio-preview" viewBox="0 0 120 112" role="img" aria-label={`当前画面比例 ${activeRatio.label}`}>
                        <rect x={ratioFrame.guideX} y={ratioFrame.guideY} width={ratioFrame.guideWidth} height={ratioFrame.guideHeight} rx="6" fill="none" stroke="#d6d6dc" strokeWidth="1" strokeDasharray="4 4" />
                        <rect x={ratioFrame.x} y={ratioFrame.y} width={ratioFrame.width} height={ratioFrame.height} rx="6" fill="none" stroke="#50505a" strokeWidth="1.25" />
                        <text x="60" y="59" textAnchor="middle" fill="#3c3c45" fontSize="10">{activeRatio.label}</text>
                      </svg>
                      <div className="ratio-editor">
                        <div className="ratio-modes" aria-label="画面方向">
                          {ratioModes.map(([mode, label]) => (
                            <button key={mode} className={activeRatio.mode === mode ? "selected" : ""} onClick={() => setRatioIndex(ratioDefaults[mode])}>{label}</button>
                          ))}
                        </div>
                        <Slider className="ratio-slider" min={0} max={ratioOptions.length - 1} step={1} value={[ratioIndex]} onValueChange={(value) => setRatioIndex(value[0])} aria-label="调整画面比例" />
                        <div className="ratio-readout"><small>{activeRatio.sizes[resolution]}</small></div>
                      </div>
                    </div>
                  </div>
                  <div className="parameter-group output-group">
                    <div className="output-section">
                      <label>分辨率</label>
                      <div className="resolution-options">
                        {resolutionOptions.map((option) => <button key={option.value} className={resolution === option.value ? "selected" : ""} onClick={() => setResolution(option.value)}>{option.label}</button>)}
                      </div>
                    </div>
                    <div className="output-section">
                      <label>生成数量</label>
                      <div className="choice-row compact">
                        {([1, 2, 4] as GenerationCount[]).map((count) => <button key={count} className={generationCount === count ? "selected" : ""} aria-pressed={generationCount === count} onClick={() => setGenerationCount(count)}>{count}</button>)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {!isGenerating && !hasGenerationError && creationBatches.length === 0 ? (
            <section className="creation-empty-state" aria-label="尚未开始创作">
              <img src="/goodgood-mark.svg" alt="" />
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

              {hasGenerationError && (
                <div className="generation-error-panel stream-error" role="alert">
                  <div className="generation-error-content">
                    <span className="generation-error-icon"><CircleAlert size={21} /></span>
                    <h3>{generationError.title}</h3>
                    <p>{generationError.message}</p>
                    <small>{generationError.code} · {jobMeta.id}</small>
                    <div className="generation-error-actions">
                      <button className="error-retry" onClick={handleGenerate}><RefreshCw size={14} />重新生成</button>
                      <button className="error-settings" onClick={() => { setDrawerOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Settings2 size={14} />修改设置</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="creation-masonry-frame" aria-live="polite">
                <div className="creation-masonry desktop-creation-masonry">{renderCreationColumns(4)}</div>
                <div className="creation-masonry mobile-creation-masonry">{renderCreationColumns(2)}</div>
              </div>
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
                        <img src="/nano-fashion.png" alt={`${project.name} 项目封面`} style={{ objectPosition: project.coverPosition }} />
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
                      const batchRatio = ratioOptions.find((option) => option.label === batch.ratio) ?? ratioOptions[5];
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
                                <img src="/nano-fashion.png" alt={`${batch.id} 生成结果 ${index + 1}`} style={{ objectPosition: image.position }} />
                              </button>
                            ))}
                          </div>
                          <div className="asset-batch-details">
                            <p>{batch.prompt}</p>
                            <div className="asset-batch-meta">
                              <span>{batch.model}</span><span>{batch.ratio}</span><span>{batch.resolution}</span><span>{batch.count} 张</span>{batch.references > 0 && <span>{batch.references} 张参考</span>}
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
                  <img
                    src="/nano-fashion.png"
                    alt={`${activeDetail.batch.model} 生成图片 ${activeDetail.index + 1}`}
                    style={{ objectPosition: activeDetail.image.position }}
                  />
                </div>
              </section>

              <aside className="image-detail-info" aria-label="图片信息">
                <header className="image-detail-info-header">
                  <div>
                    <small>{activeDetail.batch.dateLabel} · {activeDetail.batch.time}</small>
                    <strong>{activeDetail.batch.model}</strong>
                  </div>
                  <div className="image-detail-actions">
                    <button
                      className={savedImages.includes(activeDetail.key) ? "saved" : ""}
                      aria-label={savedImages.includes(activeDetail.key) ? "从资产库移除" : "保存到资产库"}
                      onClick={() => toggleSave(activeDetail.key)}
                    ><Bookmark size={17} fill={savedImages.includes(activeDetail.key) ? "currentColor" : "none"} /></button>
                    <button aria-label="下载图片" onClick={() => downloadImage(activeDetail.batch.id, activeDetail.image.id)}><Download size={17} /></button>
                  </div>
                </header>

                <div className="image-detail-section image-detail-prompt">
                  <span>提示词</span>
                  <p>{activeDetail.batch.prompt}</p>
                </div>

                <div className="image-detail-section">
                  <span>生成参数</span>
                  <dl className="image-detail-parameters">
                    <div><dt>模型</dt><dd>{activeDetail.batch.model}</dd></div>
                    <div><dt>画面比例</dt><dd>{activeDetail.batch.ratio}</dd></div>
                    <div><dt>分辨率</dt><dd>{activeDetail.batch.resolution}</dd></div>
                    <div><dt>批次</dt><dd>{activeDetail.batch.count} 张</dd></div>
                    <div><dt>参考图</dt><dd>{activeDetail.batch.references ? `${activeDetail.batch.references} 张` : "无"}</dd></div>
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
                      <img src="/nano-fashion.png" alt="" style={{ objectPosition: item.image.position }} />
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
                <img src="/nano-fashion.png" alt="项目封面预览" style={{ objectPosition: creationBatches[0]?.images[0]?.position ?? "50% 42%" }} />
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
