"use client";

import { useState } from "react";
import { UserRound, UserRoundCog, X } from "lucide-react";
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
import { PersonalInformationPanel } from "@/features/profile/personal-information";
import styles from "./credit-usage-dialog.module.css";

type Props = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileClick: () => void;
  onAccountChange: (account: BillingAccountSummary) => void;
}>;

export function CreditUsageDialog({ open, onOpenChange, onProfileClick, onAccountChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`credit-usage-dialog ${styles.dialog}`} overlayClassName="credit-usage-overlay" showCloseButton={false}>
        <DialogTitle className="sr-only">账户管理</DialogTitle>
        <DialogDescription className="sr-only">查看个人信息、个人主页和积分明细。</DialogDescription>
        {open && <AccountManagementPanels onProfileClick={() => { onOpenChange(false); onProfileClick(); }} onAccountChange={onAccountChange} />}
        <DialogClose className="credit-usage-close" aria-label="关闭账户管理弹框"><X size={18} /></DialogClose>
      </DialogContent>
    </Dialog>
  );
}

export function AccountManagementPanels({ onProfileClick, onAccountChange }: Pick<Props, "onProfileClick" | "onAccountChange">) {
  const [section, setSection] = useState<"information" | "credits">("information");
  return <>
        <aside className={`credit-usage-navigation ${styles.navigation}`} aria-label="账户管理">
          <strong>账户管理</strong>
          <button type="button" className={styles.navigationButton} aria-current={section === "information" ? "page" : undefined} onClick={() => setSection("information")}>
            <UserRoundCog size={16} aria-hidden="true" />个人信息
          </button>
          <button type="button" onClick={onProfileClick}>
            <UserRound size={16} aria-hidden="true" />个人主页
          </button>
          <button type="button" className={styles.navigationButton} aria-current={section === "credits" ? "page" : undefined} onClick={() => setSection("credits")}>
            <CreditIcon size={16} />积分明细
          </button>
        </aside>
        <div className="credit-usage-content">
          {section === "information" ? <PersonalInformationPanel /> : <CreditActivityView enabled onAccountChange={onAccountChange} variant="dialog" />}
        </div>
  </>;
}
