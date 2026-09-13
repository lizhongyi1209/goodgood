"use client";

import Image from "next/image";
import { ArrowLeft, LogOut, SlidersHorizontal, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";

const pages = [
  { id: "users", href: "/admin/users", label: "账户管理", icon: UsersRound },
  { id: "models", href: "/admin/models", label: "模型管理", icon: SlidersHorizontal },
] as const;

export function AdminManagementHeader({
  activePage,
  onLogout,
}: {
  activePage: "users" | "models";
  onLogout: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white">
      <div className="mx-auto max-w-[1500px] px-5 pt-4 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <a href="/create" aria-label="GoodGood 创作" className="flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-4">
              <Image src="/goodgood-mark.svg" alt="" width={29} height={22} />
              <Image src="/goodgood-wordmark.svg" alt="" width={89} height={20} />
            </a>
            <span className="hidden border-l border-zinc-200 pl-4 text-sm font-medium text-zinc-600 sm:inline">站长管理</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <a href="/create"><ArrowLeft aria-hidden="true" />返回创作</a>
            </Button>
            <Button variant="ghost" size="icon" aria-label="退出登录" onClick={onLogout}>
              <LogOut aria-hidden="true" />
            </Button>
          </div>
        </div>
        <nav aria-label="站长管理" className="flex gap-2 py-3">
          {pages.map(({ id, href, label, icon: Icon }) => (
            <Button key={id} variant="ghost" className={activePage === id ? "bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary" : "text-zinc-500"} asChild>
              <a href={href} aria-current={activePage === id ? "page" : undefined}>
                <Icon aria-hidden="true" />{label}
              </a>
            </Button>
          ))}
        </nav>
      </div>
    </header>
  );
}
