"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, CircleAlert, Clock3, Copy, LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BillingAccountSummary, CreditActivityFilter, CreditActivityItem } from "@/shared/contracts/billing";
import { readCreditActivities, type CreditUsageActivityItem, type CreditUsageDailyFreeQuota } from "./http-billing-boundary";
import {
  copyCreditTaskId, createCreditActivityPager, creditActivityTaskId, initialCreditActivityState, shortenCreditTaskId,
  type CreditActivityPager, type CreditActivityPagerState,
} from "./credit-activity-pagination.mjs";
import styles from "./credit-activity-view.module.css";

const FILTERS: readonly { id: CreditActivityFilter; label: string }[] = [
  { id: "all", label: "全部" }, { id: "spend", label: "已消耗" }, { id: "receive", label: "已获取" },
];
const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
});

function otherActivityLabel(item: CreditActivityItem) {
  if (item.kind === "welcome") return "新用户欢迎积分";
  if (item.kind === "promotion") return "活动积分到账";
  if (item.kind === "purchase") return "积分充值到账";
  if (item.kind === "expiration") return "积分到期";
  if (item.kind === "adjustment") return "积分调整";
  if (item.kind === "transfer_out") return "分配给直属下级";
  if (item.kind === "transfer_in") return "收到上级分配";
  return "GoodGood 积分";
}
function categoryTitle(item: CreditActivityItem) {
  if (item.category === "image_generation") return "图片生成";
  if (item.category === "video_generation") return "视频生成";
  if (item.category === "text_generation") return "文本生成";
  if (item.category === "image_cleanup") return "去除AI";
  return otherActivityLabel(item);
}
function statusLabel(item: CreditActivityItem) {
  if (item.kind === "transfer_out") return "已划拨";
  if (item.status === "processing") return "预留中";
  if (item.status === "spent") return "已消耗";
  if (item.status === "credited") return "已获取";
  if (item.status === "expired") return "已到期";
  return "已调整";
}
function amountLabel(item: CreditActivityItem) {
  return item.amount.startsWith("-") ? item.amount : `+${item.amount}`;
}

