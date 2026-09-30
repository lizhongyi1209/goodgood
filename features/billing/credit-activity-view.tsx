"use client";

import { useEffect, useRef, useState } from "react";
import {
  CircleAlert,
  Clock3,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  BillingAccountSummary,
  CreditActivityFilter,
  CreditActivityItem,
  CreditActivityPage,
} from "@/shared/contracts/billing";
import { readCreditActivities } from "./http-billing-boundary";

const FILTERS: readonly { id: CreditActivityFilter; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "spend", label: "已消耗" },
  { id: "receive", label: "已获取" },
];

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function visibleActivity(item: CreditActivityItem) {
  return item.status !== "released" && item.status !== "refunded" && item.kind !== "refund";
}

// The existing API includes return entries. Fill each visible page across its
// cursor boundary so a run of hidden entries does not make the table look empty.
async function readVisibleActivities(filter: CreditActivityFilter, cursor?: string): Promise<CreditActivityPage> {
  let nextCursor: string | null = cursor ?? null;
  let result: CreditActivityPage | null = null;
  const visible: CreditActivityItem[] = [];
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const page = await readCreditActivities({ filter, ...(nextCursor ? { cursor: nextCursor } : {}) });
    result = page;
    visible.push(...page.items.filter(visibleActivity));
    if (!page.nextCursor || visible.length >= 20 || page.nextCursor === nextCursor) break;
    nextCursor = page.nextCursor;
  }
  if (!result) throw new Error("积分记录暂时无法读取，请稍后重试。");
  return { ...result, items: visible };
}

function categoryTitle(item: CreditActivityItem) {
  if (item.category === "image_generation") return "图片生成";
  if (item.category === "video_generation") return "视频生成";
  return "其他变动";
}

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

function activityDetail(item: CreditActivityItem) {
  return item.batchReference
    ? <>{item.kind === "transfer_out" || item.kind === "transfer_in" ? "编号" : "批次"} <span className="credit-activity-batch">{item.batchReference}</span></>
    : otherActivityLabel(item);
}

type Props = Readonly<{
  enabled: boolean;
  onAccountChange: (account: BillingAccountSummary) => void;
  variant?: "page" | "dialog";
}>;

