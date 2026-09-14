# AI Usage & Human Review — Accounts: Auth and Profile

**Project:** Smart Healthcare — `frontend/` (React 19 + TypeScript + Vite) and `backend/` (Spring Boot 4.1 + Java 21 + MySQL)
**Author:** Tran Quoc Huy (GitHub: `LotusTranQuocHuy`)
**Branches / PRs:**
- `feature/UI-auth-and-profile` → PR #3 (merged into `main` by `huulocc`), then English translation, login error state, this document
- `feature/backend-auth` → backend + connecting the pages to the real API (includes the branch above)

---

## 1. Summary

I built the **account part** of the app with help from an AI coding assistant:
**Sign Up, Log In, Profile (view + edit), Change Password, Forgot Password, Reset Password.**

- **Phase 1 – UI:** React screens with mock data and form validation (`react-hook-form` + `zod`).
- **Phase 2 – Backend:** Spring Boot REST API with MySQL, BCrypt passwords, JWT login and password reset by email. The React pages now call this API. The mock data is gone.
- The rest of the app (Home, Departments, Doctors, Footer, AI chat widget, Admin) was built by teammates and is **not** part of this AI record. I only made a small change to the teammates' `Navbar.tsx` (Profile / Log Out when logged in).

---

## 2. Homework 3A checklist

| Requirement | Status | Where |
|---|---|---|
| Main navigation + 2–3 essential screens | Done | Navbar + 6 account screens |
| One working form with validation | Done | 6 forms; rules in `frontend/src/schemas/authSchemas.ts`, same rules again on the server |
| Loading / empty / success / error states | Done | See table below |
| Responsive web or usable mobile layout | Done | Checked at 375 × 812 (mobile) and desktop |
| Record AI-generated code + human review | Done | This document |

**The four UI states (with real data):**

| State | Example in the app |
|---|---|
| Loading | Profile shows "Loading your profile..." while it calls the API; submit buttons change to "Logging in...", "Saving...", "Sending..." and are disabled |
| Empty | Profile shows "Not provided" for a new account without date of birth / address; Doctors page → search `xyz` → "No doctors found" |
| Success | "Your account has been created. Please log in.", "Profile updated successfully.", "Your password has been changed.", "Check your email", "Password Reset Successful" |
| Error | Field errors under inputs; red banner for a wrong password; "Could not load your profile" + **Try Again** when the backend is down; "This reset link is invalid or has expired" |

---

## 3. AI tool and workflow

- **Tool:** Claude Code (Claude desktop app, Code tab).
- **Models:** Claude Sonnet 5 (most of the planning and code), Claude Opus 5 (login error state, backend plan, documents).
- **How we worked:** the AI read the project, proposed a plan, and I answered the open questions. Then it built **one step at a time**; after each step I tested it and approved the next one.

| Commit | What happened |
|---|---|
| `2199364` | Phase 1: Login, Sign Up, Profile, Change / Forgot / Reset Password, `FormInput`, `AuthLayout` |
| PR #3 | Teammate `huulocc` asked for English UI text, then merged the PR |
| `319a2d5` | All UI text translated to English |
| `294fe63` | Login error state (demo account at that time) |
| `551b546` | Phase 2 step 1: MySQL (Docker), Spring Security, JPA, validation, mail dependencies |
| `2ed4732` | Step 2: `users` table + registration API |
| `b601064` | Step 3: JWT login + `GET /api/users/me` |
| `d37074a` | Step 4: update profile + change password |
| `997f2dc` | Step 5: forgot / reset password by email |
| `e321202` | Merged my UI branch into the backend branch (no conflicts) |
| `d43bbd6` | Step 6: React pages call the real API; mock data removed |
| Step 7 | Automated API tests + this document |

---

## 4. AI-generated code

All files below were written by the AI and reviewed by me.

### Frontend (`frontend/src/`)

