"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useNodesState, type ReactFlowInstance } from "@xyflow/react";
import { ArrowLeft, ArrowUp, ImagePlus, LoaderCircle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AccountAccessGate } from "@/features/auth/account-access-gate";
import { authenticationEntryPath } from "@/features/auth/authentication-navigation";
import {
  readAuthenticationSession,
  SESSION_EXPIRED_EVENT,
  signOut,
  type AuthenticationSession,
} from "@/features/auth/http-auth-boundary";
import { findBillingQuote, readBillingSummary } from "@/features/billing/http-billing-boundary";
import { createHttpGenerationBoundary } from "@/features/creation/http-generation-boundary";
import {
  getGenerationCountOptions,
  getGenerationRatioOptions,
  resolveGenerationAspectRatioForModel,
  resolveGenerationCountForModel,
} from "@/features/creation/generation-options";
import { createGenerationInputSnapshot } from "@/features/creation/generation-snapshot";
import { GENERATION_MODEL_CATALOG } from "@/features/models/catalog";
import { uploadReferenceFiles } from "@/features/references/http-reference-upload";
import type { BillingSummary } from "@/shared/contracts/billing";
import {
  GENERATION_RESOLUTIONS,
  MAX_GENERATION_REFERENCES,
  type GenerationAspectRatio,
  type GenerationCount,
  type GenerationInputSnapshot,
  type GenerationJob,
  type GenerationModelId,
  type GenerationReference,
  type GenerationResolution,
} from "@/shared/contracts/generation";
import { PRIVATE_IMAGE_MIME_TYPES, PRIVATE_IMAGE_UPLOAD_MAX_BYTES } from "@/shared/contracts/upload-limits.mjs";
import { CanvasWorkspace, type CanvasNode } from "./canvas-workspace";
import { upsertCanvasJobNodes } from "./canvas-job-nodes.mjs";
import styles from "./canvas-page.module.css";

type CanvasReference = {
  clientId: string;
  file: File;
  previewUrl: string;
  reference: GenerationReference;
};

type CanvasModel = {
  id: GenerationModelId;
  catalogId?: string;
  name: string;
};

const generationBoundary = createHttpGenerationBoundary();

function availableModels(summary: BillingSummary | null): CanvasModel[] {
  if (!summary) return [];
  const quoted = (modelId: GenerationModelId, catalogId?: string) =>
    summary.quotes.some((quote) =>
      quote.modelId === modelId &&
      (quote.catalogModelId ?? quote.modelId) === (catalogId ?? modelId) &&
      (quote.imageLine ?? "special") === "special" &&
      (quote.quality === undefined || quote.quality === "auto"),
    );
  if (summary.models) {
    return summary.models
      .filter((model) => model.enabled && model.mediaType === "image")
      .filter((model) => GENERATION_MODEL_CATALOG.some((item) => item.id === model.adapterId))
      .map((model) => ({ id: model.adapterId as GenerationModelId, catalogId: model.id, name: model.name }))
      .filter((model) => quoted(model.id, model.catalogId));
  }
  return GENERATION_MODEL_CATALOG
    .filter((model) => quoted(model.id))
    .map((model) => ({ id: model.id, name: model.name }));
}

