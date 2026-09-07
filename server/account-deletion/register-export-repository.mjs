function iso(value, label) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} is not a valid timestamp`);
  }
  return parsed.toISOString();
}

export async function readAccountDeletionRegisterForExport(
  pool,
  { exportedAt },
) {
  if (!pool || typeof pool.query !== "function") {
    throw new Error("A PostgreSQL pool is required");
  }
  if (!(exportedAt instanceof Date) || Number.isNaN(exportedAt.getTime())) {
    throw new Error("exportedAt must be a valid Date");
  }
  const result = await pool.query(
    `SELECT request_id, target_owner_id, state, deadline_at, completed_at,
            audit_retention_until, created_at, updated_at
       FROM account_deletion_register
      WHERE state = 'processing'
         OR audit_retention_until > $1
      ORDER BY request_id`,
    [exportedAt],
  );
  return result.rows.map((row) => ({
    auditRetentionUntil:
      row.audit_retention_until === null
        ? null
        : iso(row.audit_retention_until, "audit_retention_until"),
    completedAt:
      row.completed_at === null ? null : iso(row.completed_at, "completed_at"),
    createdAt: iso(row.created_at, "created_at"),
    deadlineAt: iso(row.deadline_at, "deadline_at"),
    requestId: row.request_id,
    state: row.state,
    targetOwnerId: row.target_owner_id,
    updatedAt: iso(row.updated_at, "updated_at"),
  }));
}
