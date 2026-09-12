import {
  acceptInvitation,
  createOrganizationCreditGrant,
  createOrganizationInvitation,
  createOrganizationWorkspace,
  organizationApiError,
  readOrganizationAssetDownloadUrl,
  readOrganizationAssets,
  readOrganizationDashboard,
  readOrganizationUsage,
  readWorkspaceDirectory,
  revokeInvitation,
  updateOrganizationMember,
  updateOrganizationMemberBudget,
} from "./api.mjs";
import { OrganizationError } from "./errors.mjs";
import { organizationActionRequested } from "./request.mjs";
import { requestIdFor } from "../observability/http.mjs";

const JSON_HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
};

const DEFAULT_OPERATIONS = Object.freeze({
  acceptInvitation,
  createOrganizationCreditGrant,
  createOrganizationInvitation,
  createOrganizationWorkspace,
  readOrganizationAssetDownloadUrl,
  readOrganizationAssets,
  readOrganizationDashboard,
  readOrganizationUsage,
  readWorkspaceDirectory,
  revokeInvitation,
  updateOrganizationMember,
  updateOrganizationMemberBudget,
});

function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, { ...JSON_HEADERS, ...headers });
  response.end(JSON.stringify(payload));
}

function headerValue(headers, name) {
  const value = headers?.[name] ?? headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 64 * 1024) {
      throw new OrganizationError(
        "ORGANIZATION_REQUEST_INVALID",
        "企业管理请求内容过大。",
        400,
      );
    }
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new OrganizationError(
      "ORGANIZATION_REQUEST_INVALID",
      "企业管理请求内容无效。",
      400,
    );
  }
}

function requireAction(request) {
  if (!organizationActionRequested(request)) {
    throw new OrganizationError(
      "ORGANIZATION_CSRF_CHECK_FAILED",
      "企业管理请求未通过安全校验，请刷新后重试。",
      403,
    );
  }
}

export function createOrganizationNodeApiHandler({
  authenticate,
  operations = DEFAULT_OPERATIONS,
}) {
  if (typeof authenticate !== "function") {
    throw new Error("An authenticated owner resolver is required.");
  }

  return async function handleOrganizationNodeApi(request, response) {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (
      url.pathname !== "/api/workspaces" &&
      !url.pathname.startsWith("/api/organizations") &&
      !url.pathname.startsWith("/api/organization-invitations/")
    ) {
      return false;
    }

    try {
      const assetDownloadRequested =
        request.method === "GET" &&
        /^\/api\/organizations\/[^/]+\/assets\/[^/]+\/download-url$/.test(
          url.pathname,
        );
      if (request.method !== "GET" || assetDownloadRequested) {
        requireAction(request);
      }
      const ownerContext = await authenticate(request);
      const idempotencyKey = headerValue(request.headers, "idempotency-key");

      if (url.pathname === "/api/workspaces" && request.method === "GET") {
        sendJson(response, 200, await operations.readWorkspaceDirectory({ ownerContext }));
        return true;
      }
      if (url.pathname === "/api/organizations" && request.method === "POST") {
        const result = await operations.createOrganizationWorkspace({
          idempotencyKey,
          input: await readJson(request),
          ownerContext,
        });
        sendJson(response, result.created ? 201 : 200, result);
        return true;
      }

      const acceptMatch =
        /^\/api\/organization-invitations\/([^/]+)\/accept$/.exec(url.pathname);
      if (acceptMatch && request.method === "POST") {
        const result = await operations.acceptInvitation({
          idempotencyKey,
          invitationId: decodeURIComponent(acceptMatch[1]),
          ownerContext,
        });
        sendJson(response, result.created ? 201 : 200, result);
        return true;
      }

      const assetDownloadMatch =
        /^\/api\/organizations\/([^/]+)\/assets\/([^/]+)\/download-url$/.exec(
          url.pathname,
      );
      if (assetDownloadMatch && request.method === "GET") {
        sendJson(
          response,
          200,
          await operations.readOrganizationAssetDownloadUrl({
            assetId: decodeURIComponent(assetDownloadMatch[2]),
            idempotencyKey,
            ownerContext,
            workspaceId: decodeURIComponent(assetDownloadMatch[1]),
          }),
        );
        return true;
      }

      const invitationRevokeMatch =
        /^\/api\/organizations\/([^/]+)\/invitations\/([^/]+)\/revoke$/.exec(
          url.pathname,
      );
      if (invitationRevokeMatch && request.method === "POST") {
        const result = await operations.revokeInvitation({
          idempotencyKey,
          input: await readJson(request),
          invitationId: decodeURIComponent(invitationRevokeMatch[2]),
          ownerContext,
          workspaceId: decodeURIComponent(invitationRevokeMatch[1]),
        });
        sendJson(response, result.created ? 201 : 200, result);
        return true;
      }

      const memberBudgetMatch =
        /^\/api\/organizations\/([^/]+)\/members\/([^/]+)\/budget$/.exec(
          url.pathname,
      );
      if (memberBudgetMatch && request.method === "PUT") {
        const result = await operations.updateOrganizationMemberBudget({
          idempotencyKey,
          input: await readJson(request),
          membershipId: decodeURIComponent(memberBudgetMatch[2]),
          ownerContext,
          workspaceId: decodeURIComponent(memberBudgetMatch[1]),
        });
        sendJson(response, result.created ? 201 : 200, result);
        return true;
      }

      const memberMatch =
        /^\/api\/organizations\/([^/]+)\/members\/([^/]+)$/.exec(url.pathname);
      if (memberMatch && request.method === "PATCH") {
        const result = await operations.updateOrganizationMember({
          idempotencyKey,
          input: await readJson(request),
          membershipId: decodeURIComponent(memberMatch[2]),
          ownerContext,
          workspaceId: decodeURIComponent(memberMatch[1]),
        });
        sendJson(response, result.created ? 201 : 200, result);
        return true;
      }

      const organizationMatch =
        /^\/api\/organizations\/([^/]+)(?:\/(invitations|credit-grants|usage|assets))?$/.exec(
          url.pathname,
        );
      if (organizationMatch) {
        const workspaceId = decodeURIComponent(organizationMatch[1]);
        const child = organizationMatch[2] ?? null;
        if (!child && request.method === "GET") {
          sendJson(
            response,
            200,
            await operations.readOrganizationDashboard({ ownerContext, workspaceId }),
          );
          return true;
        }
        if (child === "invitations" && request.method === "POST") {
          const result = await operations.createOrganizationInvitation({
            idempotencyKey,
            input: await readJson(request),
            ownerContext,
            workspaceId,
          });
          sendJson(response, result.created ? 201 : 200, result);
          return true;
        }
        if (child === "credit-grants" && request.method === "POST") {
          const result = await operations.createOrganizationCreditGrant({
            idempotencyKey,
            input: await readJson(request),
            ownerContext,
            workspaceId,
          });
          sendJson(response, result.created ? 201 : 200, result);
          return true;
        }
        if (child === "usage" && request.method === "GET") {
          sendJson(
            response,
            200,
            await operations.readOrganizationUsage({ ownerContext, workspaceId }),
          );
          return true;
        }
        if (child === "assets" && request.method === "GET") {
          sendJson(
            response,
            200,
            await operations.readOrganizationAssets({ ownerContext, workspaceId }),
          );
          return true;
        }
      }

      sendJson(
        response,
        405,
        { error: "method_not_allowed" },
        { allow: "GET, POST, PATCH, PUT" },
      );
      return true;
    } catch (error) {
      const failure = organizationApiError(error, requestIdFor(request));
      sendJson(response, failure.status, failure.body);
      return true;
    }
  };
}
