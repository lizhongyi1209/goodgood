"use client";

import { Check, Copy, KeyRound } from "lucide-react";
import { useState } from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function AccountInvitation({ code }: { code?: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <DropdownMenuItem
      className="account-menu-detail account-menu-invitation"
      disabled={!code}
      aria-label={code ? "复制邀请码 " + code : "邀请码暂不可用"}
      onSelect={(event) => {
        event.preventDefault();
        if (!code) return;
        void navigator.clipboard
          .writeText(code)
          .then(() => {
            setCopied(true);
            setFailed(false);
          })
          .catch(() => {
            setFailed(true);
          });
      }}
    >
      <KeyRound aria-hidden="true" size={17} />
      <span>{failed ? "请手动复制" : copied ? "已复制" : "邀请码"}</span>
      <strong className="select-text tabular-nums">{code ?? "—"}</strong>
      {copied ? (
        <Check aria-hidden="true" size={14} />
      ) : (
        <Copy aria-hidden="true" size={14} />
      )}
    </DropdownMenuItem>
  );
}
