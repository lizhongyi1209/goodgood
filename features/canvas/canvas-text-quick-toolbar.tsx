"use client";
import { useContext, useRef, useState } from "react";
import { BookmarkPlus, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPrivateTextAsset } from "@/features/assets/http-text-assets";
import { textAssetDefaultName, textAssetInputError, type TextAssetInput } from "@/shared/contracts/text-assets.mjs";
import { CanvasTextGenerationContext } from "./canvas-text-generation-context";
import type { CanvasTextNodeData } from "./canvas-text-node";
import styles from "./canvas-text-node.module.css";

export function CanvasTextQuickToolbar({ data, nodeId, disabled = false }: Readonly<{ data: CanvasTextNodeData; nodeId: string; disabled?: boolean }>) {
  const context = useContext(CanvasTextGenerationContext);
  const [snapshot, setSnapshot] = useState<TextAssetInput | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const attempted = useRef(false);
  const canSave = !disabled && context.enabled && Boolean(data.text.trim() && data.markdown.trim());
  async function save() {
    if (!snapshot || pending.current || !context.enabled || disabled) return;
    const input = { ...snapshot, name: name.trim() };
    const invalid = textAssetInputError(input);
    if (invalid) { setError(invalid); return; }
    pending.current = true; attempted.current = true; setSaving(true); setError(null);
    try { await createPrivateTextAsset(input, context.workspaceId); setSnapshot(null); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "模板保存失败，请重试。"); }
    finally { pending.current = false; setSaving(false); }
  }
  return <>
    <div className={`${styles.toolbar} nodrag nopan nowheel`} role="toolbar" aria-label="文本快捷功能" data-canvas-text-toolbar={nodeId}>
      <Button type="button" variant="ghost" size="icon-xs" aria-label="设置模板" title="设置模板" disabled={!canSave}
        onMouseDown={(event) => event.preventDefault()} onClick={() => {
          const title = textAssetDefaultName(data.text); attempted.current = false;
          setSnapshot({ id: crypto.randomUUID(), name: title, markdown: data.markdown, text: data.text });
          setName(title); setError(null);
        }}><BookmarkPlus size={14} className="size-3.5" aria-hidden="true" /></Button>
    </div>
    <Dialog open={Boolean(snapshot)} onOpenChange={(open) => { if (!open && !pending.current) setSnapshot(null); }}>
      <DialogContent className={styles.templateDialog} onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
        <DialogHeader><DialogTitle>保存提示词模板</DialogTitle><DialogDescription className="sr-only">命名并保存当前提示词内容。</DialogDescription></DialogHeader>
        <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <Label htmlFor={`text-template-name-${nodeId}`}>模板名称</Label>
          <Input id={`text-template-name-${nodeId}`} autoFocus maxLength={255} value={name} disabled={saving} onChange={(event) => {
            setName(event.target.value); setError(null);
            if (attempted.current) { setSnapshot((current) => current && ({ ...current, id: crypto.randomUUID() })); attempted.current = false; }
          }} />
          {error && <p className={styles.templateError} role="alert">{error}</p>}
          <div className={styles.templateActions}><Button type="button" variant="secondary" disabled={saving} onClick={() => setSnapshot(null)}>取消</Button>
            <Button type="submit" disabled={saving || !name.trim() || !context.enabled || disabled}>{saving ? <><LoaderCircle size={14} />保存中…</> : "保存"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
