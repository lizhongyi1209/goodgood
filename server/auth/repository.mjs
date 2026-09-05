import { randomUUID } from "node:crypto";
import { grantWelcomeCreditsInTransaction } from "../billing/repository.mjs";
import {
  AuthenticationError,
  authenticationRequestError,
  sessionExpiredError,
} from "./errors.mjs";

function accountContext(row, identity) {
  if (!row) throw sessionExpiredError();
  return Object.freeze({
    accessStatus: row.status,
    accountTier: row.account_tier,
    availableCredits: String(row.available_balance ?? 0),
    email: row.email ?? null,
    identity: Object.freeze({ ...identity }),
    identityId: row.identity_id ?? null,
    locale: row.locale,
    ownerId: row.owner_id,
    reservedCredits: String(row.reserved_balance ?? 0),
    systemRole: row.is_site_owner ? "site_owner" : "member",
  });
}

function activeOwnerContext(row, identity) {
  const owner = accountContext(row, identity);
  if (owner.accessStatus === "pending") {
    throw new AuthenticationError(
      "ACCOUNT_PENDING",
      "账号正在等待审核，审核通过后即可开始创作。",
      403,
    );
  }
  if (owner.accessStatus !== "active") {
    throw new AuthenticationError(
      "ACCOUNT_SUSPENDED",
      "账号已暂停使用，请联系站长。",
      403,
    );
  }
  return owner;
}

async function findIdentityOwner(pool, identity) {
  const result = await pool.query(
    `SELECT i.id AS identity_id, u.account_tier, u.email,
            u.id AS owner_id, u.locale, u.status,
            COALESCE(c.available_balance, 0) AS available_balance,
            COALESCE(c.reserved_balance, 0) AS reserved_balance,
            EXISTS (
              SELECT 1 FROM system_role_assignments role
               WHERE role.owner_id = u.id AND role.role = 'site_owner'
            ) AS is_site_owner
       FROM auth_identities i
       JOIN users u ON u.id = i.owner_id
       LEFT JOIN credit_accounts c
         ON c.owner_id = u.id AND c.unit = 'credit'
      WHERE i.issuer = $1 AND i.subject = $2`,
    [identity.issuer, identity.subject],
  );
  return result.rows[0];
}

export async function resolveAccountContext(pool, identity) {
  return accountContext(await findIdentityOwner(pool, identity), identity);
}

export async function resolveOwnerContext(pool, identity) {
  return activeOwnerContext(await findIdentityOwner(pool, identity), identity);
}

