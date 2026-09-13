"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleAlert,
  LoaderCircle,
  RefreshCw,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { transfersForCounterparty } from "./transfer-history.mjs";
import { transferAndRefresh } from "./transfer-and-refresh";
import type { DistributionPreviewData } from "./business-style-fixtures";
import type { BillingAccountSummary } from "@/shared/contracts/billing";
import type {
  CreditTransferPage,
  DistributionChild,
  DistributionSummary,
} from "@/shared/contracts/distribution";
import {
  createDistributionTransfer,
  readDistributionChildren,
  readDistributionSummary,
  readDistributionTransfers,
} from "./http-distribution-boundary";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function BusinessAccountContent({ summary, directAccounts, transfers, tab, context, historyAccount, onTransfer, onShowRecords, onClearRecords, loadingMore, loadMoreError, onLoadMore }: Readonly<{
  summary: DistributionSummary;
  directAccounts: readonly DistributionChild[];
  transfers: CreditTransferPage;
  tab: "children" | "transfers";
  context: "enterprise" | "distributor";
  historyAccount: Pick<DistributionChild, "id" | "email"> | null;
  onTransfer: (child: DistributionChild) => void;
  onShowRecords: (child: DistributionChild) => void;
  onClearRecords: () => void;
  loadingMore: boolean;
  loadMoreError: string | null;
  onLoadMore: () => void;
}>) {
  const visibleTransfers = transfersForCounterparty(transfers.items, historyAccount?.id);
  return <>
    <dl className="business-account-facts" aria-label="当前个人账户">
      <div><dt>可分配积分</dt><dd>{summary.account.transferableCredits}</dd></div>
      <div><dt>个人可用积分</dt><dd>{summary.account.availableCredits}</dd></div>
      <div><dt>直属账户</dt><dd>{summary.directChildCount}</dd></div>
    </dl>
    <p className="organization-note">只可把充值来源积分分配给直属下级；兑换价格与收款由你在线下自行处理。划拨提交后不可撤回或编辑。</p>
    {tab === "children" ? <section className="distribution-panel" aria-labelledby="distribution-children-title">
      <div className="distribution-panel-heading"><div><h2 id="distribution-children-title">{context === "enterprise" ? "直属账户" : "客户与下级"}</h2>
        <p>直属关系由站长设置，不与企业成员或邀请自动关联。</p></div><UsersRound /></div>
      {directAccounts.length === 0 ? <div className="distribution-empty"><UsersRound /><strong>还没有直属下级</strong>
        <span>直属关系需要由站长在账户管理中设置。</span></div>
        : <div className="distribution-child-list">{directAccounts.map((child) => <article key={child.id}>
          <div><strong>{child.email}</strong><span>累计分配 {child.allocatedCredits}{child.lastTransferredAt
            ? ` · 最近 ${dateFormatter.format(new Date(child.lastTransferredAt))}` : " · 尚未分配"}</span></div>
          <div className="distribution-row-actions">
            <Button size="sm" variant="ghost" onClick={() => onShowRecords(child)}>查看记录</Button>
            <Button size="sm" variant="ghost" onClick={() => onTransfer(child)}>分配积分</Button>
          </div></article>)}</div>}
    </section> : <section className="distribution-panel" aria-labelledby="distribution-history-title">
      <div className="distribution-panel-heading"><div><h2 id="distribution-history-title">划拨记录</h2><p>公开编号可用于对账追溯</p></div>
        {historyAccount && <Button size="sm" variant="ghost" onClick={onClearRecords}>全部记录</Button>}</div>
      {historyAccount && <p className="distribution-history-scope">{historyAccount.email}
        {transfers.nextCursor ? " · 仅筛选已加载记录，可继续加载更多" : " · 已加载全部记录"}</p>}
      {visibleTransfers.length === 0 ? <div className="distribution-empty"><ArrowUpRight />
        <strong>{historyAccount ? transfers.nextCursor ? "已加载记录中暂无此账户划拨" : "此账户暂无划拨记录" : "还没有划拨记录"}</strong>
        <span>{historyAccount && transfers.nextCursor ? "这不代表全部历史为空，请继续加载或查看全部记录。" : "完成第一笔分配后会显示在这里。"}</span></div>
        : <div className="distribution-transfer-list">{visibleTransfers.map((transfer) => <article key={transfer.id}>
          <div className={`distribution-transfer-icon ${transfer.direction}`}>
            {transfer.direction === "outgoing" ? <ArrowUpRight /> : <ArrowDownLeft />}</div>
          <div><strong>{transfer.direction === "outgoing" ? "分配给" : "收到来自"} {transfer.counterpartyEmail ?? "账户不可用"}</strong>
            <span>{transfer.id} · {dateFormatter.format(new Date(transfer.createdAt))}</span>
            {transfer.remark && <span>备注：{transfer.remark}</span>}</div>
          <b className={transfer.direction}>{transfer.direction === "outgoing" ? "−" : "+"}{transfer.amount}</b>
        </article>)}</div>}
      {loadMoreError && <p className="distribution-more-error" role="alert">{loadMoreError}</p>}
      {transfers.nextCursor && <div className="distribution-history-more"><Button variant="ghost" disabled={loadingMore} onClick={onLoadMore}>
        {loadingMore && <LoaderCircle className="animate-spin" />}加载更多</Button></div>}
    </section>}
  </>;
}

