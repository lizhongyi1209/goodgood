import assert from "node:assert/strict";
import test from "node:test";

import {
  navigateWorkspace,
  parseWorkspaceRoute,
  workspaceRouteHref,
  WORKSPACE_NAVIGATION_EVENT,
} from "../features/navigation/workspace-route.mjs";

test("canvas has a stable route that preserves workspace history state", () => {
  assert.deepEqual(parseWorkspaceRoute("/canvas"), { kind: "canvas" });
  assert.deepEqual(parseWorkspaceRoute("/canvas/"), { kind: "canvas" });
  assert.equal(workspaceRouteHref({ kind: "canvas" }), "/canvas");

  const previousWindow = globalThis.window;
  const calls = [];
  const events = [];
  const location = { pathname: "/create" };
  globalThis.window = {
    location,
    history: {
      state: { retained: true },
      pushState(state, _title, href) {
        calls.push({ state, href });
        location.pathname = href;
      },
    },
    dispatchEvent(event) {
      events.push(event.type);
      return true;
    },
  };

  try {
    navigateWorkspace({ kind: "canvas" });
    navigateWorkspace({ kind: "canvas" });
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }

  assert.deepEqual(calls, [{ state: { retained: true }, href: "/canvas" }]);
  assert.deepEqual(events, [WORKSPACE_NAVIGATION_EVENT, WORKSPACE_NAVIGATION_EVENT]);
});
