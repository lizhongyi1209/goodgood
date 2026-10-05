import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { referenceFileFingerprint, markReferenceFileAsCopy, referenceFileCanReuse,
  storedReferenceFile, restoredReferenceFile, uniqueReadyReferenceItems }
  from "../features/references/reference-file-identity.mjs";
import { validateReferenceUploadRequest } from "../server/references/validation.mjs";
import { referenceUploadClientKey, referenceUploadLockKey, assertReferenceUploadChecksum }
  from "../server/references/upload-reuse.mjs";

const bytes = Uint8Array.of(137, 80, 78, 71, 1, 2, 3);
const fingerprint = createHash("sha256").update(bytes).digest("hex");
const upload = { clientId: "local-example", name: "example.png", mimeType: "image/png", byteSize: bytes.length };
const hashed = { ...upload, checksum: fingerprint, reuseExisting: true };

test("same complete bytes match regardless of file name; changing bytes changes identity", async () => {
  const first = new File([bytes], "first.png", { type: "image/png" });
  const renamed = new File([bytes], "renamed.png", { type: "image/png" });
  const changed = new File([bytes, Uint8Array.of(4)], "first.png", { type: "image/png" });
  assert.equal(await referenceFileFingerprint(first), fingerprint);
  assert.equal(await referenceFileFingerprint(renamed), fingerprint);
  assert.notEqual(await referenceFileFingerprint(changed), fingerprint);
});

test("file reads are shared and a failed read can be retried", async () => {
  let reads = 0;
  const file = { arrayBuffer: async () => { reads += 1; return bytes.buffer; } };
  assert.deepEqual(await Promise.all([referenceFileFingerprint(file), referenceFileFingerprint(file)]), [fingerprint, fingerprint]);
  assert.equal(reads, 1);
  let attempts = 0;
  const retry = { arrayBuffer: async () => { if (++attempts === 1) throw new Error("read failed"); return bytes.buffer; } };
  await assert.rejects(referenceFileFingerprint(retry), /read failed/);
  assert.equal(await referenceFileFingerprint(retry), fingerprint);
  assert.equal(attempts, 2);
});

test("edited copies retain independent policy across local storage restoration", async () => {
  const original = new File([bytes], "original.png", { type: "image/png" });
  const copy = markReferenceFileAsCopy(new File([bytes], "edited.png", { type: "image/png" }));
  assert.equal(referenceFileCanReuse(original), true);
  assert.equal(referenceFileCanReuse(copy), false);
  assert.equal(await referenceFileFingerprint(original), await referenceFileFingerprint(copy));
  assert.equal(storedReferenceFile(original), original);
  assert.equal(storedReferenceFile(copy).reuseExisting, false);
  const restored = restoredReferenceFile({ file: new File([bytes], "edited.png"), reuseExisting: false });
  assert.equal(referenceFileCanReuse(restored), false);
  assert.equal(restoredReferenceFile(original), original);
  assert.equal(restoredReferenceFile(null), null);
});

test("successful reused IDs collapse without hiding pending/failed items or changing ready order", () => {
  const item = (id, status, label) => ({ reference: { id, status }, label });
  const first = item("a", "ready", "first");
  const pending = item("a", "uploading", "loading"), failed = item("a", "failed", "retry"), second = item("b", "ready", "second");
  const items = [first, pending, item("a", "ready", "duplicate"), failed, second];
  assert.deepEqual(uniqueReadyReferenceItems(items), [first, pending, failed, second]);
  const unchanged = [first, pending, failed, second];
  assert.equal(uniqueReadyReferenceItems(unchanged), unchanged);
});

test("fingerprint requests validate optional policy and preserve legacy requests", () => {
  assert.deepEqual(validateReferenceUploadRequest({ files: [upload] }), [upload]);
  assert.deepEqual(validateReferenceUploadRequest({ files: [{ ...hashed, checksum: fingerprint.toUpperCase() }] }), [hashed]);
  assert.equal(validateReferenceUploadRequest({ files: [{ ...hashed, reuseExisting: false }] })[0].reuseExisting, false);
  for (const invalid of [{ checksum: "" }, { checksum: "x".repeat(64) }, { checksum: 1 }, { reuseExisting: false },
    { checksum: fingerprint, reuseExisting: "false" }]) {
    assert.throws(() => validateReferenceUploadRequest({ files: [{ ...upload, ...invalid }] }),
      (error) => error.code === "INVALID_UPLOAD_REQUEST");
  }
});

test("upload operation keys are stable on retry and distinguish changed files and independent copies", () => {
  const key = referenceUploadClientKey(hashed);
  assert.equal(referenceUploadClientKey({ ...hashed, name: "renamed.png" }), key);
  assert.notEqual(referenceUploadClientKey({ ...hashed, checksum: "f".repeat(64) }), key);
  assert.notEqual(referenceUploadClientKey({ ...hashed, clientId: "another-copy", reuseExisting: false }), key);
  assert.notEqual(referenceUploadClientKey({ ...hashed, reuseExisting: false }), key);
  assert.notEqual(referenceUploadLockKey("workspace-a", "owner", fingerprint), referenceUploadLockKey("workspace-b", "owner", fingerprint));
  assert.notEqual(referenceUploadLockKey("workspace", "owner-a", fingerprint), referenceUploadLockKey("workspace", "owner-b", fingerprint));
});

test("completion verifies uploaded bytes against the declaration while legacy uploads remain compatible", () => {
  assert.doesNotThrow(() => assertReferenceUploadChecksum({}, fingerprint));
  assert.doesNotThrow(() => assertReferenceUploadChecksum({ declared_checksum: fingerprint }, fingerprint));
  assert.throws(() => assertReferenceUploadChecksum({ declared_checksum: "a".repeat(64) }, fingerprint),
    (error) => error.code === "UPLOAD_CHECKSUM_MISMATCH");
});

// Exercise the repository's completion race without SQL, storage or provider writes.
test("a second completion accepts the matching ready record and rejects unrelated or deleted records", async () => {
  const { markReferenceReady } = await import("../server/references/repository.mjs");
  const options = { ownerId: "owner", workspaceId: "workspace", referenceId: "reference", byteSize: 100,
    checksum: fingerprint, detectedMimeType: "image/png", width: 100, height: 100 };
  const ready = { id: options.referenceId, upload_state: "ready", moderation_state: "accepted", checksum: fingerprint,
    byte_size: "100", detected_mime_type: "image/png", object_deleted_at: null };
  const pool = (record) => ({ query: async (sql) => {
    if (sql.includes("FROM users u")) return { rows: [{ workspace_id: "workspace", kind: "personal", status: "active" }], rowCount: 1 };
    if (sql.includes("UPDATE reference_assets")) return { rows: [], rowCount: 0 };
    return { rows: [record], rowCount: 1 };
  } });
  assert.equal(await markReferenceReady(pool(ready), options), ready);
  for (const changed of [{ ...ready, checksum: "f".repeat(64) }, { ...ready, object_deleted_at: "deleted" },
    { ...ready, moderation_state: "rejected" }]) {
    await assert.rejects(markReferenceReady(pool(changed), options), (error) => error.code === "REFERENCE_STATE_CONFLICT");
  }
});
