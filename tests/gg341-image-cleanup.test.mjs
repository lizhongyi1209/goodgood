import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { deflateSync } from "node:zlib";
import { Readable } from "node:stream";
import sharp from "sharp";
import { cleanImageMetadata } from "../server/image-cleanup/image.mjs";
import { commitImageCleanup, reserveImageCleanupCredits } from "../server/image-cleanup/repository.mjs";
import { validateImageCleanupInput } from "../server/image-cleanup/validation.mjs";
import { createImageCleanupNodeApiHandler } from "../server/image-cleanup/node-api.mjs";
import { removeImageAiMetadata } from "../server/image-cleanup/api.mjs";
import { ImageCleanupError } from "../server/image-cleanup/errors.mjs";
import { IMAGE_CLEANUP_CREDIT_COST } from "../shared/contracts/image-cleanup.mjs";
import { readImageFileMetadata, writeImageFileMetadata } from "../features/assets/image-file-metadata.mjs";

// Source only under GG-276. Synthetic in-memory images/transactions; no HTTP,
// real database, upload, credentials, worker or paid provider is contacted.
const input = () => ({ requestId: randomUUID(), sourceKind: "reference", sourceId: randomUUID(), name: "sample.png", projectId: null });
function chunk(type, body) {
  const result = Buffer.alloc(body.length + 12); result.writeUInt32BE(body.length); result.write(type, 4); body.copy(result, 8);
  let crc = 0xffffffff;
  for (const byte of result.subarray(4, -4)) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
  result.writeUInt32BE((crc ^ 0xffffffff) >>> 0, result.length - 4); return result;
}
function chunks(bytes) {
  const result = []; let offset = 8;
  while (offset < bytes.length) { const end = offset + bytes.readUInt32BE(offset) + 12; result.push({ type: bytes.toString("ascii", offset + 4, offset + 8), bytes: bytes.subarray(offset, end) }); offset = end; }
  return result;
}
const png = () => sharp({ create: { width: 64, height: 96, channels: 3, background: "#738195" } }).png().toBuffer();
function syntheticJpegC2pa() {
  const box = (type, payload) => { const header = Buffer.alloc(8); header.writeUInt32BE(8 + payload.length); header.write(type, 4); return Buffer.concat([header, payload]); };
  const uuid = Buffer.from([0x63, 0x32, 0x70, 0x61, 0, 0x11, 0, 0x10, 0x80, 0, 0, 0xaa, 0, 0x38, 0x9b, 0x71]);
  const store = box("jumb", Buffer.concat([box("jumd", Buffer.concat([uuid, Buffer.from([3]), Buffer.from("c2pa\0")])), box("cbor", Buffer.from([0xa0]))]));
  const payload = Buffer.concat([Buffer.from([74, 80, 0, 1, 0, 0, 0, 1]), store]);
  const header = Buffer.from([255, 235, 0, 0]); header.writeUInt16BE(payload.length + 2, 2); return Buffer.concat([header, payload]);
}
test("clears EXIF/GPS and ComfyUI text, compressed text, UTF8 text and caBX together without changing PNG pixels", async () => {
  const base = await png();
  const exif = Buffer.from(writeImageFileMetadata(base, { make: "Synthetic camera", latitude: "12", longitude: "34" }).bytes);
  const ihdr = 33;
  const original = Buffer.concat([exif.subarray(0, ihdr),
    chunk("tEXt", Buffer.from('prompt\0{"1":{"class_type":"KSampler"}}')),
    chunk("zTXt", Buffer.concat([Buffer.from("workflow\0\0"), deflateSync(Buffer.from('{"nodes":[]}'))])),
    chunk("iTXt", Buffer.from('parameters\0\0\0\0\0Synthetic UTF8 测试')),
    chunk("caBX", Buffer.from("synthetic content credentials")), exif.subarray(ihdr)]);
  const before = Buffer.from(original);
  const result = await cleanImageMetadata(original, "sample.png");
  assert.deepEqual(original, before); assert.equal(result.name, "sample_去除AI.png");
  assert.equal(result.width, 64); assert.equal(result.height, 96);
  assert.ok(chunks(original).some((c) => c.type === "eXIf"));
  assert.deepEqual(chunks(result.bytes).map((c) => c.type), chunks(base).map((c) => c.type));
  assert.deepEqual(chunks(result.bytes).filter((c) => c.type === "IDAT").map((c) => c.bytes), chunks(base).filter((c) => c.type === "IDAT").map((c) => c.bytes));
  assert.equal(readImageFileMetadata(result.bytes).hasMetadata, false);
  assert.equal(readImageFileMetadata(result.bytes).c2pa, "absent");
});
test("ordinary PNG stays identical, JPEG camera tags clear, and rotated JPEG uses visually oriented lossless PNG", async () => {
  const base = await png(); assert.deepEqual((await cleanImageMetadata(base, "empty.png")).bytes, base);
  const jpeg = await sharp(base).jpeg().toBuffer();
  const tagged = Buffer.from(writeImageFileMetadata(jpeg, { make: "Synthetic", model: "Fixture", iso: "100" }).bytes);
  const stripped = await cleanImageMetadata(tagged, "camera.jpg");
  assert.equal(stripped.mimeType, "image/jpeg"); assert.deepEqual(stripped.bytes, jpeg);
  const credentials = Buffer.concat([tagged.subarray(0, 2), syntheticJpegC2pa(), tagged.subarray(2)]);
  assert.equal(readImageFileMetadata(credentials).c2pa, "present");
  assert.deepEqual((await cleanImageMetadata(credentials, "credentials.jpg")).bytes, jpeg);
  const rotated = await sharp(base).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const result = await cleanImageMetadata(rotated, "rotated.jpg");
  assert.equal(result.mimeType, "image/png"); assert.equal(result.width, 96); assert.equal(result.height, 64);
  assert.equal(readImageFileMetadata(result.bytes).hasMetadata, false);
  assert.deepEqual(await sharp(result.bytes).raw().toBuffer(), await sharp(rotated).rotate().raw().toBuffer());
});
test("empty/oversized/broken/unsupported input is rejected without publishing a misleading clean result", async () => {
  for (const bytes of [Buffer.alloc(0), Buffer.alloc(20 * 1024 * 1024 + 1), Buffer.from("broken image")]) await assert.rejects(cleanImageMetadata(bytes, "bad.jpg"));
  const webp = await sharp(await png()).webp().toBuffer(); await assert.rejects(cleanImageMetadata(webp, "bad.webp"));
});
test("strict source IDs and input contract prevent price, foreign URL and malformed ID injection", () => {
  assert.equal(IMAGE_CLEANUP_CREDIT_COST, 10);
  for (const patch of [{ requestId: [] }, { sourceId: [randomUUID()] }, { sourceKind: "url" }, { url: "https://private.invalid" }, { price: 0 }, { projectId: 1 }, { name: "\n" }]) {
    assert.throws(() => validateImageCleanupInput({ ...input(), ...patch }), { code: "IMAGE_CLEANUP_INPUT_INVALID" });
  }
});
test("personal settlement reserves exactly 10, tracks funded provenance, and closes the updated reservation once", async () => {
  const account = { id: randomUUID(), owner_id: randomUUID(), available_balance: "15", payment_funded_available_balance: "12" };
  const calls = []; let reads = 0;
  const updated = { ...account, available_balance: "5", reserved_balance: "10", payment_funded_available_balance: "5", payment_funded_reserved_balance: "7" };
  const client = { query: async () => ({ rows: [reads++ === 0 ? account : updated] }) };
  const request = input();
  const close = await reserveImageCleanupCredits(client, { id: randomUUID(), kind: "personal" }, account.owner_id, request, { activityCategory: "image_cleanup" }, {
    append: async (_client, operation) => { calls.push(operation); return { entry: { id: "reservation" } }; },
  });
  assert.equal(calls.length, 1); assert.equal(calls[0].amount, -10n); assert.equal(calls[0].paymentFundedAmount, -7n);
  assert.equal(calls[0].relatedImageCleanupId, request.requestId); await close();
  assert.equal(calls[1].entryType, "settle"); assert.equal(calls[1].priorEntryId, "reservation"); assert.equal(calls[1].paymentFundedAmount, -7n);
  assert.equal(calls[1].accountRow.reserved_balance, "10");
  await assert.rejects(reserveImageCleanupCredits({ query: async () => ({ rows: [{ ...account, available_balance: "9", payment_funded_available_balance: "9" }] }) }, { kind: "personal" }, account.owner_id, request, {}), { code: "INSUFFICIENT_POINTS" });
});
test("organization settlement binds actor, workspace and operation to the existing member-budget boundary", async () => {
  const request = input(), workspace = { id: randomUUID(), kind: "organization" }, ownerId = randomUUID(), calls = [];
  const close = await reserveImageCleanupCredits({}, workspace, ownerId, request, { activityCategory: "image_cleanup" }, {
    reserveOrganization: async (_client, args) => calls.push(args), settleOrganization: async (_client, args) => calls.push(args),
  }); await close();
  assert.equal(calls[0].amount, 10n); assert.equal(calls[0].actorOwnerId, ownerId); assert.equal(calls[1].workspaceId, workspace.id);
  assert.equal(calls[0].jobId, request.requestId); assert.equal(calls[1].jobId, request.requestId); assert.equal(calls[1].actor, "system");
});

