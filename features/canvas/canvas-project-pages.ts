import type { Edge, Viewport } from "@xyflow/react";
import { CANVAS_PROJECT_DEFAULT_PAGE_ID, CANVAS_PROJECT_DEFAULT_PAGE_NAME, type CanvasProjectDocument } from "@/shared/contracts/canvas-project";
import type { CanvasNode } from "./canvas-workspace";
import { canvasGeneratorJobs, canvasImageJobIsActive } from "./canvas-image-prompt-batch.mjs";

export type CanvasRuntimePage = {
  id: string;
  name: string;
  nodes: CanvasNode[];
  edges: Edge[];
  // The durable initial view stays fixed. Subsequent navigation is a local preference.
  viewport: Viewport;
};

export function emptyCanvasRuntimePage(id = CANVAS_PROJECT_DEFAULT_PAGE_ID, name = CANVAS_PROJECT_DEFAULT_PAGE_NAME): CanvasRuntimePage {
  return { id, name, nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
}

export function nextCanvasPageName(pages: readonly Pick<CanvasRuntimePage, "name">[]) {
  const names = new Set(pages.map((page) => page.name));
  let number = 1;
  while (names.has(`页面${number}`)) number += 1;
  return `页面${number}`;
}

export function canvasPageHasActiveWork(page: CanvasRuntimePage, options: {
  busyGeneratorIds: ReadonlySet<string>;
  uploadingNodeIds: ReadonlySet<string>;
  referenceStatuses: Readonly<Record<string, readonly { reference: { status: string } }[]>>;
  convertingEdgeIds: ReadonlySet<string>;
}) {
  return page.nodes.some((node) => options.uploadingNodeIds.has(node.id) || options.busyGeneratorIds.has(node.id) ||
    node.type === "textGenerator" && Boolean(node.data.generating || node.data.textGeneration.pendingRequestId) ||
    (node.type === "sourceImage" || node.type === "sourceVideo") && node.data.uploadState === "uploading" ||
    (node.type === "imageGenerator" || node.type === "imageResult") &&
      canvasGeneratorJobs(node.data).some((job) => canvasImageJobIsActive(job) ||
        job.id.startsWith("pending_") && job.error?.code === "SUBMISSION_UNKNOWN") ||
    (options.referenceStatuses[node.id] ?? []).some((item) => item.reference.status === "uploading")) ||
    page.edges.some((edge) => options.convertingEdgeIds.has(edge.id));
}

export function pagedCanvasProjectDocument(pages: readonly import("@/shared/contracts/canvas-project").CanvasProjectPage[]): CanvasProjectDocument {
  // The sync controller compares canonical page content. An unchanged legacy
  // document stays untouched; its first actual edit writes the v2 envelope.
  return { schemaVersion: 2, pages };
}
