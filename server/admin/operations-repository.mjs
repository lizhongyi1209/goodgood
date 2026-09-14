// Read-only projections. Do not merge reserves and settlements into balance deltas.
export const LEDGER_SQL = `
  SELECT e.id, e.created_at, e.entry_type, e.related_job_id, e.prior_entry_id,
         e.amount * CASE WHEN a.unit='credit' THEN 2 ELSE 1 END AS credits,
         a.owner_id AS user_id, 'personal'::text AS fund, NULL::text AS fund_name
    FROM credit_ledger_entries e JOIN credit_accounts a ON a.id=e.account_id
   WHERE e.reason <> 'credit_unit_exchange' AND a.unit IN ('credit','credit-cny-cent')
  UNION ALL
  SELECT e.id, e.created_at, e.entry_type, e.related_job_id, e.prior_entry_id,
         e.amount * CASE WHEN a.unit='credit' THEN 2 ELSE 1 END,
         j.creator_owner_id, 'organization'::text, w.name
    FROM workspace_credit_ledger_entries e
    JOIN workspace_credit_accounts a ON a.id=e.account_id
    JOIN workspaces w ON w.id=e.workspace_id
    LEFT JOIN generation_jobs j ON j.id=e.related_job_id
   WHERE e.reason <> 'credit_unit_exchange' AND a.unit IN ('credit','credit-cny-cent') AND w.kind='organization'`;

const JOB_COLUMNS = `j.id, j.batch_id, j.submitted_at AS created_at, j.completed_at,
 j.state, j.error_code, u.email, w.kind AS fund, w.name AS fund_name,
 COALESCE(b.catalog_model_name,b.model_id) AS model, b.resolution,
 b.aspect_ratio, b.requested_count, b.image_line, b.quality,
 b.quoted_credit_amount * CASE WHEN b.quoted_credit_unit='credit' THEN 2 ELSE 1 END AS quote`;
const JOB_FROM = `FROM generation_jobs j JOIN generation_batches b ON b.id=j.batch_id
 JOIN users u ON u.id=j.creator_owner_id JOIN workspaces w ON w.id=j.workspace_id`;

export function jobDto(row) {
  return { id: row.id, batchId: row.batch_id, createdAt: iso(row.created_at),
    completedAt: iso(row.completed_at), state: row.state, email: row.email,
    fund: row.fund, fundName: row.fund === 'organization' ? row.fund_name : null,
    model: row.model, resolution: row.resolution, aspectRatio: row.aspect_ratio,
    count: row.requested_count, line: row.image_line, quality: row.quality,
    quote: row.quote == null ? null : String(row.quote),
    errorCode: typeof row.error_code === 'string' && /^[A-Z0-9_]{1,80}$/.test(row.error_code) ? row.error_code : null };
}
function iso(value) { return value ? new Date(value).toISOString() : null; }
export function ledgerDto(row) {
  return { id: row.id, createdAt: iso(row.created_at), type: row.entry_type,
    credits: String(row.credits), email: row.email ?? null, fund: row.fund,
    fundName: row.fund_name, jobId: row.related_job_id, priorId: row.prior_entry_id };
}

export async function readOperations(pool, { from, to }) {
  const { rows } = await pool.query(`WITH ledger AS (${LEDGER_SQL}),
  days AS (SELECT generate_series($1::date,$2::date,interval '1 day')::date AS day),
  submitted AS (SELECT (submitted_at AT TIME ZONE 'Asia/Shanghai')::date AS day,
    count(*) jobs,count(DISTINCT creator_owner_id) creators FROM generation_jobs
    WHERE submitted_at >= $1::date::timestamp AT TIME ZONE 'Asia/Shanghai'
      AND submitted_at < ($2::date+1)::timestamp AT TIME ZONE 'Asia/Shanghai' GROUP BY 1),
  outcomes AS (SELECT (completed_at AT TIME ZONE 'Asia/Shanghai')::date AS day,
    count(*) FILTER(WHERE state='succeeded') succeeded,
    count(*) FILTER(WHERE state='failed') failed,
    count(*) FILTER(WHERE state='cancelled') cancelled FROM generation_jobs
    WHERE completed_at >= $1::date::timestamp AT TIME ZONE 'Asia/Shanghai'
      AND completed_at < ($2::date+1)::timestamp AT TIME ZONE 'Asia/Shanghai' GROUP BY 1),
  money AS (SELECT (created_at AT TIME ZONE 'Asia/Shanghai')::date AS day,
    COALESCE(sum(-credits) FILTER(WHERE entry_type='settle'),0) settled,
    COALESCE(sum(credits) FILTER(WHERE entry_type='refund'),0) refunded,
    COALESCE(sum(credits) FILTER(WHERE entry_type='release'),0) released FROM ledger
    WHERE created_at >= $1::date::timestamp AT TIME ZONE 'Asia/Shanghai'
      AND created_at < ($2::date+1)::timestamp AT TIME ZONE 'Asia/Shanghai' GROUP BY 1),
  newcomers AS (SELECT (created_at AT TIME ZONE 'Asia/Shanghai')::date AS day,count(*) users FROM users
    WHERE created_at >= $1::date::timestamp AT TIME ZONE 'Asia/Shanghai'
      AND created_at < ($2::date+1)::timestamp AT TIME ZONE 'Asia/Shanghai' GROUP BY 1)
  SELECT d.day::text,COALESCE(s.jobs,0)::text jobs,COALESCE(s.creators,0)::text creators,
    COALESCE(o.succeeded,0)::text succeeded,COALESCE(o.failed,0)::text failed,
    COALESCE(o.cancelled,0)::text cancelled,COALESCE(n.users,0)::text users,
    COALESCE(m.settled,0)::text settled,COALESCE(m.refunded,0)::text refunded,
    COALESCE(m.released,0)::text released FROM days d
  LEFT JOIN submitted s USING(day) LEFT JOIN outcomes o USING(day)
  LEFT JOIN newcomers n USING(day) LEFT JOIN money m USING(day) ORDER BY d.day`, [from,to]);
  const pending = await pool.query(`SELECT count(*)::text count FROM generation_jobs
    WHERE state IN ('queued','running','refining')`);
  return { days: rows, pending: pending.rows[0].count };
}

