"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { ImageIcon, Keyboard, LibraryBig, Scissors } from "lucide-react";
import {
  ConnectionLineType,
  MiniMap,
  ReactFlow,
  getBezierPath,
  useStoreApi,
  type ConnectionLineComponentProps,
  type Node,
  type NodeChange,
  type Edge,
  type EdgeChange,
  type Connection,
  type ReactFlowInstance,
} from "@xyflow/react";

import { ZoomSelect } from "@/components/ui/zoom-select";
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CanvasAssetPanel, type CanvasLibraryAsset } from "./canvas-asset-panel";
import { CanvasResultNode, type CanvasResultNodeData } from "./canvas-result-node";
import { CanvasSourceNode as CanvasSourceImageNode, type CanvasSourceNodeData } from "./canvas-source-node";
import { CanvasVideoNode as CanvasSourceVideoNode, type CanvasVideoNodeData } from "./canvas-video-node";
import { CanvasAudioNode, type CanvasAudioNodeData } from "./canvas-audio-node";
import { CanvasGeneratorNode, type CanvasGeneratorNodeData } from "./canvas-generator-node";
import { CanvasGeneratorHostContext } from "./canvas-generator-host";
import { CanvasSelectionControls } from "./canvas-selection-controls";
import { handleCanvasBodyClipboardPaste, handleCanvasClipboardCopy, handleCanvasClipboardPaste } from "./canvas-clipboard.mjs";
import styles from "./canvas-workspace.module.css";

export type CanvasResultNodeType = Node<CanvasResultNodeData, "imageResult">;
export type CanvasSourceNode = Node<CanvasSourceNodeData, "sourceImage">;
export type CanvasVideoNode = Node<CanvasVideoNodeData, "sourceVideo">;
export type CanvasAudioNodeType = Node<CanvasAudioNodeData, "sourceAudio">;
export type CanvasGeneratorNodeType = Node<CanvasGeneratorNodeData, "imageGenerator">;
export type CanvasNode = CanvasResultNodeType | CanvasSourceNode | CanvasVideoNode | CanvasAudioNodeType | CanvasGeneratorNodeType;

export const canvasReferenceEdgeStyle = { stroke: "#a1a1aa", strokeWidth: 1.2 } as const;
export const canvasReferenceEdgeCurvature = 0.18;

const nodeTypes = { imageResult: CanvasResultNode, sourceImage: CanvasSourceImageNode, sourceVideo: CanvasSourceVideoNode, sourceAudio: CanvasAudioNode, imageGenerator: CanvasGeneratorNode };
const initialNodes: CanvasNode[] = [];

function CanvasProjectChangeObserver({ onChange }: Readonly<{ onChange: () => void }>) {
  const store = useStoreApi<CanvasNode>();
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => store.subscribe((state, previous) => {
    if ((state.nodes !== previous.nodes || state.edges !== previous.edges) &&
        !state.nodes.some((node) => node.dragging || node.resizing)) {
      onChangeRef.current();
    }
  }), [store]);
  return null;
}

function CanvasReferenceConnectionLine({
  fromX, fromY, fromPosition, toX, toY, toPosition,
}: ConnectionLineComponentProps<CanvasNode>) {
  const [path] = getBezierPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition,
    curvature: canvasReferenceEdgeCurvature,
  });
  return <path d={path} fill="none" className="react-flow__connection-path" style={canvasReferenceEdgeStyle} />;
}

type SidebarResizeDrag = {
  pointerId: number;
  startX: number;
  startWidth: number;
  nextWidth: number;
  frame: number | null;
  root: HTMLElement;
};

function clearSidebarResizeDrag(drag: SidebarResizeDrag) {
  if (drag.frame !== null) cancelAnimationFrame(drag.frame);
  drag.root.style.removeProperty("--canvas-sidebar-drag-width");
}

function clampAssetSidebarWidth(width: number) {
  const maximum = Math.max(248, Math.min(400, window.innerWidth - 280));
  return Math.max(248, Math.min(Math.round(width), maximum));
}

