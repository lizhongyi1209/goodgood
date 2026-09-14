import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false, ws: false },
});

after(async () => {
  await vite.close();
});

test("declares the GoodGood visual and interaction invariants", async () => {
  const css = await readFile(path.join(root, "app/globals.css"), "utf8");
  const creationPage = await readFile(path.join(root, "app/page.tsx"), "utf8");
  const creationComposer = await readFile(
    path.join(root, "features/creation/creation-composer.tsx"),
    "utf8",
  );
  const referenceEditor = await readFile(
    path.join(root, "features/references/reference-quick-editor.tsx"),
    "utf8",
  );

  assert.match(css, /--accent:\s*#b52b30/);
  assert.match(css, /--control-md:\s*40px/);
  assert.match(css, /\.prompt-row textarea\.has-overflow[^}]*scrollbar-width:\s*thin/s);
  assert.match(css, /\.creation-masonry-frame[^}]*border-radius:\s*15px/s);
  assert.match(css, /\.creation-masonry[^}]*gap:\s*3px/s);
  assert.match(css, /\.generation-error-strip[^}]*min-height:\s*72px/s);
  assert.match(css, /\.reference-library-picker-image[^}]*aspect-ratio:\s*1/s);
  assert.match(css, /\.reference-material-masonry[^}]*grid-template-columns:\s*repeat\(4/s);
  assert.match(css, /\.reference-thumbnail-ordinal[^}]*left:\s*4px;[^}]*bottom:\s*4px/s);
  assert.match(css, /\.reference-thumbnail\.is-drag-target[^}]*border-color:\s*var\(--accent\)/s);
  assert.match(css, /\.reference-thumbnail-remove[^}]*width:\s*16px;[^}]*height:\s*16px;[^}]*top:\s*3px;[^}]*right:\s*3px/s);
  assert.match(css, /\.reference-editor-body[^}]*grid-template-columns:\s*72px minmax\(0,1fr\)/s);
  assert.match(css, /\.reference-editor-stage canvas[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*touch-action:\s*none/s);
  assert.match(css, /\.reference-editor-discard-overlay[^}]*background:\s*rgba\(24,24,30,\.34\)/s);
  assert.match(css, /\.reference-editor-discard-dialog[^}]*background:\s*var\(--white\)[^}]*box-shadow:/s);
  assert.match(css, /\.reference-editor-discard-dialog \[data-slot="alert-dialog-action"\][^}]*background:\s*var\(--accent\)/s);
  assert.doesNotMatch(creationPage, /reference-library-picker-image" style=/);
  assert.match(creationComposer, /draggable=\{canReorderReferences\}/);
  assert.match(creationComposer, /onReorderReference\?\.\(sourceId, image\.id\)/);
  assert.match(creationComposer, /"Enter Space Alt\+ArrowLeft Alt\+ArrowRight"/);
  assert.match(creationComposer, /reference-thumbnail-ordinal">图 \{index \+ 1\}/);
  assert.match(creationComposer, /<ReferenceQuickEditor/);
  assert.match(creationComposer, /event\.key === "Enter" \|\| event\.key === " "/);
  assert.match(creationComposer, /suppressReferencePreviewRef\.current = true/);
  assert.match(creationComposer, /event\.stopPropagation\(\);[\s\S]*onRemoveReference\(image\)/);
  assert.match(referenceEditor, /aria-label="参考图编辑工具"/);
  assert.match(referenceEditor, /overlayClassName="reference-editor-discard-overlay"/);
  assert.match(referenceEditor, /label: "查看"[\s\S]*label: "裁剪"[\s\S]*label: "画笔"[\s\S]*label: "贴图"[\s\S]*label: "箭头"[\s\S]*label: "框选"/);
  assert.match(referenceEditor, /formatReferenceEditorBboxPrompt\(ordinal, bbox\)/);
  assert.match(referenceEditor, /output\.x \* sourceImage\.naturalWidth/);
  assert.doesNotMatch(referenceEditor, /filter:\s*(?:saturate|contrast|hue-rotate|brightness)/);
  assert.match(creationPage, /onSaveReferenceEdit=\{handleSaveReferenceEdit\}/);
  assert.match(creationPage, /item\.id === source\.id[\s\S]*\.\.\.result\.reference, url: previewUrl/s);
  assert.match(creationPage, /if \(currentProject\) \{[\s\S]*await saveProject\(\{[\s\S]*references: nextReferences\.filter/s);
  assert.match(css, /mask:\s*url\("\/feihong-send\.png"\)/);
  assert.doesNotMatch(creationPage, /className="generation-task-frame"/);
  assert.match(creationPage, /const creationStreamItems = videoItems\.length/);
  assert.match(creationPage, /\[\.\.\.videoItems, \.\.\.generationItems, \.\.\.creationItems\]/);
  assert.match(creationPage, /: \[\.\.\.generationItems, \.\.\.creationItems\]/);
  assert.match(creationPage, /renderCreationColumns\(creationStreamItems, 4\)/);
  assert.match(creationPage, /getGenerationRunSlots\(generationRuns\)/);
  assert.match(creationPage, /trackedGenerationBatchIds\.has\(batch\.id\)/);
  assert.match(creationPage, /failedGenerationRuns\.map/);
  assert.match(creationPage, /retryFailedGeneration\(run\)/);
  assert.match(creationPage, /restoreFailedGenerationSettings\(runInput\)/);
  assert.match(creationComposer, /aria-label=\{isGenerating \? "继续生成图片" : "生成图片"\}/);
  assert.doesNotMatch(creationComposer, /disabled=\{isGenerating\}/);
  assert.doesNotMatch(creationPage, /className="generation-error-panel/);

  const creationCardRenderer = creationPage.slice(
    creationPage.indexOf("const renderCreationItem"),
    creationPage.indexOf("const renderCreationColumns"),
  );
  assert.match(creationCardRenderer, /formatPixelDimensions\(itemDimensions\)/);
  assert.match(creationCardRenderer, /className="download-button"/);
  assert.doesNotMatch(creationCardRenderer, /<Bookmark/);
  assert.doesNotMatch(creationCardRenderer, /toggleSave/);
  const detailActionsStart = creationPage.indexOf('<div className="image-detail-actions">');
  const detailActions = creationPage.slice(
    detailActionsStart,
    creationPage.indexOf("</div>", detailActionsStart),
  );
  assert.match(detailActions, /className="download-button"/);
  assert.doesNotMatch(detailActions, /Bookmark|toggleSave|savedImages/);
  assert.doesNotMatch(creationPage, /const \[savedImages, setSavedImages\]|const toggleSave/);
  assert.match(css, /\.creation-card \.download-button:not\(:disabled\):hover\s*\{[^}]*color:\s*var\(--accent-deep\)[^}]*box-shadow:/s);
  assert.match(css, /\.creation-card \.download-button:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--accent\)/s);
  assert.match(css, /\.creation-card \.download-button:not\(:disabled\):active\s*\{[^}]*transform:\s*scale\(\.96\)/s);
  assert.match(creationPage, /saveImageToLocal\(\s*\{[\s\S]*createdAt: batch\.createdAt,[\s\S]*ordinal: index \+ 1,[\s\S]*previewUrl: image\.previewUrl,/);
  assert.match(
    creationPage,
    /readAssetDownloadUrl\(assetId, workspaceId\)/,
  );
  assert.doesNotMatch(creationPage, /link\.href = previewUrl/);
  assert.doesNotMatch(creationPage, /(?:creation|gallery|detail)-variant-/);
  assert.doesNotMatch(css, /filter:\s*(?:saturate|contrast|hue-rotate|brightness)/);
  assert.doesNotMatch(css, /asset-image-frame:nth-child\([234]\) img/);

  const sidebarFooterStart = creationPage.indexOf('<div className="sidebar-footer">');
  const accountCardStart = creationPage.indexOf("<DropdownMenu>", sidebarFooterStart);
  const sidebarFooter = creationPage.slice(sidebarFooterStart, accountCardStart);
  assert.ok(sidebarFooter.indexOf("帮助") < sidebarFooter.indexOf("积分记录"));
  assert.match(sidebarFooter, /side-nav-item[^\n]*activeView === "credits"/);
  assert.doesNotMatch(sidebarFooter, /点击查看|sidebar-billing|sidebar-credit-action/);
  assert.doesNotMatch(css, /\.sidebar-billing|\.sidebar-credit-link|\.sidebar-credit-action/);
  const accountCard = creationPage.slice(
    accountCardStart,
    creationPage.indexOf("</aside>"),
  );
  const accountTrigger = accountCard.slice(
    accountCard.indexOf("<DropdownMenuTrigger"),
    accountCard.indexOf("</DropdownMenuTrigger>"),
  );
  const accountMenu = accountCard.slice(
    accountCard.indexOf("<DropdownMenuContent"),
    accountCard.indexOf("</DropdownMenuContent>"),
  );
  assert.match(accountTrigger, /className="account-card-username">\{personalProfile\.profile\?\.version \? personalProfile\.profile\.displayName : accountEmail \?\? "GoodGood 用户"\}<\/strong>/);
  assert.match(accountTrigger, /<ProfileAvatar[\s\S]*personalProfile\.profile\?\.avatarUrl/);
  assert.match(accountMenu, /onSelect=\{handleProfileNav\}[\s\S]*个人资料/);
  assert.match(accountTrigger, /className="account-card-more"/);
  assert.doesNotMatch(accountTrigger, /accountIdentity|billingSummary|退出登录/);
  assert.match(accountMenu, /<span>身份<\/span>[\s\S]*<strong>\{accountIdentity\}<\/strong>/);
  assert.match(accountMenu, /<span>\{workspaceId \? "企业剩余额度" : "积分余额"\}<\/span>[\s\S]*className=\{billingSummary \? "account-menu-credit" : ""\}/);
  assert.match(accountMenu, /<span>退出登录<\/span>/);
  assert.doesNotMatch(accountCard, /account-identity-badge|account-credit-balance|account-session-action/);
  assert.match(css, /\.account-menu \{[^}]*width:\s*224px[^}]*box-shadow:/s);
  assert.match(css, /\.account-menu-detail > svg \{[^}]*color:\s*#6f6f7b/s);
  assert.match(css, /\.account-menu-detail \.account-menu-credit \{[^}]*color:\s*var\(--accent-deep\)/s);
  assert.doesNotMatch(css, /\.account-menu-detail:has\(\.account-menu-credit\)/);
});

test("keeps reference previews legible and aspect ratio first through responsive layouts", async () => {
  const css = await readFile(path.join(root, "app/globals.css"), "utf8");
  const composer = await readFile(
    path.join(root, "features/creation/creation-composer.tsx"),
    "utf8",
  );

  assert.match(css, /--reference-preview-width:\s*96px/);
  assert.match(css, /--reference-preview-height:\s*96px/);
  assert.match(css, /\.reference-thumbnails[^}]*overflow-x:\s*auto/s);
  assert.match(
    css,
    /\.reference-thumbnail,\s*\.reference-add-more\s*\{[^}]*width:\s*var\(--reference-preview-width\)[^}]*height:\s*var\(--reference-preview-height\)/s,
  );
  assert.match(
    css,
    /\.reference-thumbnail img[^}]*object-fit:\s*cover;[^}]*object-position:\s*center;/s,
  );
  assert.match(
    css,
    /@media \(max-width:\s*720px\)[\s\S]*--reference-preview-width:\s*80px;[\s\S]*--reference-preview-height:\s*80px;/,
  );

  const ratioGroup = composer.indexOf('className="parameter-group ratio-group"');
  const modelGroup = composer.indexOf('className="parameter-group model-group"');
  const outputGroup = composer.indexOf('className="parameter-group output-group"');
  assert.ok(ratioGroup >= 0 && ratioGroup < modelGroup);
  assert.ok(modelGroup < outputGroup);
  assert.match(
    css,
    /@media \(max-width:\s*1180px\)[\s\S]*\.ratio-group\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;[^}]*grid-row:\s*1;/,
  );
});