| File | Purpose |
|---|---|
| `components/FormInput.tsx` + `.module.css` | Reusable input: label, icon, error message, show/hide password |
| `layouts/AuthLayout.tsx` + `.module.css` | Centered card layout for pages used before logging in |
| `schemas/authSchemas.ts` | Validation rules (zod) for all 6 forms |
| `pages/Login`, `Register`, `Profile` (`Profile`, `ProfileView`, `ProfileEditForm`), `ChangePassword`, `ForgotPassword`, `ResetPassword` | The 6 account screens |
| `api/client.ts` | Axios instance: adds `Authorization: Bearer <token>`; logs out on 401 with a token |
| `api/authApi.ts`, `api/userApi.ts`, `api/types.ts` | Functions for the 7 API endpoints |
| `api/errors.ts` | Turns server errors into field errors (`setError`) or a banner message |
| `context/AuthProvider.tsx`, `AuthContext.ts`, `useAuth.ts` | Login state, `login()`, `logout()` |
| `components/ProtectedRoute.tsx` | Sends logged-out users to Log In, then back to the page they wanted |

Edited: `App.tsx` (routes, `AuthProvider`, `ProtectedRoute`), `Navbar.tsx` (teammate file: Profile / Log Out), `vite.config.ts` (proxy `/api` → backend). Removed: `data/mockUser.ts`.

### Backend (`backend/src/main/java/com/example/healthcare/backend/`)

| File | Purpose |
|---|---|
| `user/User.java`, `Role.java`, `UserRepository.java` | `users` table (roles `PATIENT` / `DOCTOR` / `ADMIN`) |
| `auth/AuthController.java`, `AuthService.java` | Register, log in, forgot / reset password endpoints |
| `auth/jwt/JwtService.java`, `JwtAuthenticationFilter.java` | Create and check JWTs on every request |
| `auth/reset/*` | Reset tokens (only a SHA-256 hash is stored, 15-minute expiry, single use) and the Gmail mailer |
| `user/UserController.java`, `UserService.java` | `GET` / `PUT /api/users/me`, `PUT /api/users/me/password` |
| `config/SecurityConfig.java` | Public `/api/auth/**`, everything else needs a token, BCrypt |
| `common/GlobalExceptionHandler.java`, `ApiException.java`, `Emails.java` | One JSON error format; email normalization |
| `src/test/...` | 17 automated API tests (H2 in-memory database) |

Other files: `docker-compose.yml` (MySQL 8.4), `backend/pom.xml`, `application.properties`, `backend/.env.example`, `frontend/.env.example`.

---

## 5. Human review performed

### 5.1 My decisions
- Phase 1: build step by step; use `react-hook-form` + `zod`; add a **Forgot Password** feature that was not in the first plan.
- Phase 2: **MySQL in Docker**, **real Gmail SMTP** for reset emails, branch `feature/backend-auth`, one step at a time.
- Did not wait for `main`: merged my own UI branch into the backend branch instead.
- Created the Gmail App Password myself and entered secrets only in `backend/.env` (ignored by git). The AI did not write any secret into a file.
- Ran and tested the backend myself between steps (PowerShell `Invoke-RestMethod`).

### 5.2 Peer review (GitHub PR #3)
- Reviewer `huulocc`: "using English for whole system", "change all field to English".
- Result: every label, message and validation error changed to English.

### 5.3 Problems found and fixed

| Problem | Found by | Fix |
|---|---|---|
| Enabling pnpm with corepack rewrote `pnpm-lock.yaml` with unrelated changes | AI (`git diff`) | Reverted; added one dependency line; I ran `npm install` |
| UI text was Vietnamese, the system is English | Peer reviewer | Translated all strings |
| Port 8080 already used by another project's container on my machine | AI | Port is configurable: `SERVER_PORT` (backend) and `API_PROXY_TARGET` (frontend) |
| MySQL container was stopped during a test, so the backend could not restart | AI (read logs) | Restarted MySQL; the code was fine |
| **Log Out** on the Profile page went to `/login` instead of the home page | AI (browser test) | Logout + navigation in one `startTransition` (`Navbar.tsx`) |
| `curl` in PowerShell opened a "Uri:" prompt | Me | Use `Invoke-RestMethod` (PowerShell) or Git Bash |

