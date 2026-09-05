import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import test from "node:test";
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import pg from "pg";
import { createClient } from "redis";
import { grantCredits } from "../server/billing/repository.mjs";
import { signFakePaymentWebhook } from "../server/billing/payment-sandbox.mjs";
import { applyMigrations } from "../server/persistence/migrate.mjs";
import { cleanupReferenceAssets } from "../server/references/cleanup-service.mjs";
import { GENERATION_READY_QUEUE } from "../server/generation/config.mjs";
import { createAuthenticationOperations } from "../server/auth/operations.mjs";
import {
  createRequestAuthenticator,
  hashAuthenticationSecret,
} from "../server/auth/request-authenticator.mjs";

const enabled = process.env.GOODGOOD_M3_INTEGRATION === "1";
const webOrigin = process.env.GOODGOOD_M3_WEB_ORIGIN ?? "http://127.0.0.1:3000";
const composeEnvironment = {
  ...process.env,
  GOODGOOD_WEB_PORT:
    process.env.GOODGOOD_WEB_PORT ?? new URL(webOrigin).port ?? "3000",
};
const databaseUrl =
  process.env.GOODGOOD_M3_DATABASE_URL ??
  "postgresql://goodgood:goodgood-local-only@127.0.0.1:5432/goodgood";
const redisUrl = process.env.GOODGOOD_M3_REDIS_URL ?? "redis://127.0.0.1:6379";
const objectStorageEndpoint = process.env.GOODGOOD_M3_OBJECT_STORAGE_ENDPOINT ?? "http://127.0.0.1:9000";
const objectStorageBucket = process.env.OBJECT_STORAGE_BUCKET ?? "goodgood-local";
const ownerAToken =
  process.env.GOODGOOD_M4_AUTH_TOKEN_A ?? "goodgood-local-user-a-token";
const ownerBToken =
  process.env.GOODGOOD_M4_AUTH_TOKEN_B ?? "goodgood-local-user-b-token";
const execFileAsync = promisify(execFile);
const { Pool } = pg;

function authorization(token = ownerAToken) {
  return { authorization: `Bearer ${token}` };
}

