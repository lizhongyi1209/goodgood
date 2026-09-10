"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CircleAlert,
  CircleDot,
  LoaderCircle,
  RefreshCw,
  UsersRound,
} from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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

const roleLabels = {
  distributor: "分销商",
  enterprise: "企业",
} as const;

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeStyle: "short",
});

type Props = Readonly<{
  enabled: boolean;
  onAccountChange: (account: BillingAccountSummary) => void;
  onBack: () => void;
}>;

export function DistributionView({ enabled, onAccountChange, onBack }: Props) {
  const [summary, setSummary] = useState<DistributionSummary | null>(null);
  const [children, setChildren] = useState<readonly DistributionChild[]>([]);
  const [transfers, setTransfers] = useState<CreditTransferPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<DistributionChild | null>(null);
  const [amount, setAmount] = useState("10");
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const [nextSummary, nextChildren, nextTransfers] = await Promise.all([
        readDistributionSummary(),
        readDistributionChildren(),
        readDistributionTransfers(),
      ]);
      setSummary(nextSummary);
      setChildren(nextChildren.items);
      setTransfers(nextTransfers);
      onAccountChange(nextSummary.account);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "积分分配暂时无法读取，请稍后重试。",
      );
    } finally {
      setLoading(false);
    }
  }, [enabled, onAccountChange]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
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
    if (!selectedChild || !amountIsValid) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createDistributionTransfer({
        amount,
        childOwnerId: selectedChild.id,
        remark: remark.trim() || null,
      });
      setSummary((current) =>
        current ? { ...current, account: result.account } : current,
      );
      onAccountChange(result.account);
      setSelectedChild(null);
      toast.success(`已向 ${selectedChild.email} 分配 ${amount} 积分`, {
        description: `划拨编号 ${result.transfer.id}`,
      });
      const [nextChildren, nextTransfers] = await Promise.all([
        readDistributionChildren(),
        readDistributionTransfers(),
      ]);
      setChildren(nextChildren.items);
      setTransfers(nextTransfers);
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
    if (!transfers?.nextCursor) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const next = await readDistributionTransfers({ cursor: transfers.nextCursor });
      setTransfers({
        items: [...transfers.items, ...next.items],
        nextCursor: next.nextCursor,
      });
    } catch (failure) {
      setLoadMoreError(
        failure instanceof Error ? failure.message : "更多记录暂时无法读取。",
      );
    } finally {
      setLoadingMore(false);
    }
  };

  if (!enabled) {
    return (
      <section className="distribution-view" aria-label="积分分配">
        <Button variant="ghost" onClick={onBack}><ArrowLeft />返回创作</Button>
        <Alert className="mt-6">
          <CircleAlert />
          <AlertTitle>当前账户没有积分分配权限</AlertTitle>
          <AlertDescription>企业或分销商身份需要由站长在账户管理中设置。</AlertDescription>
        </Alert>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="distribution-view" aria-label="积分分配">
        <div className="distribution-loading" role="status">
          <LoaderCircle />正在读取分配账户
        </div>
        <div className="distribution-summary-grid">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton className="h-28 rounded-2xl" key={index} />
          ))}
        </div>
      </section>
    );
  }

  if (error || !summary || !transfers) {
    return (
      <section className="distribution-view" aria-label="积分分配">
        <Button variant="ghost" onClick={onBack}><ArrowLeft />返回创作</Button>
        <Alert variant="destructive" className="mt-6">
          <CircleAlert />
          <AlertTitle>积分分配暂时不可用</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{error ?? "未能读取分配账户。"}</span>
            <Button size="sm" variant="ghost" onClick={() => void load()}>
              <RefreshCw />重试
            </Button>
          </AlertDescription>
        </Alert>
      </section>
    );
  }

  return (
    <section className="distribution-view" aria-label="积分分配">
      <header className="distribution-header">
        <div>
          <small>GOODGOOD DISTRIBUTION</small>
          <div className="distribution-title-row">
            <h1>积分分配</h1>
            <Badge variant="outline">{roleLabels[summary.businessRole]}</Badge>
          </div>
          <p>只可把充值来源积分分配给直属下级；兑换价格与收款由你在线下自行处理。</p>
        </div>
        <Button variant="ghost" onClick={onBack}><ArrowLeft />返回创作</Button>
      </header>

      <div className="distribution-summary-grid">
        <article>
          <span>当前积分</span>
          <strong>{summary.account.availableCredits}</strong>
          <small>可用总余额</small>
        </article>
        <article className="is-accent">
          <span><CircleDot />可分配积分</span>
          <strong>{summary.account.transferableCredits}</strong>
          <small>仅充值及上级划入来源</small>
        </article>
        <article>
          <span>直属下级</span>
          <strong>{summary.directChildCount}</strong>
          <small>仅显示当前有效关系</small>
        </article>
      </div>

      <div className="distribution-columns">
        <section className="distribution-panel" aria-labelledby="distribution-children-title">
          <div className="distribution-panel-heading">
            <div><h2 id="distribution-children-title">直属下级</h2><p>选择账户并分配积分</p></div>
            <UsersRound />
          </div>
          {children.length === 0 ? (
            <div className="distribution-empty">
              <UsersRound />
              <strong>还没有直属下级</strong>
              <span>直属关系需要由站长在账户管理中设置。</span>
            </div>
          ) : (
            <div className="distribution-child-list">
              {children.map((child) => (
                <article key={child.id}>
                  <div>
                    <strong>{child.email}</strong>
                    <span>
                      累计分配 {child.allocatedCredits}
                      {child.lastTransferredAt
                        ? ` · 最近 ${dateFormatter.format(new Date(child.lastTransferredAt))}`
                        : " · 尚未分配"}
                    </span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => openTransfer(child)}>分配积分</Button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="distribution-panel" aria-labelledby="distribution-history-title">
          <div className="distribution-panel-heading">
            <div><h2 id="distribution-history-title">最近划拨</h2><p>公开编号可用于对账追溯</p></div>
          </div>
          {transfers.items.length === 0 ? (
            <div className="distribution-empty">
              <ArrowUpRight />
              <strong>还没有划拨记录</strong>
              <span>完成第一笔分配后会显示在这里。</span>
            </div>
          ) : (
            <div className="distribution-transfer-list">
              {transfers.items.map((transfer) => (
                <article key={transfer.id}>
                  <div className={`distribution-transfer-icon ${transfer.direction}`}>
                    {transfer.direction === "outgoing" ? <ArrowUpRight /> : <ArrowDownLeft />}
                  </div>
                  <div>
                    <strong>{transfer.direction === "outgoing" ? "分配给" : "收到来自"} {transfer.counterpartyEmail}</strong>
                    <span>{transfer.id} · {dateFormatter.format(new Date(transfer.createdAt))}</span>
                  </div>
                  <b className={transfer.direction}>{transfer.direction === "outgoing" ? "−" : "+"}{transfer.amount}</b>
                </article>
              ))}
              {loadMoreError && <p className="distribution-more-error" role="alert">{loadMoreError}</p>}
              {transfers.nextCursor && (
                <Button variant="ghost" disabled={loadingMore} onClick={() => void loadMore()}>
                  {loadingMore && <LoaderCircle className="animate-spin" />}加载更多
                </Button>
              )}
            </div>
          )}
        </section>
      </div>

      <Dialog open={Boolean(selectedChild)} onOpenChange={(open) => !open && !submitting && setSelectedChild(null)}>
        <DialogContent className="admin-action-dialog" overlayClassName="admin-action-dialog-overlay">
          <DialogHeader className="admin-action-dialog-header">
            <DialogTitle>分配积分</DialogTitle>
            <DialogDescription>向 {selectedChild?.email} 划拨充值来源积分。提交后不可撤回或编辑。</DialogDescription>
          </DialogHeader>
          <div className="admin-action-dialog-body">
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
            <Button disabled={submitting || !amountIsValid} onClick={() => void submitTransfer()}>
              {submitting && <LoaderCircle className="animate-spin" />}确认划拨
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
