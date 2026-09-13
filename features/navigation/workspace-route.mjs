export const WORKSPACE_NAVIGATION_EVENT = "goodgood:workspace-navigation";

/**
 * @typedef {{ kind: "create" } | { kind: "projects" } | { kind: "project", projectId: string } | { kind: "assets" } | { kind: "asset", assetId: string } | { kind: "credits" } | { kind: "distribution", tab?: "transfers" } | { kind: "enterpriseAccounts", tab: "accounts" | "transfers" } | { kind: "organizations", organizationId?: string, tab?: "overview" | "members" | "usage" | "assets" }} WorkspaceRoute
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
  if (normalized === "/credits") return { kind: "credits" };
  if (normalized === "/distribution") return { kind: "distribution" };
  if (normalized === "/distribution/transfers") return { kind: "distribution", tab: "transfers" };
  if (normalized === "/organizations/accounts") return { kind: "enterpriseAccounts", tab: "accounts" };
  if (normalized === "/organizations/transfers") return { kind: "enterpriseAccounts", tab: "transfers" };
  if (normalized === "/organizations") return { kind: "organizations" };
  const organizationMatch = normalized.match(/^\/organizations\/([^/]+)(?:\/(members|usage|assets))?$/);
  if (organizationMatch) {
    try {
      const organizationId = decodeURIComponent(organizationMatch[1]).trim();
      return organizationId ? { kind: "organizations", organizationId,
        tab: /** @type {"overview" | "members" | "usage" | "assets"} */ (organizationMatch[2] ?? "overview") } : { kind: "create" };
    } catch { return { kind: "create" }; }
  }
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
  if (route.kind === "credits") return "/credits";
  if (route.kind === "distribution") return route.tab === "transfers" ? "/distribution/transfers" : "/distribution";
  if (route.kind === "enterpriseAccounts") return `/organizations/${route.tab}`;
  if (route.kind === "organizations") {
    if (!route.organizationId) return "/organizations";
    const root = `/organizations/${encodeURIComponent(route.organizationId)}`;
    return route.tab && route.tab !== "overview" ? `${root}/${route.tab}` : root;
  }
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
