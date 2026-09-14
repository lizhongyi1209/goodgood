import assert from "node:assert/strict";
import test, { after } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import {
  applyPricingDiscount,
  parsePricingDiscount,
} from "../shared/contracts/pricing-discount.mjs";

test("GG-069 discount applies to every resolution, quality and mutually exclusive token rate without mutation", () => {
  const baseline = {
    "480p": { billing: "tokens", output: "70.00", input: "42.00" },
    "1080p": { billing: "tokens", output: "77.00", input: "46.00" },
  };
  const saved = structuredClone(baseline);
  assert.deepEqual(applyPricingDiscount(baseline, "98")["1080p"], {
    billing: "tokens",
    output: "75.46",
    input: "45.08",
  });
  assert.deepEqual(applyPricingDiscount(baseline, "80")["1080p"], {
    billing: "tokens",
    output: "61.60",
    input: "36.80",
  });
  assert.deepEqual(applyPricingDiscount(baseline, "100"), baseline);
  assert.deepEqual(baseline, saved);
  const image = {
    "1K": {
      output: "1.48",
      input: "",
      qualities: {
        low: "0.05",
        medium: "0.10",
        high: "0.37",
        xhigh: "0.66",
        max: "1.48",
      },
    },
    "4K": { output: "2.81", input: "0.00" },
  };
  const result = applyPricingDiscount(image, "80");
  assert.deepEqual(result["1K"].qualities, {
    low: "0.04",
    medium: "0.08",
    high: "0.30",
    xhigh: "0.53",
    max: "1.18",
  });
  assert.equal(result["4K"].output, "2.25");
  assert.equal(result["1K"].input, "");
});

test("GG-069 rounding uses exact cents, preserves blanks/zero and keeps positive rates at one cent", () => {
  assert.equal(
    applyPricingDiscount({ "1K": { output: "0.05", input: "0.00" } }, "10")[
      "1K"
    ].output,
    "0.01",
  );
  assert.equal(
    applyPricingDiscount({ "1K": { output: "0.01", input: "" } }, "1")["1K"]
      .output,
    "0.01",
  );
  const p = {
    "1K": { output: "999999.99", input: "0" },
    "2K": { output: "", input: "" },
  };
  assert.equal(applyPricingDiscount(p, "98")["1K"].output, "979999.99");
  assert.deepEqual(applyPricingDiscount(p, "80")["2K"], p["2K"]);
});

test("GG-069 invalid discount or malformed prices fail atomically and empty pricing stays unfilled", () => {
  for (const value of ["", "0", "101", "-1", "9.8", "080", "80%", 80])
    assert.throws(() => parsePricingDiscount(value));
  assert.equal(parsePricingDiscount(" 98 "), 98);
  assert.throws(() => applyPricingDiscount({}, "80"), /先.*填写价格/);
  assert.throws(() => applyPricingDiscount({"1K":{output:"",input:"0"}}, "80"), /先.*填写价格/);
  const prices = {
    "1K": { output: "10.00", input: "" },
    "2K": { output: "bad", input: "" },
  };
  const before = structuredClone(prices);
  assert.throws(() => applyPricingDiscount(prices, "80"));
  assert.deepEqual(prices, before);
});

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false, ws: false },
});
after(() => vite.close());
const { PricingDiscountEditor } = await vite.ssrLoadModule(
  "/features/admin/pricing-discount-editor.tsx",
);
const { VideoTokenPricingEditor } = await vite.ssrLoadModule(
  "/features/admin/video-token-pricing-editor.tsx",
);
test("GG-069 accessible discount controls appear inside video pricing above rates and retain save-only semantics", () => {
  const discount = React.createElement(PricingDiscountEditor, {
    scope: "backup",
    prices: {},
    onChange() {},
  });
  const html = renderToStaticMarkup(
    React.createElement(VideoTokenPricingEditor, {
      resolutions: ["1080p"],
      prices: {},
      pricingTools: discount,
      onChange() {},
    }),
  );
  assert.match(html, /整体折扣百分比/);
  assert.match(html, /value="100"/);
  assert.match(html, /应用折扣/);
  assert.match(html, /98 = 9.8 折，80 = 8 折/);
  assert.match(html, /不叠加/);
  assert.match(html, /保存后再次打开/);
  assert.ok(
    html.indexOf('aria-label="整体折扣"') <
      html.indexOf("1080p 无参考视频 token 售价"),
  );
});
