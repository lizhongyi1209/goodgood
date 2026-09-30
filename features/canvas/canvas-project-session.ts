import type { Viewport } from "@xyflow/react";

const VIEWPORT_KEY = "goodgood.canvas.viewport.v1";

function key(ownerKey: string, projectId: string, pageId?: string) {
  return `${VIEWPORT_KEY}:${ownerKey}:${projectId}${pageId ? `:${pageId}` : ""}`;
}

function validViewport(value: unknown): value is Viewport {
  if (!value || typeof value !== "object") return false;
  const viewport = value as Partial<Viewport>;
  return typeof viewport.x === "number" && Number.isFinite(viewport.x) && Math.abs(viewport.x) <= 10_000_000 &&
    typeof viewport.y === "number" && Number.isFinite(viewport.y) && Math.abs(viewport.y) <= 10_000_000 &&
    typeof viewport.zoom === "number" && Number.isFinite(viewport.zoom) && viewport.zoom >= 0.1 && viewport.zoom <= 8;
}

export function readCanvasViewport(ownerKey: string, projectId: string, pageId?: string): Viewport | null {
  try {
    const stored = localStorage.getItem(key(ownerKey, projectId, pageId)) ??
      (pageId === "page-1" ? localStorage.getItem(key(ownerKey, projectId)) : null);
    if (!stored) return null;
    const value: unknown = JSON.parse(stored);
    return validViewport(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveCanvasViewport(ownerKey: string, projectId: string, viewport: Viewport, pageId?: string): void {
  if (!validViewport(viewport)) return;
  try {
    localStorage.setItem(key(ownerKey, projectId, pageId), JSON.stringify(viewport));
  } catch {
    // A view preference cannot prevent project content from being saved.
  }
}

export function readCanvasActivePage(ownerKey: string, projectId: string): string | null {
  try { return localStorage.getItem(`goodgood.canvas.active-page.v1:${ownerKey}:${projectId}`); }
  catch { return null; }
}

export function saveCanvasActivePage(ownerKey: string, projectId: string, pageId: string): void {
  try { localStorage.setItem(`goodgood.canvas.active-page.v1:${ownerKey}:${projectId}`, pageId); }
  catch { /* A local view preference cannot prevent content from being saved. */ }
}
