# Appointment booking backend

Implemented inside the existing Spring Boot application, using its Java 21 target, Spring Data JPA, JWT principal, repositories, transactions and problem-details response convention. No dependency or original configuration changes are required. No payment integration, transaction records, payment completion flags, prices or receipts are created.

## Setup on SQL Server

1. Stop application writers and back up the intended database.
2. Review and manually apply `backend/sqlserver/booking/001_booking.sql` **in that database**, for example `sqlcmd -S <server> -E -C -b -d <database> -i backend/sqlserver/booking/001_booking.sql` from the repository root.
3. Start the existing application with `--spring.profiles.active=booking-sqlserver` and its normal database/JWT environment. If using other profiles, include `booking-sqlserver` last. This additive profile sets Hibernate DDL to `none` and keeps Flyway disabled. Keep schema writers stopped until the migration commits.

Do not enable the existing MySQL Flyway migrations on SQL Server. Do not execute the original `full.sql` against an existing database. The booking migration is transactional and rerunnable. It is **not automatically executed** on startup. Without it the existing unconditional unique constraints still prevent cancelled-slot reuse, and the old status check rejects `IN_PROGRESS`.

The script adds nullable attendee/consent columns to `appointments`, and creates `booking_request_keys`, `appointment_history`, and `doctor_availability_exceptions` with foreign keys and supporting indexes. It replaces the original two unconditional slot constraints with filtered unique indexes covering every status except `CANCELLED`, and replaces the exported status check while retaining legacy `PENDING`. It neither deletes nor rewrites appointment rows. Existing attendee data is not fabricated: old appointments return account contact details as a fallback, with null `bookingFor`/`consentAt` where absent.

The opt-in profile matters because the original application defaults to `ddl-auto=update`. Production schema management should use the reviewed SQL script with Hibernate DDL disabled.

## Endpoints and permissions

All endpoints require the existing `Authorization: Bearer <JWT>` header. Doctor browsing is authenticated, consistent with the original security chain. New services additionally verify the current database role and activation state, so a revoked role cannot retain access with an older JWT.

| Method | Path | Permission / result |
|---|---|---|
| GET | `/api/booking/doctors` | Any activated user; paginated active doctors, `departmentId`, `search`, `page`, `size` |
| GET | `/api/booking/doctors/{id}` | Any activated user; safe clinical profile, without doctor's private email/phone |
| GET | `/api/booking/doctors/{id}/availability` | Any activated user; `from`, `to`, timezone and available slots |
| POST | `/api/appointments` | PATIENT; requires `Idempotency-Key`; returns 201 confirmation |
| GET | `/api/appointments` | PATIENT; only appointments owned by the authenticated account |
| GET | `/api/doctor/appointments` | DOCTOR; only appointments assigned to the authenticated doctor; `from=to` gives a daily schedule |
| GET | `/api/admin/appointments` | ADMIN; all matching appointments |
| GET | `<appointments>/{id}` | Corresponding role and resource ownership; appointment detail |
| GET | `<appointments>/{id}/history` | Same scope; paginated chronological snapshots |
| POST | `<appointments>/{id}/cancel` | Same scope; eligible future appointment, reason required |
| POST | `<appointments>/{id}/reschedule` | Same scope; eligible future confirmed appointment, same doctor |
| PATCH | `/api/doctor/appointments/{id}/status` or `/api/admin/appointments/{id}/status` | Assigned doctor or admin; legal lifecycle transition |
| PATCH | `/api/doctor/appointments/{id}/notes` or `/api/admin/appointments/{id}/notes` | Assigned doctor or admin; in-progress/completed notes, history retained |
| GET | `/api/admin/appointments/statistics` | ADMIN; global counts by status |
| GET / POST | `/api/doctor/availability-exceptions` | DOCTOR; own dated WORK/BREAK/LEAVE intervals |
| DELETE | `/api/doctor/availability-exceptions/{id}` | DOCTOR; own exception, cannot strand a booking |
| GET / POST | `/api/admin/doctors/{doctorId}/availability-exceptions` | ADMIN; doctor's dated exceptions |
| DELETE | `/api/admin/availability-exceptions/{id}` | ADMIN; remove exception if bookings remain covered |

`<appointments>` is the appropriate one of `/api/appointments`, `/api/doctor/appointments`, `/api/admin/appointments`. Patient status/note changes and doctor/admin appointment creation are rejected. Admin operations must use the admin paths. Existing admin doctor and weekly schedule endpoints are reused, with an additive transaction adapter rather than duplicate implementations.

Appointment lists accept `status`, inclusive `from`/`to`, `view=ALL|UPCOMING|HISTORY`, `patientId` (clinical patient record ID), `doctorId`, `departmentId`, `search`, `page` and `size`. Ownership is always combined with filters; a supplied identifier never expands access. Search matches code, attendee name or owner name as a literal substring. Pagination defaults to 20 and caps at 100, ordered by date/time/id. Details for another owner's/doctor's resource return 404. `UPCOMING` includes future pending/confirmed visits and consultations currently marked `IN_PROGRESS`; `HISTORY` is the complement. Statistics are global, independent of list filters.

