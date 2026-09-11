import { createHash, randomUUID } from "node:crypto";
import {
  maskEmailAddress,
  normalizeEmailAddress,
} from "./email-policy.mjs";

export const EMAIL_IDENTITY_ISSUER = "urn:goodgood:email";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

export class EmailBindingMaintenanceError extends Error {
  constructor(code, message, status = 409) {
    super(message);
    this.name = "EmailBindingMaintenanceError";
    this.code = code;
    this.status = status;
  }
}

function invalid(message) {
  return new EmailBindingMaintenanceError(
    "EMAIL_BINDING_MANIFEST_INVALID",
    message,
    400,
  );
}

function requireText(value, field, minimum, maximum) {
  const text = typeof value === "string" ? value.trim() : "";
  if (
    text.length < minimum ||
    text.length > maximum ||
    /[\u0000-\u001f\u007f]/.test(text)
  ) {
    throw invalid(`${field} must contain ${minimum} to ${maximum} characters.`);
  }
  return text;
}

function exactKeys(value, allowed, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw invalid(`${label} must be an object.`);
  }
  const unexpected = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unexpected.length) throw invalid(`${label} contains unsupported fields.`);
}

function normalizedEntry(value, index) {
  exactKeys(
    value,
    ["administratorVerified", "email", "mailboxVerified", "ownerId"],
    `bindings[${index}]`,
  );
  if (!UUID_PATTERN.test(value.ownerId ?? "")) {
    throw invalid(`bindings[${index}].ownerId must be a UUID.`);
  }
  if (value.mailboxVerified !== true) {
    throw invalid(`bindings[${index}].mailboxVerified must be true.`);
  }
  if (
    value.administratorVerified !== undefined &&
    typeof value.administratorVerified !== "boolean"
  ) {
    throw invalid(
      `bindings[${index}].administratorVerified must be a boolean when supplied.`,
    );
  }
  let email;
  try {
    email = normalizeEmailAddress(value.email);
  } catch {
    throw invalid(`bindings[${index}].email is invalid.`);
  }
  return Object.freeze({
    administratorVerified: value.administratorVerified === true,
    displayEmail: email.displayEmail,
    normalizedEmail: email.normalizedEmail,
    ownerId: value.ownerId.toLowerCase(),
  });
}

export function prepareEmailBindingManifest(
  manifest,
  { manifestSha256, operatorId, reference },
) {
  exactKeys(manifest, ["bindings", "expectedBindings", "schemaVersion"], "manifest");
  if (manifest.schemaVersion !== 1) {
    throw invalid("manifest.schemaVersion must be 1.");
  }
  if (
    !Number.isInteger(manifest.expectedBindings) ||
    manifest.expectedBindings < 1 ||
    manifest.expectedBindings > 100
  ) {
    throw invalid("manifest.expectedBindings must be an integer from 1 to 100.");
  }
  if (
    !Array.isArray(manifest.bindings) ||
    manifest.bindings.length !== manifest.expectedBindings
  ) {
    throw invalid("manifest bindings must match expectedBindings exactly.");
  }
  const digest = typeof manifestSha256 === "string"
    ? manifestSha256.trim().toLowerCase()
    : "";
  if (!SHA256_PATTERN.test(digest)) {
    throw invalid("manifestSha256 must be a lowercase SHA-256 digest.");
  }
  const operator = requireText(operatorId, "operatorId", 2, 100);
  const operationReference = requireText(reference, "reference", 8, 200);
  const entries = manifest.bindings.map(normalizedEntry);
  if (new Set(entries.map((entry) => entry.ownerId)).size !== entries.length) {
    throw invalid("manifest contains duplicate owner IDs.");
  }
  if (
    new Set(entries.map((entry) => entry.normalizedEmail)).size !== entries.length
  ) {
    throw invalid("manifest contains duplicate normalized email addresses.");
  }
  return Object.freeze({
    entries: Object.freeze(entries),
    expectedBindings: manifest.expectedBindings,
    manifestSha256: digest,
    operatorId: operator,
    referenceHash: createHash("sha256")
      .update(operationReference)
      .digest("hex"),
  });
}

