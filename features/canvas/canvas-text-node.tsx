"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Extension, type Editor } from "@tiptap/core";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { Plugin } from "@tiptap/pm/state";
import { Handle, NodeResizeControl, NodeToolbar, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { Bold, Code, FileText, Heading1, Heading2, Heading3, Italic, List, ListOrdered, Pilcrow, Quote, Redo2, Strikethrough, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CanvasNode, CanvasTextNodeType } from "./canvas-workspace";
import { CANVAS_MARKDOWN_MAX_LENGTH, CANVAS_TEXT_MAX_LENGTH, canvasTextFontSize } from "./canvas-text-input.mjs";
import styles from "./canvas-text-node.module.css";
import workspaceStyles from "./canvas-workspace.module.css";

export type CanvasTextNodeData = { markdown: string; text: string } & Record<string, unknown>;

export function CanvasTextNode({ id, data, selected, width, height }: NodeProps<CanvasTextNodeType>) {
  const flow = useReactFlow<CanvasNode>();
  const [error, setError] = useState("");
  const editorRef = useRef<Editor | null>(null);
  const limit = useMemo(() => Extension.create({
    name: "canvasTextLimit",
    addProseMirrorPlugins() {
      return [new Plugin({ filterTransaction: (transaction) => {
        if (!transaction.docChanged) return true;
        const tooLong = transaction.doc.textBetween(0, transaction.doc.content.size, "\n").length > CANVAS_TEXT_MAX_LENGTH ||
          (this.editor.markdown?.serialize(transaction.doc.toJSON()).length ?? 0) > CANVAS_MARKDOWN_MAX_LENGTH;
        setError(tooLong ? `文本最多 ${CANVAS_TEXT_MAX_LENGTH} 个字符。` : "");
        return !tooLong;
      } })];
    },
  }), []);
  const editor = useEditor({
    extensions: [StarterKit.configure({ link: { openOnClick: false } }), Markdown, limit],
    content: data.markdown,
    contentType: "markdown",
    immediatelyRender: false,
    editorProps: {
      attributes: { "aria-label": "文本编辑器内容", "aria-multiline": "true", role: "textbox", spellcheck: "false" },
      handlePaste(_view, event) {
        const text = event.clipboardData?.getData("text/plain");
        if (!text || event.clipboardData?.getData("text/html")) return false;
        // Plain Markdown pasted from other tools is rendered rather than displayed as source.
        const instance = editorRef.current;
        if (!instance) return false;
        instance.commands.insertContent(text, { contentType: "markdown" });
        return true;
      },
    },
    onUpdate({ editor: current }) {
      flow.updateNodeData(id, { markdown: current.getMarkdown(), text: current.state.doc.textBetween(0, current.state.doc.content.size, "\n") });
    },
  });
  useEffect(() => { editorRef.current = editor; }, [editor]);
  const state = useEditorState({ editor, selector: ({ editor: current }) => current ? {
    bold: current.isActive("bold"), italic: current.isActive("italic"), strike: current.isActive("strike"),
    h1: current.isActive("heading", { level: 1 }), h2: current.isActive("heading", { level: 2 }), h3: current.isActive("heading", { level: 3 }),
    list: current.isActive("bulletList"), ordered: current.isActive("orderedList"),
    quote: current.isActive("blockquote"), code: current.isActive("codeBlock"),
    undo: current.can().undo(), redo: current.can().redo(),
  } : null });
  useEffect(() => {
    if (editor && editor.getMarkdown() !== data.markdown) editor.commands.setContent(data.markdown, { contentType: "markdown", emitUpdate: false });
  }, [data.markdown, editor]);
  const actions = editor ? [
    { label: "正文", Icon: Pilcrow, run: () => editor.chain().focus().setParagraph().run(), active: editor.isActive("paragraph") },
    { label: "一级标题 H1", Icon: Heading1, run: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: state?.h1 },
    { label: "二级标题 H2", Icon: Heading2, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: state?.h2 },
    { label: "三级标题 H3", Icon: Heading3, run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: state?.h3 },
    { label: "粗体", Icon: Bold, run: () => editor.chain().focus().toggleBold().run(), active: state?.bold },
    { label: "斜体", Icon: Italic, run: () => editor.chain().focus().toggleItalic().run(), active: state?.italic },
    { label: "删除线", Icon: Strikethrough, run: () => editor.chain().focus().toggleStrike().run(), active: state?.strike },
    { label: "无序列表", Icon: List, run: () => editor.chain().focus().toggleBulletList().run(), active: state?.list },
    { label: "有序列表", Icon: ListOrdered, run: () => editor.chain().focus().toggleOrderedList().run(), active: state?.ordered },
    { label: "引用", Icon: Quote, run: () => editor.chain().focus().toggleBlockquote().run(), active: state?.quote },
    { label: "代码块", Icon: Code, run: () => editor.chain().focus().toggleCodeBlock().run(), active: state?.code },
    { label: "撤销文本编辑", Icon: Undo2, run: () => editor.chain().focus().undo().run(), disabled: !state?.undo },
    { label: "重做文本编辑", Icon: Redo2, run: () => editor.chain().focus().redo().run(), disabled: !state?.redo },
  ] : [];
  return <>
    <NodeToolbar isVisible={selected} position={Position.Top} offset={12}>
      <div className={`${styles.toolbar} nodrag nopan nowheel`} role="toolbar" aria-label="Markdown 文本格式">
        {actions.map(({ label, Icon, run, active, disabled }, index) => <Button key={label} type="button" variant="ghost" size="icon-xs" title={label} aria-label={label}
          className={[4, 7, 11].includes(index) ? styles.groupStart : undefined}
          aria-pressed={active} disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={run}>
          <Icon size={14} className="size-3.5" aria-hidden="true" />
        </Button>)}
      </div>
    </NodeToolbar>
    <div className={`${styles.node} ${selected ? styles.selected : ""}`} style={{ fontSize: canvasTextFontSize(width, height) }}>
      <header className={styles.header}><FileText size={14} strokeWidth={1.5} aria-hidden="true" /><span>文本编辑器</span></header>
      <div className={`${styles.body} nodrag nopan nowheel`} onKeyDown={(event) => event.stopPropagation()} onContextMenu={(event) => event.stopPropagation()}
        onClick={(event) => { if (event.target === event.currentTarget) editor?.commands.focus("end"); }}
        onFocus={() => { if (!selected) flow.setNodes((nodes) => nodes.map((node) => ({ ...node, selected: node.id === id }))); }}>
        <EditorContent editor={editor} className={styles.editor} />
        {!data.text && <span className={styles.placeholder} aria-hidden="true">输入文字，或粘贴 Markdown…</span>}
      </div>
      <footer className={styles.footer}><span>Markdown</span><span>{Array.from(data.text).length} 字</span></footer>
      {error && <span className={styles.error} role="alert">{error}</span>}
    </div>
    <Handle type="source" id="text" position={Position.Right} className={workspaceStyles.referenceOutputHandle} aria-label="输出文本提示词" title="文本提示词" />
    {selected && (["top-left", "top-right", "bottom-left", "bottom-right"] as const).map((position) =>
      <NodeResizeControl key={position} position={position} minWidth={180} minHeight={140} maxWidth={1400} maxHeight={1600} className={workspaceStyles.resizeControl} />)}
  </>;
}
