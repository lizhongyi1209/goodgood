# ADR 0100: Opt-in real email delivery for the local workspace

- Status: Accepted for GG-112 local development only
- Date: 2026-09-24
- Extends: ADR 0045 and the development isolation rule in ADR 0092 at the
  user's explicit request

## Context

The 5173 page already calls GoodGood's real email OTP API through the verified
32131 Web. The local Web currently sends codes to Mailpit. The operator wants
real mailbox delivery for development and selected the existing sending account.
That account may also serve production, so this is a narrow exception to ADR
0092's dedicated-credential rule. No production identity or database is needed.

## Decision

Add an explicit `--email-env-file` option to the local workspace checkpoint
launcher. It accepts only sender and SMTP transport settings, with the password
in a separate file outside every repository. It requires authenticated implicit
TLS to a non-loopback host and a passing read-only SMTP authentication preflight
before Web starts. Default local startup remains Mailpit. The Vite page still
proxies authentication to the same local Web, so no browser-side SMTP credential
or direct provider call is introduced.

The mode retains the local PostgreSQL user and challenge records, local session
cookie, rate limits, and user-triggered send action. It does not import, read,
or mutate production accounts. A real code is sent only when a person requests
one from the local login UI. The operator's choice does not authorize a
production application deployment or bulk email test.

## Consequences

- Real delivery can incur email provider charges and affect sender reputation.
  Use a mailbox controlled by the operator for smoke testing.
- A shared SMTP account increases credential scope on the development machine.
  The password must stay outside Git and logs; a dedicated account remains the
  preferred later replacement.
- SMTP `verify()` proves connection and authentication, not final inbox
  delivery. Mailbox receipt and login still need an interactive check.
