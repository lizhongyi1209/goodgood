import { Type, X } from "lucide-react";
import type { CanvasTextInput } from "./canvas-text-input.mjs";
import styles from "./canvas-text-preview.module.css";

export function CanvasTextPreview({ inputs, onRemove, disabled }: Readonly<{
  inputs: readonly CanvasTextInput[]; onRemove: (edgeId: string) => void; disabled: boolean;
}>) {
  if (!inputs.length) return null;
  return <div className={styles.tray} aria-label="连接的文本提示词">
    {inputs.map((input, index) => <div key={input.edgeId} className={styles.card}>
      <details>
        <summary><Type size={12} aria-hidden="true" /><span>文本输入 {index + 1}</span></summary>
        <p className={styles.full}>{input.text}</p>
      </details>
      <p className={styles.preview}>{input.text}</p>
      <button type="button" onClick={() => onRemove(input.edgeId)} disabled={disabled} title="断开文本输入" aria-label={`断开文本输入 ${index + 1}`}><X size={12} aria-hidden="true" /></button>
    </div>)}
  </div>;
}
