import type { ReactFlowState } from "@xyflow/react";
import { canvasNodeAbsolutePosition } from "./canvas-groups.mjs";
import { generatorStackInsets } from "./canvas-selection-layout.mjs";
import type { CanvasNode } from "./canvas-workspace";
import styles from "./canvas-workspace.module.css";

/** Layout reads shared by automatic fitting and a user-initiated resize. */
export function measureCanvasGroupFootprints(state: Pick<ReactFlowState<CanvasNode>, "nodes" | "nodeLookup" | "domNode" | "transform">) {
  const zoom = state.transform[2];
  return state.nodes.filter((node) => node.parentId).flatMap((node) => {
    const internal = state.nodeLookup.get(node.id);
    if (!internal?.measured.width || !internal.measured.height) return [];
    const position = canvasNodeAbsolutePosition(node, state.nodes);
    const width = internal.measured.width; const height = internal.measured.height;
    const element = state.domNode?.querySelector<HTMLElement>(`[data-id="${CSS.escape(node.id)}"]`);
    const metadata = element?.querySelector<HTMLElement>(`.${styles.imageMetadata}`);
    const top = metadata ? metadata.offsetHeight + 6 : 0;
    let left = 0; let right = 0;
    if (metadata && element && zoom > 0) {
      const body = element.getBoundingClientRect();
      for (const part of [metadata, ...metadata.querySelectorAll<SVGElement>(`.${styles.generatorMetadataSparkle}`)]) {
        const rect = part.getBoundingClientRect();
        left = Math.max(left, (body.left - rect.left) / zoom);
        right = Math.max(right, (rect.right - body.right) / zoom);
      }
    }
    const stack = element?.querySelector<HTMLElement>("[data-canvas-stack-count]");
    const insets = generatorStackInsets(width, Number(stack?.dataset.canvasStackCount ?? 0), stack?.dataset.canvasStackExpanded === "true");
    return [{ id: node.id, bounds: { x: position.x - left, y: position.y - top,
      width: width + left + Math.max(right, insets.right), height: height + top + insets.bottom } }];
  });
}
