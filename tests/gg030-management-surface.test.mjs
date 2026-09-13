import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import test from "node:test";
import {
  createOrganizationWorkspace,
  readOrganizationDashboard,
  readWorkspaceDirectory,
} from "../server/organizations/api.mjs";
import { createOrganizationNodeApiHandler } from "../server/organizations/node-api.mjs";
import {
  organizationActionRequested,
  workspaceIdFromRequest,
} from "../server/organizations/request.mjs";

const SITE_OWNER_ID = "10000000-0000-4000-8000-000000000001";
const PRINCIPAL_ID = "10000000-0000-4000-8000-000000000002";
const WORKSPACE_ID = "20000000-0000-4000-8000-000000000001";
const MEMBERSHIP_ID = "30000000-0000-4000-8000-000000000001";
const EMPLOYEE_MEMBERSHIP_ID = "30000000-0000-4000-8000-000000000002";
const INVITATION_ID = "40000000-0000-4000-8000-000000000001";
const ASSET_ID = "50000000-0000-4000-8000-000000000001";

function requestFor({ body, headers = {}, method = "GET", url }) {
  const request = Readable.from(
    body === undefined ? [] : [Buffer.from(JSON.stringify(body))],
  );
  request.headers = headers;
  request.method = method;
  request.url = url;
  return request;
}

function responseFor() {
  return {
    body: "",
    headers: {},
    statusCode: 0,
    end(chunk = "") {
      this.body += chunk;
    },
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
  };
}

test("GG-030 workspace selectors accept only explicit UUIDs and action headers", () => {
  assert.equal(workspaceIdFromRequest({ headers: {} }), null);
  assert.equal(
    workspaceIdFromRequest({
      headers: new Headers({ "x-goodgood-workspace-id": WORKSPACE_ID.toUpperCase() }),
    }),
    WORKSPACE_ID,
  );
  assert.equal(
    organizationActionRequested({
      headers: { "x-goodgood-organization-action": "1" },
    }),
    true,
  );
  assert.throws(
    () =>
      workspaceIdFromRequest({
        headers: { "x-goodgood-workspace-id": "personal" },
      }),
    (error) =>
      error.code === "ORGANIZATION_REQUEST_INVALID" && error.status === 400,
  );
});

test("workspace directory and manager dashboard serialize credit without losing actor scope", async () => {
  const pool = {};
  const personal = {
    createdAt: "2026-09-10T00:00:00.000Z",
    id: "20000000-0000-4000-8000-000000000002",
    kind: "personal",
    membershipId: null,
    membershipStatus: null,
    name: "个人工作区",
    role: "personal_owner",
    status: "active",
  };
  const organization = {
    createdAt: "2026-09-10T00:00:00.000Z",
    id: WORKSPACE_ID,
    kind: "organization",
    membershipId: MEMBERSHIP_ID,
    membershipStatus: "active",
    name: "GoodGood 设计团队",
    role: "org_admin",
    status: "active",
  };
  const invitation = {
    email: "principal@example.com",
    id: INVITATION_ID,
    status: "pending",
    workspaceId: WORKSPACE_ID,
  };
  const credit = {
    account: {
      allocatedBalance: 400n,
      availableBalance: 900n,
      reservedBalance: 100n,
      status: "active",
      unallocatedBalance: 500n,
      version: 3n,
    },
    budget: {
      creditLimit: 400n,
      id: "60000000-0000-4000-8000-000000000001",
      membershipId: MEMBERSHIP_ID,
      remainingBalance: 250n,
      reservedUsage: 50n,
      settledUsage: 100n,
      status: "active",
      version: 2n,
    },
    membership: { id: MEMBERSHIP_ID, role: "org_admin" },
  };
  const repository = {
    async listOwnerWorkspaces(actualPool, ownerId) {
      assert.equal(actualPool, pool);
      assert.equal(ownerId, PRINCIPAL_ID);
      return [personal, organization];
    },
    async listPendingOrganizationInvitations(actualPool, ownerId) {
      assert.equal(actualPool, pool);
      assert.equal(ownerId, PRINCIPAL_ID);
      return [invitation];
    },
    async readOrganizationCreditSummary() {
      return credit;
    },
  };
  const directory = await readWorkspaceDirectory({
    ownerContext: { ownerId: PRINCIPAL_ID },
    repository,
    resources: { pool },
  });
  assert.equal(directory.workspaces[0].credit, null);
  assert.deepEqual(directory.workspaces[1].credit.account, {
    allocatedCredits: "400",
    availableCredits: "900",
    reservedCredits: "100",
    status: "active",
    unallocatedCredits: "500",
    version: "3",
  });
  assert.equal(directory.workspaces[1].credit.budget.remainingCredits, "250");
  assert.deepEqual(directory.invitations, [invitation]);

  const dashboard = await readOrganizationDashboard({
    ownerContext: { ownerId: PRINCIPAL_ID },
    repository: {
      async listOrganizationManagement() {
        return {
          invitations: [],
          members: [
            {
              email: "principal@example.com",
              id: MEMBERSHIP_ID,
              ownerId: PRINCIPAL_ID,
              role: "org_admin",
              status: "active",
              version: 1,
              workspaceId: WORKSPACE_ID,
            },
            {
              email: "employee@example.com",
              id: EMPLOYEE_MEMBERSHIP_ID,
              ownerId: SITE_OWNER_ID,
              role: "org_member",
              status: "active",
              version: 1,
              workspaceId: WORKSPACE_ID,
            },
          ],
          workspace: organization,
        };
      },
      async listOrganizationMemberBudgets() {
        return [
          {
            budgetId: credit.budget.id,
            budgetStatus: "active",
            creditLimit: 400n,
            membershipId: MEMBERSHIP_ID,
            remainingBalance: 250n,
            reservedUsage: 50n,
            settledUsage: 100n,
            version: 2n,
          },
        ];
      },
      async readOrganizationCreditSummary() {
        return credit;
      },
    },
    resources: { pool },
    workspaceId: WORKSPACE_ID,
  });
  assert.equal(dashboard.currentMembershipId, MEMBERSHIP_ID);
  assert.equal(dashboard.workspace.role, "org_admin");
  assert.equal(dashboard.members[0].budget.creditLimit, "400");
  assert.equal(dashboard.members[1].budget, null);
});

