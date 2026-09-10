import { OrganizationError } from "./errors.mjs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function headerValue(headers, name) {
  if (typeof headers?.get === "function") return headers.get(name);
  const value = headers?.[name] ?? headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

export function workspaceIdFromRequest(request) {
  const value = headerValue(request?.headers, "x-goodgood-workspace-id");
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new OrganizationError(
      "ORGANIZATION_REQUEST_INVALID",
      "工作区标识无效，请重新选择工作区。",
      400,
    );
  }
  return value.toLowerCase();
}

export function organizationActionRequested(request) {
  return headerValue(request?.headers, "x-goodgood-organization-action") === "1";
}
