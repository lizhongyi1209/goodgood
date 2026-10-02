"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Extension, type Editor } from "@tiptap/core";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { Slice } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import { Handle, NodeResizeControl, NodeToolbar, Position, useReactFlow, useStore, type NodeProps } from "@xyflow/react";
import { Bold, FileText, Heading1, Heading2, Heading3, Italic, List, ListOrdered, Pilcrow, Redo2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { countPromptCharacters } from "@/shared/contracts/generation-prompt-limits.mjs";
import type { CanvasNode, CanvasTextNodeType } from "./canvas-workspace";
import { CANVAS_MARKDOWN_MAX_LENGTH, CANVAS_TEXT_FONT_SIZE, CANVAS_TEXT_MAX_LENGTH, CANVAS_TEXT_NODE_BOUNDS, canvasTextNodeSizeForKey } from "./canvas-text-input.mjs";
import styles from "./canvas-text-node.module.css";
import workspaceStyles from "./canvas-workspace.module.css";

export type CanvasTextNodeData = { markdown: string; text: string } & Record<string, unknown>;

export function CanvasTextFormatToolbar({ editor }: { editor: Editor | null }) {
  const state = useEditorState({ editor, selector: ({ editor: current }) => current ? {
    paragraph: current.isActive("paragraph"), bold: current.isActive("bold"), italic: current.isActive("italic"),
    h1: current.isActive("heading", { level: 1 }), h2: current.isActive("heading", { level: 2 }), h3: current.isActive("heading", { level: 3 }),
    list: current.isActive("bulletList"), ordered: current.isActive("orderedList"),
    undo: current.can().undo(), redo: current.can().redo(),
  } : null });
  const actions = [
    { label: "正文", Icon: Pilcrow, run: () => editor?.chain().focus().setParagraph().run(), active: state?.paragraph },
    { label: "一级标题 H1", Icon: Heading1, run: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), active: state?.h1 },
    { label: "二级标题 H2", Icon: Heading2, run: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), active: state?.h2 },
    { label: "三级标题 H3", Icon: Heading3, run: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), active: state?.h3 },
    { label: "粗体", Icon: Bold, run: () => editor?.chain().focus().toggleBold().run(), active: state?.bold },
    { label: "斜体", Icon: Italic, run: () => editor?.chain().focus().toggleItalic().run(), active: state?.italic },
    { label: "无序列表", Icon: List, run: () => editor?.chain().focus().toggleBulletList().run(), active: state?.list },
    { label: "有序列表", Icon: ListOrdered, run: () => editor?.chain().focus().toggleOrderedList().run(), active: state?.ordered },
    { label: "撤销文本编辑", Icon: Undo2, run: () => editor?.chain().focus().undo().run(), disabled: !state?.undo },
    { label: "重做文本编辑", Icon: Redo2, run: () => editor?.chain().focus().redo().run(), disabled: !state?.redo },
  ];
  return <div className={`${styles.toolbar} nodrag nopan nowheel`} role="toolbar" aria-label="Markdown 文本格式">
    {actions.map(({ label, Icon, run, active, disabled }, index) => <Button key={label} type="button" variant="ghost" size="icon-xs" title={label} aria-label={label}
      className={[4, 6, 8].includes(index) ? styles.groupStart : undefined}
      aria-pressed={active} disabled={!editor || disabled} onMouseDown={(event) => event.preventDefault()} onClick={run}>
      <Icon size={14} className="size-3.5" aria-hidden="true" />
    </Button>)}
  </div>;
}

