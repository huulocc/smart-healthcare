# AI Usage & Human Review — Appointment Booking Flow

**Project:** Smart Healthcare — `frontend/` (React 19 + TypeScript + Vite) and `backend/` (Spring Boot 4.1 + Java 21 + SQL Server)  
**Module:** Appointment Booking Flow (End-to-End) — Doctor Selection, Real Availability, Booking Submission, Immediate Confirmation, Patient/Doctor/Admin Appointment Management  
**Status:** **COMPLETED — VERIFIED**

---

## 1. Summary of Booking Flow Implementation

This module delivers a complete, production-grade appointment booking flow connecting the React frontend, Spring Boot backend, and Microsoft SQL Server database without simulated data or fake payment mocks:

1. **Doctor Discovery & Selection:** Live doctor list via `/api/doctors` and synchronized database IDs (1–5).
2. **Real Doctor Availability:** 30-minute intervals calculated by `AvailabilityEngine` using weekly recurring shifts (`doctor_schedules`), date-specific overrides (`doctor_availability_exceptions`), existing booked slots (`appointments`), and Vietnam local time (`Asia/Ho_Chi_Minh`).
3. **Appointment Booking:** Patient authentication requirement, UUID `Idempotency-Key` submission, race condition prevention via database locks and filtered unique indexes, and an **Immediate Confirmation Policy** (`CONFIRMED`, `NO_PAYMENT_COLLECTED`).
4. **Booking Confirmation Result:** Live confirmation fetched by ID, refresh-safe, showing real reference code and patient snapshot.
5. **Patient Management:** List upcoming/completed/cancelled appointments, view full details, cancel with reason, and reschedule to newly selected slots.
6. **Doctor Workspace:** Authenticated physician appointments, consultation status lifecycle (`IN_PROGRESS` → `COMPLETED`), doctor clinical notes, and availability exception management.
7. **Admin Management:** Paginated appointment search, status filters, administrative reschedule/cancel, and live appointment statistics.

---

## 2. AI Tools and Workflow

| Tool | Role & Workflow |
|---|---|
| **Codex** | Generated the initial Spring Boot backend booking skeleton, domain entities (`Appointment`, `BookingRequestKey`, `AppointmentHistory`, `AvailabilityException`), `AvailabilityEngine.java`, DTOs, and raw SQL Server migration `001_booking.sql`. |
| **Antigravity (Gemini 3.8 Flash)** | End-to-end full-stack integration: built typed REST client `bookingApi.ts`, aligned frontend Zod schemas in `bookingSchemas.ts`, wired all React pages and components, resolved SQL Server binary collation issues, fixed PowerShell verification runners, and performed automated and manual verification. |

---

## 3. Main Parts Generated with AI Tools

### A. Backend Booking Core & Database Migration
- **Tool:** Codex
- **Key Prompt:**
  > *"Implement appointment booking backend inside existing Spring Boot application on SQL Server with Java 21, Spring Data JPA, JWT auth, transactions, 30-min slots, idempotency, and SQL Server migration. Do not collect payment; provide immediate confirmation. Support WORK/BREAK/LEAVE doctor schedules."*
- **Key Files:**
  - `backend/sqlserver/booking/001_booking.sql`
  - `backend/src/main/java/com/example/healthcare/backend/booking/*`
  - `backend/src/main/resources/application-booking-sqlserver.properties`
  - `backend/src/test/java/com/example/healthcare/backend/booking/*`
- **Checked & Changed:**
  - Verified transaction boundaries and pessimistic locking to prevent double-booking.
  - Checked `AvailabilityEngine.java` for Monday=0 indexing and `Asia/Ho_Chi_Minh` timezone rules.
  - Verified filtered unique indexes (`ux_booking_doctor_live_slot`, `ux_booking_patient_live_slot`) exclude cancelled appointments.

### B. Frontend Typed API Client & Validation Schemas
- **Tool:** Antigravity (Gemini 3.8 Flash)
- **Key Prompt:**
  > *"Create typed REST client bookingApi.ts connecting to backend booking endpoints; align bookingSchemas.ts validation with backend constraints (Vietnamese phone regex, mandatory DOB within 130 years, reason up to 500 chars)."*
- **Key Files:**
  - `frontend/src/api/bookingApi.ts`
  - `frontend/src/schemas/bookingSchemas.ts`
  - `frontend/src/data/appointmentDemo.ts`
- **Checked & Changed:**
  - Synchronized TypeScript interfaces with Java backend DTOs.
  - Added Axios interceptor for JWT authentication and client-generated UUID `Idempotency-Key`.
  - Aligned Zod validation schema rules to eliminate `400 Bad Request` rejections.

### C. Booking Flow & Appointment Management UI Integration
- **Tool:** Antigravity (Gemini 3.8 Flash)
- **Key Prompt:**
  > *"Integrate Booking.tsx, BookingResult.tsx, AvailabilityPicker.tsx, Appointments.tsx, AppointmentDetails.tsx, DoctorWorkspace.tsx, DoctorSchedule.tsx, and AdminManagementPage.tsx to real backend APIs without breaking styling or non-booking features. Remove simulated payment and enforce immediate confirmation policy."*