function nearestEdgePoint(path: SVGPathElement, clientX: number, clientY: number) {
  const matrix = path.getScreenCTM();
  const length = path.getTotalLength();
  if (!matrix || !Number.isFinite(length) || length <= 0) return null;

  const pointAt = (distance: number) => {
    const point = path.getPointAtLength(distance);
    const x = matrix.a * point.x + matrix.c * point.y + matrix.e;
    const y = matrix.b * point.x + matrix.d * point.y + matrix.f;
    return { x, y, squaredDistance: (x - clientX) ** 2 + (y - clientY) ** 2 };
  };

  let closestDistance = 0;
  let closest = pointAt(0);
  const sampleStep = length / 16;
  for (let index = 1; index <= 16; index += 1) {
    const distance = index * sampleStep;
    const candidate = pointAt(distance);
    if (candidate.squaredDistance < closest.squaredDistance) {
      closest = candidate;
      closestDistance = distance;
    }
  }
  let step = sampleStep / 2;
  for (let index = 0; index < 7; index += 1) {
    for (const distance of [Math.max(0, closestDistance - step), Math.min(length, closestDistance + step)]) {
      const candidate = pointAt(distance);
      if (candidate.squaredDistance < closest.squaredDistance) {
        closest = candidate;
        closestDistance = distance;
      }
    }
    step /= 2;
  }
  return { x: closest.x, y: closest.y, distance: Math.sqrt(closest.squaredDistance) };
}

