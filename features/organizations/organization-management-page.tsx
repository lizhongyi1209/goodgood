"use client";

import Image from "next/image";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Coins,
  Download,
  Images,
  LoaderCircle,
  RefreshCw,
  UserPlus,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
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
import { PrivateObjectImage } from "@/components/ui/private-object-image";
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
import { saveImageToLocal } from "@/features/assets/image-download";
import {
  inviteOrganizationMember,
  readOrganizationAssetDownloadUrl,
  readOrganizationAssets,
  readOrganizationDashboard,
  readOrganizationUsage,
  revokeOrganizationInvitation,
  updateOrganizationMember,
  updateOrganizationMemberBudget,
  type OrganizationAssetBatch,
  type OrganizationDashboard,
  type OrganizationMember,
  type OrganizationRole,
  type OrganizationUsage,
} from "./http-organization-boundary";

export type OrganizationManagementTab =
  | "overview"
  | "members"
  | "usage"
  | "assets";

const ROLE_LABELS: Record<OrganizationRole, string> = {
  org_admin: "管理员",
  org_member: "员工",
  org_owner: "负责人",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function navigationItems(workspaceId: string) {
  const root = `/organizations/${encodeURIComponent(workspaceId)}`;
  return [
    { href: root, icon: Building2, id: "overview" as const, label: "概览" },
    { href: `${root}/members`, icon: Users, id: "members" as const, label: "成员与额度" },
    { href: `${root}/usage`, icon: Coins, id: "usage" as const, label: "消费记录" },
    { href: `${root}/assets`, icon: Images, id: "assets" as const, label: "团队资产" },
  ];
}

export function OrganizationManagementPage({
  activeTab,
  workspaceId,
}: Readonly<{
  activeTab: OrganizationManagementTab;
  workspaceId: string;
}>) {
  const [session, setSession] = useState<AuthenticationSession | null | undefined>(undefined);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<OrganizationDashboard | null>(null);
  const [usage, setUsage] = useState<readonly OrganizationUsage[]>([]);
  const [assets, setAssets] = useState<readonly OrganizationAssetBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"org_admin" | "org_member">("org_member");
  const [inviteReason, setInviteReason] = useState("邀请加入企业工作区");
  const [budgetMember, setBudgetMember] = useState<OrganizationMember | null>(null);
  const [budgetLimit, setBudgetLimit] = useState("0");
  const [budgetReason, setBudgetReason] = useState("调整员工创作额度");
  const [downloadingAssetId, setDownloadingAssetId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void readAuthenticationSession()
      .then((next) => {
        if (active) setSession(next);
      })
      .catch((error) => {
        if (!active) return;
        setSession(null);
        setSessionError(
          error instanceof Error ? error.message : "暂时无法确认登录状态。",
        );
      });
    const expire = () => setSession(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, expire);
    return () => {
      active = false;
      window.removeEventListener(SESSION_EXPIRED_EVENT, expire);
    };
  }, []);

  const load = useCallback(async () => {
    if (!session || session.access.status !== "active" || session.preview) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [nextDashboard, nextUsage, nextAssets] = await Promise.all([
        readOrganizationDashboard(workspaceId),
        activeTab === "usage"
          ? readOrganizationUsage(workspaceId)
          : Promise.resolve({ usage: [] }),
        activeTab === "assets"
          ? readOrganizationAssets(workspaceId)
          : Promise.resolve({ batches: [] }),
      ]);
      setDashboard(nextDashboard);
      setUsage(nextUsage.usage);
      setAssets(nextAssets.batches);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "企业信息暂时无法读取，请重试。",
      );
    } finally {
      setLoading(false);
    }
  }, [activeTab, session, workspaceId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const logout = async () => {
    try {
      const redirecting = await signOut();
      if (!redirecting) setSession(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "退出登录失败。" );
    }
  };

  const submitInvitation = async (event: FormEvent) => {
    event.preventDefault();
    setMutating(true);
    try {
      await inviteOrganizationMember({
        email: inviteEmail,
        reason: inviteReason,
        role: inviteRole,
        workspaceId,
      });
      setInviteEmail("");
      toast.success("邀请已创建，员工登录后即可接受");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "邀请创建失败。" );
    } finally {
      setMutating(false);
    }
  };

  const changeRole = async (member: OrganizationMember, role: OrganizationRole) => {
    if (role === member.role) return;
    setMutating(true);
    try {
      await updateOrganizationMember({
        expectedVersion: member.version,
        membershipId: member.id,
        reason: "调整企业成员角色",
        role,
        status: member.status,
        workspaceId,
      });
      toast.success("成员角色已更新");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "成员角色更新失败。" );
    } finally {
      setMutating(false);
    }
  };

  const changeStatus = async (
    member: OrganizationMember,
    status: "active" | "suspended" | "removed",
  ) => {
    setMutating(true);
    try {
      await updateOrganizationMember({
        expectedVersion: member.version,
        membershipId: member.id,
        reason:
          status === "removed"
            ? "员工离开企业"
            : status === "suspended"
              ? "暂停员工企业访问"
              : "恢复员工企业访问",
        role: member.role,
        status,
        workspaceId,
      });
      toast.success(status === "removed" ? "成员已移除" : "成员状态已更新");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "成员状态更新失败。" );
    } finally {
      setMutating(false);
    }
  };

  const openBudget = (member: OrganizationMember) => {
    setBudgetMember(member);
    setBudgetLimit(member.budget?.creditLimit ?? "0");
    setBudgetReason("调整员工创作额度");
  };

  const saveBudget = async () => {
    if (!budgetMember) return;
    setMutating(true);
    try {
      await updateOrganizationMemberBudget({
        creditLimit: Number(budgetLimit),
        expectedVersion: Number(budgetMember.budget?.version ?? 0),
        membershipId: budgetMember.id,
        reason: budgetReason,
        workspaceId,
      });
      setBudgetMember(null);
      toast.success("员工额度已更新");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "额度更新失败。" );
    } finally {
      setMutating(false);
    }
  };

  const downloadAsset = async (
    batch: OrganizationAssetBatch,
    assetId: string,
    ordinal: number,
    previewUrl: string,
  ) => {
    setDownloadingAssetId(assetId);
    try {
      await saveImageToLocal(
        { assetId, createdAt: batch.createdAt, ordinal, previewUrl },
        {
          resolveDownloadUrl: (id) =>
            readOrganizationAssetDownloadUrl(workspaceId, id),
        },
      );
      toast.success("图片下载已开始");
    } catch {
      toast.error("下载失败，请重试");
    } finally {
      setDownloadingAssetId(null);
    }
  };

  if (session === undefined) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-white text-sm text-zinc-600">
        <LoaderCircle className="mr-2 animate-spin" />正在确认企业权限
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
        onHostedLogin={() =>
          beginAuthentication(`${window.location.pathname}${window.location.search}`)
        }
      />
    );
  }
  if (session.access.status !== "active") {
    return (
      <AccountAccessGate
        busy={false}
        onLogout={() => void logout()}
        onRefresh={() => window.location.reload()}
        session={session}
      />
    );
  }

  const navItems = navigationItems(workspaceId);
  const currentMembershipId = dashboard?.currentMembershipId ?? null;

  return (
    <main className="min-h-dvh bg-white text-zinc-950">
      <header className="border-b border-zinc-200">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <Image src="/goodgood-mark.svg" alt="" width={29} height={22} />
            <Image src="/goodgood-wordmark.svg" alt="GoodGood" width={89} height={20} />
            <span className="hidden border-l border-zinc-200 pl-4 text-sm text-zinc-500 sm:inline">企业工作台</span>
          </div>
          <Button variant="ghost" asChild>
            <a href={`/workspaces/${encodeURIComponent(workspaceId)}/create`}>
              <ArrowLeft />返回企业创作
            </a>
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-8 px-5 py-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8 lg:py-10">
        <aside>
          <p className="truncate text-sm font-medium text-zinc-500">{dashboard?.workspace.name ?? "企业工作区"}</p>
          <nav className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-1" aria-label="企业管理导航">
            {navItems.map((item) => (
              <Button key={item.id} variant={activeTab === item.id ? "secondary" : "ghost"} className="justify-start" asChild>
                <a href={item.href}><item.icon />{item.label}</a>
              </Button>
            ))}
          </nav>
        </aside>

        <section className="min-w-0">
          {loadError ? (
            <Alert variant="destructive">
              <AlertTitle>企业信息加载失败</AlertTitle>
              <AlertDescription className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <span>{loadError}</span><Button size="sm" variant="outline" onClick={() => void load()}><RefreshCw />重试</Button>
              </AlertDescription>
            </Alert>
          ) : loading || !dashboard ? (
            <div className="space-y-3" role="status" aria-label="正在加载企业信息">
              <Skeleton className="h-10 w-52" /><Skeleton className="h-28 w-full rounded-3xl" /><Skeleton className="h-72 w-full rounded-3xl" />
            </div>
          ) : activeTab === "overview" ? (
            <>
              <p className="text-sm font-medium text-primary">企业概览</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">{dashboard.workspace.name}</h1>
              <p className="mt-2 text-zinc-600">统一查看成员、额度、消费和团队创作资产。</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["企业可用积分", dashboard.account?.availableCredits ?? "0"],
                  ["未分配额度", dashboard.account?.unallocatedCredits ?? "0"],
                  ["有效成员", String(dashboard.members.filter((member) => member.status === "active").length)],
                  ["待接受邀请", String(dashboard.invitations.length)],
                ].map(([label, value]) => (
                  <div className="rounded-3xl border border-zinc-200 p-5" key={label}>
                    <span className="text-sm text-zinc-500">{label}</span>
                    <strong className="mt-2 block text-3xl tabular-nums">{value}</strong>
                  </div>
                ))}
              </div>
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {navItems.slice(1).map((item) => (
                  <a className="rounded-3xl border border-zinc-200 p-5 transition-colors hover:bg-zinc-50" href={item.href} key={item.id}>
                    <item.icon className="text-primary" /><strong className="mt-5 block">{item.label}</strong>
                    <span className="mt-1 block text-sm text-zinc-500">进入查看与管理</span>
                  </a>
                ))}
              </div>
            </>
          ) : activeTab === "members" ? (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div><p className="text-sm font-medium text-primary">成员与额度</p><h1 className="mt-2 text-3xl font-semibold">管理员工创作权限</h1></div>
              </div>
              <form className="mt-7 grid gap-3 rounded-3xl border border-zinc-200 p-5 lg:grid-cols-[minmax(220px,1fr)_150px_minmax(220px,1fr)_auto]" onSubmit={submitInvitation}>
                <Input aria-label="员工邮箱" placeholder="员工邮箱" type="email" required value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} />
                <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as "org_admin" | "org_member")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="org_member">员工</SelectItem><SelectItem value="org_admin">管理员</SelectItem></SelectContent></Select>
                <Input aria-label="邀请原因" placeholder="邀请原因" required value={inviteReason} onChange={(event) => setInviteReason(event.target.value)} />
                <Button disabled={mutating} type="submit"><UserPlus />创建邀请</Button>
              </form>
              {dashboard.invitations.length > 0 && (
                <div className="mt-4 space-y-2">
                  {dashboard.invitations.map((invitation) => (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-zinc-50 px-4 py-3 text-sm" key={invitation.id}>
                      <span>{invitation.email} · {ROLE_LABELS[invitation.role]} · {formatDate(invitation.expiresAt)} 前有效</span>
                      <Button size="sm" variant="ghost" disabled={mutating} onClick={async () => { setMutating(true); try { await revokeOrganizationInvitation({ invitationId: invitation.id, reason: "撤销未接受的企业邀请", workspaceId }); await load(); toast.success("邀请已撤销"); } catch (error) { toast.error(error instanceof Error ? error.message : "撤销失败。"); } finally { setMutating(false); } }}>撤销</Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-5 overflow-hidden rounded-3xl border border-zinc-200">
                <Table><TableHeader><TableRow><TableHead className="pl-5">成员</TableHead><TableHead>角色</TableHead><TableHead>额度</TableHead><TableHead>消费 / 预留</TableHead><TableHead className="pr-5 text-right">操作</TableHead></TableRow></TableHeader><TableBody>
                  {dashboard.members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="pl-5"><strong className="block">{member.email}</strong><Badge className="mt-1" variant="outline">{member.status === "active" ? "有效" : "已暂停"}</Badge></TableCell>
                      <TableCell><Select disabled={mutating || member.id === currentMembershipId} value={member.role} onValueChange={(value) => void changeRole(member, value as OrganizationRole)}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="org_member">员工</SelectItem><SelectItem value="org_admin">管理员</SelectItem><SelectItem value="org_owner">负责人</SelectItem></SelectContent></Select></TableCell>
                      <TableCell className="tabular-nums">{member.budget?.remainingCredits ?? "0"} / {member.budget?.creditLimit ?? "0"}</TableCell>
                      <TableCell className="tabular-nums">{member.budget?.settledCredits ?? "0"} / {member.budget?.reservedCredits ?? "0"}</TableCell>
                      <TableCell className="pr-5"><div className="flex justify-end gap-1"><Button size="sm" variant="ghost" disabled={mutating} onClick={() => openBudget(member)}>额度</Button>{member.id !== currentMembershipId && (member.status === "active" ? <Button size="sm" variant="ghost" disabled={mutating} onClick={() => void changeStatus(member, "suspended")}>暂停</Button> : <Button size="sm" variant="ghost" disabled={mutating} onClick={() => void changeStatus(member, "active")}>恢复</Button>)}{member.id !== currentMembershipId && <Button size="sm" variant="ghost" disabled={mutating} className="text-red-700" onClick={() => void changeStatus(member, "removed")}>移除</Button>}</div></TableCell>
                    </TableRow>
                  ))}
                </TableBody></Table>
              </div>
            </>
          ) : activeTab === "usage" ? (
            <>
              <p className="text-sm font-medium text-primary">消费记录</p><h1 className="mt-2 text-3xl font-semibold">已结算的企业创作</h1>
              {usage.length === 0 ? <div className="mt-8 rounded-3xl border border-dashed border-zinc-300 py-16 text-center text-zinc-500">还没有企业消费记录</div> : <div className="mt-7 overflow-hidden rounded-3xl border border-zinc-200"><Table><TableHeader><TableRow><TableHead className="pl-5">员工</TableHead><TableHead>提示词</TableHead><TableHead>模型 / 输出</TableHead><TableHead>积分</TableHead><TableHead className="pr-5">时间</TableHead></TableRow></TableHeader><TableBody>{usage.map((item) => <TableRow key={item.id}><TableCell className="pl-5">{item.email}</TableCell><TableCell className="max-w-[380px] truncate">{item.prompt}</TableCell><TableCell>{item.modelId} · {item.resolution} · {item.count} 张</TableCell><TableCell className="font-medium tabular-nums">{item.creditAmount}</TableCell><TableCell className="pr-5 text-zinc-500">{formatDate(item.createdAt)}</TableCell></TableRow>)}</TableBody></Table></div>}
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-primary">团队资产</p><h1 className="mt-2 text-3xl font-semibold">检查企业创作效果</h1><p className="mt-2 text-zinc-600">仅展示生成结果；员工上传的原始参考素材不会向管理员签发。</p>
              {assets.length === 0 ? <div className="mt-8 rounded-3xl border border-dashed border-zinc-300 py-16 text-center text-zinc-500">企业资产库还是空的</div> : <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{assets.flatMap((batch) => batch.outputs.map((output, index) => <article className="overflow-hidden rounded-3xl border border-zinc-200" key={output.id}><div className="relative bg-zinc-100" style={{ aspectRatio: output.width && output.height ? `${output.width}/${output.height}` : "1/1" }}><PrivateObjectImage src={output.previewUrl} alt="企业生成资产" style={{ objectFit: "cover" }} /><Button className="absolute bottom-3 right-3" size="icon" variant="secondary" disabled={downloadingAssetId === output.id} onClick={() => void downloadAsset(batch, output.id, index + 1, output.previewUrl)}>{downloadingAssetId === output.id ? <LoaderCircle className="animate-spin" /> : <Download />}<span className="sr-only">下载图片</span></Button></div><div className="p-4"><strong className="block truncate">{batch.creator.email}</strong><p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-600">{batch.input.prompt}</p><span className="mt-3 block text-xs text-zinc-500">{formatDate(batch.createdAt)} · {batch.input.modelId} · {batch.input.resolution}</span></div></article>))}</div>}
            </>
          )}
        </section>
      </div>

      <Dialog open={budgetMember !== null} onOpenChange={(open) => { if (!open) setBudgetMember(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>调整员工额度</DialogTitle><DialogDescription>{budgetMember?.email} 当前剩余 {budgetMember?.budget?.remainingCredits ?? "0"} 积分。新额度不能低于已消费与在途预留。</DialogDescription></DialogHeader>
          <div className="space-y-4"><label className="space-y-2 text-sm"><span>累计额度</span><Input inputMode="numeric" min={0} type="number" value={budgetLimit} onChange={(event) => setBudgetLimit(event.target.value)} /></label><label className="space-y-2 text-sm"><span>调整原因</span><Textarea value={budgetReason} onChange={(event) => setBudgetReason(event.target.value)} /></label></div>
          <DialogFooter><Button variant="ghost" onClick={() => setBudgetMember(null)}>取消</Button><Button disabled={mutating || !budgetReason.trim()} onClick={() => void saveBudget()}>{mutating ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 />}确认额度</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Toaster position="bottom-center" toastOptions={{ duration: 2400 }} />
    </main>
  );
}
