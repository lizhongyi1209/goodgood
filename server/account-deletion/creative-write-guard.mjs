export async function lockOwnerCreativeWriteAccess(client, ownerId) {
  const result = await client.query(
    `SELECT owner.status,
            EXISTS (
              SELECT 1
                FROM account_deletion_requests request
               WHERE request.target_owner_id = owner.id
            ) AS has_deletion_request
       FROM users owner
      WHERE owner.id = $1
      FOR UPDATE OF owner`,
    [ownerId],
  );
  const owner = result.rows[0];
  return Boolean(
    owner && owner.status === "active" && !owner.has_deletion_request,
  );
}
