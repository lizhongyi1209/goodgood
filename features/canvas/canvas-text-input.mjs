export const CANVAS_TEXT_MAX_LENGTH = 16_000;
export const CANVAS_MARKDOWN_MAX_LENGTH = 100_000;
export const CANVAS_PROMPT_MAX_LENGTH = 4_000;

/** Edge order is the persisted input order; image references never enter prompts. */
export function collectCanvasTextInputs(nodes, edges, generatorId) {
  if (!generatorId) return [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const seen = new Set();
  return edges.flatMap((edge) => {
    const node = byId.get(edge.source);
    if (edge.target !== generatorId || edge.sourceHandle !== "text" || !["reference", "text"].includes(edge.targetHandle) ||
        node?.type !== "textEditor" || seen.has(node.id) || !node.data.text?.trim()) return [];
    seen.add(node.id);
    return [{ edgeId: edge.id, nodeId: node.id, text: node.data.text, markdown: node.data.markdown ?? "" }];
  });
}

export function combineCanvasPrompt(inputs, additionalPrompt) {
  return [...inputs.map((input) => input.text), additionalPrompt]
    .map((text) => text.trim()).filter(Boolean).join("\n\n");
}

export function canvasTextFontSize(width, height) {
  const scale = Math.min((width || 360) / 360, (height || 260) / 260);
  return Math.max(12, Math.min(24, 14 * scale));
}

export function isCanvasTextConnection(connection, nodes, edges) {
  const source = nodes.find((node) => node.id === connection.source);
  const target = nodes.find((node) => node.id === connection.target);
  return source?.type === "textEditor" && target?.type === "imageGenerator" &&
    connection.sourceHandle === "text" && ["reference", "text"].includes(connection.targetHandle) &&
    !edges.some((edge) => edge.source === source.id && edge.target === target.id && edge.sourceHandle === "text");
}

/** Legacy text targets attach to the one visible input without changing identities. */
export function normalizeCanvasInputEdge(edge) {
  return edge.sourceHandle === "text" && edge.targetHandle === "text" ? { ...edge, targetHandle: "reference" } : edge;
}
