import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  bindExistingOwnerEmails,
  prepareEmailBindingManifest,
  previewExistingOwnerEmailBindings,
} from "../server/auth/email-binding-maintenance.mjs";
import {
  parseEmailBindingArguments,
  runEmailBindingCommand,
} from "../server/runtime/bind-existing-owner-emails.mjs";

const SITE_OWNER_ID = "10000000-0000-4000-8000-000000000001";
const MEMBER_ID = "20000000-EBAD-4000-8000-000000000002".toLowerCase();
const MANIFEST_SHA256 = "a".repeat(64);

function manifest(bindings = [
  {
    administratorVerified: true,
    email: "Owner@Example.com",
    mailboxVerified: true,
    ownerId: SITE_OWNER_ID,
  },
  {
    email: "member@example.com",
    mailboxVerified: true,
    ownerId: MEMBER_ID,
  },
]) {
  return { bindings, expectedBindings: bindings.length, schemaVersion: 1 };
}

function input(overrides = {}) {
  return {
    manifest: manifest(),
    manifestSha256: MANIFEST_SHA256,
    operatorId: "operator-gg029",
    reference: "gg029-reviewed-owner-bindings",
    ...overrides,
  };
}

function fakeDatabase() {
  const state = {
    bindings: [],
    identities: [
      { issuer: "https://old-idp.example.com", owner_id: SITE_OWNER_ID },
      { issuer: "https://old-idp.example.com", owner_id: MEMBER_ID },
    ],
    owners: [
      { email: "owner@example.com", id: SITE_OWNER_ID, status: "active" },
      { email: "member@example.com", id: MEMBER_ID, status: "pending" },
    ],
    roles: [{ owner_id: SITE_OWNER_ID, role: "site_owner" }],
    statements: [],
  };
  const client = {
    async query(sql, values = []) {
      const normalized = sql.replace(/\s+/g, " ").trim();
      state.statements.push(normalized);
      if (["BEGIN", "COMMIT", "ROLLBACK"].includes(normalized)) {
        return { rowCount: null, rows: [] };
      }
      if (normalized.startsWith("SELECT pg_advisory_xact_lock")) {
        return { rowCount: 1, rows: [{}] };
      }
      if (normalized.startsWith("SELECT owner.id")) {
        const rows = state.owners
          .filter((owner) => values[0].includes(owner.id))
          .map((owner) => ({
            ...owner,
            has_legacy_identity: state.identities.some(
              (identity) =>
                identity.owner_id === owner.id && identity.issuer !== values[1],
            ),
            is_site_owner: state.roles.some(
              (role) => role.owner_id === owner.id && role.role === "site_owner",
            ),
          }));
        return { rowCount: rows.length, rows };
      }
      if (normalized.startsWith("SELECT role.owner_id")) {
        const rows = state.roles
          .filter((role) => role.role === "site_owner")
          .slice(0, 2)
          .map((role) => ({
            owner_id: role.owner_id,
            has_email_binding: state.bindings.some(
              (binding) => binding.owner_id === role.owner_id,
            ),
          }));
        return { rowCount: rows.length, rows };
      }
      if (normalized.startsWith("SELECT identity_id, owner_id")) {
        const rows = state.bindings.filter(
          (binding) =>
            values[0].includes(binding.owner_id) ||
            values[1].includes(binding.normalized_email),
        );
        return { rowCount: rows.length, rows };
      }
      if (normalized.startsWith("INSERT INTO auth_identities")) {
        state.identities.push({
          id: values[0],
          issuer: values[2],
          owner_id: values[1],
          subject: values[3],
        });
        return { rowCount: 1, rows: [] };
      }
      if (normalized.startsWith("INSERT INTO auth_email_bindings")) {
        state.bindings.push({
          display_email: values[3],
          identity_id: values[0],
          migrated_by_operator_id: values[5],
          migration_manifest_sha256: values[4],
          migration_reference_hash: values[6],
          normalized_email: values[2],
          owner_id: values[1],
          source: "operator_migration",
        });
        return { rowCount: 1, rows: [] };
      }
      throw new Error(`Unexpected SQL: ${normalized}`);
    },
    release() {},
  };
  return {
    client,
    pool: {
      async connect() {
        return client;
      },
      query: client.query.bind(client),
    },
    state,
  };
}

test("email owner binding manifest is exact, reviewed, and duplicate-safe", () => {
  const prepared = prepareEmailBindingManifest(manifest(), input());
  assert.equal(prepared.entries[0].normalizedEmail, "owner@example.com");
  assert.equal(prepared.expectedBindings, 2);
  assert.equal(prepared.referenceHash.length, 64);

  assert.throws(
    () =>
      prepareEmailBindingManifest(
        { ...manifest(), expectedBindings: 3 },
        input(),
      ),
    (error) => error.code === "EMAIL_BINDING_MANIFEST_INVALID",
  );
  assert.throws(
    () =>
      prepareEmailBindingManifest(
        manifest([
          manifest().bindings[0],
          { ...manifest().bindings[0], email: "different@example.com" },
        ]),
        input(),
      ),
    /duplicate owner IDs/,
  );
  assert.throws(
    () =>
      prepareEmailBindingManifest(
        manifest([{ ...manifest().bindings[0], mailboxVerified: false }]),
        input(),
      ),
    /mailboxVerified must be true/,
  );
});

