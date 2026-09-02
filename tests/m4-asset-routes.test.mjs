import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  navigateWorkspace,
  parseWorkspaceRoute,
  workspaceRouteHref,
  WORKSPACE_NAVIGATION_EVENT,
} from "../features/navigation/workspace-route.mjs";

const ASSET_ID = "40000000-0000-4000-8000-000000000001";

test("asset routes use stable asset IDs and reject unrelated path shapes", () => {
  assert.deepEqual(parseWorkspaceRoute("/assets/"), { kind: "assets" });
  assert.deepEqual(parseWorkspaceRoute(`/assets/${ASSET_ID}`), {
    assetId: ASSET_ID,
    kind: "asset",
  });
  assert.deepEqual(parseWorkspaceRoute("/assets/asset%20name"), {
    assetId: "asset name",
    kind: "asset",
  });
  assert.deepEqual(parseWorkspaceRoute("/assets/one/more"), { kind: "create" });
  assert.deepEqual(parseWorkspaceRoute("/assets/%E0%A4%A"), { kind: "create" });
  assert.equal(workspaceRouteHref({ kind: "assets" }), "/assets");
  assert.equal(
    workspaceRouteHref({ assetId: "asset name", kind: "asset" }),
    "/assets/asset%20name",
  );
});

test("asset detail navigation preserves source state and supports URL replacement", () => {
  const originalWindow = globalThis.window;
  const calls = [];
  const events = [];
  const location = { pathname: "/assets" };
  const detailState = {
    goodgoodAssetDetail: {
      returnHref: "/assets",
      scrollY: 320,
      source: "assets",
    },
  };
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
    navigateWorkspace({ assetId: ASSET_ID, kind: "asset" }, { state: detailState });
    navigateWorkspace(
      { assetId: "40000000-0000-4000-8000-000000000002", kind: "asset" },
      { notify: false, replace: true, state: detailState },
    );
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
  assert.deepEqual(calls, [
    {
      href: `/assets/${ASSET_ID}`,
      method: "pushState",
      state: detailState,
    },
    {
      href: "/assets/40000000-0000-4000-8000-000000000002",
      method: "replaceState",
      state: detailState,
    },
  ]);
  assert.deepEqual(events, [WORKSPACE_NAVIGATION_EVENT]);
});

test("asset pages mount addressable library and detail recovery in the shared workspace", async () => {
  const [page, assetIndex, assetDetail] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/assets/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/assets/[assetId]/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(assetIndex, /export \{ default \} from "\.\.\/page"/);
  assert.match(assetDetail, /export \{ default \} from "\.\.\/\.\.\/page"/);
  assert.match(page, /route\.kind === "asset"/);
  assert.match(page, /setRouteAssetId\(route\.assetId\)/);
  assert.match(page, /window\.history\.back\(\)/);
  assert.match(page, /assetRouteError/);
  assert.match(page, /这张图片不存在，或当前账号无权访问/);
  assert.match(page, /navigateWorkspace\(\{ kind: "assets" \}/);
});