test("hides fixed Nano thinking and shows only the Google Search control", async () => {
  const composer = await readFile(
    path.join(root, "features/creation/creation-composer.tsx"),
    "utf8",
  );
  const page = await readFile(path.join(root, "app/page.tsx"), "utf8");

  assert.match(composer, /modelId === "nano-banana-2"/);
  assert.doesNotMatch(composer, /思考程度|banana-thinking|thinkingLevel/);
  assert.match(composer, />谷歌搜索</);
  assert.match(composer, /aria-label="谷歌搜索"/);
  assert.match(composer, /enabled \? "开启" : "关闭"/);
  assert.match(composer, /googleSearch === enabled/);
  assert.match(page, /useState<GenerationThinkingLevel>\("high"\)/);
  assert.match(page, /useState\(false\)/);
  assert.doesNotMatch(page, /onThinkingLevelChange|handleThinkingLevelChange|<dt>思考程度<\/dt>/);
  assert.match(page, /onGoogleSearchChange=\{handleGoogleSearchChange\}/);
});

test("keeps authentication global, passwordless, and recoverable", async () => {
  const css = await readFile(path.join(root, "app/globals.css"), "utf8");
  const creationPage = await readFile(path.join(root, "app/page.tsx"), "utf8");
  const authenticationGate = await readFile(
    path.join(root, "features/auth/authentication-gate.tsx"),
    "utf8",
  );
  const adminPage = await readFile(
    path.join(root, "features/admin/account-management-page.tsx"),
    "utf8",
  );
  const organizationPage = await readFile(
    path.join(root, "features/organizations/organization-management-page.tsx"),
    "utf8",
  );
  const authBoundary = await readFile(
    path.join(root, "features/auth/http-auth-boundary.ts"),
    "utf8",
  );
  const emailPolicy = await readFile(
    path.join(root, "server/auth/email-policy.mjs"),
    "utf8",
  );

  assert.match(css, /\.authentication-gate[^}]*position:\s*fixed/s);
  assert.match(css, /\.authentication-card[^}]*calc\(100vw - 32px\)/s);
  assert.match(css, /\.authentication-email-input[^}]*height:\s*var\(--control-lg\)/s);
  assert.match(css, /\.authentication-code-input[^}]*height:\s*var\(--control-lg\)/s);
  assert.match(
    css,
    /\.authentication-email-input:focus-visible[^}]*border-color:\s*var\(--accent\)[^}]*box-shadow:\s*none/s,
  );
  assert.match(
    css,
    /\.authentication-code-input:focus-visible[^}]*border-color:\s*var\(--accent\)[^}]*box-shadow:\s*none/s,
  );
  assert.match(creationPage, /<AuthenticationGate/);
  assert.match(adminPage, /<AuthenticationGate/);
  // Enterprise routes now share the creation shell and its authentication gate.
  assert.match(await readFile(path.join(root, "app/organizations/[organizationId]/page.tsx"), "utf8"), /export \{ default \} from "@\/app\/page"/);
  assert.match(creationPage, /<OrganizationManagementView[\s\S]*enabled=\{Boolean\(authenticationSession/);
  assert.match(organizationPage, /if \(!enabled\) return/);
  assert.match(authenticationGate, /authentication-brand-stacked/);
  assert.match(authenticationGate, /authentication-mode-title/);
  assert.match(authenticationGate, /className="authentication-form"/);
  assert.match(authenticationGate, /className="authentication-input-shell"/);
  assert.match(
    authenticationGate,
    /authentication-email-input[\s\S]*authentication-code-input[\s\S]*authentication-send-code[\s\S]*authentication-submit/,
  );
  assert.match(authenticationGate, /authentication-mode-title/);
  assert.match(authenticationGate, /placeholder="验证码"/);
  assert.match(authenticationGate, /发送验证码/);
  assert.match(authenticationGate, /邀请码（新用户填写）/);
  assert.doesNotMatch(authenticationGate, /修改邮箱|使用邀请码注册|setRegister/);
  assert.match(authenticationGate, /aria-label="邀请码"/);
  assert.match(authenticationGate, /autoComplete="one-time-code"/);
  assert.match(authenticationGate, /disabled=\{!challenge \|\| busy !== null\}/);
  assert.match(authenticationGate, /\$\{resendRemaining\}s/);
  assert.match(authenticationGate, /重发/);
  assert.doesNotMatch(authenticationGate, /InputOTPSlot/);
  assert.match(emailPolicy, /EMAIL_OTP_RESEND_SECONDS = 60/);
  assert.match(creationPage, /当前创作内容已保留/);
  assert.doesNotMatch(authenticationGate, /type="password"/);
  assert.match(authBoundary, /goodgood:session-expired/);
  assert.match(authBoundary, /\/api\/auth\/email\/request/);
  assert.match(authBoundary, /\/api\/auth\/email\/verify/);
  assert.doesNotMatch(css, /mobile-workspace-switcher|workspace-switcher-trigger/);
});