export async function queryOperationsLog(pool, { kind, from, to, query, filter, cursor, limit }) {
  const values = [from,to,query || null,filter || null,cursor?.createdAt ?? null,cursor?.id ?? null,limit+1];
  const common = `created_at >= $1::date::timestamp AT TIME ZONE 'Asia/Shanghai'
    AND created_at < ($2::date+1)::timestamp AT TIME ZONE 'Asia/Shanghai'
    AND ($5::timestamptz IS NULL OR (created_at,id) < ($5::timestamptz,$6::uuid))`;
  const sql = kind === 'tasks' ? `WITH records AS (SELECT ${JOB_COLUMNS} ${JOB_FROM})
    SELECT * FROM records WHERE ${common}
    AND ($3::text IS NULL OR position(lower($3) in lower(email))>0 OR id::text=$3 OR batch_id::text=$3)
    AND ($4::text IS NULL OR state=$4) ORDER BY created_at DESC,id DESC LIMIT $7`
    : `WITH ledger AS (${LEDGER_SQL}), records AS (SELECT l.*,u.email,j.batch_id
      FROM ledger l LEFT JOIN users u ON u.id=l.user_id LEFT JOIN generation_jobs j ON j.id=l.related_job_id)
    SELECT * FROM records WHERE ${common}
    AND ($3::text IS NULL OR position(lower($3) in lower(COALESCE(email,'')))>0
      OR related_job_id::text=$3 OR batch_id::text=$3 OR id::text=$3)
    AND ($4::text IS NULL OR entry_type=$4) ORDER BY created_at DESC,id DESC LIMIT $7`;
  const { rows } = await pool.query(sql,values);
  const hasMore = rows.length > limit;
  const page = rows.slice(0,limit);
  const last = page.at(-1);
  return { items: page.map(kind === 'tasks' ? jobDto : ledgerDto),
    next: hasMore ? { createdAt: iso(last.created_at), id: last.id } : null };
}

export async function readOperationsDetail(pool, { kind, id }) {
  let selected = null, jobId = id;
  if (kind === 'credits') {
    const result = await pool.query(`WITH ledger AS (${LEDGER_SQL})
      SELECT l.*,u.email FROM ledger l LEFT JOIN users u ON u.id=l.user_id WHERE l.id=$1::uuid`,[id]);
    if (!result.rows.length) return null;
    selected = ledgerDto(result.rows[0]);
    jobId = selected.jobId;
  }
  const job = jobId ? await pool.query(`SELECT ${JOB_COLUMNS} ${JOB_FROM} WHERE j.id=$1::uuid`,[jobId]) : {rows:[]};
  if (kind === 'tasks' && !job.rows.length) return null;
  const timeline = jobId ? await pool.query(`WITH ledger AS (${LEDGER_SQL})
    SELECT l.*,u.email FROM ledger l LEFT JOIN users u ON u.id=l.user_id
    WHERE related_job_id=$1::uuid ORDER BY created_at,id LIMIT 100`,[jobId]) : { rows: [] };
  return { job: job.rows[0] ? jobDto(job.rows[0]) : null, selected,
    timeline: timeline.rows.map(ledgerDto) };
}
