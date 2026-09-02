import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  logLevel: "silent",
  resolve: { alias: { "@": root } },
  root,
  server: { hmr: false, middlewareMode: true, ws: false },
});

test.after(async () => {
  await vite.close();
});

test("private object URLs render as direct browser images", async () => {
  const { PrivateObjectImage } = await vite.ssrLoadModule(
    "/components/ui/private-object-image.tsx",
  );
  const signedUrl =
    "http://127.0.0.1:9000/goodgood-local/generated/job.jpg?signature=test";
  const html = renderToStaticMarkup(
    React.createElement(PrivateObjectImage, {
      alt: "生成结果",
      src: signedUrl,
    }),
  );

  assert.match(html, /<img/);
  assert.match(html, /src="http:\/\/127\.0\.0\.1:9000\/goodgood-local\/generated\/job\.jpg\?signature=test"/);
  assert.doesNotMatch(html, /_vinext\/image|data-nimg|srcset=/);
});

test("workspace and composer route private previews through the direct primitive", async () => {
  const [source, composer] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../features/creation/creation-composer.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(source, /import \{ PrivateObjectImage \}/);
  assert.ok((source.match(/<PrivateObjectImage/g) ?? []).length >= 7);
  assert.doesNotMatch(
    source,
    /<Image[\s\S]{0,160}src=\{[^}\n]*previewUrl/,
  );
  assert.match(composer, /<PrivateObjectImage src=\{image\.url\}/);
  assert.doesNotMatch(composer, /<Image src=\{image\.url\}/);
});
