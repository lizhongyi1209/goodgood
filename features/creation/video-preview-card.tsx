"use client";

import { CircleAlert, LoaderCircle, Play } from "lucide-react";
import { getVideoGenerationModel, VIDEO_RATIO_OPTIONS } from "@/features/creation/video-generation-options";
import { type VideoPreviewRun } from "@/features/creation/video-preview-runs";

export function getVideoPreviewRatio(run: VideoPreviewRun) {
  return run.outputRatio ?? VIDEO_RATIO_OPTIONS.find((ratio) => ratio.id === run.input.ratio)?.value ?? 16 / 9;
}

export function VideoPreviewCard({ run, onOpen, onResume, onDimensions }: { run: VideoPreviewRun; onOpen: () => void; onResume: () => void; onDimensions: (width: number, height: number) => void }) {
  const { job, input } = run;
  const unavailable = Boolean(run.monitoringError || job.error || job.status === "failed");
  const label = run.monitoringError ? job.taskId.startsWith("local_") ? "提交状态待确认" : "查询已中断" : job.status === "submitting" ? "正在提交" : job.status === "queued" ? "已排队" : job.status === "failed" ? "生成失败" : `生成中${job.progress === null ? "" : ` · ${job.progress}%`}`;
  return job.resultUrl ? (
    <button className="creation-card mixed-preview-card video-run-card" style={{ aspectRatio: getVideoPreviewRatio(run) }} aria-label={`查看 ${getVideoGenerationModel(input.modelId).name} 视频 ${run.ordinal + 1} 详情`} onClick={onOpen}>
      <video src={job.resultUrl} muted playsInline preload="metadata" onLoadedMetadata={(event) => { const video = event.currentTarget; if (video.videoWidth && video.videoHeight) onDimensions(video.videoWidth, video.videoHeight); video.currentTime = Math.min(0.1, video.duration || 0); }} />
      <span className="mixed-preview-video-marker"><Play size={11} fill="currentColor" />{input.duration} 秒</span>
      <span className="creation-card-meta">{getVideoGenerationModel(input.modelId).name} · {input.resolution}</span>
    </button>
  ) : (
    <div className={`creation-card mixed-preview-pending${unavailable ? " failed" : ""}`} style={{ aspectRatio: getVideoPreviewRatio(run) }} role={unavailable ? "alert" : "status"}>
      <div>{unavailable ? <CircleAlert size={20} /> : <LoaderCircle className="spin" size={20} />}<strong>{label}</strong>
        {unavailable && <small className="video-run-error">{run.monitoringError ?? job.error ?? "视频生成失败"}</small>}
        {run.monitoringError && !job.taskId.startsWith("local_") && <button className="video-run-resume" onClick={onResume}>继续查询</button>}
        {run.monitoringError && job.taskId.startsWith("local_") && <small>请先核对上游记录，勿重复提交</small>}
      </div>
      <span className="mixed-preview-slot-meta">{(run.promptCount ?? 1) > 1 ? `提示词${(run.promptOrdinal ?? 0) + 1} · ` : ""}视频{run.ordinal + 1} · {input.resolution} · {input.duration} 秒</span>
    </div>
  );
}
