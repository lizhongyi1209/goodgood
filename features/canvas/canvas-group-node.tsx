"use client";

import { useRef, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { Group, SmilePlus, Ungroup } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CANVAS_GROUP_EMOJIS, CANVAS_GROUP_NAME_LIMIT, ungroupCanvasNodes } from "./canvas-groups.mjs";
import { useCanvasGroupActions } from "./canvas-group-context";
import type { CanvasNode } from "./canvas-workspace";
import styles from "./canvas-group-node.module.css";

export type CanvasGroupNodeData = { name: string; emoji?: string };
export type CanvasGroupNodeType = Node<CanvasGroupNodeData, "group">;

export function CanvasGroupNode({ id, data, selected }: NodeProps<CanvasGroupNodeType>) {
  const flow = useReactFlow<CanvasNode>();
  const actions = useCanvasGroupActions();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(data.name);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const titleRef = useRef<HTMLButtonElement>(null);
  const cancelledRef = useRef(false);
  const update = (patch: Partial<CanvasGroupNodeData>) => {
    actions.onBeforeGraphEdit();
    flow.updateNodeData(id, patch);
    actions.onProjectGraphChange(true);
  };
  const startEditing = () => { cancelledRef.current = false; setName(data.name); setEditing(true); };
  const finishEditing = () => {
    const next = name.trim();
    if (!cancelledRef.current && next && next !== data.name) update({ name: next });
    cancelledRef.current = true;
    setEditing(false);
  };

  return <div className={styles.frame} data-selected={selected || undefined}>
    <div className={`${styles.header} canvas-group-drag-handle`}>
      <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon-sm" className={`${styles.emojiTrigger} nodrag nopan nokey`}
            aria-label={data.emoji ? "修改组 emoji" : "添加组 emoji"} title={data.emoji ? "修改 emoji" : "添加 emoji"}
            onDoubleClick={(event) => event.stopPropagation()}>
            {data.emoji ? <span className={styles.emoji}>{data.emoji}</span> : <SmilePlus size={16} aria-hidden="true" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={8} className={`${styles.emojiMenu} nodrag nopan nowheel nokey`} aria-label="选择组 emoji">
          <div className={styles.emojiGrid}>
            {CANVAS_GROUP_EMOJIS.map(({ emoji, label }) => <Button key={emoji} type="button" variant="ghost" size="icon-sm"
              aria-label={label} aria-pressed={data.emoji === emoji} title={label}
              onClick={() => { if (data.emoji !== emoji) update({ emoji }); setEmojiOpen(false); }}>
              <span className={styles.emoji}>{emoji}</span>
            </Button>)}
          </div>
          {data.emoji && <Button type="button" variant="ghost" className={styles.clearEmoji}
            onClick={() => { update({ emoji: undefined }); setEmojiOpen(false); }}>移除 emoji</Button>}
        </PopoverContent>
      </Popover>
      {editing ? <Input autoFocus value={name} maxLength={CANVAS_GROUP_NAME_LIMIT} aria-label="组名称"
        className={`${styles.nameInput} nodrag nopan nokey`} onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setName(event.target.value)} onBlur={finishEditing}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Enter") { event.preventDefault(); finishEditing(); requestAnimationFrame(() => titleRef.current?.focus()); }
          if (event.key === "Escape") { event.preventDefault(); cancelledRef.current = true; setEditing(false); requestAnimationFrame(() => titleRef.current?.focus()); }
        }} /> : <button ref={titleRef} type="button" className={`${styles.name} canvas-group-drag-handle`}
          title="拖动移动整组，双击修改名称" aria-label={`组 ${data.name}，双击或按 Enter 修改名称`}
          onDoubleClick={(event) => { event.stopPropagation(); startEditing(); }}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === "F2") { event.preventDefault(); event.stopPropagation(); startEditing(); } }}>
          {data.name}
        </button>}
      <span className={styles.groupMark} aria-hidden="true"><Group size={14} /></span>
      <Button type="button" variant="ghost" size="icon-sm" className={`${styles.ungroup} nodrag nopan nokey`}
        aria-label="解散组" title="解散组，保留节点" onClick={() => {
          actions.onBeforeGraphEdit(); flow.setNodes((nodes) => ungroupCanvasNodes(nodes, [id])); actions.onProjectGraphChange(true);
        }}><Ungroup size={15} aria-hidden="true" /></Button>
    </div>
  </div>;
}
