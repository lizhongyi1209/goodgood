"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { readPrivateTextAsset, type TextAsset } from "./http-text-assets";
import styles from "./text-asset-preview.module.css";

export function TextAssetThumbnail({ text }: Readonly<{ text: string }>) {
  return <span className={styles.thumbnail} aria-hidden="true"><span>{text}</span></span>;
}
export function TextAssetViewer({ asset, workspaceId, onClose }: Readonly<{
  asset: Readonly<{ id: string; name: string }> | null; workspaceId: string | null; onClose: () => void;
}>) {
  const assetId = asset?.id ?? null;
  const key = `${workspaceId ?? "personal"}:${assetId ?? ""}`;
  const [read, setRead] = useState<{ key: string; content: TextAsset | null; error: string | null }>({ key: "", content: null, error: null });
  const { content, error } = read.key === key ? read : { content: null, error: null };
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    setRead({ key, content: null, error: null });
    if (!assetId) return;
    const controller = new AbortController();
    void readPrivateTextAsset(assetId, workspaceId, controller.signal).then((value) => {
      if (!controller.signal.aborted) setRead({ key, content: value, error: null });
    }).catch((failure) => { if (!controller.signal.aborted) setRead({ key, content: null, error: failure instanceof Error ? failure.message : "文本模板读取失败。" }); });
    return () => controller.abort();
  }, [key, assetId, workspaceId, revision]);
  return <Dialog open={Boolean(asset)} onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className={styles.dialog}><DialogHeader><DialogTitle>{asset?.name ?? "文本模板"}</DialogTitle><DialogDescription>已保存的文本模板</DialogDescription></DialogHeader>
      {error ? <div role="alert"><p>{error}</p><Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>重试</Button></div>
        : content ? <pre className={styles.content}>{content.text}</pre> : <p role="status">正在读取文本…</p>}
    </DialogContent>
  </Dialog>;
}