async function readOwners(client, request, lock) {
  const result = await client.query(
    `SELECT owner.id, owner.email, owner.status,
            EXISTS (
              SELECT 1 FROM system_role_assignments role
               WHERE role.owner_id = owner.id AND role.role = 'site_owner'
            ) AS is_site_owner,
            EXISTS (
              SELECT 1 FROM auth_identities identity
               WHERE identity.owner_id = owner.id AND identity.issuer <> $2
            ) AS has_legacy_identity
       FROM users owner
      WHERE owner.id = ANY($1::uuid[])
      ORDER BY owner.id${lock ? " FOR UPDATE OF owner" : ""}`,
    [request.entries.map((entry) => entry.ownerId), EMAIL_IDENTITY_ISSUER],
  );
  return result.rows;
}

async function readSiteOwners(client) {
  const result = await client.query(
    `SELECT role.owner_id,
            EXISTS (
              SELECT 1 FROM auth_email_bindings binding
               WHERE binding.owner_id = role.owner_id
            ) AS has_email_binding
       FROM system_role_assignments role
      WHERE role.role = 'site_owner'
      ORDER BY role.owner_id
      LIMIT 2`,
  );
  if (result.rowCount !== 1) {
    throw new EmailBindingMaintenanceError(
      "EMAIL_BINDING_SITE_OWNER_CONFLICT",
      "Exactly one site owner must exist before email binding.",
    );
  }
  return result.rows[0];
}

async function readBindings(client, request, lock) {
  const result = await client.query(
    `SELECT identity_id, owner_id, normalized_email, source,
            migration_manifest_sha256, migrated_by_operator_id,
            migration_reference_hash
       FROM auth_email_bindings
      WHERE owner_id = ANY($1::uuid[])
         OR normalized_email = ANY($2::text[])${lock ? " FOR UPDATE" : ""}`,
    [
      request.entries.map((entry) => entry.ownerId),
      request.entries.map((entry) => entry.normalizedEmail),
    ],
  );
  return result.rows;
}

function validateOwners(request, owners, siteOwner) {
  const byId = new Map(owners.map((owner) => [owner.id, owner]));
  const siteOwnerEntryIndex = request.entries.findIndex(
    (entry) => entry.ownerId === siteOwner.owner_id,
  );
  if (!siteOwner.has_email_binding && siteOwnerEntryIndex !== 0) {
    throw new EmailBindingMaintenanceError(
      "EMAIL_BINDING_SITE_OWNER_FIRST",
      "The unbound site owner must be the first manifest entry.",
    );
  }
  for (const [index, entry] of request.entries.entries()) {
    const owner = byId.get(entry.ownerId);
    if (!owner) {
      throw new EmailBindingMaintenanceError(
        "EMAIL_BINDING_OWNER_NOT_FOUND",
        `Manifest owner at index ${index} does not exist.`,
      );
    }
    let currentEmail;
    try {
      currentEmail = normalizeEmailAddress(owner.email).normalizedEmail;
    } catch {
      throw new EmailBindingMaintenanceError(
        "EMAIL_BINDING_OWNER_EMAIL_INVALID",
        `Manifest owner at index ${index} has an invalid stored email.`,
      );
    }
    if (currentEmail !== entry.normalizedEmail) {
      throw new EmailBindingMaintenanceError(
        "EMAIL_BINDING_OWNER_EMAIL_MISMATCH",
        `Manifest owner at index ${index} does not match its stored email.`,
      );
    }
    if (!owner.has_legacy_identity) {
      throw new EmailBindingMaintenanceError(
        "EMAIL_BINDING_LEGACY_IDENTITY_REQUIRED",
        `Manifest owner at index ${index} has no prior non-email identity.`,
      );
    }
    if (owner.is_site_owner && !entry.administratorVerified) {
      throw new EmailBindingMaintenanceError(
        "EMAIL_BINDING_SITE_OWNER_UNVERIFIED",
        "The site-owner mailbox mapping requires administrator verification.",
      );
    }
  }
}

