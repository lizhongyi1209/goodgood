"use client";

import { useRef } from "react";
import { Film, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Dialog, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { SeedanceModelIcon } from "@/features/models/seedance-model-icon";
import { getVideoGenerationModel } from "@/features/creation/video-generation-options";
import { getVideoPreviewRatio } from "@/features/creation/video-preview-card";
import type { VideoPreviewRun } from "@/features/creation/video-preview-runs";

export function VideoPreviewDetail({ runs, activeKey, onSelect }: { runs: readonly VideoPreviewRun[]; activeKey: string | null; onSelect: (key: string | null) => void }) {
  const outputs = runs.filter((run) => run.job.resultUrl);
  const index = outputs.findIndex((run) => run.key === activeKey);
  const active = outputs[index];
  const wheelTime = useRef(0);
  const openerRef = useRef<HTMLElement | null>(null);
  const select = (offset: number) => onSelect(outputs[(index + offset + outputs.length) % outputs.length]?.key ?? null);
  const ratio = active ? getVideoPreviewRatio(active) : 1;
  return <Dialog open={Boolean(active)} onOpenChange={(open) => { if (!open) onSelect(null); }}><DialogPortal><DialogOverlay /><DialogPrimitive.Content className="image-detail-dialog" onOpenAutoFocus={() => { openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }} onCloseAutoFocus={(event) => { event.preventDefault(); openerRef.current?.focus({ preventScroll: true }); }} onKeyDown={(event) => {
    if (["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"].includes(event.key)) { event.preventDefault(); select(event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1); }
  }} onWheel={(event) => {
    if (!(event.target instanceof Element) || !event.target.closest(".image-detail-stage") || Math.abs(event.deltaY) < 18 || event.timeStamp - wheelTime.current < 280) return;
    event.preventDefault(); wheelTime.current = event.timeStamp; select(event.deltaY > 0 ? 1 : -1);
  }}>
    <DialogTitle className="sr-only">视频详情</DialogTitle><DialogDescription className="sr-only">查看本地生成视频、提示词与参数；结果未写入资产库。</DialogDescription>
    {active && <div className="image-detail-layout">
      <section className="image-detail-stage"><button className="image-detail-close" aria-label="关闭视频详情" onClick={() => onSelect(null)}><X size={20} /></button><div className="image-detail-count">{index + 1} / {outputs.length}</div><div className="image-detail-art video-run-detail-art" style={{ aspectRatio: ratio, width: `min(calc(100% - 72px), ${ratio * 82}dvh)` }}><video key={active.key} src={active.job.resultUrl!} controls playsInline aria-label="Seedance 生成视频" /></div></section>
      <aside className="image-detail-info"><header className="image-detail-info-header"><div><small>本地实测 · 不写入资产库</small><strong>{getVideoGenerationModel(active.input.modelId).name}</strong></div><SeedanceModelIcon /></header><div className="image-detail-section image-detail-prompt"><span>提示词</span><p>{active.input.prompt}</p></div><div className="image-detail-section"><span>生成参数</span><dl className="image-detail-parameters"><div><dt>画面比例</dt><dd>{active.input.ratio === "adaptive" ? "自适应" : active.input.ratio}</dd></div><div><dt>清晰度</dt><dd>{active.input.resolution}</dd></div><div><dt>时长</dt><dd>{active.input.duration} 秒</dd></div><div><dt>声音</dt><dd>{active.input.generateAudio ? "有声" : "静音"}</dd></div><div><dt>线路</dt><dd>{active.input.line === "standard" ? "标准" : "备用"}</dd></div><div><dt>生成数量</dt><dd>{active.count}</dd></div><div><dt>任务编号</dt><dd title={active.job.taskId}>{active.job.taskId}</dd></div></dl></div></aside>
      <nav className="image-detail-rail" aria-label="本地生成视频"><div className="image-detail-rail-title"><span>视频</span><small>{outputs.length}</small></div><div className="image-detail-thumbnails">{outputs.map((run, ordinal) => <button key={run.key} className={`image-detail-thumbnail${run.key === activeKey ? " active" : ""}`} aria-label={`查看视频 ${ordinal + 1}`} aria-current={run.key === activeKey ? "true" : undefined} onClick={() => onSelect(run.key)}><video src={run.job.resultUrl!} muted preload="metadata" /><Film className="mixed-preview-rail-video" size={12} /><span>{ordinal + 1}</span></button>)}</div></nav>
    </div>}
  </DialogPrimitive.Content></DialogPortal></Dialog>;
}
