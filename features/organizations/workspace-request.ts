export function workspaceRequestHeaders(
  workspaceId: string | null | undefined,
): Readonly<Record<string, string>> {
  return workspaceId ? { "x-goodgood-workspace-id": workspaceId } : {};
}
