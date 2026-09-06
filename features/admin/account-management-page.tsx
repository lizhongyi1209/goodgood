"use client";

import Image from "next/image";
import {
  ArrowLeft,
  CheckCircle2,
  Coins,
  LoaderCircle,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  ShieldBan,
  UserRoundCog,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { AccountAccessGate } from "@/features/auth/account-access-gate";
import {
  SESSION_EXPIRED_EVENT,
  beginAuthentication,
  readAuthenticationSession,
  signOut,
  type AuthenticationSession,
} from "@/features/auth/http-auth-boundary";
import {
  grantManagedAccountTestCredits,
  readAdminDashboard,
  updateManagedAccountStatus,
  type AdministrativeAction,
  type AdminDashboard,
  type ManagedAccount,
  type ManagedAccountStatus,
} from "./http-admin-boundary";

type AccountAction = "approve" | "suspend" | "restore" | "grant";

const STATUS_LABELS: Record<ManagedAccountStatus, string> = {
  active: "已启用",
  pending: "待审核",
  suspended: "已暂停",
};

const ACTION_LABELS: Record<AdministrativeAction["actionType"], string> = {
  approve_account: "通过审核",
  bootstrap_site_owner: "初始化站长",
  grant_test_credits: "赠送测试积分",
  restore_account: "恢复账户",
  suspend_account: "暂停账户",
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
                    <div className="mt-4 flex flex-wrap gap-2">
                      {account.status === "pending" && <Button size="sm" onClick={() => openAction(account, "approve")}><CheckCircle2 />通过</Button>}
                      {account.status === "active" && account.role !== "site_owner" && <Button size="sm" variant="outline" onClick={() => openAction(account, "suspend")}><ShieldBan />暂停</Button>}
                      {account.status === "suspended" && <Button size="sm" variant="outline" onClick={() => openAction(account, "restore")}><CheckCircle2 />恢复</Button>}
                      <Button size="sm" variant="ghost" onClick={() => openAction(account, "grant")}><Coins />积分</Button>
                    </div>
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
                        <div className="flex flex-wrap items-center gap-2">{statusBadge(account.status)}<Badge variant="outline">内测用户</Badge></div>
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
                        <div className="flex justify-end gap-1">
                          {account.status === "pending" && <Button size="sm" onClick={() => openAction(account, "approve")}><CheckCircle2 />通过</Button>}
                          {account.status === "active" && account.role !== "site_owner" && <Button size="sm" variant="outline" onClick={() => openAction(account, "suspend")}><ShieldBan />暂停</Button>}
                          {account.status === "suspended" && <Button size="sm" variant="outline" onClick={() => openAction(account, "restore")}><CheckCircle2 />恢复</Button>}
                          <Button size="sm" variant="ghost" onClick={() => openAction(account, "grant")}><Coins />积分</Button>
                        </div>
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
      <Toaster position="bottom-center" toastOptions={{ duration: 2400 }} />
    </main>
  );
}
