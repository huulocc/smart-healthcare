# ADR-002: Put authorization role in the signed JWT

- **Status:** Accepted
- **Date:** 2026-08-30
- **Scope:** Authentication and authorization

## Context

Every protected request needs the caller's user id, email and role. Looking up
the user row on every request would make revocation and role changes immediate,
but adds a database query to all protected endpoints and couples authentication
to database availability.

## Decision

Sign `sub` (user id), `email` and `role` into an HMAC-SHA256 JWT. The
authentication filter verifies signature and expiry and converts the role claim
to one Spring Security authority. It does not query the database for each
request.

## Alternatives considered

- **Database lookup for every request:** immediate role/status changes, at the
  cost of latency, load and a hard database dependency on every authorization.
- **Opaque server-side sessions:** straightforward revocation, but requires a
  shared session store and changes the stateless REST deployment model.

## Consequences

- Normal authorization is stateless and does not add a database round trip.
- Role changes and deactivation are reflected when a new token is issued, not in
  an already issued token. Ordinary tokens expire after one hour; remember-me
  tokens last longer and increase this staleness window.
- Signing-key secrecy and expiry validation are security-critical.
- If immediate revocation becomes a requirement, add a token version or
  revocation store rather than silently assuming this design already provides it.