function classifyBindings(request, rows) {
  const byOwner = new Map(rows.map((row) => [row.owner_id, row]));
  const byEmail = new Map(rows.map((row) => [row.normalized_email, row]));
  return request.entries.map((entry, index) => {
    const ownerBinding = byOwner.get(entry.ownerId);
    const emailBinding = byEmail.get(entry.normalizedEmail);
    if (!ownerBinding && !emailBinding) return { ...entry, state: "pending" };
    if (
      ownerBinding !== emailBinding ||
      ownerBinding.owner_id !== entry.ownerId ||
      ownerBinding.normalized_email !== entry.normalizedEmail
    ) {
      throw new EmailBindingMaintenanceError(
        "EMAIL_BINDING_CONFLICT",
        `Manifest binding at index ${index} conflicts with an existing binding.`,
      );
    }
    if (
      ownerBinding.source !== "operator_migration" ||
      ownerBinding.migration_manifest_sha256 !== request.manifestSha256 ||
      ownerBinding.migrated_by_operator_id !== request.operatorId ||
      ownerBinding.migration_reference_hash !== request.referenceHash
    ) {
      throw new EmailBindingMaintenanceError(
        "EMAIL_BINDING_AUDIT_CONFLICT",
        `Manifest binding at index ${index} already exists under another audit record.`,
      );
    }
    return { ...entry, identityId: ownerBinding.identity_id, state: "replayed" };
  });
}

function present(request, entries, { executed }) {
  const pending = entries.filter((entry) => entry.state === "pending").length;
  const replayed = entries.filter((entry) => entry.state === "replayed").length;
  if (pending && replayed) {
    throw new EmailBindingMaintenanceError(
      "EMAIL_BINDING_PARTIAL_REPLAY",
      "The manifest is partially applied; manual review is required.",
    );
  }
  return Object.freeze({
    createdBindings: executed ? pending : 0,
    expectedBindings: request.expectedBindings,
    manifestSha256: request.manifestSha256,
    pendingBindings: executed ? 0 : pending,
    replayedBindings: replayed,
    bindings: Object.freeze(
      entries.map((entry) =>
        Object.freeze({
          account: maskEmailAddress(entry.displayEmail),
          ownerId: entry.ownerId,
          state: executed && entry.state === "pending" ? "created" : entry.state,
        }),
      ),
    ),
    referenceHash: request.referenceHash.slice(0, 16),
  });
}

async function inspect(client, request, { lock = false } = {}) {
  // node-postgres clients execute one query at a time; keep the lock-bearing
  // inspection explicitly ordered so pg@9 does not reject concurrent calls.
  const owners = await readOwners(client, request, lock);
  const siteOwner = await readSiteOwners(client);
  const bindings = await readBindings(client, request, lock);
  validateOwners(request, owners, siteOwner);
  return classifyBindings(request, bindings);
}

export async function previewExistingOwnerEmailBindings(pool, input) {
  const request = prepareEmailBindingManifest(input.manifest, input);
  const entries = await inspect(pool, request);
  return present(request, entries, { executed: false });
}

export async function bindExistingOwnerEmails(pool, input) {
  const request = prepareEmailBindingManifest(input.manifest, input);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      ["email-owner-binding:v1"],
    );
    const entries = await inspect(client, request, { lock: true });
    const preview = present(request, entries, { executed: false });
    if (preview.replayedBindings === request.expectedBindings) {
      await client.query("COMMIT");
      return preview;
    }
    for (const entry of entries) {
      const identityId = randomUUID();
      await client.query(
        `INSERT INTO auth_identities (id, owner_id, issuer, subject)
         VALUES ($1, $2, $3, $4)`,
        [identityId, entry.ownerId, EMAIL_IDENTITY_ISSUER, randomUUID()],
      );
      await client.query(
        `INSERT INTO auth_email_bindings (
           identity_id, owner_id, normalized_email, display_email, source,
           verified_at, migration_manifest_sha256, migrated_by_operator_id,
           migration_reference_hash
         ) VALUES ($1, $2, $3, $4, 'operator_migration', now(), $5, $6, $7)`,
        [
          identityId,
          entry.ownerId,
          entry.normalizedEmail,
          entry.displayEmail,
          request.manifestSha256,
          request.operatorId,
          request.referenceHash,
        ],
      );
    }
    await client.query("COMMIT");
    return present(request, entries, { executed: true });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