test("authentication session boundary covers signed-in, signed-out, and failure responses", async () => {
  const { readAuthenticationSession, signOut } = await vite.ssrLoadModule(
    "/features/auth/http-auth-boundary.ts",
  );
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  try {
    globalThis.fetch = async () =>
      Response.json({
        authenticated: true,
        user: { email: "creator@example.com" },
      });
    assert.deepEqual(await readAuthenticationSession(), {
      authenticated: true,
      user: { email: "creator@example.com" },
    });

    globalThis.fetch = async () => new Response(null, { status: 401 });
    assert.equal(await readAuthenticationSession(), null);

    globalThis.fetch = async () =>
      Response.json(
        { error: { message: "登录服务暂时不可用" } },
        { status: 503 },
      );
    await assert.rejects(
      readAuthenticationSession(),
      /登录服务暂时不可用/,
    );
    let assignedLocation;
    globalThis.window = {
      location: {
        assign(value) {
          assignedLocation = value;
        },
      },
    };
    globalThis.fetch = async () =>
      Response.json({
        redirectTo:
          "https://login.authing.cn/login/profile/logout?app_id=client",
      });
    assert.equal(await signOut(), true);
    assert.equal(
      assignedLocation,
      "https://login.authing.cn/login/profile/logout?app_id=client",
    );

    globalThis.fetch = async () => new Response(null, { status: 204 });
    assert.equal(await signOut(), false);

    globalThis.fetch = async () => Response.json({});
    await assert.rejects(signOut(), /退出登录失败/);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
  }
});

