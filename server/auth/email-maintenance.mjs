import { EMAIL_RATE_LIMITS } from "./email-policy.mjs";

const CHALLENGE_RETENTION_HOURS = 24;
const RATE_LIMIT_RETENTION_HOURS = 48;
const EVENT_RETENTION_DAYS = 30;
const CLEANUP_HEALTH_HOURS = 2;
const DELIVERY_FAILURE_STREAK = 5;

function integer(value) {
  const parsed = Number(value ?? 0);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function isoDate(value) {
  return value ? new Date(value).toISOString() : null;
}

function reportHours(value) {
  const hours = Number(value ?? 24);
  if (!Number.isInteger(hours) || hours < 1 || hours > EVENT_RETENTION_DAYS * 24) {
    throw new Error(`Email authentication report hours must be between 1 and ${EVENT_RETENTION_DAYS * 24}.`);
  }
  return hours;
}

function supportRequestId(value) {
  if (value === null || value === undefined || value === "") return null;
  if (
    typeof value !== "string" ||
    value.length > 200 ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error("Email authentication support request ID is invalid.");
  }
  return value;
}

export async function readEmailAuthenticationOperations(
  pool,
  { hours: requestedHours = 24, now = new Date(), requestId = null } = {},
) {
  const hours = reportHours(requestedHours);
  const selectedRequestId = supportRequestId(requestId);
  const [totalsResult, budgetResult, recentDeliveryResult, cleanupResult, supportResult] =
    await Promise.all([
      pool.query(
        `SELECT
           count(*) FILTER (WHERE event_type = 'email_code_requested')::int AS delivery_requests,
           count(*) FILTER (WHERE event_type = 'email_code_requested' AND outcome = 'accepted')::int AS accepted,
           count(*) FILTER (WHERE event_type = 'email_code_requested' AND outcome = 'unknown')::int AS unknown,
           count(*) FILTER (WHERE event_type = 'email_code_requested' AND outcome = 'failed')::int AS failed,
           count(*) FILTER (WHERE event_type = 'email_code_verified' AND outcome = 'succeeded')::int AS verified,
           count(*) FILTER (WHERE event_type = 'email_code_rejected' AND outcome = 'rejected')::int AS rejected
         FROM auth_events
        WHERE created_at >= $1::timestamptz - ($2::integer * interval '1 hour')
          AND created_at <= $1::timestamptz`,
        [now, hours],
      ),
      pool.query(
        `SELECT COALESCE(sum(request_count), 0)::int AS used
           FROM auth_rate_limits
          WHERE scope = 'global_send_day'
            AND window_started_at > $1::timestamptz - interval '24 hours'
            AND window_started_at <= $1::timestamptz`,
        [now],
      ),
      pool.query(
        `SELECT outcome
           FROM auth_events
          WHERE event_type = 'email_code_requested'
            AND created_at >= $1::timestamptz - interval '1 hour'
            AND created_at <= $1::timestamptz
          ORDER BY created_at DESC, id DESC
          LIMIT $2`,
        [now, DELIVERY_FAILURE_STREAK],
      ),
      pool.query(
        `SELECT last_succeeded_at
           FROM auth_maintenance_state
          WHERE task_name = 'cleanup'`,
      ),
      selectedRequestId
        ? pool.query(
            `SELECT event_type, outcome, owner_id, request_id,
                    detail ->> 'deliveryErrorCode' AS delivery_error_code,
                    created_at
               FROM auth_events
              WHERE request_id = $1
              ORDER BY created_at ASC, id ASC`,
            [selectedRequestId],
          )
        : Promise.resolve({ rows: [] }),
    ]);

  const totals = totalsResult.rows[0] ?? {};
  const budgetUsed = integer(budgetResult.rows[0]?.used);
  const budgetLimit = EMAIL_RATE_LIMITS.global_send_day.limit;
  const budgetThreshold = Math.ceil(budgetLimit * 0.8);
  const cleanupAt = isoDate(cleanupResult.rows[0]?.last_succeeded_at);
  const cleanupHealthy = Boolean(
    cleanupAt &&
      now.getTime() - new Date(cleanupAt).getTime() <= CLEANUP_HEALTH_HOURS * 60 * 60 * 1_000,
  );
  const recentOutcomes = recentDeliveryResult.rows.map(({ outcome }) => outcome);
  const alerts = [];
  if (budgetUsed >= budgetThreshold) {
    alerts.push(Object.freeze({
      code: "EMAIL_AUTH_GLOBAL_BUDGET_HIGH",
      observed: budgetUsed,
      severity: "warning",
      threshold: budgetThreshold,
    }));
  }
  if (
    recentOutcomes.length === DELIVERY_FAILURE_STREAK &&
    recentOutcomes.every((outcome) => outcome === "failed" || outcome === "unknown")
  ) {
    alerts.push(Object.freeze({
      code: "EMAIL_AUTH_DELIVERY_FAILURE_STREAK",
      observed: DELIVERY_FAILURE_STREAK,
      severity: "critical",
      threshold: DELIVERY_FAILURE_STREAK,
    }));
  }
  if (!cleanupHealthy) {
    alerts.push(Object.freeze({
      code: "EMAIL_AUTH_CLEANUP_OVERDUE",
      observed: cleanupAt,
      severity: "warning",
      thresholdHours: CLEANUP_HEALTH_HOURS,
    }));
  }

  return Object.freeze({
    alerts: Object.freeze(alerts),
    budget: Object.freeze({
      limit: budgetLimit,
      percentUsed: Math.round((budgetUsed / budgetLimit) * 1_000) / 10,
      used: budgetUsed,
    }),
    delivery: Object.freeze({
      accepted: integer(totals.accepted),
      failed: integer(totals.failed),
      requested: integer(totals.delivery_requests),
      unknown: integer(totals.unknown),
    }),
    maintenance: Object.freeze({
      cleanupHealthy,
      lastCleanupAt: cleanupAt,
    }),
    support: selectedRequestId
      ? Object.freeze({
          events: Object.freeze(
            supportResult.rows.map((row) => Object.freeze({
              createdAt: isoDate(row.created_at),
              deliveryErrorCode: row.delivery_error_code ?? null,
              eventType: row.event_type,
              outcome: row.outcome,
              ownerId: row.owner_id ?? null,
              requestId: row.request_id,
            })),
          ),
          requestId: selectedRequestId,
        })
      : null,
    verification: Object.freeze({
      rejected: integer(totals.rejected),
      succeeded: integer(totals.verified),
    }),
    window: Object.freeze({
      from: new Date(now.getTime() - hours * 60 * 60 * 1_000).toISOString(),
      hours,
      to: now.toISOString(),
    }),
  });
}

export async function previewEmailAuthenticationCleanup(pool, now = new Date()) {
  const result = await pool.query(
    `SELECT
       (SELECT count(*)::int
          FROM auth_email_challenges
         WHERE expires_at < $1::timestamptz - ($2::integer * interval '1 hour'))
         AS challenges,
       (SELECT count(*)::int
          FROM auth_rate_limits
         WHERE window_started_at < $1::timestamptz - ($3::integer * interval '1 hour'))
         AS rate_limits,
       (SELECT count(*)::int
          FROM auth_events
         WHERE created_at < $1::timestamptz - ($4::integer * interval '1 day'))
         AS events`,
    [
      now,
      CHALLENGE_RETENTION_HOURS,
      RATE_LIMIT_RETENTION_HOURS,
      EVENT_RETENTION_DAYS,
    ],
  );
  return Object.freeze({ ...result.rows[0] });
}

export async function cleanupEmailAuthentication(pool, now = new Date()) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended('email-auth-cleanup', 0))",
    );
    const events = await client.query(
      `DELETE FROM auth_events
        WHERE created_at < $1::timestamptz - ($2::integer * interval '1 day')`,
      [now, EVENT_RETENTION_DAYS],
    );
    const challenges = await client.query(
      `DELETE FROM auth_email_challenges
        WHERE expires_at < $1::timestamptz - ($2::integer * interval '1 hour')`,
      [now, CHALLENGE_RETENTION_HOURS],
    );
    const rateLimits = await client.query(
      `DELETE FROM auth_rate_limits
        WHERE window_started_at < $1::timestamptz - ($2::integer * interval '1 hour')`,
      [now, RATE_LIMIT_RETENTION_HOURS],
    );
    await client.query(
      `INSERT INTO auth_maintenance_state
        (task_name, last_succeeded_at, detail, updated_at)
       VALUES ('cleanup', $1, $2::jsonb, $1)
       ON CONFLICT (task_name)
       DO UPDATE SET last_succeeded_at = EXCLUDED.last_succeeded_at,
                     detail = EXCLUDED.detail,
                     updated_at = EXCLUDED.updated_at`,
      [
        now,
        JSON.stringify({
          challenges: challenges.rowCount,
          events: events.rowCount,
          rateLimits: rateLimits.rowCount,
        }),
      ],
    );
    await client.query("COMMIT");
    return Object.freeze({
      challenges: challenges.rowCount,
      events: events.rowCount,
      rateLimits: rateLimits.rowCount,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
