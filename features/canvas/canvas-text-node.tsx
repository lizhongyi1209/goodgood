"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Extension, type Editor } from "@tiptap/core";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { Slice } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import { Handle, NodeResizeControl, NodeToolbar, Position, useReactFlow, useStore, type NodeProps } from "@xyflow/react";
import { Bold, FileText, Heading1, Heading2, Heading3, Italic, List, ListOrdered, Minus, Pilcrow, Redo2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CanvasNode, CanvasTextNodeType } from "./canvas-workspace";
import { CANVAS_MARKDOWN_MAX_LENGTH, CANVAS_TEXT_FONT_SIZE, CANVAS_TEXT_MAX_LENGTH, CANVAS_TEXT_NODE_BOUNDS, canvasTextNodeFrameForKey } from "./canvas-text-input.mjs";
import { canvasDocumentPlainText } from "./canvas-markdown";
import { CanvasTextQuickToolbar } from "./canvas-text-quick-toolbar";
import styles from "./canvas-text-node.module.css";
import workspaceStyles from "./canvas-workspace.module.css";

export type CanvasTextNodeData = { markdown: string; text: string } & Record<string, unknown>;
const resizeCorners = [
  { position: "top-left", label: "左上角" }, { position: "top-right", label: "右上角" },
  { position: "bottom-left", label: "左下角" }, { position: "bottom-right", label: "右下角" },
] as const;

export function CanvasTextFormatToolbar({ editor, nodeId, enabled = true }: { editor: Editor | null; nodeId?: string; enabled?: boolean }) {
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
    { label: "分割线", Icon: Minus, run: () => editor?.chain().focus().setHorizontalRule().run() },
    { label: "撤销文本编辑", Icon: Undo2, run: () => editor?.chain().focus().undo().run(), disabled: !state?.undo },
    { label: "重做文本编辑", Icon: Redo2, run: () => editor?.chain().focus().redo().run(), disabled: !state?.redo },
  ];
  return <div className={`${styles.toolbar} nodrag nopan nowheel`} role="toolbar" aria-label="Markdown 文本格式" data-canvas-text-toolbar={nodeId}>
    {actions.map(({ label, Icon, run, active, disabled }, index) => <Button key={label} type="button" variant="ghost" size="icon-xs" title={label} aria-label={label}
      className={[4, 6, 9].includes(index) ? styles.groupStart : undefined}
      aria-pressed={active} disabled={!editor || !enabled || disabled} onMouseDown={(event) => event.preventDefault()} onClick={run}>
      <Icon size={14} className="size-3.5" aria-hidden="true" />
    </Button>)}
  </div>;
}

export function CanvasTextNode({ id, data, selected, width, height }: NodeProps<CanvasTextNodeType>) {
  const sequence = useStore((state) => Math.max(1, state.nodes.filter((node) => node.type === "textEditor").findIndex((node) => node.id === id) + 1));
  return <CanvasMarkdownNode id={id} data={data} selected={selected} width={width} height={height} label={`文本编辑 ${sequence}`} />;
}

