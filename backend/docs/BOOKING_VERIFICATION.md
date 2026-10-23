# Booking backend delivery and verification

**COMPLETED — VERIFIED** for the backend, on 21 October 2026 (Asia/Ho_Chi_Minh). Production rollout and frontend wiring are outside the performed changes; the original frontend remains in demo mode as requested.

## Delivered

- Real weekly/daily availability with 30-minute slots, WORK/BREAK/LEAVE precedence, the existing Monday=0 storage, doctor status, existing appointment intervals, Vietnam time, and a 30-calendar-day booking window.
- Authenticated self/dependent booking, validated attendee snapshots and consent timestamp, safe lazy patient provisioning, unique appointment codes, immediate CONFIRMED status, and complete confirmation data without collecting or fabricating payments.
- Patient lists/details/history/cancellation/rescheduling; assigned-doctor lists/daily schedules/details/start/complete/no-show/notes/exceptions; admin search, filters, pagination, details, counts and management operations.
- Database transactions, doctor/account/appointment locks, body-bound persistent idempotency, ownership and current-role checks, safe problem responses, eager fetching for paginated detail DTOs, and an adapter protecting the existing weekly schedule and doctor availability/status writers.
- A separately reviewed SQL Server migration; an opt-in production DDL-safe profile; automated domain/API/concurrency/SQL-contract tests; reproducible database initialization, test and real HTTP scripts.

All new project files are enumerated, one per line, in [booking-new-files.txt](booking-new-files.txt). No original source, frontend, configuration, POM or SQL export was edited. See [BOOKING_BACKEND.md](BOOKING_BACKEND.md) for the full endpoint/permission table, payloads, lifecycle, migration instructions and integration contract. Machine-readable results are in [booking-verification-results.json](booking-verification-results.json).

## Final automated results

| Check | Environment | Passed | Failed/errors | Skipped | Blocked |
|---|---|---:|---:|---:|---:|
| Existing regression suite | H2, before implementation, driver overridden | 71 | 0 | 0 | 0 |
| Entire final suite | Java 21, H2; 104 discovered | 101 | 0 | 3 | 0 |
| Booking flow/concurrency tests | Java 21, real SQL Server | 24 | 0 | 0 | 0 |
| SQL Server contract tests | Real SQL Server, DDL disabled | 3 | 0 | 0 | 0 |
| Packaged application build | Java 21 / existing Maven POM | Passed | 0 | 0 | 0 |

The 71 existing regression tests are included in the 101 final H2 passes. The three H2 skips are explicitly SQL-only tests; all three passed on SQL Server. The 24 booking tests are executed on both databases. The six pure domain tests cover interval boundaries, breaks/leave, adjacent work/gaps, exact-now/Vietnam midnight, cancelled occupancy and terminal transitions. No SQL compatibility result is inferred from H2.

The final reproducibility runner was executed against the newly initialized `SmartHealthcareBookingTest_repro47`, with Java **21.0.12.1+1**, Spring Boot **4.1.0**, SQL Server **17.0.1000.7 Standard Developer Edition**, and Hibernate DDL **none** for SQL Server. It completed both suites successfully. The application's Java compilation target remains 21; the existing POM was untouched.

Coverage includes validation, authenticated login/booking/retrieval, attendee Unicode persistence, missing/inactive patients, all doctor availability flags, past/misaligned/out-of-window starts, legacy long appointment overlaps, failed-transaction rollback, key replay/mismatch/cancellation replay, history, cancellation/rebook, reschedule release/rollback, role revocation, wrong-owner/wrong-doctor access, pagination/search, start/complete/no-show timing, notes and terminal rejection, exception ownership/rollback, weekly schedule and doctor status conflicts, and concurrent create/idempotency/cancel/reschedule/schedule-change races.

The first unmodified regression invocation failed because its H2 profile inherited the original SQL Server driver. The runner supplies `-Dspring.datasource.driver-class-name=org.h2.Driver`; no existing configuration was changed. Real SQL Server testing then exposed a TIME-versus-DATETIME comparison failure in the new upcoming filter. It was fixed using a typed TIME literal, and the affected suites were rerun successfully.

## Real HTTP verification

**59 checks passed, zero failed/blocked**, against the final packaged application and the fresh SQL Server database. Requests were sent through a real HTTP client to a running embedded server, rather than MockMvc. The runner built the final JAR, started the server, restarted it, checked persisted state and stopped its own processes.

