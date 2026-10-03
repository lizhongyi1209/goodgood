import type { Edge, Viewport } from "@xyflow/react";

import { getCanvasProjectPages, type CanvasPageDocument, type CanvasProjectDocument, type CanvasProjectNode, type LegacyCanvasProjectDocument } from "@/shared/contracts/canvas-project";
import type { GenerationReference } from "@/shared/contracts/generation";
import type { GenerationJob } from "@/shared/contracts/generation";
import { privateImageUrls } from "@/shared/private-image-urls.mjs";
import type { CanvasNode } from "./canvas-workspace";
import { normalizeCanvasInputEdge } from "./canvas-text-input.mjs";
import { canvasGeneratorJobs } from "./canvas-image-prompt-batch.mjs";
import { canvasGeneratorSlots, canvasImageSlotFrozenInput } from "./canvas-image-slots.mjs";

export type SnapshotGeneratorDraft = CanvasPageDocument["generators"][string]["draft"];
export type SnapshotDirectReference = Readonly<{
  clientId: string;
  reference: GenerationReference;
  file?: File;
}>;

export function pendingCanvasProjectContent(document: CanvasProjectDocument): "materials" | "generation" | null {
  const pages = getCanvasProjectPages(document);
  if (pages.some((page) => page.nodes.some((node) => Boolean(node.pendingFileId)) ||
      Object.values(page.generators).some((generator) => Boolean(generator.pendingReferences?.length)))) {
    return "materials";
  }
  // A failed submission keeps its browser job for recovery. It is not a file
  // upload, and its prompt/settings are already part of the remote document.
  if (pages.some((page) => page.nodes.some((node) =>
      !node.imageSlots &&
      (node.jobIds ?? (node.jobId ? [node.jobId] : [])).some((id) => {
        const job = node.localJobs?.find((item) => item.id === id) ?? (node.localJob?.id === id ? node.localJob : undefined);
        return id.startsWith("pending_") && !(job && ["failed", "cancelled"].includes(job.state) &&
          job.error?.code !== "SUBMISSION_UNKNOWN");
      })))) {
    return "generation";
  }
  return null;
}

function positiveSize(value: unknown) {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) && number > 0 ? number : null;
}

