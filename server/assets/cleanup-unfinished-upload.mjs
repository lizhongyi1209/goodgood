import { DeleteObjectCommand } from "@aws-sdk/client-s3";

const SOURCES = Object.freeze({ video: "video_materials", audio: "audio_materials" });

// Ready media are never deleted here. The table name comes only from this fixed map.
export async function cleanupUnfinishedUpload(resources, kind, { execute = false, now = new Date(), limit = 100 } = {}) {
  const table = SOURCES[kind];
  if (!table) throw new Error("Unknown private material kind.");
  const rows = await resources.pool.query(
    `SELECT id, object_key FROM ${table}
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
      await resources.storage.send(new DeleteObjectCommand({ Bucket: resources.config.objectStorage.bucket, Key: row.object_key }));
      const result = await resources.pool.query(
        `DELETE FROM ${table} WHERE id=$1 AND upload_state IN ('pending', 'rejected', 'expired')
          AND expires_at < $2::timestamptz - interval '24 hours'`,
        [row.id, now],
      );
      deleted += result.rowCount;
    } catch (error) {
      failed += 1;
      console.error(JSON.stringify({ event: `${kind}_material.cleanup_failed`, materialId: row.id,
        message: error instanceof Error ? error.message : String(error) }));
    }
  }
  return { eligible: rows.rowCount, deleted, failed };
}
