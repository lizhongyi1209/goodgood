const REFERENCE_LIFECYCLE_LOCK_KEY = "goodgood:reference-lifecycle";

export async function lockReferenceLifecycle(client) {
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
    [REFERENCE_LIFECYCLE_LOCK_KEY],
  );
}
