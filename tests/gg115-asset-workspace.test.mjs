import assert from "node:assert/strict";
import test from "node:test";
import { S3Client } from "@aws-sdk/client-s3";
import { createAssetFolder, deleteAssetFolder, listAssetOrganization, saveAssetOrganization } from "../server/assets/organization.mjs";
import { createAudioMaterialUpload, completeAudioMaterialUpload, getAudioMaterialStatus, listAudioMaterials,
  validateAudioObjectHeader, validateAudioUploadRequest } from "../server/audio-materials/api.mjs";
import { cleanupExpiredAudioUploads } from "../server/audio-materials/cleanup.mjs";
import { PRIVATE_AUDIO_UPLOAD_MAX_BYTES } from "../shared/contracts/upload-limits.mjs";

const assetId = "30000000-0000-4000-8000-000000000001";
const owner = { ownerId: "owner-a" };

function workspaceResult(ownerId, workspaceId) {
  return ownerId === "owner-a" && (workspaceId === null || workspaceId === "workspace-a")
    ? { rows: [{ workspace_id: "workspace-a", kind: "personal", status: "active" }] }
    : { rows: [] };
}

test("GG-115 organization lists empty state and keeps generated object identity while assigning folder", async () => {
  const folders = [];
  const arrangements = [];
  const queries = [];
  const pool = {
    async query(sql, values = []) {
      queries.push([sql, values]);
      if (sql.includes("FROM users u")) return workspaceResult(values[0], values[1]);
      if (sql.startsWith("SELECT id,name,created_at FROM asset_folders")) return { rows: folders };
      if (sql.startsWith("SELECT asset_kind,asset_id,folder_id,tags FROM asset_organization")) return { rows: arrangements };
      if (sql.startsWith("INSERT INTO asset_folders")) {
        const row = { id: values[0], name: values[3], created_at: new Date() };
        folders.push(row);
        return { rowCount: 1, rows: [row] };
      }
      if (sql.startsWith("SELECT id FROM assets")) return { rowCount: values[0] === assetId && values[2] === "owner-a" ? 1 : 0, rows: [{ id: assetId }] };
      if (sql.startsWith("SELECT id FROM asset_folders")) return { rowCount: folders.some((row) => row.id === values[0]) ? 1 : 0 };
      if (sql.startsWith("INSERT INTO asset_organization")) {
        arrangements.push({ asset_kind: values[2], asset_id: values[3], folder_id: values[4], tags: values[5] });
        return { rowCount: 1 };
      }
      if (sql.startsWith("UPDATE asset_organization")) {
        for (const entry of arrangements) if (entry.folder_id === values[0]) entry.folder_id = null;
        return { rowCount: 1 };
      }
      if (sql.startsWith("DELETE FROM asset_folders")) {
        folders.splice(folders.findIndex((row) => row.id === values[0]), 1);
        return { rowCount: 1 };
      }
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") return { rowCount: 0 };
      throw Error(`Unexpected SQL: ${sql.slice(0, 100)}`);
    },
    async connect() { return { query: (sql, values) => pool.query(sql, values), release() {} }; },
  };
  const resourcesOverride = { pool };
  assert.deepEqual(await listAssetOrganization({ ownerContext: owner, resourcesOverride }), { folders: [], arrangements: [] });
  const folder = (await createAssetFolder({ input: { name: "人物" }, ownerContext: owner, resourcesOverride })).folder;
  const placed = await saveAssetOrganization({ kind: "generated", assetId, input: { folderId: folder.id, tags: ["人物"] },
    ownerContext: owner, resourcesOverride });
  assert.deepEqual(placed, { kind: "generated", id: assetId, folderId: folder.id, tags: ["人物"] });
  assert.equal((await listAssetOrganization({ ownerContext: owner, resourcesOverride })).arrangements[0].id, assetId);
  assert.match(queries.find(([sql]) => sql.startsWith("SELECT id FROM assets"))[0], /creator_owner_id=\$3/);
  await assert.rejects(saveAssetOrganization({ kind: "generated", assetId,
    input: { folderId: folder.id, tags: ["人物"] }, ownerContext: { ownerId: "owner-b" }, resourcesOverride }));
  await deleteAssetFolder({ folderId: folder.id, ownerContext: owner, resourcesOverride });
  assert.equal((await listAssetOrganization({ ownerContext: owner, resourcesOverride })).arrangements[0].folderId, null);
});

