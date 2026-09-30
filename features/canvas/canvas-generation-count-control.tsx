"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CANVAS_GENERATION_COUNTS, type GenerationCount } from "@/shared/contracts/generation";

import styles from "./canvas-generation-count-control.module.css";

const MIN_COUNT = CANVAS_GENERATION_COUNTS[0];
const MAX_COUNT = CANVAS_GENERATION_COUNTS[CANVAS_GENERATION_COUNTS.length - 1];

type CountControlProps = {
  value: GenerationCount;
  onValueChange: (count: GenerationCount) => void;
  disabled?: boolean;
};

/** A compact integer control using the existing shadcn input and buttons. */
export function CanvasGenerationCountControl({ value, onValueChange, disabled = false }: CountControlProps) {
  const [draftState, setDraftState] = useState({ value, text: String(value) });
  const draft = draftState.value === value ? draftState.text : String(value);
  const setDraft = (text: string) => setDraftState({ value, text });

  const boundedCount = (input: string): GenerationCount => {
    const parsed = input === "" ? value : Number(input);
    return Math.max(MIN_COUNT, Math.min(MAX_COUNT, parsed)) as GenerationCount;
  };
  const editedCount = boundedCount(draft);
  const publish = (next: GenerationCount) => {
    setDraft(String(next));
    if (next !== value) onValueChange(next);
  };

  return <div className={`${styles.control} nodrag nopan`} role="group" aria-label="生成数量"
    onPointerDown={(event) => event.stopPropagation()}>
    <Button type="button" variant="ghost" size="icon-sm" className={styles.step}
      aria-label="减少生成数量" disabled={disabled || editedCount <= MIN_COUNT}
      onClick={() => publish((editedCount - 1) as GenerationCount)}>
      <Minus className="size-3.5" aria-hidden="true" />
    </Button>
    <Input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} role="spinbutton"
      className={styles.input} value={draft} disabled={disabled} aria-label="生成数量"
      aria-valuemin={MIN_COUNT} aria-valuemax={MAX_COUNT} aria-valuenow={value}
      title={`输入 ${MIN_COUNT}–${MAX_COUNT} 的整数`} autoComplete="off"
      onChange={(event) => {
        const next = event.target.value;
        if (!/^\d{0,2}$/.test(next)) return;
        setDraft(next);
        const count = Number(next);
        if (next !== "" && count >= MIN_COUNT && count <= MAX_COUNT && count !== value) {
          onValueChange(count as GenerationCount);
        }
      }}
      onBlur={() => publish(boundedCount(draft))}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          const next = editedCount + (event.key === "ArrowUp" ? 1 : -1);
          publish(boundedCount(String(next)));
        } else if (event.key === "Enter") {
          event.preventDefault();
          publish(boundedCount(draft));
        } else if (event.key === "Escape") {
          event.preventDefault();
          setDraft(String(value));
        }
      }} />
    <Button type="button" variant="ghost" size="icon-sm" className={styles.step}
      aria-label="增加生成数量" disabled={disabled || editedCount >= MAX_COUNT}
      onClick={() => publish((editedCount + 1) as GenerationCount)}>
      <Plus className="size-3.5" aria-hidden="true" />
    </Button>
  </div>;
}