export function CanvasTextNode({ id, data, selected, width, height }: NodeProps<CanvasTextNodeType>) {
  const flow = useReactFlow<CanvasNode>();
  const zoom = useStore((state) => state.transform[2]);
  const sequence = useStore((state) => Math.max(1, state.nodes.filter((node) => node.type === "textEditor").findIndex((node) => node.id === id) + 1));
  const [error, setError] = useState("");
  const editorRef = useRef<Editor | null>(null);
  const limit = useMemo(() => Extension.create({
    name: "canvasTextLimit",
    addProseMirrorPlugins() {
      return [new Plugin({ filterTransaction: (transaction) => {
        if (!transaction.docChanged) return true;
        const tooLong = countPromptCharacters(transaction.doc.textBetween(0, transaction.doc.content.size, "\n")) > CANVAS_TEXT_MAX_LENGTH ||
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
      attributes: { "aria-label": `文本编辑器 ${sequence} 内容`, "aria-multiline": "true", role: "textbox", spellcheck: "false" },
      handlePaste(view, event) {
        const text = event.clipboardData?.getData("text/plain");
        if (!text || event.clipboardData?.getData("text/html") || view.state.selection.$from.parent.type.spec.code) return false;
        const instance = editorRef.current;
        if (!instance?.markdown) return false;
        // Open paragraph boundaries so pasted Markdown joins the text at the cursor.
        const document = view.state.schema.nodeFromJSON(instance.markdown.parse(text));
        const slice = Slice.maxOpen(document.content);
        view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView()
          .setMeta("paste", true).setMeta("uiEvent", "paste"));
        return true;
      },
    },
    onUpdate({ editor: current }) {
      flow.updateNodeData(id, { markdown: current.getMarkdown(), text: current.state.doc.textBetween(0, current.state.doc.content.size, "\n") });
    },
  });
  useEffect(() => { editorRef.current = editor; }, [editor]);
  useEffect(() => {
    if (editor && editor.getMarkdown() !== data.markdown) editor.commands.setContent(data.markdown, { contentType: "markdown", emitUpdate: false });
  }, [data.markdown, editor]);
  const selectNode = useCallback(() => {
    flow.setNodes((nodes) => nodes.map((node) => node.selected === (node.id === id) ? node : { ...node, selected: node.id === id }));
  }, [flow, id]);
  return <>
    <NodeToolbar isVisible={selected} position={Position.Top} offset={12 + 22 * zoom}>
      <CanvasTextFormatToolbar editor={editor} />
    </NodeToolbar>
    <header className={`${workspaceStyles.imageMetadata} ${styles.header}`}>
      <span className={workspaceStyles.imageMetadataName}>
        <FileText size={12} strokeWidth={1.5} aria-hidden="true" /><span className={workspaceStyles.imageMetadataNameText}>文本编辑器 {sequence}</span>
      </span>
    </header>
    <div className={`${styles.node} ${selected ? styles.selected : ""}`} style={{ fontSize: CANVAS_TEXT_FONT_SIZE }}>
      <div className={`${styles.body} nodrag nopan nowheel`} onKeyDown={(event) => event.stopPropagation()} onContextMenu={(event) => event.stopPropagation()}
        onFocus={selectNode}>
        <EditorContent editor={editor} className={styles.editor} />
        {!data.text && <span className={styles.placeholder} aria-hidden="true">输入内容…</span>}
      </div>
      {error && <span className={styles.error} role="alert">{error}</span>}
    </div>
    <Handle type="source" id="text" position={Position.Right} className={workspaceStyles.referenceOutputHandle} aria-label="输出文本提示词" title="文本提示词" />
    <NodeResizeControl position="bottom-right" {...CANVAS_TEXT_NODE_BOUNDS} className={styles.resizeControl} onResizeStart={selectNode}>
      <button type="button" className={`${styles.resizeGrip} nopan nowheel`} aria-label="调整文本编辑器尺寸" title="拖动调整尺寸，或使用方向键（Shift 加快）"
        onKeyDown={(event) => {
          event.stopPropagation();
          const size = canvasTextNodeSizeForKey(width, height, event.key, event.shiftKey);
          if (!size || event.ctrlKey || event.metaKey || event.altKey) return;
          event.preventDefault();
          selectNode();
          flow.updateNode(id, (node) => ({ ...size, style: { ...node.style, ...size } }));
        }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M7 17 17 7M13 19 19 13" />
        </svg>
      </button>
    </NodeResizeControl>
  </>;
}