test("GG-115 MP3 validates size and magic before becoming visible, and isolates owners", async () => {
  const valid = { clientId: "a", name: "voice.mp3", mimeType: "audio/mpeg", byteSize: 32 };
  assert.deepEqual(validateAudioUploadRequest(valid), valid);
  assert.equal(PRIVATE_AUDIO_UPLOAD_MAX_BYTES, 20 * 1024 * 1024);
  assert.throws(() => validateAudioUploadRequest({ ...valid, byteSize: PRIVATE_AUDIO_UPLOAD_MAX_BYTES + 1 }),
    (error) => error.code === "UPLOAD_TOO_LARGE");
  assert.throws(() => validateAudioUploadRequest({ ...valid, mimeType: "audio/wav" }),
    (error) => error.code === "UPLOAD_TYPE_INVALID");
  assert.doesNotThrow(() => validateAudioObjectHeader(Buffer.from("ID3some mp3 bytes"), "audio/mpeg"));
  assert.throws(() => validateAudioObjectHeader(Buffer.from("RIFFWAVE"), "audio/mpeg"),
    (error) => error.code === "UPLOAD_CONTENT_INVALID");
  let row = null;
  const publicStorage = new S3Client({ credentials: { accessKeyId: "disposable", secretAccessKey: "disposable-secret" },
    endpoint: "http://127.0.0.1:58049", forcePathStyle: true, region: "us-east-1" });
  const pool = { async query(sql, values = []) {
    if (sql.includes("FROM users u")) return workspaceResult(values[0], values[1]);
    if (sql.startsWith("INSERT INTO audio_materials")) {
      row = { id: values[0], owner_id: values[1], workspace_id: values[2], object_key: values[3],
        original_file_name: values[4], declared_mime_type: values[5], declared_byte_size: values[6],
        expires_at: new Date(Date.now() + 600_000), upload_state: "pending" };
      return { rows: [{ expires_at: row.expires_at }], rowCount: 1 };
    }
    if (sql.startsWith("SELECT * FROM audio_materials")) return { rows: row && row.id === values[0] && row.owner_id === values[2] ? [row] : [] };
    if (sql.startsWith("UPDATE audio_materials SET upload_state='ready'")) {
      row = { ...row, upload_state: "ready", uploaded_at: new Date() }; return { rows: [row], rowCount: 1 };
    }
    if (sql.startsWith("SELECT id,object_key")) return { rows: row?.upload_state === "ready" && values[1] === row.owner_id ? [row] : [] };
    throw Error(`Unexpected SQL: ${sql.slice(0, 100)}`);
  } };
  const storage = { async send(command) {
    if (["HeadBucketCommand", "PutBucketCorsCommand"].includes(command.constructor.name)) return {};
    if (command.constructor.name === "HeadObjectCommand") return { ContentLength: 32, ContentType: "audio/mpeg" };
    if (command.constructor.name === "GetObjectCommand") return { Body: { async transformToByteArray() { return Buffer.from("ID3some mp3 bytes"); } } };
    throw Error(`Unexpected storage command: ${command.constructor.name}`);
  } };
  const resourcesOverride = { pool, storage, publicStorage,
    config: { objectStorage: { bucket: "disposable-audio-test", provisioningMode: "manage", uploadAllowedOrigins: ["http://127.0.0.1:32131"] } } };
  const intent = await createAudioMaterialUpload({ file: valid, ownerContext: owner, resourcesOverride });
  assert.match(intent.uploadUrl, /disposable-audio-test/);
  assert.equal((await listAudioMaterials({ ownerContext: owner, resourcesOverride })).materials.length, 0);
  await completeAudioMaterialUpload({ materialId: intent.material.id, ownerContext: owner, resourcesOverride });
  assert.equal((await getAudioMaterialStatus({ materialId: intent.material.id, ownerContext: owner, resourcesOverride })).status, "ready");
  const material = (await listAudioMaterials({ ownerContext: owner, resourcesOverride })).materials[0];
  assert.equal(material.id, intent.material.id);
  assert.match(material.url, /^http:\/\/127\.0\.0\.1:58049\//);
  await assert.rejects(getAudioMaterialStatus({ materialId: material.id,
    ownerContext: { ownerId: "owner-b" }, resourcesOverride }));
  assert.deepEqual(await cleanupExpiredAudioUploads({ pool: { query: async () => ({ rowCount: 0, rows: [] }) } }),
    { eligible: 0, deleted: 0, failed: 0 });
});
