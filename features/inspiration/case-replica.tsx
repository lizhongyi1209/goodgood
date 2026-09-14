"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import { CreationComposer } from "@/features/creation/creation-composer";
import { createHttpGenerationBoundary } from "@/features/creation/http-generation-boundary";
import {
  readBillingSummary,
  findBillingQuote,
} from "@/features/billing/http-billing-boundary";
import { uploadReferenceFiles } from "@/features/references/http-reference-upload";
import {
  listReferenceMaterials,
  type ReferenceMaterial,
} from "@/features/references/http-reference-library";
import type { BillingSummary } from "@/shared/contracts/billing";
import type {
  GenerationInputSnapshot,
  GenerationJob,
  GenerationReference,
  GenerationModelId,
} from "@/shared/contracts/generation";
import {
  inspirationRequest,
  type UseCaseResult,
} from "./http-inspiration-boundary";
import { InspirationReadState } from "./inspiration-board";
import "./inspiration.css";

export function CaseReplica({
  caseId,
  onReturn,
  onCompleted,
}: {
  caseId: string;
  onReturn: () => void;
  onCompleted: () => void;
}) {
  const [recipe, setRecipe] = useState<GenerationInputSnapshot | null>(null),
    [title, setTitle] = useState(""),
    [referenceCount, setReferenceCount] = useState(0);
  const [prompt, setPrompt] = useState(""),
    [references, setReferences] = useState<GenerationReference[]>([]),
    [drawer, setDrawer] = useState(false);
  const [summary, setSummary] = useState<BillingSummary | null>(null),
    [readError, setReadError] = useState<string | null>(null),
    [actionError, setActionError] = useState<string | null>(null),
    [revision, setRevision] = useState(0);
  const [jobs, setJobs] = useState<GenerationJob[]>([]),
    [busy, setBusy] = useState(false),
    [libraryOpen, setLibraryOpen] = useState(false),
    [materials, setMaterials] = useState<readonly ReferenceMaterial[] | null>(
      null,
    ),
    [libraryError, setLibraryError] = useState<string | null>(null);
  const boundary = useMemo(
    () => createHttpGenerationBoundary(null, caseId),
    [caseId],
  );
  useEffect(() => {
    let active = true;
    void Promise.all([
      inspirationRequest<UseCaseResult>(`/${caseId}/use`, {}),
      readBillingSummary(),
    ])
      .then(([value, billing]) => {
        if (active) {
          if (value.promptVisibility !== "hidden")
            throw Error("案例已改为公开提示词，请返回灵感板重新使用。");
          setRecipe(value.recipe);
          setTitle(value.title);
          setReferenceCount(value.referenceCount);
          setSummary(billing);
          setReadError(null);
        }
      })
      .catch((failure) => {
        if (active)
          setReadError(
            failure instanceof Error ? failure.message : "预设暂时不可用。",
          );
      });
    return () => {
      active = false;
    };
  }, [caseId, revision]);
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (busy || prompt.trim() || references.length) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [busy, prompt, references]);
  const quote = recipe ? findBillingQuote(summary, recipe) : null,
    managedModel = summary?.models?.find(
      (item) => item.id === (recipe?.catalogModelId ?? recipe?.modelId),
    );
  function update(value: Partial<GenerationInputSnapshot>) {
    setRecipe((old) => (old ? { ...old, ...value } : old));
  }
  async function addFiles(files: readonly File[]) {
    const selected = files
      .slice(0, 10 - references.length)
      .map((file) => ({ clientId: crypto.randomUUID(), file }));
    setReferences((old) => [
      ...old,
      ...selected.map((item) => ({
        id: item.clientId,
        url: "",
        name: item.file.name,
        status: "uploading" as const,
      })),
    ]);
    const ids = new Map(selected.map((item) => [item.clientId, item.clientId]));
    await uploadReferenceFiles(selected, (clientId, reference) => {
      const prior = ids.get(clientId);
      ids.set(clientId, reference.id);
      setReferences((old) =>
        old.map((item) => (item.id === prior ? reference : item)),
      );
    });
  }
  async function openLibrary() {
    setLibraryOpen(true);
    setMaterials(null);
    setLibraryError(null);
    try {
      setMaterials(await listReferenceMaterials());
    } catch (failure) {
      setLibraryError(
        failure instanceof Error ? failure.message : "读取素材失败。",
      );
    }
  }
  function observe(job: GenerationJob) {
    setJobs((old) => {
      const next = old.filter(
        (item) =>
          !item.id.startsWith("pending_") || job.id.startsWith("pending_"),
      );
      return next.some((item) => item.id === job.id)
        ? next.map((item) => (item.id === job.id ? job : item))
        : [job, ...next];
    });
  }
  async function generate() {
    if (!recipe || busy) return;
    setActionError(null);
    if (!quote) {
      setActionError("该模型或线路暂不可用，请调整参数或刷新报价。");
      return;
    }
    if (references.some((item) => item.status !== "ready")) {
      setActionError("请等待参考图上传完成，或移除失败的图片。");
      return;
    }
    if (
      BigInt(summary?.account.availableCredits ?? "0") <
      BigInt(quote.creditAmount)
    ) {
      setActionError("积分不足，请先补充积分。");
      return;
    }
    if (prompt.length > 4000) {
      setActionError("补充提示词最多 4000 个字符。");
      return;
    }
    setBusy(true);
    const job = await boundary.service.submit(
      {
        ...recipe,
        prompt,
        references,
        expectedPriceVersion: quote.priceVersion,
      },
      observe,
    );
    setBusy(false);
    if (job.state === "succeeded") {
      onCompleted();
      toast.success("生成完成，已保存到资产库");
    }
    const billing = await readBillingSummary().catch(() => null);
    setSummary(billing);
  }
  async function retry(job: GenerationJob) {
    if (busy) return;
    setBusy(true);
    const result = job.id.startsWith("pending_")
      ? await boundary.service.submit(job.input, observe)
      : await boundary.retry(job, observe);
    setBusy(false);
    if (result.state === "succeeded") onCompleted();
    setSummary(await readBillingSummary().catch(() => null));
  }
  return (
    <section className="case-replica" aria-label="复刻预设效果">
      <header className="case-page-heading">
        <button onClick={onReturn} disabled={busy}>
          <ArrowLeft size={16} />
          返回灵感板
        </button>
        <h1>{title || "复刻预设效果"}</h1>
        <p>上传自己的图片，使用预设完成创作。</p>
      </header>
      {!recipe ? (
        <InspirationReadState
          loading={!readError}
          error={readError}
          onRetry={() => {
            setReadError(null);
            setRevision((value) => value + 1);
          }}
        />
      ) : (
        <>
          <div className="case-preset-note">
            <strong>预设 · 提示词隐藏</strong>仅可补充要求，也可留空。
            {referenceCount > 0 && ` 原作使用了 ${referenceCount} 张参考图。`}
          </div>
          <CreationComposer
            modelOptions={summary?.models
              ?.filter((model) => model.mediaType === "image")
              .map((model) => ({
                id: model.adapterId as GenerationModelId,
                catalogId: model.id,
                name: model.name,
                description: model.description,
                recommended: model.id === 'nano-banana-2',
                icon: model.adapterId.startsWith("nano") ? "nano" : "openai",
              }))}
            onCatalogModelChange={(id, modelId) =>
              update({
                modelId,
                catalogModelId: id,
                aspectRatio: "1:1",
                count: 1,
                quality: "auto",
                background: "auto",
                outputFormat: "png",
              })
            }
            showModeSwitch={false}
            promptLabel="补充提示词（选填）"
            promptPlaceholder="补充你的要求，或留空直接使用预设…"
            mode="image"
            prompt={prompt}
            references={references}
            modelId={recipe.modelId}
            catalogModelId={recipe.catalogModelId}
            managedModel={managedModel}
            imageLine={recipe.imageLine}
            aspectRatio={recipe.aspectRatio}
            resolution={recipe.resolution}
            count={recipe.count}
            googleSearch={recipe.googleSearch}
            quality={recipe.quality}
            background={recipe.background}
            outputFormat={recipe.outputFormat}
            drawerOpen={drawer}
            isGenerating={busy}
            billingLabel={quote ? `${quote.creditAmount} 积分/批` : "暂不可用"}
            billingDescription={
              quote
                ? `本批 ${quote.creditAmount} 积分，可用 ${summary?.account.availableCredits ?? "0"} 积分`
                : "无可用报价"
            }
            onPromptChange={setPrompt}
            onModeChange={() => {}}
            onReferenceFiles={(files) => void addFiles(files)}
            onOpenReferenceLibrary={() => void openLibrary()}
            onRemoveReference={(reference) =>
              setReferences((old) =>
                old.filter((item) => item.id !== reference.id),
              )
            }
            onReorderReference={(sourceId, targetId) =>
              setReferences((old) => {
                const next = [...old],
                  source = next.findIndex((item) => item.id === sourceId),
                  target = next.findIndex((item) => item.id === targetId);
                if (source >= 0 && target >= 0)
                  next.splice(target, 0, ...next.splice(source, 1));
                return next;
              })
            }
            onModelChange={(modelId) =>
              update({
                modelId,
                catalogModelId: modelId,
                aspectRatio: "1:1",
                count: 1,
                quality: "auto",
                background: "auto",
                outputFormat: "png",
              })
            }
            onImageLineChange={(imageLine) => update({ imageLine })}
            onAspectRatioChange={(aspectRatio) => update({ aspectRatio })}
            onResolutionChange={(resolution) => update({ resolution })}
            onCountChange={(count) => update({ count })}
            onGoogleSearchChange={(googleSearch) => update({ googleSearch })}
            onQualityChange={(quality) => update({ quality })}
            onBackgroundChange={(background) => update({ background })}
            onOutputFormatChange={(outputFormat) => update({ outputFormat })}
            onDrawerOpenChange={setDrawer}
            onGenerate={() => void generate()}
          />
          {actionError && (
            <div role="alert" className="inspiration-action-error">
              {actionError}
              <button
                onClick={() =>
                  void readBillingSummary()
                    .then(setSummary)
                    .catch(() => setActionError("报价读取失败，请重试。"))
                }
              >
                刷新报价
              </button>
            </div>
          )}
          {jobs.map((job) => (
            <div key={job.id}>
              {["queued", "running", "refining"].includes(job.state) && (
                <p role="status">正在生成预设效果…</p>
              )}
              {job.state === "failed" && (
                <div role="alert" className="inspiration-action-error">
                  {job.error?.message ?? "生成失败，输入已保留。"}
                  <button disabled={busy} onClick={() => void retry(job)}>
                    重试
                  </button>
                </div>
              )}
              <div className="case-replica-results">
                {job.outputs.map((output) => (
                  <PrivateObjectImage
                    key={output.id}
                    src={output.previewUrl}
                    alt={`${title} · 复刻结果`}
                  />
                ))}
              </div>
            </div>
          ))}
        </>
      )}
      <Sheet open={libraryOpen} onOpenChange={setLibraryOpen}>
        <SheetContent className="case-detail-sheet">
          <SheetHeader>
            <SheetTitle>选择自己的参考图</SheetTitle>
            <SheetDescription>
              原案例的参考图不会自动用于你的生成。
            </SheetDescription>
          </SheetHeader>
          {!materials ? (
            <InspirationReadState
              loading={!libraryError}
              error={libraryError}
              onRetry={() => void openLibrary()}
            />
          ) : materials.length === 0 ? (
            <p>暂无上传素材</p>
          ) : (
            <div className="case-library-grid">
              {materials.map((item) => (
                <button
                  key={item.id}
                  aria-label={`添加参考图：${item.name}`}
                  disabled={
                    references.length >= 10 ||
                    references.some((ref) => ref.id === item.id)
                  }
                  onClick={() => {
                    setReferences((old) => [
                      ...old,
                      {
                        id: item.id,
                        url: item.url,
                        name: item.name,
                        status: "ready",
                      },
                    ]);
                    setLibraryOpen(false);
                  }}
                >
                  <PrivateObjectImage src={item.url} alt={item.name} />
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}
