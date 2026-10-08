import { seedanceVideoCapabilities } from "../../shared/contracts/seedance-video-generation.mjs";
import { canvasConnectionCreatesCycle } from "./canvas-text-input.mjs";
export function isCanvasVideoGenerationConnection(connection, nodes, edges) {
  const source = nodes.find((node) => node.id === connection.source); const target = nodes.find((node) => node.id === connection.target);
  if (!source || target?.type !== "videoGenerator" || connection.targetHandle !== "reference" || canvasConnectionCreatesCycle(connection, edges) || edges.some((edge) => edge.source === source.id && edge.target === target.id)) return false;
  const text = ["textEditor", "textGenerator"].includes(source.type);
  const video = ["sourceVideo", "videoGenerator"].includes(source.type);
  const audio = source.type === "sourceAudio";
  const cap = seedanceVideoCapabilities(target.data?.videoGeneration?.modelId);
  const supported = audio && Boolean(cap) && connection.sourceHandle === "audio" || text && connection.sourceHandle === "text" || video && connection.sourceHandle === "video" || ["sourceImage", "imageResult", "imageGenerator"].includes(source.type) && connection.sourceHandle === "reference";
  const incoming = edges.filter((edge) => edge.target === target.id); const media = incoming.filter((edge) => !["textEditor", "textGenerator"].includes(nodes.find((node) => node.id === edge.source)?.type));
  if (cap) {
    const kinds = new Map(nodes.map((node) => [node.id, ["sourceVideo", "videoGenerator"].includes(node.type) ? "video" : node.type === "sourceAudio" ? "audio" : "image"]));
    const kind = audio ? "audio" : video ? "video" : "image";
    const limit = { image: cap.maxImages, video: cap.maxVideos, audio: cap.maxAudios }[kind];
    const count = media.filter((edge) => kinds.get(edge.source) === kind).length + (target.data?.videoGeneration?.materials ?? []).filter((item) => item.kind === kind).length;
    return supported && incoming.length < 70 && (text || count < limit);
  }
  return supported && incoming.length < 20 && (text || media.length < 8) && (!video || !media.some((edge) => ["sourceVideo", "videoGenerator"].includes(nodes.find((node) => node.id === edge.source)?.type)));
}
