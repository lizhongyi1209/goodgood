import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  navigateWorkspace,
  parseWorkspaceRoute,
  workspaceRouteHref,
  WORKSPACE_NAVIGATION_EVENT,
} from "../features/navigation/workspace-route.mjs";

test("root and /create mount the same canonical creation route", async () => {
  const [rootPage, createPage] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/create/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.deepEqual(parseWorkspaceRoute("/"), { kind: "create" });
  assert.deepEqual(parseWorkspaceRoute("/create"), { kind: "create" });
  assert.deepEqual(parseWorkspaceRoute("/create/"), { kind: "create" });
  assert.equal(workspaceRouteHref({ kind: "create" }), "/create");
  assert.match(createPage, /export \{ default \} from "\.\.\/page"/);
  assert.match(rootPage, /navigateWorkspace\(\{ kind: "create" \}\)/);
});

test("creation navigation canonicalizes root once and preserves native history", () => {
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
    navigateWorkspace({ kind: "create" });
    navigateWorkspace({ kind: "create" });
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }

  assert.deepEqual(calls, [
    { href: "/create", method: "pushState", state: { retained: true } },
  ]);
  assert.deepEqual(events, [
    WORKSPACE_NAVIGATION_EVENT,
    WORKSPACE_NAVIGATION_EVENT,
  ]);
});
