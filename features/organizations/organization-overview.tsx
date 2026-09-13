"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Images, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import type { OrganizationAssetBatch, OrganizationDashboard, OrganizationMember } from "./http-organization-boundary";
import { overviewAttention, overviewMembers, recentOrganizationOutputs } from "./organization-overview-model";
import { useOverviewAssets } from "./use-overview-assets";

type Props = Readonly<{
  dashboard: OrganizationDashboard;
  mutating: boolean;
  onAdjustBudget: (member: OrganizationMember) => void;
  onMembers: () => void;
  onAssets: () => void;
}>;

export function OrganizationOverview(props: Props) {
  const assets = useOverviewAssets(props.dashboard.workspace.id);
  return <OrganizationOverviewContent {...props} assets={assets} />;
}

export function OrganizationOverviewContent({ dashboard, mutating, onAdjustBudget, onMembers, onAssets, assets }: Props & Readonly<{
  assets: Readonly<{ batches: readonly OrganizationAssetBatch[]; loading: boolean; error: string | null; reload: () => void }>;
}>) {
  const [selected, setSelected] = useState<ReturnType<typeof recentOrganizationOutputs>[number] | null>(null);
  const [imageState, setImageState] = useState<"loading" | "ready" | "failed">("loading");
  const [imageAttempt, setImageAttempt] = useState(0);
  const detailTriggerRef = useRef<HTMLButtonElement | null>(null);
  const attention = overviewAttention(dashboard);
  const members = overviewMembers(dashboard);
  const outputs = recentOrganizationOutputs(assets.batches);
  return <div className="organization-overview">
    <div className="organization-summary-grid" aria-label="企业核心指标">
      <div className="organization-summary"><span>企业可用积分</span><strong>{dashboard.account?.availableCredits ?? "—"}</strong>
        <p>未分配额度 {dashboard.account?.unallocatedCredits ?? "—"}</p></div>
      {["本月已消费", "本月生成成品", "本月活跃成员"].map((label) => <div className="organization-summary" key={label}>
        <span>{label}</span><strong aria-label={`${label}暂未接入`}>—</strong><p>待接入统计</p>
      </div>)}
    </div>
    <p className="organization-overview-period-note">本月指标待完整统计接口接入；不以最近记录估算。以下额度与成员信息为当前真实数据。</p>

    <section className="organization-overview-attention" aria-labelledby="organization-attention-title">
      <div className="organization-section-heading"><div><h2 id="organization-attention-title">需要关注</h2>
        <p>{attention.length ? `${attention.length} 项影响团队创作或成员加入的事项` : "目前没有需要处理的额度或邀请事项"}</p></div>
        {attention.length > 5 && <Button size="sm" variant="ghost" onClick={onMembers}>查看全部成员</Button>}</div>
      <div className="organization-overview-attention-list">
        {attention.length === 0 ? <div className="organization-overview-clear"><CheckCircle2 size={17} /><span>团队额度与邀请状态正常</span></div>
          : attention.slice(0, 5).map((item) => <div className="organization-overview-attention-row" key={item.id}>
            <AlertCircle size={17} /><div><strong>{item.title}</strong><p>{item.description}</p></div>
            {item.member ? <Button size="sm" variant="ghost" disabled={mutating} onClick={() => onAdjustBudget(item.member!)}>调整额度</Button>
              : item.id.startsWith("invite-") && <Button size="sm" variant="ghost" onClick={onMembers}>查看邀请</Button>}
          </div>)}
      </div>
    </section>

    <div className="organization-overview-columns">
      <section className="organization-overview-members" aria-labelledby="organization-overview-members-title">
        <div className="organization-section-heading"><div><h2 id="organization-overview-members-title">成员使用概况</h2>
          <p>{members.length} 位有效成员 · 按累计消费排序</p></div><Button size="sm" variant="ghost" onClick={onMembers}>查看全部</Button></div>
        <div className="organization-overview-member-list">
          {members.length === 0 ? <p className="organization-overview-empty">还没有有效成员</p> : <>
            <div className="organization-overview-member-head" aria-hidden="true"><span>成员</span><span>累计已消费</span><span>剩余额度</span><span /></div>
            {members.slice(0, 5).map((member) => <div className="organization-overview-member-row" key={member.id}>
              <strong>{member.email}<small>{member.role === "org_owner" ? "负责人" : member.role === "org_admin" ? "管理员" : "员工"}</small></strong>
              <span><small>累计已消费</small>{member.budget?.settledCredits ?? "0"}</span>
              <span><small>剩余额度</small>{member.budget?.remainingCredits ?? "0"}</span>
              <Button size="sm" variant="ghost" disabled={mutating} onClick={() => onAdjustBudget(member)}>调整额度</Button>
            </div>)}
          </>}
        </div>
      </section>

      <section className="organization-overview-outputs" aria-labelledby="organization-overview-outputs-title">
        <div className="organization-section-heading"><div><h2 id="organization-overview-outputs-title">最近团队成品</h2>
          <p>最近成功生成的图片 · 不含个人作品</p></div><Button size="sm" variant="ghost" onClick={onAssets}>查看全部</Button></div>
        {assets.error ? <div className="organization-overview-empty" role="alert"><p>{assets.error}</p>
          <Button size="sm" variant="ghost" disabled={assets.loading} onClick={assets.reload}><RefreshCw size={15} />重新读取</Button></div>
          : assets.loading ? <div className="organization-overview-output-grid" role="status" aria-label="正在读取最近成品">
            {[1, 2, 3].map((item) => <Skeleton key={item} className="organization-overview-output-skeleton" />)}</div>
            : outputs.length === 0 ? <div className="organization-overview-empty"><Images size={20} /><p>还没有团队成品</p><span>企业创作完成后，最新作品会显示在这里。</span></div>
              : <div className="organization-overview-output-grid">{outputs.map((item) => <button className="organization-overview-output" key={item.output.id}
                onClick={(event) => { detailTriggerRef.current = event.currentTarget; setSelected(item); setImageState("loading"); setImageAttempt(0); }} aria-label={`查看 ${item.batch.creator.email} 的成品详情`}>
                <PrivateObjectImage src={item.output.previewUrl} alt={item.batch.input.prompt} style={{ aspectRatio: "1/1", objectFit: "cover" }} />
                <span>{item.batch.creator.email}</span><time dateTime={item.batch.createdAt}>{new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" }).format(new Date(item.batch.createdAt))}</time>
              </button>)}</div>}
      </section>
    </div>

    <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
      <DialogContent className="admin-action-dialog organization-overview-detail" overlayClassName="admin-action-dialog-overlay"
        onCloseAutoFocus={(event) => { event.preventDefault(); detailTriggerRef.current?.focus(); }}>
        <DialogHeader className="admin-action-dialog-header"><DialogTitle>团队成品详情</DialogTitle>
          <DialogDescription>{selected?.batch.creator.email} · {selected && new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(selected.batch.createdAt))}</DialogDescription></DialogHeader>
        {selected && <div className="organization-overview-detail-body"><div className="organization-overview-detail-stage">
          <PrivateObjectImage key={`${selected.output.id}-${imageAttempt}`} src={selected.output.previewUrl} alt={selected.batch.input.prompt} loading="eager"
            onLoad={() => setImageState("ready")} onError={() => setImageState("failed")} style={{ objectFit: "contain", opacity: imageState === "ready" ? 1 : 0 }} />
          {imageState === "loading" && <span role="status">正在加载图片</span>}
          {imageState === "failed" && <div role="alert"><p>图片暂时无法加载</p><Button size="sm" variant="ghost" onClick={() => { setImageState("loading"); setImageAttempt((value) => value + 1); }}>重试</Button>
            <Button size="sm" variant="ghost" onClick={() => { setSelected(null); assets.reload(); }}>刷新成品地址</Button></div>}
        </div><p>{selected.batch.input.prompt}</p><span>{selected.batch.input.modelId} · {selected.batch.input.resolution} · {selected.batch.input.aspectRatio}
          {selected.output.width && selected.output.height ? ` · ${selected.output.width} × ${selected.output.height}` : ""}</span></div>}
      </DialogContent>
    </Dialog>
  </div>;
}