test("only the platform site owner can create an organization through the service boundary", async () => {
  let call;
  const repository = {
    async createOrganization(_pool, input) {
      call = input;
      return {
        created: true,
        workspace: { id: WORKSPACE_ID, kind: "organization", name: input.name },
      };
    },
  };
  const input = {
    initialOwnerId: PRINCIPAL_ID,
    name: " GoodGood Enterprise ",
    reason: " approved onboarding ",
  };
  await assert.rejects(
    createOrganizationWorkspace({
      idempotencyKey: "organization-create-unauthorized",
      input,
      ownerContext: { ownerId: PRINCIPAL_ID, systemRole: "standard" },
      repository,
      resources: { pool: {} },
    }),
    (error) => error.code === "WORKSPACE_ACCESS_DENIED" && error.status === 403,
  );
  const result = await createOrganizationWorkspace({
    idempotencyKey: "organization-create-authorized",
    input,
    ownerContext: { ownerId: SITE_OWNER_ID, systemRole: "site_owner" },
    repository,
    resources: { pool: {} },
  });
  assert.equal(result.created, true);
  assert.equal(call.actorOwnerId, SITE_OWNER_ID);
  assert.equal(call.initialOwnerId, PRINCIPAL_ID);
  assert.equal(call.name, "GoodGood Enterprise");
  assert.equal(call.reason, "approved onboarding");
  assert.match(call.operationHash, /^[0-9a-f]{64}$/);
});

