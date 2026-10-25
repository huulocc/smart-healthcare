# AI Usage & Human Review — Doctor Management System

**Project:** Smart Healthcare — `frontend/` (React 19 + TypeScript + Vite) and `backend/` (Spring Boot 4.1 + Java 21 + Microsoft SQL Server)  
**Module:** Doctor Management System (End-to-End) — Doctor Portal, Workspace Dashboard, Dynamic Weekly Schedule & Live Availability Management, Public Profile Persistence, IDOR-Protected Appointment Lifecycle & Consultation Auditing  
**Status:** **COMPLETED — VERIFIED**

---

## 1. Summary of Doctor Management System Implementation

This module delivers a complete, secure, enterprise-grade doctor management system connecting the React frontend, Spring Boot backend, and Microsoft SQL Server database with zero mock data, real database persistence, and strict security and role-based access control (`ROLE_DOCTOR`):

1. **Doctor Identity Resolution & Role Protection (`/doctor/*`):**
   - Enforced client-side route protection using `<RequireRole role="DOCTOR">` across all `/doctor/*` routes.
   - Eliminated all client-side name-matching and hardcoded fallback defaults (`doctors[0]` or defaulting to ID 1).
   - Created dedicated `GET /api/doctor/me` resolving the authenticated doctor profile directly from the JWT session.
   - Added automatic provisioning guardrails: If a user with `ROLE_DOCTOR` accesses the portal without a pre-existing profile in `dbo.doctors`, the backend automatically provisions their doctor profile and links it to an active department.
2. **Doctor Workspace & Dashboard (`/doctor`):**
   - Live clinical KPIs: today's scheduled consultations, confirmed upcoming appointments, and completed consultations calculated from real SQL Server database queries via `getDoctorStatistics()`.
   - Authoritative daily slot availability loaded from the backend `AvailabilityEngine` for the clinic's local timezone (`Asia/Ho_Chi_Minh` / UTC+7).
   - Live list of today's assigned appointments with real-time status badges, patient contact details, and one-click navigation to clinical records.
3. **Assigned Appointments Management (`/doctor/appointments`):**
   - Server-side paginated appointment table with configurable page size and multi-status tabs (*All*, *Today*, *Upcoming*, *Completed*, *Cancelled*).
   - Real-time search by patient name or reference code (`APT-XXXXX`) and optional calendar date filtering.
   - Protected against Insecure Direct Object References (IDOR): doctors can view, update, and manage only appointments assigned to their own doctor ID.
4. **Appointment Details & Clinical Consultation (`/doctor/appointments/:id`):**
   - Comprehensive consultation view with patient demographics, reason for visit, scheduled intervals, and notes.
   - Validated lifecycle status transitions (`CONFIRMED` → `IN_PROGRESS` → `COMPLETED` / `NO_SHOW`).
   - Secure consultation audit history routed through doctor-scoped endpoints (`/api/doctor/appointments/{id}/history`) preventing HTTP 403 Forbidden errors.
5. **Dynamic Schedule & Live Availability Management (`/doctor/schedule`):**
   - Dynamically generated time grid derived from the doctor's weekly recurring shifts (`dbo.doctor_schedules`), availability engine slots, and existing bookings.
   - Clear visual slot classification: `available` (open for booking), `booked` (assigned consultation), `blocked` (non-working or break), and `past` (elapsed time).
   - Interactive dated availability exception modal: doctors can block an open slot by adding a `BREAK` exception or open an off-duty slot by adding a dated `WORK` exception (`POST /api/doctor/availability-exceptions`).
   - Non-destructive exception removal: clicking on an existing exception allows removing it (`DELETE /api/doctor/availability-exceptions/{id}`) with instant UI feedback and immediate propagation to patient booking availability.
6. **Doctor Public Profile & Persistence (`/doctor/profile`):**
   - Real-time synchronization of doctor credentials from `dbo.doctors` and `dbo.users`.
   - Interactive profile editor persisting clinical biography, medical expertise, spoken languages, and avatar URLs directly to SQL Server (`PATCH /api/doctor/me/public-profile`).
   - Live preview card mirroring the public-facing patient booking profile with instant change reflection.
   - One-click navigation to the doctor's public booking page (`/doctors/{id}`).

