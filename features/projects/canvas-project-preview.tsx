"use client";

import { useEffect, useRef, useState } from "react";
import { AudioLines, LoaderCircle, Play, RefreshCw } from "lucide-react";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";
import { readCanvasProject } from "@/features/canvas/canvas-project-boundary";
import { readLocalCanvasFile, readLocalCanvasProject } from "@/features/canvas/canvas-project-local";
import { listPrivateVideoMaterials } from "@/features/creation/http-video-materials";
import { listPrivateAudioMaterials } from "@/features/assets/http-audio-materials";
import type { CanvasProjectNode } from "@/shared/contracts/canvas-project";
import type { GenerationJob } from "@/shared/contracts/generation";
import { privateImageUrls } from "@/shared/private-image-urls.mjs";
import { canvasPreviewBounds, canvasPreviewNodeSize, canvasPreviewPage } from "./project-library-model.mjs";
import type { CanvasProjectListItem } from "./canvas-project-index";
import styles from "./project-library.module.css";

type PreviewNode = CanvasProjectNode & { previewUrl?: string; media?: "image" | "video" | "audio"; label?: string };
type Preview = { nodes: PreviewNode[]; edges: readonly { id: string; source: string; target: string }[]; objectUrls: string[] };

async function readPreview(project: CanvasProjectListItem, ownerKey: string): Promise<Preview> {
  const local = await readLocalCanvasProject(ownerKey, project.id).catch(() => null);
  const document = local && (local.dirty || local.version === null || (local.version ?? 0) >= (project.version ?? 0))
    ? local.document : (await readCanvasProject(project.id)).document;
  let activePageId: string | null = null;
  try { activePageId = localStorage.getItem(`goodgood.canvas.active-page.v1:${ownerKey}:${project.id}`); }
  catch { /* The first page is the persisted fallback. */ }
  const page = canvasPreviewPage(document, activePageId);
  if (!page) throw new Error("画布页面暂时无法读取，请重试。");
  const jobs = new Map<string, GenerationJob>();
  const jobIds = [...new Set(page.nodes.filter((node) => node.jobId && !node.jobId.startsWith("pending_")).map((node) => node.jobId!))];
  await Promise.all(jobIds.map(async (id) => {
    const response = await goodGoodApiFetch(`/api/generations/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!response.ok) throw new Error("画布生成结果暂时无法读取，请重试。");
    jobs.set(id, await response.json() as GenerationJob);
  }));
  const [videos, audios] = await Promise.all([
    page.nodes.some((node) => node.asset?.kind === "video") ? listPrivateVideoMaterials(null) : Promise.resolve([]),
    page.nodes.some((node) => node.asset?.kind === "audio") ? listPrivateAudioMaterials(null) : Promise.resolve([]),
  ]);
  const objectUrls: string[] = [];
  try {
    const results = await Promise.allSettled(page.nodes.map(async (node): Promise<PreviewNode> => {
      if (node.pendingFileId) {
        const file = await readLocalCanvasFile(ownerKey, node.pendingFileId);
        if (!file) return { ...node, label: "本地素材不可用" };
        const previewUrl = URL.createObjectURL(file);
        objectUrls.push(previewUrl);
        return { ...node, previewUrl, media: node.type === "sourceVideo" ? "video" : "image" };
      }
      if (node.asset?.kind === "reference" || node.asset?.kind === "generated") {
        return { ...node, previewUrl: privateImageUrls(node.asset.kind === "reference" ? "reference" : "asset", node.asset.id).previewUrl, media: "image" };
      }
      if (node.asset?.kind === "video") {
        const video = videos.find((item) => item.id === node.asset?.id);
        if (!video) throw new Error("画布视频素材暂时无法读取，请重试。");
        return { ...node, previewUrl: video.url, media: "video" };
      }
      if (node.asset?.kind === "audio") {
        const audio = audios.find((item) => item.id === node.asset?.id);
        if (!audio) throw new Error("画布音频素材暂时无法读取，请重试。");
        return { ...node, previewUrl: audio.url, media: "audio" };
      }
      if (node.type === "imageGenerator" || node.type === "imageResult") {
        const job = node.jobId ? jobs.get(node.jobId) ?? node.localJob : undefined;
        const output = job?.outputs[node.type === "imageResult" ? node.index ?? 0 : 0];
        if (output) return { ...node, previewUrl: privateImageUrls("asset", output.id).previewUrl, media: "image" };
        return { ...node, label: job?.state === "failed" ? job.error?.title ?? "生成失败"
          : job && ["queued", "running", "refining"].includes(job.state) ? "生成中" : node.type === "imageGenerator" ? "图片生成" : "暂无结果" };
      }
      return node;
    }));
    const failure = results.find((result) => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
    const nodes = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    return { nodes, edges: page.edges, objectUrls };
  } catch (error) {
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
    throw error;
  }
}

function SnapshotNode({ node, onFailure }: { node: PreviewNode; onFailure: () => void }) {
  if (node.type === "textEditor" || node.type === "textGenerator") return <div style={{ height: "100%", padding: 16, overflow: "hidden", whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.7 }}>
    {node.text || (node.type === "textGenerator" ? "文本生成" : "文本编辑")}
  </div>;
  if (node.media === "image" && node.previewUrl) return <PrivateObjectImage src={node.previewUrl} alt="" loading="eager" className={styles.snapshotImage} onError={onFailure} />;
  if (node.media === "video" && node.previewUrl) return <div className={styles.snapshotVideo}>
    <video src={node.previewUrl} muted playsInline preload="metadata" onLoadedMetadata={(event) => { event.currentTarget.currentTime = Math.min(0.05, event.currentTarget.duration || 0); }} onError={onFailure} />
    <Play size={30} fill="currentColor" aria-hidden="true" />
  </div>;
  if (node.media === "audio" && node.previewUrl) return <div className={styles.snapshotAudio}><div><AudioLines size={15} /><span>{node.name ?? "音频"}</span></div><audio src={node.previewUrl} controls tabIndex={-1} preload="metadata" onError={onFailure} /></div>;
  return <div className={styles.snapshotPlaceholder}>{node.label ?? node.name ?? "素材"}</div>;
}

/** Read-only projection; mounting this component cannot submit or sync a canvas. */
export function CanvasProjectPreview({ project, ownerKey }: { project: CanvasProjectListItem; ownerKey: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === "undefined");
  const [revision, setRevision] = useState(0);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mediaFailed, setMediaFailed] = useState(false);
  const [loadedIdentity, setLoadedIdentity] = useState("");
  const identity = JSON.stringify([ownerKey, project.id, project.updatedAt, project.version, revision]);
  useEffect(() => {
    if (!host.current) return;
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "200px" });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let objectUrls: string[] = [];
    void readPreview(project, ownerKey).then((next) => {
      if (cancelled) { next.objectUrls.forEach((url) => URL.revokeObjectURL(url)); return; }
      objectUrls = next.objectUrls;
      setLoadedIdentity(identity); setPreview(next); setError(null); setMediaFailed(false);
    }).catch((failure) => {
      if (!cancelled) {
        setLoadedIdentity(identity); setPreview(null); setMediaFailed(false);
        setError(failure instanceof Error ? failure.message : "画布快照暂时无法读取，请重试。");
      }
    });
    return () => { cancelled = true; objectUrls.forEach((url) => URL.revokeObjectURL(url)); };
  }, [visible, project, ownerKey, identity]);
  const currentPreview = loadedIdentity === identity ? preview : null;
  const currentError = loadedIdentity === identity ? error : null;
  const bounds = currentPreview ? canvasPreviewBounds(currentPreview.nodes) : null;
  const byId = new Map(currentPreview?.nodes.map((node) => [node.id, node]) ?? []);
  return <div ref={host} className={styles.preview}>
    {currentError ? <div className={styles.previewState} role="alert"><span>{currentError}</span><button type="button" onClick={() => setRevision((value) => value + 1)}><RefreshCw size={13} />重试快照</button></div>
      : <div className={styles.previewContent}>
        {!currentPreview || !bounds ? <span className={styles.previewState} role="status"><LoaderCircle size={18} />正在读取画布快照</span>
          : !currentPreview.nodes.length ? <span className={styles.previewState}>空白画布</span>
            : <svg className={styles.snapshot} viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${project.name} 的画布快照`}>
              {currentPreview.edges.map((edge) => {
                const source = byId.get(edge.source); const target = byId.get(edge.target);
                if (!source || !target) return null;
                const sourceSize = canvasPreviewNodeSize(source); const targetSize = canvasPreviewNodeSize(target);
                const x1 = source.position.x + sourceSize.width; const y1 = source.position.y + sourceSize.height / 2;
                const x2 = target.position.x; const y2 = target.position.y + targetSize.height / 2;
                const bend = Math.max(40, Math.abs(x2 - x1) / 2);
                return <path key={edge.id} d={`M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`} fill="none" stroke="#a1a1aa" strokeWidth="1.5" />;
              })}
              {currentPreview.nodes.map((node) => {
                const size = canvasPreviewNodeSize(node);
                return <foreignObject key={node.id} x={node.position.x} y={node.position.y} width={size.width} height={size.height}>
                  <div className={styles.snapshotNode}><SnapshotNode node={node} onFailure={() => setMediaFailed(true)} /></div>
                </foreignObject>;
              })}
            </svg>}
      </div>}
    {loadedIdentity === identity && mediaFailed && <div className={styles.previewRetry} role="alert"><span>部分素材无法预览</span><button type="button" onClick={() => setRevision((value) => value + 1)}><RefreshCw size={12} />重试</button></div>}
  </div>;
}