async function submit(
  prompt,
  idempotencyKey,
  token = ownerAToken,
  references = [],
  projectId = null,
) {
  const response = await fetch(`${webOrigin}/api/generations`, {
    body: JSON.stringify({
      aspectRatio: "1:1",
      count: 1,
      modelId: "nano-banana-2",
      ...(projectId ? { projectId } : {}),
      prompt,
      references,
      resolution: "1K",
    }),
    headers: {
      ...authorization(token),
      "content-type": "application/json",
      "idempotency-key": idempotencyKey,
    },
    method: "POST",
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function poll(jobId, predicate = (job) => ["succeeded", "failed"].includes(job.state), timeoutMs = 30_000, token = ownerAToken) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await fetch(`${webOrigin}/api/generations/${jobId}`, {
      headers: authorization(token),
    });
    assert.equal(response.status, 200);
    const job = await response.json();
    if (predicate(job)) return job;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out polling ${jobId}`);
}

test(
  "Compose completes durable generation, reference, ownership, and restart paths",
  { skip: !enabled, timeout: 120_000 },
  async (context) => {
    const pool = new Pool({ connectionString: databaseUrl });
    const redis = createClient({ url: redisUrl });
    const storage = new S3Client({
      credentials: {
        accessKeyId: process.env.GOODGOOD_LOCAL_OBJECT_STORAGE_ACCESS_KEY ?? "goodgood-local",
        secretAccessKey: process.env.GOODGOOD_LOCAL_OBJECT_STORAGE_SECRET_KEY ?? "goodgood-local-only",
      },
      endpoint: objectStorageEndpoint,
      forcePathStyle: true,
      region: process.env.OBJECT_STORAGE_REGION ?? "us-east-1",
    });
    await redis.connect();
    context.after(async () => {
      await Promise.allSettled([pool.end(), redis.quit(), storage.destroy()]);
    });

    await applyMigrations({ databaseUrl, logger: { log() {} } });
    await applyMigrations({ databaseUrl, logger: { log() {} } });
    const migrationCount = await pool.query(
      "SELECT count(*)::int AS count FROM goodgood_schema_migrations WHERE version IN ('0001_m3_generation.sql', '0002_m4_authenticated_owners.sql', '0003_m4_reference_assets.sql', '0004_m4_projects.sql', '0005_m4_oidc_sessions.sql', '0006_m4_oidc_login_binding.sql', '0007_m4_reference_cleanup.sql', '0008_m4_creation_drafts.sql', '0009_m6_credit_ledger.sql', '0010_m6_payment_sandbox.sql', '0011_m8_account_admission.sql')",
    );
    assert.equal(migrationCount.rows[0].count, 11);
    const suffix = `${Date.now()}-${process.pid}`;
    await Promise.all([
      grantCredits(pool, {
        amount: 1_000n,
        idempotencyKey: `compose-test-grant:${suffix}:owner-a`,
        ownerId: "00000000-0000-4000-8000-000000000001",
        reason: "compose_test_grant",
      }),
      grantCredits(pool, {
        amount: 1_000n,
        idempotencyKey: `compose-test-grant:${suffix}:owner-b`,
        ownerId: "00000000-0000-4000-8000-000000000002",
        reason: "compose_test_grant",
      }),
    ]);
    const initialBillingResponse = await fetch(`${webOrigin}/api/billing`, {
      headers: authorization(),
    });
    assert.equal(initialBillingResponse.status, 200);
    const initialBilling = await initialBillingResponse.json();
    assert.deepEqual(
      initialBilling.quotes.map((quote) => [quote.resolution, quote.creditAmount]),
      [
        ["1K", "10"],
        ["2K", "10"],
        ["4K", "10"],
      ],
    );
    const initialAvailableCredits = BigInt(
      initialBilling.account.availableCredits,
    );
    const paymentProductsResponse = await fetch(
      `${webOrigin}/api/billing/products`,
      { headers: authorization() },
    );
    assert.equal(paymentProductsResponse.status, 200);
    assert.deepEqual(await paymentProductsResponse.json(), {
      products: [
        {
          creditAmount: "500",
          creditUnit: "credit",
          currency: "CNY",
          id: "credits-500-cny",
          moneyAmountMinor: "1000",
          version: 1,
        },
      ],
    });
    assert.equal(
      (await fetch(`${webOrigin}/api/billing/products`)).status,
      401,
    );
    const paymentOrderKey = `compose-payment-${suffix}`;
    const createPaymentOrder = () =>
      fetch(`${webOrigin}/api/billing/orders`, {
        body: JSON.stringify({ productId: "credits-500-cny" }),
        headers: {
          ...authorization(),
          "content-type": "application/json",
          "idempotency-key": paymentOrderKey,
        },
        method: "POST",
      });
    const paymentOrderResponse = await createPaymentOrder();
    assert.equal(paymentOrderResponse.status, 201);
    const paymentOrder = await paymentOrderResponse.json();
    assert.equal(paymentOrder.status, "pending");
    assert.equal(paymentOrder.moneyAmountMinor, "1000");
    const repeatedPaymentOrderResponse = await createPaymentOrder();
    assert.equal(repeatedPaymentOrderResponse.status, 200);
    assert.equal((await repeatedPaymentOrderResponse.json()).id, paymentOrder.id);
    const crossOwnerPaymentOrder = await fetch(
      `${webOrigin}/api/billing/orders/${paymentOrder.id}`,
      { headers: authorization(ownerBToken) },
    );
    assert.equal(crossOwnerPaymentOrder.status, 404);

    const paymentTimestamp = Math.floor(Date.now() / 1000);
    const paymentPayload = Buffer.from(
      JSON.stringify({
        currency: "CNY",
        eventId: `evt_${randomUUID()}`,
        eventType: "payment.succeeded",
        moneyAmountMinor: "1000",
        providerOrderId: paymentOrder.id,
      }),
    );
    const paymentHeaders = {
      "content-type": "application/json",
      "x-goodgood-payment-signature": signFakePaymentWebhook({
        rawBody: paymentPayload,
        secret:
          process.env.GOODGOOD_FAKE_PAYMENT_WEBHOOK_SECRET ??
          "goodgood-fake-payment-local-only",
        timestamp: paymentTimestamp,
      }),
      "x-goodgood-payment-timestamp": String(paymentTimestamp),
    };
    const paymentWebhook = () =>
      fetch(`${webOrigin}/api/billing/webhooks/fake`, {
        body: paymentPayload,
        headers: paymentHeaders,
        method: "POST",
      });
    const paymentWebhookResponse = await paymentWebhook();
    assert.equal(paymentWebhookResponse.status, 200);
    assert.deepEqual(await paymentWebhookResponse.json(), {
      applied: true,
      orderId: paymentOrder.id,
      replayed: false,
      status: "paid",
    });
    const replayedPaymentWebhook = await paymentWebhook();
    assert.equal(replayedPaymentWebhook.status, 200);
    assert.equal((await replayedPaymentWebhook.json()).replayed, true);
    const paidPaymentOrderResponse = await fetch(
      `${webOrigin}/api/billing/orders/${paymentOrder.id}`,
      { headers: authorization() },
    );
    assert.equal(paidPaymentOrderResponse.status, 200);
    assert.equal((await paidPaymentOrderResponse.json()).status, "paid");
    const paidBillingResponse = await fetch(`${webOrigin}/api/billing`, {
      headers: authorization(),
    });
    assert.equal(paidBillingResponse.status, 200);
    const generationStartingCredits = BigInt(
      (await paidBillingResponse.json()).account.availableCredits,
    );
    assert.equal(generationStartingCredits, initialAvailableCredits + 500n);
    await pool.query(
      "DELETE FROM creation_drafts WHERE owner_id = ANY($1::uuid[])",
      [[
        "00000000-0000-4000-8000-000000000001",
        "00000000-0000-4000-8000-000000000002",
      ]],
    );

    const authenticatedSession = await fetch(`${webOrigin}/api/auth/session`, {
      headers: authorization(),
    });
    assert.equal(authenticatedSession.status, 200);
    assert.deepEqual(await authenticatedSession.json(), {
      authenticated: true,
      user: { email: "m3-local@goodgood.invalid" },
    });
    const signedOut = await fetch(`${webOrigin}/api/auth/logout`, {
      headers: { cookie: `goodgood_local_session=${ownerAToken}` },
      method: "POST",
    });
    assert.equal(signedOut.status, 204);
    assert.match(signedOut.headers.get("set-cookie"), /Max-Age=0/);

    const unauthenticated = await fetch(`${webOrigin}/api/generations/missing`);
    assert.equal(unauthenticated.status, 401);
    assert.equal((await unauthenticated.json()).error.code, "SESSION_EXPIRED");

    const oidcEmail = `m4-oidc-${suffix}@goodgood.invalid`;
    const oidcConfig = Object.freeze({
      clientId: "compose-oidc-client",
      clientSecret: "compose-oidc-secret",
      cookieName: "goodgood_oidc_test",
      issuer: "https://mock-authing.invalid/oidc",
      loginCookieName: "goodgood_oidc_test_login",
      loginTtlSeconds: 600,
      logoutRedirectUri: `${webOrigin}/`,
      mode: "oidc",
      redirectUri: `${webOrigin}/api/auth/callback`,
      scopes: "openid profile email",
      secureCookie: false,
      sessionTtlSeconds: 3600,
    });
    const oidcAuthenticate = createRequestAuthenticator({
      config: oidcConfig,
      getPool: async () => pool,
    });
    const oidcOperations = createAuthenticationOperations({
      authenticate: oidcAuthenticate,
      config: oidcConfig,
      getPool: async () => pool,
      oidcClient: {
        buildLogoutUrl() {
          return `https://mock-authing.invalid/login/profile/logout?app_id=compose-oidc-client&redirect_uri=${encodeURIComponent(`${webOrigin}/`)}`;
        },
        async buildAuthorizationUrl(input) {
          return `https://mock-authing.invalid/oidc/auth?state=${input.state}`;
        },
        async exchangeCode({ code }) {
          assert.equal(code, "compose-one-time-code");
          return {
            email: oidcEmail,
            issuer: oidcConfig.issuer,
            name: "Compose OIDC User",
            subject: `compose-subject-${suffix}`,
          };
        },
      },
    });
    const oidcLogin = await oidcOperations.beginLogin("/projects");
    const oidcState = new URL(oidcLogin.location).searchParams.get("state");
    const oidcLoginBinding = /^goodgood_oidc_test_login=([^;]+)/.exec(
      oidcLogin.cookie,
    )?.[1];
    assert.ok(oidcLoginBinding);
    const oidcCompleted = await oidcOperations.completeLogin(
      {
        code: "compose-one-time-code",
        state: oidcState,
      },
      {
        headers: new Headers({
          cookie: `goodgood_oidc_test_login=${oidcLoginBinding}`,
        }),
      },
    );
    const oidcToken = /^goodgood_oidc_test=([^;]+)/.exec(
      oidcCompleted.cookies[0],
    )?.[1];
    assert.ok(oidcToken);
    const oidcOwner = await oidcAuthenticate({
      headers: new Headers({ cookie: `goodgood_oidc_test=${oidcToken}` }),
    });
    assert.equal(oidcOwner.email, oidcEmail);
    assert.equal(oidcCompleted.location, "/projects");
    const persistedOidc = await pool.query(
      `SELECT s.token_hash, i.issuer, i.subject
         FROM auth_sessions s
         JOIN auth_identities i ON i.id = s.auth_identity_id
         JOIN users u ON u.id = s.owner_id
        WHERE u.email = $1`,
      [oidcEmail],
    );
    assert.equal(persistedOidc.rows[0].token_hash, hashAuthenticationSecret(oidcToken));
    assert.equal(persistedOidc.rows[0].issuer, oidcConfig.issuer);
    await oidcOperations.signOut({
      headers: new Headers({ cookie: `goodgood_oidc_test=${oidcToken}` }),
    });
    await assert.rejects(
      oidcAuthenticate({
        headers: new Headers({ cookie: `goodgood_oidc_test=${oidcToken}` }),
      }),
      (error) => error.code === "SESSION_EXPIRED",
    );
    const oidcWelcomeCredit = await pool.query(
      `SELECT a.available_balance, a.reserved_balance,
              count(l.id)::int AS grant_count
         FROM credit_accounts a
         JOIN credit_ledger_entries l ON l.account_id = a.id
        WHERE a.owner_id = $1
          AND l.idempotency_key = $2
        GROUP BY a.id`,
      [oidcOwner.ownerId, `welcome-grant:v1:${oidcOwner.ownerId}`],
    );
    assert.deepEqual(oidcWelcomeCredit.rows[0], {
      available_balance: "100",
      grant_count: 1,
      reserved_balance: "0",
    });

    const referenceBytes = await readFile(
      new URL("../public/nano-fashion.png", import.meta.url),
    );
    const unauthenticatedReference = await fetch(`${webOrigin}/api/references`, {
      body: JSON.stringify({ files: [] }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    assert.equal(unauthenticatedReference.status, 401);

    const uploadIntentResponse = await fetch(`${webOrigin}/api/references`, {
      body: JSON.stringify({
        files: [
          {
            byteSize: referenceBytes.length,
            clientId: `m4-reference-${suffix}`,
            mimeType: "image/png",
            name: "nano-fashion.png",
          },
        ],
      }),
      headers: {
        ...authorization(),
        "content-type": "application/json",
      },
      method: "POST",
    });
    assert.equal(uploadIntentResponse.status, 201);
    const uploadIntent = (await uploadIntentResponse.json()).uploads[0];
    const corsResponse = await fetch(uploadIntent.uploadUrl, {
      headers: {
        "access-control-request-headers": "content-type",
        "access-control-request-method": "PUT",
        origin: webOrigin,
      },
      method: "OPTIONS",
    });
    assert.ok(corsResponse.ok);
    assert.equal(corsResponse.headers.get("access-control-allow-origin"), webOrigin);
    const directUpload = await fetch(uploadIntent.uploadUrl, {
      body: referenceBytes,
      headers: uploadIntent.headers,
      method: "PUT",
    });
    assert.ok(directUpload.ok);
    const completedReferenceResponse = await fetch(
      `${webOrigin}/api/references/${uploadIntent.reference.id}/complete`,
      { headers: authorization(), method: "POST" },
    );
    assert.equal(completedReferenceResponse.status, 200);
    const completedReference = await completedReferenceResponse.json();
    assert.equal(completedReference.status, "ready");
    assert.deepEqual(
      { height: completedReference.height, width: completedReference.width },
      { height: 1402, width: 1122 },
    );
    const referenceEvidence = await pool.query(
      `SELECT owner_id, object_key, upload_state, moderation_state, detected_mime_type,
              pixel_width, pixel_height, byte_size, checksum
         FROM reference_assets WHERE id = $1`,
      [completedReference.id],
    );
    assert.equal(referenceEvidence.rows[0].owner_id, "00000000-0000-4000-8000-000000000001");
    assert.equal(referenceEvidence.rows[0].upload_state, "ready");
    assert.equal(referenceEvidence.rows[0].moderation_state, "accepted");
    assert.equal(referenceEvidence.rows[0].detected_mime_type, "image/png");
    assert.equal(referenceEvidence.rows[0].pixel_width, 1122);
    assert.equal(referenceEvidence.rows[0].pixel_height, 1402);
    assert.match(referenceEvidence.rows[0].checksum, /^[a-f0-9]{64}$/);

    const draftReferenceIntentResponse = await fetch(`${webOrigin}/api/references`, {
      body: JSON.stringify({
        files: [{
          byteSize: referenceBytes.length,
          clientId: `m4-draft-reference-${suffix}`,
          mimeType: "image/png",
          name: "draft-only.png",
        }],
      }),
      headers: {
        ...authorization(),
        "content-type": "application/json",
      },
      method: "POST",
    });
    assert.equal(draftReferenceIntentResponse.status, 201);
    const draftReferenceIntent = (await draftReferenceIntentResponse.json()).uploads[0];
    assert.ok((await fetch(draftReferenceIntent.uploadUrl, {
      body: referenceBytes,
      headers: draftReferenceIntent.headers,
      method: "PUT",
    })).ok);
    const draftReferenceCompleteResponse = await fetch(
      `${webOrigin}/api/references/${draftReferenceIntent.reference.id}/complete`,
      { headers: authorization(), method: "POST" },
    );
    assert.equal(draftReferenceCompleteResponse.status, 200);
    const draftReference = await draftReferenceCompleteResponse.json();

    const unauthenticatedDraft = await fetch(`${webOrigin}/api/draft`);
    assert.equal(unauthenticatedDraft.status, 401);
    const emptyDraftResponse = await fetch(`${webOrigin}/api/draft`, {
      headers: authorization(),
    });
    assert.equal(emptyDraftResponse.status, 200);
    assert.deepEqual(await emptyDraftResponse.json(), { draft: null });
    const draftPayload = {
      expectedVersion: null,
      state: {
        aspectRatio: "1:1",
        count: 1,
        modelId: "nano-banana-2",
        prompt: "M4 reloadable root draft",
        references: [{ id: draftReference.id }],
        resolution: "1K",
      },
    };
    const savedDraftResponse = await fetch(`${webOrigin}/api/draft`, {
      body: JSON.stringify(draftPayload),
      headers: {
        ...authorization(),
        "content-type": "application/json",
      },
      method: "PUT",
    });
    assert.equal(savedDraftResponse.status, 200);
    const savedDraft = await savedDraftResponse.json();
    assert.equal(savedDraft.version, 1);
    assert.equal(savedDraft.state.references[0].id, draftReference.id);
    assert.ok((await fetch(savedDraft.state.references[0].url)).ok);
    const ownerBDraftResponse = await fetch(`${webOrigin}/api/draft`, {
      headers: authorization(ownerBToken),
    });
    assert.deepEqual(await ownerBDraftResponse.json(), { draft: null });
    const staleDraftResponse = await fetch(`${webOrigin}/api/draft`, {
      body: JSON.stringify(draftPayload),
      headers: {
        ...authorization(),
        "content-type": "application/json",
      },
      method: "PUT",
    });
    assert.equal(staleDraftResponse.status, 409);
    const staleDraft = await staleDraftResponse.json();
    assert.equal(staleDraft.error.code, "DRAFT_CONFLICT");
    assert.equal(staleDraft.error.currentDraft.version, 1);
    const updatedDraftResponse = await fetch(`${webOrigin}/api/draft`, {
      body: JSON.stringify({
        ...draftPayload,
        expectedVersion: 1,
        state: { ...draftPayload.state, prompt: "M4 newer tab draft" },
      }),
      headers: {
        ...authorization(),
        "content-type": "application/json",
      },
      method: "PUT",
    });
    assert.equal(updatedDraftResponse.status, 200);
    const updatedDraft = await updatedDraftResponse.json();
    assert.equal(updatedDraft.version, 2);
    assert.equal(updatedDraft.state.prompt, "M4 newer tab draft");

    const crossOwnerComplete = await fetch(
      `${webOrigin}/api/references/${completedReference.id}/complete`,
      { headers: authorization(ownerBToken), method: "POST" },
    );
    assert.equal(crossOwnerComplete.status, 404);
    const crossOwnerGenerate = await fetch(`${webOrigin}/api/generations`, {
      body: JSON.stringify({
        aspectRatio: "1:1",
        count: 1,
        modelId: "nano-banana-2",
        prompt: "cross owner reference",
        references: [{ id: completedReference.id }],
        resolution: "1K",
      }),
      headers: {
        ...authorization(ownerBToken),
        "content-type": "application/json",
        "idempotency-key": `m4-cross-reference-${suffix}`,
      },
      method: "POST",
    });
    assert.equal(crossOwnerGenerate.status, 409);
    assert.equal((await crossOwnerGenerate.json()).error.code, "REFERENCE_NOT_READY");

    const invalidBytes = Buffer.from("not-an-image");
    const invalidIntentResponse = await fetch(`${webOrigin}/api/references`, {
      body: JSON.stringify({
        files: [
          {
            byteSize: invalidBytes.length,
            clientId: `m4-invalid-${suffix}`,
            mimeType: "image/png",
            name: "invalid.png",
          },
        ],
      }),
      headers: {
        ...authorization(),
        "content-type": "application/json",
      },
      method: "POST",
    });
    assert.equal(invalidIntentResponse.status, 201);
    const invalidIntent = (await invalidIntentResponse.json()).uploads[0];
    assert.ok(
      (
        await fetch(invalidIntent.uploadUrl, {
          body: invalidBytes,
          headers: invalidIntent.headers,
          method: "PUT",
        })
      ).ok,
    );
    const invalidComplete = await fetch(
      `${webOrigin}/api/references/${invalidIntent.reference.id}/complete`,
      { headers: authorization(), method: "POST" },
    );
    assert.equal(invalidComplete.status, 400);
    assert.equal((await invalidComplete.json()).error.code, "UPLOAD_DECODE_INVALID");
    const rejectedEvidence = await pool.query(
      "SELECT upload_state, error_code FROM reference_assets WHERE id = $1",
      [invalidIntent.reference.id],
    );
    assert.deepEqual(rejectedEvidence.rows[0], {
      error_code: "UPLOAD_DECODE_INVALID",
      upload_state: "rejected",
    });

    const oversizedIntent = await fetch(`${webOrigin}/api/references`, {
      body: JSON.stringify({
        files: [
          {
            byteSize: 20 * 1024 * 1024 + 1,
            clientId: `m4-oversized-${suffix}`,
            mimeType: "image/png",
            name: "oversized.png",
          },
        ],
      }),
      headers: {
        ...authorization(),
        "content-type": "application/json",
      },
      method: "POST",
    });
    assert.equal(oversizedIntent.status, 400);
    assert.equal((await oversizedIntent.json()).error.code, "UPLOAD_TOO_LARGE");

    const referencedJob = await poll(
      (
        await submit(
          "M4 durable reference success",
          `m4-reference-success-${suffix}`,
          ownerAToken,
          [{ id: completedReference.id }],
        )
      ).id,
    );
    assert.equal(referencedJob.state, "succeeded");
    assert.equal(referencedJob.input.references.length, 1);
    assert.equal(referencedJob.input.references[0].status, "ready");
    assert.ok((await fetch(referencedJob.input.references[0].url)).ok);

    const successKey = `m3-success-${suffix}`;
    const submitted = await submit("M3 durable success", successKey);
    const duplicate = await submit("M3 durable success", successKey);
    assert.equal(duplicate.id, submitted.id);
    const conflictingResponse = await fetch(`${webOrigin}/api/generations`, {
      body: JSON.stringify({
        aspectRatio: "1:1",
        count: 1,
        modelId: "nano-banana-2",
        prompt: "different payload",
        references: [],
        resolution: "1K",
      }),
      headers: {
        ...authorization(),
        "content-type": "application/json",
        "idempotency-key": successKey,
      },
      method: "POST",
    });
    assert.equal(conflictingResponse.status, 409);
    const succeeded = await poll(submitted.id);
    assert.equal(succeeded.state, "succeeded");
    assert.equal(succeeded.outputs.length, 1);
    const assetResponse = await fetch(succeeded.outputs[0].previewUrl);
    assert.equal(assetResponse.status, 200);
    assert.match(assetResponse.headers.get("content-type") ?? "", /^image\/png/);

    const projectSavePayload = {
      batchIds: [succeeded.id, referencedJob.id],
      name: "M4 durable project",
      state: {
        aspectRatio: "1:1",
        count: 1,
        modelId: "nano-banana-2",
        prompt: "M4 saved project draft",
        references: [{ id: completedReference.id }],
        resolution: "1K",
      },
    };
    const createProject = () =>
      fetch(`${webOrigin}/api/projects`, {
        body: JSON.stringify(projectSavePayload),
        headers: {
          ...authorization(),
          "content-type": "application/json",
          "idempotency-key": `m4-project-save-${suffix}`,
        },
        method: "POST",
      });
    const projectResponse = await createProject();
    assert.equal(projectResponse.status, 201);
    const project = await projectResponse.json();
    const duplicateProjectResponse = await createProject();
    assert.equal(duplicateProjectResponse.status, 201);
    assert.equal((await duplicateProjectResponse.json()).id, project.id);
    assert.equal(project.state.prompt, "M4 saved project draft");
    assert.equal(project.state.references.length, 1);
    assert.ok((await fetch(project.state.references[0].url)).ok);
    assert.deepEqual(
      project.batches.map((batch) => batch.id),
      [succeeded.id, referencedJob.id],
    );

    const ownerProjectsResponse = await fetch(`${webOrigin}/api/projects`, {
      headers: authorization(),
    });
    assert.equal(ownerProjectsResponse.status, 200);
    assert.ok(
      (await ownerProjectsResponse.json()).projects.some(
        (candidate) => candidate.id === project.id,
      ),
    );
    const crossOwnerProjectRead = await fetch(
      `${webOrigin}/api/projects/${project.id}`,
      { headers: authorization(ownerBToken) },
    );
    assert.equal(crossOwnerProjectRead.status, 404);
    assert.equal(
      (await crossOwnerProjectRead.json()).error.code,
      "PROJECT_NOT_FOUND",
    );

    const continuedProjectJob = await poll(
      (
        await submit(
          "M4 project continuation",
          `m4-project-continuation-${suffix}`,
          ownerAToken,
          [{ id: completedReference.id }],
          project.id,
        )
      ).id,
    );
    assert.equal(continuedProjectJob.state, "succeeded");
    const restoredProjectResponse = await fetch(
      `${webOrigin}/api/projects/${project.id}`,
      { headers: authorization() },
    );
    assert.equal(restoredProjectResponse.status, 200);
    const restoredProject = await restoredProjectResponse.json();
    assert.equal(restoredProject.batches[0].id, continuedProjectJob.id);
    assert.equal(restoredProject.state.prompt, "M4 project continuation");
    assert.equal(restoredProject.state.references[0].id, completedReference.id);

    const updatedProjectPayload = {
      ...projectSavePayload,
      batchIds: [continuedProjectJob.id, ...projectSavePayload.batchIds],
      name: "M4 restored and updated project",
      state: {
        ...projectSavePayload.state,
        prompt: "M4 draft preserved after continuation",
      },
    };
    const updatedProjectResponse = await fetch(
      `${webOrigin}/api/projects/${project.id}`,
      {
        body: JSON.stringify(updatedProjectPayload),
        headers: {
          ...authorization(),
          "content-type": "application/json",
        },
        method: "PATCH",
      },
    );
    assert.equal(updatedProjectResponse.status, 200);
    const updatedProject = await updatedProjectResponse.json();
    assert.equal(updatedProject.name, "M4 restored and updated project");
    assert.equal(
      updatedProject.state.prompt,
      "M4 draft preserved after continuation",
    );
    const crossOwnerProjectUpdate = await fetch(
      `${webOrigin}/api/projects/${project.id}`,
      {
        body: JSON.stringify(updatedProjectPayload),
        headers: {
          ...authorization(ownerBToken),
          "content-type": "application/json",
        },
        method: "PATCH",
      },
    );
    assert.equal(crossOwnerProjectUpdate.status, 404);
    const projectEvidence = await pool.query(
      `SELECT p.owner_id, p.prompt, count(b.id)::int AS batch_count
         FROM projects p
         JOIN generation_batches b ON b.project_id = p.id
        WHERE p.id = $1
        GROUP BY p.owner_id, p.prompt`,
      [project.id],
    );
    assert.deepEqual(projectEvidence.rows[0], {
      batch_count: 3,
      owner_id: "00000000-0000-4000-8000-000000000001",
      prompt: "M4 draft preserved after continuation",
    });

    const cleanupResources = {
      config: { objectStorage: { bucket: objectStorageBucket } },
      pool,
      storage,
    };
    const cleanupPolicy = {
      batchSize: 1_000,
      cleanupGraceMs: 1,
      cleanupLeaseMs: 30_000,
      orphanRetentionMs: 1,
    };
    const cleanupNow = new Date(Date.now() + 1_000);
    const stagedCleanup = await cleanupReferenceAssets(cleanupResources, {
      now: cleanupNow,
      ownerId: "00000000-0000-4000-8000-000000000001",
      policy: cleanupPolicy,
    });
    assert.ok(stagedCleanup.staged >= 1);
    const executedCleanup = await cleanupReferenceAssets(cleanupResources, {
      now: new Date(cleanupNow.getTime() + 2),
      ownerId: "00000000-0000-4000-8000-000000000001",
      policy: cleanupPolicy,
    });
    assert.ok(executedCleanup.deleted >= 1);
    const cleanupEvidence = await pool.query(
      `SELECT id, object_key, upload_state, object_deleted_at, cleanup_attempt_count
         FROM reference_assets
        WHERE id = ANY($1::uuid[])
        ORDER BY id`,
      [[completedReference.id, draftReference.id, invalidIntent.reference.id]],
    );
    const readyEvidence = cleanupEvidence.rows.find((row) => row.id === completedReference.id);
    const draftReadyEvidence = cleanupEvidence.rows.find((row) => row.id === draftReference.id);
    const deletedEvidence = cleanupEvidence.rows.find((row) => row.id === invalidIntent.reference.id);
    assert.equal(readyEvidence.upload_state, "ready");
    assert.equal(readyEvidence.object_deleted_at, null);
    assert.equal(draftReadyEvidence.upload_state, "ready");
    assert.equal(draftReadyEvidence.object_deleted_at, null);
    assert.equal(deletedEvidence.upload_state, "rejected");
    assert.ok(deletedEvidence.object_deleted_at);
    assert.equal(deletedEvidence.cleanup_attempt_count, 1);
    await storage.send(new HeadObjectCommand({
      Bucket: objectStorageBucket,
      Key: referenceEvidence.rows[0].object_key,
    }));
    await storage.send(new HeadObjectCommand({
      Bucket: objectStorageBucket,
      Key: draftReadyEvidence.object_key,
    }));
    await assert.rejects(
      storage.send(new HeadObjectCommand({
        Bucket: objectStorageBucket,
        Key: deletedEvidence.object_key,
      })),
      (error) => error?.$metadata?.httpStatusCode === 404,
    );
    const repeatedCleanup = await cleanupReferenceAssets(cleanupResources, {
      now: new Date(cleanupNow.getTime() + 4),
      ownerId: "00000000-0000-4000-8000-000000000001",
      policy: cleanupPolicy,
    });
    assert.equal(repeatedCleanup.deleted, 0);

    const staleDeleteDraft = await fetch(`${webOrigin}/api/draft`, {
      body: JSON.stringify({ expectedVersion: 1 }),
      headers: {
        ...authorization(),
        "content-type": "application/json",
      },
      method: "DELETE",
    });
    assert.equal(staleDeleteDraft.status, 409);
    assert.equal((await staleDeleteDraft.json()).error.currentDraft.version, 2);
    const deleteDraft = await fetch(`${webOrigin}/api/draft`, {
      body: JSON.stringify({ expectedVersion: 2 }),
      headers: {
        ...authorization(),
        "content-type": "application/json",
      },
      method: "DELETE",
    });
    assert.equal(deleteDraft.status, 200);
    const stageClearedDraftReference = await cleanupReferenceAssets(cleanupResources, {
      now: new Date(cleanupNow.getTime() + 6),
      ownerId: "00000000-0000-4000-8000-000000000001",
      policy: cleanupPolicy,
    });
    assert.ok(stageClearedDraftReference.staged >= 1);
    const deleteClearedDraftReference = await cleanupReferenceAssets(cleanupResources, {
      now: new Date(cleanupNow.getTime() + 8),
      ownerId: "00000000-0000-4000-8000-000000000001",
      policy: cleanupPolicy,
    });
    assert.ok(deleteClearedDraftReference.deleted >= 1);
    await assert.rejects(
      storage.send(new HeadObjectCommand({
        Bucket: objectStorageBucket,
        Key: draftReadyEvidence.object_key,
      })),
      (error) => error?.$metadata?.httpStatusCode === 404,
    );

    const ownerBSubmitted = await submit(
      "M4 owner B isolated success",
      successKey,
      ownerBToken,
    );
    assert.notEqual(ownerBSubmitted.id, submitted.id);
    const crossOwnerRead = await fetch(
      `${webOrigin}/api/generations/${submitted.id}`,
      { headers: authorization(ownerBToken) },
    );
    assert.equal(crossOwnerRead.status, 404);
    assert.equal((await crossOwnerRead.json()).error.code, "GENERATION_NOT_FOUND");
    const crossOwnerRetry = await fetch(
      `${webOrigin}/api/generations/${submitted.id}/retry`,
      {
        headers: {
          ...authorization(ownerBToken),
          "idempotency-key": `m4-cross-owner-retry-${suffix}`,
        },
        method: "POST",
      },
    );
    assert.equal(crossOwnerRetry.status, 404);
    const ownerBSucceeded = await poll(
      ownerBSubmitted.id,
      undefined,
      30_000,
      ownerBToken,
    );
    assert.equal(ownerBSucceeded.state, "succeeded");
    assert.equal(ownerBSucceeded.outputs.length, 1);
    const unauthenticatedAssets = await fetch(`${webOrigin}/api/assets`);
    assert.equal(unauthenticatedAssets.status, 401);
    assert.equal(
      (await unauthenticatedAssets.json()).error.code,
      "SESSION_EXPIRED",
    );
    const ownerAAssetsResponse = await fetch(`${webOrigin}/api/assets`, {
      headers: authorization(),
    });
    assert.equal(ownerAAssetsResponse.status, 200);
    const ownerAAssets = (await ownerAAssetsResponse.json()).batches;
    assert.ok(ownerAAssets.some((batch) => batch.id === succeeded.id));
    assert.ok(ownerAAssets.some((batch) => batch.id === referencedJob.id));
    assert.ok(ownerAAssets.some((batch) => batch.id === continuedProjectJob.id));
    assert.equal(
      ownerAAssets.some((batch) => batch.id === ownerBSucceeded.id),
      false,
    );
    assert.ok((await fetch(ownerAAssets[0].outputs[0].previewUrl)).ok);
    const ownerBAssetsResponse = await fetch(`${webOrigin}/api/assets`, {
      headers: authorization(ownerBToken),
    });
    assert.equal(ownerBAssetsResponse.status, 200);
    const ownerBAssets = (await ownerBAssetsResponse.json()).batches;
    assert.ok(ownerBAssets.some((batch) => batch.id === ownerBSucceeded.id));
    assert.equal(
      ownerBAssets.some((batch) => batch.id === succeeded.id),
      false,
    );
    const ownerEvidence = await pool.query(
      `SELECT owner_id FROM generation_jobs WHERE id = ANY($1::uuid[]) ORDER BY owner_id`,
      [[submitted.id, ownerBSubmitted.id]],
    );
    assert.deepEqual(
      ownerEvidence.rows.map((row) => row.owner_id),
      [
        "00000000-0000-4000-8000-000000000001",
        "00000000-0000-4000-8000-000000000002",
      ],
    );

    await redis.lPush(GENERATION_READY_QUEUE, submitted.id, submitted.id);
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    const duplicateEvidence = await pool.query(
      `SELECT
         (SELECT count(*)::int FROM generation_jobs WHERE id = $1) AS jobs,
         (SELECT count(*)::int FROM generation_attempts WHERE job_id = $1) AS attempts,
         (SELECT count(*)::int FROM assets WHERE job_id = $1) AS assets`,
      [submitted.id],
    );
    assert.deepEqual(duplicateEvidence.rows[0], { jobs: 1, attempts: 1, assets: 1 });

    const failed = await poll((await submit("M3 模拟 error", `m3-fail-${suffix}`)).id);
    assert.equal(failed.state, "failed");
    assert.equal(failed.error.code, "MODEL_REJECTED");
    const retriedResponse = await fetch(
      `${webOrigin}/api/generations/${failed.id}/retry`,
      {
        headers: {
          ...authorization(),
          "idempotency-key": `m3-retry-${suffix}`,
        },
        method: "POST",
      },
    );
    if (!retriedResponse.ok) throw new Error(await retriedResponse.text());
    const retried = await poll((await retriedResponse.json()).id);
    assert.equal(retried.state, "succeeded");

    const timedOut = await poll(
      (await submit("M3 模拟 timeout", `m3-timeout-${suffix}`)).id,
    );
    assert.equal(timedOut.state, "failed");
    assert.equal(timedOut.error.code, "MODEL_TIMEOUT");

    const slow = await submit("M3 slow worker restart", `m3-restart-${suffix}`);
    await poll(
      slow.id,
      (job) => job.state === "running" || job.state === "refining",
      10_000,
    );
    await execFileAsync("docker", ["compose", "kill", "worker"], {
      cwd: new URL("..", import.meta.url),
      env: composeEnvironment,
    });
    await execFileAsync("docker", ["compose", "up", "--detach", "--wait", "worker"], {
      cwd: new URL("..", import.meta.url),
      env: composeEnvironment,
    });
    const recovered = await poll(slow.id, undefined, 35_000);
    assert.equal(recovered.state, "succeeded");
    const recoveryEvidence = await pool.query(
      "SELECT count(*)::int AS count FROM assets WHERE job_id = $1",
      [slow.id],
    );
    assert.equal(recoveryEvidence.rows[0].count, 1);
    const meteredJobIds = [
      referencedJob.id,
      submitted.id,
      continuedProjectJob.id,
      failed.id,
      retried.id,
      timedOut.id,
      slow.id,
    ];
    const quoteEvidence = await pool.query(
      `SELECT count(*)::int AS count,
              min(b.quoted_credit_amount) AS minimum,
              max(b.quoted_credit_amount) AS maximum
         FROM generation_jobs j
         JOIN generation_batches b ON b.id = j.batch_id
        WHERE j.id = ANY($1::uuid[])
          AND j.credit_reservation_entry_id IS NOT NULL`,
      [meteredJobIds],
    );
    assert.deepEqual(quoteEvidence.rows[0], {
      count: 7,
      maximum: "10",
      minimum: "10",
    });
    const ledgerEvidence = await pool.query(
      `SELECT entry_type, count(*)::int AS count, sum(amount) AS amount
         FROM credit_ledger_entries
        WHERE related_job_id = ANY($1::uuid[])
        GROUP BY entry_type
        ORDER BY entry_type`,
      [meteredJobIds],
    );
    assert.deepEqual(ledgerEvidence.rows, [
      { amount: "20", count: 2, entry_type: "release" },
      { amount: "-70", count: 7, entry_type: "reserve" },
      { amount: "-50", count: 5, entry_type: "settle" },
    ]);
    const finalBillingResponse = await fetch(`${webOrigin}/api/billing`, {
      headers: authorization(),
    });
    assert.equal(finalBillingResponse.status, 200);
    const finalBilling = await finalBillingResponse.json();
    assert.equal(finalBilling.account.reservedCredits, "0");
    assert.equal(
      BigInt(finalBilling.account.availableCredits),
      generationStartingCredits - 50n,
    );
  },
);
