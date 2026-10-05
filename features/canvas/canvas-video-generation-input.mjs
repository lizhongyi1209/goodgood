import { canvasConnectionCreatesCycle } from "./canvas-text-input.mjs";
export function isCanvasVideoGenerationConnection(connection, nodes, edges) {
  const source = nodes.find((node) => node.id === connection.source); const target = nodes.find((node) => node.id === connection.target);
  if (!source || target?.type !== "videoGenerator" || connection.targetHandle !== "reference" || canvasConnectionCreatesCycle(connection, edges) || edges.some((edge) => edge.source === source.id && edge.target === target.id)) return false;
  const text = ["textEditor", "textGenerator"].includes(source.type);
  const video = ["sourceVideo", "videoGenerator"].includes(source.type);
  const supported = text && connection.sourceHandle === "text" || video && connection.sourceHandle === "video" || ["sourceImage", "imageResult", "imageGenerator"].includes(source.type) && connection.sourceHandle === "reference";
  const incoming = edges.filter((edge) => edge.target === target.id); const media = incoming.filter((edge) => !["textEditor", "textGenerator"].includes(nodes.find((node) => node.id === edge.source)?.type));
  return supported && incoming.length < 20 && (text || media.length < 8) && (!video || !media.some((edge) => ["sourceVideo", "videoGenerator"].includes(nodes.find((node) => node.id === edge.source)?.type)));
}
