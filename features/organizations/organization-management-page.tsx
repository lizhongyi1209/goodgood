"use client";

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
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
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
import { navigateWorkspace } from "@/features/navigation/workspace-route.mjs";
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

export function OrganizationManagementView({
  activeTab,
  workspaceId,
  enabled,
}: Readonly<{
  activeTab: OrganizationManagementTab;
  workspaceId: string;
  enabled: boolean;
}>) {
  const [dashboard, setDashboard] = useState<OrganizationDashboard | null>(null);
  const [usage, setUsage] = useState<readonly OrganizationUsage[]>([]);
  const [assets, setAssets] = useState<readonly OrganizationAssetBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"org_admin" | "org_member">("org_member");
  const [inviteReason, setInviteReason] = useState("邀请加入企业工作区");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [budgetMember, setBudgetMember] = useState<OrganizationMember | null>(null);
  const [budgetLimit, setBudgetLimit] = useState("0");
  const [budgetReason, setBudgetReason] = useState("调整员工创作额度");
  const [downloadingAssetId, setDownloadingAssetId] = useState<string | null>(null);
  const loadRequestRef = useRef(0);

  const load = useCallback(async () => {
    if (!enabled) return;
    const request = ++loadRequestRef.current;
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
      if (request !== loadRequestRef.current) return;
      setDashboard(nextDashboard);
      setUsage(nextUsage.usage);
      setAssets(nextAssets.batches);
    } catch (error) {
      if (request !== loadRequestRef.current) return;
      setLoadError(
        error instanceof Error
          ? error.message
          : "企业信息暂时无法读取，请重试。",
      );
    } finally {
      if (request === loadRequestRef.current) setLoading(false);
    }
  }, [activeTab, enabled, workspaceId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => { window.clearTimeout(timer); loadRequestRef.current += 1; };
  }, [load]);

  const submitInvitation = async (event: FormEvent) => {
    event.preventDefault();
    setActionError(null);
    setMutating(true);
    try {
      await inviteOrganizationMember({
        email: inviteEmail,
        reason: inviteReason,
        role: inviteRole,
        workspaceId,
      });
      setInviteEmail("");
      setInviteOpen(false);
      toast.success("邀请已创建，员工登录后即可接受");
      await load();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "邀请创建失败。");
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
    setActionError(null);
    setBudgetMember(member);
    setBudgetLimit(member.budget?.creditLimit ?? "0");
    setBudgetReason("调整员工创作额度");
  };

  const saveBudget = async () => {
    if (!budgetMember) return;
    setActionError(null);
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
      setActionError(error instanceof Error ? error.message : "额度更新失败。");
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

  if (!enabled) return <section className="organization-state">请使用已开通的账户查看企业管理。</section>;

  const navItems = navigationItems(workspaceId);
  const currentMembershipId = dashboard?.currentMembershipId ?? null;
  const navigateTab = (tab: OrganizationManagementTab) => navigateWorkspace({ kind: "organizations", organizationId: workspaceId, tab });
  const roleControl = (member: OrganizationMember) => <Select
    disabled={mutating || member.status === "removed" || member.id === currentMembershipId}
    value={member.role} onValueChange={(value) => void changeRole(member, value as OrganizationRole)}>
    <SelectTrigger className="organization-role-control" aria-label={`调整 ${member.email} 的角色`}><SelectValue /></SelectTrigger>
    <SelectContent><SelectItem value="org_member">员工</SelectItem><SelectItem value="org_admin">管理员</SelectItem><SelectItem value="org_owner">负责人</SelectItem></SelectContent>
  </Select>;
  const memberActions = (member: OrganizationMember) => <div className="organization-member-actions">
    <Button size="sm" variant="ghost" disabled={mutating || member.status === "removed"} onClick={() => openBudget(member)}>调整额度</Button>
    {member.id !== currentMembershipId && member.status !== "removed" && <>
      <Button size="sm" variant="ghost" disabled={mutating} onClick={() => void changeStatus(member, member.status === "active" ? "suspended" : "active")}>{member.status === "active" ? "暂停" : "恢复"}</Button>
      <Button size="sm" variant="ghost" disabled={mutating} onClick={() => void changeStatus(member, "removed")}>移除</Button>
    </>}
  </div>;
  const memberMetrics = (member: OrganizationMember) => [
    ["累计额度", member.budget?.creditLimit ?? "0"],
    ["已消费", member.budget?.settledCredits ?? "0"],
    ["预留", member.budget?.reservedCredits ?? "0"],
    ["剩余", member.budget?.remainingCredits ?? "0"],
  ];
  const statusLabel = (member: OrganizationMember) => member.status === "active" ? "有效" : member.status === "removed" ? "已移除" : "已暂停";

  return <section className="organization-view" aria-label="企业管理">
    <header className="organization-header">
      <div><h1>{dashboard?.workspace.name ?? "企业管理"}</h1><p>企业成员、创作额度、消费与资产统一管理。</p></div>
      <Button variant="ghost" size="sm" onClick={() => navigateWorkspace({ kind: "organizations" })}><ArrowLeft />企业列表</Button>
    </header>
    <nav className="organization-tabs" aria-label="企业管理内容">
      {navItems.map((item) => <button className={activeTab === item.id ? "active" : ""} aria-current={activeTab === item.id ? "page" : undefined} key={item.id} onClick={() => navigateTab(item.id)}><item.icon size={16} />{item.label}</button>)}
    </nav>

    {loadError ? <Alert variant="destructive" className="organization-load-error">
      <AlertTitle>企业信息加载失败</AlertTitle><AlertDescription><span>{loadError}</span><Button size="sm" variant="ghost" onClick={() => void load()}><RefreshCw />重试</Button><Button size="sm" variant="ghost" onClick={() => navigateWorkspace({ kind: "organizations" })}>返回企业列表</Button></AlertDescription>
    </Alert> : loading || !dashboard ? <div className="organization-loading" role="status" aria-label="正在加载企业信息"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-48 rounded-2xl" /></div> : activeTab === "overview" ? <>
      <div className="organization-summary-grid">
        {[
          ["企业可用积分", dashboard.account?.availableCredits ?? "0"],
          ["未分配额度", dashboard.account?.unallocatedCredits ?? "0"],
          ["有效成员", String(dashboard.members.filter((member) => member.status === "active").length)],
          ["待接受邀请", String(dashboard.invitations.filter((invitation) => invitation.status === "pending").length)],
        ].map(([label, value]) => <div className="organization-summary" key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <div className="organization-shortcuts">{navItems.slice(1).map((item) => <button key={item.id} onClick={() => navigateTab(item.id)}><item.icon size={18} /><strong>{item.label}</strong><span>{item.id === "members" ? "邀请员工，调整创作额度" : item.id === "usage" ? "核对企业创作积分消耗" : "查看团队生成的成品"}</span></button>)}</div>
      <p className="organization-note">员工额度是企业创作预算；主导航中的“积分分配”用于直属账户之间的充值来源积分划拨，两者独立。</p>
    </> : activeTab === "members" ? <>
      <div className="organization-section-heading"><div><h2>成员与额度</h2><p>剩余额度不包含已消费和在途预留，减少额度不会追回已使用积分。</p></div><Button variant="ghost" onClick={() => { setActionError(null); setInviteOpen(true); }}><UserPlus />邀请成员</Button></div>
      {dashboard.invitations.length > 0 && <section className="organization-invitations" aria-label="待接受邀请"><h3>待接受邀请</h3>
        {dashboard.invitations.map((invitation) => <div className="organization-invitation-row" key={invitation.id}><div><strong>{invitation.email}</strong><span>{ROLE_LABELS[invitation.role]} · {formatDate(invitation.expiresAt)} 前有效</span></div>
          <Button size="sm" variant="ghost" disabled={mutating} onClick={async () => { setMutating(true); try { await revokeOrganizationInvitation({ invitationId: invitation.id, reason: "撤销未接受的企业邀请", workspaceId }); await load(); toast.success("邀请已撤销"); } catch (error) { toast.error(error instanceof Error ? error.message : "撤销失败。"); } finally { setMutating(false); } }}>撤销</Button></div>)}
      </section>}
      {dashboard.members.length === 0 ? <div className="organization-state">暂无成员</div> : <>
        <div className="organization-table organization-members-desktop"><Table><TableHeader><TableRow><TableHead>成员</TableHead><TableHead>角色</TableHead><TableHead>累计额度</TableHead><TableHead>已消费</TableHead><TableHead>预留</TableHead><TableHead>剩余</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader><TableBody>
          {dashboard.members.map((member) => <TableRow key={member.id}><TableCell><strong className="organization-member-email">{member.email}</strong><Badge variant="secondary">{statusLabel(member)}</Badge></TableCell><TableCell>{roleControl(member)}</TableCell>
            {memberMetrics(member).map(([label, value]) => <TableCell className="organization-number" key={label}>{value}</TableCell>)}<TableCell>{memberActions(member)}</TableCell></TableRow>)}
        </TableBody></Table></div>
        <div className="organization-members-mobile">{dashboard.members.map((member) => <article className="organization-member-card" key={member.id}><header><strong>{member.email}</strong><Badge variant="secondary">{statusLabel(member)}</Badge></header><div className="organization-mobile-role"><span>角色</span>{roleControl(member)}</div><dl>{memberMetrics(member).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{memberActions(member)}</article>)}</div>
      </>}
    </> : activeTab === "usage" ? <>
      <div className="organization-section-heading"><div><h2>消费记录</h2><p>查看企业创作的已结算积分，保留员工与任务信息。</p></div></div>
      {usage.length === 0 ? <div className="organization-state">还没有企业消费记录</div> : <>
        <div className="organization-table organization-usage-desktop"><Table><TableHeader><TableRow><TableHead>员工</TableHead><TableHead>提示词</TableHead><TableHead>模型 / 输出</TableHead><TableHead>积分</TableHead><TableHead>时间</TableHead></TableRow></TableHeader><TableBody>
          {usage.map((item) => <TableRow key={item.id}><TableCell>{item.email}</TableCell><TableCell className="organization-prompt-cell" title={item.prompt}>{item.prompt}</TableCell><TableCell>{item.modelId} · {item.resolution} · {item.count} 张</TableCell><TableCell className="organization-number">{item.creditAmount}</TableCell><TableCell>{formatDate(item.createdAt)}</TableCell></TableRow>)}
        </TableBody></Table></div>
        <div className="organization-usage-mobile">{usage.map((item) => <article className="organization-member-card" key={item.id}><header><strong>{item.email}</strong><span>{item.creditAmount} 积分</span></header><p>{item.prompt}</p><dl><div><dt>模型 / 输出</dt><dd>{item.modelId} · {item.resolution} · {item.count} 张</dd></div><div><dt>时间</dt><dd>{formatDate(item.createdAt)}</dd></div></dl></article>)}</div>
      </>}
    </> : <>
      <div className="organization-section-heading"><div><h2>团队资产</h2><p>仅展示企业生成结果，不开放员工的原始参考素材。</p></div></div>
      {assets.length === 0 ? <div className="organization-state">企业资产库还是空的</div> : <div className="organization-assets-grid">{assets.flatMap((batch) => batch.outputs.map((output, index) => <article className="organization-asset-card" key={output.id}>
        <div className="organization-asset-image" style={{ aspectRatio: output.width && output.height ? `${output.width}/${output.height}` : "1/1" }}><PrivateObjectImage src={output.previewUrl} alt="企业生成资产" style={{ objectFit: "contain" }} />
          <Button className="organization-download" size="icon" variant="ghost" disabled={downloadingAssetId === output.id} onClick={() => void downloadAsset(batch, output.id, index + 1, output.previewUrl)}>{downloadingAssetId === output.id ? <LoaderCircle className="animate-spin" /> : <Download />}<span className="sr-only">下载图片</span></Button>
        </div><div className="organization-asset-meta"><strong>{batch.creator.email}</strong><p>{batch.input.prompt}</p><span>{formatDate(batch.createdAt)} · {batch.input.modelId} · {batch.input.resolution}</span></div>
      </article>))}</div>}
    </>}

    <Dialog open={inviteOpen} onOpenChange={(open) => { if (!mutating) setInviteOpen(open); }}>
      <DialogContent className="admin-action-dialog" overlayClassName="admin-action-dialog-overlay" onEscapeKeyDown={(event) => { if (mutating) event.preventDefault(); }} onInteractOutside={(event) => { if (mutating) event.preventDefault(); }}>
        <DialogHeader className="admin-action-dialog-header"><DialogTitle>邀请企业成员</DialogTitle><DialogDescription>{dashboard?.workspace.name} · 对方需使用对应邮箱登录后接受邀请，不会创建新的登录凭据。</DialogDescription></DialogHeader>
        <form onSubmit={submitInvitation}><div className="admin-action-dialog-body organization-dialog-body">
          <label htmlFor="organization-invite-email">员工邮箱<Input id="organization-invite-email" type="email" required value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="name@example.com" /></label>
          <label>角色<Select value={inviteRole} onValueChange={(value) => setInviteRole(value as "org_admin" | "org_member")}><SelectTrigger aria-label="邀请成员角色"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="org_member">员工</SelectItem><SelectItem value="org_admin">管理员</SelectItem></SelectContent></Select></label>
          <label htmlFor="organization-invite-reason">邀请原因<Input id="organization-invite-reason" required value={inviteReason} onChange={(event) => setInviteReason(event.target.value)} /></label>
          {actionError && <p className="organization-inline-error" role="alert">{actionError}</p>}
        </div><DialogFooter className="admin-action-dialog-footer"><Button type="button" variant="ghost" disabled={mutating} onClick={() => setInviteOpen(false)}>取消</Button><Button type="submit" disabled={mutating || !inviteEmail.trim() || !inviteReason.trim()}>{mutating ? <LoaderCircle className="animate-spin" /> : <UserPlus />}确认邀请</Button></DialogFooter></form>
      </DialogContent>
    </Dialog>
    <Dialog open={budgetMember !== null} onOpenChange={(open) => { if (!open && !mutating) setBudgetMember(null); }}>
      <DialogContent className="admin-action-dialog" overlayClassName="admin-action-dialog-overlay" onEscapeKeyDown={(event) => { if (mutating) event.preventDefault(); }} onInteractOutside={(event) => { if (mutating) event.preventDefault(); }}>
        <DialogHeader className="admin-action-dialog-header"><DialogTitle>调整员工额度</DialogTitle><DialogDescription>{budgetMember?.email} · 新累计额度不能低于已消费与在途预留。</DialogDescription></DialogHeader>
        <div className="admin-action-dialog-body organization-dialog-body">
          <dl className="organization-budget-context">{[["企业可用积分", dashboard?.account?.availableCredits ?? "0"], ["未分配额度", dashboard?.account?.unallocatedCredits ?? "0"], ...(budgetMember ? memberMetrics(budgetMember) : [])].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          <label htmlFor="organization-budget-limit">新累计额度<Input id="organization-budget-limit" inputMode="numeric" min={0} step={1} type="number" value={budgetLimit} onChange={(event) => setBudgetLimit(event.target.value)} /></label>
          <p className="organization-note">额度变化：{Number.isSafeInteger(Number(budgetLimit)) && Number(budgetLimit) >= 0 ? Number(budgetLimit) - Number(budgetMember?.budget?.creditLimit ?? 0) : "请输入有效整数"} 积分</p>
          <label htmlFor="organization-budget-reason">调整原因<Textarea id="organization-budget-reason" value={budgetReason} onChange={(event) => setBudgetReason(event.target.value)} /></label>
          {actionError && <p className="organization-inline-error" role="alert">{actionError}</p>}
        </div><DialogFooter className="admin-action-dialog-footer"><Button variant="ghost" disabled={mutating} onClick={() => setBudgetMember(null)}>取消</Button><Button disabled={mutating || !budgetReason.trim() || !budgetLimit.trim() || !Number.isSafeInteger(Number(budgetLimit)) || Number(budgetLimit) < 0} onClick={() => void saveBudget()}>{mutating ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 />}确认额度</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </section>;
}
