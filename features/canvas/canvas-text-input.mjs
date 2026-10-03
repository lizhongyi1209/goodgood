export const CANVAS_TEXT_MAX_LENGTH = 16_000;
export const CANVAS_MARKDOWN_MAX_LENGTH = 100_000;
export const CANVAS_PROMPT_MAX_LENGTH = 4_000;
export const CANVAS_TEXT_FONT_SIZE = 14;
export const CANVAS_TEXT_NODE_BOUNDS = Object.freeze({ minWidth: 180, minHeight: 140, maxWidth: 1400, maxHeight: 1600 });

/** Edge order is the persisted input order; image references never enter prompts. */
export function collectCanvasTextInputs(nodes, edges, generatorId) {
  if (!generatorId) return [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const seen = new Set();
  return edges.flatMap((edge) => {
    const node = byId.get(edge.source);
    if (edge.target !== generatorId || edge.sourceHandle !== "text" || !["reference", "text"].includes(edge.targetHandle) ||
        !["textEditor", "textGenerator"].includes(node?.type) || seen.has(node.id) || !node.data.text?.trim()) return [];
    seen.add(node.id);
    return [{ edgeId: edge.id, nodeId: node.id, text: node.data.text, markdown: node.data.markdown ?? "" }];
  });
}

export function combineCanvasPrompt(inputs, additionalPrompt) {
  return [...inputs.map((input) => input.text), additionalPrompt]
    .map((text) => text.trim()).filter(Boolean).join("\n\n");
}

export function canvasTextNodeSizeForKey(width, height, key, largeStep = false) {
  const frame = canvasTextNodeFrameForKey({ x: 0, y: 0, width, height }, "bottom-right", key, largeStep);
  return frame ? { width: frame.width, height: frame.height } : null;
}

/** Keyboard corners move in the arrow direction while the opposite edges stay fixed. */
export function canvasTextNodeFrameForKey(frame, corner, key, largeStep = false) {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) return null;
  const step = largeStep ? 40 : 10;
  const currentWidth = Number.isFinite(frame.width) && frame.width > 0 ? frame.width : 360;
  const currentHeight = Number.isFinite(frame.height) && frame.height > 0 ? frame.height : 260;
  const left = corner.endsWith("left"); const top = corner.startsWith("top");
  const dx = key === "ArrowRight" ? step : key === "ArrowLeft" ? -step : 0;
  const dy = key === "ArrowDown" ? step : key === "ArrowUp" ? -step : 0;
  const width = Math.max(CANVAS_TEXT_NODE_BOUNDS.minWidth, Math.min(CANVAS_TEXT_NODE_BOUNDS.maxWidth,
    currentWidth + (left ? -dx : dx)));
  const height = Math.max(CANVAS_TEXT_NODE_BOUNDS.minHeight, Math.min(CANVAS_TEXT_NODE_BOUNDS.maxHeight,
    currentHeight + (top ? -dy : dy)));
  return {
    x: frame.x + (left ? currentWidth - width : 0),
    y: frame.y + (top ? currentHeight - height : 0),
    width, height,
  };
}

export function isCanvasTextConnection(connection, nodes, edges) {
  const source = nodes.find((node) => node.id === connection.source);
  const target = nodes.find((node) => node.id === connection.target);
  return ["textEditor", "textGenerator"].includes(source?.type) && target?.type === "imageGenerator" &&
    connection.sourceHandle === "text" && ["reference", "text"].includes(connection.targetHandle) &&
    !edges.some((edge) => edge.source === source.id && edge.target === target.id && edge.sourceHandle === "text") &&
    !canvasConnectionCreatesCycle(connection, edges);
}

export function canvasConnectionCreatesCycle(connection, edges) {
  if (connection.source === connection.target) return true;
  const visited = new Set();
  const pending = [connection.target];
  while (pending.length) {
    const id = pending.pop();
    if (id === connection.source) return true;
    if (visited.has(id)) continue;
    visited.add(id);
    for (const edge of edges) if (edge.source === id) pending.push(edge.target);
  }
  return false;
}

export function isCanvasTextGenerationConnection(connection, nodes, edges) {
  const source = nodes.find((node) => node.id === connection.source);
  const target = nodes.find((node) => node.id === connection.target);
  if (!source || target?.type !== "textGenerator" || connection.targetHandle !== "reference" ||
      canvasConnectionCreatesCycle(connection, edges) || edges.some((edge) => edge.source === source.id && edge.target === target.id)) return false;
  const supported = ["textEditor", "textGenerator"].includes(source.type) && connection.sourceHandle === "text" ||
    ["sourceImage", "imageResult", "imageGenerator"].includes(source.type) && connection.sourceHandle === "reference" ||
    source.type === "sourceVideo" && connection.sourceHandle === "video";
  const incoming = edges.filter((edge) => edge.target === target.id);
  const media = incoming.filter((edge) => !["textEditor", "textGenerator"].includes(nodes.find((node) => node.id === edge.source)?.type));
  return supported && incoming.length < 20 &&
    (["textEditor", "textGenerator"].includes(source.type) || media.length < 10) &&
    (source.type !== "sourceVideo" || media.filter((edge) => nodes.find((node) => node.id === edge.source)?.type === "sourceVideo").length < 3);
}

/** Legacy text targets attach to the one visible input without changing identities. */
export function normalizeCanvasInputEdge(edge) {
  return edge.sourceHandle === "text" && edge.targetHandle === "text" ? { ...edge, targetHandle: "reference" } : edge;
}
