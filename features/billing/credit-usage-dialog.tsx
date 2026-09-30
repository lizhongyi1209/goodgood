"use client";

import { UserRound, X } from "lucide-react";
import { CreditIcon } from "@/components/ui/credit-icon";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BillingAccountSummary } from "@/shared/contracts/billing";
import { CreditActivityView } from "./credit-activity-view";

type Props = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileClick: () => void;
  onAccountChange: (account: BillingAccountSummary) => void;
}>;

export function CreditUsageDialog({ open, onOpenChange, onProfileClick, onAccountChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="credit-usage-dialog" overlayClassName="credit-usage-overlay" showCloseButton={false}>
        <DialogTitle className="sr-only">积分明细</DialogTitle>
        <DialogDescription className="sr-only">查看个人积分余额变动和消费明细。</DialogDescription>
        <aside className="credit-usage-navigation" aria-label="账户管理">
          <strong>账户管理</strong>
          <button type="button" onClick={() => { onOpenChange(false); onProfileClick(); }}>
            <UserRound size={16} aria-hidden="true" />个人主页
          </button>
          <div className="credit-usage-navigation-active" aria-current="page">
            <CreditIcon size={16} />积分明细
          </div>
        </aside>
        <div className="credit-usage-content">
          {open && <CreditActivityView enabled={open} onAccountChange={onAccountChange} variant="dialog" />}
        </div>
        <DialogClose className="credit-usage-close" aria-label="关闭积分明细弹框"><X size={18} /></DialogClose>
      </DialogContent>
    </Dialog>
  );
}