export function CanvasPage() {
  const [session, setSession] = useState<AuthenticationSession | null | undefined>();
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [references, setReferences] = useState<CanvasReference[]>([]);
  const [modelKey, setModelKey] = useState<string | null>(null);
  const [ratio, setRatio] = useState<GenerationAspectRatio>("1:1");
  const [resolution, setResolution] = useState<GenerationResolution>("1K");
  const [count, setCount] = useState<GenerationCount>(1);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>([]);
  const [flow, setFlow] = useState<ReactFlowInstance<CanvasNode> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef(new Set<string>());
  const busyRef = useRef(false);

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
    const objectUrls = objectUrlsRef.current;
    return () => objectUrls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const models = useMemo(() => availableModels(billing), [billing]);
  const model = models.find((item) => (item.catalogId ?? item.id) === modelKey) ?? models[0];
  const selectedRatio = model ? resolveGenerationAspectRatioForModel(model.id, ratio) : ratio;
  const selectedCount = model ? resolveGenerationCountForModel(model.id, count) : count;
  const pricedResolutions = model
    ? GENERATION_RESOLUTIONS.filter((value) => Boolean(findBillingQuote(billing, {
        modelId: model.id,
        catalogModelId: model.catalogId,
        count: selectedCount,
        resolution: value,
      })))
    : [];
  const selectedResolution = pricedResolutions.includes(resolution) ? resolution : pricedResolutions[0];
  const quote = model && selectedResolution
    ? findBillingQuote(billing, {
        modelId: model.id,
        catalogModelId: model.catalogId,
        count: selectedCount,
        resolution: selectedResolution,
      })
    : null;
  const referencesBusy = references.some((item) => item.reference.status === "uploading");
  const referencesFailed = references.some((item) => item.reference.status === "failed");
  const insufficientCredits = Boolean(
    quote && billing && BigInt(billing.account.availableCredits) < BigInt(quote.creditAmount),
  );
  const canGenerate = Boolean(
    session?.access.status === "active" && !session.preview && quote &&
    prompt.trim() && !referencesBusy && !referencesFailed && !insufficientCredits &&
    !billingLoading && !billingError && !submitting,
  );

  const upload = (items: CanvasReference[]) => {
    void uploadReferenceFiles(items.map(({ clientId, file }) => ({ clientId, file })), (clientId, reference) => {
      setReferences((current) => current.map((item) => item.clientId === clientId
        ? { ...item, reference: { ...reference, url: item.previewUrl } }
        : item));
    });
  };

  const addReferences = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    const accepted: CanvasReference[] = [];
    for (const file of files) {
      if (references.length + accepted.length >= MAX_GENERATION_REFERENCES) {
        setFormError(`最多可添加 ${MAX_GENERATION_REFERENCES} 张参考图。`);
        break;
      }
      if (!PRIVATE_IMAGE_MIME_TYPES.includes(file.type) || file.size < 1 || file.size > PRIVATE_IMAGE_UPLOAD_MAX_BYTES) {
        setFormError(`${file.name} 无法上传。请选择 20 MB 以内的 JPEG 或 PNG 图片。`);
        continue;
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
    setReferences((current) => [...current, ...accepted]);
    upload(accepted);
  };

  const removeReference = (clientId: string) => {
    setReferences((current) => {
      const removed = current.find((item) => item.clientId === clientId);
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
        objectUrlsRef.current.delete(removed.previewUrl);
      }
      return current.filter((item) => item.clientId !== clientId);
    });
  };

  const retryReference = (clientId: string) => {
    const item = references.find((value) => value.clientId === clientId);
    if (!item) return;
    setReferences((current) => current.map((value) => value.clientId === clientId
      ? { ...value, reference: { ...value.reference, status: "uploading", errorMessage: undefined } }
      : value));
    upload([item]);
  };

  const runJob = async (snapshot: GenerationInputSnapshot, previous?: { runKey: string; job: GenerationJob }) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setSubmitting(true);
    setFormError(null);
    const runKey = previous?.runKey ?? globalThis.crypto.randomUUID();
    const visibleCenter = flow?.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight * 0.38 }) ?? { x: 0, y: 0 };
    const rowBottom = nodes.reduce((bottom, node) => Math.max(bottom, node.position.y + 350), visibleCenter.y - 120);
    const previousPosition = previous && nodes.find((node) => node.id === `canvas-${runKey}-0`)?.position;
    const origin = previousPosition ?? {
      x: visibleCenter.x - (snapshot.count * 254 - 16) / 2,
      y: nodes.length ? rowBottom + 24 : visibleCenter.y - 120,
    };
    const observe = (job: GenerationJob) => {
      setNodes((current) => upsertCanvasJobNodes(current, runKey, job, origin, () => void runJob(job.input, { runKey, job })));
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
      setSubmitting(false);
    }
  };

  const generate = () => {
    if (session?.access.status !== "active" || session.preview || busyRef.current) return;
    if (!prompt.trim()) { setFormError("请先输入画面描述。"); return; }
    if (prompt.length > 4_000) { setFormError("画面描述不能超过 4000 个字符。"); return; }
    if (referencesBusy) { setFormError("参考图仍在上传，请稍候。"); return; }
    if (referencesFailed) { setFormError("请重试或移除上传失败的参考图。"); return; }
    if (billingLoading || billingError || !model || !selectedResolution || !quote) { setFormError("当前模型报价不可用，请刷新后重试。"); return; }
    if (insufficientCredits) { setFormError("可用积分不足，请先补充积分。"); return; }
    const snapshot = createGenerationInputSnapshot({
      prompt,
      references: references.map((item) => item.reference),
      modelId: model.id,
      catalogModelId: model.catalogId,
      expectedPriceVersion: quote.priceVersion,
      aspectRatio: selectedRatio,
      resolution: selectedResolution,
      count: selectedCount,
      projectId: null,
    });
    void runJob(snapshot);
  };

  if (session && session.access.status !== "active") {
    return <AccountAccessGate session={session} onRefresh={() => void refreshSession()} onLogout={() => void signOut()} />;
  }

  return (
    <main className={styles.page}>
      <CanvasWorkspace nodes={nodes} onInit={setFlow} onNodesChange={onNodesChange} />
      <header className={styles.header}>
        <a className={styles.back} href="/create" aria-label="返回创作"><ArrowLeft size={18} /></a>
        <Image src="/goodgood-wordmark.svg" alt="GoodGood" width={87} height={20} />
        <span className={styles.headerDivider} aria-hidden="true" />
        <span className={styles.headerTitle}>画布创作</span>
        <span className={styles.headerSpacer} />
        {billing && <span className={styles.balance}>{billing.account.availableCredits} 积分</span>}
      </header>

      <section className={styles.composer} aria-label="图片生成工具">
        {references.length > 0 && (
          <div className={styles.referenceTray} aria-label="参考图">
            {references.map((item) => (
              <div className={styles.reference} key={item.clientId}>
                <PrivateObjectImage src={item.previewUrl} alt={item.reference.name} />
                {item.reference.status === "uploading" && <span className={styles.referenceStatus} aria-label="上传中"><LoaderCircle size={13} /></span>}
                {item.reference.status === "failed" && <button type="button" className={styles.referenceRetry} onClick={() => retryReference(item.clientId)} aria-label={`重试上传 ${item.reference.name}`}>重试</button>}
                <button type="button" className={styles.referenceRemove} onClick={() => removeReference(item.clientId)} aria-label={`移除 ${item.reference.name}`}><X size={11} /></button>
              </div>
            ))}
          </div>
        )}
        <label className={styles.srOnly} htmlFor="canvas-prompt">画面描述</label>
        <Textarea
          id="canvas-prompt"
          className={styles.prompt}
          placeholder="描述你想生成的画面…"
          value={prompt}
          maxLength={4000}
          onChange={(event) => {
            setPrompt(event.target.value);
            event.target.style.height = "auto";
            event.target.style.height = `${Math.min(event.target.scrollHeight, 188)}px`;
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              generate();
            }
          }}
        />
        <div className={styles.tools}>
          <input ref={inputRef} className={styles.srOnly} type="file" accept="image/jpeg,image/png" multiple onChange={addReferences} aria-label="选择参考图" />
          <Button type="button" variant="ghost" size="icon-sm" title="添加参考图" aria-label="添加参考图" disabled={references.length >= MAX_GENERATION_REFERENCES} onClick={() => inputRef.current?.click()}>
            <ImagePlus size={17} />
          </Button>
          <Select value={model ? (model.catalogId ?? model.id) : ""} onValueChange={setModelKey} disabled={!models.length}>
            <SelectTrigger size="sm" className={styles.modelSelect} aria-label="模型"><SelectValue placeholder={billingLoading ? "读取模型" : "暂无模型"} /></SelectTrigger>
            <SelectContent>{models.map((item) => <SelectItem key={item.catalogId ?? item.id} value={item.catalogId ?? item.id}>{item.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={selectedRatio} onValueChange={(value) => setRatio(value as GenerationAspectRatio)} disabled={!model}>
            <SelectTrigger size="sm" className={styles.smallSelect} aria-label="画面比例"><SelectValue /></SelectTrigger>
            <SelectContent>{model && getGenerationRatioOptions(model.id).map((item) => <SelectItem key={item.id} value={item.id}>{item.id}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={selectedResolution ?? ""} onValueChange={(value) => setResolution(value as GenerationResolution)} disabled={!pricedResolutions.length}>
            <SelectTrigger size="sm" className={styles.smallSelect} aria-label="分辨率"><SelectValue placeholder="分辨率" /></SelectTrigger>
            <SelectContent>{pricedResolutions.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(selectedCount)} onValueChange={(value) => setCount(Number(value) as GenerationCount)} disabled={!model}>
            <SelectTrigger size="sm" className={styles.countSelect} aria-label="生成数量"><SelectValue /></SelectTrigger>
            <SelectContent>{model && getGenerationCountOptions(model.id).map((value) => <SelectItem key={value} value={String(value)}>{value} 张</SelectItem>)}</SelectContent>
          </Select>
          <span className={styles.toolSpacer} />
          <Button type="button" className={styles.generate} disabled={!canGenerate} onClick={generate} aria-label="生成图片">
            {submitting ? <LoaderCircle size={16} className={styles.loadingIcon} /> : <ArrowUp size={16} />}
            <span>生成</span>
          </Button>
        </div>
        {(formError || billingError || sessionError || insufficientCredits || session?.preview) && (
          <div className={styles.message} role="alert">
            <span>{formError ?? billingError ?? sessionError ?? (session?.preview ? "预览模式无法提交生成任务。" : "可用积分不足。")}</span>
            {billingError && <button type="button" onClick={() => void refreshBilling()}>重试读取</button>}
            {sessionError && <button type="button" onClick={() => void refreshSession()}>重试登录</button>}
          </div>
        )}
        {!formError && !billingError && !sessionError && !insufficientCredits && !session?.preview && (
          <div className={styles.quote} aria-live="polite">
            {billingLoading ? "正在读取报价" : quote ? `本次 ${quote.creditAmount} 积分` : "当前规格暂无报价"}
          </div>
        )}
      </section>
    </main>
  );
}
