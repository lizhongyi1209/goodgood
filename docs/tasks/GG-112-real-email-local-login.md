# GG-112 — real email delivery for local login

- Status: implemented and locally verified; production application unchanged.
- Baseline: GG-111 `6067cda`; branch `feature/GG-112-real-email-local-login`;
  worktree `F:/goodgood-worktrees/GG-112`.
- Decision: existing email OTP and GoodGood session remain authoritative. The
  user selected real email delivery using the existing sending account. Local
  identities, PostgreSQL, session, queue, and assets remain isolated.
  [ADR 0100](../decisions/0100-local-real-email-delivery.md) records the
  narrow exception to the dedicated-credential rule.

## Acceptance

1. The 5173 login page continues to use the real GoodGood `/api/auth/email/*`
   endpoints through verified 32131 Web.
2. An explicit workspace startup option loads only SMTP settings from an
   external file; its password stays in a separate external file.
3. Remote delivery requires authenticated implicit TLS and a passing SMTP
   preflight before Web starts. Missing or invalid configuration fails closed.
4. A permitted local test mailbox receives a code and can sign in; a page
   refresh preserves the session. No production account/database is imported.

## Current verification

- Targeted email configuration/authentication tests: 14 passed.
- `npm run check:local`: 585 tests, 559 passed, 26 isolated skips,
  0 failed; lint reported 16 existing warnings and 0 errors.
- The external configuration points to the operator-provided password file;
  no password was printed or committed. Authentication preflight passed all
  five checks, including `smtp-authentication`, without sending mail.
- Verified 32131 Web ran `49e5f7d` with `emailDelivery: real-smtp`, cloud
  reference upload mode, readiness 200, and `build.verified=true`. The 5173
  proxy returned `email_code` and `/login` 200.
- The operator received a real code, signed in through 5173, refreshed, and
  confirmed the session remained active. No production account was imported.
- The 5173 Vite server was then moved to the GG-112 worktree. Its `/login`,
  authentication method and proxied Web version returned 200, `email_code`
  and the verified GG-112 revision respectively.

## 下一步

Keep the opt-in SMTP mode and external password file for continued local
development. Rebuild/restart from the exact future committed revision before
using 32131; preserve the local identity database and cloud upload mode.