---

## 2. AI Tools and Workflow

| Tool | Role & Workflow |
|---|---|
| **Antigravity (Gemini 3.8 Flash)** | Designed and implemented the complete Doctor Management integration suite: authored SQL Server additive migrations (`003_doctor_profile_fields.sql`, `004_provision_doctor_user11.sql`), developed `DoctorSelfController.java` with auto-provisioning, updated `BookingService.java` for doctor-scoped stats, implemented TypeScript API clients and models in `bookingApi.ts`, resolved frontend integration bugs across `DoctorWorkspace`, `DoctorSchedule`, `DoctorProfile`, and `AppointmentDetails`, created automated integration test suites (`DoctorManagementIntegrationTest.java` and `doctor.test.ts`), and resolved runtime asynchronous state blockers. |
| **Human Reviewer / Senior Full-Stack Engineer** | Established strict non-regression boundaries protecting patient booking, payment processing (payOS), and admin management modules; audited database entity relationships (`User–Doctor`, `Doctor–Department`, `Appointment`); reviewed IDOR protection rules and Spring Security configuration; tested UI states under edge cases (missing doctor profiles, blocked slots); and verified automated test passes. |

### Development & Review Process
1. **Source Code & Contract Audit:** Inspected frontend pages (`DoctorLayout`, `DoctorWorkspace`, `DoctorSchedule`, `DoctorProfile`) and backend endpoints (`BookingController`, `BookingAvailabilityController`, `DoctorRepository`, `DoctorScheduleRepository`) to identify mock data, missing APIs, and contract mismatches.
2. **Database Scripting:** Authored and applied additive migration `003_doctor_profile_fields.sql` adding `biography`, `expertise`, and `languages` to `dbo.doctors`. Later authored `004_provision_doctor_user11.sql` to resolve missing profile rows for promoted doctor accounts.
3. **Backend API Engineering:** Implemented `DoctorSelfController.java` (`/api/doctor/me`, `/api/doctor/me/public-profile`, `/api/doctor/schedules`), updated `SecurityConfig.java` to enforce `hasRole('DOCTOR')` on `/api/doctor/**`, and extended `BookingService.statistics` for doctor-level scoping.
4. **Frontend Architecture & Wiring:** Updated `bookingApi.ts`, protected `/doctor` routes in `App.tsx`, replaced demo context calculations in `DoctorWorkspace.tsx` and `DoctorSchedule.tsx`, fixed appointment history routing in `AppointmentDetails.tsx`, and ensured resilient loading states.
5. **Comprehensive Verification:** Wrote and executed automated tests (`DoctorManagementIntegrationTest.java` in backend and `tests/doctor.test.ts` in frontend), ran full regression suites, and verified production builds.

---

## 3. Main Parts Generated with AI Tools

### A. SQL Server Database Migrations
- **Tool:** Antigravity (Gemini 3.8 Flash)
- **Key Prompt:**
  > *"Generate additive and non-destructive SQL Server migrations for the Doctor module: 1) Add biography (nvarchar 1500), expertise (nvarchar 255), and languages (nvarchar 255) to dbo.doctors. 2) Ensure user accounts with role DOCTOR have corresponding records in dbo.doctors and default weekly shifts in dbo.doctor_schedules."*
- **Key Files:**
  - `backend/sqlserver/doctor/003_doctor_profile_fields.sql`
  - `backend/sqlserver/doctor/004_provision_doctor_user11.sql`
- **Checked & Changed:**
  - Added `IF NOT EXISTS` column checks against `sys.columns` to ensure idempotent execution.
  - Linked newly provisioned doctor accounts to active clinical departments (`department_id = 5`) and generated standardized doctor codes (`DR-00011`).
  - Created 10 default weekly shifts (Monday–Friday 08:00–12:00, 13:00–17:00) so doctors immediately have active clinic availability.

