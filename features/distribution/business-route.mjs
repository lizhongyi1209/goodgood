/**
 * @param {import("../navigation/workspace-route.mjs").WorkspaceRoute} route
 * @param {"enterprise" | "distributor" | null | undefined} businessRole
 * @returns {import("../navigation/workspace-route.mjs").WorkspaceRoute}
 */
export function canonicalBusinessRoute(route, businessRole) {
  return businessRole === "enterprise" && route.kind === "distribution"
    ? { kind: "enterpriseAccounts", tab: route.tab === "transfers" ? "transfers" : "accounts" }
    : route;
}
