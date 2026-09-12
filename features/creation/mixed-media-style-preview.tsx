"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CircleAlert, Film, LoaderCircle, Pause, Play, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Dialog, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { PrivateObjectImage } from "@/components/ui/private-object-image";

type PreviewItem = {
  id: string;
  type: "image" | "video";
  ratio: number;
  ratioLabel: string;
  position: string;
  status: "completed" | "queued" | "in_progress" | "failed";
  duration?: number;
  prompt: string;
};

// Presentation fixtures only: never inserted into jobs, drafts, projects or Assets.
export const MIXED_MEDIA_STYLE_ITEMS: readonly PreviewItem[] = [
  { id: "demo-01", type: "video", ratio: 9 / 16, ratioLabel: "9:16", position: "50% 48%", status: "in_progress", duration: 5, prompt: "人物缓慢转身，镜头轻轻推进，柔和自然光。" },
  { id: "demo-02", type: "image", ratio: 1, ratioLabel: "1:1", position: "50% 48%", status: "completed", prompt: "时装人像，细腻质感，自然光。" },
  { id: "demo-03", type: "video", ratio: 16 / 9, ratioLabel: "16:9", position: "50% 35%", status: "completed", duration: 8, prompt: "镜头缓慢掠过时装细节，画面保持稳定。" },
  { id: "demo-04", type: "video", ratio: 1, ratioLabel: "1:1", position: "50% 48%", status: "queued", duration: 5, prompt: "固定镜头，人物轻微转动。" },
  { id: "demo-05", type: "image", ratio: 3 / 4, ratioLabel: "3:4", position: "50% 48%", status: "completed", prompt: "完整时装造型，自然光与真实纹理。" },
  { id: "demo-06", type: "video", ratio: 9 / 16, ratioLabel: "9:16", position: "50% 48%", status: "completed", duration: 5, prompt: "人物缓慢转身看向镜头，柔和光线。" },
  { id: "demo-07", type: "image", ratio: 16 / 9, ratioLabel: "16:9", position: "50% 30%", status: "completed", prompt: "横向人像特写，光影柔和，视觉简洁。" },
  { id: "demo-08", type: "video", ratio: 4 / 3, ratioLabel: "4:3", position: "50% 48%", status: "failed", duration: 5, prompt: "时装短片，轻微镜头运动。" },
];

const completedItems = MIXED_MEDIA_STYLE_ITEMS.filter((item) => item.status === "completed");
const modelName = (item: PreviewItem) => item.type === "video" ? "Seedance 2.0 Mini" : "GPT IMAGE 2";

