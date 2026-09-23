import { DeleteObjectCommand } from "@aws-sdk/client-s3";

// Ready material is intentionally outside this cleanup path.
export async function cleanupExpiredVideoUploads(resources, { execute = false, now = new Date(), limit = 100 } = {}) {
  const rows = await resources.pool.query(
    `SELECT id, object_key FROM video_materials
      WHERE upload_state IN ('pending', 'rejected', 'expired')
        AND expires_at < $1::timestamptz - interval '24 hours'
      ORDER BY expires_at, id LIMIT $2`,
    [now, limit],
  );
  if (!execute) return { eligible: rows.rowCount, deleted: 0, failed: 0 };
  let deleted = 0;
  let failed = 0;
  for (const row of rows.rows) {
    try {
      await resources.storage.send(new DeleteObjectCommand({
        Bucket: resources.config.objectStorage.bucket, Key: row.object_key,
      }));
      const result = await resources.pool.query(
        `DELETE FROM video_materials WHERE id=$1 AND upload_state IN ('pending', 'rejected', 'expired')
          AND expires_at < $2::timestamptz - interval '24 hours'`,
        [row.id, now],
      );
      deleted += result.rowCount;
    } catch (error) {
      failed += 1;
      console.error(JSON.stringify({ event: "video_material.cleanup_failed", materialId: row.id,
        message: error instanceof Error ? error.message : String(error) }));
    }
  }
  return { eligible: rows.rowCount, deleted, failed };
}
