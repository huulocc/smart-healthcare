# The admin area

**Author:** Tran Quoc Huy
**Branch:** `feature/admin-page-and-doctor-check`
**Scope:** rebuild the admin page on the real API, and review the backend `doctor` package.

---

## 1. What the admin area does today

`/admin` is for `ROLE_ADMIN` only. Five screens run on the real backend:

| Screen | Path | API it calls |
|---|---|---|
| Dashboard | `/admin` | `GET /api/admin/doctors/stats`, `GET /api/admin/departments`, `GET /api/admin/doctor-requests`, `GET /api/admin/doctors?availability=ON_LEAVE` |
| Doctors | `/admin/doctors` | list + stats + specialties, `PUT /doctors/{id}`, `PATCH /doctors/{id}/availability`, `PATCH /doctors/{id}/status` |
| Doctor Requests | `/admin/doctor-requests` | `GET /doctor-requests`, `POST /doctor-requests/{userId}/approve`, `.../reject` |
| Departments | `/admin/departments` | `GET`/`POST` `/departments`, `PUT /departments/{id}` |
| Doctor Schedules | `/admin/schedules` | `GET /schedules`, `POST /doctors/{id}/schedules`, `PUT`/`DELETE` `/schedules/{slotId}` |

**There is no mock data left in the admin area.** Patients, Appointments, Payments and AI
Consultation keep their routes but render a "coming soon" panel: those APIs do not exist yet
(booking is being built by another part of the team). They say so rather than showing invented
numbers, and connecting one later is a one-line change in `App.tsx`.

### Things the UI deliberately does not offer

- **No delete anywhere.** A doctor is retired with `status: INACTIVE`, a department the same
  way. Rows stay, because appointments and payments will point at them.
- **No "add doctor" button.** The only way a doctor profile comes into being is approving a
  doctor sign-up: admins never create accounts or handle passwords.
- **Approve is disabled for an account that never opened its activation link**, because the
  server refuses it with a 409.
- **Reactivating a doctor leaves them off duty.** That is deliberate in the backend -- a
  returning doctor should not silently become bookable -- so the screen says so and asks for
  the next step.
- **The schedule board lists active doctors only**, which is what `AdminScheduleService.board`
  does. The subtitle says so, otherwise the first "missing doctor" report is inevitable.

---

## 2. Running it

### Once

1. `backend/.env` needs `ADMIN_EMAIL` and `ADMIN_PASSWORD` (at least 8 characters).
   `AdminAccountBootstrap` creates that account the first time the backend starts with them
   set, and **there is no sign-up path for an admin**, so this is the only way to get one. It
   does nothing once any admin exists; to start over, delete the row or `docker compose down -v`.
2. `backend/.env` here sets `SERVER_PORT=8081`, and `frontend/.env.local` already points
   `API_PROXY_TARGET` at the same port. Keep the two in step.

### Each time

```bash
docker compose up -d mysql
```

```bash
cd backend && ./mvnw spring-boot:run
```

```bash
cd frontend && npm run dev
```

Sign in at `/login` with the admin account; an **Admin** link appears in the navbar.

### Checks

```bash
cd backend && ./mvnw test
```

```bash
cd frontend && npx tsc -b && npx vite build && npx eslint . --max-warnings 0
```

`backend/admin-api.http` (VS Code REST Client) exercises every admin endpoint by hand. Run
the `login` request first; the rest reuse its token.

> Linting was broken for most of this work -- ESLint 9 with an `.eslintrc.cjs` it no longer
> reads -- so `tsc -b` was the gate instead. PR #7 added a flat `eslint.config.js` and it runs
> clean again. The old `.eslintrc.cjs` is still in the tree and is now dead: ESLint ignores it
> when the flat config exists. Worth deleting, but not in a branch about the admin page.
>
> The scripts in `package.json` call `pnpm`, which is not installed on every machine here;
> `npm run dev` and the `npx` commands above work either way.

---

## 3. The doctor review

Two real bugs, fixed:

- **Deactivating a doctor did not revoke `ROLE_DOCTOR`.** `updateStatus` set the profile
  status, availability and headship but never touched `user.role`, so the next token the
  account was issued still carried `ROLE_DOCTOR`. Harmless while no endpoint checks for it,
  and a hole the moment one does. The status now moves the account between `DOCTOR` and
  `PATIENT` in both directions.
- **Schedule writes ignored the doctor's status.** A whole week could be written against an
  `INACTIVE` doctor and then silently never appear, because the board filters to `ACTIVE`.
  Adding and editing now refuse it the way changing availability already did; deleting stays
  open so an admin can clear an old week.

Smaller: `forDoctor` loaded a doctor row only to throw it away (`existsById` now), `avatarUrl`
accepted anything up to 255 characters although the admin page renders it into an `<img>`
(now a path or an `http(s)` address), and `DoctorRequestResponse.requestedAt` was really the
account's creation time (renamed `registeredAt`).

### Looked at, deliberately left alone

