# Healthcare UI demo

Implements the frontend scope of `SMART_HEALTHCARE_UI_SPECS.md` v1.0.

## Run

From `frontend/`:

```sh
npm run dev
npm run build
npm run lint
npm run test:booking
```

## Screens

- `/departments/:id`: department description and related doctors, using the shared doctor card.
- `/doctors/:id`: public doctor profile, availability preview, demo pricing, booking links.
- `/book/:id` → `/book/:id/details` → `/book/:id/payment`: guest demo booking, validated patient information, deposit simulation.
- `/booking/result/:id`: success, pending, failed, cancelled, or expired result.
- `/my-appointments`: only bookings created in the current app session.
- `/appointments/:id`: patient appointment details, cancellation and rescheduling.
- `/doctor`: dashboard for the explicitly labeled doctor fixture, Dr. Sarah Jenkins (doctor 1).
- `/doctor/appointments`, `/doctor/appointments/:id`: scoped appointment list and consultation status updates.
- `/doctor/schedule`: week/day availability, block/open slots, and booked-slot protection.
- `/doctor/profile`: editable public demo biography, expertise, languages, and portrait.

## Demo behavior

All new flows work without signing in. Existing authentication, profile APIs, and admin routes retain their existing behavior. The doctor workspace is a fixture preview, not an authorization boundary.

`AppointmentProvider` is the single in-memory source for bookings, payment attempts, doctors, drafts, and slot overrides. Follow in-app links to switch between patient and doctor screens. A full page reload or a new browser tab starts a fresh demo; patient details are not written to browser storage.

The product timezone is `Asia/Ho_Chi_Minh` (UTC+7), with a 30-day booking window. Sample schedules contain blocked slots and doctor-specific availability. Completed visits retain their occupied slot; cancelled visits release it. Doctor 1 cannot open another doctor's fixture appointment.

`PRICING` in `frontend/src/data/appointmentDemo.ts` configures the demo currency/locale, example consultation fee ($100), and deposit ($25). These are labeled example prices throughout the UI. There is no real payment, reservation hold, refund, or card-data collection.

Expand **Demo controls** on the payment step to select a deterministic result or simulate a slot conflict. Failed, cancelled, and pending payments do not create appointments; retries retain the draft. Success is idempotent for the draft key. Expiry requires selecting a time again.

Expand **Demo data states** on department/doctor details or the doctor schedule to preview loading and error states. These controls do not make network requests.

## Verification

- `npm run test:booking`: 8 tests for timezone/date boundaries, validation (including impossible/future DOB), pricing, occupied-slot handling, cancellation, and availability overrides.
- Browser checked: all five payment outcomes; draft retained when going back; required-field errors; success visible once in both patient and doctor lists; conflict rejected before confirmation; booked slots cannot be opened directly; doctor blocking syncs to patient availability; consultation completion confirmation; profile edits sync to public details; failed images use initials; invalid IDs, unknown records and scoped fixture access; direct payment without a draft redirects with an explanation; mobile navigation and Escape dismissal.
- Overflow measured on Home, Doctors, Departments, both detail pages, Booking, and all four doctor screens at 320, 768, 1024 and 1440 px: 40 checks passed. Additional 390 px checks passed. Tables and date strips scroll within their containers.
- Existing Login/Profile redirect and Admin screens remain available. Existing out-of-scope footer links (`/ai-chat`, `/terms`, `/privacy`, `/contact`) use the application not-found fallback.

No backend files or payment integrations are part of this change. Vite may report the existing-style large-bundle advisory; it does not fail the production build.
