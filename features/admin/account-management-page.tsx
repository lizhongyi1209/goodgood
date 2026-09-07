"use client";

import Image from "next/image";
import {
  ArrowLeft,
  CheckCircle2,
  Coins,
  Eye,
  LoaderCircle,
  LogIn,
  LogOut,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldBan,
  Trash2,
  TriangleAlert,
  UserRoundCog,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import { AccountAccessGate } from "@/features/auth/account-access-gate";
import {
  SESSION_EXPIRED_EVENT,
  beginAuthentication,
  readAuthenticationSession,
  signOut,
  type AuthenticationSession,
} from "@/features/auth/http-auth-boundary";
import {
  createManagedAccountDeletionRequest,
  grantManagedAccountTestCredits,
  readAdminDashboard,
  updateManagedAccountStatus,
  type AccountDeletionRequest,
  type AdministrativeAction,
  type AdminDashboard,
  type ManagedAccount,
  type ManagedAccountStatus,
} from "./http-admin-boundary";
import { validateAccountDeletionEvidence } from "./account-deletion-evidence";
import {
  readContentReportPreview,
  resolveContentReport,
  type ContentReportPreview,
  type OpenContentReport,
} from "@/features/safety/http-content-safety-boundary";

type AccountAction = "approve" | "suspend" | "restore" | "grant";
type DeletionStep = "evidence" | "consequences";
type DeletionFlow = Readonly<{
  account: ManagedAccount;
  idempotencyKey: string;
  step: DeletionStep;
}>;
type DeletionOutcome = Readonly<{
  accountEmail: string;
  request: AccountDeletionRequest;
}>;

const STATUS_LABELS: Record<ManagedAccountStatus, string> = {
  active: "已启用",
  pending: "待审核",
  suspended: "已暂停",
};

const ACTION_LABELS: Record<AdministrativeAction["actionType"], string> = {
  approve_account: "通过审核",
  bootstrap_site_owner: "初始化站长",
  create_account_deletion_request: "创建删除请求",
  grant_test_credits: "赠送测试积分",
  restore_account: "恢复账户",
  suspend_account: "暂停账户",
};

const CONTENT_REPORT_LABELS: Record<OpenContentReport["category"], string> = {
  child_safety: "未成年人安全",
  extremism_violence: "极端主义或血腥暴力",
  fraud_impersonation: "诈骗或有害仿冒",
  illegal_activity: "违法活动",
  non_consensual_intimate: "未经同意的私密内容",
  other: "其他违反规则的内容",
  privacy_ip: "隐私、肖像或知识产权",
};

function formatDate(value: string | null) {
  if (!value) return "尚未登录";
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusBadge(status: ManagedAccountStatus) {
  const classes =
    status === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "pending"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-zinc-300 bg-zinc-100 text-zinc-700";
  return <Badge variant="outline" className={classes}>{STATUS_LABELS[status]}</Badge>;
}

function actionCopy(action: AccountAction, account: ManagedAccount) {
  if (action === "approve") {
    return { description: `允许 ${account.email} 使用创作、项目与资产能力。`, title: "通过账户审核" };
  }
  if (action === "suspend") {
    return { description: `暂停 ${account.email} 的产品访问，历史数据仍会保留。`, title: "暂停账户" };
  }
  if (action === "restore") {
    return { description: `恢复 ${account.email} 的产品访问。`, title: "恢复账户" };
  }
  return { description: `向 ${account.email} 追加一笔独立的测试积分流水。`, title: "赠送测试积分" };
}

export function AccountManagementPage() {
  const [session, setSession] = useState<AuthenticationSession | null | undefined>(undefined);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [accounts, setAccounts] = useState<readonly ManagedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ManagedAccountStatus | "all">("pending");
  const [selected, setSelected] = useState<{ account: ManagedAccount; action: AccountAction } | null>(null);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("100");
  const [mutating, setMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [statusRefreshing, setStatusRefreshing] = useState(false);
  const [deletionFlow, setDeletionFlow] = useState<DeletionFlow | null>(null);
  const [deletionVerifiedEmail, setDeletionVerifiedEmail] = useState("");
  const [deletionMailReferenceId, setDeletionMailReferenceId] = useState("");
  const [deletionRequestedAt, setDeletionRequestedAt] = useState("");
  const [deletionConfirmedAt, setDeletionConfirmedAt] = useState("");
  const [deletionReason, setDeletionReason] = useState(
    "用户已通过登记邮箱确认删除",
  );
  const [evidenceAcknowledged, setEvidenceAcknowledged] = useState(false);
  const [consequencesAcknowledged, setConsequencesAcknowledged] = useState(false);
  const [deletionMutating, setDeletionMutating] = useState(false);
  const [deletionError, setDeletionError] = useState<string | null>(null);
  const [deletionOutcome, setDeletionOutcome] = useState<DeletionOutcome | null>(null);
  const [reviewingReport, setReviewingReport] = useState<OpenContentReport | null>(null);
  const [reportPreview, setReportPreview] = useState<ContentReportPreview | null>(null);
  const [reportPreviewLoading, setReportPreviewLoading] = useState(false);
  const [moderationFlow, setModerationFlow] = useState<{
    action: "restore" | "remove";
    report: OpenContentReport;
  } | null>(null);
  const [moderationReason, setModerationReason] = useState("");
  const [moderationMutating, setModerationMutating] = useState(false);
  const [moderationError, setModerationError] = useState<string | null>(null);

  const canManage = session?.access.status === "active" && session.account.role === "site_owner";

  const loadDashboard = useCallback(
    async ({ append = false, cursor = null }: { append?: boolean; cursor?: string | null } = {}) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setLoadError(null);
      try {
        const next = await readAdminDashboard({
          cursor,
          query,
          status: status === "all" ? null : status,
        });
        setDashboard(next);
        setAccounts((current) => append ? [...current, ...next.accounts] : next.accounts);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "账户列表暂时无法读取，请稍后重试。");
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [query, status],
  );

  useEffect(() => {
    let active = true;
    void readAuthenticationSession()
      .then((next) => {
        if (active) setSession(next);
      })
      .catch((error) => {
        if (!active) return;
        setSession(null);
        setSessionError(error instanceof Error ? error.message : "暂时无法确认登录状态。");
      });
    const expire = () => setSession(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, expire);
    return () => {
      active = false;
      window.removeEventListener(SESSION_EXPIRED_EVENT, expire);
    };
  }, []);

  useEffect(() => {
    if (!canManage) return;
    const loadTimer = window.setTimeout(() => void loadDashboard(), 0);
    return () => window.clearTimeout(loadTimer);
  }, [canManage, loadDashboard]);

  const selectedCopy = useMemo(
    () => selected ? actionCopy(selected.action, selected.account) : null,
    [selected],
  );

  const deletionEvidence = deletionFlow
    ? validateAccountDeletionEvidence({
        accountEmail: deletionFlow.account.email,
        mailReferenceId: deletionMailReferenceId,
        reason: deletionReason,
        verificationConfirmedAt: deletionConfirmedAt,
        verificationRequestedAt: deletionRequestedAt,
        verifiedEmail: deletionVerifiedEmail,
      })
    : null;

  const openAction = (account: ManagedAccount, action: AccountAction) => {
    setSelected({ account, action });
    setMutationError(null);
    setAmount("100");
    setReason(
      action === "approve"
        ? "通过种子用户审核"
        : action === "restore"
          ? "恢复种子用户访问"
          : "",
    );
  };

  const resetDeletionFlow = () => {
    if (deletionMutating) return;
    setDeletionFlow(null);
    setDeletionVerifiedEmail("");
    setDeletionMailReferenceId("");
    setDeletionRequestedAt("");
    setDeletionConfirmedAt("");
    setDeletionReason("用户已通过登记邮箱确认删除");
    setEvidenceAcknowledged(false);
    setConsequencesAcknowledged(false);
    setDeletionError(null);
  };

  const openDeletionFlow = (account: ManagedAccount) => {
    setDeletionFlow({
      account,
      idempotencyKey: `admin-delete-${crypto.randomUUID()}`,
      step: "evidence",
    });
    setDeletionVerifiedEmail("");
    setDeletionMailReferenceId("");
    setDeletionRequestedAt("");
    setDeletionConfirmedAt("");
    setDeletionReason("用户已通过登记邮箱确认删除");
    setEvidenceAcknowledged(false);
    setConsequencesAcknowledged(false);
    setDeletionError(null);
  };

  const continueDeletionFlow = () => {
    if (!deletionFlow || !deletionEvidence?.ok || !evidenceAcknowledged) return;
    setDeletionError(null);
    setConsequencesAcknowledged(false);
    setDeletionFlow({ ...deletionFlow, step: "consequences" });
  };

  const runDeletionRequest = async () => {
    if (
      !deletionFlow ||
      deletionFlow.step !== "consequences" ||
      !deletionEvidence?.ok ||
      !consequencesAcknowledged
    ) {
      return;
    }
    setDeletionMutating(true);
    setDeletionError(null);
    try {
      const request = await createManagedAccountDeletionRequest({
        ...deletionEvidence.value,
        idempotencyKey: deletionFlow.idempotencyKey,
        ownerId: deletionFlow.account.id,
      });
      const accountEmail = deletionFlow.account.email;
      setAccounts((current) =>
        current.map((account) =>
          account.id === deletionFlow.account.id
            ? {
                ...account,
                deletionRequest: {
                  createdAt: request.createdAt,
                  deadlineAt: request.deadlineAt,
                  id: request.id,
                  state: request.state,
                },
                status: "suspended",
              }
            : account,
        ),
      );
      setDeletionOutcome({ accountEmail, request });
      setDeletionFlow(null);
      toast.success("账户访问已停止，删除请求正在处理");
      if (status === "suspended") await loadDashboard();
      else setStatus("suspended");
    } catch (error) {
      setDeletionError(
        error instanceof Error ? error.message : "删除请求没有创建，请重试。",
      );
    } finally {
      setDeletionMutating(false);
    }
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setQuery(searchDraft.trim());
  };

  const runAction = async () => {
    if (!selected) return;
    setMutating(true);
    setMutationError(null);
    try {
      if (selected.action === "grant") {
        await grantManagedAccountTestCredits({
          amount: Number(amount),
          ownerId: selected.account.id,
          reason,
        });
        toast.success(`已向 ${selected.account.email} 赠送 ${Number(amount)} 积分`);
      } else {
        await updateManagedAccountStatus({
          ownerId: selected.account.id,
          reason,
          status: selected.action === "suspend" ? "suspended" : "active",
        });
        toast.success(selectedCopy?.title ?? "账户状态已更新");
      }
      setSelected(null);
      await loadDashboard();
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : "操作没有完成，请重试。");
    } finally {
      setMutating(false);
    }
  };

  const logout = async () => {
    try {
      const redirecting = await signOut();
      if (!redirecting) setSession(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "退出登录失败，请重试。");
    }
  };

  const refreshStatus = async () => {
    setStatusRefreshing(true);
    try {
      setSession(await readAuthenticationSession());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "暂时无法刷新账户状态。");
    } finally {
      setStatusRefreshing(false);
    }
  };

  const openReportPreview = async (report: OpenContentReport) => {
    setReviewingReport(report);
    setReportPreview(null);
    setModerationError(null);
    setReportPreviewLoading(true);
    try {
      setReportPreview(await readContentReportPreview(report.id));
    } catch (error) {
      setModerationError(error instanceof Error ? error.message : "举报图片暂时无法读取。");
    } finally {
      setReportPreviewLoading(false);
    }
  };

  const beginModeration = (report: OpenContentReport, action: "restore" | "remove") => {
    setModerationFlow({ action, report });
    setModerationReason(action === "remove" ? "确认违反内测使用规则" : "审核后确认无需处置");
    setModerationError(null);
  };

  const runModeration = async () => {
    if (!moderationFlow || moderationMutating) return;
    setModerationMutating(true);
    setModerationError(null);
    try {
      await resolveContentReport({
        action: moderationFlow.action,
        reason: moderationReason,
        reportId: moderationFlow.report.id,
      });
      toast.success(moderationFlow.action === "remove" ? "图片对象已删除" : "图片已恢复");
      setModerationFlow(null);
      setReviewingReport(null);
      setReportPreview(null);
      await loadDashboard();
    } catch (error) {
      setModerationError(error instanceof Error ? error.message : "内容处理没有完成，请重试。");
    } finally {
      setModerationMutating(false);
    }
  };

  const suspendReportedAccount = async (report: OpenContentReport) => {
    if (moderationMutating) return;
    setModerationMutating(true);
    setModerationError(null);
    try {
      await updateManagedAccountStatus({
        ownerId: report.targetOwnerId,
        reason: `内容举报 ${report.id} 审核期间暂停访问`,
        status: "suspended",
      });
      toast.success("相关账户已暂停");
      await loadDashboard();
    } catch (error) {
      setModerationError(error instanceof Error ? error.message : "账户暂停没有完成，请重试。");
    } finally {
      setModerationMutating(false);
    }
  };

  if (session === undefined) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-white text-zinc-600">
        <div className="flex items-center gap-2 text-sm" role="status">
          <LoaderCircle className="animate-spin" />正在确认站长权限
        </div>
      </main>
    );
  }

  if (session === null) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-white px-5">
        <section className="w-full max-w-sm rounded-3xl border border-zinc-200 p-8 text-center">
          <Image className="mx-auto" src="/goodgood-mark.svg" alt="" width={34} height={26} />
          <h1 className="mt-6 text-2xl font-semibold">登录后管理账户</h1>
          <p className="mt-3 text-base leading-7 text-zinc-600">此页面只对站长开放。</p>
          {sessionError && <p className="mt-4 text-sm text-red-700" role="alert">{sessionError}</p>}
          <Button className="mt-6 w-full" onClick={() => beginAuthentication("/admin/users")}>
            <LogIn />Google / 邮箱验证码登录
          </Button>
          <Button className="mt-2 w-full" variant="ghost" asChild><a href="/create">返回 GoodGood</a></Button>
        </section>
      </main>
    );
  }

  if (session.access.status !== "active") {
    return (
      <AccountAccessGate
        busy={statusRefreshing}
        onLogout={() => void logout()}
        onRefresh={() => void refreshStatus()}
        session={session}
      />
    );
  }

  if (session.account.role !== "site_owner") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-white px-5">
        <section className="w-full max-w-sm rounded-3xl border border-zinc-200 p-8 text-center">
          <UserRoundCog className="mx-auto text-zinc-500" />
          <h1 className="mt-5 text-2xl font-semibold">没有账户管理权限</h1>
          <p className="mt-3 text-base leading-7 text-zinc-600">只有站长可以查看和管理用户账户。</p>
          <Button className="mt-6 w-full" asChild><a href="/create">返回创作</a></Button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-white text-zinc-950">
      <header className="border-b border-zinc-200">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3" role="img" aria-label="GoodGood">
            <Image src="/goodgood-mark.svg" alt="" width={29} height={22} />
            <Image src="/goodgood-wordmark.svg" alt="" width={89} height={20} />
            <span className="ml-2 hidden border-l border-zinc-200 pl-4 text-sm text-zinc-500 sm:inline">账户管理</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" asChild><a href="/create"><ArrowLeft />返回创作</a></Button>
            <Button variant="ghost" size="icon" aria-label="退出登录" onClick={() => void logout()}><LogOut /></Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-5 py-8 lg:px-8 lg:py-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">站长工作台</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">账户管理</h1>
            <p className="mt-2 max-w-2xl text-base leading-7 text-zinc-600">审核登录账户、暂停或恢复访问，并通过积分流水追加测试额度。</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[420px]">
            {(["pending", "active", "suspended"] as const).map((item) => (
              <button
                key={item}
                className={`rounded-2xl border px-4 py-3 text-left transition-colors ${status === item ? "border-primary bg-primary/5" : "border-zinc-200 hover:bg-zinc-50"}`}
                onClick={() => setStatus(item)}
              >
                <span className="block text-sm text-zinc-500">{STATUS_LABELS[item]}</span>
                <strong className="mt-1 block text-xl tabular-nums">{dashboard?.counts[item] ?? "--"}</strong>
              </button>
            ))}
          </div>
        </div>

        {deletionOutcome && (
          <Alert className="mt-6 border-primary/30 bg-primary/5">
            <TriangleAlert />
            <AlertTitle>删除请求处理中 · 不可撤销</AlertTitle>
            <AlertDescription>
              {deletionOutcome.accountEmail} 的产品访问和现有会话已经停止。请求将在
              {formatDate(deletionOutcome.request.deadlineAt)} 前完成后续删除或匿名化；
              这不表示数据、私有对象、身份平台记录或备份此刻已经删除。
            </AlertDescription>
          </Alert>
        )}

        <section className="mt-8 rounded-3xl border border-zinc-200">
          <div className="flex items-center justify-between border-b border-zinc-200 p-5">
            <div>
              <h2 className="text-lg font-semibold">待处理内容举报</h2>
              <p className="mt-1 text-sm text-zinc-500">只显示用户主动举报的具体图片；打开预览会写入审计记录。</p>
            </div>
            <Badge variant="outline">{dashboard?.openContentReports.length ?? "--"}</Badge>
          </div>
          {loading && !dashboard ? (
            <div className="space-y-3 p-5" role="status" aria-label="正在加载内容举报">
              <Skeleton className="h-20 w-full rounded-2xl" />
            </div>
          ) : dashboard?.openContentReports.length ? (
            <div className="divide-y divide-zinc-200">
              {dashboard.openContentReports.map((report) => (
                <article key={report.id} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">已隔离</Badge>
                      <strong>{CONTENT_REPORT_LABELS[report.category]}</strong>
                    </div>
                    <p className="mt-2 truncate text-sm text-zinc-600">{report.targetEmail}</p>
                    <time className="mt-1 block text-xs text-zinc-500" dateTime={report.createdAt}>{formatDate(report.createdAt)}</time>
                  </div>
                  <div className="text-sm text-zinc-500">
                    账户：{STATUS_LABELS[report.targetStatus]}
                    <span className="mt-1 block">图片：{report.assetAvailable ? "可审核" : "已不可用"}</span>
                  </div>
                  <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                    <Button size="sm" variant="outline" disabled={!report.assetAvailable || moderationMutating} onClick={() => void openReportPreview(report)}><Eye />查看</Button>
                    <Button size="sm" variant="outline" disabled={!report.assetAvailable || moderationMutating} onClick={() => beginModeration(report, "restore")}><RotateCcw />恢复</Button>
                    <Button size="sm" variant="destructive" disabled={!report.assetAvailable || moderationMutating} onClick={() => beginModeration(report, "remove")}><Trash2 />删除图片</Button>
                    {report.targetStatus === "active" && (
                      <Button size="sm" variant="ghost" disabled={moderationMutating} onClick={() => void suspendReportedAccount(report)}><ShieldBan />暂停账户</Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-zinc-500">当前没有待处理的内容举报。</p>
          )}
          {moderationError && !reviewingReport && !moderationFlow && (
            <p className="border-t border-zinc-200 px-5 py-3 text-sm text-red-700" role="alert">{moderationError}</p>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-zinc-200">
          <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <form className="flex w-full max-w-xl gap-2" onSubmit={submitSearch}>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                <Input className="pl-9" maxLength={100} placeholder="搜索邮箱" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} />
              </div>
              <Button type="submit" variant="outline">搜索</Button>
            </form>
            <div className="flex items-center gap-2">
              <Select value={status} onValueChange={(value) => setStatus(value as ManagedAccountStatus | "all")}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="pending">待审核</SelectItem>
                  <SelectItem value="active">已启用</SelectItem>
                  <SelectItem value="suspended">已暂停</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" aria-label="刷新列表" onClick={() => void loadDashboard()}><RefreshCw /></Button>
            </div>
          </div>

          {loadError ? (
            <Alert variant="destructive" className="m-4 w-auto">
              <AlertTitle>账户列表加载失败</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                <span>{loadError}</span><Button size="sm" variant="outline" onClick={() => void loadDashboard()}>重试</Button>
              </AlertDescription>
            </Alert>
          ) : loading ? (
            <div className="space-y-3 p-5" role="status" aria-label="正在加载账户">
              {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-14 w-full rounded-xl" />)}
            </div>
          ) : accounts.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <UserRoundCog className="mx-auto text-zinc-400" />
              <h2 className="mt-4 text-lg font-semibold">没有符合条件的账户</h2>
              <p className="mt-2 text-sm text-zinc-500">调整搜索内容或状态筛选后再试。</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-zinc-200 lg:hidden">
                {accounts.map((account) => (
                  <article key={account.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-medium">{account.email}</h3>
                        <p className="mt-1 text-sm text-zinc-500">{account.role === "site_owner" ? "站长" : "普通用户"}</p>
                      </div>
                      {statusBadge(account.status)}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-zinc-50 p-4 text-sm">
                      <div><span className="block text-zinc-500">账户等级</span><strong className="mt-1 block">内测用户</strong></div>
                      <div><span className="block text-zinc-500">积分</span><strong className="mt-1 block tabular-nums">{account.availableCredits} 可用</strong><span className="text-xs text-zinc-500">{account.reservedCredits} 预留</span></div>
                      <div><span className="block text-zinc-500">注册时间</span><strong className="mt-1 block font-medium">{formatDate(account.createdAt)}</strong></div>
                      <div><span className="block text-zinc-500">最近登录</span><strong className="mt-1 block font-medium">{formatDate(account.lastAuthenticatedAt)}</strong></div>
                    </div>
                    {account.deletionRequest ? (
                      <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-primary/30 text-primary">
                            {account.deletionRequest.state === "processing" ? "删除处理中" : "删除已完成"}
                          </Badge>
                          <span className="font-medium">不可撤销</span>
                        </div>
                        <p className="mt-2 text-zinc-600">
                          处理期限：{formatDate(account.deletionRequest.deadlineAt)}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {account.status === "pending" && <Button size="sm" onClick={() => openAction(account, "approve")}><CheckCircle2 />通过</Button>}
                        {account.status === "active" && account.role !== "site_owner" && <Button size="sm" variant="outline" onClick={() => openAction(account, "suspend")}><ShieldBan />暂停</Button>}
                        {account.status === "suspended" && <Button size="sm" variant="outline" onClick={() => openAction(account, "restore")}><CheckCircle2 />恢复</Button>}
                        <Button size="sm" variant="ghost" onClick={() => openAction(account, "grant")}><Coins />积分</Button>
                        {account.role !== "site_owner" && (
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => openDeletionFlow(account)}>
                            <Trash2 />登记删除
                          </Button>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
              <div className="hidden lg:block">
                <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">账户</TableHead>
                    <TableHead>状态 / 等级</TableHead>
                    <TableHead>积分</TableHead>
                    <TableHead>注册 / 最近登录</TableHead>
                    <TableHead className="pr-5 text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="max-w-[320px] pl-5">
                        <div className="truncate font-medium">{account.email}</div>
                        <div className="mt-1 text-xs text-zinc-500">{account.role === "site_owner" ? "站长" : "普通用户"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          {statusBadge(account.status)}
                          <Badge variant="outline">内测用户</Badge>
                          {account.deletionRequest && (
                            <Badge variant="outline" className="border-primary/30 text-primary">
                              {account.deletionRequest.state === "processing" ? "删除处理中" : "删除已完成"}
                            </Badge>
                          )}
                        </div>
                        {account.deletionRequest && (
                          <div className="mt-2 text-xs text-zinc-500">
                            不可撤销 · 期限 {formatDate(account.deletionRequest.deadlineAt)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium tabular-nums">{account.availableCredits} 可用</div>
                        <div className="mt-1 text-xs text-zinc-500 tabular-nums">{account.reservedCredits} 预留</div>
                      </TableCell>
                      <TableCell>
                        <div>{formatDate(account.createdAt)}</div>
                        <div className="mt-1 text-xs text-zinc-500">{formatDate(account.lastAuthenticatedAt)}</div>
                      </TableCell>
                      <TableCell className="pr-5">
                        {account.deletionRequest ? (
                          <div className="text-right text-sm text-zinc-500">只读</div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            {account.status === "pending" && <Button size="sm" onClick={() => openAction(account, "approve")}><CheckCircle2 />通过</Button>}
                            {account.status === "active" && account.role !== "site_owner" && <Button size="sm" variant="outline" onClick={() => openAction(account, "suspend")}><ShieldBan />暂停</Button>}
                            {account.status === "suspended" && <Button size="sm" variant="outline" onClick={() => openAction(account, "restore")}><CheckCircle2 />恢复</Button>}
                            <Button size="sm" variant="ghost" onClick={() => openAction(account, "grant")}><Coins />积分</Button>
                            {account.role !== "site_owner" && (
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => openDeletionFlow(account)}>
                                <Trash2 />登记删除
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </div>
              {dashboard?.nextCursor && (
                <div className="border-t border-zinc-200 p-4 text-center">
                  <Button variant="outline" disabled={loadingMore} onClick={() => void loadDashboard({ append: true, cursor: dashboard.nextCursor })}>
                    {loadingMore && <LoaderCircle className="animate-spin" />}加载更多
                  </Button>
                </div>
              )}
            </>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">最近操作记录</h2>
          <div className="mt-3 divide-y divide-zinc-200 rounded-3xl border border-zinc-200">
            {dashboard?.recentActions.length ? dashboard.recentActions.map((action) => (
              <div key={action.id} className="grid gap-1 px-5 py-4 text-sm md:grid-cols-[160px_minmax(0,1fr)_minmax(0,1fr)_180px] md:items-center md:gap-4">
                <strong>{ACTION_LABELS[action.actionType]}</strong>
                <span className="truncate text-zinc-600">{action.targetEmail}</span>
                <span className="truncate text-zinc-500">{action.creditAmount ? `${action.creditAmount} 积分 · ` : ""}{action.reason}</span>
                <time className="text-zinc-500 md:text-right" dateTime={action.createdAt}>{formatDate(action.createdAt)}</time>
              </div>
            )) : (
              <p className="px-5 py-10 text-center text-sm text-zinc-500">还没有管理操作记录。</p>
            )}
          </div>
        </section>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && !mutating && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedCopy?.title}</DialogTitle>
            <DialogDescription>{selectedCopy?.description}</DialogDescription>
          </DialogHeader>
          {selected?.action === "grant" && (
            <div>
              <label className="text-sm font-medium" htmlFor="grant-amount">积分数量</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {[100, 500, 1000].map((preset) => <Button key={preset} type="button" size="sm" variant={amount === String(preset) ? "default" : "outline"} onClick={() => setAmount(String(preset))}>{preset}</Button>)}
              </div>
              <Input id="grant-amount" className="mt-2" inputMode="numeric" min={1} max={5000} type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
              <p className="mt-1 text-xs text-zinc-500">单次最多 5000 积分，只允许正整数。</p>
            </div>
          )}
          <div>
            <label className="text-sm font-medium" htmlFor="admin-action-reason">操作原因</label>
            <Textarea id="admin-action-reason" className="mt-2 min-h-24" maxLength={200} placeholder="请填写会进入审计记录的原因" value={reason} onChange={(event) => setReason(event.target.value)} />
          </div>
          {mutationError && <p className="text-sm text-red-700" role="alert">{mutationError}</p>}
          <DialogFooter>
            <Button variant="outline" disabled={mutating} onClick={() => setSelected(null)}>取消</Button>
            <Button
              variant={selected?.action === "suspend" ? "destructive" : "default"}
              disabled={mutating || reason.trim().length < 2 || (selected?.action === "grant" && (!Number.isInteger(Number(amount)) || Number(amount) < 1 || Number(amount) > 5000))}
              onClick={() => void runAction()}
            >
              {mutating && <LoaderCircle className="animate-spin" />}确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(reviewingReport)} onOpenChange={(open) => !open && setReviewingReport(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>审核举报图片</DialogTitle>
            <DialogDescription>
              只为本次举报生成短时私有预览。不要下载、复制或写入外部记录。
            </DialogDescription>
          </DialogHeader>
          {reportPreviewLoading ? (
            <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-zinc-500" role="status"><LoaderCircle className="animate-spin" />正在读取私有预览</div>
          ) : moderationError ? (
            <Alert variant="destructive"><AlertTitle>预览读取失败</AlertTitle><AlertDescription>{moderationError}</AlertDescription></Alert>
          ) : reportPreview ? (
            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_280px]">
              <div className="relative min-h-72 overflow-hidden rounded-2xl bg-zinc-100">
                <PrivateObjectImage className="h-full w-full object-contain" src={reportPreview.previewUrl} alt="举报图片私有预览" />
              </div>
              <div className="space-y-4 text-sm">
                <div><span className="text-zinc-500">举报类型</span><strong className="mt-1 block">{CONTENT_REPORT_LABELS[reportPreview.category]}</strong></div>
                <div><span className="text-zinc-500">提示词</span><p className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap leading-6">{reportPreview.prompt}</p></div>
                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500"><span>{reportPreview.modelId}</span><span>{reportPreview.aspectRatio}</span></div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewingReport(null)}>关闭</Button>
            {reviewingReport?.assetAvailable && <Button variant="outline" onClick={() => beginModeration(reviewingReport, "restore")}>恢复图片</Button>}
            {reviewingReport?.assetAvailable && <Button variant="destructive" onClick={() => beginModeration(reviewingReport, "remove")}>删除图片</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(moderationFlow)} onOpenChange={(open) => !open && !moderationMutating && setModerationFlow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{moderationFlow?.action === "remove" ? "永久删除这张图片？" : "恢复这张图片？"}</AlertDialogTitle>
            <AlertDialogDescription>
              {moderationFlow?.action === "remove"
                ? "系统会先删除私有对象，再记录处理成功。对象删除不可撤销；失败时图片保持隔离，便于重试。"
                : "图片会重新出现在所属用户的私有资产视图中。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div>
            <Label htmlFor="moderation-reason">处理原因</Label>
            <Textarea id="moderation-reason" className="mt-2 min-h-24" maxLength={200} value={moderationReason} onChange={(event) => setModerationReason(event.target.value)} />
          </div>
          {moderationError && <p className="text-sm text-red-700" role="alert">{moderationError}</p>}
          <AlertDialogFooter>
            <Button variant="outline" disabled={moderationMutating} onClick={() => setModerationFlow(null)}>取消</Button>
            <Button variant={moderationFlow?.action === "remove" ? "destructive" : "default"} disabled={moderationMutating || moderationReason.trim().length < 2} onClick={() => void runModeration()}>
              {moderationMutating && <LoaderCircle className="animate-spin" />}{moderationFlow?.action === "remove" ? "确认删除对象" : "确认恢复"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={deletionFlow?.step === "evidence"}
        onOpenChange={(open) => !open && resetDeletionFlow()}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <p className="text-xs font-medium text-primary">第 1 步，共 2 步</p>
            <DialogTitle>核对账户持有人请求</DialogTitle>
            <DialogDescription>
              仅在账户持有人通过当前登记邮箱完成往返确认后继续。关闭此窗口不会保存证据或改变账户。
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm">
            <span className="text-zinc-500">目标账户</span>
            <strong className="mt-1 block break-all">{deletionFlow?.account.email}</strong>
            <span className="mt-1 block text-zinc-500">
              当前状态：{deletionFlow ? STATUS_LABELS[deletionFlow.account.status] : ""}
            </span>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="deletion-verified-email">完成确认的登记邮箱</Label>
              <Input
                id="deletion-verified-email"
                type="email"
                autoComplete="off"
                maxLength={320}
                placeholder={deletionFlow?.account.email}
                value={deletionVerifiedEmail}
                onChange={(event) => setDeletionVerifiedEmail(event.target.value)}
              />
              <p className="text-xs text-zinc-500">必须与上方当前登记邮箱完全一致。</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="deletion-mail-reference">邮件服务引用</Label>
              <Input
                id="deletion-mail-reference"
                autoComplete="off"
                maxLength={200}
                placeholder="仅填写邮件服务提供的消息或会话引用"
                value={deletionMailReferenceId}
                onChange={(event) => setDeletionMailReferenceId(event.target.value)}
              />
              <p className="text-xs text-zinc-500">不要粘贴邮件主题、正文、验证码或访问凭证。</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="deletion-requested-at">请求发出时间</Label>
                <Input
                  id="deletion-requested-at"
                  type="datetime-local"
                  value={deletionRequestedAt}
                  onChange={(event) => setDeletionRequestedAt(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="deletion-confirmed-at">持有人确认时间</Label>
                <Input
                  id="deletion-confirmed-at"
                  type="datetime-local"
                  value={deletionConfirmedAt}
                  onChange={(event) => setDeletionConfirmedAt(event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="deletion-reason">操作原因</Label>
              <Textarea
                id="deletion-reason"
                className="min-h-20"
                maxLength={200}
                value={deletionReason}
                onChange={(event) => setDeletionReason(event.target.value)}
              />
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-zinc-200 p-4">
              <Checkbox
                id="deletion-evidence-acknowledgement"
                checked={evidenceAcknowledged}
                onCheckedChange={(checked) => setEvidenceAcknowledged(checked === true)}
              />
              <Label htmlFor="deletion-evidence-acknowledgement" className="items-start leading-5">
                我确认请求来自该账户当前登记邮箱，并已向同一邮箱回复，账户持有人在 24 小时内明确回复确认删除。
              </Label>
            </div>
          </div>

          {deletionEvidence && !deletionEvidence.ok && (
            <p className="text-sm text-amber-700">{deletionEvidence.message}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={resetDeletionFlow}>取消</Button>
            <Button
              disabled={!deletionEvidence?.ok || !evidenceAcknowledged}
              onClick={continueDeletionFlow}
            >
              核对无误，继续
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deletionFlow?.step === "consequences"}
        onOpenChange={(open) => !open && !deletionMutating && resetDeletionFlow()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <p className="text-xs font-medium text-destructive">第 2 步，共 2 步</p>
            <AlertDialogTitle>创建后无法撤销</AlertDialogTitle>
            <AlertDialogDescription>
              请最后确认目标账户 {deletionFlow?.account.email}。只有下方最终按钮会创建请求并改变账户。
            </AlertDialogDescription>
          </AlertDialogHeader>

          <ul className="space-y-2 rounded-2xl bg-zinc-50 p-4 text-sm leading-6 text-zinc-700">
            <li>立即暂停产品访问并撤销现有 GoodGood 会话。</li>
            <li>取消尚未提交给生成服务的任务，并释放对应预留积分。</li>
            <li>已经提交的生成任务只完成现有处理，不会因此重新提交。</li>
            <li>账户与创作数据将在 30 天内进入删除或匿名化处理。</li>
            <li className="font-medium text-zinc-950">请求创建后不能撤销、恢复账户或重新发放积分。</li>
          </ul>

          <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
            <Checkbox
              id="deletion-consequences-acknowledgement"
              checked={consequencesAcknowledged}
              disabled={deletionMutating}
              onCheckedChange={(checked) => setConsequencesAcknowledged(checked === true)}
            />
            <Label htmlFor="deletion-consequences-acknowledgement" className="items-start leading-5">
              我已再次核对目标账户，并理解最终提交会立即停止访问且删除流程不可撤销。
            </Label>
          </div>

          {deletionError && <p className="text-sm text-red-700" role="alert">{deletionError}</p>}
          <AlertDialogFooter>
            <Button
              variant="outline"
              disabled={deletionMutating}
              onClick={() => {
                if (!deletionFlow) return;
                setConsequencesAcknowledged(false);
                setDeletionError(null);
                setDeletionFlow({ ...deletionFlow, step: "evidence" });
              }}
            >
              返回核对
            </Button>
            <Button
              variant="destructive"
              disabled={deletionMutating || !consequencesAcknowledged || !deletionEvidence?.ok}
              onClick={() => void runDeletionRequest()}
            >
              {deletionMutating && <LoaderCircle className="animate-spin" />}
              创建不可撤销请求
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Toaster position="bottom-center" toastOptions={{ duration: 2400 }} />
    </main>
  );
}