export function CanvasWorkspace({
  onInit,
  onNodesChange,
  assetLibraryEnabled,
  assetRevision,
  assetsOpen,
  onAssetsOpenChange,
  assetSidebarWidth,
  onAssetSidebarWidthChange,
  onAssetDragStart,
  onAssetDragEnd,
  edges,
  onEdgesChange,
  onDeleteEdge,
  onSelectAll,
  onClearSelection,
  onCopy,
  onPaste,
  onPasteImages,
  onUndo,
  onRedo,
  onBeforeGraphEdit,
  onConnect,
  isValidConnection,
  onCreateGenerator,
  onComposerHostChange,
  onProjectGraphChange,
  onViewportSettled,
}: Readonly<{
  onInit: (instance: ReactFlowInstance<CanvasNode>) => void;
  onNodesChange: (changes: NodeChange<CanvasNode>[]) => void;
  assetLibraryEnabled: boolean;
  assetRevision: number;
  assetsOpen: boolean;
  onAssetsOpenChange: (open: boolean) => void;
  assetSidebarWidth: number | null;
  onAssetSidebarWidthChange: (width: number) => void;
  onAssetDragStart: (item: CanvasLibraryAsset) => void;
  onAssetDragEnd: () => void;
  edges: Edge[];
  onEdgesChange: (changes: EdgeChange[]) => void;
  onDeleteEdge: (edgeId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onCopy: () => boolean;
  onPaste: () => void;
  onPasteImages: (files: File[]) => void;
  onUndo: () => void;
  onRedo: () => void;
  onBeforeGraphEdit: () => void;
  onConnect: (connection: Connection) => void;
  isValidConnection: (connection: Connection | Edge) => boolean;
  onCreateGenerator: (point: { x: number; y: number }) => void;
  onComposerHostChange: (id: string, element: HTMLDivElement | null) => void;
  onProjectGraphChange: (settled?: boolean) => void;
  onViewportSettled: () => void;
}>) {
  const [miniMapOpen, setMiniMapOpen] = useState(true);
  const [connectionActive, setConnectionActive] = useState(false);
  const [miniMapWidth, setMiniMapWidth] = useState(200);
  const resizeRef = useRef<SidebarResizeDrag | null>(null);
  const contextPointRef = useRef<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLElement | null>(null);
  const clipboardTokenRef = useRef<string | null>(null);
  const flowRef = useRef<ReactFlowInstance<CanvasNode> | null>(null);
  const edgeDeleteButtonRef = useRef<HTMLButtonElement | null>(null);
  const edgeDeletePathRef = useRef<SVGPathElement | null>(null);
  const edgeHoverElementRef = useRef<Element | null>(null);
  const edgeHoverRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const edgeHoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const edgeDeleteVisibleRef = useRef<string | null>(null);
  const [edgeDelete, setEdgeDelete] = useState<{ id: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const surface = canvasRef.current;
    if (!surface) return;
    const page = surface.ownerDocument;
    const pasteFromBody = (event: ClipboardEvent) => handleCanvasBodyClipboardPaste(event, {
      surface, selectionToken: clipboardTokenRef.current, onPasteSelection: onPaste, onPasteImages,
    });
    page.addEventListener("paste", pasteFromBody);
    return () => page.removeEventListener("paste", pasteFromBody);
  }, [onPaste, onPasteImages]);

  const handleCanvasKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    const target = event.target;
    if (!(target instanceof Element) ||
        (target !== event.currentTarget && !target.closest(".react-flow")) ||
        target.closest("input, textarea, select, button, a, [contenteditable], [role='button'], [role='textbox'], [role='menu'], [role='dialog'], .nokey")) return;

    const modifier = (event.ctrlKey || event.metaKey) && !event.altKey;
    const key = event.key.toLowerCase();
    if (modifier && !event.shiftKey && key === "a") {
      event.preventDefault();
      event.stopPropagation();
      onSelectAll();
      return;
    }
    if (modifier && (key === "z" || key === "y")) {
      event.preventDefault();
      event.stopPropagation();
      if (key === "z") event.shiftKey ? onRedo() : onUndo();
      else if (key === "y" && !event.shiftKey) onRedo();
      return;
    }
    if (event.key === "Escape") {
      event.stopPropagation();
      onClearSelection();
      return;
    }
    if ((event.key === "Delete" || event.key === "Backspace") && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const flow = flowRef.current;
      if (!flow) return;
      const nodes = flow.getNodes().filter((node) => node.selected);
      const edges = flow.getEdges().filter((edge) => edge.selected);
      event.preventDefault();
      if (!nodes.length && !edges.length) return;
      event.stopPropagation();
      onBeforeGraphEdit();
      // React Flow also removes connected edges and dispatches onEdgesChange/onNodesChange.
      void flow.deleteElements({ nodes, edges }).finally(() => canvasRef.current?.focus({ preventScroll: true }));
    }
  };

  const positionEdgeDelete = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const path = edgeDeletePathRef.current;
    if (!rect || !path?.isConnected) return null;
    const nearest = nearestEdgePoint(path, clientX, clientY);
    if (!nearest) return null;
    const point = { x: nearest.x - rect.left, y: nearest.y - rect.top, distance: nearest.distance };
    if (edgeDeleteButtonRef.current) {
      edgeDeleteButtonRef.current.style.left = `${point.x}px`;
      edgeDeleteButtonRef.current.style.top = `${point.y}px`;
    }
    return point;
  };

  const hideEdgeDelete = useCallback(() => {
    if (edgeHoverTimerRef.current !== null) clearTimeout(edgeHoverTimerRef.current);
    edgeHoverTimerRef.current = null;
    edgeHoverElementRef.current?.removeAttribute("data-canvas-edge-hovered");
    edgeHoverElementRef.current = null;
    edgeHoverRef.current = null;
    edgeDeleteVisibleRef.current = null;
    edgeDeletePathRef.current = null;
    setEdgeDelete(null);
  }, []);

  useEffect(() => {
    const id = edgeHoverRef.current?.id ?? edgeDeleteVisibleRef.current;
    if (id && !edges.some((edge) => edge.id === id)) hideEdgeDelete();
  }, [edges, hideEdgeDelete]);

  useEffect(() => () => {
    if (edgeHoverTimerRef.current !== null) clearTimeout(edgeHoverTimerRef.current);
    edgeHoverElementRef.current?.removeAttribute("data-canvas-edge-hovered");
  }, []);

  const visibleEdgeDelete = edgeDelete && edges.some((edge) => edge.id === edgeDelete.id) ? edgeDelete : null;

  useEffect(() => {
    const preventBrowserMenu = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.classList.contains("react-flow__pane")) return;
      event.preventDefault();
    };
    document.addEventListener("contextmenu", preventBrowserMenu, true);
    return () => document.removeEventListener("contextmenu", preventBrowserMenu, true);
  }, []);

  useEffect(() => {
    const updateMiniMapWidth = () => {
      const sidebarWidth = assetsOpen ? document.getElementById("canvas-asset-sidebar")?.getBoundingClientRect().width ?? 0 : 0;
      setMiniMapWidth(Math.max(96, Math.min(200, Math.floor(window.innerWidth - sidebarWidth - 28))));
    };
    updateMiniMapWidth();
    window.addEventListener("resize", updateMiniMapWidth);
    return () => window.removeEventListener("resize", updateMiniMapWidth);
  }, [assetsOpen, assetSidebarWidth]);

  const finishResize = (event: ReactPointerEvent<HTMLDivElement>, commit: boolean) => {
    const drag = resizeRef.current;
    if (drag?.pointerId !== event.pointerId) return;
    resizeRef.current = null;
    if (commit) {
      drag.nextWidth = clampAssetSidebarWidth(drag.startWidth + event.clientX - drag.startX);
      drag.root.style.setProperty("--canvas-sidebar-preferred-width", `${drag.nextWidth}px`);
    }
    clearSidebarResizeDrag(drag);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (commit && (drag.nextWidth !== Math.round(drag.startWidth) || (assetSidebarWidth !== null && drag.nextWidth !== assetSidebarWidth))) {
      onAssetSidebarWidthChange(drag.nextWidth);
    }
  };

  useEffect(() => {
    if (!assetsOpen) {
      if (resizeRef.current) clearSidebarResizeDrag(resizeRef.current);
      resizeRef.current = null;
      return;
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onAssetsOpenChange(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [assetsOpen, onAssetsOpenChange]);

  return (
    <>
      {assetsOpen && (
        <aside id="canvas-asset-sidebar" className={styles.assetsSidebar} aria-label="资产列表">
          <CanvasAssetPanel enabled={assetLibraryEnabled} assetRevision={assetRevision} onClose={() => onAssetsOpenChange(false)}
            onAssetDragStart={onAssetDragStart} onAssetDragEnd={onAssetDragEnd} />
          <div className={styles.assetsResizeHandle} role="separator" aria-label="调整资产栏宽度"
            aria-orientation="vertical" aria-controls="canvas-asset-sidebar"
            aria-valuemin={248} aria-valuemax={400} aria-valuenow={assetSidebarWidth ?? 248} tabIndex={0}
            onPointerDown={(event) => {
              if (event.pointerType === "mouse" && event.button !== 0) return;
              const root = event.currentTarget.closest("main");
              if (!root) return;
              const startWidth = event.currentTarget.parentElement?.getBoundingClientRect().width ?? 248;
              resizeRef.current = { pointerId: event.pointerId, startX: event.clientX,
                startWidth, nextWidth: clampAssetSidebarWidth(startWidth), frame: null, root };
              event.currentTarget.setPointerCapture(event.pointerId);
              event.preventDefault();
            }}
            onPointerMove={(event) => {
              const drag = resizeRef.current;
              if (drag?.pointerId !== event.pointerId) return;
              drag.nextWidth = clampAssetSidebarWidth(drag.startWidth + event.clientX - drag.startX);
              if (drag.frame !== null) return;
              drag.frame = requestAnimationFrame(() => {
                drag.frame = null;
                if (resizeRef.current === drag) drag.root.style.setProperty("--canvas-sidebar-drag-width", `${drag.nextWidth}px`);
              });
            }}
            onPointerUp={(event) => finishResize(event, true)}
            onPointerCancel={(event) => finishResize(event, false)}
            onLostPointerCapture={() => {
              if (resizeRef.current) clearSidebarResizeDrag(resizeRef.current);
              resizeRef.current = null;
            }}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              event.preventDefault();
              event.stopPropagation();
              const current = event.currentTarget.parentElement?.getBoundingClientRect().width ?? 248;
              onAssetSidebarWidthChange(clampAssetSidebarWidth(current + (event.key === "ArrowRight" ? 16 : -16)));
            }}
          />
        </aside>
      )}
      <ContextMenu>
      <ContextMenuTrigger
        asChild
        onContextMenu={(event) => {
          if (!(event.target instanceof Element && event.target.classList.contains("react-flow__pane"))) {
            event.preventDefault();
            contextPointRef.current = null;
          } else {
            contextPointRef.current = { x: event.clientX, y: event.clientY };
          }
        }}
      >
      <section id="canvas-workspace-surface" ref={canvasRef} className={styles.canvas} aria-label="画布创作" tabIndex={-1}
        data-connecting={connectionActive || undefined}
        onKeyDownCapture={handleCanvasKeyDown}
        onCopyCapture={(event) => {
          clipboardTokenRef.current ??= crypto.randomUUID();
          handleCanvasClipboardCopy(event, { selectionToken: clipboardTokenRef.current, onCopySelection: onCopy });
        }}
        onPasteCapture={(event) => handleCanvasClipboardPaste(event, {
          selectionToken: clipboardTokenRef.current, onPasteSelection: onPaste, onPasteImages,
        })}
        onMouseMoveCapture={(event) => {
          if (!edgeDeleteVisibleRef.current) return;
          const point = positionEdgeDelete(event.clientX, event.clientY);
          if (!point || point.distance > 18) {
            hideEdgeDelete();
          }
        }}
        onMouseLeave={hideEdgeDelete}>
      <CanvasGeneratorHostContext.Provider value={onComposerHostChange}>
      <ReactFlow<CanvasNode>
        defaultNodes={initialNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={(instance) => { flowRef.current = instance; onInit(instance); }}
        deleteKeyCode={null}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={() => setConnectionActive(true)}
        onConnectEnd={() => setConnectionActive(false)}
        onEdgeMouseEnter={(event, edge) => {
          if (edgeDeleteVisibleRef.current === edge.id) {
            edgeHoverElementRef.current = event.currentTarget;
            event.currentTarget.setAttribute("data-canvas-edge-hovered", "true");
            edgeDeletePathRef.current = event.currentTarget.querySelector<SVGPathElement>(".react-flow__edge-path");
            edgeHoverRef.current = { id: edge.id, x: event.clientX, y: event.clientY };
            return;
          }
          hideEdgeDelete();
          // The centered scissors button is outside the SVG edge's hover subtree.
          edgeHoverElementRef.current = event.currentTarget;
          event.currentTarget.setAttribute("data-canvas-edge-hovered", "true");
          edgeDeletePathRef.current = event.currentTarget.querySelector<SVGPathElement>(".react-flow__edge-path");
          edgeHoverRef.current = { id: edge.id, x: event.clientX, y: event.clientY };
          edgeHoverTimerRef.current = setTimeout(() => {
            const hover = edgeHoverRef.current;
            if (!hover || hover.id !== edge.id) return;
            const point = positionEdgeDelete(hover.x, hover.y);
            if (!point) return;
            edgeDeleteVisibleRef.current = edge.id;
            setEdgeDelete({ id: edge.id, x: point.x, y: point.y });
            edgeHoverTimerRef.current = null;
          }, 1000);
        }}
        onEdgeMouseMove={(event, edge) => {
          if (edgeHoverRef.current?.id === edge.id) {
            edgeHoverRef.current.x = event.clientX;
            edgeHoverRef.current.y = event.clientY;
          }
        }}
        onEdgeMouseLeave={(event, edge) => {
          if (edgeHoverRef.current?.id !== edge.id) return;
          if (event.relatedTarget instanceof Element && edgeDeleteButtonRef.current?.contains(event.relatedTarget)) return;
          hideEdgeDelete();
        }}
        onPaneClick={() => { hideEdgeDelete(); canvasRef.current?.focus({ preventScroll: true }); }}
        onNodeDragStart={onBeforeGraphEdit}
        onNodeDragStop={() => onProjectGraphChange(true)}
        onMoveEnd={onViewportSettled}
        isValidConnection={isValidConnection}
        connectionLineType={ConnectionLineType.Bezier}
        connectionLineComponent={CanvasReferenceConnectionLine}
        connectionRadius={32}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.1}
        maxZoom={8}
        nodesConnectable
        colorMode="light"
        proOptions={{ hideAttribution: true }}
        style={{ backgroundColor: "#fff" }}
      >
        <CanvasProjectChangeObserver onChange={onProjectGraphChange} />
        <CanvasSelectionControls onBeforeGraphEdit={onBeforeGraphEdit} onProjectGraphChange={onProjectGraphChange} />
        {miniMapOpen && (
          <MiniMap<CanvasNode>
            position="bottom-left"
            className={styles.miniMap}
            style={{ width: miniMapWidth, height: 132 }}
            nodeColor="#d4d4d8"
            nodeStrokeColor="transparent"
            nodeBorderRadius={2}
            maskColor="rgb(255 255 255 / 72%)"
            maskStrokeColor="#a1a1aa"
            maskStrokeWidth={1.5}
            ariaLabel="画布地图，可拖动定位或滚轮缩放"
            pannable
            zoomable
          />
        )}
        <ZoomSelect
          position="bottom-left"
          className={styles.zoomPanel}
          leadingControl={
            <Button type="button" variant="ghost" size="icon-sm" className={styles.assetsTrigger}
              aria-label="资产" title="资产" aria-expanded={assetsOpen}
              aria-controls={assetsOpen ? "canvas-asset-sidebar" : undefined}
              onClick={() => onAssetsOpenChange(!assetsOpen)}>
              <LibraryBig size={16} strokeWidth={1.7} aria-hidden="true" />
            </Button>
          }
          miniMapOpen={miniMapOpen}
          onMiniMapToggle={() => setMiniMapOpen((current) => !current)}
          mapTrailingControl={<Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="icon-sm" className={styles.shortcutsTrigger}
                aria-label="画布快捷键" title="画布快捷键">
                <Keyboard size={16} strokeWidth={1.7} aria-hidden="true" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" sideOffset={8} aria-label="画布快捷键" className={styles.shortcutsMenu}>
              <div>全选 <kbd>Ctrl / ⌘ A</kbd></div>
              <div>复制 <kbd>Ctrl / ⌘ C</kbd></div>
              <div>粘贴 <kbd>Ctrl / ⌘ V</kbd></div>
              <div>撤销 <kbd>Ctrl / ⌘ Z</kbd></div>
              <div>重做 <kbd>Ctrl / ⌘ ⇧ Z / Ctrl Y</kbd></div>
              <div>删除选中 <kbd>Delete / Backspace</kbd></div>
              <div>取消选择 <kbd>Esc</kbd></div>
              <div>多选 <kbd>Ctrl / ⌘ 点击</kbd></div>
              <div>框选 <kbd>Shift 拖动</kbd></div>
              <div>移动节点 <kbd>方向键</kbd></div>
            </PopoverContent>
          </Popover>}
        />
      </ReactFlow>
      </CanvasGeneratorHostContext.Provider>
      {visibleEdgeDelete && (
        <Button type="button" variant="outline" size="icon-xs" className={styles.edgeDelete}
          ref={edgeDeleteButtonRef}
          style={{ left: visibleEdgeDelete.x, top: visibleEdgeDelete.y }}
          aria-label="删除连线" title="删除连线"
          onPointerDown={(event) => event.stopPropagation()}
          onMouseLeave={(event) => {
            if (event.relatedTarget instanceof Element && edgeHoverElementRef.current?.contains(event.relatedTarget)) return;
            hideEdgeDelete();
          }}
          onBlur={hideEdgeDelete}
          onClick={(event) => {
            event.stopPropagation();
            const id = visibleEdgeDelete.id;
            hideEdgeDelete();
            onBeforeGraphEdit();
            onDeleteEdge(id);
            canvasRef.current?.focus({ preventScroll: true });
          }}>
          <Scissors size={15} strokeWidth={1.5} aria-hidden="true" />
        </Button>
      )}
      </section>
      </ContextMenuTrigger>
      <ContextMenuContent className={styles.canvasContextMenu} onContextMenu={(event) => event.preventDefault()}>
        <ContextMenuItem onSelect={() => {
          if (contextPointRef.current) { onBeforeGraphEdit(); onCreateGenerator(contextPointRef.current); }
          contextPointRef.current = null;
        }}>
          <span className={styles.generatorMetadataIcon} aria-hidden="true">
            <ImageIcon size={12} className="size-3" />
            <svg className={`${styles.generatorMetadataSparkle} size-2`} viewBox="0 0 8 8" focusable="false">
              <path d="M4 0.5 4.65 3.35 7.5 4 4.65 4.65 4 7.5 3.35 4.65 0.5 4 3.35 3.35Z" />
            </svg>
          </span>
          <span>图片生成器</span>
        </ContextMenuItem>
      </ContextMenuContent>
      </ContextMenu>
    </>
  );
}
