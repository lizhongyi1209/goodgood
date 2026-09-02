const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export const REFERENCE_RETENTION_DEFAULTS = Object.freeze({
  batchSize: 100,
  cleanupGraceMs: 60 * MINUTE_MS,
  cleanupLeaseMs: 5 * MINUTE_MS,
  orphanRetentionMs: 30 * DAY_MS,
});

function positiveInteger(value, fallback, name, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = value === undefined ? fallback : Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > maximum) {
    throw new Error(`${name} must be a positive integer no greater than ${maximum}.`);
  }
  return parsed;
}

export function loadReferenceRetentionPolicy(environment = process.env) {
  return Object.freeze({
    batchSize: positiveInteger(
      environment.REFERENCE_CLEANUP_BATCH_SIZE,
      REFERENCE_RETENTION_DEFAULTS.batchSize,
      "REFERENCE_CLEANUP_BATCH_SIZE",
      1_000,
    ),
    cleanupGraceMs: positiveInteger(
      environment.REFERENCE_CLEANUP_GRACE_MINUTES,
      REFERENCE_RETENTION_DEFAULTS.cleanupGraceMs / MINUTE_MS,
      "REFERENCE_CLEANUP_GRACE_MINUTES",
      7 * 24 * 60,
    ) * MINUTE_MS,
    cleanupLeaseMs: positiveInteger(
      environment.REFERENCE_CLEANUP_LEASE_SECONDS,
      REFERENCE_RETENTION_DEFAULTS.cleanupLeaseMs / 1_000,
      "REFERENCE_CLEANUP_LEASE_SECONDS",
      24 * 60 * 60,
    ) * 1_000,
    orphanRetentionMs: positiveInteger(
      environment.REFERENCE_ORPHAN_RETENTION_DAYS,
      REFERENCE_RETENTION_DEFAULTS.orphanRetentionMs / DAY_MS,
      "REFERENCE_ORPHAN_RETENTION_DAYS",
      365,
    ) * DAY_MS,
  });
}

export function referenceRetentionWindow(policy, now = new Date()) {
  const timestamp = now instanceof Date ? now.getTime() : Number.NaN;
  if (!Number.isFinite(timestamp)) throw new Error("Reference cleanup now must be a valid Date.");
  return Object.freeze({
    cleanupEligibleAt: new Date(timestamp + policy.cleanupGraceMs),
    leaseExpiresAt: new Date(timestamp + policy.cleanupLeaseMs),
    now: new Date(timestamp),
    orphanedBefore: new Date(timestamp - policy.orphanRetentionMs),
  });
}
