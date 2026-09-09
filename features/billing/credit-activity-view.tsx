"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CircleAlert,
  Clock3,
  Coins,
  ImageIcon,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Video,
} from "lucide-react";
import type {
  BillingAccountSummary,
  CreditActivityFilter,
  CreditActivityItem,
  CreditActivityPage,
} from "@/shared/contracts/billing";
import { readCreditActivities } from "./http-billing-boundary";

const FILTERS: readonly { id: CreditActivityFilter; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "spend", label: "消费" },
  { id: "receive", label: "获得" },
  { id: "return", label: "退回" },
];

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeStyle: "short",
});

function categoryTitle(item: CreditActivityItem) {
  if (item.category === "image_generation") return "图片生成";
  if (item.category === "video_generation") return "视频生成";
  return "其他变动";
}

function otherActivityLabel(item: CreditActivityItem) {
  if (item.kind === "welcome") return "新用户欢迎积分";
  if (item.kind === "promotion") return "活动积分到账";
  if (item.kind === "purchase") return "积分充值到账";
  if (item.kind === "refund") return "积分退回";
  if (item.kind === "expiration") return "积分到期";
  if (item.kind === "adjustment") return "积分调整";
  if (item.kind === "transfer_out") return "分配给直属下级";
  if (item.kind === "transfer_in") return "收到上级分配";
  return "GoodGood 积分";
}

function statusLabel(item: CreditActivityItem) {
  if (item.kind === "transfer_out") return "已划拨";
  if (item.status === "processing") return "预留中";
  if (item.status === "spent") return "已消费";
  if (item.status === "released") return `${item.creditAmount} 积分已退回`;
  if (item.status === "credited") return "已到账";
  if (item.status === "refunded") return "已退回";
  if (item.status === "expired") return "已到期";
  return "已调整";
}

function amountLabel(item: CreditActivityItem) {
  if (item.status === "released") return "未扣除";
  return item.amount.startsWith("-") ? item.amount : `+${item.amount}`;
}

function activityDetail(item: CreditActivityItem) {
  return item.batchReference
    ? <>{item.kind === "transfer_out" || item.kind === "transfer_in" ? "编号" : "批次"} <span className="credit-activity-batch">{item.batchReference}</span></>
    : otherActivityLabel(item);
}

function activityIcon(item: CreditActivityItem) {
  if (item.status === "released" || item.status === "refunded") return <RotateCcw size={17} />;
  if (item.category === "image_generation") return <ImageIcon size={17} />;
  if (item.category === "video_generation") return <Video size={17} />;
  return <Coins size={17} />;
}

type Props = Readonly<{
  enabled: boolean;
  onAccountChange: (account: BillingAccountSummary) => void;
  onBack: () => void;
}>;

export function CreditActivityView({
  enabled,
  onAccountChange,
  onBack,
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
    void readCreditActivities({ filter })
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
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const nextPage = await readCreditActivities({
        cursor: page.nextCursor,
        filter,
      });
      setPage((current) => current
        ? {
            ...nextPage,
            items: [...current.items, ...nextPage.items],
          }
        : nextPage);
      onAccountChange(nextPage.account);
    } catch (failure) {
      setLoadMoreError(
        failure instanceof Error
          ? failure.message
          : "更多积分记录暂时无法读取，请稍后重试。",
      );
    } finally {
      setLoadingMore(false);
    }
  };

  const beginReload = () => {
    requestRef.current += 1;
    setLoading(true);
    setError(null);
    setLoadMoreError(null);
  };

  const selectFilter = (nextFilter: CreditActivityFilter) => {
    if (nextFilter === filter) return;
    beginReload();
    setFilter(nextFilter);
  };

  const emptyLabel = filter === "all" ? "还没有积分记录" : `还没有${FILTERS.find((item) => item.id === filter)?.label ?? "相关"}记录`;

  return (
    <section className="credit-activity-view" aria-label="积分记录">
      <header className="credit-activity-header">
        <div>
          <small>GOODGOOD CREDITS</small>
          <h1>积分记录</h1>
          <p>按时间查看积分消耗和变动。</p>
        </div>
        <button className="credit-activity-back" onClick={onBack}>
          <ArrowLeft size={15} />返回创作
        </button>
      </header>

      <div className="credit-account-summary" role="status" aria-live="polite">
        <div><span>今日消耗</span><strong>{page?.spendSummary.today ?? "--"}<small>积分</small></strong></div>
        <div><span>本周消耗</span><strong>{page?.spendSummary.thisWeek ?? "--"}<small>积分</small></strong></div>
        <div><span>本月消耗</span><strong>{page?.spendSummary.thisMonth ?? "--"}<small>积分</small></strong></div>
      </div>

      <div className="credit-activity-toolbar">
        <div className="credit-activity-filters" aria-label="积分记录筛选">
          {FILTERS.map((item) => (
            <button
              aria-pressed={filter === item.id}
              className={filter === item.id ? "active" : ""}
              key={item.id}
              onClick={() => selectFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="credit-activity-list credit-activity-skeleton" role="status">
          <span className="credit-activity-loading"><LoaderCircle size={17} />正在读取积分记录</span>
          {Array.from({ length: 4 }, (_, index) => <div key={index} />)}
        </div>
      ) : error ? (
        <div className="credit-activity-state credit-activity-error" role="alert">
          <CircleAlert size={19} />
          <strong>积分记录暂时无法读取</strong>
          <span>{error}</span>
          <button onClick={() => {
            beginReload();
            setRevision((current) => current + 1);
          }}><RefreshCw size={14} />重试</button>
        </div>
      ) : !page || page.items.length === 0 ? (
        <div className="credit-activity-state credit-activity-empty">
          <Clock3 size={20} />
          <strong>{emptyLabel}</strong>
          <span>产生积分变化后，会按时间显示在这里。</span>
        </div>
      ) : (
        <>
          <div className="credit-activity-list">
            {page.items.map((item) => (
              <article className="credit-activity-row" key={item.id}>
                <div className={`credit-activity-icon ${item.status}`}>{activityIcon(item)}</div>
                <div className="credit-activity-copy">
                  <h2>{categoryTitle(item)}</h2>
                  <p>{activityDetail(item)}</p>
                  <time dateTime={item.occurredAt}>{dateFormatter.format(new Date(item.occurredAt))}</time>
                </div>
                <div className={`credit-activity-amount ${item.status}`}>
                  <strong>{amountLabel(item)}</strong>
                  <span>{statusLabel(item)}</span>
                </div>
              </article>
            ))}
          </div>
          {loadMoreError && (
            <div className="credit-activity-more-error" role="alert">
              <span>{loadMoreError}</span>
              <button onClick={() => void loadMore()}><RefreshCw size={13} />重试</button>
            </div>
          )}
          {page.nextCursor && !loadMoreError && (
            <button className="credit-activity-more" disabled={loadingMore} onClick={() => void loadMore()}>
              {loadingMore ? <><LoaderCircle size={14} />正在加载</> : "加载更多"}
            </button>
          )}
        </>
      )}
    </section>
  );
}
