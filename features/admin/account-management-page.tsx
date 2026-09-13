"use client";

import { AdminManagementHeader } from "./admin-management-header";
import {
  Building2,
  CheckCircle2,
  Coins,
  LoaderCircle,
  Network,
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
import { AuthenticationGate } from "@/features/auth/authentication-gate";
import {
  SESSION_EXPIRED_EVENT,
  beginAuthentication,
  readAuthenticationSession,
  signOut,
  type AuthenticationSession,
} from "@/features/auth/http-auth-boundary";
import { createOrganizationWorkspace } from "@/features/organizations/http-organization-boundary";
import {
  grantManagedAccountTestCredits,
  readAdminDashboard,
  updateManagedAccountBusinessRole,
  updateManagedAccountDirectParent,
  updateManagedAccountStatus,
  type AdminDashboard,
  type BusinessRole,
  type ManagedAccount,
  type ManagedAccountStatus,
} from "./http-admin-boundary";

type AccountAction = "approve" | "suspend" | "restore" | "grant" | "role" | "parent" | "organization";

const BUSINESS_ROLE_LABELS: Record<BusinessRole, string> = {
  distributor: "分销商",
  enterprise: "企业",
};

const STATUS_LABELS: Record<ManagedAccountStatus, string> = {
  active: "已启用",
  pending: "待审核",
  suspended: "已暂停",
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

function accountIdentityLabel(account: ManagedAccount) {
  if (account.role === "site_owner") return "站长";
  return account.businessRole ? BUSINESS_ROLE_LABELS[account.businessRole] : "个人";
}

function actionCopy(action: AccountAction, account: ManagedAccount) {
  if (action === "approve") {
    return { description: `允许 ${account.email} 使用创作、项目与资产能力。`, title: "通过账户审核" };
  }
  if (action === "suspend") {
    return { description: `暂停 ${account.email} 的产品访问并撤销其全部有效登录，历史数据仍会保留。`, title: "暂停账户并撤销登录" };
  }
  if (action === "restore") {
    return { description: `恢复 ${account.email} 的产品访问。`, title: "恢复账户" };
  }
  if (action === "role") {
    return { description: `设置 ${account.email} 的业务身份。业务身份不授予站长权限。`, title: "调整业务身份" };
  }
  if (action === "parent") {
    return { description: `设置 ${account.email} 的唯一直属上级。只有有效直属上级可以向其划拨积分。`, title: "调整直属关系" };
  }
  if (action === "organization") {
    return {
      description: `创建企业工作区，并把 ${account.email} 设为首位企业负责人。`,
      title: "创建企业工作区",
    };
  }
  return { description: `向 ${account.email} 追加一笔独立的测试积分流水。`, title: "赠送测试积分" };
}

export function AccountManagementPage({ workspaceSession, embedded = false, onManagementChange }: {
  workspaceSession?: AuthenticationSession;
  embedded?: boolean;
  onManagementChange?: () => void;
} = {}) {
  const [standaloneSession, setSession] = useState<AuthenticationSession | null | undefined>(undefined);
  const session = workspaceSession ?? standaloneSession;
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [accounts, setAccounts] = useState<readonly ManagedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ManagedAccountStatus | "all">("all");
  const [selected, setSelected] = useState<{ account: ManagedAccount; action: AccountAction } | null>(null);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("100");
  const [businessRole, setBusinessRole] = useState<BusinessRole | "none">("none");
  const [parentOwnerId, setParentOwnerId] = useState<string>("none");
  const [organizationName, setOrganizationName] = useState("");
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
    if (workspaceSession) return;
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
  }, [workspaceSession]);

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
    setBusinessRole(account.businessRole ?? "none");
    setParentOwnerId(account.directParentId ?? "none");
    setOrganizationName(`${account.email.split("@")[0]} 的企业`);
    setReason(
      action === "approve"
        ? "通过种子用户审核"
        : action === "restore"
          ? "恢复种子用户访问"
          : action === "organization"
            ? "为已验证负责人创建企业工作区"
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
      if (selected.action === "organization") {
        const result = await createOrganizationWorkspace({
          initialOwnerId: selected.account.id,
          name: organizationName,
          reason,
        });
        toast.success(`${result.workspace.name} 已创建`);
      } else if (selected.action === "grant") {
        await grantManagedAccountTestCredits({
          amount: Number(amount),
          ownerId: selected.account.id,
          reason,
        });
        toast.success(`已向 ${selected.account.email} 赠送 ${Number(amount)} 积分`);
      } else if (selected.action === "role") {
        await updateManagedAccountBusinessRole({
          ownerId: selected.account.id,
          reason,
          role: businessRole === "none" ? null : businessRole,
        });
        toast.success("业务身份已更新");
      } else if (selected.action === "parent") {
        await updateManagedAccountDirectParent({
          ownerId: selected.account.id,
          parentOwnerId: parentOwnerId === "none" ? null : parentOwnerId,
          reason,
        });
        toast.success("直属关系已更新");
      } else {
        const result = await updateManagedAccountStatus({
          ownerId: selected.account.id,
          reason,
          status: selected.action === "suspend" ? "suspended" : "active",
        });
        toast.success(
          selected.action === "suspend"
            ? `账户已暂停，已撤销 ${result.revokedSessions} 个有效登录`
            : selectedCopy?.title ?? "账户状态已更新",
        );
      }
      setSelected(null);
      onManagementChange?.();
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
      <AuthenticationGate
        initialError={sessionError}
        onAuthenticated={async () => {
          setSessionError(null);
          setSession(await readAuthenticationSession());
        }}
        onHostedLogin={() => beginAuthentication("/admin/users")}
      />
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
          <Button className="mt-6 w-full" variant="ghost" asChild><a href="/create">返回创作</a></Button>
        </section>
      </main>
    );
  }

  return (
    <section className={`admin-management-page bg-white text-zinc-950 ${embedded ? "admin-management-embedded" : "min-h-dvh"}`} aria-label="账户管理">
      {!embedded && <AdminManagementHeader activePage="users" />}

      <div className={embedded ? "admin-management-content" : "mx-auto max-w-[1500px] px-5 py-8 lg:px-8 lg:py-10"}>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">账户管理</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">审核登录账户、管理企业/分销身份与直属关系，并通过积分流水追加测试额度。</p>
        </div>

        <section className="mt-8 rounded-3xl border border-zinc-200">
          <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <form className="flex w-full max-w-xl gap-2" onSubmit={submitSearch}>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                <Input className="pl-9" maxLength={100} placeholder="搜索邮箱" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} />
              </div>
              <Button type="submit" variant="ghost">搜索</Button>
            </form>
            <div className="flex items-center gap-2">
              <Select value={status} onValueChange={(value) => setStatus(value as ManagedAccountStatus | "all")}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent
                  align="start"
                  avoidCollisions={false}
                  className="max-h-60"
                  position="popper"
                  side="bottom"
                  sideOffset={6}
                >
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
                <span>{loadError}</span><Button size="sm" variant="ghost" onClick={() => void loadDashboard()}>重试</Button>
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
              <div className="divide-y divide-zinc-200 xl:hidden">
                {accounts.map((account) => (
                  <article key={account.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-medium">{account.email}</h3>
                      </div>
                      {statusBadge(account.status)}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-zinc-50 p-4 text-sm">
                      <div><span className="block text-zinc-500">身份</span><strong className="mt-1 block font-medium">{accountIdentityLabel(account)}</strong></div>
                      <div className="min-w-0"><span className="block text-zinc-500">直属上级</span><strong className="mt-1 block truncate font-medium" title={account.directParentEmail ?? undefined}>{account.directParentEmail ?? "—"}</strong></div>
                      <div><span className="block text-zinc-500">账户等级</span><strong className="mt-1 block">内测用户</strong></div>
                      <div><span className="block text-zinc-500">积分</span><strong className="mt-1 block tabular-nums">{account.availableCredits} 可用</strong><span className="text-xs text-zinc-500">{account.transferableCredits} 可分配</span></div>
                      <div><span className="block text-zinc-500">注册时间</span><strong className="mt-1 block font-medium">{formatDate(account.createdAt)}</strong></div>
                      <div><span className="block text-zinc-500">最近登录</span><strong className="mt-1 block font-medium">{formatDate(account.lastAuthenticatedAt)}</strong></div>
                    </div>
                    <div className="admin-account-actions mt-4 flex flex-wrap gap-2">
                      {account.status === "pending" && <Button className="admin-account-primary-action" size="sm" variant="ghost" onClick={() => openAction(account, "approve")}><CheckCircle2 />通过</Button>}
                      {account.status === "active" && account.role !== "site_owner" && <Button className="admin-account-primary-action" size="sm" variant="ghost" onClick={() => openAction(account, "suspend")}><ShieldBan />暂停</Button>}
                      {account.status === "suspended" && <Button className="admin-account-primary-action" size="sm" variant="ghost" onClick={() => openAction(account, "restore")}><CheckCircle2 />恢复</Button>}
                      <Button className="admin-account-secondary-action" size="sm" variant="ghost" onClick={() => openAction(account, "grant")}><Coins />积分</Button>
                      {account.role !== "site_owner" && (
                        <>
                          <Button className="admin-account-secondary-action" size="sm" variant="ghost" onClick={() => openAction(account, "role")}><UserRoundCog />身份</Button>
                          <Button className="admin-account-secondary-action" size="sm" variant="ghost" onClick={() => openAction(account, "parent")}><Network />上级</Button>
                        </>
                      )}
                      {account.status === "active" && <Button className="admin-account-secondary-action" size="sm" variant="ghost" onClick={() => openAction(account, "organization")}><Building2 />企业</Button>}
                    </div>
                  </article>
                ))}
              </div>
              <div className="hidden xl:block">
                <Table className="admin-account-table">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[250px] pl-5">账户</TableHead>
                    <TableHead className="w-[90px]">身份</TableHead>
                    <TableHead className="w-[220px]">上级</TableHead>
                    <TableHead>状态 / 等级</TableHead>
                    <TableHead>积分</TableHead>
                    <TableHead>注册 / 最近登录</TableHead>
                    <TableHead className="pr-5 text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="max-w-[250px] pl-5">
                        <div className="truncate font-medium">{account.email}</div>
                      </TableCell>
                      <TableCell className="text-zinc-600">
                        {accountIdentityLabel(account)}
                      </TableCell>
                      <TableCell className="max-w-[220px] text-zinc-600">
                        <div className="truncate" title={account.directParentEmail ?? undefined}>{account.directParentEmail ?? "—"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">{statusBadge(account.status)}<Badge variant="outline">内测用户</Badge></div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium tabular-nums">{account.availableCredits} 可用</div>
                        <div className="mt-1 text-xs text-zinc-500 tabular-nums">{account.transferableCredits} 可分配</div>
                      </TableCell>
                      <TableCell>
                        <div>{formatDate(account.createdAt)}</div>
                        <div className="mt-1 text-xs text-zinc-500">{formatDate(account.lastAuthenticatedAt)}</div>
                      </TableCell>
                      <TableCell className="pr-5">
                        <div className="admin-account-actions flex justify-end gap-1">
                          {account.status === "pending" && <Button className="admin-account-primary-action" size="sm" variant="ghost" onClick={() => openAction(account, "approve")}><CheckCircle2 />通过</Button>}
                          {account.status === "active" && account.role !== "site_owner" && <Button className="admin-account-primary-action" size="sm" variant="ghost" onClick={() => openAction(account, "suspend")}><ShieldBan />暂停</Button>}
                          {account.status === "suspended" && <Button className="admin-account-primary-action" size="sm" variant="ghost" onClick={() => openAction(account, "restore")}><CheckCircle2 />恢复</Button>}
                          <Button className="admin-account-secondary-action" size="sm" variant="ghost" onClick={() => openAction(account, "grant")}><Coins />积分</Button>
                          {account.role !== "site_owner" && (
                            <>
                              <Button className="admin-account-secondary-action" size="sm" variant="ghost" onClick={() => openAction(account, "role")}><UserRoundCog />身份</Button>
                              <Button className="admin-account-secondary-action" size="sm" variant="ghost" onClick={() => openAction(account, "parent")}><Network />上级</Button>
                            </>
                          )}
                          {account.status === "active" && <Button className="admin-account-secondary-action" size="sm" variant="ghost" onClick={() => openAction(account, "organization")}><Building2 />企业</Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </div>
              {dashboard?.nextCursor && (
                <div className="border-t border-zinc-200 p-4 text-center">
                  <Button variant="ghost" disabled={loadingMore} onClick={() => void loadDashboard({ append: true, cursor: dashboard.nextCursor })}>
                    {loadingMore && <LoaderCircle className="animate-spin" />}加载更多
                  </Button>
                </div>
              )}
            </>
          )}
        </section>

      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && !mutating && setSelected(null)}>
        <DialogContent
          className="admin-action-dialog"
          overlayClassName="admin-action-dialog-overlay"
        >
          <DialogHeader className="admin-action-dialog-header">
            <DialogTitle>{selectedCopy?.title}</DialogTitle>
            <DialogDescription>{selectedCopy?.description}</DialogDescription>
          </DialogHeader>
          <div className="admin-action-dialog-body">
            {selected?.action === "grant" && (
              <>
                <div className="admin-action-account-summary">
                  <span>当前可用积分</span>
                  <strong>{selected.account.availableCredits} 积分</strong>
                </div>
                <div className="admin-action-field">
                  <label htmlFor="grant-amount">积分数量</label>
                  <div className="admin-action-presets">
                    {[100, 500, 1000].map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-pressed={amount === String(preset)}
                        onClick={() => setAmount(String(preset))}
                      >
                        {preset}
                      </Button>
                    ))}
                  </div>
                  <Input id="grant-amount" inputMode="numeric" min={1} max={5000} type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
                  <p className="admin-action-help">单次最多 5000 积分，只允许正整数。</p>
                </div>
              </>
            )}
            {selected?.action === "role" && (
              <div className="admin-action-field">
                <label htmlFor="business-role">业务身份</label>
                <Select value={businessRole} onValueChange={(value) => setBusinessRole(value as BusinessRole | "none")}>
                  <SelectTrigger id="business-role"><SelectValue /></SelectTrigger>
                  <SelectContent
                    align="start"
                    avoidCollisions={false}
                    className="max-h-60"
                    position="popper"
                    side="bottom"
                    sideOffset={6}
                  >
                    <SelectItem value="none">个人</SelectItem>
                    <SelectItem value="enterprise">企业</SelectItem>
                    <SelectItem value="distributor">分销商</SelectItem>
                  </SelectContent>
                </Select>
                <p className="admin-action-help">一个账户只能选择一个身份。企业管理成员与创作额度，分销商划拨个人充值来源积分；两种业务请使用不同账户。</p>
              </div>
            )}
            {selected?.action === "parent" && (
              <div className="admin-action-field">
                <label htmlFor="direct-parent">直属上级</label>
                <Select value={parentOwnerId} onValueChange={setParentOwnerId}>
                  <SelectTrigger id="direct-parent"><SelectValue /></SelectTrigger>
                  <SelectContent
                    align="start"
                    avoidCollisions={false}
                    className="max-h-60"
                    position="popper"
                    side="bottom"
                    sideOffset={6}
                  >
                    <SelectItem value="none">无直属上级</SelectItem>
                    {dashboard?.eligibleParents
                      .filter((parent) => parent.id !== selected.account.id)
                      .map((parent) => (
                        <SelectItem key={parent.id} value={parent.id}>
                          {parent.email} · {BUSINESS_ROLE_LABELS[parent.businessRole]}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="admin-action-help">只列出已启用的分销商账户。直属关系用于个人积分划拨，与企业成员无关；系统会拒绝循环关系。</p>
              </div>
            )}
            <div className="admin-action-field">
              <label htmlFor="admin-action-reason">操作原因</label>
              <Textarea id="admin-action-reason" maxLength={200} placeholder="请填写会进入审计记录的原因" value={reason} onChange={(event) => setReason(event.target.value)} />
            </div>
            {mutationError && <p className="admin-action-error" role="alert">{mutationError}</p>}
            {selected?.action === "organization" && (
              <div className="admin-action-field">
                <label htmlFor="organization-name">企业名称</label>
                <Input id="organization-name" maxLength={80} value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} />
                <p className="admin-action-help">负责人后续可邀请员工并分配可回收的创作额度。</p>
              </div>
            )}
          </div>
          <DialogFooter className="admin-action-dialog-footer">
            <Button variant="ghost" disabled={mutating} onClick={() => setSelected(null)}>取消</Button>
            <Button
              variant={selected?.action === "suspend" ? "destructive" : "default"}
              disabled={mutating || reason.trim().length < 2 || (selected?.action === "grant" && (!Number.isInteger(Number(amount)) || Number(amount) < 1 || Number(amount) > 5000)) || (selected?.action === "role" && businessRole === (selected.account.businessRole ?? "none")) || (selected?.action === "parent" && parentOwnerId === (selected.account.directParentId ?? "none")) || (selected?.action === "organization" && organizationName.trim().length < 2)}
              onClick={() => void runAction()}
            >
              {mutating && <LoaderCircle className="animate-spin" />}确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {!embedded && <Toaster position="bottom-center" toastOptions={{ duration: 2400 }} />}
    </section>
  );
}
