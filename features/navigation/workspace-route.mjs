export const WORKSPACE_NAVIGATION_EVENT = "goodgood:workspace-navigation";

/**
 * @typedef {{ kind: "create" } | { kind: "projects" } | { kind: "project", projectId: string } | { kind: "assets" } | { kind: "asset", assetId: string }} WorkspaceRoute
 */

/**
 * @param {string} pathname
 * @returns {WorkspaceRoute}
 */
export function parseWorkspaceRoute(pathname) {
  const normalized = pathname.length > 1
    ? pathname.replace(/\/+$/, "")
    : pathname;
  if (normalized === "/" || normalized === "/create") {
    return { kind: "create" };
  }
  if (normalized === "/projects") return { kind: "projects" };
  const projectMatch = normalized.match(/^\/projects\/([^/]+)$/);
  if (projectMatch) {
    try {
      const projectId = decodeURIComponent(projectMatch[1]).trim();
      return projectId ? { kind: "project", projectId } : { kind: "create" };
    } catch {
      return { kind: "create" };
    }
  }
  if (normalized === "/assets") return { kind: "assets" };
  const assetMatch = normalized.match(/^\/assets\/([^/]+)$/);
  if (!assetMatch) return { kind: "create" };
  try {
    const assetId = decodeURIComponent(assetMatch[1]).trim();
    return assetId ? { kind: "asset", assetId } : { kind: "create" };
  } catch {
    return { kind: "create" };
  }
}

/**
 * @param {WorkspaceRoute} route
 */
export function workspaceRouteHref(route) {
  if (route.kind === "projects") return "/projects";
  if (route.kind === "project") {
    return `/projects/${encodeURIComponent(route.projectId)}`;
  }
  if (route.kind === "assets") return "/assets";
  if (route.kind === "asset") {
    return `/assets/${encodeURIComponent(route.assetId)}`;
  }
  return "/create";
}

/**
 * @param {WorkspaceRoute} route
 * @param {{ notify?: boolean, replace?: boolean, state?: unknown }} [options]
 */
export function navigateWorkspace(route, options = {}) {
  const href = workspaceRouteHref(route);
  if (window.location.pathname !== href) {
    const method = options.replace ? "replaceState" : "pushState";
    window.history[method](options.state ?? window.history.state, "", href);
  }
  if (options.notify !== false) {
    window.dispatchEvent(new Event(WORKSPACE_NAVIGATION_EVENT));
  }
}
