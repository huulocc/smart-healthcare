# The database: SQL Server

This explains how the backend talks to SQL Server, what had to change when it
moved off MySQL, and the decisions that were made along the way — including the
ones that could reasonably have gone the other way.

For the day-to-day settings themselves, see [`backend/.env.example`](../backend/.env.example);
it is the operational checklist and this file is the reasoning behind it.

---

## 1. Where the database lives

A **SQL Server instance installed on the developer's machine**. Not a container.

That is a decision, and the alternative was a `mcr.microsoft.com/mssql/server`
service in `docker-compose.yml`, which is where MySQL used to live. Three things
pointed away from it:

- The data arrives as a `.bak` file restored into a local instance. That is how
  the team's database got here, and a container would start empty and have a
  separate life from the file everyone is actually passing around.
- The SQL Server image has no equivalent of MySQL's `MYSQL_DATABASE`, so the
  compose file would need a second init service that waits for a healthcheck and
  runs `CREATE DATABASE` through `sqlcmd` before Flyway can connect. That is a
  known pattern, but it is machinery.
- Both would want port 1433, so running the container and the installed instance
  at the same time means one of them has to move.

So `docker-compose.yml` was **deleted** rather than converted. It held nothing but
the MySQL service, and a compose file that starts the wrong database is worse than
no compose file. Anyone who wants the container route has the two requirements
above written down to start from.

## 2. What the port actually required

Three layers were tied to MySQL, and all three changed.

**Driver and Flyway.** `com.mysql:mysql-connector-j` became
`com.microsoft.sqlserver:mssql-jdbc`, and `flyway-mysql` became
`flyway-sqlserver` — Flyway 10 and later ship one module per database and
`flyway-core` contains neither. Spring Boot's dependency management pins both
versions, so neither needed one written out.

**The connection.** `spring.datasource.url` is now a single `DB_URL` rather than
the `DB_HOST`/`DB_PORT`/`DB_NAME` pieces it used to assemble, because SQL Server
addresses a default instance by port and a named instance by instance name, and
those two shapes do not fit one template. It also carries
`encrypt=true;trustServerCertificate=true`: the driver encrypts by default from
version 10 on, a local instance presents a certificate nothing trusts, and
without the second half the handshake simply fails.

**The migrations.** All five were rewritten in T-SQL. The mechanical part was
what you would expect — `AUTO_INCREMENT` to `IDENTITY(1,1)`, backticks to
brackets, `ENGINE=InnoDB` gone, `NOW(6)` to `SYSDATETIMEOFFSET()`, `b'1'` to `1`,
and `LPAD(id, GREATEST(5, CHAR_LENGTH(id)), '0')` to `FORMAT(id, 'D5')`, which is
Java's `%05d` exactly because it pads to five digits and widens past them instead
of truncating.

The part that was not mechanical is in the next two sections.

## 3. Column types are not a free choice

`spring.jpa.hibernate.ddl-auto=validate` compares every column against what
Hibernate's `SQLServerDialect` would have generated for the same entity, and
refuses to start the application when one disagrees. So the types in the
migrations were **read off a schema Hibernate generated for that dialect**, not
translated by hand. Two of them are not what a careful hand translation gives:

| Entity | MySQL had | SQL Server needs | Why |
|---|---|---|---|
| `Instant` | `datetime(6)` | `datetimeoffset(7)` | Hibernate maps `Instant` through `TIMESTAMP_UTC`, which this dialect renders as `datetimeoffset`. A `datetime2` column reports a different JDBC type code and the application will not start. |
| `@Enumerated(ORDINAL)` | `tinyint` | `smallint` | The dialect renders an ordinal enum as `smallint`. SQL Server's `tinyint` is unsigned 0–255 and holds `day_of_week` fine, and `validate` happens to accept it because both report the same type code — but then a restored database and a fresh one are subtly different schemas. |

`@Enumerated(STRING)` columns changed shape rather than type: MySQL stored them
as native `enum('A','B')` because that is what Hibernate generates there, and SQL
Server has no enum type, so they are `varchar(20)` with the permitted values
spelled out in a named `CHECK`.

The `CHECK` and `DEFAULT` constraints are named on purpose. Left unnamed, SQL
Server invents something like `DF__password___used___66603565`, which differs in
every database — and a later migration then has no name to drop. That is not
hypothetical: it is exactly what blocked V6 on the first attempt, and why V6 has
to look one up through `sys.default_constraints`.

## 4. The circular foreign key, which turned out to be fine

`departments.head_doctor_id → doctors(id) ON DELETE SET NULL` and
`doctors.department_id → departments(id) ON DELETE SET NULL` form a cycle. SQL
Server is widely expected to reject the second one with *"may cause cycles or
multiple cascade paths"*, and the plan was to weaken one side to
`ON DELETE NO ACTION` and document a behaviour change.