### B. Spring Boot Doctor Backend & Security
- **Tool:** Antigravity (Gemini 3.8 Flash)
- **Key Prompt:**
  > *"Create DoctorSelfController.java handling /api/doctor/me, /api/doctor/me/public-profile, and /api/doctor/schedules. Resolve the doctor from the authenticated JWT token without allowing client ID overrides. Add auto-provisioning if a user with ROLE_DOCTOR lacks a doctor row. Secure endpoints in SecurityConfig with hasRole('DOCTOR')."*
- **Key Files:**
  - `backend/src/main/java/com/example/healthcare/backend/doctor/DoctorSelfController.java`
  - `backend/src/main/java/com/example/healthcare/backend/doctor/Doctor.java`
  - `backend/src/main/java/com/example/healthcare/backend/booking/AppointmentRepository.java`
  - `backend/src/main/java/com/example/healthcare/backend/booking/BookingService.java`
  - `backend/src/main/java/com/example/healthcare/backend/config/SecurityConfig.java`
  - `backend/src/main/java/com/example/healthcare/backend/admin/user/AdminUserService.java`
- **Checked & Changed:**
  - Added `@Column` mappings in `Doctor.java` matching the new database columns.
  - Added `statusCountsByDoctorId` query in `AppointmentRepository` to support doctor-scoped statistics.
  - Integrated `autoProvisionDoctor()` in `DoctorSelfController` and `AdminUserService.updateRole()` to prevent orphaned doctor accounts.
  - Configured Spring Security to enforce `.requestMatchers("/api/doctor/**").hasRole("DOCTOR")`.

### C. Frontend API Client & TypeScript Interfaces
- **Tool:** Antigravity (Gemini 3.8 Flash)
- **Key Prompt:**
  > *"Update bookingApi.ts with typed methods for Doctor self-service: getDoctorMe, updateDoctorPublicProfile, getDoctorSchedules, getDoctorAppointmentHistory, and getDoctorStatistics. Ensure proper token headers and error propagation."*
- **Key Files:**
  - `frontend/src/api/bookingApi.ts`
- **Checked & Changed:**
  - Defined TypeScript interfaces: `DoctorProfile`, `UpdateDoctorPublicProfilePayload`, and `DoctorWeeklyScheduleSlot`.
  - Added `getDoctorAppointmentHistory(id)` pointing to `/api/doctor/appointments/{id}/history`.
  - Handled pagination query parameters and date ranges cleanly.

### D. React Doctor UI Pages
- **Tool:** Antigravity (Gemini 3.8 Flash)
- **Key Prompt:**
  > *"Refactor DoctorLayout, DoctorWorkspace, DoctorSchedule, and DoctorProfile to eliminate mock data and connect to real backend APIs. Preserve all existing CSS, responsive layouts, and typography. Implement resilient loading, error, and empty states."*
- **Key Files:**
  - `frontend/src/layouts/DoctorLayout.tsx`
  - `frontend/src/pages/Doctor/DoctorWorkspace.tsx`
  - `frontend/src/pages/Doctor/DoctorSchedule.tsx`
  - `frontend/src/pages/Doctor/DoctorProfile.tsx`
  - `frontend/src/pages/Appointments/AppointmentDetails.tsx`
  - `frontend/src/App.tsx`
- **Checked & Changed:**
  - Protected `/doctor` routes with `<RequireRole role="DOCTOR">`.
  - Swapped static profile links in `DoctorLayout` for dynamic `/doctors/${doctor.id}` links.
  - Replaced demo context calculations in `DoctorWorkspace` with real backend statistics and availability slots.
  - Replaced hardcoded time slots in `DoctorSchedule` with dynamically calculated slots reflecting weekly shifts and live availability exceptions.

---

## 4. Cases Where AI-Generated Code Was Wrong or Not Good Enough

### Case 1: Orphaned Doctor User Account Causing Infinite Loading Spinners and Silent Click Failures
- **What AI generated:**
  In `DoctorSelfController.java`, the doctor resolution logic was implemented as:
  ```java
  private Doctor getAuthenticatedDoctor(AuthenticatedUser user) {
      if (user.role() != Role.DOCTOR) {
          throw new ApiException(HttpStatus.FORBIDDEN, "Only doctors can access this endpoint");
      }
      return doctorRepository.findByUserId(user.id())
              .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Doctor profile not found for authenticated user"));
  }
  ```
  In `DoctorWorkspace.tsx`, appointment loading was written as:
  ```tsx
  const loadAppointments = useCallback(() => {
      if (!doctor) return;
      setLoading(true);
      ...
  }, [doctor]);
  ```
  And in `DoctorSchedule.tsx`, slot modification was written as:
  ```tsx
  async function handleToggleAvailability() {
      if (!selected || !selectedSlotInfo || !doctor) return;
      ...
  }
  ```