export function CreditActivityView({
  enabled,
  onAccountChange,
  variant = "page",
}: Props) {
  const [filter, setFilter] = useState<CreditActivityFilter>("all");
  const [page, setPage] = useState<CreditActivityPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const requestRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const requestId = ++requestRef.current;
    void readVisibleActivities(filter)
      .then((nextPage) => {
        if (requestRef.current !== requestId) return;
        setPage(nextPage);
        onAccountChange(nextPage.account);
      })
      .catch((failure) => {
        if (requestRef.current !== requestId) return;
        setError(
          failure instanceof Error
            ? failure.message
            : "积分记录暂时无法读取，请稍后重试。",
        );
      })
      .finally(() => {
        if (requestRef.current === requestId) setLoading(false);
      });
    return () => {
      if (requestRef.current === requestId) requestRef.current += 1;
    };
  }, [enabled, filter, onAccountChange, revision]);

  const loadMore = async () => {
    if (!page?.nextCursor || loadingMore) return;
    const requestId = requestRef.current;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const nextPage = await readVisibleActivities(filter, page.nextCursor ?? undefined);
      if (requestRef.current !== requestId) return;
      setPage((current) => current
        ? {
            ...nextPage,
            items: [...current.items, ...nextPage.items],
          }
        : nextPage);
      onAccountChange(nextPage.account);
    } catch (failure) {
      if (requestRef.current !== requestId) return;
      setLoadMoreError(
        failure instanceof Error
          ? failure.message
          : "更多积分记录暂时无法读取，请稍后重试。",
      );
    } finally {
      if (requestRef.current === requestId) setLoadingMore(false);
    }
  };

  const beginReload = () => {
    requestRef.current += 1;
    setLoading(true);
    setError(null);
    setLoadingMore(false);
    setLoadMoreError(null);
  };

  const selectFilter = (nextFilter: CreditActivityFilter) => {
    if (nextFilter === filter) return;
    beginReload();
    setFilter(nextFilter);
  };

  const emptyLabel = filter === "all" ? "还没有积分记录" : filter === "spend" ? "还没有积分消耗记录" : "还没有积分获取记录";

  return (
    <section className={`credit-activity-view ${variant === "dialog" ? "credit-activity-dialog-view" : ""}`} aria-label="积分明细">
      <header className="credit-activity-header">
        <div>
          {variant === "page" && <small>GOODGOOD CREDITS</small>}
          <h1>积分明细</h1>
          {variant === "page" && <p>按时间查看积分消耗和变动。</p>}
        </div>
      </header>

      <div className="credit-account-summary" role="status" aria-live="polite">
        <div><span>今日消耗</span><strong>{page?.spendSummary.today ?? "--"}{page && <span className="sr-only"> 积分</span>}</strong></div>
        <div><span>本周消耗</span><strong>{page?.spendSummary.thisWeek ?? "--"}{page && <span className="sr-only"> 积分</span>}</strong></div>
        <div><span>本月消耗</span><strong>{page?.spendSummary.thisMonth ?? "--"}{page && <span className="sr-only"> 积分</span>}</strong></div>
      </div>

      <div className="credit-activity-toolbar">
        <span>明细</span>
      </div>

      <div className="credit-activity-table-wrap">
        <table className="credit-activity-table">
          <thead>
            <tr>
              <th scope="col">明细</th>
              <th scope="col">
                <Select value={filter} onValueChange={(value) => selectFilter(value as CreditActivityFilter)}>
                  <SelectTrigger size="sm" aria-label="筛选积分明细状态" className="credit-activity-table-filter"><SelectValue /></SelectTrigger>
                  <SelectContent position="popper" align="start" className="credit-activity-filter-menu">
                    {FILTERS.map((item) => <SelectItem value={item.id} key={item.id}>{item.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </th>
              <th scope="col">日期</th>
              <th scope="col">积分变化</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="credit-activity-state-cell">
                <div className="credit-activity-list credit-activity-skeleton" role="status">
                  <span className="credit-activity-loading"><LoaderCircle size={17} />正在读取积分记录</span>
                  {Array.from({ length: 4 }, (_, index) => <div key={index} />)}
                </div>
              </td></tr>
            ) : error ? (
              <tr><td colSpan={4} className="credit-activity-state-cell">
                <div className="credit-activity-state credit-activity-error" role="alert">
                  <CircleAlert size={19} />
                  <strong>积分记录暂时无法读取</strong>
                  <span>{error}</span>
                  <button onClick={() => {
                    beginReload();
                    setRevision((current) => current + 1);
                  }}><RefreshCw size={14} />重试</button>
                </div>
              </td></tr>
            ) : !page || (page.items.length === 0 && !page.nextCursor) ? (
              <tr><td colSpan={4} className="credit-activity-state-cell">
                <div className="credit-activity-state credit-activity-empty">
                  <Clock3 size={20} />
                  <strong>{emptyLabel}</strong>
                  <span>产生积分变化后，会按时间显示在这里。</span>
                </div>
              </td></tr>
            ) : page.items.length === 0 ? (
              <tr><td colSpan={4} className="credit-activity-no-visible">继续加载以查看更早的积分变动</td></tr>
            ) : page.items.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.category === "other" ? otherActivityLabel(item) : categoryTitle(item)}</strong>{item.batchReference && <small>{activityDetail(item)}</small>}</td>
                <td>{statusLabel(item)}</td>
                <td><time dateTime={item.occurredAt}>{dateFormatter.format(new Date(item.occurredAt)).replaceAll("/", "-")}</time></td>
                <td className="credit-activity-table-amount">{amountLabel(item)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && !error && page && loadMoreError && (
        <div className="credit-activity-more-error" role="alert">
          <span>{loadMoreError}</span>
          <button onClick={() => void loadMore()}><RefreshCw size={13} />重试</button>
        </div>
      )}
      {!loading && !error && page?.nextCursor && !loadMoreError && (
        <button className="credit-activity-more" disabled={loadingMore} onClick={() => void loadMore()}>
          {loadingMore ? <><LoaderCircle size={14} />正在加载</> : "加载更多"}
        </button>
      )}
    </section>
  );
}