## Payloads

Create a booking:

```http
POST /api/appointments
Authorization: Bearer <patient-token>
Idempotency-Key: <fresh-client-uuid>
Content-Type: application/json

{
  "doctorId": 1,
  "date": "2026-10-22",
  "startTime": "09:00",
  "bookingFor": "someone",
  "patientName": "Nguyễn Test",
  "email": "attendee@example.com",
  "phone": "0901234567",
  "dob": "2000-01-02",
  "reason": "Consultation",
  "consent": true
}
```

Use a current available date/doctor rather than the illustrative IDs/date. `bookingFor` is `myself` or `someone`. Both use the authenticated account's clinical patient record as the owner; attendee information is an immutable booking snapshot and never overwrites account contact data. The patient record is created lazily and atomically on the first successful booking, under the account row lock. Registration itself is unchanged. Inactive clinical patient records cannot create bookings.

Name is trimmed, 2–100 characters. Email is required and limited to 254. Phone follows the existing Vietnamese pattern `(0|+84)` followed by 9–10 digits. DOB is required, no later than today in Vietnam and no earlier than 130 years ago. Reason is required, nonblank and at most 500 characters. Consent must be explicitly true; its receipt instant is stored. This is stricter than the current demo form, which allows optional DOB/reason and more international phone formats.

Responses include numeric `id`, unique `appointmentCode`, `patientId`, a safe `doctor` summary, local `date/startTime/endTime`, explicit `startsAt/endsAt` offsets, attendee fields, reason, notes, status, cancellation reason, timestamps, and `paymentPolicy: "NO_PAYMENT_COLLECTED"`. All valid new bookings are immediately `CONFIRMED`. No `PAID` state or fake payment is emitted.

Other bodies:

```json
{"date":"2026-10-23","startTime":"10:00"}
```

for rescheduling;

```json
{"reason":"Unable to attend"}
```

for cancellation;

```json
{"status":"IN_PROGRESS","notes":"Consultation started"}
```

for a status change;

```json
{"notes":"Follow-up documented"}
```

for notes; and

```json
{"date":"2026-10-23","startTime":"10:00","endTime":"11:00","shiftType":"LEAVE"}
```

for an availability exception. Exceptions must start in the future and end later within the same calendar day. GET exceptions accepts `from`/`to` within the booking window.

## Availability and lifecycle

Timezone is always `Asia/Ho_Chi_Minh`. The booking window is exactly **30 local calendar dates: today through today + 29**, inclusive. Starts must be strictly after now, with zero seconds/fractions, on `:00` or `:30`. Slots last 30 minutes and must be completely covered by work. Shifts do not cross midnight; existing SQL times cannot express 24:00. Touching intervals are allowed; partial overlap is blocked.

Weekly day storage is Java's ordinal: Monday=0 through Sunday=6. WORK intervals supply coverage; any intersecting BREAK or LEAVE blocks a slot. Dated WORK adds coverage but cannot override a recurring/daily BREAK or LEAVE. ACTIVE doctors with AVAILABLE or IN_CONSULTATION flags can accept future bookings. INACTIVE, OFF_DUTY and ON_LEAVE doctors cannot. All non-cancelled appointment intervals, including legacy appointments longer than 30 minutes, occupy their time.

| Current status | Allowed next statuses |
|---|---|
| PENDING (legacy only) | CONFIRMED; CANCELLED through cancellation endpoint |
| CONFIRMED | IN_PROGRESS; NO_SHOW; CANCELLED through cancellation endpoint |
| IN_PROGRESS | COMPLETED |
| COMPLETED / CANCELLED / NO_SHOW | None |

Cancellation and rescheduling require a future start; rescheduling additionally requires CONFIRMED. Consultations can start only inside their scheduled half-open interval. NO_SHOW requires that interval to have ended. Notes can be updated during/after a consultation, with before/after history. Terminal appointments cannot be reopened. Cancellation and rescheduling retain the same appointment row and append history; rescheduling releases the old slot atomically and clears a legacy schedule FK. Cancelled records never disappear.

## Concurrency and errors

Every appointment mutation uses one database transaction and a fixed pessimistic lock order: doctor row, booking owner's user row, then appointment row. Missing patient creation is serialized by the owner row; availability and ownership are rechecked after locks. Owner locking also prevents an account from holding overlapping appointments across different doctors, including bookings for different attendees. Filtered unique indexes independently reject equal live doctor/patient slot keys. Different-start partial overlaps are protected by interval revalidation under the doctor/account locks.

The idempotency key is case-sensitive, scoped to the account, and accepts 8–80 ASCII letters/digits/underscores/hyphens. A length-prefixed normalized request is SHA-256 hashed. Same key/body returns the same appointment's **current** representation (including later cancellation/rescheduling); a changed body returns 409. Failed transactions leave no key or partial patient/appointment/history writes. Retry transient failures with the same key; no partial transaction is automatically replayed. Appointment codes have a database unique constraint; a rare random-code collision rolls back rather than silently accepting a duplicate.