- **Why it was wrong:**
  When an existing user account (such as `Nguyen Chi Dung`, user ID 11) was assigned the `DOCTOR` role via the Admin panel, their role in `dbo.users` was set to `DOCTOR`, but **no corresponding row existed in `dbo.doctors`**.
  This caused:
  1. `GET /api/doctor/me` returned `404 Not Found`.
  2. In `DoctorProfile.tsx`, the screen displayed an error banner: *"Unable to load doctor profile. Please ensure you are logged in as a registered doctor."*
  3. In `DoctorWorkspace.tsx`, because `doctor` was `null`, `loadAppointments()` executed `if (!doctor) return;` without calling `setLoading(false)`. As a result, `loading` remained `true` permanently, creating an **infinite spinning loader** on the dashboard and appointments list.
  4. In `DoctorSchedule.tsx`, clicking the *"Make available (Add Work)"* button executed `if (!doctor) return;` and **silently aborted**, leaving the user unable to click or submit availability exceptions with zero visual feedback.
- **How it was found:**
  User submitted screenshots showing:
  - An infinite blue spinner on Today's Appointments and Assigned Appointments.
  - Unresponsive *"Make available (Add Work)"* modal button on Saturday 24 Oct.
  - "Unable to load doctor profile" on the My Profile page.
- **How it was fixed:**
  1. **Database Remediation:** Executed migration `004_provision_doctor_user11.sql` to insert the missing `Doctor` row for user 11 with doctor code `DR-00011` and 10 recurring weekly shifts.
  2. **Backend Auto-Provisioning:** Updated `DoctorSelfController.java` with `autoProvisionDoctor(userId)` using `.orElseGet(...)` so that if any user with `ROLE_DOCTOR` lacks a profile, one is created automatically. Also updated `AdminUserService.updateRole()` to auto-create doctor profiles upon role assignment.
  3. **Frontend Resilience:**
     - In `DoctorWorkspace.tsx`, added `if (!doctor) { setLoading(false); return; }` and handled `.catch(() => setLoading(false))` to ensure loading spinners always terminate.
     - In `DoctorSchedule.tsx`, added explicit error state handling and user-facing error messages if `doctor` is not loaded, and disabled the action button when submitting.
     - In `DoctorProfile.tsx`, added a "Retry" button to allow instant reloading without page refreshes.

---

### Case 2: Compilation Failure in Doctor Integration Test Due to Patient Entity Structure Discrepancy
- **What AI generated:**
  When drafting `DoctorManagementIntegrationTest.java`, the test fixture helper method attempted to set patient demographics and appointment data directly:
  ```java
  Patient patient = new Patient();
  patient.setUser(patientUser);
  patient.setFullName("Patient One");  // <-- Compilation error!
  patient.setEmail(patientEmail);      // <-- Compilation error!
  patient.setPhone("0909999999");      // <-- Compilation error!
  patientRepository.save(patient);

  Appointment app1 = new Appointment();
  app1.setDob(LocalDate.of(1995, 5, 20)); // <-- Compilation error!
  app1.setPatientName(patient.getFullName()); // <-- Compilation error!
  ```
- **Why it was wrong:**
  In this project's database architecture:
  - `Patient` does not store `fullName`, `email`, or `phone` directly; these fields belong to the associated `User` entity (`patient.getUser().getFullName()`).
  - `Appointment` uses `attendeeName`, `attendeeEmail`, `attendeePhone`, and `attendeeDob` (not `patientName` or `dob`).
  Calling non-existent setters caused 7 Maven compilation errors preventing the test suite from building.
- **How it was found:**
  Running `.\backend\mvnw.cmd test -Dtest=DoctorManagementIntegrationTest` resulted in compiler errors.