function transactions({ lostCommit = false, badSource = false, failInsert = false } = {}) {
  const workspace = { id: randomUUID(), kind: "personal" }, ownerId = randomUUID();
  let committed = { operations: {}, copies: {}, charges: 0 };
  const events = []; const pool = { connect: async () => {
    let pending;
    return { release() {}, query: async (sql, args = []) => {
      if (sql === "BEGIN") { pending = structuredClone(committed); return { rows: [] }; }
      if (sql === "ROLLBACK") { pending = null; events.push("rollback"); return { rows: [] }; }
      if (sql === "COMMIT") { committed = pending; events.push("commit"); if (lostCommit) { lostCommit = false; throw new Error("commit reply lost"); } return { rows: [] }; }
      if (sql.includes("pg_advisory")) return { rows: [] };
      if (sql.startsWith("SELECT a.id,a.object_key FROM assets")) return { rows: badSource ? [] : [{ id: args[0], object_key: "generated/original" }] };
      if (sql.startsWith("SELECT * FROM image_cleanup_operations")) return { rows: [pending.operations[args[0]]].filter(Boolean) };
      if (sql.startsWith("SELECT * FROM reference_assets WHERE id=$1 AND workspace_id=$2 AND creator_owner_id=$3")) {
        if (sql.includes("FOR UPDATE")) return { rows: badSource ? [] : [{ id: args[0], object_key: "source/original" }] };
        return { rows: [pending.copies[args[0]]].filter(Boolean) };
      }
      if (sql.startsWith("INSERT INTO image_cleanup_operations")) {
        pending.operations[args[0]] = { id: args[0], owner_id: args[1], workspace_id: args[2], input_hash: args[6] }; return { rows: [] };
      }
      if (sql.startsWith("INSERT INTO reference_assets")) {
        if (failInsert) throw new Error("insert failed");
        const row = { id: args[0], original_file_name: args[4], detected_mime_type: args[5], byte_size: args[6], pixel_width: args[7], pixel_height: args[8], upload_state: "ready", moderation_state: "accepted" };
        pending.copies[row.id] = row; return { rows: [row] };
      }
      if (sql.startsWith("UPDATE image_cleanup_operations")) { pending.operations[args[0]].result_reference_id = args[1]; return { rows: [] }; }
      throw new Error(`Unexpected synthetic query: ${sql}`);
    }, addCharge: () => { pending.charges += 10; } };
  } };
  return { pool, ownerId, workspace, events, state: () => committed,
    resolveAccess: async () => workspace, reserveCredits: async (client) => async () => client.addCharge() };
}
const file = { name: "sample_去除AI.png", mimeType: "image/png", width: 64, height: 96, byteSize: 123, checksum: "0".repeat(64) };
function copyFactory(events, failPrepare = false) {
  return async () => {
    if (failPrepare) throw new Error("decode failed");
    return { file, objectKey: "copy/original", storeObject: async () => events.push("store"), deleteObject: async () => events.push("delete") };
  };
}
test("copy and 10-credit outcome commit together; replay returns same asset without another storage write/charge", async () => {
  const tx = transactions(), request = input(); const options = { ...tx, input: request, prepareCopy: copyFactory(tx.events) };
  const result = await commitImageCleanup(tx.pool, options); const replay = await commitImageCleanup(tx.pool, options);
  assert.deepEqual(replay, result); assert.equal(tx.state().charges, 10); assert.equal(tx.events.filter((e) => e === "store").length, 1);
  await assert.rejects(commitImageCleanup(tx.pool, { ...options, ownerId: randomUUID() }), { code: "IMAGE_CLEANUP_CONFLICT" });
  await assert.rejects(commitImageCleanup(tx.pool, { ...options, input: { ...request, sourceId: randomUUID() } }), { code: "IMAGE_CLEANUP_CONFLICT" });
  assert.equal(tx.state().charges, 10);
});
test("authorization, decode and post-storage DB failure leave no published copy or charge", async () => {
  for (const [settings, failPrepare] of [[{ badSource: true }, false], [{}, true], [{ failInsert: true }, false]]) {
    const tx = transactions(settings); await assert.rejects(commitImageCleanup(tx.pool, { ...tx, input: input(), prepareCopy: copyFactory(tx.events, failPrepare) }));
    assert.equal(tx.state().charges, 0); assert.deepEqual(tx.state().operations, {}); assert.deepEqual(tx.state().copies, {});
    if (settings.failInsert) assert.ok(tx.events.includes("delete"));
  }
});
test("generated output uses the selected stable source and publishes a separate ready reference", async () => {
  const tx = transactions(), request = { ...input(), sourceKind: "asset" }; let sourceKey;
  const result = await commitImageCleanup(tx.pool, { ...tx, input: request, prepareCopy: async (args) => { sourceKey = args.source.object_key; return copyFactory(tx.events)(args); } });
  assert.equal(sourceKey, "generated/original"); assert.notEqual(result.reference.id, request.sourceId); assert.equal(tx.state().charges, 10);
});
test("lost COMMIT reply retains the stored object; identical retry resolves one completed charge", async () => {
  const tx = transactions({ lostCommit: true }), request = input(); const args = { ...tx, input: request, prepareCopy: copyFactory(tx.events) };
  await assert.rejects(commitImageCleanup(tx.pool, args), /commit reply lost/);
  assert.equal(tx.state().charges, 10); assert.ok(!tx.events.includes("delete"));
  const result = await commitImageCleanup(tx.pool, args);
  assert.equal(result.chargedCredits, 10); assert.equal(tx.state().charges, 10); assert.equal(tx.events.filter((e) => e === "store").length, 1);
});
test("service validates and authenticates before resource/object access; HTTP adapter preserves trusted scope", async () => {
  await assert.rejects(removeImageAiMetadata({ input: input(), ownerContext: null }, { getResources: () => assert.fail("no resources before authentication") }));
  await assert.rejects(removeImageAiMetadata({ input: { ...input(), price: 0 }, ownerContext: { ownerId: randomUUID() } }, { getResources: () => assert.fail("no resources for invalid request") }));
  const body = input(), ownerId = randomUUID(), workspaceId = randomUUID(); let submitted;
  const handle = createImageCleanupNodeApiHandler({ authenticate: async () => ({ ownerId }), remove: async (value) => { submitted = value; return { requestId: body.requestId }; } });
  const request = Readable.from([Buffer.from(JSON.stringify(body))]); Object.assign(request, { method: "POST", url: "/api/image-cleanup", headers: { "x-goodgood-workspace-id": workspaceId } });
  const response = { writeHead(status) { this.status = status; }, end(data) { this.data = JSON.parse(data); } };
  assert.equal(await handle(request, response), true); assert.equal(response.status, 200); assert.equal(submitted.ownerContext.ownerId, ownerId); assert.equal(submitted.workspaceId, workspaceId);
  const denied = createImageCleanupNodeApiHandler({ authenticate: async () => { throw new ImageCleanupError("DENIED", "no access", 403); }, remove: () => assert.fail("no processing without authentication") });
  const bad = Readable.from([Buffer.from("not json")]); Object.assign(bad, { method: "POST", url: "/api/image-cleanup", headers: {} });
  await denied(bad, response); assert.equal(response.status, 403);
});
