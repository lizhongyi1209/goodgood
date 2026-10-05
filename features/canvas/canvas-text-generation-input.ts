import type { CanvasNode } from "./canvas-workspace";
import type { Edge } from "@xyflow/react";
import type { TextGenerationMedia } from "./http-text-generation";
import { collectCanvasTextInputs } from "./canvas-text-input.mjs";
import { canvasGeneratorOutputs } from "./canvas-image-prompt-batch.mjs";

export type CanvasTextGenerationInput = { edgeId: string; nodeId: string; name: string; kind: "text" | "image" | "video";
  previewUrl?: string; text?: string; media?: Exclude<TextGenerationMedia, { kind: "video" }>;
  videoAssetId?: string; unavailable?: boolean };
export function canvasTextGenerationInputs(nodes: readonly CanvasNode[], edges: readonly Edge[], targetId: string): CanvasTextGenerationInput[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const texts = new Map(collectCanvasTextInputs(nodes, edges, targetId).map((item) => [item.edgeId, item]));
  const seen = new Set<string>();
  return edges.flatMap((edge): CanvasTextGenerationInput[] => {
    if (edge.target !== targetId || seen.has(edge.source)) return [];
    seen.add(edge.source);
    const source = byId.get(edge.source);
    if (!source) return [];
    const base = { edgeId: edge.id, nodeId: source.id };
    if (source.type === "textEditor" || source.type === "textGenerator") {
      const sequence = nodes.filter((node) => node.type === source.type).findIndex((node) => node.id === source.id) + 1;
      return [{ ...base, kind: "text", name: `${source.type === "textEditor" ? "文本编辑" : "提示词反推"} ${sequence}`,
        text: texts.get(edge.id)?.text ?? "", unavailable: source.type === "textGenerator" && Boolean(source.data.generating || source.data.textGeneration.pendingRequestId) }];
    }
    if (source.type === "sourceVideo") return [{ ...base, kind: "video", name: source.data.name, previewUrl: source.data.previewUrl,
      videoAssetId: source.data.assetId, unavailable: !source.data.assetId || Boolean(source.data.uploadState) || !source.data.previewUrl }];
    if (source.type === "videoGenerator") return [{ ...base, kind: "video", name: "视频生成", previewUrl: source.data.previewUrl,
      videoAssetId: source.data.outputAssetId, unavailable: !source.data.outputAssetId || !source.data.previewUrl || Boolean(source.data.job && source.data.job.state !== "succeeded") }];
    if (source.type === "sourceImage") return [{ ...base, kind: "image", name: source.data.name, previewUrl: source.data.previewUrl,
      media: source.data.assetId ? { kind: "image", assetKind: source.data.assetKind === "generated" ? "generated" : "reference", assetId: source.data.assetId } : undefined,
      unavailable: !source.data.assetId || Boolean(source.data.uploadState) }];
    if (source.type === "imageGenerator" || source.type === "imageResult") {
      const output = source.type === "imageGenerator" ? canvasGeneratorOutputs(source.data)[0]
        : source.data.job.state === "succeeded" ? source.data.job.outputs[source.data.index] : undefined;
      return [{ ...base, kind: "image", name: "图片生成", previewUrl: output?.previewUrl,
        media: output ? { kind: "image", assetKind: "generated", assetId: output.id } : undefined, unavailable: !output }];
    }
    return [];
  });
}