test("organization Node routes fail closed on CSRF and preserve authenticated route identity", async () => {
  const calls = [];
  let authenticationCalls = 0;
  const handler = createOrganizationNodeApiHandler({
    authenticate: async () => {
      authenticationCalls += 1;
      return { ownerId: PRINCIPAL_ID, systemRole: "site_owner" };
    },
    operations: {
      async createOrganizationWorkspace(input) {
        calls.push({ name: "create", ...input });
        return { created: true, workspace: { id: WORKSPACE_ID } };
      },
      async readOrganizationAssetDownloadUrl(input) {
        calls.push({ name: "download", ...input });
        return { url: "https://storage.invalid/audited" };
      },
      async readOrganizationDashboard(input) {
        calls.push({ name: "dashboard", ...input });
        return { workspace: { id: input.workspaceId } };
      },
      async readWorkspaceDirectory(input) {
        calls.push({ name: "directory", ...input });
        return { invitations: [], workspaces: [] };
      },
    },
  });

  const missingCsrf = responseFor();
  assert.equal(
    await handler(
      requestFor({ body: {}, method: "POST", url: "/api/organizations" }),
      missingCsrf,
    ),
    true,
  );
  assert.equal(missingCsrf.statusCode, 403);
  assert.equal(JSON.parse(missingCsrf.body).error.code, "ORGANIZATION_CSRF_CHECK_FAILED");
  assert.equal(authenticationCalls, 0);

  const created = responseFor();
  await handler(
    requestFor({
      body: {
        initialOwnerId: PRINCIPAL_ID,
        name: "GoodGood Enterprise",
        reason: "approved onboarding",
      },
      headers: {
        "idempotency-key": "organization-create-request",
        "x-goodgood-organization-action": "1",
      },
      method: "POST",
      url: "/api/organizations",
    }),
    created,
  );
  assert.equal(created.statusCode, 201);

  const dashboard = responseFor();
  await handler(
    requestFor({ url: `/api/organizations/${WORKSPACE_ID}` }),
    dashboard,
  );
  assert.equal(dashboard.statusCode, 200);

  const downloaded = responseFor();
  await handler(
    requestFor({
      headers: {
        "idempotency-key": "organization-download-request",
        "x-goodgood-organization-action": "1",
      },
      url: `/api/organizations/${WORKSPACE_ID}/assets/${ASSET_ID}/download-url`,
    }),
    downloaded,
  );
  assert.equal(downloaded.statusCode, 200);
  assert.equal(JSON.parse(downloaded.body).url, "https://storage.invalid/audited");
  assert.equal(calls[0].idempotencyKey, "organization-create-request");
  assert.equal(calls[1].workspaceId, WORKSPACE_ID);
  assert.equal(calls[2].workspaceId, WORKSPACE_ID);
  assert.equal(calls[2].assetId, ASSET_ID);
  assert.equal(calls[2].idempotencyKey, "organization-download-request");
});

test("management migration, routes, UI, and workspace-aware clients stay wired", async () => {
  const [
    migration,
    schema,
    runtime,
    page,
    management,
    boundary,
    generationBoundary,
    projectBoundary,
    assetBoundary,
    referenceBoundary,
  ] = await Promise.all([
    readFile(new URL("../migrations/0027_gg030_management_surface.sql", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../server/runtime/web.mjs", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/organizations/organization-management-page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/organizations/http-organization-boundary.ts", import.meta.url), "utf8"),
    readFile(new URL("../features/creation/http-generation-boundary.ts", import.meta.url), "utf8"),
    readFile(new URL("../features/projects/http-project-boundary.ts", import.meta.url), "utf8"),
    readFile(new URL("../features/assets/http-asset-boundary.ts", import.meta.url), "utf8"),
    readFile(new URL("../features/references/http-reference-library.ts", import.meta.url), "utf8"),
  ]);
  assert.match(migration, /download_organization_asset/);
  assert.doesNotMatch(migration, /TRUNCATE|DELETE FROM|DROP TABLE/i);
  assert.match(schema, /download_organization_asset/);
  assert.match(runtime, /createOrganizationNodeApiHandler/);
  assert.match(runtime, /handleOrganizationNodeApi/);
  assert.match(page, /useWorkspaceDirectory/);
  assert.doesNotMatch(page, /WorkspaceSwitcher|mobile-workspace-switcher/);
  assert.match(page, /workspaceId/);
  assert.match(page, /正在验证企业工作区权限/);
  assert.match(page, /你没有权限访问这个企业工作区/);
  assert.match(page, /if \(!workspaceId\) navigateWorkspace\(\{ kind: "assets" \}\)/);
  assert.match(management, /成员与额度/);
  assert.match(management, /消费记录/);
  assert.match(management, /企业资产/);
  assert.match(management, /readOrganizationAssetDownloadUrl/);
  assert.match(boundary, /x-goodgood-organization-action/);
  assert.match(boundary, /idempotency-key/);
  for (const client of [
    generationBoundary,
    projectBoundary,
    assetBoundary,
    referenceBoundary,
  ]) {
    assert.match(client, /workspaceRequestHeaders/);
  }
});
