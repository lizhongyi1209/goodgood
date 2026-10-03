"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import { listAssets } from "@/features/assets/http-asset-boundary";
import { listAssetOrganization } from "@/features/assets/http-asset-organization";
import { imageDownloadFilename } from "@/features/assets/image-download";
import { listReferenceMaterials } from "@/features/references/http-reference-library";
import { privateCanvasImageUrls, privateImageUrls } from "@/shared/private-image-urls.mjs";
import type { CanvasCropImage } from "./canvas-image-crop-image";
import styles from "./canvas-image-placement.module.css";

type Choice = CanvasCropImage & Readonly<{ previewUrl: string; createdAt: string }>;
const choice = (kind: "asset" | "reference", id: string, name: string, createdAt: string): Choice => ({
  nodeId: "", imageId: id, key: `${kind}:${id}`, name, createdAt,
  contentUrl: privateImageUrls(kind, id).contentUrl, previewUrl: privateCanvasImageUrls(kind, id).previewUrl,
});

export function PlacementAssetPicker({ enabled, disabled, onAdd }: Readonly<{
  enabled: boolean; disabled: boolean; onAdd: (image: CanvasCropImage) => void;
}>) {
  const [items, setItems] = useState<readonly Choice[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setLoading(true); setError(null);
    void Promise.allSettled([listAssets(), listReferenceMaterials(), listAssetOrganization(null)]).then(([generated, uploaded, organization]) => {
      if (!active) return;
      const names = new Map(organization.status === "fulfilled" ? organization.value.arrangements.map((item) => [`${item.kind}:${item.id}`, item.displayName] as const) : []);
      const next: Choice[] = [];
      if (generated.status === "fulfilled") for (const job of generated.value) for (const [index, output] of job.outputs.entries()) {
        next.push(choice("asset", output.id, names.get(`generated:${output.id}`) ?? imageDownloadFilename(job.createdAt, index + 1, output.previewUrl), job.createdAt));
      }
      if (uploaded.status === "fulfilled") for (const item of uploaded.value) next.push(choice("reference", item.id, names.get(`reference:${item.id}`) ?? item.name, item.uploadedAt));
      const seen = new Set<string>();
      setItems(next.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).filter((item) => { if (seen.has(item.key)) return false; seen.add(item.key); return true; }));
      if (generated.status === "rejected" || uploaded.status === "rejected" || organization.status === "rejected") setError("部分图片未能读取，请重试。");
      setLoading(false);
    });
    return () => { active = false; };
  }, [enabled, attempt]);
  if (!enabled) return <p className={styles.hint}>当前无法读取资产，可以上传本地图片。</p>;
  const choices = (items ?? []).filter((item) => item.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <div className={styles.assetPicker}>
    <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索图片" aria-label="搜索贴图资产" disabled={disabled} />
    {error && <p className={styles.error} role="alert">{error}<Button variant="ghost" size="sm" disabled={loading || disabled} onClick={() => setAttempt((value) => value + 1)}>重试</Button></p>}
    <div className={styles.assetGrid} aria-busy={loading}>
      {choices.map((item) => <button key={item.key} type="button" className={styles.assetChoice} disabled={disabled} title={item.name} aria-label={`添加贴图：${item.name}`} onClick={() => onAdd(item)}>
        <PrivateObjectImage src={item.previewUrl} alt="" loading="lazy" />
      </button>)}
    </div>
    <p className={styles.hint} role="status">{loading ? "正在读取图片…" : !choices.length ? search.trim() ? "没有匹配的图片。" : "暂无图片，可上传本地图片。" : ""}</p>
  </div>;
}