function finiteMetadata(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function nodeGeometry(node: CanvasNode) {
  // React Flow resizes text nodes via width/height while their initial style stays unchanged.
  const width = positiveSize(["textEditor", "textGenerator"].includes(node.type ?? "") ? node.width ?? node.style?.width : node.style?.width ?? node.width);
  const height = positiveSize(["textEditor", "textGenerator"].includes(node.type ?? "") ? node.height ?? node.style?.height : node.style?.height ?? node.height);
  return width && height ? { width, height } : undefined;
}

function localJobWithoutEphemeralUrls(job: GenerationJob): GenerationJob {
  return {
    ...job,
    input: {
      ...job.input,
      references: job.input.references.map((reference) => ({ ...reference, url: "" })),
    },
    outputs: job.outputs.map((output) => ({ ...output,
      previewUrl: privateImageUrls("asset", output.id).previewUrl, detailUrl: undefined })),
  };
}

function persistNode(node: CanvasNode): CanvasProjectNode | null {
  if (!Number.isFinite(node.position.x) || !Number.isFinite(node.position.y)) return null;
  const base = { id: node.id, position: { ...node.position }, size: nodeGeometry(node) };
  if (node.type === "textEditor") return {
    ...base, type: "textEditor", markdown: node.data.markdown, text: node.data.text,
  };
  if (node.type === "textGenerator") return {
    ...base, type: "textGenerator", markdown: node.data.markdown, text: node.data.text,
    textGeneration: node.data.textGeneration,
  };
  if (node.type === "imageGenerator") {
    const jobs = canvasGeneratorJobs(node.data);
    return {
      ...base, type: "imageGenerator", sequence: node.data.sequence,
      ...(node.data.slots ? { imageSlots: canvasGeneratorSlots(node.data).map((slot) => ({
        id: slot.id, requestKey: slot.requestKey, retryOfJobId: slot.retryOfJobId,
        outputIndex: slot.outputIndex,
        ...(!slot.job.id.startsWith("pending_") ? { jobId: slot.job.id } : {}),
        input: canvasImageSlotFrozenInput(slot.job.input),
        ...(slot.job.id.startsWith("pending_") && slot.job.error ? { error: slot.job.error } : {}),
      })) } : {}),
      ...(jobs[0] ? { jobId: jobs[0].id,
        ...(jobs.length > 1
          ? { jobIds: jobs.map((job) => job.id), localJobs: jobs.map(localJobWithoutEphemeralUrls) }
          : { localJob: localJobWithoutEphemeralUrls(jobs[0]) }) } : {}),
    };
  }
  if (node.type === "sourceImage") return {
    ...base,
    type: "sourceImage",
    name: node.data.name,
    ...(node.data.assetId
      ? { asset: { id: node.data.assetId, kind: node.data.assetKind === "generated" ? "generated" as const : "reference" as const } }
      : { pendingFileId: node.id }),
    metadata: { pixelWidth: finiteMetadata(node.data.pixelWidth), pixelHeight: finiteMetadata(node.data.pixelHeight) },
  };
  if (node.type === "sourceVideo") return {
    ...base,
    type: "sourceVideo",
    name: node.data.name,
    ...(node.data.assetId ? { asset: { id: node.data.assetId, kind: "video" as const } } : { pendingFileId: node.id }),
    metadata: {
      pixelWidth: finiteMetadata(node.data.pixelWidth), pixelHeight: finiteMetadata(node.data.pixelHeight),
      durationSeconds: finiteMetadata(node.data.durationSeconds),
    },
  };
  if (node.type === "sourceAudio") return node.data.assetId
    ? { ...base, type: "sourceAudio", name: node.data.name, asset: { id: node.data.assetId, kind: "audio" } }
    : null;
  if (node.type === "imageResult") return {
    ...base,
    type: "imageResult",
    jobId: node.data.job.id,
    index: node.data.index,
    localJob: localJobWithoutEphemeralUrls(node.data.job),
  };
  return null;
}

export function snapshotCanvasProject(input: {
  nodes: readonly CanvasNode[];
  edges: readonly Edge[];
  draftsByGenerator: Record<string, SnapshotGeneratorDraft>;
  referencesByGenerator: Record<string, readonly SnapshotDirectReference[]>;
  convertedReferences: Record<string, GenerationReference>;
  viewport: Viewport;
}): LegacyCanvasProjectDocument {
  const nodes = input.nodes.map(persistNode).filter((item): item is CanvasProjectNode => item !== null);
  const ids = new Set(nodes.map((node) => node.id));
  const edges = input.edges
    .filter((edge) => ids.has(edge.source) && ids.has(edge.target))
    .map((edge) => normalizeCanvasInputEdge({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? null,
      targetHandle: edge.targetHandle ?? null,
    }));
  const generators: Record<string, CanvasPageDocument["generators"][string]> = {};
  for (const node of nodes) {
    if (node.type !== "imageGenerator") continue;
    const references = input.referencesByGenerator[node.id] ?? [];
    generators[node.id] = {
      draft: input.draftsByGenerator[node.id] ?? {
        prompt: "", modelKey: null, ratio: "adaptive", resolution: "2K", count: 1,
      },
      directReferenceIds: references
        .filter((item) => item.reference.status === "ready")
        .map((item) => item.reference.id),
      pendingReferences: references
        .filter((item) => item.reference.status !== "ready" && item.file)
        .map((item) => ({ id: item.clientId, name: item.reference.name })),
    };
  }
  const convertedReferences: Record<string, string> = {};
  const edgeIds = new Set(edges.map((edge) => edge.id));
  for (const [edgeId, reference] of Object.entries(input.convertedReferences)) {
    if (edgeIds.has(edgeId) && reference.status === "ready") convertedReferences[edgeId] = reference.id;
  }
  const viewport = input.viewport;
  return {
    schemaVersion: 1,
    nodes,
    edges,
    generators,
    convertedReferences,
    viewport: Number.isFinite(viewport.x) && Number.isFinite(viewport.y) && Number.isFinite(viewport.zoom)
      ? { x: viewport.x, y: viewport.y, zoom: viewport.zoom }
      : { x: 0, y: 0, zoom: 1 },
  };
}

function remoteCanvasPageDocument(document: CanvasPageDocument): CanvasPageDocument {
  const nodes = document.nodes.filter((node) =>
    node.type === "textEditor" || node.type === "textGenerator" ||
    node.type === "imageGenerator" ||
    node.type === "imageResult" && node.jobId && !node.jobId.startsWith("pending_") ||
    Boolean(node.asset?.id),
  ).map(({ pendingFileId: _pendingFileId, localJob: _localJob, localJobs: _localJobs, ...node }) => {
    if (node.type !== "imageGenerator") return node;
    if (!node.jobIds && !node.jobId?.startsWith("pending_")) return node;
    const jobIds = node.jobIds?.filter((id) => !id.startsWith("pending_"));
    return { ...node,
      jobId: jobIds?.[0] ?? (node.jobId?.startsWith("pending_") ? undefined : node.jobId),
      ...(node.jobIds ? { jobIds: jobIds?.length ? jobIds : undefined } : {}),
    };
  });
  const ids = new Set(nodes.map((node) => node.id));
  const edges = document.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));
  const generators = Object.fromEntries(Object.entries(document.generators)
    .filter(([id]) => ids.has(id))
    .map(([id, { pendingReferences: _pendingReferences, ...generator }]) => [id, generator]));
  const edgeIds = new Set(edges.map((edge) => edge.id));
  const convertedReferences = Object.fromEntries(Object.entries(document.convertedReferences ?? {})
    .filter(([edgeId]) => edgeIds.has(edgeId)));
  return { ...document, nodes, edges, generators, convertedReferences };
}

export function remoteCanvasProjectDocument(document: CanvasProjectDocument): CanvasProjectDocument {
  if (document.schemaVersion === 1) return { ...remoteCanvasPageDocument(document), schemaVersion: 1 };
  return { schemaVersion: 2, pages: document.pages.map((page) => ({
    ...remoteCanvasPageDocument(page), id: page.id, name: page.name,
  })) };
}
