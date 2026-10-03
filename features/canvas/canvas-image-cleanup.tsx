"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useReactFlow } from "@xyflow/react";
import { toast } from "sonner";
import { ImageCleanupBoundaryError, removeImageAiMetadata } from "@/features/assets/http-image-cleanup";
import { IMAGE_CLEANUP_CREDIT_COST, type ImageCleanupInput, type ImageCleanupResult } from "@/shared/contracts/image-cleanup.mjs";
import { canvasCropImageForNode, type CanvasCropImage } from "./canvas-image-crop-image";
import type { CanvasNode } from "./canvas-workspace";

export type CanvasImageCleanupCommit = Readonly<{ image: CanvasCropImage; pageId: string; result: ImageCleanupResult }>;
const Context = createContext<{ enabled: boolean; pendingKey: string | null; remove: (image: CanvasCropImage) => void }>({ enabled: false, pendingKey: null, remove: () => {} });
export const useCanvasImageCleanup = () => useContext(Context);
// Retain uncertain submissions across page changes and reloads. Never reuse a key
// across identities, workspaces, sources, or changed input. No image bytes stored.
const recovery = new Map<string, ImageCleanupInput>();
function recover(key: string): ImageCleanupInput | undefined {
  try {
    const stored = sessionStorage.getItem(key);
    if (stored) return JSON.parse(stored) as ImageCleanupInput;
  } catch { /* In-memory recovery still works if browser storage is unavailable. */ }
  return recovery.get(key);
}
function remember(key: string, input: ImageCleanupInput | null) {
  if (input) recovery.set(key, input); else recovery.delete(key);
  try { if (input) sessionStorage.setItem(key, JSON.stringify(input)); else sessionStorage.removeItem(key); } catch { /* Best effort. */ }
}
export function CanvasImageCleanupProvider({ children, enabled, ownerKey, workspaceId, pageId, beforeRemove, onCommit, onChanged }: Readonly<{
  children: ReactNode; enabled: boolean; ownerKey: string; workspaceId: string | null; pageId: string;
  beforeRemove: () => string; onCommit: (commit: CanvasImageCleanupCommit) => boolean; onChanged: () => void;
}>) {
  const flow = useReactFlow<CanvasNode>();
  const identity = `${ownerKey}:${workspaceId ?? "personal"}:${pageId}:${enabled}`;
  const identityRef = useRef(identity); identityRef.current = identity;
  const activeRef = useRef<AbortController | null>(null);
  const toastRef = useRef<string | number | null>(null);
  const [pending, setPending] = useState<{ identity: string; key: string } | null>(null);
  const commitRef = useRef(onCommit); commitRef.current = onCommit;
  const changedRef = useRef(onChanged); changedRef.current = onChanged;
  useEffect(() => {
    setPending(null);
    return () => {
      activeRef.current?.abort(); activeRef.current = null;
      if (toastRef.current !== null) { toast.dismiss(toastRef.current); toastRef.current = null; }
    };
  }, [identity]);

  const remove = async (image: CanvasCropImage, retry?: ImageCleanupInput) => {
    if (!enabled || !ownerKey || activeRef.current || identityRef.current !== identity) return;
    // Freeze the clicked batch slot, never substitute another output or preview.
    const current = canvasCropImageForNode(flow.getNode(image.nodeId), image.imageId);
    if (!current || current.key !== image.key || current.imageId !== image.imageId) {
      toast.error("原图已变化，请重新选择图片。"); return;
    }
    const sourceKind = image.key.startsWith("asset:") ? "asset" : image.key.startsWith("reference:") ? "reference" : null;
    if (!sourceKind) { toast.error("请等待原图上传完成后再使用去除AI。"); return; }
    const storageKey = `goodgood:image-cleanup:v1:${ownerKey}:${workspaceId ?? "personal"}:${pageId}:${image.key}`;
    const recovered = retry ?? recover(storageKey);
    let input: ImageCleanupInput;
    try {
      // An uncertain operation keeps its original project/name even if the node
      // was subsequently renamed. A fresh click gets a new charged operation.
      input = recovered?.sourceId === image.imageId && recovered.sourceKind === sourceKind
        ? recovered : { requestId: crypto.randomUUID(), sourceId: image.imageId, sourceKind, name: image.name, projectId: beforeRemove() };
    } catch (error) { toast.error(error instanceof Error ? error.message : "项目尚未同步，请稍后重试。"); return; }
    const controller = new AbortController(); activeRef.current = controller;
    remember(storageKey, input); setPending({ identity, key: image.key });
    if (toastRef.current !== null) toast.dismiss(toastRef.current);
    const toastId = toast.loading("正在清理图片元数据…"); toastRef.current = toastId;
    try {
      const result = await removeImageAiMetadata(input, workspaceId, controller.signal);
      if (identityRef.current !== identity) controller.abort();
      controller.signal.throwIfAborted();
      const inserted = commitRef.current({ image, pageId, result });
      changedRef.current(); remember(storageKey, null);
      toast.success(inserted ? `已生成副本，扣除${IMAGE_CLEANUP_CREDIT_COST}积分` : `副本已保存到资产，扣除${IMAGE_CLEANUP_CREDIT_COST}积分`, { id: toastId, duration: 4500 });
    } catch (cause) {
      if (cause instanceof ImageCleanupBoundaryError && !cause.retryable) remember(storageKey, null);
      if (!controller.signal.aborted && identityRef.current === identity) {
        changedRef.current();
        toast.error(cause instanceof Error && !(cause instanceof TypeError) ? cause.message : "连接中断，请重试确认本次结果；同一操作不会重复扣费。", {
          id: toastId, duration: 8000, action: { label: "重试", onClick: () => void remove(image, input) },
        });
      }
    } finally {
      if (activeRef.current === controller) { activeRef.current = null; setPending(null); }
    }
  };
  return <Context.Provider value={{ enabled, pendingKey: pending?.identity === identity ? pending.key : null, remove: (image) => { void remove(image); } }}>{children}</Context.Provider>;
}
