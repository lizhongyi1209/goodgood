"use client";

import { LoaderCircle, RefreshCw, ScrollText } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AuthenticationSession } from "@/features/auth/http-auth-boundary";
import { readAuditLog, type AdministrativeAction } from "./http-admin-boundary";
import { ADMIN_CREDIT_TYPE_LABELS } from "@/shared/contracts/admin-credit-types.mjs";

const ACTION_LABELS: Record<AdministrativeAction["actionType"], string> = {
  approve_account: "通过审核",
  bootstrap_site_owner: "初始化站长",
  grant_test_credits: "赠送测试积分",
  grant_credits: "增加积分",
  restore_account: "恢复账户",
  set_business_role: "调整业务身份",
  set_direct_parent: "调整直属关系",
  suspend_account: "暂停账户",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(value));
}

export function AuditLogContent({ actions, loading, error, onReload }: {
  actions: readonly AdministrativeAction[];
  loading: boolean;
  error: string | null;
  onReload: () => void;
}) {
  return <section className="min-w-0" aria-label="审计日志">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-xl font-semibold">审计日志</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">最近 30 条账户管理操作，按时间倒序展示操作人、对象和原因。</p></div>
      <Button variant="ghost" size="icon" aria-label="刷新审计日志" disabled={loading} onClick={onReload}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /></Button>
    </div>
    {loading ? <div className="organization-state" role="status"><LoaderCircle className="animate-spin" size={18} />正在读取审计日志</div>
      : error ? <div className="organization-state" role="alert"><p>{error}</p><Button variant="ghost" onClick={onReload}>重试</Button></div>
      : actions.length === 0 ? <div className="organization-state"><ScrollText size={22} /><p>还没有审计日志</p><span>账户审核、积分调整等管理操作会记录在这里。</span></div>
      : <div className="mt-6">
        <div aria-hidden="true" className="hidden grid-cols-[180px_140px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)] gap-4 px-4 pb-3 text-xs text-zinc-500 lg:grid">
          <span>时间</span><span>操作</span><span>操作人</span><span>对象</span><span>原因 / 积分</span>
        </div>
        <ol className="divide-y divide-zinc-200" aria-label="账户管理审计记录">
          {actions.map((action) => <li key={action.id} className="py-4 lg:px-4">
            <dl className="grid gap-3 text-sm lg:grid-cols-[180px_140px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)] lg:gap-4">
              <div><dt className="text-xs text-zinc-500 lg:sr-only">时间</dt><dd className="mt-1 text-zinc-500 lg:mt-0"><time dateTime={action.createdAt}>{formatDate(action.createdAt)}</time></dd></div>
              <div><dt className="text-xs text-zinc-500 lg:sr-only">操作</dt><dd className="mt-1 font-medium lg:mt-0">{ACTION_LABELS[action.actionType] ?? "管理操作"}{action.creditGrantType && <span className="mt-1 block text-xs text-zinc-500">{ADMIN_CREDIT_TYPE_LABELS[action.creditGrantType]}</span>}</dd></div>
              <div className="min-w-0"><dt className="text-xs text-zinc-500 lg:sr-only">操作人</dt><dd className="mt-1 break-all text-zinc-600 lg:mt-0">{action.actorEmail}</dd></div>
              <div className="min-w-0"><dt className="text-xs text-zinc-500 lg:sr-only">对象</dt><dd className="mt-1 break-all text-zinc-600 lg:mt-0">{action.targetEmail}</dd></div>
              <div className="min-w-0"><dt className="text-xs text-zinc-500 lg:sr-only">原因 / 积分</dt><dd className="mt-1 whitespace-pre-wrap break-words text-zinc-600 lg:mt-0">{action.creditAmount ? `${action.creditAmount} 积分 · ` : ""}{action.reason}</dd></div>
            </dl>
          </li>)}
        </ol>
      </div>}
  </section>;
}

export function AuditLogView({ session }: { session: AuthenticationSession }) {
  const canRead = !session.preview && session.access.status === "active" && session.account.role === "site_owner";
  const [actions, setActions] = useState<readonly AdministrativeAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const load = useCallback(async () => {
    if (!canRead) return;
    const request = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const next = await readAuditLog();
      if (request === requestRef.current) setActions(next);
    } catch (failure) {
      if (request === requestRef.current) setError(failure instanceof Error ? failure.message : "审计日志暂时无法读取，请重试。");
    } finally { if (request === requestRef.current) setLoading(false); }
  }, [canRead]);
  useEffect(() => {
    if (!canRead) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => { window.clearTimeout(timer); requestRef.current += 1; };
  }, [canRead, load]);
  if (!canRead) return <section className="organization-state" role="alert">没有审计日志查看权限</section>;
  return <AuditLogContent actions={actions} loading={loading} error={error} onReload={() => void load()} />;
}
