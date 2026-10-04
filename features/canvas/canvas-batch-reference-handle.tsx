"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Handle, Position, useReactFlow, useStoreApi, useUpdateNodeInternals } from "@xyflow/react";
import { CANVAS_BATCH_REFERENCE_HANDLE } from "./canvas-reference-sources.mjs";
import type { CanvasNode } from "./canvas-workspace";
import styles from "./canvas-workspace.module.css";

export type CanvasReferenceSelectionGeometry = {
  sourceId: string; memberIds: string[]; x: number; y: number;
};
const Context = createContext({ selection: null as CanvasReferenceSelectionGeometry | null,
  publish: (_selection: CanvasReferenceSelectionGeometry | null) => {} });

export function CanvasBatchReferenceProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<CanvasReferenceSelectionGeometry | null>(null);
  const publish = useCallback((next: CanvasReferenceSelectionGeometry | null) => {
    setSelection((previous) => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
  }, []);
  const value = useMemo(() => ({ selection, publish }), [selection, publish]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useCanvasReferenceSelection = () => useContext(Context);

export function CanvasReferenceConnectionKeyboard({ onCancel }: { onCancel: () => void }) {
  const store = useStoreApi<CanvasNode>();
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      const state = store.getState();
      if (event.key !== "Escape" || !state.connection.inProgress && !state.connectionClickStartHandle) return;
      event.preventDefault(); event.stopPropagation();
      state.cancelConnection(); store.setState({ connectionClickStartHandle: null }); onCancel();
    };
    window.addEventListener("keydown", cancel, true);
    return () => window.removeEventListener("keydown", cancel, true);
  }, [store, onCancel]);
  return null;
}

/** Render in an actual image node so native handle measurement and dragging stay intact. */
export function CanvasBatchReferenceHandle({ nodeId }: { nodeId: string }) {
  const { selection } = useCanvasReferenceSelection();
  const flow = useReactFlow<CanvasNode>();
  const update = useUpdateNodeInternals();
  const active = selection?.sourceId === nodeId ? selection : null;
  const isActive = Boolean(active);
  useEffect(() => { update(nodeId); }, [nodeId, active?.x, active?.y, isActive, update]);
  const absolute = flow.getInternalNode(nodeId)?.internals.positionAbsolute;
  if (!active || !absolute) return null;
  const label = `连接${active.memberIds.length}张参考图`;
  return <Handle type="source" id={CANVAS_BATCH_REFERENCE_HANDLE} position={Position.Right}
    className={`${styles.referenceOutputHandle} ${styles.batchReferenceHandle} nodrag nopan`}
    style={{ left: active.x - absolute.x, top: active.y - absolute.y, right: "auto", transform: "translate(-50%, -50%)" }}
    role="button" tabIndex={0} aria-label={label} title={label} isConnectableEnd={false}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); event.currentTarget.click(); }
    }} />;
}