type Props = Readonly<{
  enabled: boolean;
  onAccountChange: (account: BillingAccountSummary) => void;
  tab: "children" | "transfers";
  context: "enterprise" | "distributor";
  historyAccount: Pick<DistributionChild, "id" | "email"> | null;
  onShowRecords: (child: DistributionChild) => void;
  onClearRecords: () => void;
  previewData?: DistributionPreviewData;
}>;

export function DistributionView({ enabled, onAccountChange, tab, context, historyAccount, onShowRecords, onClearRecords, previewData }: Props) {
  const [summary, setSummary] = useState<DistributionSummary | null>(previewData?.summary ?? null);
  const [children, setChildren] = useState<readonly DistributionChild[]>(previewData?.directAccounts ?? []);
  const [transfers, setTransfers] = useState<CreditTransferPage | null>(previewData?.transfers ?? null);
  const [loading, setLoading] = useState(!previewData);
  const [error, setError] = useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<DistributionChild | null>(null);
  const [amount, setAmount] = useState("10");
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const loadRequestRef = useRef(0);

  const load = useCallback(async () => {
    if (!enabled || previewData) return;
    const request = ++loadRequestRef.current;
    setLoading(true);
    setError(null);
    try {
      const [nextSummary, nextChildren, nextTransfers] = await Promise.all([
        readDistributionSummary(),
        readDistributionChildren(),
        readDistributionTransfers(),
      ]);
      if (request !== loadRequestRef.current) return;
      setSummary(nextSummary);
      setChildren(nextChildren.items);
      setTransfers(nextTransfers);
      setRefreshError(null);
      onAccountChange(nextSummary.account);
    } catch (failure) {
      if (request !== loadRequestRef.current) return;
      setError(
        failure instanceof Error
          ? failure.message
          : "积分分配暂时无法读取，请稍后重试。",
      );
    } finally {
      if (request === loadRequestRef.current) setLoading(false);
    }
  }, [enabled, onAccountChange, previewData]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => { window.clearTimeout(timer); loadRequestRef.current += 1; };
  }, [load]);

  const amountIsValid = useMemo(() => {
    if (!summary || !/^[1-9]\d*$/.test(amount)) return false;
    try {
      return BigInt(amount) <= BigInt(summary.account.transferableCredits);
    } catch {
      return false;
    }
  }, [amount, summary]);

  const openTransfer = (child: DistributionChild) => {
    setSelectedChild(child);
    setAmount("10");
    setRemark("");
    setSubmitError(null);
  };

  const submitTransfer = async () => {
    if (previewData || !selectedChild || !amountIsValid) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const refreshed = await transferAndRefresh({
        amount,
        childOwnerId: selectedChild.id,
        remark: remark.trim() || null,
      }, {
        create: createDistributionTransfer, readChildren: readDistributionChildren, readTransfers: readDistributionTransfers,
        onAccepted: (result) => {
          loadRequestRef.current += 1;
          setSummary((current) => current ? { ...current, account: result.account } : current);
          onAccountChange(result.account);
          setSelectedChild(null);
          toast.success(`已向 ${selectedChild.email} 分配 ${amount} 积分`, { description: `划拨编号 ${result.transfer.id}` });
        },
      });
      if (refreshed.children && refreshed.transfers) {
        setChildren(refreshed.children.items);
        setTransfers(refreshed.transfers);
      }
      setRefreshError(refreshed.refreshError);
    } catch (failure) {
      setSubmitError(
        failure instanceof Error ? failure.message : "积分划拨没有完成，请重试。",
      );
      try {
        const [nextSummary, nextChildren] = await Promise.all([
          readDistributionSummary(),
          readDistributionChildren(),
        ]);
        setSummary(nextSummary);
        setChildren(nextChildren.items);
        onAccountChange(nextSummary.account);
      } catch {
        // Preserve the original transfer error and entered form values.
      }
    } finally {
      setSubmitting(false);
    }
  };

  const loadMore = async () => {
    if (previewData || !transfers?.nextCursor || loadingMore) return;
    const request = loadRequestRef.current;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const next = await readDistributionTransfers({ cursor: transfers.nextCursor });
      if (request !== loadRequestRef.current) return;
      setTransfers({
        items: [...transfers.items, ...next.items],
        nextCursor: next.nextCursor,
      });
    } catch (failure) {
      if (request !== loadRequestRef.current) return;
      setLoadMoreError(
        failure instanceof Error ? failure.message : "更多记录暂时无法读取。",
      );
    } finally {
      setLoadingMore(false);
    }
  };

  if (!enabled) return <Alert className="distribution-access">
    <CircleAlert /><AlertTitle>当前账户没有积分分配权限</AlertTitle>
    <AlertDescription>企业或分销商身份需要由站长在账户管理中设置；企业管理资格不代表划拨权限。</AlertDescription>
  </Alert>;

  if (loading && (!summary || !transfers)) return <div className="distribution-loading" role="status">
    <LoaderCircle />正在读取分配账户<Skeleton className="h-6 w-28 rounded-lg" />
  </div>;

  if (!summary || !transfers) return <Alert variant="destructive">
    <CircleAlert /><AlertTitle>账户信息暂时不可用</AlertTitle>
    <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
      <span>{error ?? "未能读取分配账户。"}</span>
      <Button size="sm" variant="ghost" onClick={() => void load()}><RefreshCw />重试</Button>
    </AlertDescription>
  </Alert>;

  return (
    <div className="distribution-view">
      {(refreshError || error) && <div className="distribution-refresh-error" role="alert"><p>{refreshError ?? error}</p>
        <Button size="sm" variant="ghost" disabled={loading} onClick={() => void load()}><RefreshCw />{loading ? "正在刷新" : "刷新记录"}</Button></div>}
      <BusinessAccountContent summary={summary} directAccounts={children} transfers={transfers}
        tab={tab} context={context} historyAccount={historyAccount}
        onTransfer={openTransfer} onShowRecords={onShowRecords} onClearRecords={onClearRecords}
        loadingMore={loadingMore} loadMoreError={loadMoreError} onLoadMore={() => void loadMore()} />

      <Dialog open={Boolean(selectedChild)} onOpenChange={(open) => !open && !submitting && setSelectedChild(null)}>
        <DialogContent className="admin-action-dialog" overlayClassName="admin-action-dialog-overlay">
          <DialogHeader className="admin-action-dialog-header">
            <DialogTitle>分配积分</DialogTitle>
            <DialogDescription>向 {selectedChild?.email} 划拨充值来源积分。提交后不可撤回或编辑。</DialogDescription>
          </DialogHeader>
          <div className="admin-action-dialog-body">
            {previewData && <p className="organization-note">模拟预览 · 不会提交实际划拨请求。</p>}
            <div className="admin-action-account-summary">
              <span>当前可分配</span>
              <strong>{summary.account.transferableCredits} 积分</strong>
            </div>
            <div className="admin-action-field">
              <label htmlFor="distribution-amount">积分数量</label>
              <div className="admin-action-presets">
                {[10, 50, 100].map((preset) => (
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
              <Input id="distribution-amount" inputMode="numeric" min={1} type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
              {!amountIsValid && amount && <p className="admin-action-error">数量必须为正整数，且不能超过当前可分配积分。</p>}
            </div>
            <div className="admin-action-field">
              <label htmlFor="distribution-remark">备注（可选）</label>
              <Textarea id="distribution-remark" maxLength={200} placeholder="例如线下对账说明，不要填写价格或敏感信息" value={remark} onChange={(event) => setRemark(event.target.value)} />
            </div>
            {submitError && <p className="admin-action-error" role="alert">{submitError}</p>}
          </div>
          <DialogFooter className="admin-action-dialog-footer">
            <Button variant="ghost" disabled={submitting} onClick={() => setSelectedChild(null)}>取消</Button>
            <Button disabled={Boolean(previewData) || submitting || !amountIsValid} onClick={() => void submitTransfer()}>
              {submitting && <LoaderCircle className="animate-spin" />}确认划拨
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
