"use client";

import { KeyRound } from "lucide-react";

export function AccountInvitation({ code }: { code?: string }) {
  return (
    <div className="account-menu-detail account-menu-invitation">
      <KeyRound aria-hidden="true" size={17} />
      <span>邀请码</span>
      <strong className="select-text tabular-nums">{code ?? "—"}</strong>
    </div>
  );
}
