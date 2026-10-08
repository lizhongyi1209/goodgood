"use client";

import { AudioLines } from "lucide-react";
import { useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import type { CanvasAudioNodeType } from "./canvas-workspace";
import styles from "./canvas-workspace.module.css";

export type CanvasAudioNodeData = Record<string, unknown> & {
  assetId?: string;
  name: string;
  sourceUrl: string;
};

export function CanvasAudioNode({ data }: NodeProps<CanvasAudioNodeType>) {
  const [failed, setFailed] = useState(false);

  return <><article className={styles.audioNode} aria-label={`音频 ${data.name}`}>
    <div className={styles.audioNodeTitle}><AudioLines size={15} aria-hidden="true" /><span title={data.name}>{data.name}</span></div>
    {failed ? <p className={styles.audioNodeError} role="alert">音频无法播放</p> :
      <audio className={`${styles.audioPlayer} nodrag nopan`} src={data.sourceUrl} controls preload="metadata"
        aria-label={`播放 ${data.name}`} onError={() => setFailed(true)} />}
  </article><Handle type="source" position={Position.Right} id="audio" className={styles.referenceOutputHandle} aria-label="输出音频" /></>;
}
