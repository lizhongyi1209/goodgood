import { randomUUID } from "node:crypto";
import { grantWelcomeCreditsInTransaction } from "../billing/repository.mjs";
import { AuthenticationError } from "./errors.mjs";
import { invitationDigest } from "./invitations.mjs";
import { EMAIL_OTP_MAX_FAILURES } from "./email-policy.mjs";

async function inTransaction(pool, operation) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function recordEvent(client, event) {
  await client.query(
    `INSERT INTO auth_events
      (id, event_type, outcome, subject_hash, owner_id, challenge_id,
       request_id, provider_message_id, detail)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
    [
      randomUUID(),
      event.eventType,
      event.outcome,
      event.subjectHash ?? null,
      event.ownerId ?? null,
      event.challengeId ?? null,
      event.requestId,
      event.providerMessageId ?? null,
      JSON.stringify(event.detail ?? {}),
    ],
  );
}

export async function consumeAuthenticationRateLimit(pool, input) {
  return inTransaction(pool, async (client) => {
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [`auth-rate:${input.scope}:${input.subjectHash}`],
    );
    const total = await client.query(
      `SELECT COALESCE(sum(request_count), 0)::int AS request_count,
              min(window_started_at) AS oldest_request_at
         FROM auth_rate_limits
        WHERE scope = $1
          AND subject_hash = $2
          AND window_started_at >
              $3::timestamptz - ($4::integer * interval '1 second')`,
      [input.scope, input.subjectHash, input.now, input.windowSeconds],
    );
    if (total.rows[0].request_count >= input.limit) {
      const oldestRequestAt = new Date(
        total.rows[0].oldest_request_at,
      ).getTime();
      return Object.freeze({
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil(
            (oldestRequestAt +
              input.windowSeconds * 1_000 -
              input.now.getTime()) /
              1_000,
          ),
        ),
      });
    }
    await client.query(
      `INSERT INTO auth_rate_limits
        (scope, subject_hash, window_started_at, request_count)
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (scope, subject_hash, window_started_at)
       DO UPDATE SET request_count = auth_rate_limits.request_count + 1,
                     updated_at = now()`,
      [input.scope, input.subjectHash, input.windowStartedAt],
    );
    return Object.freeze({ allowed: true, retryAfterSeconds: 0 });
  });
}

export async function createEmailChallenge(pool, challenge) {
  return inTransaction(pool, async (client) => {
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [`email-challenge:${challenge.normalizedEmail}`],
    );
    const previous = await client.query(
      `SELECT created_at
         FROM auth_email_challenges
        WHERE normalized_email = $1
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE`,
      [challenge.normalizedEmail],
    );
    if (previous.rows[0]) {
      const retryAt =
        new Date(previous.rows[0].created_at).getTime() +
        challenge.resendAfterSeconds * 1_000;
      if (retryAt > challenge.now.getTime()) {
        return Object.freeze({
          created: false,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((retryAt - challenge.now.getTime()) / 1_000),
          ),
        });
      }
    }
    await client.query(
      `UPDATE auth_email_challenges
          SET invalidated_at = COALESCE(invalidated_at, $2), updated_at = $2
        WHERE normalized_email = $1
          AND consumed_at IS NULL
          AND invalidated_at IS NULL`,
      [challenge.normalizedEmail, challenge.now],
    );
    await client.query(
      `INSERT INTO auth_email_challenges
        (id, normalized_email, display_email, browser_binding_hash,
         code_digest, return_to, send_state, expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'sending', $7, $8, $8)`,
      [
        challenge.id,
        challenge.normalizedEmail,
        challenge.displayEmail,
        challenge.browserBindingHash,
        challenge.codeDigest,
        challenge.returnTo,
        challenge.expiresAt,
        challenge.now,
      ],
    );
    return Object.freeze({ created: true, retryAfterSeconds: 0 });
  });
}

export async function updateEmailChallengeDelivery(pool, delivery) {
  return inTransaction(pool, async (client) => {
    const updated = await client.query(
      `UPDATE auth_email_challenges
          SET send_state = $2,
              provider_message_id = $3,
              delivery_error_code = $4,
              invalidated_at = CASE
                WHEN $2 = 'failed' THEN COALESCE(invalidated_at, $5)
                ELSE invalidated_at
              END,
              updated_at = $5
        WHERE id = $1
        RETURNING id`,
      [
        delivery.challengeId,
        delivery.state,
        delivery.providerMessageId ?? null,
        delivery.errorCode ?? null,
        delivery.now,
      ],
    );
    if (!updated.rowCount) return false;
    await recordEvent(client, {
      challengeId: delivery.challengeId,
      detail: delivery.errorCode
        ? { deliveryErrorCode: delivery.errorCode }
        : {},
      eventType: "email_code_requested",
      outcome: delivery.state,
      providerMessageId: delivery.providerMessageId,
      requestId: delivery.requestId,
      subjectHash: delivery.subjectHash,
    });
    return true;
  });
}

export async function readCurrentEmailChallenge(pool, input) {
  const result = await pool.query(
    `SELECT id, display_email, expires_at, created_at, send_state
       FROM auth_email_challenges
      WHERE browser_binding_hash = $1
        AND consumed_at IS NULL
        AND invalidated_at IS NULL
        AND expires_at > $2
      ORDER BY created_at DESC
      LIMIT 1`,
    [input.browserBindingHash, input.now],
  );
  return result.rows[0] ?? null;
}

export async function readEmailChallengeForVerification(pool, input) {
  const result = await pool.query(
    `SELECT id, normalized_email
       FROM auth_email_challenges
      WHERE id = $1
        AND browser_binding_hash = $2
        AND consumed_at IS NULL
        AND invalidated_at IS NULL
        AND expires_at > $3
        AND failed_attempts < $4
        AND send_state <> 'failed'
      LIMIT 1`,
    [
      input.challengeId,
      input.browserBindingHash,
      input.now,
      EMAIL_OTP_MAX_FAILURES,
    ],
  );
  return result.rows[0] ?? null;
}

async function findBoundOwner(client, normalizedEmail) {
  const result = await client.query(
    `SELECT b.identity_id, b.owner_id
       FROM auth_email_bindings b
       JOIN auth_identities i
         ON i.id = b.identity_id AND i.owner_id = b.owner_id
      WHERE b.normalized_email = $1
      FOR UPDATE OF b, i`,
    [normalizedEmail],
  );
  return result.rows[0] ?? null;
}

async function createEmailOwner(client, challenge, issuer) {
  const existingOwner = await client.query(
    "SELECT id FROM users WHERE lower(email) = $1 LIMIT 1 FOR UPDATE",
    [challenge.normalized_email],
  );
  if (existingOwner.rowCount) return { conflict: true };

  const ownerId = randomUUID();
  const identityId = randomUUID();
  const subject = randomUUID();
  await client.query(
    `INSERT INTO users (id, email, locale, status, account_tier)
     VALUES ($1, $2, 'zh-CN', 'active', 'seed')`,
    [ownerId, challenge.display_email],
  );
  await client.query(
    `INSERT INTO auth_identities
      (id, owner_id, issuer, subject, last_authenticated_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [identityId, ownerId, issuer, subject, challenge.now],
  );
  await client.query(
    `INSERT INTO auth_email_bindings
      (identity_id, owner_id, normalized_email, display_email, source,
       verified_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'self_service', $5, $5, $5)`,
    [
      identityId,
      ownerId,
      challenge.normalized_email,
      challenge.display_email,
      challenge.now,
    ],
  );
  await grantWelcomeCreditsInTransaction(client, { ownerId });
  return { conflict: false, identity_id: identityId, owner_id: ownerId };
}

export async function completeEmailChallenge(
  pool,
  input,
  { verifyCodeDigest },
) {
  return inTransaction(pool, async (client) => {
    const selected = await client.query(
      `SELECT *
         FROM auth_email_challenges
        WHERE id = $1
        FOR UPDATE`,
      [input.challengeId],
    );
    const challenge = selected.rows[0];
    const validState =
      challenge &&
      challenge.browser_binding_hash === input.browserBindingHash &&
      !challenge.consumed_at &&
      !challenge.invalidated_at &&
      new Date(challenge.expires_at).getTime() > input.now.getTime() &&
      challenge.failed_attempts < EMAIL_OTP_MAX_FAILURES &&
      challenge.send_state !== "failed";
    if (!validState) return Object.freeze({ outcome: "invalid" });

    const codeValid = verifyCodeDigest({
      codeDigest: challenge.code_digest,
      normalizedEmail: challenge.normalized_email,
    });
    if (!codeValid) {
      const failedAttempts = challenge.failed_attempts + 1;
      await client.query(
        `UPDATE auth_email_challenges
            SET failed_attempts = $2::integer,
                invalidated_at = CASE
                  WHEN $2::integer >= $3::integer THEN $4::timestamptz
                  ELSE invalidated_at
                END,
                updated_at = $4::timestamptz
          WHERE id = $1`,
        [input.challengeId, failedAttempts, EMAIL_OTP_MAX_FAILURES, input.now],
      );
      await recordEvent(client, {
        challengeId: input.challengeId,
        detail: { failedAttempts },
        eventType: "email_code_rejected",
        outcome: "rejected",
        requestId: input.requestId,
        subjectHash: input.subjectHash,
      });
      return Object.freeze({ outcome: "invalid" });
    }

    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [`email-owner:${challenge.normalized_email}`],
    );
    let identity = await findBoundOwner(client, challenge.normalized_email);
    if (!identity && !input.registrationEnabled) {
      await client.query(
        `UPDATE auth_email_challenges
            SET invalidated_at = $2, updated_at = $2
          WHERE id = $1`,
        [input.challengeId, input.now],
      );
      return Object.freeze({ outcome: "registration_closed" });
    }
    let invitation = null;
    let pendingOwner = false;
    if (identity) {
      const owner = await client.query(
        "SELECT status FROM users WHERE id=$1 FOR UPDATE",
        [identity.owner_id],
      );
      pendingOwner = owner.rows[0]?.status === "pending";
    }
    if (!identity || pendingOwner) {
      if (!input.invitationCode)
        return Object.freeze({ outcome: "invitation_required" });
      const digest = invitationDigest(input.invitationCode);
      const match = digest
        ? await client.query(
            "SELECT id FROM registration_invitations WHERE code_digest=$1 AND revoked_at IS NULL AND used_at IS NULL FOR UPDATE",
            [digest],
          )
        : { rows: [] };
      invitation = match.rows[0];
      if (!invitation) {
        await client.query(
          "UPDATE auth_email_challenges SET failed_attempts=failed_attempts+1, invalidated_at=CASE WHEN failed_attempts+1 >= $3 THEN $2 ELSE invalidated_at END, updated_at=$2 WHERE id=$1",
          [input.challengeId, input.now, EMAIL_OTP_MAX_FAILURES],
        );
        await recordEvent(client, {
          eventType: "email_code_rejected",
          outcome: "rejected",
          challengeId: input.challengeId,
          requestId: input.requestId,
          subjectHash: input.subjectHash,
          detail: { reason: "invitation_invalid" },
        });
        return Object.freeze({ outcome: "invitation_invalid" });
      }
    }
    if (!identity) {
      identity = await createEmailOwner(
        client,
        { ...challenge, now: input.now },
        input.issuer,
      );
      if (identity.conflict) {
        await client.query(
          `UPDATE auth_email_challenges
              SET invalidated_at = $2, updated_at = $2
            WHERE id = $1`,
          [input.challengeId, input.now],
        );
        return Object.freeze({ outcome: "link_required" });
      }
    } else {
      await client.query(
        `UPDATE auth_identities
            SET last_authenticated_at = $2
          WHERE id = $1`,
        [identity.identity_id, input.now],
      );
    }

    if (invitation) {
      if (pendingOwner)
        await client.query(
          "UPDATE users SET status='active',updated_at=$2 WHERE id=$1 AND status='pending'",
          [identity.owner_id, input.now],
        );
      await client.query(
        "UPDATE registration_invitations SET used_at=$2,used_by=$3,challenge_id=$4 WHERE id=$1",
        [invitation.id, input.now, identity.owner_id, input.challengeId],
      );
    }

    const sessionId = randomUUID();
    const session = await client.query(
      `INSERT INTO auth_sessions
        (id, owner_id, auth_identity_id, token_hash, expires_at,
         last_seen_at, created_at)
       SELECT $1, $2, i.id, $4, $5, $6, $6
         FROM auth_identities i
        WHERE i.id = $3 AND i.owner_id = $2`,
      [
        sessionId,
        identity.owner_id,
        identity.identity_id,
        input.sessionTokenHash,
        input.sessionExpiresAt,
        input.now,
      ],
    );
    if (session.rowCount !== 1) {
      throw new Error(
        "The verified email identity no longer belongs to its owner.",
      );
    }
    await client.query(
      `UPDATE auth_email_challenges
          SET consumed_at = $2, updated_at = $2
        WHERE id = $1`,
      [input.challengeId, input.now],
    );
    await recordEvent(client, {
      challengeId: input.challengeId,
      eventType: "email_code_verified",
      outcome: "succeeded",
      ownerId: identity.owner_id,
      requestId: input.requestId,
      subjectHash: input.subjectHash,
    });
    return Object.freeze({
      identityId: identity.identity_id,
      outcome: "succeeded",
      ownerId: identity.owner_id,
      returnTo: challenge.return_to,
    });
  }).catch((error) => {
    if (error?.code === "23505") {
      throw new AuthenticationError(
        "ACCOUNT_LINK_REQUIRED",
        "该邮箱需要站长核对原账号后才能登录。",
        409,
      );
    }
    throw error;
  });
}
