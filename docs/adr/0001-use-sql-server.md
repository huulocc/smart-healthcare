# ADR-001: Use Microsoft SQL Server

- **Status:** Accepted
- **Date:** 2026-10-22
- **Scope:** Spring Boot persistence

## Context

The project originally used MySQL, while the team's working dataset was
distributed as a SQL Server `.bak`. Keeping MySQL would require maintaining a
second schema and a data conversion path. SQL Server differs in identity syntax,
date/time mappings, enum constraints, authentication and migration tooling.

## Decision

Use Microsoft SQL Server as the single transactional database. Use Microsoft's
JDBC driver, Hibernate's SQL Server dialect and Flyway's SQL Server module.
Keep the developer database as a local SQL Server instance because that is where
the shared backup is restored.

## Alternatives considered

- **Remain on MySQL:** simpler existing setup, but incompatible with the shared
  backup and likely to create two drifting schemas.
- **Run SQL Server in Docker:** more reproducible infrastructure, but the image
  does not create an application database by environment variable; it needs an
  initialization service and conflicts with an already installed instance on
  port 1433.

## Consequences

- Migrations use T-SQL and require validation against a real SQL Server; H2 only
  checks application behavior and approximate grammar.
- `Instant` columns must match the dialect's `datetimeoffset` mapping.
- Local onboarding requires SQL Server TCP and mixed-mode authentication setup.
- A future Docker deployment needs an explicit database initialization step.

Detailed evidence is in [`docs/DATABASE.md`](../DATABASE.md).

