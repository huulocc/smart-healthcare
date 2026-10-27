# ADR-0001 — SQL Server installed on the machine, MySQL compose file deleted

**Date:** 2026-10-22 · **Commit:** `2f8f01b` *(merge of PR #8,
`feature/backend-sqlserver`)* · **Scope:** data infrastructure

## Status

Accepted. The detailed operational notes live in
[`../DATABASE.md`](../DATABASE.md); this file keeps the decision itself.

## Context

The backend originally ran MySQL from a `docker-compose.yml`. The team needed
to move to SQL Server, and the team's actual database is passed around as a
**`.bak` file** — a SQL Server backup, restored into an instance installed on
each machine.

The question was not "MySQL or SQL Server"; that was already settled. The
question was **where SQL Server runs**: in a container, as MySQL had, or as an
instance installed directly on each developer's machine.

## Alternatives considered

**1. Keep `docker-compose.yml` and swap the service for
`mcr.microsoft.com/mssql/server`.** Keeps a single start-up command and the
team's existing habit.

**2. A SQL Server instance installed on the machine, deleting the compose file
outright.**

## Decision

Option 2, and the compose file is **deleted** rather than converted.

Three reasons, heaviest first.

**The data arrives as a `.bak`.** That is how the team's database actually
circulates. A container would start empty and live a life of its own, separate
from the very file everyone is passing around. Two sources of truth for one
database is the kind of thing that breaks in the final week.

**The SQL Server image has no equivalent of `MYSQL_DATABASE`.** Creating the
database automatically would mean a second init service in compose, waiting on
a health check, then calling `CREATE DATABASE` through `sqlcmd` before Flyway
can connect. That is a real pattern, but it is machinery added to serve itself.

**Both want port 1433.** Running a container alongside an installed instance
means one of them has to move, and that will land on whoever is in the biggest
hurry.

The compose file is deleted rather than kept around, because it contained only
the MySQL service — **a compose file that starts the wrong database is worse
than no compose file at all.**

## Consequences

**Gained:**

- The team's `.bak` restores straight into the place the application reads
  from. There is no synchronisation step in between.
- No init service to maintain just to create an empty database.

**Paid for:**

- **No one-line start-up any more.** A newcomer has to install SQL Server
  themselves. This is the debt that the root [`../../README.md`](../../README.md)
  has to pay: its "How to run" section is noticeably longer than it would be
  for a project with compose.
- Instance names differ from machine to machine, so `spring.datasource.url`
  became **a single `DB_URL` variable** instead of being assembled from
  `DB_HOST`/`DB_PORT`/`DB_NAME`. SQL Server addresses a default instance by
  port and a named instance by name, and those two shapes do not fit one
  template.
- Time columns have to match the dialect's mapping. Hibernate takes `Instant`
  through `TIMESTAMP_UTC`, which the SQL Server dialect renders as
  `datetimeoffset`; translating it by hand to `datetime2` stops the application
  from starting. Details in section 3.2 of
  [`../../AI_USAGE.md`](../../AI_USAGE.md).
- The connection string has to carry `encrypt=true;trustServerCertificate=true`.
  The driver encrypts by default from version 10 on, a local instance presents
  a certificate nobody trusts, and leaving off the second half breaks the
  handshake immediately.
- Anyone who wants to go back to containers still can — both requirements above
  are written down so they do not have to be rediscovered.

## Where this is checked

- The whole operational side: [`../DATABASE.md`](../DATABASE.md), and
  [`../../backend/.env.example`](../../backend/.env.example) is the practical
  checklist.
- There is no `docker-compose.yml` anywhere in the repository — that absence is
  the evidence of this decision.
- The migrations were rewritten in T-SQL:
  `backend/src/main/resources/db/migration/V1` … `V6`.
- `booking/SqlServerBookingContractTest` holds the places where behaviour
  depends on SQL Server.
