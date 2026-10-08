import type { Edge } from "@xyflow/react";
import type { CanvasNode } from "./canvas-workspace";
import { canvasTextGenerationInputs, type CanvasTextGenerationInput } from "./canvas-text-generation-input";
export type CanvasVideoConnectedInput = CanvasTextGenerationInput | { edgeId: string; nodeId: string; name: string; kind: "audio";
  audioAssetId?: string; previewUrl?: string; text?: undefined; media?: undefined; videoAssetId?: undefined; unavailable?: boolean };
/** Keep the visible edge order without changing text generation's supported media. */
export function canvasVideoInputs(nodes: readonly CanvasNode[], edges: readonly Edge[], targetId: string): CanvasVideoConnectedInput[] {
  const existing = new Map<string, CanvasVideoConnectedInput>(canvasTextGenerationInputs(nodes, edges, targetId).map((item) => [item.edgeId, item]));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const seen = new Set<string>();
  return edges.flatMap((edge): CanvasVideoConnectedInput[] => {
    if (edge.target !== targetId || seen.has(edge.source)) return [];
    seen.add(edge.source);
    const source = byId.get(edge.source);
    if (source?.type === "sourceAudio" && edge.sourceHandle === "audio") return [{ edgeId: edge.id, nodeId: source.id,
      kind: "audio", name: source.data.name, audioAssetId: source.data.assetId, previewUrl: source.data.sourceUrl,
      unavailable: !source.data.assetId || !source.data.sourceUrl }];
    const input = existing.get(edge.id); return input ? [input] : [];
  });
}
