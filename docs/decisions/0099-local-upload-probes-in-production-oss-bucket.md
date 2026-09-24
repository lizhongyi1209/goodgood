# ADR 0099: Local upload probes in the production OSS bucket

- Status: Accepted for GG-111 local development only
- Date: 2026-09-24
- Extends: ADR 0097 and the isolation rule in ADR 0092 at the user's explicit request

## Context

The 5173 creation page now uploads references through the real GoodGood API,
but object bytes go to local RustFS. The operator wants local development to
exercise the online OSS upload path and explicitly selected the production OSS
bucket `o1key-goodgood`. The local PostgreSQL database and account session remain
isolated. The OSS bucket has existing user objects that must remain untouched.

## Decision

Provide an opt-in local Web mode that writes only new reference objects under
`local-dev/references/` in `o1key-goodgood`. New keys are generated from local
workspace, owner, and reference IDs. Existing unprefixed references continue to
use RustFS. The local app routes reads of its `local-dev/references/` keys to OSS
and signs short-lived PUT/GET URLs against the direct OSS upload CNAME. This
mode never lists or imports production objects and does not route generated
assets to the production bucket. It does not activate a production Worker.

The mode requires an external configuration file and external RAM credential
files. A RAM identity restricted to the local prefix is preferred. The production
bucket must allow the local 5173 origin's PUT preflight while keeping its
existing production CORS origin. Without that cloud configuration the default
local RustFS mode remains in use; no silent cloud fallback occurs.

## Consequences

- Local test PUT/GET requests to the production bucket can incur OSS traffic
  charges. Existing production objects remain outside the application's key
  router and are not test fixtures.
- The operator added the exact 5173 origin to bucket CORS. OPTIONS now returns
  200 with `PUT` and `content-type`; the earlier response was 403.
- The local database keeps references to `local-dev/references/` keys. Their
  previews require this opt-in mode when that checkpoint is restarted.
- This decision does not authorize a production application release or change
  the GG-106 production cutover work.

## Verification

On 2026-09-24 both local and production browser origins passed PUT preflight.
A disposable local-prefix object passed signed PUT, private GET with byte
comparison, and exact-key deletion. The 5173 page then uploaded a real PNG;
the local reference became `ready / accepted`, OSS HEAD matched its byte size,
and the operator confirmed it remained visible after refresh.