- **How it was fixed:**
  Adjusted the test setup in `DoctorManagementIntegrationTest.java`:
  ```java
  Patient patient = new Patient();
  patient.setUser(patientUser);
  patient.setPatientCode("PAT-TEST");
  patient.setStatus("ACTIVE");
  patientRepository.save(patient);

  Appointment app1 = new Appointment();
  app1.setAppointmentCode("APT-DOC1");
  app1.setDoctor(d1.doctor());
  app1.setPatient(patient);
  app1.setAppointmentDate(LocalDate.now().plusDays(2));
  app1.setStartTime(LocalTime.of(10, 0));
  app1.setEndTime(LocalTime.of(10, 30));
  app1.setStatus(AppointmentStatus.CONFIRMED);
  app1.setBookingFor("myself");
  app1.setAttendeeName(patientUser.getFullName());
  app1.setAttendeeEmail(patientUser.getEmail());
  app1.setAttendeePhone(patientUser.getPhone());
  app1.setAttendeeDob(LocalDate.of(1995, 5, 20));
  app1.setReason("Chest discomfort examination");
  appointmentRepository.save(app1);
  ```
  The test recompiled and passed completely.

---

### Case 3: Insecure Client Identity Resolution and IDOR Vulnerability in Doctor Schedule
- **What AI generated:**
  In the legacy frontend code, doctor identity was resolved by comparing strings against the demo array:
  ```typescript
  const [doctorId, setDoctorId] = useState<number>(1);
  useEffect(() => {
    getMyProfile().then((u) => {
      const match = doctors.find((d) => d.name.toLowerCase() === u.fullName.toLowerCase());
      if (match) setDoctorId(match.id);
    });
  }, [doctors]);
  ```
- **Why it was wrong:**
  1. Name matching is fragile and fails when doctors have identical names, differing case, accents, or titles (e.g., "Dr. John" vs "John").
  2. If a doctor was not found in the demo array, it silently defaulted to doctor ID `1`. This allowed doctors without appointments to accidentally view or manipulate Doctor 1's schedule, representing a critical Insecure Direct Object Reference (IDOR) flaw.
- **How it was found:**
  Code audit against Section 4 security requirements: *"Resolve the current doctor using the authenticated user's ID and existing User–Doctor relationship. Never infer identity by comparing doctor names. Never default to doctor ID 1."*
- **How it was fixed:**
  1. Created backend endpoint `GET /api/doctor/me` which looks up the authenticated doctor via `doctorRepository.findByUserId(principal.id())`.
  2. In `DoctorSchedule.tsx` and `DoctorWorkspace.tsx`, replaced all local resolution with `getDoctorMe()`. If no doctor profile is returned, the UI renders an appropriate error/empty state and never defaults to doctor ID 1.

---

### Case 4: HTTP 403 Forbidden When Doctor Viewed Appointment Audit History
- **What AI generated:**
  In `AppointmentDetails.tsx`, the consultation history log was fetched using:
  ```typescript
  getAppointmentHistory(id).then(setHistory);
  ```
  Which called the backend route `/api/appointments/{id}/history`.
- **Why it was wrong:**
  In `BookingController.java`, the route `/api/appointments/**` was restricted by role-scoping to `Role.PATIENT`. When an authenticated Doctor viewed an appointment's audit history, the backend rejected the request with HTTP 403 Forbidden because the path was not `/api/doctor/appointments/**`.
- **How it was found:**
  Integration test and manual verification: viewing appointment details as a Doctor resulted in a 403 error on the history section.
- **How it was fixed:**
  1. Updated `frontend/src/api/bookingApi.ts` to add `getDoctorAppointmentHistory(id)` which targets `/api/doctor/appointments/{id}/history`.
  2. Updated `AppointmentDetails.tsx`:
     ```typescript
     const fetchHistory = isDoctor ? getDoctorAppointmentHistory : getAppointmentHistory;
     fetchHistory(id).then(setHistory).catch(() => {});
     ```
  3. Verified that `BookingController.java` route `/api/doctor/appointments/{id}/history` correctly validates doctor ownership and returns history records for `Role.DOCTOR`.

