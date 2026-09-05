"use client";

import Image from "next/image";
import { Clock3, LogOut, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AuthenticationSession } from "./http-auth-boundary";

export function AccountAccessGate({
  busy = false,
  onLogout,
  onRefresh,
  session,
}: {
  busy?: boolean;
  onLogout: () => void;
  onRefresh: () => void;
  session: AuthenticationSession;
}) {
  const pending = session.access.status === "pending";
  return (
    <div className="fixed inset-0 z-[100] flex min-h-dvh items-center justify-center bg-white px-5 py-10 text-zinc-950">
      <section
        aria-labelledby="account-access-title"
        className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-7 shadow-[0_18px_60px_rgba(24,24,27,0.06)] sm:p-9"
      >
        <div className="mb-8 flex items-center gap-3" role="img" aria-label="GoodGood">
          <Image src="/goodgood-mark.svg" alt="" width={30} height={23} />
          <Image src="/goodgood-wordmark.svg" alt="" width={94} height={22} />
        </div>
        <div className="mb-5 flex size-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
          {pending ? <Clock3 aria-hidden="true" /> : <ShieldAlert aria-hidden="true" />}
        </div>
        <h1 id="account-access-title" className="text-2xl font-semibold tracking-tight">
          {pending ? "账号正在审核中" : "账号已暂停使用"}
        </h1>
        <p className="mt-3 text-base leading-7 text-zinc-600">
          {pending
            ? "登录已经完成。站长审核通过后，你就可以开始创作。"
            : "你的历史数据会继续保留，但当前不能创建、上传或读取创作内容。请联系站长了解详情。"}
        </p>
        {pending && (
          <div className="mt-6 rounded-2xl bg-zinc-50 px-4 py-4">
            <span className="block text-sm text-zinc-500">已到账欢迎积分</span>
            <strong className="mt-1 block text-2xl font-semibold tabular-nums">
              {session.account.availableCredits}
            </strong>
            <span className="mt-1 block text-sm text-zinc-500">审核通过前不会消耗</span>
          </div>
        )}
        <p className="mt-5 truncate text-sm text-zinc-500">{session.user.email}</p>
        <div className="mt-7 flex flex-col gap-2 sm:flex-row">
          <Button className="sm:flex-1" disabled={busy} onClick={onRefresh}>
            <RefreshCw className={busy ? "animate-spin" : ""} />
            刷新状态
          </Button>
          <Button className="sm:flex-1" variant="outline" disabled={busy} onClick={onLogout}>
            <LogOut />退出登录
          </Button>
        </div>
      </section>
    </div>
  );
}