export function CanvasMarkdownNode({ id, data, selected, width, height, label, streaming = false, showHeader = true, templateDisabled = false, className, emptyPlaceholder, showEditHint = false }: {
  id: string; data: CanvasTextNodeData; selected?: boolean; width?: number; height?: number;
  label: string; streaming?: boolean; showHeader?: boolean; templateDisabled?: boolean;
  className?: string; emptyPlaceholder?: ReactNode; showEditHint?: boolean;
}) {
  const flow = useReactFlow<CanvasNode>();
  const zoom = useStore((state) => state.transform[2]);
  const [editing, setEditing] = useState(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const canEdit = Boolean(editing && selected && !streaming);
  const [error, setError] = useState("");
  const editorRef = useRef<Editor | null>(null);
  const limit = useMemo(() => Extension.create({
    name: "canvasTextLimit",
    addProseMirrorPlugins() {
      return [new Plugin({ filterTransaction: (transaction) => {
        if (!transaction.docChanged) return true;
        const tooLong = canvasDocumentPlainText(transaction.doc).length > CANVAS_TEXT_MAX_LENGTH ||
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
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: { "aria-label": `${label} 内容`, "aria-multiline": "true", role: "textbox", spellcheck: "false" },
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
      flow.updateNodeData(id, { markdown: current.getMarkdown(), text: canvasDocumentPlainText(current.state.doc) });
    },
  });
  useEffect(() => { editorRef.current = editor; }, [editor]);
  useEffect(() => { editor?.setEditable(canEdit, false); }, [canEdit, editor]);
  useEffect(() => { if (!selected || streaming) Promise.resolve().then(() => setEditing(false)); }, [selected, streaming]);
  useEffect(() => {
    if (!canEdit) return;
    const page = bodyRef.current?.ownerDocument;
    const outside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || bodyRef.current?.contains(target) || target.closest("[data-canvas-text-toolbar]")?.getAttribute("data-canvas-text-toolbar") === id) return;
      setEditing(false);
    };
    page?.addEventListener("pointerdown", outside, true);
    return () => page?.removeEventListener("pointerdown", outside, true);
  }, [canEdit, id]);
  useEffect(() => {
    const body = bodyRef.current;
    const follow = Boolean(streaming && body && body.scrollHeight - body.scrollTop - body.clientHeight < 48);
    if (editor && editor.getMarkdown() !== data.markdown) {
      editor.chain().setContent(data.markdown, { contentType: "markdown", emitUpdate: false }).setMeta("addToHistory", false).run();
      if (follow && body) body.scrollTop = body.scrollHeight;
    }
    if (editor) {
      const text = canvasDocumentPlainText(editor.state.doc);
      if (text !== data.text) flow.updateNodeData(id, { text });
    }
  }, [data.markdown, data.text, editor, flow, id, streaming]);
  const selectNode = useCallback(() => {
    flow.setNodes((nodes) => nodes.map((node) => node.selected === (node.id === id) ? node : { ...node, selected: node.id === id }));
  }, [flow, id]);
  const beginEditing = () => {
    if (!editor || streaming) return;
    selectNode();
    setEditing(true);
    editor.setEditable(true, false);
    editor.commands.focus();
  };
  return <>
    <NodeToolbar isVisible={Boolean(selected)} position={Position.Top} offset={12 + 22 * zoom}>
      {canEdit ? <CanvasTextFormatToolbar editor={editor} nodeId={id} enabled />
        : <CanvasTextQuickToolbar data={data} nodeId={id} disabled={streaming || templateDisabled} />}
    </NodeToolbar>
    {showHeader && <header className={`${workspaceStyles.imageMetadata} ${styles.header}`}>
      <span className={workspaceStyles.imageMetadataName}>
        <FileText size={12} strokeWidth={1.5} aria-hidden="true" /><span className={workspaceStyles.imageMetadataNameText}>{label}</span>
      </span>
    </header>}
    <div className={`${styles.node} ${selected ? styles.selected : ""} ${streaming ? styles.streaming : ""} ${className ?? ""}`} style={{ fontSize: CANVAS_TEXT_FONT_SIZE }} data-canvas-text-document data-editing={canEdit || undefined} data-selected={selected || undefined} data-empty={!data.text || undefined}>
      <div ref={bodyRef} className={`${styles.body} ${canEdit ? `${styles.editing} nodrag nopan nowheel` : ""}`} tabIndex={streaming ? -1 : 0} data-canvas-text-body
        aria-label={canEdit ? undefined : `${label}，双击或按 Enter 编辑`}
        onDoubleClick={(event) => { event.stopPropagation(); beginEditing(); }}
        onKeyDown={(event) => {
          if (canEdit) {
            event.stopPropagation();
            if (event.key === "Escape") { setEditing(false); editor?.commands.blur(); }
          } else if (event.key === "Enter" || event.key === "F2") {
            event.preventDefault(); event.stopPropagation(); beginEditing();
          }
        }}
        onContextMenu={(event) => { if (canEdit) event.stopPropagation(); }}
        onFocus={selectNode}>
        <EditorContent editor={editor} className={styles.editor} />
        {!data.text && <span className={styles.placeholder} aria-hidden="true">{emptyPlaceholder ?? (streaming ? "正在生成…" : "双击输入内容…")}</span>}
      </div>
      {showEditHint && selected && !streaming && data.text && !error && <span className={styles.editHint} aria-hidden="true">{canEdit ? "Esc 退出编辑" : "双击编辑"}</span>}
      {error && <span className={styles.error} role="alert">{error}</span>}
    </div>
    <Handle type="source" id="text" position={Position.Right} className={workspaceStyles.referenceOutputHandle} aria-label={`输出${label}的文本提示词`} title="文本提示词" />
    {resizeCorners.map(({ position, label: cornerLabel }) => <NodeResizeControl key={position} position={position}
      {...CANVAS_TEXT_NODE_BOUNDS} className={`${workspaceStyles.resizeControl} ${styles.resizeControl}`} onResizeStart={selectNode}>
      <button type="button" className={`${workspaceStyles.resizeHotspot} nodrag nopan nowheel nokey`}
        aria-label={`调整${label}${cornerLabel}，方向键调整大小`} title="拖动调整尺寸，或使用方向键（Shift 加快）"
        onKeyDown={(event) => {
          event.stopPropagation();
          const { key, shiftKey } = event;
          if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key) || event.ctrlKey || event.metaKey || event.altKey) return;
          event.preventDefault();
          selectNode();
          flow.updateNode(id, (node) => {
            const frame = canvasTextNodeFrameForKey({ ...node.position, width, height }, position, key, shiftKey);
            if (!frame) return node;
            const size = { width: frame.width, height: frame.height };
            return { ...size, position: { x: frame.x, y: frame.y }, style: { ...node.style, ...size } };
          });
        }} />
    </NodeResizeControl>)}
  </>;
}
