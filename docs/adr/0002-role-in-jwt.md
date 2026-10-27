# ADR-0002 — The role lives in a JWT claim, not in a lookup on every request

**Date:** 2026-09-14 · **Commit:** `b601064` *(add JWT login and the current
user endpoint)* · **Scope:** authentication and authorisation

## Status

Accepted, and this is the decision the team asks about most, because its
consequences surface in three different places in the application.

## Context

The API holds no session (`SessionCreationPolicy.STATELESS`). Every incoming
request carries a JWT, and Spring Security has to decide whether that request
may enter `/api/admin/**`, `/api/doctor/**`, or nowhere at all.

To decide, the filter needs the account's **role**. There are two sources: the
token itself, or the database.

## Alternatives considered

**1. The role lives in a token claim.** `generateToken()` writes `role` into
the token at login; `JwtAuthenticationFilter` reads that claim and builds the
authority from it.

**2. The token carries only an id, and every request hits the database.** The
filter takes `sub`, calls `userRepository.findById()`, and reads the current
role.

**3. Option 1 plus a revocation list.** The role stays in the token, but the
server keeps a table of invalidated tokens so access can be cut early.

## Decision

Option 1.

The trade is explicit: drop **one database query on every authenticated
request**, and accept that **role changes take effect with a delay**. At this
project's scale, an extra query on every request is a permanent cost paid to
serve a rare event — an admin changing somebody's role.

Option 3 solves the delay, but it reintroduces exactly what option 1 just
removed: a read of shared state on every request. If the project ever needs
that, option 2 is simpler and more honest.

The token carries exactly five fields — `sub`, `email`, `role`, `iat`, `exp` —
signed with HS256. Worth remembering: **a JWT is signed, not encrypted.**
Anyone holding the token can read the email and role inside it, so nothing
secret is ever put in there.

## Consequences

**Gained:**

- Authorisation costs exactly one signature check and never touches the
  database.
- The backend stays genuinely sessionless: there is no shared state to keep in
  sync.

**Paid for — and all three of these will be asked about:**

1. **An admin approves someone as a doctor and that person cannot reach
   `/doctor` yet.** They have to log in again. Not "log out" — logging out only
   clears the token from the browser; what grants the new role is *the next
   login*.
2. **Deactivating a doctor does not cut access immediately.** That is why
   `AdminDoctorService.updateStatus()` has to lower `user.role` to `PATIENT`
   rather than only setting `status = INACTIVE` — otherwise that person keeps
   `ROLE_DOCTOR` until the token expires, up to **30 days** with a remember-me
   token.
3. **The frontend and the backend can disagree.** `AuthProvider` calls
   `GET /users/me` on every start-up, so the interface sees the **new** role
   from the database while the backend still trusts the **old** role in the
   token. The user reaches the page and every API call returns 403. Put
   briefly: *the frontend asks the database, the backend trusts the token.*

The maximum window of disagreement equals the token's lifetime: one hour
normally, 30 days with remember-me ticked.

## Where this is checked

- The source of the role: `auth/jwt/JwtService.java:41` (`generateToken`) and
  `auth/jwt/JwtAuthenticationFilter.java`.
- The decision is recorded where it causes its consequences —
  `config/SecurityConfig.java`, in the comment above the two `hasRole` lines:
  *"so a role change only takes effect once that user logs in again"*.
- Consequence 2 is held by
  `doctor/AdminDoctorApiTest.deactivatingTakesTheDoctorRoleAwayAndActivatingGivesItBack`.
- Consequence "an old role does not open the doctor area":
  `booking/BookingFlowTest.authenticationRoleOwnershipAndRevokedRoleAreEnforced`
  (the last part uses a `stale` token).
- The end-user description: US-AU-03 AC6 in
  [`../USER_STORIES.md`](../USER_STORIES.md).
