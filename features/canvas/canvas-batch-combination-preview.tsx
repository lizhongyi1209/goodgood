"use client";

import { useId, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import type { CanvasBatchPanelItem } from "./canvas-batch-reference-panel";
import { pageCanvasBatchReferences } from "./canvas-batch-reference-page.mjs";
import styles from "./canvas-batch-combination-preview.module.css";

type Props = {
  common: readonly CanvasBatchPanelItem[];
  groups: readonly { id: string; name: string; items: readonly CanvasBatchPanelItem[] }[];
  mode: "all" | "paired";
  total: number;
  count: number;
};

export function CanvasBatchCombinationPreview(props: Props) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [jump, setJump] = useState("1");
  const list = useRef<HTMLDivElement>(null);
  const pageInputId = useId();
  const model = useMemo(() => open ? pageCanvasBatchReferences(props.common, props.groups, props.mode, page) : null,
    [open, props.common, props.groups, props.mode, page]);
  const changePage = (next: number) => {
    setPage(next); setJump(String(next));
    if (list.current) list.current.scrollTop = 0;
  };
  return <Dialog open={open} onOpenChange={(value) => {
    if (value) changePage(1);
    setOpen(value);
  }}>
    <DialogTrigger asChild><button type="button" className={styles.trigger} disabled={props.total < 1}>查看组合</button></DialogTrigger>
    <DialogContent className={styles.dialog + " nodrag nowheel nopan"} overlayClassName={styles.overlay} showCloseButton={false}>
      <DialogClose asChild><button type="button" className={styles.close} aria-label="关闭组合预览"><X size={18} /></button></DialogClose>
      {model && <>
        <DialogHeader className={styles.header}>
          <DialogTitle className={styles.title}>参考组合</DialogTitle>
          <DialogDescription className={styles.description}>共 {model.total.toLocaleString("zh-CN")} 组 · 每组 {props.count} 个任务。图片编号对应提示词中的图 1、图 2。</DialogDescription>
        </DialogHeader>
        {model.error && <p className={styles.status} role="status">{model.error}</p>}
        <div className={styles.list} ref={list} role="list" aria-label="本页参考组合">
          {model.combinations.map((combination) => <div className={styles.row} key={combination.key} role="listitem">
            <span className={styles.label}>组合 {(combination.index + 1).toLocaleString("zh-CN")}</span>
            <div className={styles.images}>
              {combination.items.map((item, index) => <span className={styles.image} key={item.reference.id}
                title={"图 " + (index + 1) + "：" + item.reference.name} aria-busy={item.reference.status === "uploading" || undefined}>
                <PrivateObjectImage src={item.previewUrl} alt={"图 " + (index + 1) + "：" + item.reference.name} />
                <small>{index + 1}</small>
                {item.reference.status !== "ready" && <span className={styles.imageStatus}>{item.reference.status === "failed" ? "载入失败" : "载入中"}</span>}
              </span>)}
            </div>
          </div>)}
          {!model.combinations.length && <p className={styles.empty}>添加素材后即可查看组合。</p>}
        </div>
        <div className={styles.footer}>
          <nav className={styles.pagination} aria-label="组合分页">
            <button type="button" disabled={model.page <= 1} onClick={() => changePage(model.page - 1)} aria-label="上一页"><ChevronLeft size={15} /></button>
            <span aria-live="polite">第 {model.page.toLocaleString("zh-CN")} / {model.pageCount.toLocaleString("zh-CN")} 页</span>
            <button type="button" disabled={model.page >= model.pageCount} onClick={() => changePage(model.page + 1)} aria-label="下一页"><ChevronRight size={15} /></button>
          </nav>
          <form className={styles.jump} onSubmit={(event) => {
            event.preventDefault();
            if (!/^\d+$/.test(jump)) return;
            const requested = BigInt(jump), last = BigInt(Math.max(model.pageCount, 1));
            changePage(Number(requested < 1n ? 1n : requested > last ? last : requested));
          }}>
            <label htmlFor={pageInputId}>跳转</label>
            <input id={pageInputId} type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" value={jump}
              onChange={(event) => setJump(event.target.value)} aria-label="跳转到第几页" />
            <span>页</span><button type="submit" disabled={!model.pageCount}>确定</button>
          </form>
        </div>
      </>}
    </DialogContent>
  </Dialog>;
}
