import pg from "pg";

const { Pool } = pg;

export async function seedLocalFixtures({ databaseUrl, logger = console }) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to seed local fixtures.");
  }

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      INSERT INTO users (id, email, locale, status, account_tier)
      VALUES
        ('00000000-0000-4000-8000-000000000001', 'm3-local@goodgood.invalid', 'zh-CN', 'active', 'seed'),
        ('00000000-0000-4000-8000-000000000002', 'm4-local-b@goodgood.invalid', 'zh-CN', 'active', 'seed')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO auth_identities (id, owner_id, issuer, subject)
      VALUES
        (
          '10000000-0000-4000-8000-000000000001',
          '00000000-0000-4000-8000-000000000001',
          'goodgood-local',
          'local-user-a'
        ),
        (
          '10000000-0000-4000-8000-000000000002',
          '00000000-0000-4000-8000-000000000002',
          'goodgood-local',
          'local-user-b'
        )
      ON CONFLICT (issuer, subject) DO NOTHING;

      INSERT INTO credit_accounts (id, owner_id, unit)
      SELECT md5('goodgood-credit-account:credit:' || id::text)::uuid, id, 'credit'
        FROM users
       WHERE id IN (
         '00000000-0000-4000-8000-000000000001',
         '00000000-0000-4000-8000-000000000002'
       )
      ON CONFLICT (owner_id, unit) DO NOTHING;

      WITH inserted_welcome_grants AS (
        INSERT INTO credit_ledger_entries (
          id, account_id, owner_id, entry_type, amount, idempotency_key,
          operation_hash, reason, actor, metadata
        )
        SELECT
          md5('goodgood-welcome-grant:v1:' || account.owner_id::text)::uuid,
          account.id,
          account.owner_id,
          'grant',
          100,
          'welcome-grant:v1:' || account.owner_id::text,
          md5('goodgood-welcome-grant-operation:v1:' || account.owner_id::text)
            || md5('goodgood-welcome-grant-operation-proof:v1:' || account.owner_id::text),
          'welcome_grant_v1',
          'system',
          '{"campaign":"welcome-v1","images":10}'::jsonb
        FROM credit_accounts account
        WHERE account.unit = 'credit'
          AND account.owner_id IN (
            '00000000-0000-4000-8000-000000000001',
            '00000000-0000-4000-8000-000000000002'
          )
        ON CONFLICT (account_id, idempotency_key) DO NOTHING
        RETURNING account_id, amount
      )
      UPDATE credit_accounts account
         SET available_balance = account.available_balance + seeded_grant.amount,
             version = account.version + 1,
             updated_at = now()
        FROM inserted_welcome_grants seeded_grant
       WHERE account.id = seeded_grant.account_id;
    `);

    const verification = await client.query(`
      SELECT
        (SELECT count(*)::int FROM users
          WHERE id IN (
            '00000000-0000-4000-8000-000000000001',
            '00000000-0000-4000-8000-000000000002'
          ) AND status = 'active' AND account_tier = 'seed') AS owners,
        (SELECT count(*)::int FROM auth_identities
          WHERE issuer = 'goodgood-local'
            AND subject IN ('local-user-a', 'local-user-b')) AS identities,
        (SELECT count(*)::int FROM credit_accounts
          WHERE owner_id IN (
            '00000000-0000-4000-8000-000000000001',
            '00000000-0000-4000-8000-000000000002'
          ) AND unit = 'credit' AND available_balance = 100
            AND reserved_balance = 0) AS accounts
    `);
    const result = verification.rows[0];
    if (result.owners !== 2 || result.identities !== 2 || result.accounts !== 2) {
      throw new Error("Local fixtures do not match the reviewed two-owner contract.");
    }

    await client.query("COMMIT");
    logger.log(JSON.stringify({ event: "local-fixtures.ready", owners: 2 }));
    return { identities: 2, owners: 2 };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
