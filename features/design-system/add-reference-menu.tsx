"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { ArrowUp, ImagePlus, Link, LoaderCircle, Plus, Upload } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import styles from "./design-system.module.css";

export function AddReferenceMenu({ disabled, accept, onFiles, onLibrary, onLink, recent = [], onRecent }: { disabled?: boolean; accept: string; onFiles: (files: readonly File[]) => void; onLibrary: () => void; onLink?: (url: string) => Promise<void>; recent?: readonly { id: string; name: string; url: string }[]; onRecent?: (id: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const linkId = useId();
  const [open, setOpen] = useState(false), [linkMode, setLinkMode] = useState(false), [url, setUrl] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const action = (icon: ReactNode, label: string, run: () => void) => <button className={styles.menuItem} type="button" onClick={run}>{icon}<span>{label}</span></button>;
  const submitLink = async () => {
    if (!onLink || !url.trim() || busy) return;
    setBusy(true); setError("");
    try { await onLink(url.trim()); setOpen(false); setUrl(""); setLinkMode(false); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "链接无法读取，请检查后重试。"); }
    finally { setBusy(false); }
  };
  return <><input ref={input} hidden type="file" multiple accept={accept} onChange={event => { const files = Array.from(event.target.files ?? []); if (files.length) onFiles(files); event.target.value = ""; }} />
    <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><button className={styles.addReference} type="button" aria-label="添加参考素材" disabled={disabled}><Plus aria-hidden="true" /></button></PopoverTrigger>
      <PopoverContent align="start" className={`${styles.menu} ${styles.addMenu}`} aria-label="添加参考素材">
        {recent.length > 0 && <><span className={styles.menuCaption}>最近使用</span><div className={styles.recent}>{recent.slice(0, 4).map(item => <button key={item.id} type="button" aria-label={`添加 ${item.name}`} onClick={() => { onRecent?.(item.id); setOpen(false); }}><PrivateObjectImage src={item.url} alt={item.name} /></button>)}</div></>}
        <button className={styles.menuItem} type="button" onClick={() => { input.current?.click(); setOpen(false); }}><Upload aria-hidden="true" /><span>上传本地素材</span></button>
        {action(<ImagePlus aria-hidden="true" />, "从资产选择", () => { onLibrary(); setOpen(false); })}
        {onLink && (linkMode ? <div className={styles.linkInput}><label className={styles.visuallyHidden} htmlFor={linkId}>图片公开链接</label><input id={linkId} autoFocus value={url} onChange={event => setUrl(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void submitLink(); } }} placeholder="粘贴图片链接" /><button type="button" aria-label={error ? "重试读取链接" : "读取图片链接"} disabled={busy || !url.trim()} onClick={() => void submitLink()}>{busy ? <LoaderCircle className={styles.spin} /> : <ArrowUp />}</button>{error && <span role="alert">{error}</span>}</div> : action(<Link aria-hidden="true" />, "从链接加载", () => setLinkMode(true)))}
        <p className={styles.menuHint}>也可以直接拖进来或粘贴</p>
      </PopoverContent>
    </Popover></>;
}
