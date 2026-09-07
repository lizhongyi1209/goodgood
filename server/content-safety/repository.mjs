import { randomUUID } from "node:crypto";
import { lockOwnerCreativeWriteAccess } from "../account-deletion/creative-write-guard.mjs";
import { ContentSafetyError, contentSafetyAccessDeniedError } from "./errors.mjs";
import {
  CONTENT_POLICY_DOCUMENT_HASH,
  CONTENT_POLICY_VERSION,
} from "./policy.mjs";

async function assertSiteOwner(client, actorOwnerId) {
  const role = await client.query(
    `SELECT 1
       FROM system_role_assignments
      WHERE owner_id = $1 AND role = 'site_owner'
      LIMIT 1`,
    [actorOwnerId],
  );
  if (!role.rowCount) throw contentSafetyAccessDeniedError();
}

function reportFromRow(row, created = false) {
  return {
    assetId: row.asset_id,
    category: row.category,
    created,
    createdAt: new Date(row.created_at).toISOString(),
    id: row.id,
    resolution: row.resolution,
    resolvedAt: row.resolved_at
      ? new Date(row.resolved_at).toISOString()
      : null,
    state: row.state,
  };
}

export async function hasAcceptedCurrentContentPolicy(pool, { ownerId }) {
  const result = await pool.query(
    `SELECT accepted_at
       FROM content_policy_acceptances
      WHERE owner_id = $1 AND policy_version = $2 AND document_hash = $3`,
    [ownerId, CONTENT_POLICY_VERSION, CONTENT_POLICY_DOCUMENT_HASH],
  );
  return result.rows[0]?.accepted_at ?? null;
}

export async function assertCurrentContentPolicyAccepted(client, ownerId) {
  if (await hasAcceptedCurrentContentPolicy(client, { ownerId })) return;
  throw new ContentSafetyError(
    "CONTENT_POLICY_ACCEPTANCE_REQUIRED",
    "请先阅读并同意当前 GoodGood 内测使用规则。",
    409,
  );
}

