# ADR 0007: Authing hosted Google and email-code authentication

- Status: Accepted
- Date: 2026-08-31

## Context

GoodGood needs production registration and sign-in without weakening the
provider-neutral owner boundary already verified in M4. The initial product
does not need passwords, phone numbers, or a broad list of social providers.
It also does not yet have an ICP-filed domain that can be used as an Authing
custom authentication domain. Auth0's Japan region and a self-hosted identity
service are explicitly out of scope.

## Decision

Use an Authing-hosted login page with exactly two enabled end-user methods:

- Google sign-in, including first-use registration;
- passwordless email verification-code sign-in, including first-use
  registration.

Disable password, username, phone/SMS, WeChat, and every other connection in
the Authing application. Configure Authing account association so a verified
Google email and a verified email-code account can resolve to one Authing
subject. GoodGood will not silently merge two distinct subjects by matching an
email address.

Integrate through standard OpenID Connect Authorization Code flow with PKCE,
`state`, `nonce`, and a short-lived HttpOnly cookie that binds the callback to
the browser that initiated login; do not depend on a provider SDK in application
domain code. The GoodGood backend performs discovery, exchanges the one-time code,
validates the signed ID token and verified-email claim, maps `(issuer,
subject)` to an internal owner, and issues an opaque GoodGood session in a
`Secure`, `HttpOnly`, `SameSite=Lax` cookie. Provider access, ID, and refresh
tokens are never returned to the browser or used as GoodGood API sessions.

Use the Authing-provided application domain for authentication until an
approved, ICP-filed custom domain is available. Issuer, client ID, client
secret, callback URL, and cookie policy are runtime configuration and never
enter the repository. Local automated verification uses a mock OIDC issuer;
real Authing and Google callbacks require staging credentials and public
network verification.

## Consequences

- The visible registration and sign-in surface stays limited to the two
  approved passwordless methods.
- GoodGood retains stable internal owner IDs and can replace Authing later
  without rewriting generation, asset, reference, project, or billing data.
- The backend must persist one-time login attempts and hashed, revocable
  GoodGood sessions, enforce expirations, and normalize callback failures.
- Authing console configuration, Google OAuth credentials, email delivery and
  templates, account association, callback allowlists, and real logout must be
  verified in staging; local tests cannot accept those operational controls.
- A branded Authing custom domain is deferred until the domain and required ICP
  filing are available. This does not block local implementation.