function CreditTaskId({ item }: Readonly<{ item: CreditUsageActivityItem }>) {
  const taskId = creditActivityTaskId(item);
  const [phase, setPhase] = useState<"idle" | "copying" | "copied" | "failed">("idle");
  const copyingRef = useRef(false);
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  useEffect(() => {
    if (phase !== "copied") return;
    const timer = window.setTimeout(() => setPhase("idle"), 1600);
    return () => window.clearTimeout(timer);
  }, [phase]);
  if (!taskId) return <span className={styles.unavailable}>—</span>;
  return <div className={styles.taskCell}>
    <span className={styles.taskId} title={taskId}>{shortenCreditTaskId(taskId)}</span>
    <Button type="button" variant="ghost" size="icon-sm" className={styles.copyTask} disabled={phase === "copying"}
      aria-label={`${phase === "copied" ? "已复制" : "复制完整"}任务 ID ${taskId}`} title={phase === "copied" ? "已复制" : "复制任务 ID"}
      onClick={async () => {
        if (copyingRef.current) return;
        copyingRef.current = true;
        setPhase("copying");
        const copied = await copyCreditTaskId(taskId, navigator.clipboard);
        copyingRef.current = false;
        if (mountedRef.current) setPhase(copied ? "copied" : "failed");
      }}>
      {phase === "copied" ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
    </Button>
    {phase === "copied" && <span className="sr-only" role="status">已复制完整任务 ID</span>}
    {phase === "failed" && <span className={styles.copyFailure} role="alert">复制失败，请重试</span>}
  </div>;
}

export function CreditActivityTableRows({ items }: Readonly<{ items: readonly CreditUsageActivityItem[] }>) {
  return items.map((item) => <tr key={item.id}>
    <td><strong>{categoryTitle(item)}</strong></td>
    <td><span className={styles.textCell} title={item.projectName ?? undefined}>{item.projectName || "—"}</span></td>
    <td><span className={styles.textCell} title={item.modelName ?? undefined}>{item.modelName || "—"}</span></td>
    <td>{statusLabel(item)}</td>
    <td><time dateTime={item.occurredAt}>{dateFormatter.format(new Date(item.occurredAt)).replaceAll("/", "-")}</time></td>
    <td className="credit-activity-table-amount">{amountLabel(item)}</td>
    <td><CreditTaskId key={creditActivityTaskId(item) ?? item.id} item={item} /></td>
  </tr>);
}

export function CreditFreeQuotaSummary({ quota }: Readonly<{ quota?: CreditUsageDailyFreeQuota | null }>) {
  if (!quota) return null;
  return <div className={styles.freeQuota} role="status">
    <span>今日免费图片</span><strong>剩余 {quota.remaining} / {quota.limit} 张</strong>
    {quota.reserved > 0 && <small>{quota.reserved} 张生成中</small>}
  </div>;
}

type Props = Readonly<{
  enabled: boolean;
  onAccountChange: (account: BillingAccountSummary) => void;
  variant?: "page" | "dialog";
}>;

export function CreditActivityView({ enabled, onAccountChange, variant = "page" }: Props) {
  const [filter, setFilter] = useState<CreditActivityFilter>("all");
  const [revision, setRevision] = useState(0);
  const requestKey = `${enabled}:${filter}:${revision}`;
  const [snapshot, setSnapshot] = useState<{ key: string; state: CreditActivityPagerState }>(() => ({
    key: requestKey, state: { ...initialCreditActivityState(), loading: enabled },
  }));
  const pagerRef = useRef<CreditActivityPager | null>(null);
  const state = snapshot.key === requestKey ? snapshot.state : { ...initialCreditActivityState(), loading: enabled };
  const { page, loading, error } = state;

  useEffect(() => {
    if (!enabled) return;
    const pager = createCreditActivityPager({
      read: readCreditActivities,
      onState: (nextState) => {
        setSnapshot({ key: requestKey, state: nextState });
        if (!nextState.loading && !nextState.error && nextState.page) onAccountChange(nextState.page.account);
      },
    });
    pagerRef.current = pager;
    void pager.reset(filter);
    return () => { pager.dispose(); if (pagerRef.current === pager) pagerRef.current = null; };
  }, [enabled, filter, onAccountChange, requestKey]);

  const selectFilter = (nextFilter: CreditActivityFilter) => {
    if (nextFilter === filter) return;
    pagerRef.current?.dispose();
    setFilter(nextFilter);
  };
  const reload = () => {
    pagerRef.current?.dispose();
    setRevision((current) => current + 1);
  };
  const emptyLabel = filter === "all" ? "还没有积分记录" : filter === "spend" ? "还没有积分消耗记录" : "还没有积分获取记录";

  return <section className={`credit-activity-view ${styles.view} ${variant === "dialog" ? "credit-activity-dialog-view" : ""}`} aria-label="积分明细">
    <header className="credit-activity-header">
      <div>{variant === "page" && <small>GOODGOOD CREDITS</small>}<h1>积分明细</h1>
        {variant === "page" && <p>按时间查看积分消耗和变动。</p>}
      </div>
    </header>
    <div className={`credit-account-summary ${styles.summary}`} role="status" aria-live="polite">
      <div><span>当前积分</span><strong>{page?.account.availableCredits ?? "--"}{page && <span className="sr-only"> 积分</span>}</strong></div>
      <div><span>今日消耗</span><strong>{page?.spendSummary.today ?? "--"}{page && <span className="sr-only"> 积分</span>}</strong></div>
      <div><span>本周消耗</span><strong>{page?.spendSummary.thisWeek ?? "--"}{page && <span className="sr-only"> 积分</span>}</strong></div>
      <div><span>本月消耗</span><strong>{page?.spendSummary.thisMonth ?? "--"}{page && <span className="sr-only"> 积分</span>}</strong></div>
    </div>
    <CreditFreeQuotaSummary quota={page?.dailyFreeQuota} />
    <div className="credit-activity-toolbar"><span>明细</span></div>
    <div className="credit-activity-table-wrap" aria-busy={loading}>
      <table className={`credit-activity-table ${styles.table}`}>
        <thead><tr>
          <th scope="col">类型</th><th scope="col">项目</th><th scope="col">模型</th>
          <th scope="col"><Select value={filter} onValueChange={(value) => selectFilter(value as CreditActivityFilter)}>
            <SelectTrigger size="sm" aria-label="筛选积分明细状态" className="credit-activity-table-filter"><SelectValue /></SelectTrigger>
            <SelectContent position="popper" align="start" className="credit-activity-filter-menu">
              {FILTERS.map((item) => <SelectItem value={item.id} key={item.id}>{item.label}</SelectItem>)}
            </SelectContent>
          </Select></th>
          <th scope="col">日期</th><th scope="col">积分变化</th><th scope="col">任务 ID</th>
        </tr></thead>
        <tbody>{loading ? <tr><td colSpan={7} className="credit-activity-state-cell">
          <div className="credit-activity-list credit-activity-skeleton" role="status">
            <span className="credit-activity-loading"><LoaderCircle size={17} />正在读取积分记录</span>
            {Array.from({ length: 4 }, (_, index) => <div key={index} />)}
          </div>
        </td></tr> : !enabled ? <tr><td colSpan={7} className="credit-activity-state-cell">
          <div className="credit-activity-state"><strong>积分明细暂不可用</strong></div>
        </td></tr> : error && !page ? <tr><td colSpan={7} className="credit-activity-state-cell">
          <div className="credit-activity-state credit-activity-error" role="alert">
            <CircleAlert size={19} /><strong>积分记录暂时无法读取</strong><span>{error}</span>
            <button type="button" onClick={() => void pagerRef.current?.retry()}><RefreshCw size={14} />重试</button>
          </div>
        </td></tr> : !page?.items.length ? <tr><td colSpan={7} className="credit-activity-state-cell">
          <div className="credit-activity-state credit-activity-empty"><Clock3 size={20} /><strong>{emptyLabel}</strong>
            <span>产生积分变化后，会按时间显示在这里。</span>
          </div>
        </td></tr> : <CreditActivityTableRows items={page.items} />}</tbody>
      </table>
    </div>
    {error && page && <div className="credit-activity-more-error" role="alert"><span>{error}</span>
      <button type="button" onClick={() => void pagerRef.current?.retry()}><RefreshCw size={13} />重试</button>
    </div>}
    {enabled && <nav className={styles.pagination} aria-label="积分明细分页">
      <Button type="button" variant="ghost" size="sm" disabled={loading || !state.hasPrevious} onClick={() => void pagerRef.current?.previous()}>
        <ChevronLeft size={14} aria-hidden="true" />上一页
      </Button>
      <span aria-live="polite">第 {state.pageNumber} 页</span>
      <Button type="button" variant="ghost" size="sm" disabled={loading || !state.hasNext} onClick={() => void pagerRef.current?.next()}>
        下一页<ChevronRight size={14} aria-hidden="true" />
      </Button>
      {error && <Button type="button" variant="ghost" size="sm" onClick={reload}><RefreshCw size={13} aria-hidden="true" />重新读取</Button>}
    </nav>}
  </section>;
}