export async function acceptCurrentContentPolicy(
  pool,
  { idempotencyKey, ownerId },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [`content-policy:${ownerId}:${idempotencyKey}`],
    );
    if (!(await lockOwnerCreativeWriteAccess(client, ownerId))) {
      throw new ContentSafetyError(
        "ACCOUNT_SUSPENDED",
        "账户已暂停使用，不能接受使用规则。",
        403,
      );
    }
    const result = await client.query(
      `INSERT INTO content_policy_acceptances (
         owner_id, policy_version, document_hash, source
       ) VALUES ($1, $2, $3, 'web')
       ON CONFLICT (owner_id, policy_version) DO NOTHING
       RETURNING accepted_at`,
      [ownerId, CONTENT_POLICY_VERSION, CONTENT_POLICY_DOCUMENT_HASH],
    );
    let acceptedAt = result.rows[0]?.accepted_at ?? null;
    if (!acceptedAt) {
      const existing = (await client.query(
        `SELECT accepted_at, document_hash
           FROM content_policy_acceptances
          WHERE owner_id = $1 AND policy_version = $2`,
        [ownerId, CONTENT_POLICY_VERSION],
      )).rows[0];
      if (
        existing &&
        existing.document_hash !== CONTENT_POLICY_DOCUMENT_HASH
      ) {
        throw new ContentSafetyError(
          "CONTENT_POLICY_ACCEPTANCE_CONFLICT",
          "当前使用规则记录与发布版本不一致，请联系站长。",
          409,
        );
      }
      acceptedAt = existing?.accepted_at ?? null;
    }
    if (!acceptedAt) {
      throw new ContentSafetyError(
        "CONTENT_POLICY_ACCEPTANCE_CONFLICT",
        "当前使用规则接受记录无法确认，请刷新后重试。",
        409,
      );
    }
    await client.query("COMMIT");
    return {
      acceptedAt: new Date(acceptedAt).toISOString(),
      created: result.rowCount === 1,
      documentHash: CONTENT_POLICY_DOCUMENT_HASH,
      version: CONTENT_POLICY_VERSION,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function findReportByIdempotency(client, ownerId, idempotencyKey) {
  const result = await client.query(
    `SELECT * FROM content_reports
      WHERE reporter_owner_id = $1 AND idempotency_key = $2`,
    [ownerId, idempotencyKey],
  );
  return result.rows[0] ?? null;
}

export async function createOwnedAssetReport(
  pool,
  { assetId, category, idempotencyKey, operationHash, ownerId },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [`content-report:${ownerId}:${idempotencyKey}`],
    );
    const replay = await findReportByIdempotency(client, ownerId, idempotencyKey);
    if (replay) {
      if (replay.operation_hash !== operationHash) {
        throw new ContentSafetyError(
          "CONTENT_REPORT_IDEMPOTENCY_CONFLICT",
          "该操作标识已经用于另一项内容举报。",
          409,
        );
      }
      await client.query("COMMIT");
      return reportFromRow(replay, false);
    }
    if (!(await lockOwnerCreativeWriteAccess(client, ownerId))) {
      throw new ContentSafetyError(
        "ACCOUNT_SUSPENDED",
        "账户已暂停使用，不能提交内容举报。",
        403,
      );
    }
    const assetResult = await client.query(
      `SELECT id, moderation_state
         FROM assets
        WHERE id = $1 AND owner_id = $2 AND object_deleted_at IS NULL
        FOR UPDATE`,
      [assetId, ownerId],
    );
    const asset = assetResult.rows[0];
    if (!asset) {
      throw new ContentSafetyError(
        "CONTENT_REPORT_ASSET_NOT_FOUND",
        "没有找到可举报的图片。",
        404,
      );
    }
    const existingOpen = await client.query(
      `SELECT * FROM content_reports
        WHERE reporter_owner_id = $1 AND asset_id = $2 AND state = 'open'
        LIMIT 1`,
      [ownerId, assetId],
    );
    if (existingOpen.rowCount) {
      await client.query("COMMIT");
      return reportFromRow(existingOpen.rows[0], false);
    }
    if (!["not_reviewed", "accepted"].includes(asset.moderation_state)) {
      throw new ContentSafetyError(
        "CONTENT_REPORT_ASSET_UNAVAILABLE",
        "该图片已经进入处理流程。",
        409,
      );
    }
    const reportId = randomUUID();
    const inserted = await client.query(
      `INSERT INTO content_reports (
         id, reporter_owner_id, target_owner_id, asset_id, category,
         idempotency_key, operation_hash
       ) VALUES ($1, $2, $2, $3, $4, $5, $6)
       RETURNING *`,
      [reportId, ownerId, assetId, category, idempotencyKey, operationHash],
    );
    await client.query(
      `UPDATE assets
          SET moderation_state = 'quarantined', updated_at = now()
        WHERE id = $1 AND owner_id = $2`,
      [assetId, ownerId],
    );
    await client.query("COMMIT");
    return reportFromRow(inserted.rows[0], true);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listOpenContentReports(pool, { limit = 30 } = {}) {
  const result = await pool.query(
    `SELECT report.id, report.asset_id, report.category, report.created_at,
            target.id AS target_owner_id, target.email AS target_email,
            target.status AS target_status,
            asset.moderation_state
       FROM content_reports report
       JOIN users target ON target.id = report.target_owner_id
       LEFT JOIN assets asset ON asset.id = report.asset_id
      WHERE report.state = 'open'
      ORDER BY report.created_at ASC, report.id ASC
      LIMIT $1`,
    [limit],
  );
  return result.rows.map((row) => ({
    assetAvailable: Boolean(row.asset_id && row.moderation_state === "quarantined"),
    assetId: row.asset_id,
    category: row.category,
    createdAt: new Date(row.created_at).toISOString(),
    id: row.id,
    targetEmail: row.target_email,
    targetOwnerId: row.target_owner_id,
    targetStatus: row.target_status,
  }));
}

async function existingModerationAction(client, actorOwnerId, idempotencyKey) {
  const result = await client.query(
    `SELECT * FROM content_moderation_actions
      WHERE actor_owner_id = $1 AND idempotency_key = $2`,
    [actorOwnerId, idempotencyKey],
  );
  return result.rows[0] ?? null;
}

function assertActionReplay(existing, operationHash) {
  if (existing.operation_hash !== operationHash) {
    throw new ContentSafetyError(
      "CONTENT_MODERATION_IDEMPOTENCY_CONFLICT",
      "该操作标识已经用于另一项内容处理。",
      409,
    );
  }
}

async function lockedOpenReport(client, reportId) {
  const result = await client.query(
    `SELECT report.*, asset.object_key, asset.mime_type,
            asset.moderation_state, asset.object_deleted_at,
            batch.prompt, batch.model_id, batch.aspect_ratio, batch.resolution,
            batch.requested_count
       FROM content_reports report
       JOIN assets asset ON asset.id = report.asset_id
       JOIN generation_batches batch ON batch.id = asset.batch_id
      WHERE report.id = $1
      FOR UPDATE OF report, asset`,
    [reportId],
  );
  const report = result.rows[0];
  if (!report) {
    throw new ContentSafetyError(
      "CONTENT_REPORT_NOT_FOUND",
      "没有找到该内容举报。",
      404,
    );
  }
  if (report.state !== "open") {
    throw new ContentSafetyError(
      "CONTENT_REPORT_ALREADY_RESOLVED",
      "该内容举报已经处理。",
      409,
    );
  }
  return report;
}

export async function openContentReportForReview(
  pool,
  { actorOwnerId, idempotencyKey, operationHash, reportId },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await assertSiteOwner(client, actorOwnerId);
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [`content-moderation:${actorOwnerId}:${idempotencyKey}`],
    );
    const replay = await existingModerationAction(
      client,
      actorOwnerId,
      idempotencyKey,
    );
    if (replay) assertActionReplay(replay, operationHash);
    const report = await lockedOpenReport(client, reportId);
    if (
      !report.asset_id ||
      !report.object_key ||
      report.object_deleted_at ||
      report.moderation_state !== "quarantined"
    ) {
      throw new ContentSafetyError(
        "CONTENT_REPORT_ASSET_UNAVAILABLE",
        "举报图片当前不可供审核。",
        409,
      );
    }
    if (!replay) {
      await client.query(
        `INSERT INTO content_moderation_actions (
           id, report_id, actor_owner_id, target_owner_id, asset_id,
           action_type, previous_moderation_state,
           resulting_moderation_state, reason, idempotency_key, operation_hash
         ) VALUES ($1, $2, $3, $4, $5, 'review_opened',
                   'quarantined', 'quarantined', $6, $7, $8)`,
        [
          randomUUID(),
          reportId,
          actorOwnerId,
          report.target_owner_id,
          report.asset_id,
          "打开举报内容审核",
          idempotencyKey,
          operationHash,
        ],
      );
    }
    await client.query("COMMIT");
    return {
      aspectRatio: report.aspect_ratio,
      assetId: report.asset_id,
      category: report.category,
      mimeType: report.mime_type,
      modelId: report.model_id,
      objectKey: report.object_key,
      prompt: report.prompt,
      reportId,
      requestedCount: Number(report.requested_count),
      resolution: report.resolution,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function resolveOpenContentReport(
  pool,
  {
    action,
    actorOwnerId,
    deleteObject,
    idempotencyKey,
    operationHash,
    reason,
    reportId,
  },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await assertSiteOwner(client, actorOwnerId);
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [`content-moderation:${actorOwnerId}:${idempotencyKey}`],
    );
    const replay = await existingModerationAction(
      client,
      actorOwnerId,
      idempotencyKey,
    );
    if (replay) {
      assertActionReplay(replay, operationHash);
      await client.query("COMMIT");
      return {
        action: replay.action_type === "remove_asset" ? "remove" : "restore",
        created: false,
        reportId: replay.report_id,
      };
    }
    const report = await lockedOpenReport(client, reportId);
    if (
      !report.asset_id ||
      !report.object_key ||
      report.object_deleted_at ||
      report.moderation_state !== "quarantined"
    ) {
      throw new ContentSafetyError(
        "CONTENT_REPORT_ASSET_UNAVAILABLE",
        "举报图片当前不可处理。",
        409,
      );
    }
    const remove = action === "remove";
    if (remove) await deleteObject(report.object_key);
    await client.query(
      `UPDATE assets
          SET moderation_state = $2,
              object_deleted_at = CASE WHEN $3::boolean THEN now()
                                       ELSE object_deleted_at END,
              updated_at = now()
        WHERE id = $1`,
      [report.asset_id, remove ? "rejected" : "accepted", remove],
    );
    await client.query(
      `UPDATE content_reports
          SET state = 'resolved', resolution = $2, resolved_at = now(),
              retention_until = now() + interval '12 months', updated_at = now()
        WHERE id = $1 AND state = 'open'`,
      [reportId, remove ? "removed" : "dismissed"],
    );
    await client.query(
      `INSERT INTO content_moderation_actions (
         id, report_id, actor_owner_id, target_owner_id, asset_id,
         action_type, previous_moderation_state, resulting_moderation_state,
         reason, idempotency_key, operation_hash
       ) VALUES ($1, $2, $3, $4, $5, $6, 'quarantined', $7, $8, $9, $10)`,
      [
        randomUUID(),
        reportId,
        actorOwnerId,
        report.target_owner_id,
        report.asset_id,
        remove ? "remove_asset" : "restore_asset",
        remove ? "rejected" : "accepted",
        reason,
        idempotencyKey,
        operationHash,
      ],
    );
    await client.query("COMMIT");
    return { action, created: true, reportId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
