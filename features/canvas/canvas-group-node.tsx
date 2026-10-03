"use client";

import { useCallback, useRef, useState, type KeyboardEvent } from "react";
import { NodeResizeControl, useReactFlow, useStoreApi, type Node, type NodeProps, type OnResizeEnd } from "@xyflow/react";
import { Group, Scan, SmilePlus, Ungroup } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CANVAS_GROUP_NAME_LIMIT, canvasGroupContentBounds, canvasGroupFrameContainsContent,
  fitCanvasGroups, resizeCanvasGroup, ungroupCanvasNodes } from "./canvas-groups.mjs";
import { useCanvasGroupActions } from "./canvas-group-context";
import { CanvasGroupEmojiPicker } from "./canvas-group-emoji-picker";
import { measureCanvasGroupFootprints } from "./canvas-group-footprints";
import type { CanvasNode } from "./canvas-workspace";
import styles from "./canvas-group-node.module.css";

export type CanvasGroupNodeData = { name: string; emoji?: string; sizing?: "auto" | "manual" };
export type CanvasGroupNodeType = Node<CanvasGroupNodeData, "group">;
const corners = [
  { position: "top-left", label: "左上角" }, { position: "top-right", label: "右上角" },
  { position: "bottom-left", label: "左下角" }, { position: "bottom-right", label: "右下角" },
] as const;

export function CanvasGroupNode({ id, data, selected }: NodeProps<CanvasGroupNodeType>) {
  const flow = useReactFlow<CanvasNode>();
  const store = useStoreApi<CanvasNode>();
  const actions = useCanvasGroupActions();
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const resizeContentRef = useRef<ReturnType<typeof canvasGroupContentBounds>>(null);
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

  // Native resize installs a drag listener. Stable callbacks keep the gesture
  // alive across dimension/data changes and the parent's snapshot callbacks.
  const startResize = useCallback(() => {
    const state = store.getState();
    resizeContentRef.current = canvasGroupContentBounds(state.nodes, id, measureCanvasGroupFootprints(state));
    actionsRef.current.onBeforeGraphEdit();
    flow.updateNodeData(id, { sizing: "manual" });
  }, [flow, id, store]);
  const allowResize = useCallback((_event: unknown, frame: { x: number; y: number; width: number; height: number }) =>
    canvasGroupFrameContainsContent(frame, resizeContentRef.current), []);
  const finishResize = useCallback<OnResizeEnd>((_event, frame) => {
    const width = Math.round(frame.width); const height = Math.round(frame.height);
    flow.setNodes((nodes) => nodes.map((node) => node.id === id
      ? { ...node, width, height, style: { ...node.style, width, height } } : node));
    actionsRef.current.onProjectGraphChange(true);
  }, [flow, id]);
  const resizeWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>, corner: string) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    const state = store.getState(); const group = flow.getNode(id);
    if (!group) return;
    const step = event.shiftKey ? 50 : 10;
    const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
    const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
    const left = corner.endsWith("left"); const top = corner.startsWith("top");
    const next = resizeCanvasGroup(state.nodes, id, {
      x: group.position.x + (left ? dx : 0), y: group.position.y + (top ? dy : 0),
      width: Number(group.width ?? group.style?.width) + (left ? -dx : dx),
      height: Number(group.height ?? group.style?.height) + (top ? -dy : dy),
    }, measureCanvasGroupFootprints(state));
    if (next === state.nodes) return;
    actions.onBeforeGraphEdit(); flow.setNodes(next); actions.onProjectGraphChange(true);
  };

  return <div className={styles.frame} data-selected={selected || undefined}>
    {["top", "right", "bottom", "left"].map((edge) => <div key={edge} aria-hidden="true"
      className={`${styles.frameEdge} ${styles[edge]} canvas-group-drag-handle`} title="拖动边框移动整组" />)}
    {selected && corners.map(({ position, label }) => <NodeResizeControl key={position} position={position}
      minWidth={200} minHeight={120} className={styles.resizeControl}
      onResizeStart={startResize} onResizeEnd={finishResize} shouldResize={allowResize}>
      <button type="button" className={`${styles.resizeHandle} nopan nokey`} aria-label={`调整组框${label}，方向键调整大小`}
        title="拖动调整组框大小" onKeyDown={(event) => resizeWithKeyboard(event, position)} />
    </NodeResizeControl>)}
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
          <CanvasGroupEmojiPicker onSelect={(emoji) => { if (data.emoji !== emoji) update({ emoji }); setEmojiOpen(false); }} />
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
      {data.sizing === "manual" && <Button type="button" variant="ghost" size="icon-sm" className={`${styles.fitContent} nodrag nopan nokey`}
        aria-label="组框适应内容" title="适应内容，恢复自动调整" onClick={() => {
          const footprints = measureCanvasGroupFootprints(store.getState());
          actions.onBeforeGraphEdit();
          flow.setNodes((nodes) => fitCanvasGroups(nodes.map((node) => node.id === id && node.type === "group"
            ? { ...node, data: { ...node.data, sizing: "auto" } } : node), footprints));
          actions.onProjectGraphChange(true);
        }}><Scan size={15} aria-hidden="true" /></Button>}
      <Button type="button" variant="ghost" size="icon-sm" className={`${styles.ungroup} nodrag nopan nokey`}
        aria-label="解散组" title="解散组，保留节点" onClick={() => {
          actions.onBeforeGraphEdit(); flow.setNodes((nodes) => ungroupCanvasNodes(nodes, [id])); actions.onProjectGraphChange(true);
        }}><Ungroup size={15} aria-hidden="true" /></Button>
    </div>
  </div>;
}