export async function createLoginAttempt(pool, attempt) {
  await pool.query(
    `INSERT INTO auth_login_attempts
      (id, state_hash, browser_binding_hash, code_verifier, nonce, return_to, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      randomUUID(),
      attempt.stateHash,
      attempt.browserBindingHash,
      attempt.codeVerifier,
      attempt.nonce,
      attempt.returnTo,
      attempt.expiresAt,
    ],
  );
}

export async function consumeLoginAttempt(pool, stateHash, browserBindingHash) {
  const result = await pool.query(
    `UPDATE auth_login_attempts
        SET consumed_at = now()
      WHERE state_hash = $1
        AND browser_binding_hash = $2
        AND consumed_at IS NULL
        AND expires_at > now()
      RETURNING code_verifier, nonce, return_to`,
    [stateHash, browserBindingHash],
  );
  const row = result.rows[0];
  if (!row) throw authenticationRequestError("AUTH_CALLBACK_INVALID");
  return Object.freeze({
    codeVerifier: row.code_verifier,
    nonce: row.nonce,
    returnTo: row.return_to,
  });
}

export async function provisionOwnerIdentity(pool, claims) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [JSON.stringify([claims.issuer, claims.subject])],
    );
    const existing = await client.query(
      `SELECT i.id AS identity_id, u.account_tier, u.email,
              u.id AS owner_id, u.locale, u.status,
              COALESCE(c.available_balance, 0) AS available_balance,
              COALESCE(c.reserved_balance, 0) AS reserved_balance,
              EXISTS (
                SELECT 1 FROM system_role_assignments role
                 WHERE role.owner_id = u.id AND role.role = 'site_owner'
              ) AS is_site_owner
         FROM auth_identities i
         JOIN users u ON u.id = i.owner_id
         LEFT JOIN credit_accounts c
           ON c.owner_id = u.id AND c.unit = 'credit'
        WHERE i.issuer = $1 AND i.subject = $2
        FOR UPDATE OF i, u`,
      [claims.issuer, claims.subject],
    );
    let row = existing.rows[0];
    if (!row) {
      const emailOwner = await client.query(
        "SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1",
        [claims.email],
      );
      if (emailOwner.rows[0]) {
        throw new AuthenticationError(
          "ACCOUNT_LINK_REQUIRED",
          "该邮箱已关联其他登录身份，请先在登录服务中完成账号关联。",
          409,
        );
      }

      const ownerId = randomUUID();
      const identityId = randomUUID();
      await client.query(
        `INSERT INTO users (id, email, locale, status, account_tier)
         VALUES ($1, $2, 'zh-CN', 'pending', 'seed')`,
        [ownerId, claims.email],
      );
      await client.query(
        `INSERT INTO auth_identities
          (id, owner_id, issuer, subject, last_authenticated_at)
         VALUES ($1, $2, $3, $4, now())`,
        [identityId, ownerId, claims.issuer, claims.subject],
      );
      await grantWelcomeCreditsInTransaction(client, { ownerId });
      row = {
        email: claims.email,
        identity_id: identityId,
        locale: "zh-CN",
        owner_id: ownerId,
        account_tier: "seed",
        available_balance: 100,
        reserved_balance: 0,
        is_site_owner: false,
        status: "pending",
      };
    } else {
      await client.query(
        `UPDATE auth_identities
            SET last_authenticated_at = now()
          WHERE id = $1`,
        [row.identity_id],
      );
    }
    await client.query("COMMIT");
    return accountContext(row, {
      issuer: claims.issuer,
      subject: claims.subject,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error?.code === "23505") {
      throw new AuthenticationError(
        "ACCOUNT_LINK_REQUIRED",
        "该邮箱已关联其他登录身份，请先在登录服务中完成账号关联。",
        409,
      );
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function createAuthenticationSession(pool, session) {
  const result = await pool.query(
    `INSERT INTO auth_sessions
      (id, owner_id, auth_identity_id, token_hash, expires_at, last_seen_at)
     SELECT $1, $2, i.id, $4, $5, now()
       FROM auth_identities i
      WHERE i.id = $3 AND i.owner_id = $2`,
    [
      randomUUID(),
      session.ownerId,
      session.identityId,
      session.tokenHash,
      session.expiresAt,
    ],
  );
  if (result.rowCount !== 1) throw sessionExpiredError();
}

async function findSessionOwner(pool, tokenHash) {
  const result = await pool.query(
    `SELECT i.id AS identity_id, i.issuer, i.subject,
            u.account_tier, u.email, u.id AS owner_id, u.locale, u.status,
            COALESCE(c.available_balance, 0) AS available_balance,
            COALESCE(c.reserved_balance, 0) AS reserved_balance,
            EXISTS (
              SELECT 1 FROM system_role_assignments role
               WHERE role.owner_id = u.id AND role.role = 'site_owner'
            ) AS is_site_owner
       FROM auth_sessions s
       JOIN users u ON u.id = s.owner_id
       JOIN auth_identities i
         ON i.id = s.auth_identity_id AND i.owner_id = s.owner_id
       LEFT JOIN credit_accounts c
         ON c.owner_id = u.id AND c.unit = 'credit'
      WHERE s.token_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > now()
      LIMIT 1`,
    [tokenHash],
  );
  return result.rows[0];
}

export async function resolveSessionAccountContext(pool, tokenHash) {
  const row = await findSessionOwner(pool, tokenHash);
  return accountContext(row, {
    issuer: row?.issuer,
    subject: row?.subject,
  });
}

export async function resolveSessionOwnerContext(pool, tokenHash) {
  const row = await findSessionOwner(pool, tokenHash);
  return activeOwnerContext(row, {
    issuer: row?.issuer,
    subject: row?.subject,
  });
}

export async function revokeAuthenticationSession(pool, tokenHash) {
  await pool.query(
    `UPDATE auth_sessions
        SET revoked_at = COALESCE(revoked_at, now())
      WHERE token_hash = $1`,
    [tokenHash],
  );
}
