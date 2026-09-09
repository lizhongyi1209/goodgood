# ADR 0045: GoodGood-owned email-code authentication

- Status: Accepted
- Date: 2026-09-10
- Supersedes: ADR 0007's Authing/Google provider selection and GG-028's unshipped
  ADR 0044 custom-domain direction. The existing GoodGood session and ownership
  boundaries remain accepted.
- Delivery: planning only; production still uses Authing. Implementation and
  production cutover require their own evidence.

## Context

The owner selected self-managed email verification-code login and deferred
Google sign-in. The requested scope is a usable controlled-alpha launch with
basic daily operations, not a complete identity platform. Current users are
reported to be test users, but that does not require deleting their business
data or resetting production.

Inspection confirms that GoodGood already owns users, access review, roles,
credits, and hashed, revocable sessions. Authing supplies the identity proof.
The runtime and production preflight currently require OIDC/Authing, and
provisioning refuses implicit email-based linking. Those are implementation
dependencies, not configuration-only changes.

## Decision

Use one passwordless email-code method in GoodGood's existing same-origin
authentication recovery surface. First successful verification creates a
pending account with the existing one-time welcome grant. Existing approval,
suspension, ownership, and site-owner role rules continue to apply. Google,
passwords, phone login, cross-provider linking, and a standalone identity
server are outside the first release.

Keep the current Hong Kong application and site domain. A separate login domain
is unnecessary. Use a managed transactional-email service for delivery;
Alibaba Cloud Direct Mail over certificate-verified SMTP/TLS is the proposed
first provider, subject to sender setup, account quota, and mailbox tests.
Only GoodGood generates and verifies the codes. Do not self-host an outbound
mail server or build multi-provider failover for this release.

Add an explicit production `email_otp` authentication mode. Reuse the opaque
GoodGood session mechanism; keep local test authentication forbidden in
production. Persist email bindings, challenges, atomic rate-limit counters,
and bounded audit evidence in PostgreSQL. Use a stable internal issuer and
random subject, independent of domain or email spelling.

Required controls are secure random, short-lived, single-use codes stored as
keyed digests; browser-bound challenges; cross-origin request protection;
atomic verification/provisioning/session creation; mailbox/IP/global sending
and guessing limits; bounded mail timeouts; secret redaction; cleanup; and an
operator disable/revoke procedure. Preserve the existing account-admission
boundary. Email login alone is not phishing-resistant or multi-factor login.

Migrate only explicitly reviewed existing owner/email mappings by adding local
email identities; preserve owner IDs and the old Authing identities. Do not
reinterpret Authing subjects or silently merge accounts by email. Confirm the
site-owner's retained access before public cutover. Old test-data deletion is
optional, separate work, not a prerequisite.

First-release defaults, behavior, delivery gates, and the limits of Authing
rollback are specified in [the implementation plan](../EMAIL_AUTH_PLAN.md).
Proposed supplier, thresholds, and effort estimates are engineering defaults,
not proof of a purchased service or production readiness.

## Consequences

- Email login stays within the GoodGood page and works in ordinary mobile
  browsers without social-login callbacks or identity-provider custom domains.
- GoodGood becomes responsible for verification and abuse controls; the mail
  provider still determines delivery behavior and may reject or delay mail.
- No Google connection or Authing custom-domain repair is required for the
  selected target. GG-028 remains historical, unshipped work.
- A new email-only account has no automatic Authing counterpart. Restoring
  Authing alone is not a complete rollback for those users.
- MFA/passkeys, self-service email changes, lost-mailbox recovery, automated
  deletion, multi-provider delivery, and complex monitoring remain deferred.
  Manual support must not bypass verification or award administrative roles.
- CURRENT_STATE changes only after a verified production cutover; legacy
  operational instructions remain applicable to the currently deployed mode.
