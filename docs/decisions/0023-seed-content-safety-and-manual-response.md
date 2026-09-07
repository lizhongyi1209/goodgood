# ADR 0023: Seed content safety and manual response

- Status: Accepted
- Date: 2026-09-07
- Refines: ADR 0019's moderation and abuse gate for unpaid seed production
- Preserves: ADR 0021's absence of fixed generation, queue-depth, and
  concurrency ceilings

## Context

GoodGood already requires site-owner approval before creative use, enforces a
finite credit balance, keeps assets private, validates uploaded and generated
image bytes, and normalizes upstream policy failures to `MODEL_REJECTED`.
Those controls limit access, spend, and malformed files, but they are not
semantic content moderation. Technical image validation currently writes
`moderation_state = accepted`, which overstates what was checked. There is no
versioned usage-policy acceptance, member reporting channel, exact-asset
quarantine/removal workflow, or objective production evidence contract for the
moderation gate.

The unpaid seed phase needs a small control loop that the current site owner can
operate without adding another data processor or silently reintroducing the
generation limits rejected by ADR 0021.

## Decision

Adopt a versioned GoodGood seed usage policy and a report-driven manual response
flow.

- The current policy is `seed-v1`. An active account must explicitly accept the
  exact version and document hash before it can upload a new reference or
  submit/retry a generation. Acceptance is durable, idempotent, and records no
  IP address, browser fingerprint, prompt, or image.
- The policy prohibits sexual exploitation of minors, non-consensual intimate
  imagery and sexual deepfakes, fraud or harmful impersonation, extremist or
  terrorist promotion, gratuitous graphic violence, clearly illegal activity,
  and infringement of another person's privacy, portrait, or intellectual-
  property rights. The operator may suspend access while a report is reviewed.
- GoodGood does not add a local keyword blocklist, semantic classifier, or new
  third-party moderation service in this phase. The selected O1Key/Gemini route
  continues to use its upstream default safety behavior; policy rejection stays
  non-retryable `MODEL_REJECTED`.
- Passing technical byte/MIME/dimension/decode checks means `not_reviewed`, not
  semantic acceptance. Generated Assets also start `not_reviewed`. Both
  `not_reviewed` and a manually restored `accepted` asset remain owner-private
  and usable; `quarantined` and `rejected` assets are not presented or accepted
  as generation references.
- A member may report only a generated Asset they own. A report contains a
  fixed category and identifiers, but no copied prompt, image bytes, free-form
  allegation, signed URL, or object key. Creating it atomically quarantines the
  exact Asset and removes it from ordinary presentation.
- Only a site owner may inspect an exact reported Asset. Opening that preview is
  a deliberate POST action that creates a durable non-content access record and
  returns a short-lived private-object URL plus live generation context. There
  is no administrator-wide content browser.
- A site owner resolves an open report by either restoring the Asset or deleting
  its private object. Object removal happens before database success is
  recorded; failure leaves the Asset quarantined and the report open for safe
  retry. The existing reasoned account-suspension control remains the account-
  level enforcement path.
- Policy acceptance, report, and moderation-action metadata contain no copied
  customer content. After account deletion, their owner UUID points only to the
  pseudonymized User record. They follow the existing 12-month non-content
  administrative-audit retention boundary; creative rows and private bytes are
  still removed under ADR 0022.
- `moderation-abuse-controls` may pass a release gate only with objective
  evidence for the exact policy version/hash, enforced acceptance, owner-only
  reporting, quarantine, site-owner-only review/removal, private Assets,
  provider rejection normalization, a successful production rehearsal, and the
  explicit absence of local semantic filtering and new generation limits.

## Consequences

- Existing active accounts must accept `seed-v1` once before their next upload
  or generation. Pending accounts still cannot reach creative capabilities.
- A reported Asset disappears immediately from the member's normal views. A
  false-positive report can be restored; confirmed removal is irreversible at
  the object layer.
- Human response is intentionally the first seed control. Its practical load,
  false-positive rate, and incident volume must be observed before selecting a
  classifier, keyword rules, or automated account action.
- This decision does not make O1Key provider retention acceptable, supply the
  blocked Authing deletion credential, activate monitoring, authorize a
  production deployment, or open public traffic.
