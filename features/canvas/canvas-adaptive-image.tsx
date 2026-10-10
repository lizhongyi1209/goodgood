"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { useStore } from "@xyflow/react";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import { privateCanvasImageUrls } from "@/shared/private-image-urls.mjs";
import { createCanvasImagePreviewPool } from "./canvas-image-preview-pool";

type Pool = ReturnType<typeof createCanvasImagePreviewPool>;
type Handle = ReturnType<Pool["acquire"]>;
const PreviewContext = createContext<{ identity: string; pool: Pool } | null>(null);

export function CanvasImagePreviewProvider({ ownerKey, children }: { ownerKey: string; children: ReactNode }) {
  const scope = useMemo(() => ({ identity: ownerKey, pool: createCanvasImagePreviewPool() }), [ownerKey]);
  useEffect(() => () => scope.pool.dispose(), [scope]);
  return <PreviewContext.Provider value={scope}>{children}</PreviewContext.Provider>;
}

type Props = Omit<ComponentProps<typeof PrivateObjectImage>, "src" | "ref" | "onError"> & {
  src: string; assetId?: string; kind?: "asset" | "reference"; detailEnabled?: boolean; onError?: () => void;
};
type Preview = { identity: string; url: string };
const DETAIL_MIN_ZOOM = 3;

/** Retain the low-resolution layer during loading and use only bounded derivatives. */
export function CanvasAdaptiveImage({ src, assetId, kind = "asset", detailEnabled = true, onError, ...props }: Props) {
  const scope = useContext(PreviewContext);
  const imageRef = useRef<HTMLImageElement>(null);
  const errorRef = useRef(onError);
  useEffect(() => { errorRef.current = onError; }, [onError]);
  const zoom = useStore((state) => state.transform[2]);
  const [visible, setVisible] = useState(false);
  const [readyIdentity, setReadyIdentity] = useState<string | null>(null);
  const [detail, setDetail] = useState(false);
  const [localPreview, setLocalPreview] = useState<Preview | null>(null);
  const [highPreview, setHighPreview] = useState<Preview | null>(null);
  const local = !assetId && (src.startsWith("blob:") || src.startsWith("data:"));
  const urls = assetId ? privateCanvasImageUrls(kind, assetId) : { previewUrl: src, detailPreviewUrl: src };
  const identity = `${scope?.identity ?? ""}:${assetId ? `${kind}:${assetId}` : src}`;

  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;
    const visibility = new IntersectionObserver(([entry]) => {
      if (entry) setVisible(entry.isIntersecting);
    }, { root: document.getElementById("canvas-workspace-surface"), rootMargin: "128px" });
    visibility.observe(image);
    return () => visibility.disconnect();
  }, []);

  useEffect(() => {
    const desired = detailEnabled && visible && readyIdentity === identity && zoom >= DETAIL_MIN_ZOOM;
    if (!desired) { Promise.resolve().then(() => setDetail(false)); return; }
    const timer = setTimeout(() => setDetail(true), 180);
    return () => clearTimeout(timer);
  }, [detailEnabled, visible, zoom, readyIdentity, identity]);

  useEffect(() => {
    if (!scope || !local || !visible) return;
    let cancelled = false;
    const handle = scope.pool.acquire(src, 512);
    handle.promise.then((url) => { if (!cancelled) setLocalPreview({ identity, url }); })
      .catch(() => { if (!cancelled) errorRef.current?.(); });
    return () => { cancelled = true; handle.release(); };
  }, [scope, local, src, identity, visible]);

  useEffect(() => {
    Promise.resolve().then(() => setHighPreview(null));
    if (!scope || !detail || !visible || !detailEnabled || readyIdentity !== identity || (!assetId && !local)) return;
    let cancelled = false;
    const handle: Handle = scope.pool.acquire(urls.detailPreviewUrl, 2048);
    handle.promise.then((url) => { if (!cancelled) setHighPreview({ identity, url }); }).catch(() => {});
    return () => { cancelled = true; handle.release(); };
  }, [scope, detail, visible, detailEnabled, readyIdentity, identity, assetId, local, urls.detailPreviewUrl]);

  const baseSrc = assetId ? urls.previewUrl : localPreview?.identity === identity ? localPreview.url : undefined;
  const highSrc = zoom >= DETAIL_MIN_ZOOM && detail && visible && detailEnabled && highPreview?.identity === identity ? highPreview.url : undefined;
  return <span style={{ position: "relative", display: "block", width: "100%", height: "100%" }}>
    <PrivateObjectImage {...props} ref={imageRef} src={baseSrc}
      style={{ ...props.style, opacity: highSrc ? 0 : 1 }}
      onLoad={(event) => { setReadyIdentity(identity); props.onLoad?.(event); }} onError={() => errorRef.current?.()} />
    {highSrc && <PrivateObjectImage {...props} alt="" src={highSrc}
      style={{ ...props.style, position: "absolute", inset: 0, pointerEvents: "none" }}
      onLoad={undefined} onError={() => setHighPreview(null)} />}
  </span>;
}
