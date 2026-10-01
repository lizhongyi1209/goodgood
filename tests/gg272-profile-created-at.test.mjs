import assert from "node:assert/strict";
import test from "node:test";
import { readPersonalProfile, updatePersonalProfile, validateProfileInput } from "../server/profile/api.mjs";

const ownerId = "00000000-0000-4000-8000-000000000272";
const createdAt = "2026-09-30T16:07:00.000Z";
const input = { displayName: "mimi", avatarReferenceId: null, version: 0 };

test("GG-272 reads the account timestamp before profile setup and preserves it after saving", async () => {
  let saved = false;
  const queries = [];
  const query = async (sql, values) => {
    queries.push(sql);
    if (sql.includes("LEFT JOIN personal_profiles")) {
      assert.match(sql, /u\.created_at AS account_created_at/);
      assert.match(sql, /WHERE u\.id=\$1/);
      assert.equal(values[0], ownerId);
      return { rows: [{ account_created_at: new Date(createdAt), created_at: new Date("2026-10-01T12:00:00Z"), public_user_id: 272, version: saved ? 1 : 0 }] };
    }
    if (sql.includes("FROM users")) return { rows: [{ workspace_id: ownerId, kind: "personal", status: "active" }] };
    if (sql.startsWith("INSERT")) { saved = true; return { rows: [{ owner_id: ownerId }] }; }
    return { rows: [] };
  };
  const resources = { pool: { query, async connect() { return { query, release() {} }; } } };
  const before = await readPersonalProfile({ ownerContext: { ownerId }, resources });
  assert.equal(before.createdAt, createdAt);
  assert.equal(before.version, 0);
  assert(!queries.some(sql => /INSERT|UPDATE/.test(sql)));
  const after = await updatePersonalProfile({ ownerContext: { ownerId }, input, resources });
  assert.equal(after.createdAt, createdAt);
  assert.equal(after.version, 1);
  assert(!queries.some(sql => /^UPDATE users/.test(sql)));
});

test("GG-272 creation time remains immutable through the owner profile API", () => {
  assert.throws(() => validateProfileInput({ ...input, createdAt }), error => error.code === "PROFILE_INVALID");
});
