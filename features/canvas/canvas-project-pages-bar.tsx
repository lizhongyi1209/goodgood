"use client";

import { Plus, Scan, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CANVAS_PROJECT_MAX_PAGES } from "@/shared/contracts/canvas-project";
import styles from "./canvas-page.module.css";

export function CanvasProjectPagesBar({ pages, activePageId, busy, onSwitch, onAdd, onDeleteRequest }: {
  pages: readonly { id: string; name: string; deletingDisabled: boolean }[];
  activePageId: string;
  busy: boolean;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onDeleteRequest: (id: string) => void;
}) {
  return <div className={styles.pagesBar} aria-label="项目页面">
    <div className={styles.pageTabs} role="tablist" aria-label="画布页面" onKeyDown={(event) => {
      if (busy || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
      const current = buttons.findIndex((button) => button === event.target);
      if (current < 0) return;
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1
        : (current + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next]?.focus();
      if (pages[next]) onSwitch(pages[next].id);
    }}>
      {pages.map((page) => <div key={page.id} className={styles.pageTabGroup} data-active={page.id === activePageId}>
        <button type="button" role="tab" id={`canvas-page-tab-${page.id}`}
          aria-controls="canvas-active-page" aria-selected={page.id === activePageId}
          tabIndex={page.id === activePageId ? 0 : -1}
          disabled={busy} className={styles.pageTab} onClick={() => onSwitch(page.id)}>
          <Scan aria-hidden="true" className={styles.pageTabIcon} viewBox="2 2 20 20" strokeWidth={1.6} />
          <span>{page.name}</span>
        </button>
        {pages.length > 1 && <button type="button" className={styles.pageTabDelete}
          disabled={busy || page.deletingDisabled} aria-label={`删除${page.name}`}
          title={page.deletingDisabled ? "请等待上传或生成完成后再删除页面" : `删除${page.name}`}
          onClick={() => onDeleteRequest(page.id)}><X aria-hidden="true" className={styles.pageTabIcon} strokeWidth={1.6} /></button>}
      </div>)}
    </div>
    <button type="button" className={styles.pageAdd} aria-label="添加页面" title={pages.length >= CANVAS_PROJECT_MAX_PAGES ? "每个项目最多 10 个页面" : "添加页面"}
      disabled={busy || pages.length >= CANVAS_PROJECT_MAX_PAGES} onClick={onAdd}><Plus aria-hidden="true" className={styles.pageTabIcon} viewBox="4 4 16 16" strokeWidth={1.6} /></button>
  </div>;
}

export function CanvasPageDeleteDialog({ pageName, disabled, onCancel, onConfirm }: {
  pageName: string | null; disabled: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  return <AlertDialog open={pageName !== null} onOpenChange={(open) => { if (!open) onCancel(); }}>
    <AlertDialogContent className={styles.pageDeleteDialog} overlayClassName={styles.pageDeleteOverlay}>
      <AlertDialogHeader><AlertDialogTitle>删除{pageName}？</AlertDialogTitle>
        <AlertDialogDescription>将删除此页面中的节点、连线和生成设置。资产库中的素材仍会保留。</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel>
        <AlertDialogAction disabled={disabled} onClick={onConfirm}>删除页面</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
