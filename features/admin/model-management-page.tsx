"use client";

import { gptPricingQualities } from "@/shared/contracts/gpt-quality-pricing.mjs";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminManagementHeader } from "./admin-management-header";
import {
  Plus,
  RefreshCw,
  Search,
  ChevronDown,
  LoaderCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { GENERATION_MODEL_CATALOG } from "@/features/models/catalog";
import { VIDEO_GENERATION_MODEL_CATALOG } from "@/features/creation/video-generation-options";
import { ModelPricingList } from "./model-pricing-list";
import { VideoTokenPricingEditor } from "./video-token-pricing-editor";
import { PricingDiscountEditor } from "./pricing-discount-editor";
import {
  modelVideoLines,
  SEEDANCE_LINES,
} from "@/shared/contracts/seedance-models.mjs";
import type {
  SeedanceLine,
  ManagedVideoLines,
} from "@/shared/contracts/model-management";
import {
  BANANA_LINES,
  supportsImageLines,
  isBananaLineReady,
  imageLineName,
  modelBananaLines,
} from "@/shared/contracts/banana-lines.mjs";
import type { BananaLine } from "@/shared/contracts/generation";
import type { ManagedBananaLines } from "@/shared/contracts/model-management";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuthenticationGate } from "@/features/auth/authentication-gate";
import { AccountAccessGate } from "@/features/auth/account-access-gate";
import {
  beginAuthentication,
  signOut,
  readAuthenticationSession,
  SESSION_EXPIRED_EVENT,
  type AuthenticationSession,
} from "@/features/auth/http-auth-boundary";
import {
  readModelManagement,
  saveModelManagement,
} from "./http-model-boundary";
import {
  MODEL_TEMPLATES,
  calculateModelQuote,
  creditsToYuan,
  yuanToCredits,
} from "@/shared/contracts/model-pricing.mjs";
import type { ManagedModel } from "@/shared/contracts/model-management";

type DraftPrices = Record<
  string,
  {
    output: string;
    input: string;
    billing?: "tokens";
    qualities?: Record<string, string>;
  }
>;
type DraftLines = Record<BananaLine, { enabled: boolean; prices: DraftPrices }>;
type DraftVideoLines = Record<
  SeedanceLine,
  { enabled: boolean; prices: DraftPrices }
>;
type Draft = {
  id: string;
  name: string;
  description: string;
  adapterId: string;
  enabled: boolean;
  version: number | null;
  prices: DraftPrices;
  lines?: DraftLines;
  videoLines?: DraftVideoLines;
};
function emptyDraftLines(): DraftLines {
  return {
    special: { enabled: true, prices: {} },
    quality: { enabled: false, prices: {} },
    dedicated: { enabled: false, prices: {} },
  };
}
function editablePrices(prices: ManagedModel["prices"]): DraftPrices {
  return Object.fromEntries(
    Object.entries(prices).map(([key, price]) => [
      key,
      {
        output: creditsToYuan(price.output),
        input: creditsToYuan(price.input ?? 0),
        ...(price.billing ? { billing: price.billing } : {}),
        ...(price.qualities
          ? {
              qualities: Object.fromEntries(
                Object.entries(price.qualities).map(([id, amount]) => [
                  id,
                  creditsToYuan(amount),
                ]),
              ),
            }
          : {}),
      },
    ]),
  );
}
const newDraft = (): Draft => ({
  id: `model-${globalThis.crypto.randomUUID()}`,
  name: "",
  description: "",
  adapterId: "nano-banana-2",
  enabled: false,
  version: null,
  prices: {},
  lines: emptyDraftLines(),
});
function editDraft(model: ManagedModel): Draft {
  const lines = modelBananaLines(model);
  const videoLines = modelVideoLines(model);
  return {
    ...model,
    prices: editablePrices(model.prices),
    videoLines: videoLines
      ? (Object.fromEntries(
          SEEDANCE_LINES.map(({ id }) => [
            id,
            {
              enabled: videoLines[id].enabled,
              prices: editablePrices(videoLines[id].prices),
            },
          ]),
        ) as DraftVideoLines)
      : undefined,
    lines: lines
      ? (Object.fromEntries(
          BANANA_LINES.map(({ id }) => [
            id,
            {
              enabled: lines[id].enabled,
              prices: editablePrices(lines[id].prices),
            },
          ]),
        ) as DraftLines)
      : undefined,
  };
}
function parsedPrices(
  draft: Draft,
  line: BananaLine = "special",
  videoLine: SeedanceLine = "standard",
) {
  return Object.fromEntries(
    Object.entries(
      draft.lines
        ? draft.lines[line].prices
        : draft.videoLines
          ? draft.videoLines[videoLine].prices
          : draft.prices,
    )
      .filter(([, price]) => price.output.trim() || price.qualities)
      .map(([key, price]) => [
        key,
        {
          output: price.qualities
            ? Math.max(
                ...Object.values(price.qualities).map((value) =>
                  yuanToCredits(value),
                ),
              )
            : yuanToCredits(price.output),
          ...(price.qualities
            ? {
                qualities: Object.fromEntries(
                  Object.entries(price.qualities).map(([id, value]) => [
                    id,
                    yuanToCredits(value),
                  ]),
                ),
              }
            : {}),
          input: yuanToCredits(price.input || "0"),
          ...(price.billing ? { billing: price.billing } : {}),
        },
      ]),
  );
}