- **Key Files:**
  - `frontend/src/components/healthcare/AvailabilityPicker.tsx`
  - `frontend/src/pages/DoctorDetails/DoctorDetails.tsx`
  - `frontend/src/pages/Booking/Booking.tsx`
  - `frontend/src/pages/Booking/BookingResult.tsx`
  - `frontend/src/pages/Appointments/Appointments.tsx`
  - `frontend/src/pages/Appointments/AppointmentDetails.tsx`
  - `frontend/src/pages/Doctor/DoctorWorkspace.tsx`
  - `frontend/src/pages/Doctor/DoctorSchedule.tsx`
  - `frontend/src/components/admin/AdminManagementPage.tsx`
  - `frontend/src/context/AppointmentContext.tsx`
- **Checked & Changed:**
  - Completely removed mock payment forms (credit card, bank transfer) and fake payment outcome dropdowns.
  - Added `excludeAppointmentId` in `AvailabilityPicker` so patients can reschedule without their current slot appearing unavailable.
  - Ensured `BookingResult` survives browser refresh by fetching live appointment data via URL parameter `:id`.
  - Replaced hardcoded doctor ID 1 with the authenticated physician's identity in `DoctorWorkspace`.

---

## 4. Cases Where AI-Generated Code Was Wrong or Not Good Enough

### Case 1: SQL Server Case-Insensitive Collation on Idempotency Key (`request_key`)
- **What AI generated:** The initial database table for idempotency keys was created with standard `varchar(64)` under the database's default collation (`SQL_Latin1_General_CP1_CI_AS`):
  ```sql
  CREATE TABLE dbo.booking_request_keys (
      id bigint IDENTITY PRIMARY KEY,
      user_id bigint NOT NULL,
      request_key varchar(64) NOT NULL,
      appointment_id bigint NOT NULL,
      created_at datetime2(6) NOT NULL,
      CONSTRAINT uk_booking_request_owner_key UNIQUE(user_id, request_key)
  );
  ```
- **Why it was wrong:** SQL Server default collation is **case-insensitive**. Idempotency tokens (UUIDs or hashed keys) require exact byte-level, case-sensitive matching. A case-insensitive comparison risks false-positive key collisions or inconsistent hash lookup.
- **How it was found:** Collation audit of SQL Server constraints revealed the column had not been assigned binary collation.
- **How it was fixed:** Scripted an explicit transactional alteration to enforce binary collation `Latin1_General_100_BIN2`:
  ```sql
  ALTER TABLE dbo.booking_request_keys DROP CONSTRAINT uk_booking_request_owner_key;
  ALTER TABLE dbo.booking_request_keys ALTER COLUMN request_key varchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL;
  ALTER TABLE dbo.booking_request_keys ADD CONSTRAINT uk_booking_request_owner_key UNIQUE(user_id, request_key);
  ```

### Case 2: Client-Side Validation Schema Mismatch With Backend Validator
- **What AI generated:** The initial frontend schema in `bookingSchemas.ts` treated `dob` and `reason` as optional:
  ```typescript
  export const patientBookingSchema = z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().regex(/^[0-9]{10,11}$/),
    dob: z.string().optional(),
    reason: z.string().optional(),
    consent: z.boolean()
  });
  ```
- **Why it was wrong:** The backend Java DTO strictly required `@NotNull @Past` for date of birth (within 130 years), `@NotBlank @Size(max=500)` for reason, and `@Pattern(regexp = "^(0|\\+84)[0-9]{9,10}$")` for Vietnamese phone numbers. Users filling the frontend form with missing DOB or reasons received unexpected `400 Bad Request` errors from the server.
- **How it was found:** Unit tests in `frontend/tests/booking.test.ts` and automated HTTP registration tests flagged form validation rejections.
- **How it was fixed:** Updated `bookingSchemas.ts` with strict Zod validation matching backend constraints:
  - Phone: `z.string().regex(/^(0|\+84)[0-9]{9,10}$/, 'Invalid Vietnamese phone number')`
  - DOB: Mandatory past date within 130 years.
  - Reason: `z.string().min(1, 'Appointment reason is required').max(500)`
  - Consent: `z.boolean().refine(val => val === true)`

### Case 3: PowerShell 5.1 Test Runner Incompatibility and Native Stderr Halts
- **What AI generated:** Test scripts (`Invoke-BookingHttpVerification.ps1`, `Invoke-BookingTests.ps1`) had `#requires -Version 7.0`, used `[Net.Http.HttpClient]` without assembly loading, and set `$ErrorActionPreference = 'Stop'` around native commands.
- **Why it was wrong:** Standard Windows environments run PowerShell 5.1, where `#requires -Version 7.0` aborts immediately, `[Net.Http.HttpClient]` requires `Add-Type -AssemblyName System.Net.Http`, and Java/Mockito stderr warnings trigger `NativeCommandError` even when the build passes with exit code 0.
- **How it was found:** Initial test run on Windows PowerShell failed.
- **How it was fixed:** Lowered requirement to `#requires -Version 5.1`, added `Add-Type -AssemblyName System.Net.Http`, and wrapped native Maven executions via `cmd.exe /c` checking `$LASTEXITCODE`.

---

## 5. Verification Results

- **Backend H2 Suite:** 101 / 104 passed (3 contract tests skipped for SQL Server).
- **SQL Server Contract Tests:** 27 / 27 passed (`BookingFlowTest`, `SqlServerBookingContractTest`).
- **End-to-End HTTP Verification:** 59 / 59 checks passed on port 18081 against live SQL Server.
- **Frontend Unit Tests:** 8 / 8 passed (`npm run test:booking`).
- **Frontend Production Build:** 0 errors (`tsc -b && vite build`).
