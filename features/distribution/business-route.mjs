/**
 * @param {import("../navigation/workspace-route.mjs").WorkspaceRoute} route
 * @param {"enterprise" | "distributor" | null | undefined} businessRole
 * @returns {import("../navigation/workspace-route.mjs").WorkspaceRoute}
 */
export function canonicalBusinessRoute(route, businessRole) {
  if (route.kind === "enterpriseAccounts") return businessRole === "distributor"
    ? route.tab === "transfers" ? { kind: "distribution", tab: "transfers" } : { kind: "distribution" }
    : { kind: "organizations" };
  return businessRole === "enterprise" && route.kind === "distribution" ? { kind: "organizations" } : route;
}