function templateLabel(id: string) {
  return (
    GENERATION_MODEL_CATALOG.find((model) => model.id === id)?.name ??
    VIDEO_GENERATION_MODEL_CATALOG.find((model) => model.id === id)?.name ??
    id
  );
}

export function ModelManagementPage({
  workspaceSession,
  embedded = false,
  onManagementChange,
}: {
  workspaceSession?: AuthenticationSession;
  embedded?: boolean;
  onManagementChange?: () => void;
} = {}) {
  const [standaloneSession, setSession] = useState<
    AuthenticationSession | null | undefined
  >();
  const session = workspaceSession ?? standaloneSession;
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [models, setModels] = useState<readonly ManagedModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [resolution, setResolution] = useState("1K");
  const [pricingLine, setPricingLine] = useState<BananaLine>("special");
  const [videoPricingLine, setVideoPricingLine] =
    useState<SeedanceLine>("standard");
  const [pricingQuality, setPricingQuality] = useState("auto");
  const [count, setCount] = useState("1");
  const refreshSession = useCallback(async () => {
    try {
      setSession(await readAuthenticationSession());
      setSessionError(null);
    } catch (failure) {
      setSessionError(
        failure instanceof Error ? failure.message : "登录状态暂时无法读取。",
      );
    }
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setModels((await readModelManagement()).models);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "模型列表暂时无法读取。",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (workspaceSession) return;
    let active = true;
    void readAuthenticationSession()
      .then((next) => {
        if (active) setSession(next);
      })
      .catch((failure) => {
        if (active)
          setSessionError(
            failure instanceof Error
              ? failure.message
              : "登录状态暂时无法读取。",
          );
      });
    const expire = () => {
      setSession(null);
      setDraft(null);
      setModels([]);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, expire);
    return () => {
      active = false;
      window.removeEventListener(SESSION_EXPIRED_EVENT, expire);
    };
  }, [workspaceSession]);
  useEffect(() => {
    if (
      session?.access.status !== "active" ||
      session.account.role !== "site_owner"
    )
      return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [session, load]);
  const open = (model?: ManagedModel) => {
    const next = model ? editDraft(model) : newDraft();
    setDraft(next);
    setPricingLine("special");
    setVideoPricingLine("standard");
    setPricingQuality("auto");
    setCount("1");
    setMutationError(null);
    setResolution(
      MODEL_TEMPLATES.find((item) => item.id === next.adapterId)!
        .resolutions[0],
    );
  };
  const save = async (nextDraft: Draft) => {
    setSaving(true);
    setMutationError(null);
    setNotice(null);
    try {
      const template = MODEL_TEMPLATES.find(
        (item) => item.id === nextDraft.adapterId,
      )!;
      const result = await saveModelManagement({
        ...nextDraft,
        mediaType: template.mediaType as "image" | "video",
        prices: parsedPrices(nextDraft),
        videoLines: nextDraft.videoLines
          ? (Object.fromEntries(
              SEEDANCE_LINES.map(({ id }) => [
                id,
                {
                  enabled: nextDraft.videoLines![id as SeedanceLine].enabled,
                  prices: parsedPrices(
                    nextDraft,
                    "special",
                    id as SeedanceLine,
                  ),
                },
              ]),
            ) as ManagedVideoLines)
          : undefined,
        lines: nextDraft.lines
          ? (Object.fromEntries(
              BANANA_LINES.map(({ id }) => [
                id,
                {
                  enabled: nextDraft.lines![id as BananaLine].enabled,
                  prices: parsedPrices(nextDraft, id as BananaLine),
                },
              ]),
            ) as ManagedBananaLines)
          : undefined,
      });
      setModels((previous) => [
        ...previous.filter((item) => item.id !== result.model.id),
        result.model,
      ]);
      setDraft(null);
      setNotice(
        `${result.model.name} 已保存。新价格用于新提交，已受理任务保留原报价。`,
      );
      onManagementChange?.();
    } catch (failure) {
      setMutationError(
        failure instanceof Error ? failure.message : "保存失败，输入已保留。",
      );
    } finally {
      setSaving(false);
    }
  };
  const template =
    draft && MODEL_TEMPLATES.find((item) => item.id === draft.adapterId)!;
  const currentPrices = draft?.lines
    ? draft.lines[pricingLine].prices
    : draft?.videoLines
      ? draft.videoLines[videoPricingLine].prices
      : (draft?.prices ?? {});
  const qualities = draft ? gptPricingQualities(draft.adapterId) : [];
  const qualityMode = Object.values(currentPrices).some(
    (price) => price.qualities,
  );
  const replaceCurrentPrices = (prices: DraftPrices) => {
    if (!draft) return;
    setDraft(
      draft.lines
        ? {
            ...draft,
            lines: {
              ...draft.lines,
              [pricingLine]: { ...draft.lines[pricingLine], prices },
            },
          }
        : draft.videoLines
          ? {
              ...draft,
              videoLines: {
                ...draft.videoLines,
                [videoPricingLine]: {
                  ...draft.videoLines[videoPricingLine],
                  prices,
                },
              },
            }
          : { ...draft, prices },
    );
  };
  const toggleQualityMode = (enabled: boolean) => {
    if (!template) return;
    replaceCurrentPrices(
      Object.fromEntries(
        template.resolutions.map((key) => {
          const price = currentPrices[key] ?? { output: "", input: "0" };
          return [
            key,
            {
              output: price.output,
              input: price.input,
              ...(enabled
                ? {
                    qualities: Object.fromEntries(
                      qualities.map((item) => [item.id, price.output]),
                    ),
                  }
                : {}),
            },
          ];
        }),
      ),
    );
  };
  const updateQualityPrice = (key: string, id: string, value: string) => {
    replaceCurrentPrices({
      ...currentPrices,
      [key]: {
        ...currentPrices[key],
        qualities: { ...currentPrices[key]?.qualities, [id]: value },
      },
    });
  };
  const updatePrice = (
    key: string,
    field: "output" | "input",
    value: string,
  ) => {
    if (!draft) return;
    const prices = {
      ...currentPrices,
      [key]: {
        output: currentPrices[key]?.output ?? "",
        input: currentPrices[key]?.input ?? "0",
        [field]: value,
      },
    };
    setDraft(
      draft.lines
        ? {
            ...draft,
            lines: {
              ...draft.lines,
              [pricingLine]: { ...draft.lines[pricingLine], prices },
            },
          }
        : { ...draft, prices },
    );
  };
  let quote: number | null = null;
  if (draft && template) {
    try {
      quote = calculateModelQuote(
        {
          mediaType: template.mediaType,
          prices: parsedPrices(draft, pricingLine),
        },
        {
          resolution,
          quality: pricingQuality,
          count: Number(count),
        },
      );
    } catch {
      /* Incomplete input keeps the calculator quiet until valid. */
    }
  }
  const visible = models.filter(
    (model) =>
      `${model.name} ${model.id}`.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "all" ||
        filter === model.mediaType ||
        filter === (model.enabled ? "enabled" : "disabled")),
  );

  const logout = async () => {
    try {
      const redirecting = await signOut();
      if (!redirecting) {
        setSession(null);
        setDraft(null);
        setModels([]);
      }
    } catch (failure) {
      toast.error(
        failure instanceof Error ? failure.message : "退出登录失败，请重试。",
      );
    }
  };

  if (session === undefined)
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <div role="status" className="text-sm text-zinc-500">
          {sessionError ?? "正在读取登录状态…"}
          {sessionError && (
            <Button variant="ghost" onClick={() => void refreshSession()}>
              重试
            </Button>
          )}
        </div>
      </main>
    );
  if (session === null)
    return (
      <AuthenticationGate
        initialError={sessionError}
        onAuthenticated={refreshSession}
        onHostedLogin={() => beginAuthentication("/admin/models")}
      />
    );
  if (session.access.status !== "active")
    return (
      <AccountAccessGate
        busy={false}
        session={session}
        onLogout={() => void logout()}
        onRefresh={() => void refreshSession()}
      />
    );
  if (session.account.role !== "site_owner")
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <section className="text-center">
          <h1 className="text-xl font-semibold">没有模型管理权限</h1>
          <p className="mt-3 text-sm text-zinc-500">
            只有站长可以设置平台模型和价格。
          </p>
          <Button className="mt-4" variant="ghost" asChild>
            <a href="/create">返回创作</a>
          </Button>
        </section>
      </main>
    );

  return (
    <section
      className={`admin-management-page bg-white text-zinc-950 ${embedded ? "admin-management-embedded" : "min-h-dvh"}`}
      aria-label="模型管理"
    >
      {!embedded && <AdminManagementHeader activePage="models" />}
      <div
        className={
          embedded
            ? "admin-management-content"
            : "mx-auto max-w-[1500px] px-5 py-8 lg:px-8 lg:py-10"
        }
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">模型管理</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              1 元 = 100 积分。图片按张，视频按实际 tokens 用量定价。
            </p>
          </div>
          <Button variant="ghost" onClick={() => open()} disabled={saving}>
            <Plus className="size-4" />
            添加模型
          </Button>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="relative min-w-48 flex-1">
            <Search className="absolute left-3 top-3 size-4 text-zinc-400" />
            <Input
              aria-label="搜索模型"
              className="pl-9"
              placeholder="搜索模型"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-32" aria-label="筛选模型">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部模型</SelectItem>
              <SelectItem value="image">图片模型</SelectItem>
              <SelectItem value="video">视频模型</SelectItem>
              <SelectItem value="enabled">已启用</SelectItem>
              <SelectItem value="disabled">已禁用</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            aria-label="刷新模型列表"
            disabled={loading || saving}
            onClick={() => void load()}
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        {notice && (
          <p role="status" className="mt-4 text-sm text-zinc-600">
            {notice}
          </p>
        )}
        {(error || (!draft && mutationError)) && (
          <div role="alert" className="mt-4 text-sm text-destructive">
            {error ?? mutationError}
            <Button variant="ghost" onClick={() => void load()}>
              重新读取
            </Button>
          </div>
        )}
        {loading ? (
          <p role="status" className="py-12 text-center text-sm text-zinc-500">
            正在读取模型…
          </p>
        ) : (
          <>
            {!visible.length && (
              <p className="py-12 text-center text-sm text-zinc-500">
                {models.length
                  ? "没有匹配的模型。"
                  : "还没有模型，点击添加模型开始配置。"}
              </p>
            )}
            <ModelPricingList
              models={visible}
              busy={saving}
              onEdit={open}
              onToggle={(model) =>
                void save({ ...editDraft(model), enabled: !model.enabled })
              }
            />
          </>
        )}
        <p className="mt-6 text-xs leading-6 text-zinc-400">
          新增条目复用已接入模板的模型和线路。视频价格可配置与试算；当前本地视频预览不扣积分，正式结算尚未接入。
        </p>
      </div>
      <Dialog
        open={draft !== null}
        onOpenChange={(value) => {
          if (!value && !saving) setDraft(null);
        }}
      >
        <DialogContent
          className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl"
          onInteractOutside={(event) => {
            if (saving) event.preventDefault();
          }}
        >
          {draft && template && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void save(draft);
              }}
            >
              <DialogHeader>
                <DialogTitle>
                  {draft.version === null ? "添加模型" : "编辑模型与价格"}
                </DialogTitle>
                <DialogDescription>
                  人民币编辑，积分自动换算。保存后用于新提交的报价。
                </DialogDescription>
              </DialogHeader>
              <fieldset disabled={saving} className="mt-6 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-xs text-zinc-500">
                    <span>模型名称</span>
                    <Input
                      required
                      maxLength={80}
                      value={draft.name}
                      onChange={(event) =>
                        setDraft({ ...draft, name: event.target.value })
                      }
                    />
                  </label>
                  <label className="block space-y-2 text-xs text-zinc-500">
                    <span>简短说明</span>
                    <Input
                      maxLength={200}
                      value={draft.description}
                      onChange={(event) =>
                        setDraft({ ...draft, description: event.target.value })
                      }
                    />
                  </label>
                </div>
                {draft.version === null && (
                  <label className="block space-y-2 text-xs text-zinc-500">
                    <span>使用的模型</span>
                    <Select
                      disabled={draft.version !== null}
                      value={draft.adapterId}
                      onValueChange={(value) => {
                        const next = MODEL_TEMPLATES.find(
                          (item) => item.id === value,
                        )!;
                        setDraft({
                          ...draft,
                          adapterId: value,
                          prices: {},
                          videoLines:
                            next.mediaType === "video"
                              ? {
                                  standard: { enabled: true, prices: {} },
                                  backup: { enabled: true, prices: {} },
                                }
                              : undefined,
                          lines: supportsImageLines(value)
                            ? emptyDraftLines()
                            : undefined,
                          enabled: false,
                        });
                        setResolution(next.resolutions[0]);
                        setPricingLine("special");
                        setVideoPricingLine("standard");
                        setPricingQuality("auto");
                        setCount("1");
                      }}
                    >
                      <SelectTrigger aria-label="使用的模型">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MODEL_TEMPLATES.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {templateLabel(item.id)} ·{" "}
                            {item.mediaType === "image" ? "图片" : "视频"}
                            {item.ready ? "" : " · 线路待开放"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                )}

                {draft.lines && (
                  <section aria-label="线路定价" className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-sm font-medium">线路</h3>
                      <div className="flex gap-1">
                        {BANANA_LINES.map(({ id, name }) => (
                          <Button
                            key={id}
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-pressed={pricingLine === id}
                            className={pricingLine === id ? "bg-zinc-100" : ""}
                            onClick={() => setPricingLine(id as BananaLine)}
                          >
                            {name}
                            {id === "special" ? " · 默认" : ""}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-zinc-500">
                      <input
                        type="checkbox"
                        checked={draft.lines[pricingLine].enabled}
                        disabled={
                          !isBananaLineReady(draft.adapterId, pricingLine)
                        }
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            lines: {
                              ...draft.lines!,
                              [pricingLine]: {
                                ...draft.lines![pricingLine],
                                enabled: event.target.checked,
                              },
                            },
                          })
                        }
                      />
                      启用{imageLineName(pricingLine)}线路
                      {!isBananaLineReady(draft.adapterId, pricingLine) && (
                        <span>接入 ID 待确认</span>
                      )}
                    </label>
                    <p className="text-xs leading-5 text-zinc-400">
                      三条线路分别设置售价。切换查看与编辑，保存时一起生效。
                    </p>
                  </section>
                )}
                {template.mediaType === "video" ? (
                  <VideoTokenPricingEditor
                    pricingTools={
                      <PricingDiscountEditor
                        key={`${draft.id}:${draft.adapterId}`}
                        scope={videoPricingLine}
                        prices={currentPrices}
                        onChange={replaceCurrentPrices}
                      />
                    }
                    resolutions={template.resolutions}
                    prices={currentPrices}
                    onChange={replaceCurrentPrices}
                    line={videoPricingLine}
                    onLineChange={setVideoPricingLine}
                    enabled={
                      draft.videoLines?.[videoPricingLine].enabled ?? true
                    }
                    onEnabledChange={(enabled) =>
                      setDraft({
                        ...draft,
                        videoLines: {
                          ...(draft.videoLines ?? {
                            standard: { enabled: true, prices: draft.prices },
                            backup: { enabled: true, prices: draft.prices },
                          }),
                          [videoPricingLine]: {
                            enabled,
                            prices: currentPrices,
                          },
                        },
                      })
                    }
                  />
                ) : (
                  <div>
                    <div className="mb-5">
                      <PricingDiscountEditor
                        key={`${draft.id}:${draft.adapterId}`}
                        scope={pricingLine}
                        prices={currentPrices}
                        onChange={replaceCurrentPrices}
                      />
                    </div>
                    <h3 className="text-sm font-medium">规格售价</h3>
                    <p className="mt-1 text-xs text-zinc-500">
                      {template.mediaType === "image"
                        ? "每张图片售价，可为不同分辨率分别设置。"
                        : "每秒输出视频售价；参考视频按输入秒加价，没有参考视频时不收输入费用。"}
                    </p>
                    {qualities.length > 0 && (
                      <label className="mt-3 flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={qualityMode}
                          onChange={(event) =>
                            toggleQualityMode(event.target.checked)
                          }
                        />
                        按质量分别定价
                      </label>
                    )}
                    {qualityMode && (
                      <p className="mt-2 text-xs leading-5 text-zinc-500">
                        自动质量按最高档计价。各分辨率需填齐全部质量价格，精度为
                        ¥0.01（1 积分）。
                      </p>
                    )}
                    <div
                      className={`mt-4 grid gap-3 ${template.mediaType === "image" ? "grid-cols-3" : "sm:grid-cols-2"}`}
                    >
                      {template.resolutions.map((key) => (
                        <section
                          key={key}
                          aria-label={`${key} 售价设置`}
                          className="min-w-0 rounded-xl bg-zinc-50 p-3"
                        >
                          <h4 className="mb-3 text-xs font-medium">{key}</h4>
                          <div
                            className={
                              template.mediaType === "video"
                                ? "grid grid-cols-2 gap-3"
                                : ""
                            }
                          >
                            {qualityMode ? (
                              <div className="space-y-3">
                                {qualities.map((item) => (
                                  <label
                                    key={item.id}
                                    className="block min-w-0"
                                  >
                                    <span className="mb-1.5 block text-[11px] text-zinc-500">
                                      {item.name} · {item.id} / 元
                                    </span>
                                    <Input
                                      aria-label={`${key} ${item.id} 售价`}
                                      className="bg-white px-2 tabular-nums"
                                      inputMode="decimal"
                                      placeholder="未定价"
                                      value={
                                        currentPrices[key]?.qualities?.[
                                          item.id
                                        ] ?? ""
                                      }
                                      onChange={(event) =>
                                        updateQualityPrice(
                                          key,
                                          item.id,
                                          event.target.value,
                                        )
                                      }
                                    />
                                  </label>
                                ))}
                              </div>
                            ) : (
                              <label className="block min-w-0">
                                <span className="mb-1.5 block text-[11px] text-zinc-500">
                                  {template.mediaType === "image"
                                    ? "每张 / 元"
                                    : "输出秒 / 元"}
                                </span>
                                <Input
                                  aria-label={`${key} 输出售价`}
                                  className="bg-white px-2 tabular-nums"
                                  inputMode="decimal"
                                  placeholder="未定价"
                                  value={currentPrices[key]?.output ?? ""}
                                  onChange={(event) =>
                                    updatePrice(
                                      key,
                                      "output",
                                      event.target.value,
                                    )
                                  }
                                />
                                <span className="mt-2 block text-[11px] text-zinc-400">
                                  {(() => {
                                    try {
                                      return `${yuanToCredits(currentPrices[key]?.output ?? "")} 积分/${template.mediaType === "image" ? "张" : "秒"}`;
                                    } catch {
                                      return "—";
                                    }
                                  })()}
                                </span>
                              </label>
                            )}
                            {template.mediaType === "video" && (
                              <label className="block min-w-0">
                                <span className="mb-1.5 block text-[11px] text-zinc-500">
                                  参考秒 / 元
                                </span>
                                <Input
                                  aria-label={`${key} 参考视频秒价`}
                                  className="bg-white px-2 tabular-nums"
                                  inputMode="decimal"
                                  value={currentPrices[key]?.input ?? "0"}
                                  onChange={(event) =>
                                    updatePrice(
                                      key,
                                      "input",
                                      event.target.value,
                                    )
                                  }
                                />
                                <span className="mt-2 block text-[11px] text-zinc-400">
                                  {(() => {
                                    try {
                                      return `${yuanToCredits(currentPrices[key]?.input || "0")} 积分/秒`;
                                    } catch {
                                      return "—";
                                    }
                                  })()}
                                </span>
                              </label>
                            )}
                          </div>
                        </section>
                      ))}
                    </div>
                  </div>
                )}
                {template.mediaType === "image" && (
                  <section className="rounded-2xl bg-zinc-50 p-4">
                    <h3 className="text-sm font-medium">价格试算</h3>
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Select value={resolution} onValueChange={setResolution}>
                        <SelectTrigger aria-label="试算分辨率">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {template.resolutions.map((key) => (
                            <SelectItem key={key} value={key}>
                              {key}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {qualityMode && (
                        <Select
                          value={pricingQuality}
                          onValueChange={setPricingQuality}
                        >
                          <SelectTrigger aria-label="试算质量">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">自动（最高档）</SelectItem>
                            {qualities.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name} · {item.id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <Select value={count} onValueChange={setCount}>
                        <SelectTrigger aria-label="试算数量">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 4].map((value) => (
                            <SelectItem
                              key={value}
                              value={String(value)}
                              disabled={
                                draft.adapterId === "nano-banana-pro" &&
                                value !== 1
                              }
                            >
                              {value}{" "}
                              {template.mediaType === "image" ? "张" : "条"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p aria-live="polite" className="mt-4 text-sm">
                      {quote === null
                        ? "填写有效价格和参数后显示总价。"
                        : `合计 ¥${creditsToYuan(quote)} · ${quote} 积分`}
                    </p>
                  </section>
                )}
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    disabled={!template.ready}
                    checked={draft.enabled}
                    onChange={(event) =>
                      setDraft({ ...draft, enabled: event.target.checked })
                    }
                  />
                  启用模型
                  <span className="text-xs text-zinc-400">
                    {draft.lines
                      ? "须启用线路并填齐其规格售价"
                      : "须填齐全部规格售价"}
                  </span>
                </label>
                <Collapsible className="pt-1">
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="px-0 text-xs text-zinc-400 [&[data-state=open]>svg]:rotate-180"
                    >
                      接入详情
                      <ChevronDown className="size-3.5 transition-transform motion-reduce:transition-none" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-3 text-xs text-zinc-500">
                    <p className="leading-5">
                      内部编号由系统自动生成，用于关联价格、创作和历史记录。它不是上游
                      API 模型名，保存后保持不变。
                    </p>
                    <dl className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-3 gap-y-2">
                      <dt>使用的模型</dt>
                      <dd>{templateLabel(draft.adapterId)}</dd>
                      <dt>内部编号</dt>
                      <dd className="break-all font-mono text-[11px]">
                        {draft.id}
                      </dd>
                      {draft.version !== null && (
                        <>
                          <dt>配置版本</dt>
                          <dd>{draft.version}</dd>
                        </>
                      )}
                    </dl>
                  </CollapsibleContent>
                </Collapsible>
              </fieldset>
              {mutationError && (
                <p role="alert" className="mt-4 text-sm text-destructive">
                  {mutationError}{" "}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void load()}
                  >
                    刷新列表
                  </Button>
                </p>
              )}
              <div className="mt-6 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={saving}
                  onClick={() => setDraft(null)}
                >
                  取消
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <LoaderCircle className="size-4 animate-spin" />}
                  {saving ? "正在保存…" : "保存并生效"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
