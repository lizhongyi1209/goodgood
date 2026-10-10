"use client";
import { useEffect, useState } from "react";
import { Film, LoaderCircle, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import { listAssets } from "@/features/assets/http-asset-boundary";
import { listReferenceMaterials } from "@/features/references/http-reference-library";
import { listPrivateVideoMaterials } from "@/features/creation/http-video-materials";
import { privateImageUrls } from "@/shared/private-image-urls.mjs";
import type { VideoMaterial } from "@/shared/contracts/video-generation.mjs";
import styles from "./canvas-video-generator-node.module.css";
export type VideoPickerMaterial = VideoMaterial & { previewUrl: string };
export function CanvasVideoMaterialPicker({ open, onOpenChange, workspaceId, ownerKey, onSelect, selectedKeys }: Readonly<{
  open: boolean; onOpenChange: (open: boolean) => void; workspaceId: string | null; ownerKey: string;
  onSelect: (material: VideoPickerMaterial) => void; selectedKeys: readonly string[];
}>) {
  const [items, setItems] = useState<VideoPickerMaterial[]>([]); const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); const [revision, setRevision] = useState(0); const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"image" | "video">("image");
  useEffect(() => {
    if (!open) return;
    let live = true; const controller = new AbortController(); Promise.resolve().then(() => { if (live) { setLoading(true); setError(""); setItems([]); } });
    void Promise.allSettled([listReferenceMaterials(workspaceId), listAssets(workspaceId), listPrivateVideoMaterials(workspaceId, controller.signal)]).then((results) => {
      if (!live) return;
      const next: VideoPickerMaterial[] = [];
      const [references, batches, videos] = results;
      if (references.status === "fulfilled") next.push(...references.value.map((item) => ({ kind: "image" as const, assetKind: "reference" as const, assetId: item.id, name: item.name, previewUrl: privateImageUrls("reference", item.id).previewUrl })));
      if (batches.status === "fulfilled") next.push(...batches.value.flatMap((batch) => batch.outputs.map((item) => ({ kind: "image" as const, assetKind: "generated" as const, assetId: item.id, name: `图片生成 ${item.id.slice(0, 6)}`, previewUrl: privateImageUrls("asset", item.id).previewUrl }))));
      if (videos.status === "fulfilled") next.push(...videos.value.map((item) => ({ kind: "video" as const, assetKind: "video" as const, assetId: item.id, name: item.name, previewUrl: item.url })));
      setItems(next); setLoading(false);
      if (results.some((result) => result.status === "rejected")) setError("部分素材暂时无法加载。");
    });
    return () => { live = false; controller.abort(); };
  }, [open, ownerKey, workspaceId, revision]);
  const visible = items.filter((item) => item.kind === kind && item.name.toLowerCase().includes(search.toLowerCase()));
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className={`${styles.picker} nodrag nopan nowheel`}>
      <DialogHeader><DialogTitle>选择素材</DialogTitle><DialogDescription className="sr-only">从资产中选择视频生成需要的图片或视频。</DialogDescription></DialogHeader>
      <div className={styles.pickerTools}><div className={styles.pickerTabs}>
        {(["image", "video"] as const).map((value) => <button type="button" key={value} aria-pressed={kind === value} onClick={() => setKind(value)}>{value === "image" ? "图片" : "视频"}</button>)}
      </div><label className={styles.search}><Search size={14} /><input aria-label="搜索素材" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索素材" /></label></div>
      {error && <div className={styles.notice} role="alert">{error}<button type="button" onClick={() => setRevision((value) => value + 1)}>重试加载</button></div>}
      <div className={styles.pickerGrid} aria-busy={loading}>
        {loading ? <div className={styles.pickerEmpty}><LoaderCircle size={20} className={styles.spinner} />正在加载素材</div>
          : !visible.length ? <div className={styles.pickerEmpty}>{search ? "没有匹配的素材" : "暂无素材，可从本地上传"}</div>
          : visible.map((item) => <button type="button" key={`${item.assetKind}:${item.assetId}`} disabled={selectedKeys.includes(`${item.assetKind}:${item.assetId}`)}
            className={styles.pickerItem} onClick={() => { onSelect(item); onOpenChange(false); }} aria-label={`选择 ${item.name}`}>
            <span>{item.kind === "image" ? <PrivateObjectImage src={item.previewUrl} alt="" loading="lazy" /> : <><video src={item.previewUrl} muted playsInline preload="metadata" /><Film size={18} className={styles.pickerVideoIcon} /></>}</span>
            <span>{item.name}</span>
          </button>)}
      </div>
      <Button type="button" variant="ghost" className={styles.pickerClose} onClick={() => onOpenChange(false)}>取消</Button>
    </DialogContent>
  </Dialog>;
}