| Required scenario | Result |
|---|---|
| Login → real availability → booking → SQL attendee verification | Passed |
| Duplicate key/body and changed-payload key reuse | Passed: same ID / 409 |
| Duplicate slot and simultaneous different-owner booking | Passed: one 201, one 409; SQL confirmed one live row |
| Cancel → released availability → rebook | Passed; original cancellation retained |
| Reschedule → old slot free / new slot reserved / history | Passed |
| Patient list and details; doctor daily schedule/details | Passed |
| Doctor exceptions, leave rejection, start/complete/notes | Passed |
| Admin filtered/paginated list, statistics, reschedule/cancel | Passed |
| Missing/invalid JWT, patient role escalation, wrong owner/doctor | Passed: 401 / 403 / 404 |
| Invalid consent, early start, terminal transition | Passed: 400 / 409 |
| Application restart and persisted status/notes | Passed |

Synthetic accounts were activated only in the isolated database. For real HTTP consultation lifecycle checks, an isolated synthetic booking was moved into the current interval; no production appointment or clock was changed. The initial runner's SQL fixture update required the filtered-index session SET options. Those options were added to the new runner and it was rerun; both subsequent full HTTP runs passed, including the final rebuilt artifact.

## Database, concurrency and preservation evidence

- The initializer was actually executed and applied the migration twice to a new database. A later rerun with populated tables preserved row counts and aggregate row checksums across **all 12 tables**. The migration contains no data DELETE, TRUNCATE or UPDATE.
- SQL contract tests checked the actual SQL Server product/database, both enabled filtered unique indexes, removal of the two old unconditional slot keys, the trusted IN_PROGRESS-compatible status check, and binary case-sensitive idempotency-key collation.
- Direct SQL duplicate live-slot insertion was rejected; a cancelled history row at the same slot was accepted in a rolled-back test; an invalid PAID appointment status was rejected.
- Concurrency tests used independently committed transactions on separate connections with a start barrier. They verified one winner for competing slot/reschedule requests, one result for the same key, and consistency for cancellation and schedule edits. The HTTP race independently confirmed the stored live-row count.
- SHA-256 comparison against the initial snapshot found **0 modified or deleted files among 287 pre-existing non-generated project files**, including untracked `full.sql` and the ignored `.env`. Existing edits in `backend/pom.xml`, `backend/src/main/resources/application.properties`, `frontend/package-lock.json`, and `rag/.gitignore` were preserved byte for byte. Original untracked files were retained.
- Maven regenerated ignored `backend/target` build/test outputs; generated outputs, dependency caches and Git internals are excluded from source-file preservation checks. No frontend task was run, and no payment implementation was added.
- The original `SmartHealthcareDB` received no booking migration, test rows or application startup from this work. Read-only server discovery used the existing local SQL Server. Only `SmartHealthcareBookingTest_47d16bcd` and `SmartHealthcareBookingTest_repro47` received synthetic test data; both are retained. All launched application processes were stopped.

Final raw evidence locations on this machine:

- Initial hashes and investigative/build logs: `C:\Users\ADMIN\.codex\booking-audit-47d16bcd`
- Final automatic runner: `C:\Users\ADMIN\AppData\Local\Temp\booking-tests-32c4083763e04b6d96e5abf854b8961d`
- Final HTTP results/server logs: `C:\Users\ADMIN\AppData\Local\Temp\booking-http-89073d51c9134f36bc9ed40c4bb6f2f4`

Raw authentication test logs can contain synthetic JWTs or activation links and are not copied into project documentation. The project JSON evidence contains check names and outcomes only.

## Operational limits and next integration work

The reviewed migration must be applied to the intended database and the `booking-sqlserver` profile enabled before rollout. The production database was deliberately not migrated. Existing MySQL Flyway files and original configuration remain unchanged.

Frontend integration remains necessary: replace in-memory fixtures/context mutations and hard-coded physician IDs with these endpoints; use server slots and ownership; keep retry keys stable; align DOB/reason/phone/window validation; include NO_SHOW/legacy PENDING; and replace simulated payment/PAID UI with immediate confirmation. Real rooms/prices/ratings/biographies require future data sources. The backend creates no payment records.

Idempotent replay returns the current appointment, rather than an immutable copy of its original HTTP response. One account cannot hold overlapping bookings, including different dependents, consistent with the existing patient-slot model. Dated WORK adds coverage but does not override leave/break. Existing legacy schedule foreign keys can prevent deleting referenced weekly rows; edits and dated exceptions remain available. Direct SQL/external writers must follow the application's lock protocol. These are documented policies and integration limits, not unexecuted test claims.