**It does not reject it, and no delete rule was changed.** The reason is worth
keeping: that check only follows actions which cause *further deletes*. `SET NULL`
writes a NULL and stops, so neither key can re-enter the other table and there is
no cycle to find.

This was verified rather than assumed — both keys created on SQL Server 2025,
then a user deleted:

- the doctor row cascaded away (`fk_doctors_user`),
- its shifts cascaded away after it (`fk_doctor_schedules_doctor`),
- the department survived with `head_doctor_id` cleared.

Which is what MySQL did. **Deletes behave the same on both databases.**

## 5. Flyway baselines at V5

`spring.flyway.baseline-version` is **5**, where it used to be 1.

The database restored from the team's `.bak` already contains everything V1–V5
produce: the five departments, the five demo doctors with their shifts, and codes
already aligned to ids (`DR-00001`…`DR-00005`, which is exactly V5's output). It
also contains real registered accounts and `patients` / `appointments` /
`medical_records` — tables belonging to a teammate's work that has not been merged
into `main`. Replaying the migrations over that was not possible, and emptying the
database to run them cleanly would have destroyed someone else's work.

So Flyway records V1–V5 as the baseline and starts at V6.

### What V6 is for

A baseline *claims* the schema is as if V1–V5 had run. That claim is only honest
if the differences are closed, and three were real:

| Difference | Severity |
|---|---|
| `used_at` was `datetime2` on both token tables, while every other `Instant` column was `datetimeoffset` | **Breaking.** `validate` compares type codes; the application would not have started. |
| `day_of_week` was `tinyint`, not `smallint` | Cosmetic, but it would have left two different schemas in circulation. |
| `created_at` / `updated_at` / `expires_at` were nullable, though the entities are not | Not breaking — `validate` does not check nullability — but the database would have accepted a row the application cannot read back. |

Every statement in V6 is written to be a no-op where V1–V5 did run, so a fresh
database and a baselined one converge instead of drifting further apart. That was
checked, not hoped for: V1–V6 were run on an empty database, V6 alone on a
restore of the team's database, and the two schemas diffed column by column. They
are identical, and the restored copy kept all of its rows — including the
teammate's tables.

Converting `datetime2` to `datetimeoffset` assumes the old values were UTC. They
were: the rows that have a `used_at` sit minutes after a `created_at` recorded as
`+00:00`, and the application writes `Instant`, never local time. The three
existing values still mean the same moment afterwards.

### The cost of baselining

A non-empty database that is **not** the team's one — a half-built experiment
holding only V1's tables, say — will also be marked "V1–V5 already applied" and
silently skip them. There is no way for Flyway to tell the difference. Drop such a
database and let the migrations build it from empty.

## 6. Tests still do not run the migrations

`backend/src/test/resources/application-test.properties` keeps
`spring.flyway.enabled=false` and builds the schema from the entities with
`ddl-auto=create-drop`, so the suite runs with no database installed. The
migrations are more SQL Server-specific than the MySQL ones were —
`IDENTITY(1,1)`, `datetimeoffset`, bracket quoting, `FORMAT(id, 'D5')`, and V6's
lookup through `sys.default_constraints` — and H2's `MSSQLServer` mode imitates
the grammar, not the catalog views.

H2's compatibility mode did follow the application from `MODE=MySQL` to
`MODE=MSSQLServer`. It buys one thing: a query that only parses because of
MySQL's grammar now fails in the tests, instead of passing there and failing in
front of SQL Server.

**The migrations are covered by `ddl-auto=validate` at start-up, and nothing
else.** Turning `validate` off would leave them untested. Don't.

## 7. Things left as they are

- The enum `CHECK` constraints in the restored database still carry SQL Server's
  generated names (`CK__doctors__status__00200768`) where the migrations name
  theirs (`ck_doctors_status`). `validate` does not look at constraint names, and
  renaming them is churn with no reader.
- Primary keys in the restored database are `PK__users__3213E83F93D44A6F` and
  friends, because Hibernate's generated DDL writes `primary key (id)` without a
  name. The migrations name theirs `pk_users`. Same reasoning.
- `doctor_code` and `dept_code` are still computed in Java. SQL Server *would*
  take a `PERSISTED` computed column over the identity column — the thing MySQL
  refused over `AUTO_INCREMENT`, and the old comments in `Doctor` and `Department`
  gave that refusal as the reason. It is no longer the reason: the codes are also
  written by the V3/V4 seeds and rewritten by V5, so one Java definition keeps
  those in step. Moving them into the schema is a design change, not a port.
