import { createHash, randomUUID } from "node:crypto";
import { AdministrationError } from "./errors.mjs";
import { runCreditTransaction } from "../billing/repository.mjs";

function requireText(value, fieldName, minimum, maximum) {
  const text = typeof value === "string" ? value.trim() : "";
  if (
    text.length < minimum ||
    text.length > maximum ||
    /[\u0000-\u001f\u007f]/.test(text)
  ) {
    throw new AdministrationError(
      "SITE_OWNER_BOOTSTRAP_INVALID",
      `${fieldName} must contain ${minimum} to ${maximum} characters.`,
      400,
    );
  }
  return text;
}

function requestFrom(input) {
  const email = requireText(input?.email, "email", 3, 320).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AdministrationError(
      "SITE_OWNER_BOOTSTRAP_INVALID",
      "email must be a valid address.",
      400,
    );
  }
  const operatorId = requireText(input?.operatorId, "operatorId", 2, 100);
  const reference = requireText(input?.reference, "reference", 8, 200);
  const referenceHash = createHash("sha256").update(reference).digest("hex");
  const idempotencyKey = `site-owner-bootstrap:v1:${referenceHash}`;
  const operationHash = createHash("sha256")
    .update(
      JSON.stringify({
        email,
        operatorId,
        referenceHash,
        role: "site_owner",
      }),
    )
    .digest("hex");
  return { email, idempotencyKey, operationHash, operatorId, referenceHash };
}

function maskEmail(email) {
  const [local, domain] = email.split("@");
  return `${local.slice(0, Math.min(2, local.length))}${"*".repeat(
    Math.max(3, local.length - 2),
  )}@${domain}`;
}

async function findOwnerByEmail(client, email, lock = false) {
  const result = await client.query(
    `SELECT id, email, status
       FROM users
      WHERE lower(email) = $1
      ORDER BY id
      LIMIT 2${lock ? " FOR UPDATE" : ""}`,
    [email],
  );
  if (result.rowCount !== 1) {
    throw new AdministrationError(
      result.rowCount
        ? "SITE_OWNER_BOOTSTRAP_ACCOUNT_CONFLICT"
        : "SITE_OWNER_BOOTSTRAP_ACCOUNT_NOT_FOUND",
      result.rowCount
        ? "The email maps to more than one account."
        : "The account must sign in once before site-owner bootstrap.",
      409,
    );
  }
  if (result.rows[0].status === "suspended") {
    throw new AdministrationError(
      "SITE_OWNER_BOOTSTRAP_ACCOUNT_SUSPENDED",
      "A suspended account cannot be bootstrapped as site owner.",
      409,
    );
  }
  return result.rows[0];
}

async function currentSiteOwner(client) {
  const result = await client.query(
    `SELECT role.owner_id, role.idempotency_key, role.operation_hash,
            owner.email, owner.status
       FROM system_role_assignments role
       JOIN users owner ON owner.id = role.owner_id
      WHERE role.role = 'site_owner'
      ORDER BY role.created_at, role.id
      LIMIT 2`,
  );
  if (result.rowCount > 1) {
    throw new AdministrationError(
      "SITE_OWNER_BOOTSTRAP_CONFLICT",
      "More than one site-owner assignment exists; manual review is required.",
      409,
    );
  }
  return result.rows[0] ?? null;
}

function present({ owner, replayed, request }) {
  return {
    account: maskEmail(owner.email.toLowerCase()),
    accountStatus: owner.status,
    referenceHash: request.referenceHash.slice(0, 16),
    replayed,
    role: "site_owner",
  };
}

export async function previewSiteOwnerBootstrap(pool, input) {
  const request = requestFrom(input);
  const owner = await findOwnerByEmail(pool, request.email);
  const existing = await currentSiteOwner(pool);
  if (
    existing &&
    (existing.owner_id !== owner.id ||
      existing.idempotency_key !== request.idempotencyKey ||
      existing.operation_hash !== request.operationHash)
  ) {
    throw new AdministrationError(
      "SITE_OWNER_ALREADY_BOOTSTRAPPED",
      "A site owner has already been bootstrapped.",
      409,
    );
  }
  return present({ owner, replayed: Boolean(existing), request });
}

export function bootstrapSiteOwner(pool, input) {
  const request = requestFrom(input);
  return runCreditTransaction(pool, async (client) => {
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      ["site-owner-bootstrap:v1"],
    );
    const owner = await findOwnerByEmail(client, request.email, true);
    const existing = await currentSiteOwner(client);
    if (existing) {
      if (
        existing.owner_id !== owner.id ||
        existing.idempotency_key !== request.idempotencyKey ||
        existing.operation_hash !== request.operationHash
      ) {
        throw new AdministrationError(
          "SITE_OWNER_ALREADY_BOOTSTRAPPED",
          "A site owner has already been bootstrapped.",
          409,
        );
      }
      return present({ owner: existing, replayed: true, request });
    }

    const previousStatus = owner.status;
    await client.query(
      "UPDATE users SET status = 'active', updated_at = now() WHERE id = $1",
      [owner.id],
    );
    await client.query(
      `INSERT INTO system_role_assignments (
         id, owner_id, role, source, assigned_by_operator_id,
         reason, idempotency_key, operation_hash
       ) VALUES ($1, $2, 'site_owner', 'bootstrap', $3, $4, $5, $6)`,
      [
        randomUUID(),
        owner.id,
        request.operatorId,
        "initial_site_owner_bootstrap",
        request.idempotencyKey,
        request.operationHash,
      ],
    );
    await client.query(
      `INSERT INTO administrative_actions (
         id, actor_owner_id, target_owner_id, action_type,
         previous_status, resulting_status, reason,
         idempotency_key, operation_hash
       ) VALUES ($1, $2, $2, 'bootstrap_site_owner', $3, 'active', $4, $5, $6)`,
      [
        randomUUID(),
        owner.id,
        previousStatus,
        "initial_site_owner_bootstrap",
        request.idempotencyKey,
        request.operationHash,
      ],
    );
    return present({
      owner: { ...owner, status: "active" },
      replayed: false,
      request,
    });
  });
}