### 5.4 Verification
- **Backend tests:** `mvnw.cmd test` → **17 / 17 pass** (register, login, token checks, profile update, change password, full reset-password flow, expired / reused links).
- **Manual API tests** with curl against MySQL for every step (e.g. passwords stored as `$2a$10$...`, reset tokens stored as a 64-character hash).
- **Browser tests** on the real backend: sign up → wrong password → log in → edit profile → reload (data kept) → email conflict → change password → log out → log in → forgot / reset password → reused link → missing token → backend down (error + Try Again) → fake token (auto logout).
- **Frontend:** `npx tsc -b --noEmit` has no errors in my files; `npx vite build` succeeds.

### 5.5 My personal checklist
- [x] Ran the app locally and checked the Login page (Phase 1).
- [x] Tested the backend API myself during Phase 2.
- [ ] Tried every scenario in section 6 on the full app.
- [ ] Read every file in section 4 and can explain what it does.
- [ ] Can explain state, event handling and the login flow (section 8).

---

## 6. Demo scenarios (instructor picks one)

**First time only:** copy `backend/.env.example` to `backend/.env` and set `JWT_SECRET` (the backend does not start without it). There is no demo account any more — create one with Sign Up.

**Start everything** (Docker Desktop must be running), each command in its own terminal, starting from the repo root:

