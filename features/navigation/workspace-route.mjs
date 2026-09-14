export const WORKSPACE_NAVIGATION_EVENT = "goodgood:workspace-navigation";

/**
 * @typedef {{ kind: "create" } | { kind: "profile" } | { kind: "inspiration" } | { kind: "inspirationEdit", assetId: string } | { kind: "inspirationUse", caseId: string } | { kind: "projects" } | { kind: "project", projectId: string } | { kind: "assets" } | { kind: "asset", assetId: string } | { kind: "credits" } | { kind: "jcoin" } | { kind: "feedback" } | { kind: "distribution", tab?: "transfers" } | { kind: "admin", tab: "models" | "users" | "audit" | "operations" | "logs" | "jcoin" | "feedback" } | { kind: "enterpriseAccounts", tab: "accounts" | "transfers" } | { kind: "organizations", organizationId?: string, tab?: "overview" | "members" | "usage" | "assets" }} WorkspaceRoute
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
  const inspirationMatch=normalized.match(/^\/inspiration\/(edit|use)\/([0-9a-f-]{36})$/i);
  if(inspirationMatch) return inspirationMatch[1]==='edit'?{kind:'inspirationEdit',assetId:inspirationMatch[2]}:{kind:'inspirationUse',caseId:inspirationMatch[2]};
  if (normalized === "/inspiration") return { kind: "inspiration" };
  if (normalized === "/profile") return { kind: "profile" };
  if (normalized === "/assets") return { kind: "assets" };
  if (normalized === "/credits") return { kind: "credits" };
  if (normalized === "/feedback") return { kind: "feedback" };
  if (normalized === "/admin/feedback") return { kind: "admin", tab: "feedback" };
  if (normalized === "/jcoin") return { kind: "jcoin" };
  if (normalized === "/admin/jcoin") return { kind: "admin", tab: "jcoin" };
  if (normalized === "/admin/models") return { kind: "admin", tab: "models" };
  if (normalized === "/admin/users") return { kind: "admin", tab: "users" };
  if (normalized === "/admin/audit") return { kind: "admin", tab: "audit" };
  if (normalized === "/admin/operations") return { kind: "admin", tab: "operations" };
  if (normalized === "/admin/logs") return { kind: "admin", tab: "logs" };
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
  if(route.kind==='inspirationEdit') return '/inspiration/edit/'+encodeURIComponent(route.assetId);
  if(route.kind==='inspirationUse') return '/inspiration/use/'+encodeURIComponent(route.caseId);
  if (route.kind === "inspiration") return "/inspiration";
  if (route.kind === "profile") return "/profile";
  if (route.kind === "assets") return "/assets";
  if (route.kind === "credits") return "/credits";
  if (route.kind === "feedback") return "/feedback";
  if (route.kind === "jcoin") return "/jcoin";
  if (route.kind === "admin") return `/admin/${route.tab}`;
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