test("email authentication browser boundary covers challenge restore, request, verify, and failure", async () => {
  const {
    AuthenticationBoundaryError,
    readAuthenticationMethod,
    readEmailAuthenticationChallenge,
    requestEmailAuthenticationCode,
    verifyEmailAuthenticationCode,
  } = await vite.ssrLoadModule("/features/auth/http-auth-boundary.ts");
  const originalFetch = globalThis.fetch;
  const calls = [];
  try {
    globalThis.fetch = async (input, options = {}) => {
      calls.push({ input: String(input), options });
      if (input === "/api/auth/method") {
        return Response.json({ method: "email_code" });
      }
      if (input === "/api/auth/email/challenge") {
        return Response.json({ challenge: null });
      }
      if (input === "/api/auth/email/request") {
        return Response.json(
          {
            challengeId: "challenge-1",
            delivery: "accepted",
            emailHint: "cr***@example.com",
            expiresInSeconds: 300,
            resendAfterSeconds: 60,
          },
          { status: 202 },
        );
      }
      return Response.json({ authenticated: true, returnTo: "/create" });
    };
    assert.equal(await readAuthenticationMethod(), "email_code");
    assert.equal(await readEmailAuthenticationChallenge(), null);
    const challenge = await requestEmailAuthenticationCode(
      "creator@example.com",
      "/create",
    );
    assert.equal(challenge.id, "challenge-1");
    assert.equal(challenge.delivery, "accepted");
    assert.equal(await verifyEmailAuthenticationCode("challenge-1", "123456"), "/create");
    assert.deepEqual(JSON.parse(calls[2].options.body), {
      email: "creator@example.com",
      returnTo: "/create",
    });
    assert.deepEqual(JSON.parse(calls[3].options.body), {
      challengeId: "challenge-1",
      code: "123456",
    });

    globalThis.fetch = async () =>
      Response.json(
        {
          error: {
            code: "EMAIL_RATE_LIMITED",
            message: "请求过于频繁",
            retryAfterSeconds: 42,
            retryable: false,
          },
        },
        { status: 429 },
      );
    await assert.rejects(
      requestEmailAuthenticationCode("creator@example.com", "/"),
      (error) =>
        error instanceof AuthenticationBoundaryError &&
        error.code === "EMAIL_RATE_LIMITED" &&
        error.retryAfterSeconds === 42,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("keeps generation retries isolated from later composer edits", async () => {
  const {
    createGenerationInputSnapshot,
    restoreGenerationInputSnapshot,
  } = await vite.ssrLoadModule(
    "/features/creation/generation-snapshot.ts",
  );
  const originalReference = {
    id: "reference-1",
    url: "blob:reference-1",
    name: "服装.jpg",
    status: "ready",
  };
  const draft = {
    prompt: "  保留服装结构  ",
    references: [originalReference],
    modelId: "nano-banana-2",
    aspectRatio: "4:5",
    resolution: "2K",
    count: 4,
    thinkingLevel: "low",
    googleSearch: true,
  };

  const snapshot = createGenerationInputSnapshot(draft);
  draft.prompt = "后续草稿";
  originalReference.name = "已修改.jpg";
  draft.references.length = 0;

  assert.equal(snapshot.prompt, "保留服装结构");
  assert.equal(snapshot.references.length, 1);
  assert.equal(snapshot.references[0].name, "服装.jpg");
  assert.equal(snapshot.aspectRatio, "4:5");
  assert.equal("ratioIndex" in snapshot, false);
  assert.equal(snapshot.count, 4);
  assert.equal(snapshot.thinkingLevel, "high");
  assert.equal(snapshot.googleSearch, true);
  assert.ok(Object.isFrozen(snapshot));
  assert.ok(Object.isFrozen(snapshot.references));
  assert.ok(Object.isFrozen(snapshot.references[0]));

  const restored = restoreGenerationInputSnapshot(snapshot);
  assert.deepEqual(restored.references, [
    {
      id: "reference-1",
      url: "blob:reference-1",
      name: "服装.jpg",
      status: "ready",
    },
  ]);
  assert.notEqual(restored.references, snapshot.references);
  assert.notEqual(restored.references[0], snapshot.references[0]);
  assert.equal(restored.thinkingLevel, "high");
  assert.equal(restored.googleSearch, true);

  const historicalLow = restoreGenerationInputSnapshot({
    ...snapshot,
    thinkingLevel: "low",
  });
  assert.equal(historicalLow.thinkingLevel, "low");
});

test("normalizes and restores GPT Image 2 quality, background, and output format", async () => {
  const {
    createGenerationInputSnapshot,
    restoreGenerationInputSnapshot,
  } = await vite.ssrLoadModule(
    "/features/creation/generation-snapshot.ts",
  );
  const { resolveGptImageOptionsForModel } = await vite.ssrLoadModule(
    "/features/creation/generation-options.ts",
  );

  assert.deepEqual(resolveGptImageOptionsForModel("gpt-image-2"), {
    background: "auto",
    outputFormat: "jpeg",
    quality: "auto",
  });
  assert.deepEqual(resolveGptImageOptionsForModel("nano-banana-2"), {
    background: "auto",
    outputFormat: "png",
    quality: "auto",
  });

  assert.deepEqual(
    resolveGptImageOptionsForModel("gpt-image-2", {
      background: "transparent",
      outputFormat: "jpeg",
      quality: "high",
    }),
    { background: "transparent", outputFormat: "png", quality: "high" },
  );

  const snapshot = createGenerationInputSnapshot({
    aspectRatio: "1:1",
    background: "transparent",
    count: 1,
    modelId: "gpt-image-2",
    outputFormat: "webp",
    prompt: "透明玻璃徽章",
    quality: "high",
    references: [],
    resolution: "1K",
  });
  assert.equal(snapshot.quality, "high");
  assert.equal(snapshot.background, "transparent");
  assert.equal(snapshot.outputFormat, "webp");
  assert.deepEqual(restoreGenerationInputSnapshot(snapshot), {
    ...snapshot,
    references: [],
  });
});

test("uploads references directly and reports both ready and failed states", async () => {
  const { uploadReferenceFiles } = await vite.ssrLoadModule(
    "/features/references/http-reference-upload.ts",
  );
  const originalFetch = globalThis.fetch;
  const file = {
    name: "服装.png",
    size: 128,
    type: "image/png",
  };
  const updates = [];
  const calls = [];
  try {
    globalThis.fetch = async (input, options = {}) => {
      calls.push({ input: String(input), options });
      if (input === "/api/references") {
        return Response.json(
          {
            uploads: [
              {
                clientId: "client-1",
                expiresAt: new Date(Date.now() + 60_000).toISOString(),
                headers: { "content-type": "image/png" },
                reference: {
                  id: "20000000-0000-4000-8000-000000000001",
                  name: "服装.png",
                  status: "uploading",
                },
                uploadUrl: "https://storage.invalid/signed-put",
              },
            ],
          },
          { status: 201 },
        );
      }
      if (input === "https://storage.invalid/signed-put") {
        return new Response(null, { status: 200 });
      }
      return Response.json({
        id: "20000000-0000-4000-8000-000000000001",
        name: "服装.png",
        status: "ready",
      });
    };
    const result = await uploadReferenceFiles(
      [{ clientId: "client-1", file }],
      (clientId, reference) => updates.push({ clientId, reference }),
    );
    assert.equal(result[0].reference.status, "ready");
    assert.equal(updates[0].reference.status, "ready");
    assert.equal(calls[1].options.method, "PUT");
    assert.equal(calls[1].options.body, file);

    globalThis.fetch = async () =>
      Response.json(
        { error: { message: "仅支持 JPEG、PNG 或 WebP 参考图。" } },
        { status: 400 },
      );
    const failed = await uploadReferenceFiles(
      [{ clientId: "client-2", file }],
      (clientId, reference) => updates.push({ clientId, reference }),
    );
    assert.equal(failed[0].reference.status, "failed");
    assert.match(failed[0].reference.errorMessage, /仅支持 JPEG/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("project HTTP boundary covers empty, success, and preserved failure paths", async () => {
  const { listProjects, saveProject } = await vite.ssrLoadModule(
    "/features/projects/http-project-boundary.ts",
  );
  const originalFetch = globalThis.fetch;
  const calls = [];
  const project = {
    batches: [],
    createdAt: new Date(0).toISOString(),
    id: "30000000-0000-4000-8000-000000000001",
    name: "银色未来服装视觉",
    state: {
      aspectRatio: "4:5",
      count: 1,
      modelId: "nano-banana-2",
      prompt: "保留服装结构",
      references: [],
      resolution: "2K",
    },
    updatedAt: new Date(0).toISOString(),
  };
  try {
    globalThis.fetch = async (input, options = {}) => {
      calls.push({ input: String(input), options });
      if (options.method === "POST") return Response.json(project, { status: 201 });
      return Response.json({ projects: [] });
    };
    assert.deepEqual(await listProjects(), []);
    assert.equal(
      (
        await saveProject({
          batchIds: ["40000000-0000-4000-8000-000000000001"],
          idempotencyKey: "project_save_12345678",
          name: project.name,
          state: project.state,
        })
      ).id,
      project.id,
    );
    assert.equal(calls[1].options.headers["idempotency-key"], "project_save_12345678");

    globalThis.fetch = async () =>
      Response.json(
        {
          error: {
            code: "SAVE_FAILED",
            message: "当前创作内容已保留，请重试。",
            retryable: true,
          },
        },
        { status: 503 },
      );
    await assert.rejects(
      listProjects(),
      (error) =>
        error.code === "SAVE_FAILED" &&
        error.retryable === true &&
        /已保留/.test(error.message),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("draft HTTP boundary covers empty, save, delete, and explicit conflict recovery", async () => {
  const {
    DraftBoundaryError,
    deleteCreationDraft,
    readCreationDraft,
    saveCreationDraft,
  } = await vite.ssrLoadModule("/features/drafts/http-draft-boundary.ts");
  const originalFetch = globalThis.fetch;
  const calls = [];
  const state = {
    aspectRatio: "4:5",
    count: 1,
    modelId: "nano-banana-2",
    prompt: "保留当前草稿",
    references: [{
      id: "20000000-0000-4000-8000-000000000001",
      name: "reference.png",
      status: "ready",
      url: "https://objects.example/reference",
    }],
    resolution: "2K",
  };
  const record = {
    expiresAt: "2026-10-01T00:00:00.000Z",
    state,
    updatedAt: "2026-09-01T00:00:00.000Z",
    version: 1,
  };
  try {
    globalThis.fetch = async (input, options = {}) => {
      calls.push({ input: String(input), options });
      if (options.method === "PUT") return Response.json(record);
      if (options.method === "DELETE") return Response.json({ deleted: true });
      return Response.json({ draft: null });
    };
    assert.equal(await readCreationDraft(), null);
    assert.equal((await saveCreationDraft(state, null)).version, 1);
    const savedPayload = JSON.parse(calls[1].options.body);
    assert.equal(savedPayload.expectedVersion, null);
    assert.deepEqual(savedPayload.state.references, [{ id: state.references[0].id }]);
    await deleteCreationDraft(1);
    assert.deepEqual(JSON.parse(calls[2].options.body), { expectedVersion: 1 });

    globalThis.fetch = async () => Response.json(
      {
        error: {
          code: "DRAFT_CONFLICT",
          currentDraft: record,
          message: "另一窗口已更新这份草稿",
        },
      },
      { status: 409 },
    );
    await assert.rejects(
      saveCreationDraft(state, 1),
      (error) =>
        error instanceof DraftBoundaryError &&
        error.code === "DRAFT_CONFLICT" &&
        error.currentDraft.version === 1,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("asset HTTP boundary covers durable success, fresh download URLs, empty, and retryable failure", async () => {
  const { listAssets, readAssetDownloadUrl } = await vite.ssrLoadModule(
    "/features/assets/http-asset-boundary.ts",
  );
  const originalFetch = globalThis.fetch;
  const job = {
    createdAt: new Date(0).toISOString(),
    error: null,
    id: "40000000-0000-4000-8000-000000000001",
    input: {
      aspectRatio: "4:5",
      count: 1,
      modelId: "nano-banana-2",
      prompt: "持久资产",
      references: [],
      resolution: "2K",
    },
    outputs: [
      {
        id: "50000000-0000-4000-8000-000000000001",
        previewPosition: "50% 50%",
        previewUrl: "https://storage.invalid/signed-asset",
      },
    ],
    state: "succeeded",
    updatedAt: new Date(0).toISOString(),
  };
  const calls = [];
  try {
    globalThis.fetch = async (input, options = {}) => {
      calls.push({ input: String(input), options });
      return Response.json({ batches: [job] });
    };
    assert.deepEqual(await listAssets(), [job]);
    assert.equal(calls[0].input, "/api/assets");
    assert.equal(calls[0].options.cache, "no-store");

    globalThis.fetch = async () => Response.json({ batches: [] });
    assert.deepEqual(await listAssets(), []);

    globalThis.fetch = async (input, options = {}) => {
      calls.push({ input: String(input), options });
      return Response.json({ url: "https://storage.invalid/fresh-download" });
    };
    assert.equal(
      await readAssetDownloadUrl("50000000-0000-4000-8000-000000000001"),
      "https://storage.invalid/fresh-download",
    );
    assert.equal(
      calls.at(-1).input,
      "/api/assets/50000000-0000-4000-8000-000000000001/download-url",
    );
    assert.equal(calls.at(-1).options.cache, "no-store");

    globalThis.fetch = async () =>
      Response.json(
        {
          error: {
            code: "ASSET_LIBRARY_UNAVAILABLE",
            message: "资产库暂时无法读取，请重试。",
            retryable: true,
          },
        },
        { status: 503 },
      );
    await assert.rejects(
      listAssets(),
      (error) =>
        error.code === "ASSET_LIBRARY_UNAVAILABLE" &&
        error.retryable === true &&
        /资产库暂时无法读取/.test(error.message),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("reference material boundary and selection cover success, empty, deduplication, limits, and failure", async () => {
  const { listReferenceMaterials, ReferenceLibraryError } = await vite.ssrLoadModule(
    "/features/references/http-reference-library.ts",
  );
  const { appendReferenceMaterials, reorderReferences } = await vite.ssrLoadModule(
    "/features/references/reference-selection.ts",
  );
  const originalFetch = globalThis.fetch;
  const material = Object.freeze({
    byteSize: 1024,
    height: 1200,
    id: "20000000-0000-4000-8000-000000000001",
    mimeType: "image/jpeg",
    name: "人物参考.jpg",
    status: "ready",
    uploadedAt: "2026-09-08T12:00:00.000Z",
    url: "https://storage.invalid/reference-a",
    width: 900,
  });
  const second = Object.freeze({
    ...material,
    id: "20000000-0000-4000-8000-000000000002",
    name: "服装参考.jpg",
    url: "https://storage.invalid/reference-b",
  });
  try {
    const calls = [];
    globalThis.fetch = async (input, options = {}) => {
      calls.push({ input: String(input), options });
      return Response.json({ references: [material, second] });
    };
    assert.deepEqual(await listReferenceMaterials(), [material, second]);
    assert.equal(calls[0].input, "/api/references");
    assert.equal(calls[0].options.cache, "no-store");

    globalThis.fetch = async () => Response.json({ references: [] });
    assert.deepEqual(await listReferenceMaterials(), []);

    const selected = appendReferenceMaterials([], [material, second], 1);
    assert.equal(selected.addedCount, 1);
    assert.equal(selected.overflowCount, 1);
    assert.deepEqual(selected.references, [
      {
        id: material.id,
        name: material.name,
        status: "ready",
        url: material.url,
      },
    ]);
    const deduplicated = appendReferenceMaterials(selected.references, [material], 10);
    assert.equal(deduplicated.addedCount, 0);
    assert.equal(deduplicated.duplicateCount, 1);
    assert.deepEqual(deduplicated.references, selected.references);

    const ordered = appendReferenceMaterials([], [material, second], 10).references;
    assert.deepEqual(
      reorderReferences(ordered, material.id, second.id).map((reference) => reference.id),
      [second.id, material.id],
    );
    assert.equal(reorderReferences(ordered, material.id, material.id), ordered);
    assert.equal(reorderReferences(ordered, "missing", second.id), ordered);

    globalThis.fetch = async () =>
      Response.json(
        {
          error: {
            code: "REFERENCE_LIBRARY_UNAVAILABLE",
            message: "上传素材暂时无法读取，请重试。",
            retryable: true,
          },
        },
        { status: 503 },
      );
    await assert.rejects(
      listReferenceMaterials(),
      (error) =>
        error instanceof ReferenceLibraryError &&
        error.code === "REFERENCE_LIBRARY_UNAVAILABLE" &&
        error.retryable === true,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("video asset selection preserves mixed-media identity, roles, deduplication, and limits", async () => {
  const { appendVideoAssetMaterials } = await vite.ssrLoadModule(
    "/features/creation/video-asset-selection.ts",
  );
  const { videoReferenceMediaTypeForFile } = await vite.ssrLoadModule(
    "/features/creation/video-generation-options.ts",
  );
  const asset = (id, mediaType) => ({
    id,
    mediaType,
    name: `${mediaType}-${id}`,
    size: 1024,
    source: "uploaded",
    url: `https://storage.invalid/${id}`,
  });
  const mixed = appendVideoAssetMaterials(
    [],
    [asset("image-1", "image"), asset("video-1", "video"), asset("audio-1", "audio")],
    "seedance-2-0",
  );

  assert.equal(videoReferenceMediaTypeForFile({ type: "image/png" }), "image");
  assert.equal(videoReferenceMediaTypeForFile({ type: "video/mp4" }), "video");
  assert.equal(videoReferenceMediaTypeForFile({ type: "audio/mpeg" }), "audio");
  assert.equal(videoReferenceMediaTypeForFile({ type: "application/pdf" }), null);

  assert.equal(mixed.addedCount, 3);
  assert.deepEqual(
    mixed.references.map(({ id, mediaType, role }) => ({ id, mediaType, role })),
    [
      { id: "image-1", mediaType: "image", role: "reference_image" },
      { id: "video-1", mediaType: "video", role: "reference_video" },
      { id: "audio-1", mediaType: "audio", role: "reference_audio" },
    ],
  );

  const duplicate = appendVideoAssetMaterials(
    mixed.references,
    [asset("image-1", "image")],
    "seedance-2-0",
  );
  assert.equal(duplicate.addedCount, 0);
  assert.equal(duplicate.duplicateCount, 1);

  const videoLimit = appendVideoAssetMaterials(
    [],
    [1, 2, 3, 4].map((index) => asset(`video-${index}`, "video")),
    "seedance-2-0-mini",
  );
  assert.equal(videoLimit.addedCount, 3);
  assert.equal(videoLimit.rejectedCount, 1);
  assert.match(videoLimit.firstCapacityError, /最多支持 3 段视频/);

  const firstLast = appendVideoAssetMaterials(
    [],
    [
      asset("image-start", "image"),
      asset("image-end", "image"),
      asset("image-extra", "image"),
      asset("video-extra", "video"),
    ],
    "seedance-2-0",
    "first_last_frame",
  );
  assert.equal(firstLast.addedCount, 2);
  assert.equal(firstLast.rejectedCount, 2);
  assert.deepEqual(
    firstLast.references.map(({ id, role }) => ({ id, role })),
    [
      { id: "image-start", role: "first_frame" },
      { id: "image-end", role: "last_frame" },
    ],
  );
});

test("billing HTTP boundary covers balance, quote, zero capacity, and retryable failure", async () => {
  const {
    availableImageCount,
    createPaymentOrder,
    findBillingQuote,
    readCreditActivities,
    readBillingProducts,
    readBillingSummary,
    readPaymentOrder,
  } = await vite.ssrLoadModule(
    "/features/billing/http-billing-boundary.ts",
  );
  const originalFetch = globalThis.fetch;
  const calls = [];
  const summary = {
    account: {
      availableCredits: "100",
      reservedCredits: "0",
      unit: "credit",
      version: "1",
    },
    quotes: [
      {
        count: 1,
        creditAmount: "10",
        creditUnit: "credit",
        modelId: "nano-banana-2",
        planContext: "standard",
        priceVersion: 1,
        resolution: "1K",
      },
      {
        count: 1,
        creditAmount: "15",
        creditUnit: "credit",
        modelId: "nano-banana-pro",
        planContext: "standard",
        priceVersion: 1,
        resolution: "1K",
      },
    ],
  };
  try {
    globalThis.fetch = async (input, options = {}) => {
      calls.push({ input: String(input), options });
      return Response.json(summary);
    };
    assert.deepEqual(await readBillingSummary(), summary);
    assert.equal(calls[0].input, "/api/billing");
    assert.equal(calls[0].options.cache, "no-store");
    const activityPage = {
      account: summary.account,
      items: [
        {
          amount: "-10",
          completedAt: "2026-09-09T00:00:02.000Z",
          creditAmount: "10",
          generation: null,
          id: "act_11111111111111111111111111111111",
          kind: "generation",
          occurredAt: "2026-09-09T00:00:00.000Z",
          status: "spent",
          unit: "credit",
        },
      ],
      nextCursor: "next-credit-page",
    };
    globalThis.fetch = async (input, options = {}) => {
      calls.push({ input: String(input), options });
      return Response.json(activityPage);
    };
    assert.deepEqual(
      await readCreditActivities({ cursor: "cursor-token", filter: "spend", limit: 12 }),
      activityPage,
    );
    const activityCall = calls.at(-1);
    assert.equal(
      activityCall.input,
      "/api/billing/activities?filter=spend&limit=12&cursor=cursor-token",
    );
    assert.equal(activityCall.options.cache, "no-store");
    const quote = findBillingQuote(summary, {
      count: 1,
      modelId: "nano-banana-2",
      resolution: "1K",
    });
    assert.equal(quote.creditAmount, "10");
    assert.equal(availableImageCount(summary, quote), 10n);
    const proQuote = findBillingQuote(summary, {
      count: 1,
      modelId: "nano-banana-pro",
      resolution: "1K",
    });
    assert.equal(proQuote.creditAmount, "15");
    assert.equal(availableImageCount(summary, proQuote), 6n);
    assert.equal(
      availableImageCount(
        {
          ...summary,
          account: { ...summary.account, availableCredits: "0" },
        },
        quote,
      ),
      0n,
    );
    assert.equal(
      availableImageCount(
        {
          ...summary,
          account: { ...summary.account, availableCredits: "invalid" },
        },
        quote,
      ),
      null,
    );
    assert.equal(
      findBillingQuote(summary, {
        count: 1,
        modelId: "nano-banana-2",
        resolution: "4K",
      }),
      null,
    );

    const paymentOrder = {
      createdAt: "2026-09-02T00:00:00.000Z",
      creditAmount: "500",
      creditUnit: "credit",
      currency: "CNY",
      id: "ord_00000000000000000000000000000000",
      moneyAmountMinor: "1000",
      paidAt: null,
      productId: "credits-500-cny",
      productVersion: 1,
      status: "pending",
    };
    globalThis.fetch = async (input, options = {}) => {
      calls.push({ input: String(input), options });
      if (String(input) === "/api/billing/products") {
        return Response.json({ products: [{ id: "credits-500-cny" }] });
      }
      return Response.json(paymentOrder);
    };
    assert.equal(
      (await readBillingProducts()).products[0].id,
      "credits-500-cny",
    );
    assert.deepEqual(
      await createPaymentOrder("credits-500-cny", "payment-idempotency-key"),
      paymentOrder,
    );
    assert.deepEqual(await readPaymentOrder(paymentOrder.id), paymentOrder);
    const paymentCreateCall = calls.find(
      (call) => call.input === "/api/billing/orders",
    );
    assert.equal(paymentCreateCall.options.method, "POST");
    assert.equal(
      paymentCreateCall.options.headers["idempotency-key"],
      "payment-idempotency-key",
    );

    globalThis.fetch = async () =>
      Response.json(
        {
          error: {
            code: "BILLING_UNAVAILABLE",
            message: "积分信息暂时无法读取，请稍后重试。",
            retryable: true,
          },
        },
        { status: 503 },
      );
    await assert.rejects(
      readBillingSummary(),
      (error) =>
        error.code === "BILLING_UNAVAILABLE" &&
        error.retryable === true &&
        /积分信息暂时无法读取/.test(error.message),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("forwards progress semantics to the primitive", async () => {
  const { Progress } = await vite.ssrLoadModule("/components/ui/progress.tsx");
  const html = renderToStaticMarkup(React.createElement(Progress, { value: 37 }));

  assert.match(html, /aria-valuenow="37"/);
  assert.match(html, /aria-valuetext="37%"/);
  assert.match(html, /data-state="loading"/);
});

test("emits chart themes for the starter's media dark mode", async () => {
  const { ChartStyle } = await vite.ssrLoadModule("/components/ui/chart.tsx");
  const html = renderToStaticMarkup(
    React.createElement(ChartStyle, {
      id: "contract",
      config: {
        latency: { theme: { light: "#ffffff", dark: "#000000" } },
      },
    }),
  );

  assert.match(html, /\[data-chart=contract\]/);
  assert.match(html, /@media \(prefers-color-scheme: dark\)/);
  assert.doesNotMatch(html, /\.dark/);
});

test("renders sidebar skeletons deterministically", async () => {
  const { SidebarMenuSkeleton } = await vite.ssrLoadModule(
    "/components/ui/sidebar.tsx",
  );
  const first = renderToStaticMarkup(React.createElement(SidebarMenuSkeleton));
  const second = renderToStaticMarkup(React.createElement(SidebarMenuSkeleton));

  assert.equal(first, second);
  assert.match(first, /--skeleton-width:70%/);
});
