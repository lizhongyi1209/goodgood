"use client";

import { ArrowDown, ArrowUp, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { countPromptCharacters, type GenerationPromptStatus } from "@/shared/contracts/generation-prompt-limits.mjs";
import type { CanvasTextInput } from "./canvas-text-input.mjs";
import styles from "./canvas-prompt-preview.module.css";

type CanvasPromptPreviewProps = Readonly<{
  prompt: string;
  additionalPrompt: string;
  modelName: string;
  status: GenerationPromptStatus;
  inputs: readonly CanvasTextInput[];
  editingLocked: boolean;
  onMove: (edgeId: string, direction: -1 | 1) => void;
}>;

export function CanvasPromptPreview({ prompt, additionalPrompt, modelName, status, inputs, editingLocked, onMove }: CanvasPromptPreviewProps) {
  const count = `${status.length.toLocaleString("zh-CN")} / ${status.maxLength.toLocaleString("zh-CN")}`;
  return <div className={styles.summary}>
    <Dialog>
      <div className={styles.summaryRow}>
        <DialogTrigger asChild>
          <Button type="button" variant="ghost" size="xs" className={styles.trigger} aria-label="查看最终提示词全文和调整文本顺序">
            <FileText aria-hidden="true" />完整提示词
          </Button>
        </DialogTrigger>
        <span className={styles.count} data-over-limit={status.tooLong} aria-label={`最终提示词 ${count} 个字符`}>{count}</span>
      </div>
      <DialogContent className={styles.dialog} overlayClassName={styles.overlay} onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>最终提示词</DialogTitle>
          <DialogDescription>{modelName} · {count} 字符</DialogDescription>
        </DialogHeader>
        {inputs.length > 0 && <div className={styles.order}>
          <p className={styles.orderLabel}>文本顺序</p>
          <ol className={styles.inputs}>
            {inputs.map((input, index) => <li key={input.edgeId} className={styles.input}>
              <div className={styles.inputText}>
                <span>连接文本 {index + 1} · {countPromptCharacters(input.text.trim()).toLocaleString("zh-CN")} 字符</span>
                <p>{input.text.trim()}</p>
              </div>
              <Button type="button" variant="ghost" size="icon-xs" disabled={editingLocked || index === 0} aria-label={`上移连接文本 ${index + 1}`} title="上移" onClick={() => onMove(input.edgeId, -1)}>
                <ArrowUp aria-hidden="true" />
              </Button>
              <Button type="button" variant="ghost" size="icon-xs" disabled={editingLocked || index === inputs.length - 1} aria-label={`下移连接文本 ${index + 1}`} title="下移" onClick={() => onMove(input.edgeId, 1)}>
                <ArrowDown aria-hidden="true" />
              </Button>
            </li>)}
          </ol>
          {additionalPrompt.trim() && <p className={styles.note}>补充描述追加在连接文本之后。</p>}
        </div>}
        <Textarea className={styles.fullPrompt} aria-label="最终发送的完整提示词，只读" readOnly value={prompt} placeholder="暂无提示词" />
        {status.errorMessage && <p className={styles.error} role="alert">{status.errorMessage}</p>}
        {status.advice && <p className={styles.note}>{status.advice}</p>}
      </DialogContent>
    </Dialog>
    {status.errorMessage && <p id="canvas-prompt-status" className={styles.error} role="alert">{status.errorMessage}</p>}
    {status.advice && <p className={styles.note}>{status.advice}</p>}
  </div>;
}
