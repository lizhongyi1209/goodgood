# ADR 0142: Idempotent image uploads and reuse of identical original files

- Status: Accepted
- Date: 2026-10-05
- Related task: GG-383
- Refines: ADR 0037 and ADR 0108

## Decision

The user accepts the two improvements identified in GG-381: retries of the same upload reuse the existing upload record, and ordinary uploads of an exactly identical file reuse an available reference in the same authorized workspace and creator scope. Use SHA-256 of the complete file bytes, with MIME/byte-size checks, never names, preview URLs or perceptual matching. This replaces ADR 0037's decision to omit content duplicate detection for new uploads; existing materials are not merged, deleted or rewritten.

Keep multiple canvas nodes referencing one source. Explicit editing/export operations produce independent versions even when their bytes match an existing file; their own retries remain idempotent. Preserve that copy policy in pending local File storage so a refresh does not turn an edited copy into ordinary reuse. Existing names/metadata on a reused material are retained; the node can retain its own label, and explicitly selected folder destinations still follow current organization behavior.

Fingerprint claims are validated against actual uploaded bytes on completion. Reuse only accepted, ready, undeleted owned materials or unexpired compatible pending original uploads; no cross-account/workspace sharing, rejected/expired/tombstoned revival or readiness bypass. Serialize matching upload creation before reuse/insert, including concurrent requests. A ready reuse response skips object PUT and completion; legacy requests without fingerprints retain the previous response contract. New clients accept old uploading responses until the backend is activated.

No generation request, billing change or provider submission. Implementation includes an additive migration and backend/frontend source; GG-276 still forbids automatic builds/checks/tests/runtime activation. Applying the migration and restarting Web is a separate explicitly delegated step; Worker and production stay outside this task.
