const CHALLENGE_RETENTION_HOURS = 24;
const RATE_LIMIT_RETENTION_HOURS = 48;
const EVENT_RETENTION_DAYS = 30;

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
