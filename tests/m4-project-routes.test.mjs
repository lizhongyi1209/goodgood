import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  navigateWorkspace,
  parseWorkspaceRoute,
  workspaceRouteHref,
  WORKSPACE_NAVIGATION_EVENT,
} from "../features/navigation/workspace-route.mjs";

const PROJECT_ID = "30000000-0000-4000-8000-000000000001";

test("workspace routes use stable project IDs and reject unrelated path shapes", () => {
  assert.deepEqual(parseWorkspaceRoute("/"), { kind: "create" });
  assert.deepEqual(parseWorkspaceRoute("/projects/"), { kind: "projects" });
  assert.deepEqual(parseWorkspaceRoute(`/projects/${PROJECT_ID}`), {
    kind: "project",
    projectId: PROJECT_ID,
  });
  assert.deepEqual(parseWorkspaceRoute("/projects/project%20name"), {
    kind: "project",
    projectId: "project name",
  });
  assert.deepEqual(parseWorkspaceRoute("/projects/one/more"), { kind: "create" });
  assert.deepEqual(parseWorkspaceRoute("/projects/%E0%A4%A"), { kind: "create" });
  assert.equal(
    workspaceRouteHref({ kind: "project", projectId: "project name" }),
    "/projects/project%20name",
  );
});

test("workspace navigation writes browser history and notifies the mounted workspace", () => {
  const originalWindow = globalThis.window;
  const calls = [];
  const events = [];
  const location = { pathname: "/" };
  globalThis.window = {
    dispatchEvent(event) {
      events.push(event.type);
      return true;
    },
    history: {
      state: { retained: true },
      pushState(state, _title, href) {
        calls.push({ href, method: "pushState", state });
        location.pathname = href;
      },
      replaceState(state, _title, href) {
        calls.push({ href, method: "replaceState", state });
        location.pathname = href;
      },
    },
    location,
  };
  try {
    navigateWorkspace({ kind: "projects" });
    navigateWorkspace(
      { kind: "project", projectId: PROJECT_ID },
      { replace: true },
    );
    navigateWorkspace(
      { kind: "project", projectId: PROJECT_ID },
      { notify: false },
    );
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
  assert.deepEqual(calls, [
    { href: "/projects", method: "pushState", state: { retained: true } },
    {
      href: `/projects/${PROJECT_ID}`,
      method: "replaceState",
      state: { retained: true },
    },
  ]);
  assert.deepEqual(events, [
    WORKSPACE_NAVIGATION_EVENT,
    WORKSPACE_NAVIGATION_EVENT,
  ]);
});

test("project pages mount the workspace and restore URL state through the owner API", async () => {
  const [page, projectIndex, projectDetail] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/projects/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/projects/[projectId]/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(projectIndex, /export \{ default \} from "\.\.\/page"/);
  assert.match(projectDetail, /export \{ default \} from "\.\.\/\.\.\/page"/);
  assert.match(page, /window\.addEventListener\("popstate"/);
  assert.match(page, /WORKSPACE_NAVIGATION_EVENT/);
  assert.match(page, /readProject\(routeProjectId\)/);
  assert.match(page, /正在恢复项目/);
  assert.match(page, /retryProjectRoute/);
  assert.match(page, /beginAuthentication\(`\$\{window\.location\.pathname\}/);
  assert.match(page, /navigateWorkspace\(\{ kind: "projects" \}\)/);
});