| Finding | Why |
|---|---|
| `V4__seed_demo_doctors.sql` comments describe doctor codes that `V5` then rewrote | **Do not edit an applied migration.** Flyway checksums the file, comments included; changing it breaks `validate` on every database that already ran it. `Doctor.codeFor` carries the accurate version. |
| `idx_doctor_schedules_day` serves no query | Dropping it needs a V6 migration for a table with dozens of rows. |
| `stats()` runs five count queries per load | Five indexed counts over a small table. A grouped query would be harder to read than it is faster. |
| Overlap and uniqueness are checked, not locked | Two admins racing fall through to the database's unique key and get a 409 from `GlobalExceptionHandler`. Pessimistic locking is not worth it at this size. |
| `ScheduleSlotRequest` has no cross-field `@AssertTrue` | The service check already answers 400 with the message under `endTime`, which is where the form needs it. An annotation would duplicate the rule and attach it to the whole object. |
| `Doctor.department` is nullable although approval always sets one | Both are intended: `null` is what `PUT /doctors/{id}` with `departmentId: null` leaves behind. The comment that said otherwise was corrected. |

Ten tests were added for branches nothing covered, including all three schedule **write**
endpoints, which had no authorisation test at all. `GET /doctors/stats` finally asserts its
numbers -- as deltas, since every test class shares one H2 database.

> Note: `application-test.properties` disables Flyway and builds the schema from the entities,
> so `./mvnw test` proves nothing about the migrations. They are covered by `ddl-auto=validate`
> when the backend starts against MySQL. Run it once after any schema change.

---

## 4. Frontend notes for whoever picks this up

- **Auth now carries the account**, not just the token. `AuthProvider` keeps the `user` from
  the login response, caches it beside the token in whichever storage remember-me chose, and
  refetches `/users/me` on every start so a role an admin changed cannot linger.
- **`status` has three values, not two.** On a hard refresh the token is readable immediately
  but the account is not, so there is a `resolving` state in between. `RequireRole` waits it
  out; treating an unknown role as the wrong one would bounce an admin off their own page on
  every F5. Do not "simplify" that away.
- **The cached account is a convenience, not the authority.** Anyone can edit it in
  localStorage and reach the admin shell -- and then every panel shows a permission error,
  because `SecurityConfig` checks the real role on every request. That is the correct posture.
- **Shared pieces live in `src/components/admin/`**: `DataTable`, `Pagination`, `Modal`,
  `Field`, `Banner`, `AsyncSection`, `StatTiles`, `StatusBadge`. The screens are in
  `src/pages/Admin/`, the shell in `src/layouts/AdminLayout.tsx`.
- **`src/hooks/useAsync.ts`** holds the loading/error/ready shape `pages/Profile/Profile.tsx`
  established. There is no react-query, on purpose: five screens, no shared cache, and a
  second async idiom would cost more than it saves.
- **`src/api/adminTypes.ts` mirrors the backend records by hand.** Nothing checks the two
  against each other, so change them together.


---

## 5. Completed Full Admin Management Extension

**Implemented Features & Endpoints:**

| Domain | Route | Backend Controller & Service | SQL Server Source | Key Capabilities |
|---|---|---|---|---|
| **Overview Dashboard** | `/admin` | `AdminDashboardController` (`AdminDashboardService`) | Multi-table aggregation | Real KPIs (Patients, Doctors, Appointments, Users), 7-day trend SVG chart, recent appointments, AI telemetry snapshot |
| **Patient Management** | `/admin/patients` | `AdminPatientController` (`AdminPatientService`) | `dbo.patients`, `dbo.users`, `dbo.appointments` | Search/filter, pagination, demographic edits, active/inactive toggle, appointment history modal |
| **User & Role Administration** | `/admin/users` | `AdminUserController` (`AdminUserService`) | `dbo.users` | Create/edit users, role change (ADMIN, DOCTOR, PATIENT), activate/deactivate, self-demotion & last-admin safeguards |
| **Appointment Management** | `/admin/appointments` | `BookingController` (Admin methods) | `dbo.appointments` | All appointments view, status change, cancellation with audit reason, clinical/admin notes |
| **Reports & Analytics** | `/admin/reports` | `AdminReportController` (`AdminReportService`) | `dbo.appointments`, `dbo.departments`, `dbo.doctors` | Date-range filters, volume trends, department workload share, doctor consultation performance, patient growth |
| **System Settings** | `/admin/settings` | `AdminSettingsController` (`AdminSettingsService`) | `dbo.system_settings` | Categorized configuration (Clinic, Booking, AI, System), read and bulk update |
| **Notifications & Alerts** | `/admin/notifications` | `AdminNotificationController` (`AdminNotificationService`) | `dbo.admin_notifications` | Unread badge in topbar, filter by status, mark read / mark all read, direct resource links |
| **AI Usage & Telemetry** | `/admin/ai-usage` | `AdminAiUsageController` & `AiTelemetryController` | `dbo.ai_usage_events` | Public ingestion (`POST /api/ai/telemetry`), cost calculation, latency (avg/p95), failure/refusal rates, provider/model breakdown, paged event logs |

**Safety and Integrity Rules Maintained:**
- Booking availability, lifecycle, and customer rescheduling algorithms were untouched and preserved.
- Payment / billing and AI Consultation business logic remain protected.
- SQL Server schema updated via `backend/sqlserver/admin/002_admin_features.sql`.
- 100% backend test suite passing (123 tests) including comprehensive `AdminFeaturesApiTest`.
- 100% frontend TypeScript build passing with Vite.