| What | Windows (PowerShell) | macOS / Linux |
|---|---|---|
| MySQL | `docker compose up -d` | `docker compose up -d` |
| Backend (API on port 8080, or your `SERVER_PORT`) | `cd backend; .\mvnw.cmd spring-boot:run` | `cd backend && ./mvnw spring-boot:run` |
| Frontend (app on http://localhost:5173) | `cd frontend; npm install; npm run dev` | `cd frontend && npm install && npm run dev` |

| # | Scenario | Steps | Expected result |
|---|---|---|---|
| A | Sign up | `/register` → submit empty, then fill all fields | Errors under each field; then "Your account has been created" on Log In |
| B | Wrong password | Log In with your email + `wrongpass` | Red banner "Invalid email or password." |
| C | Protected page | Logged out → open `/profile` | Redirected to Log In; after login you land on Profile |
| D | Edit profile | Profile → Edit Profile → change data → Save → press F5 | Success banner; data is still there after reload (saved in MySQL) |
| E | Email conflict | Edit Profile → use another account's email | Error under the Email field |
| F | Change password | Wrong current password, then a valid change | Error under Current Password; then back to Profile with a notice |
| G | Forgot password | Log In → Forgot password? → email → open the link from Gmail (or the backend console) → new password | "Check your email" → "Password Reset Successful" → log in |
| H | Error state | Stop the backend → open Profile → start it again → Try Again | "Could not load your profile" → profile loads |
| I | Empty state (teammate page) | `/doctors` → search `xyz` | "No doctors found" → Clear Filters |

---

## 7. Invalid input + visible error state (demo script)

On `/login` (after creating an account):

1. Click **Log In** with empty fields → "Please enter your email" and "Password must be at least 6 characters".
2. Type `abc` as email → "Invalid email address"; the border turns red.
3. Type your email and `wrongpass` → button shows "Logging in..." → red banner "Invalid email or password."
4. Type the right password → you land on Profile.

**What to say:** there are two kinds of errors.
- **Validation errors** (1–2): checked in the browser by zod **before** any request is sent. The server checks the same rules again, because a request can also come from outside the app.
- **Server error** (3): the data is valid, but the server rejects the login with HTTP 401. The same message is used for "unknown email" and "wrong password", so nobody can find out which emails are registered. The banner has `role="alert"` so screen readers announce it.

---

## 8. Explaining state, event handling and the login flow

### 8.1 State = data that can change and makes the component re-render

| Component | State | Why |
|---|---|---|
| `AuthProvider` | `token` | Logged in or not; read from `localStorage` so a refresh keeps you logged in |
| `Login` | `submitError` | Show or hide the red banner |
| `Profile` | `state` = `loading` / `error` / `ready`, `isEditing`, `savedMessage` | Which card to show, view vs edit mode, success banner |
| `ForgotPassword` | `sentTo` | Show "Check your email" instead of the form |
| `ResetPassword` | `isDone` | Show the success screen |
| `FormInput` | `showPassword` | Switch between `password` and `text` |
| Every form | `errors`, `isSubmitting` (react-hook-form) | Field messages and the loading button |

### 8.2 What happens when you click "Log In"

```tsx
<form onSubmit={handleSubmit(onSubmit)} noValidate>
```

1. The **submit event** fires. `handleSubmit` runs the **zod** rules. If they fail, errors appear and nothing is sent.
2. `onSubmit` calls `login(email, password)` from `useAuth()` → `POST /api/auth/login`.
3. **Backend:** `AuthController` validates the body → `AuthService` finds the user and checks the password with **BCrypt** → `JwtService` creates a signed token (valid 1 hour).
4. **Success:** the token is saved in `localStorage` and in `AuthProvider` state → `navigate('/profile')`. From now on `api/client.ts` adds `Authorization: Bearer <token>` to every request.
5. **Failure:** `toApiError()` reads the JSON error. `applyFieldErrors()` puts field errors under the inputs; otherwise `setSubmitError(...)` shows the banner.

On the server, `JwtAuthenticationFilter` checks the token on every request. A missing, tampered or expired token → HTTP 401 → the frontend logs out and shows Log In.

### 8.3 Loading data: `useEffect` in Profile

```tsx
useEffect(() => {
  let ignore = false;
  getMyProfile().then(
    (user) => { if (!ignore) setState({ status: 'ready', user }); },
    (error) => { if (!ignore) setState({ status: 'error', message: toApiError(error).message }); },
  );
  return () => { ignore = true; };
}, [reloadKey]);
```

- Runs after the first render and whenever `reloadKey` changes (the **Try Again** button increases it).
- `ignore` stops a late answer from updating a page the user already left.

### 8.4 Parent and child components

`Profile` (parent) owns the data. `ProfileEditForm` saves through the API and then calls `onSaved(user)`; the parent updates its state, closes the form and shows the banner. This is **lifting state up** + **conditional rendering**.

### 8.5 30-second answer
> "State is data that can change, like `isEditing` or the logged-in `token`. Calling a setter makes React re-render. For events, `handleSubmit` validates the form with zod first and only then calls our `onSubmit`, which sends the request with axios. The backend checks the data again, compares the password with BCrypt and returns a JWT. We store the token, send it with every request, and when the server answers 401 we log the user out."

---

## 9. Peer-review checklist: clarity, responsiveness, accessibility

### Clarity
- Good: clear titles, specific error messages, loading text on buttons, success notices after each action, same design as the rest of the site.
- To improve: the browser tab title is "frontend" on every page (`frontend/index.html`).

### Responsiveness
- Good: cards use `width: 100%` + `max-width`; checked at 375 px.
- To improve (teammate Navbar): under 768 px the links are hidden and there is no menu button; buttons wrap to two lines.

### Accessibility
- Good: every input has a linked `<label>`; `aria-invalid` on invalid inputs; `aria-label` on the show/hide button; banners use `role="alert"` (errors) and `role="status"` (success, loading); `<html lang="en">`.
- To improve: error text is not linked with `aria-describedby`; the show/hide button has `tabIndex={-1}`; light gray text (`#94a3b8`) on white is about 2.6:1 contrast (WCAG AA needs 4.5:1).

---

## 10. Known limitations
- The JWT is stored in `localStorage`: simple, but a script injected into the page (XSS) could read it. An httpOnly cookie would be safer.
- After a password change, an old token still works until it expires (max 1 hour).
- The reset email is sent inside the request, so it takes 1–3 s longer for a registered email.
- Tables are created by Hibernate (`ddl-auto=update`), not by migration scripts.
- `/admin` pages are not protected yet (teammates' part).
- `npm run build` stops at old TypeScript errors in teammates' files (`Button.tsx`, `MainLayout.tsx`, `DoctorsSection.tsx`); `npx vite build` works.
