import { getAuthenticationRuntime } from "@/server/auth/runtime-operations.mjs";
import {
  createOrganizationCreditGrant,
  createOrganizationInvitation,
  organizationApiError,
  readOrganizationAssetDownloadUrl,
  readOrganizationAssets,
  readOrganizationDashboard,
  readOrganizationUsage,
  revokeInvitation,
  updateOrganizationMember,
  updateOrganizationMemberBudget,
} from "@/server/organizations/api.mjs";
import { OrganizationError } from "@/server/organizations/errors.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = Readonly<{
  params: Promise<Readonly<{ path: string[] }>>;
}>;

function requireAction(request: Request) {
  if (request.headers.get("x-goodgood-organization-action") !== "1") {
    throw new OrganizationError(
      "ORGANIZATION_CSRF_CHECK_FAILED",
      "企业管理请求未通过安全校验，请刷新后重试。",
      403,
    );
  }
}

async function ownerContext(request: Request) {
  const { authenticate } = await getAuthenticationRuntime();
  return authenticate(request);
}

function responseFor(error: unknown) {
  const failure = organizationApiError(
    error instanceof SyntaxError
      ? new OrganizationError(
          "ORGANIZATION_REQUEST_INVALID",
          "企业管理请求内容无效。",
          400,
        )
      : error,
  );
  return Response.json(failure.body, {
    headers: { "cache-control": "no-store" },
    status: failure.status,
  });
}

export async function GET(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const [workspaceId, section, assetId, action] = path;
  try {
    if (
      path.length === 4 &&
      section === "assets" &&
      action === "download-url"
    ) {
      requireAction(request);
    }
    const owner = await ownerContext(request);
    let result;
    if (path.length === 1) {
      result = await readOrganizationDashboard({ ownerContext: owner, workspaceId });
    } else if (path.length === 2 && section === "usage") {
      result = await readOrganizationUsage({ ownerContext: owner, workspaceId });
    } else if (path.length === 2 && section === "assets") {
      result = await readOrganizationAssets({ ownerContext: owner, workspaceId });
    } else if (
      path.length === 4 &&
      section === "assets" &&
      action === "download-url"
    ) {
      result = await readOrganizationAssetDownloadUrl({
        assetId,
        idempotencyKey: request.headers.get("idempotency-key"),
        ownerContext: owner,
        workspaceId,
      });
    } else {
      throw new OrganizationError(
        "ORGANIZATION_REQUEST_INVALID",
        "企业接口路径无效。",
        404,
      );
    }
    return Response.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return responseFor(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const [workspaceId, section, invitationId, action] = path;
  try {
    requireAction(request);
    const owner = await ownerContext(request);
    const input = await request.json();
    let result;
    if (path.length === 2 && section === "invitations") {
      result = await createOrganizationInvitation({
        idempotencyKey: request.headers.get("idempotency-key"),
        input,
        ownerContext: owner,
        workspaceId,
      });
    } else if (path.length === 2 && section === "credit-grants") {
      result = await createOrganizationCreditGrant({
        idempotencyKey: request.headers.get("idempotency-key"),
        input,
        ownerContext: owner,
        workspaceId,
      });
    } else if (
      path.length === 4 &&
      section === "invitations" &&
      action === "revoke"
    ) {
      result = await revokeInvitation({
        idempotencyKey: request.headers.get("idempotency-key"),
        input,
        invitationId,
        ownerContext: owner,
        workspaceId,
      });
    } else {
      throw new OrganizationError(
        "ORGANIZATION_REQUEST_INVALID",
        "企业接口路径无效。",
        404,
      );
    }
    return Response.json(result, {
      headers: { "cache-control": "no-store" },
      status: result.created ? 201 : 200,
    });
  } catch (error) {
    return responseFor(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const [workspaceId, section, membershipId] = path;
  try {
    requireAction(request);
    if (path.length !== 3 || section !== "members") {
      throw new OrganizationError(
        "ORGANIZATION_REQUEST_INVALID",
        "企业接口路径无效。",
        404,
      );
    }
    const result = await updateOrganizationMember({
      idempotencyKey: request.headers.get("idempotency-key"),
      input: await request.json(),
      membershipId,
      ownerContext: await ownerContext(request),
      workspaceId,
    });
    return Response.json(result, {
      headers: { "cache-control": "no-store" },
      status: result.created ? 201 : 200,
    });
  } catch (error) {
    return responseFor(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const [workspaceId, section, membershipId, action] = path;
  try {
    requireAction(request);
    if (path.length !== 4 || section !== "members" || action !== "budget") {
      throw new OrganizationError(
        "ORGANIZATION_REQUEST_INVALID",
        "企业接口路径无效。",
        404,
      );
    }
    const result = await updateOrganizationMemberBudget({
      idempotencyKey: request.headers.get("idempotency-key"),
      input: await request.json(),
      membershipId,
      ownerContext: await ownerContext(request),
      workspaceId,
    });
    return Response.json(result, {
      headers: { "cache-control": "no-store" },
      status: result.created ? 201 : 200,
    });
  } catch (error) {
    return responseFor(error);
  }
}