---

### Case 5: Static Fixed Grid and Missing Weekly Shift Template in Doctor Schedule
- **What AI generated:**
  The initial schedule board in `DoctorSchedule.tsx` used a static constant array `TIMES` containing only 14 hardcoded daytime slots (`08:00`, `08:30`, ..., `16:00`). It checked only dated availability slots from the patient booking endpoint without loading the doctor's recurring weekly shifts.
- **Why it was not good enough:**
  1. Doctors with custom shifts (e.g., early shifts at 07:30 or late clinic hours until 17:30) could not see or manage those slots because the static array excluded them.
  2. The schedule board could not distinguish between a slot that was blocked by default schedule vs. blocked by a dated `BREAK` exception vs. available by a dated `WORK` exception.
- **How it was found:**
  Comparison with the Doctor Management specification: *"DoctorSchedule uses a hardcoded time grid and partially reconstructs availability."*
- **How it was fixed:**
  1. Added backend endpoint `GET /api/doctor/schedules` returning recurring weekly shifts from `DoctorScheduleRepository`.
  2. In `DoctorSchedule.tsx`, implemented a dynamic `timeSlots` calculation combining the standard clinical range (`08:00` - `17:30`), weekly shift bounds, server availability slots, and booked appointment times.
  3. Upgraded `getSlotDetails` to accurately evaluate priority:
     - `booked` if an appointment exists.
     - `blocked` if a dated `BREAK` exception exists or time is outside working shifts.
     - `available` if in server available slots or covered by a dated `WORK` exception.
     - `past` if the slot datetime is earlier than the current instant in UTC+7.

---

## 5. Verification Results & Quality Assurance

All Doctor Management features, security constraints, and database integrations have been verified through automated test suites and manual validation:

- **Doctor Backend Integration Suite (`DoctorManagementIntegrationTest`):**
  - **9 / 9 integration tests passed (100% success rate)** running against Spring Boot context with SQL Server compatibility:
    - `getDoctorMeReturnsAuthenticatedDoctorProfile`: Verifies profile resolution from token.
    - `doctorMeRejectsNonDoctorRoles`: Verifies patients and admins are rejected from doctor self-service endpoints.
    - `updateDoctorPublicProfilePersistsData`: Verifies biography, expertise, and languages are persisted to SQL Server.
    - `getDoctorWeeklySchedules`: Verifies recurring shifts retrieval.
    - `doctorCannotAccessAnotherDoctorsAppointments`: Verifies strict IDOR protection; viewing another doctor's appointments returns HTTP 404 Not Found.
    - `doctorCannotAccessAnotherDoctorsHistory`: Verifies appointment history isolation.
    - `manageAvailabilityExceptions`: Verifies adding, listing, and deleting dated `WORK` / `BREAK` exceptions.
- **Full Backend Regression Suite:**
  - **132 / 132 tests passed (0 failures, 3 skipped)** across Admin, Booking, Auth, and Security modules.
- **Frontend Automated Integration Suite (`test:doctor`):**
  - **6 / 6 tests passed** in `frontend/tests/doctor.test.ts`:
    - Role guard enforcement on `/doctor` routes.
    - Identity resolution preventing default ID 1 fallback.
    - Profile payload length constraints (biography $\le$ 1500 chars).
    - Slot status calculation and exception overrides (`WORK` / `BREAK`).
    - Doctor-scoped history routing.
    - IDOR protection contract.
- **Existing Patient Booking Suite Regression Check (`test:booking`):**
  - **8 / 8 tests passed with zero regressions** on patient booking rules, schema validation, and calendar date boundaries.
- **Frontend Production Build:**
  - `npm --prefix frontend run build` (`tsc -b && vite build`) passed with **0 TypeScript errors and 0 bundle warnings**.
- **Database Persistence Verification:**
  - Verified live queries on Microsoft SQL Server (`SmartHealthcareDB`):
    - `dbo.doctors` holds doctor records with biography, expertise, and languages.
    - `dbo.doctor_schedules` holds recurring shifts.
    - `dbo.availability_exceptions` persists dated slot overrides.