test("existing owner binding is dry-run by default and creates no product mutations", async () => {
  const database = fakeDatabase();
  const result = await previewExistingOwnerEmailBindings(database.pool, input());
  assert.deepEqual(
    result.bindings.map(({ account, ownerId, state }) => ({ account, ownerId, state })),
    [
      { account: "Ow***@Example.com", ownerId: SITE_OWNER_ID, state: "pending" },
      { account: "me****@example.com", ownerId: MEMBER_ID, state: "pending" },
    ],
  );
  assert.equal(result.pendingBindings, 2);
  assert.equal(result.createdBindings, 0);
  assert.equal(database.state.bindings.length, 0);
  assert.doesNotMatch(database.state.statements.join("\n"), /UPDATE users|credit_/);
});

test("audited owner binding preserves owners and replays without additional writes", async () => {
  const database = fakeDatabase();
  const first = await bindExistingOwnerEmails(database.pool, input());
  assert.equal(first.createdBindings, 2);
  assert.equal(first.pendingBindings, 0);
  assert.deepEqual(first.bindings.map((binding) => binding.state), ["created", "created"]);
  assert.equal(database.state.bindings.length, 2);
  assert.equal(database.state.identities.length, 4);
  assert.ok(
    database.state.bindings.every(
      (binding) =>
        binding.migration_manifest_sha256 === MANIFEST_SHA256 &&
        binding.migrated_by_operator_id === "operator-gg029" &&
        binding.migration_reference_hash.length === 64,
    ),
  );
  const writeCount = database.state.statements.filter((statement) =>
    statement.startsWith("INSERT INTO"),
  ).length;

  const replay = await bindExistingOwnerEmails(database.pool, input());
  assert.equal(replay.createdBindings, 0);
  assert.equal(replay.replayedBindings, 2);
  assert.deepEqual(replay.bindings.map((binding) => binding.state), ["replayed", "replayed"]);
  assert.equal(
    database.state.statements.filter((statement) => statement.startsWith("INSERT INTO"))
      .length,
    writeCount,
  );
  assert.doesNotMatch(database.state.statements.join("\n"), /UPDATE users|credit_/);
});

test("binding fails closed for an unverified site owner or an account mismatch", async () => {
  const unverified = fakeDatabase();
  await assert.rejects(
    previewExistingOwnerEmailBindings(
      unverified.pool,
      input({
        manifest: manifest([
          { ...manifest().bindings[0], administratorVerified: false },
        ]),
      }),
    ),
    (error) => error.code === "EMAIL_BINDING_SITE_OWNER_UNVERIFIED",
  );

  const mismatch = fakeDatabase();
  mismatch.state.owners[1].email = "someone-else@example.com";
  await assert.rejects(
    previewExistingOwnerEmailBindings(mismatch.pool, input()),
    (error) => error.code === "EMAIL_BINDING_OWNER_EMAIL_MISMATCH",
  );
});

test("binding rejects conflicting identities and requires the unbound site owner first", async () => {
  const conflict = fakeDatabase();
  conflict.state.bindings.push({
    identity_id: "30000000-0000-4000-8000-000000000003",
    migrated_by_operator_id: null,
    migration_manifest_sha256: null,
    migration_reference_hash: null,
    normalized_email: "member@example.com",
    owner_id: SITE_OWNER_ID,
    source: "self_service",
  });
  await assert.rejects(
    previewExistingOwnerEmailBindings(conflict.pool, input()),
    (error) => error.code === "EMAIL_BINDING_CONFLICT",
  );

  const ordering = fakeDatabase();
  await assert.rejects(
    previewExistingOwnerEmailBindings(
      ordering.pool,
      input({ manifest: manifest([...manifest().bindings].reverse()) }),
    ),
    (error) => error.code === "EMAIL_BINDING_SITE_OWNER_FIRST",
  );
});

test("email binding CLI requires reviewed inputs and remains dry-run unless executed", () => {
  const parsed = parseEmailBindingArguments([
    "--manifest",
    "/run/email-owner-bindings.json",
    "--sha256",
    createHash("sha256").update("manifest").digest("hex"),
    "--operator",
    "operator-gg029",
    "--reference",
    "reviewed-2026-09-10",
  ]);
  assert.equal(parsed.execute, false);
  assert.equal(
    parseEmailBindingArguments([
      "--execute",
      "--manifest",
      "/run/email-owner-bindings.json",
      "--sha256",
      "a".repeat(64),
      "--operator",
      "operator-gg029",
      "--reference",
      "reviewed-2026-09-10",
    ]).execute,
    true,
  );
  assert.throws(() => parseEmailBindingArguments([]), /--manifest is required/);
});

test("email binding runtime emits only stable failure codes", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) =>
    readFile(
      new URL("../server/runtime/bind-existing-owner-emails.mjs", import.meta.url),
      "utf8",
    ),
  );
  assert.match(source, /error\.code\.startsWith\("EMAIL_BINDING_"\)/);
  assert.match(source, /: "EMAIL_BINDING_FAILED"/);
  assert.doesNotMatch(source, /message:\s*error/);
});

test("email binding command rejects an unbounded or linked manifest before reading it", async () => {
  let read = false;
  await assert.rejects(
    runEmailBindingCommand({
      arguments_: [
        "--manifest",
        "linked.json",
        "--sha256",
        "a".repeat(64),
        "--operator",
        "operator-gg029",
        "--reference",
        "reviewed-2026-09-10",
      ],
      databaseUrl: "postgresql://unused.invalid/goodgood",
      lstat_: async () => ({
        isFile: () => true,
        isSymbolicLink: () => true,
        size: 200,
      }),
      readFile_: async () => {
        read = true;
        return Buffer.from("{}");
      },
    }),
    /bounded regular file/,
  );
  assert.equal(read, false);
});
