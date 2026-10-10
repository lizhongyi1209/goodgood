"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImageDownloadError, originalImageDownloadFilename, saveImageBlobToLocal } from "@/features/assets/image-download";
import { privateImageUrls } from "@/shared/private-image-urls.mjs";
import { canvasCropImageForNode, readCanvasCropImageBlob, type CanvasCropImage } from "./canvas-image-crop-image";
import type { CanvasLibraryAsset } from "./canvas-asset-panel";
import type { CanvasNode } from "./canvas-workspace";

export function canvasImageDownloadForNode(node: CanvasNode | undefined, imageId?: string): CanvasCropImage | null {
  if (node?.type === "sourceImage") {
    if (node.data.assetId && !node.data.uploadState) {
      const kind = node.data.assetKind === "generated" ? "asset" : "reference";
      return { nodeId: node.id, imageId: node.data.assetId, key: `${kind}:${node.data.assetId}`, name: node.data.name, contentUrl: privateImageUrls(kind, node.data.assetId).contentUrl };
    }
    // These Blob URLs point to the retained original File, including cleaned
    // copies awaiting upload. Never substitute a remote display derivative.
    const localUrl = [node.data.localPreviewUrl, node.data.previewUrl].find((url) => url?.startsWith("blob:"));
    return localUrl ? { nodeId: node.id, imageId: node.id, key: `local:${node.id}`, name: node.data.name, contentUrl: localUrl } : null;
  }
  // A generator can hold several output slots; require the right-clicked one.
  if (node?.type === "imageGenerator" && !imageId) return null;
  return canvasCropImageForNode(node, imageId);
}

export function canvasImageDownloadForAsset(item: CanvasLibraryAsset): CanvasCropImage | null {
  if (item.media !== "image" || !["generated", "reference"].includes(item.kind)) return null;
  const kind = item.kind === "generated" ? "asset" : "reference";
  return { nodeId: "", imageId: item.id, key: `${kind}:${item.id}`, name: item.name, contentUrl: privateImageUrls(kind, item.id).contentUrl };
}

export async function readCanvasDownloadBlob(image: CanvasCropImage, signal: AbortSignal, dependencies: Readonly<{
  readOriginal?: typeof readCanvasCropImageBlob; fetchImplementation?: typeof fetch;
}> = {}): Promise<Blob> {
  signal.throwIfAborted();
  if (!image.key.startsWith("local:")) return (dependencies.readOriginal ?? readCanvasCropImageBlob)(image, signal);
  if (!image.contentUrl.startsWith("blob:")) throw new Error("本地原图暂时不可用，请重新导入图片。");
  const response = await (dependencies.fetchImplementation ?? fetch)(image.contentUrl, { signal });
  if (!response.ok) throw new Error("本地原图读取失败，请重试。");
  const blob = await response.blob();
  signal.throwIfAborted();
  if (!blob.size) throw new Error("原图内容为空，请重试。");
  return blob;
}

export function useCanvasImageDownload(scopeKey: string, enabled: boolean) {
  const identity = `${scopeKey}:${enabled}`;
  const identityRef = useRef(identity);
  useEffect(() => { identityRef.current = identity; }, [identity]);
  const activeRef = useRef<AbortController | null>(null);
  const toastRef = useRef<string | number | null>(null);
  const [pending, setPending] = useState<Readonly<{ identity: string; key: string }> | null>(null);
  useEffect(() => {
    Promise.resolve().then(() => setPending(null));
    return () => {
      activeRef.current?.abort(); activeRef.current = null;
      if (toastRef.current !== null) { toast.dismiss(toastRef.current); toastRef.current = null; }
    };
  }, [identity]);
  const download = async (image: CanvasCropImage) => {
    if (!enabled || identityRef.current !== identity || activeRef.current) return;
    const controller = new AbortController();
    activeRef.current = controller;
    setPending({ identity, key: image.key });
    if (toastRef.current !== null) toast.dismiss(toastRef.current);
    const toastId = toast.loading("正在下载原图…"); toastRef.current = toastId;
    try {
      const blob = await readCanvasDownloadBlob(image, controller.signal);
      if (identityRef.current !== identity) controller.abort();
      controller.signal.throwIfAborted();
      await saveImageBlobToLocal(blob, originalImageDownloadFilename(image.name, blob.type));
      if (!controller.signal.aborted) toast.success("图片下载已开始", { id: toastId, duration: 2200 });
    } catch (cause) {
      if (!controller.signal.aborted && identityRef.current === identity) {
        toast.error(cause instanceof Error && !(cause instanceof ImageDownloadError) && !(cause instanceof TypeError) ? cause.message : "图片下载失败，请重试。", {
          id: toastId, duration: 6000, action: { label: "重试", onClick: () => void download(image) },
        });
      }
    } finally {
      if (activeRef.current === controller) { activeRef.current = null; setPending(null); }
    }
  };
  return { download, pendingKey: pending?.identity === identity ? pending.key : null };
}
