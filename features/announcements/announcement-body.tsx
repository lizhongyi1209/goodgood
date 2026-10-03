import { useMemo, type ReactNode } from "react";
import { MarkdownManager } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import type { JSONContent } from "@tiptap/core";
import styles from "./announcements.module.css";

const markdown = new MarkdownManager({ extensions: [StarterKit] });
function safeLink(value: unknown) {
  if (typeof value !== "string") return null;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : null; } catch { return null; }
}
function renderNode(node: JSONContent, key: string): ReactNode {
  const children = node.content?.map((child, index) => renderNode(child, `${key}-${index}`));
  if (node.type === "text") {
    let value: ReactNode = node.text;
    for (const mark of node.marks ?? []) {
      if (mark.type === "bold") value = <strong>{value}</strong>;
      if (mark.type === "italic") value = <em>{value}</em>;
      if (mark.type === "strike") value = <s>{value}</s>;
      if (mark.type === "code") value = <code>{value}</code>;
      if (mark.type === "link") { const href = safeLink(mark.attrs?.href); if (href) value = <a href={href} target="_blank" rel="noopener noreferrer">{value}</a>; }
    }
    return <span key={key}>{value}</span>;
  }
  switch (node.type) {
    case "doc": return children;
    case "paragraph": return <p key={key}>{children}</p>;
    case "heading": return node.attrs?.level === 1 ? <h2 key={key}>{children}</h2> : <h3 key={key}>{children}</h3>;
    case "bulletList": return <ul key={key}>{children}</ul>;
    case "orderedList": return <ol key={key} start={Number(node.attrs?.start) || 1}>{children}</ol>;
    case "listItem": return <li key={key}>{children}</li>;
    case "blockquote": return <blockquote key={key}>{children}</blockquote>;
    case "codeBlock": return <pre key={key}><code>{children}</code></pre>;
    case "hardBreak": return <br key={key} />;
    case "horizontalRule": return <hr key={key} />;
    default: return <span key={key}>{children ?? node.text ?? node.attrs?.alt ?? ""}</span>;
  }
}
export function AnnouncementBody({ body }: { body: string }) {
  const content = useMemo(() => {
    try { return renderNode(markdown.parse(body), "body"); }
    catch { return <p>{body}</p>; }
  }, [body]);
  return <div className={styles.body}>{content}</div>;
}
