"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import styles from "./canvas-group-node.module.css";

export function CanvasGroupEmojiPicker({ onSelect }: Readonly<{ onSelect: (emoji: string) => void }>) {
  const hostRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef(onSelect);
  useEffect(() => { selectRef.current = onSelect; }, [onSelect]);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    Promise.resolve().then(() => { if (!cancelled) setStatus("loading"); });
    void Promise.all([
      import("emoji-mart"),
      import("@emoji-mart/data/sets/15/native.json"),
      import("@emoji-mart/data/i18n/zh.json"),
    ]).then(([{ Picker }, { default: data }, { default: i18n }]) => {
      if (cancelled || !host) return;
      const picker = new Picker({ data, i18n, locale: "zh", set: "native", theme: "light",
        icons: "outline", dynamicWidth: true, perLine: 9, maxFrequentRows: 2,
        autoFocus: true, previewPosition: "none", skinTonePosition: "search",
        emojiButtonRadius: "8px", emojiButtonSize: 34, emojiSize: 22,
        onEmojiSelect: (emoji: { native: string }) => selectRef.current(emoji.native),
      });
      host.replaceChildren(picker as unknown as HTMLElement);
      setStatus("ready");
    }).catch(() => { if (!cancelled) setStatus("failed"); });
    return () => { cancelled = true; host?.replaceChildren(); };
  }, [attempt]);

  return <>
    <div ref={hostRef} className={styles.emojiPicker} aria-label="emoji 分类与搜索" />
    {status !== "ready" && <div className={styles.emojiStatus} role="status">
      {status === "loading" ? "正在加载 emoji…" : <>
        <span>emoji 暂时无法加载</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAttempt((value) => value + 1)}>重试</Button>
      </>}
    </div>}
  </>;
}