export function MixedMediaStylePreview() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const wheelTime = useRef(0);
  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const index = completedItems.findIndex((item) => item.id === activeId);
  const active = completedItems[index];

  const select = (nextIndex: number) => {
    const item = completedItems[(nextIndex + completedItems.length) % completedItems.length];
    setActiveId(item.id);
    setPlaying(false);
    setElapsed(0);
  };

  useEffect(() => {
    thumbnailRefs.current[index]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [index]);

  useEffect(() => {
    if (!playing || !active?.duration) return;
    const timer = window.setInterval(() => setElapsed((value) => (value + 0.1) % active.duration!), 100);
    return () => window.clearInterval(timer);
  }, [playing, active]);

  const renderCard = (item: PreviewItem) => item.status !== "completed" ? (
    <div key={item.id} className={`creation-card mixed-preview-pending ${item.status}`} style={{ aspectRatio: item.ratio }} role={item.status === "failed" ? "alert" : "status"} aria-label={`视频${item.status === "queued" ? "已排队" : item.status === "failed" ? "生成失败" : "生成中"}`}>
      <div>{item.status === "failed" ? <CircleAlert size={20} /> : <LoaderCircle className="spin" size={20} />}<strong>{item.status === "queued" ? "已排队" : item.status === "failed" ? "生成失败" : "生成中 · 42%"}</strong>{item.status === "failed" && <small>服务暂时不可用</small>}</div>
      <span className="mixed-preview-slot-meta"><Film size={12} />{item.ratioLabel} · {item.duration} 秒</span>
    </div>
  ) : (
    <button key={item.id} className="creation-card mixed-preview-card" style={{ aspectRatio: item.ratio }} aria-label={`查看${item.type === "video" ? "视频" : "图片"}详情 ${item.id}`} onClick={(event) => { openerRef.current = event.currentTarget; setActiveId(item.id); setPlaying(false); setElapsed(0); }}>
      <PrivateObjectImage src="/nano-fashion.png" alt={`${item.type === "video" ? "视频封面" : "图片"}样式模拟`} style={{ objectPosition: item.position }} />
      {item.type === "video" && <span className="mixed-preview-video-marker"><Play size={11} fill="currentColor" />0:{String(item.duration).padStart(2, "0")}</span>}
      <span className="creation-card-meta">{modelName(item)} · {item.type === "video" ? "720p" : "1K"}</span>
    </button>
  );

  const columns = (count: number) => Array.from({ length: count }, (_, column) => <div className="creation-column" key={column}>{MIXED_MEDIA_STYLE_ITEMS.filter((_, itemIndex) => itemIndex % count === column).map(renderCard)}</div>);

  return (
    <section className="creation-stream mixed-media-style-preview" aria-label="图片视频混排样式模拟">
      <header className="creation-stream-header"><div className="creation-context"><strong>本次创作</strong><span>样式模拟 · 图片与视频</span></div><small className="mixed-preview-note">点击作品查看详情 · 不会发起生成请求</small></header>
      <div className="creation-masonry-frame">
        <div className="creation-masonry desktop-creation-masonry">{columns(4)}</div>
        <div className="creation-masonry mobile-creation-masonry">{columns(2)}</div>
      </div>
      <Dialog open={Boolean(active)} onOpenChange={(open) => { if (!open) { setActiveId(null); setPlaying(false); } }}>
        <DialogPortal><DialogOverlay /><DialogPrimitive.Content className="image-detail-dialog mixed-preview-detail" onCloseAutoFocus={(event) => { event.preventDefault(); openerRef.current?.focus({ preventScroll: true }); }} onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); select(index + 1); }
          if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); select(index - 1); }
        }} onWheel={(event) => {
          if (!(event.target instanceof Element) || !event.target.closest(".image-detail-stage") || Math.abs(event.deltaY) < 18 || Date.now() - wheelTime.current < 280) return;
          event.preventDefault(); wheelTime.current = Date.now(); select(index + (event.deltaY > 0 ? 1 : -1));
        }}>
          <DialogTitle className="sr-only">作品详情</DialogTitle><DialogDescription className="sr-only">图片与视频样式模拟，方向键或在预览区域滚轮切换作品。</DialogDescription>
          {active && <div className="image-detail-layout">
            <section className="image-detail-stage" aria-label={active.type === "video" ? "视频预览" : "图片预览"}>
              <button className="image-detail-close" aria-label="关闭作品详情" onClick={() => { setActiveId(null); setPlaying(false); }}><X size={20} /></button>
              <div className="image-detail-count">{index + 1} / {completedItems.length}</div>
              <div className={`image-detail-art mixed-preview-art${playing ? " is-playing" : ""}`} style={{ aspectRatio: active.ratio, width: `min(calc(100% - 72px), ${active.ratio * 82}dvh)` } as CSSProperties}>
                <PrivateObjectImage src="/nano-fashion.png" alt={active.type === "video" ? "模拟视频封面" : "模拟图片"} style={{ objectPosition: active.position }} />
                {active.type === "video" && <>
                  <span className="mixed-preview-simulation-label">模拟预览 · 非真实视频</span>
                  <button className="mixed-preview-play" aria-label={playing ? "暂停模拟预览" : "播放模拟预览"} onClick={() => setPlaying((value) => !value)}>{playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}</button>
                  <div className="mixed-preview-controls"><button aria-label={playing ? "暂停" : "播放"} onClick={() => setPlaying((value) => !value)}>{playing ? <Pause size={15} /> : <Play size={15} />}</button><span>0:{String(Math.floor(elapsed)).padStart(2, "0")} / 0:{String(active.duration).padStart(2, "0")}</span><div className="mixed-preview-timeline"><i style={{ width: `${elapsed / active.duration! * 100}%` }} /></div></div>
                </>}
              </div>
            </section>
            <aside className="image-detail-info" aria-label="作品信息">
              <header className="image-detail-info-header"><div><small>样式模拟 · {active.type === "video" ? "视频" : "图片"}</small><strong>{modelName(active)}</strong></div></header>
              <div className="image-detail-section image-detail-prompt"><span>提示词</span><p>{active.prompt}</p></div>
              <div className="image-detail-section"><span>生成参数</span><dl className="image-detail-parameters">
                <div><dt>模型</dt><dd>{modelName(active)}</dd></div><div><dt>画面比例</dt><dd>{active.ratioLabel}</dd></div><div><dt>清晰度</dt><dd>{active.type === "video" ? "720p" : "1K"}</dd></div>
                {active.type === "video" ? <><div><dt>时长</dt><dd>{active.duration} 秒</dd></div><div><dt>线路</dt><dd>标准</dd></div><div><dt>声音</dt><dd>有声</dd></div></> : <div><dt>输出格式</dt><dd>JPEG</dd></div>}
              </dl></div>
              <div className="image-detail-wheel-hint"><div><strong>滚动切换图片与视频</strong><small>也可使用方向键 · 数据仅用于样式确认</small></div></div>
            </aside>
            <nav className="image-detail-rail" aria-label="全部图片与视频"><div className="image-detail-rail-title"><span>全部</span><small>{completedItems.length}</small></div><div className="image-detail-thumbnails">{completedItems.map((item, itemIndex) => <button key={item.id} ref={(element) => { thumbnailRefs.current[itemIndex] = element; }} className={`image-detail-thumbnail${itemIndex === index ? " active" : ""}`} aria-current={itemIndex === index ? "true" : undefined} aria-label={`查看第 ${itemIndex + 1} 个${item.type === "video" ? "视频" : "图片"}`} onClick={() => select(itemIndex)}><PrivateObjectImage src="/nano-fashion.png" alt="" style={{ objectPosition: item.position }} />{item.type === "video" && <Film className="mixed-preview-rail-video" size={12} />}<span>{itemIndex + 1}</span></button>)}</div></nav>
          </div>}
        </DialogPrimitive.Content></DialogPortal>
      </Dialog>
    </section>
  );
}