The new adapter wraps existing weekly schedule mutations and doctor status/availability changes in the same doctor lock. It refreshes a weekly row after waiting for that lock and rejects changes that would invalidate current/future bookings, including legacy bookings beyond the normal 30-day window. Dated exception changes use the same protection. Cancel/reschedule affected visits before removing their work coverage or making the doctor unavailable. These guarantees apply to application service paths; direct SQL or external schedule writers must follow the same locking protocol.

400 means invalid input; 401 means missing/invalid JWT; 403 means forbidden role or inactive account/patient; 404 means absent or inaccessible resource; 409 means unavailable slot, duplicate-key payload, illegal transition, schedule conflict or a translated lock conflict. Unexpected booking errors return a generic 500. Existing Spring Security supplies bare 401/403 responses; controller errors use the existing problem-details shape. SQL/internal exception text is not sent to patients.

SQL Server filtered-index behavior and required session SET options follow [Microsoft's filtered index documentation](https://learn.microsoft.com/en-us/sql/relational-databases/indexes/create-filtered-indexes?view=sql-server-ver17). Locking follows the [SQL Server transaction locking model](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-transaction-locking-and-row-versioning-guide?view=sql-server-2017). A real SQL Server test caught and fixed the driver's legacy TIME/DATETIME comparison issue; the upcoming filter uses a typed TIME literal.

## Reproducible verification

Requirements: Java 21, PowerShell 7, Maven wrapper network/cache, a running SQL Server, `sqlcmd`, Windows permission to create an isolated database, and application database credentials able to use it. The scripts create unique temporary evidence directories, never reuse an existing database for initialization, never drop databases, and never print credentials. Synthetic data and isolated databases are retained for inspection.

From the repository root:

```powershell
./backend/tools/booking/Initialize-BookingTestDatabase.ps1 -Database SmartHealthcareBookingTest_myRun -SqlServer '.\CHIDUNG'
./backend/tools/booking/Invoke-BookingTests.ps1 -JavaHome 'C:\path\to\jdk21' -Database SmartHealthcareBookingTest_myRun
./backend/tools/booking/Invoke-BookingHttpVerification.ps1 -JavaHome 'C:\path\to\jdk21' -Database SmartHealthcareBookingTest_myRun -SqlServer '.\CHIDUNG'
```

Use `-JdbcHost` for a different JDBC server/port; initialization and HTTP fixture SQL use `-SqlServer`. Test credentials can be supplied through `SPRING_DATASOURCE_USERNAME`/`SPRING_DATASOURCE_PASSWORD`; the automated runner otherwise reads DB_USERNAME/DB_PASSWORD from the existing local `.env` without printing them. HTTP uses the application's normal credentials. `Initialize` reads only the table schema section of `full.sql` into a new temporary file; its original CREATE DATABASE/USE/disk-path/principal statements are excluded. It applies the booking migration twice.

`Invoke-BookingTests` first runs the whole suite with the H2 driver override, then runs booking and SQL contract tests against SQL Server with `ddl-auto=none`. SQL contract tests explicitly reject H2 and require a database named `SmartHealthcareBookingTest_*`. Run `BookingFlowTest` before `SqlServerBookingContractTest` (the runner uses alphabetical order), because the raw SQL checks use the flow's synthetic rows. Omitting `-Database` marks SQL verification BLOCKED; H2 success alone is insufficient.

The HTTP runner builds the existing app, starts a hidden Java process on port 18081, sends real requests, seeds only its isolated synthetic fixtures, restarts the app, verifies persistence, and stops both process instances. It activates test accounts directly rather than sending mail. A lifecycle fixture is moved into the current interval in the isolated DB so start/complete can be tested without waiting a day; this runner should run before 23:30 Vietnam time. It does not change production data or authentication code.

## Frontend integration still required

The frontend is unchanged and still uses `AppointmentContext`/`appointmentDemo` fixtures, sample IDs, in-memory availability and simulated payments. It does not yet call this backend. Integrate the authenticated doctor and availability endpoints, replace context mutations with these APIs, map numeric IDs and doctor summary fields, and render server-side validation/conflicts. Save one idempotency UUID per submission and reuse it for retries; mint a new key after changing booking details. Re-fetch availability after a 409 or mutation.

Align the picker with today through +29, use server-provided offsets, require DOB/reason and the existing Vietnamese phone format, and support NO_SHOW/legacy PENDING in management views. Replace hard-coded doctor ID 1 with the authenticated physician's data; ownership is enforced by the server. Remove the demo payment step and fake PAID states when integrating the immediate-confirmation policy. No medical room, fee, rating, biography or payment facts are invented by this module; those require real data sources later.

The verification report and complete new-file manifest are in `BOOKING_VERIFICATION.md` and `booking-new-files.txt` alongside this document.
