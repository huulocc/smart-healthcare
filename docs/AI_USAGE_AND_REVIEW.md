# AI Usage & Human Review — Auth and Profile UI

**Course task:** Homework 3A – UI skeleton
**Project:** Smart Healthcare (`frontend/`, React 19 + TypeScript + Vite)
**Author:** Tran Quoc Huy (GitHub: `LotusTranQuocHuy`)
**Branch / PR:** `feature/UI-auth-and-profile` → PR #3 (merged into `main` by `huulocc`)

---

## 1. Summary

I built the account screens of the app with help from an AI coding assistant:
**Log In, Sign Up, Profile (view + edit), Change Password, Forgot Password, Reset Password.**

- Frontend only. There is **no backend yet** — all data is mock data.
- Every form has validation (`react-hook-form` + `zod`).
- Each screen shows loading, success and error feedback.
- The rest of the app (Home, Departments, Doctors, Navbar, Footer, AI chat widget, Admin) was built by teammates and is **not** part of this AI record.

---

## 2. Homework 3A checklist

| Requirement | Status | Where |
|---|---|---|
| Main navigation + 2–3 essential screens | Done | Navbar (teammate) + 6 account screens (this work) |
| One working form with validation | Done | 6 forms, rules in `frontend/src/schemas/authSchemas.ts` |
| Mock data + loading / empty / success / error states | Done | See table below |
| Responsive web or usable mobile layout | Done | Checked at 375 × 812 (mobile) and desktop |
| Record AI-generated code + human review | Done | This document |

**The four UI states:**

| State | Example in the app |
|---|---|
| Loading | Submit buttons change to "Logging in...", "Saving...", "Sending..." and are disabled |
| Empty | Doctors page → search for a name that does not exist → "No doctors found" + "Clear Filters" |
| Success | Profile → "Profile updated successfully."; Forgot Password → "Check your email"; Reset Password → "Password Reset Successful" |
| Error | Field errors under each input (invalid input) + red banner on Log In for a wrong password (failed request) |

---

## 3. AI tool and workflow

- **Tool:** Claude Code (Claude desktop app, Code tab).
- **Models:** Claude Sonnet 5 (planning + most of the code), Claude Opus 5 (login error state + this document).
- **How we worked:**
  1. The AI read the existing project (tech stack, colors, folder structure, Navbar/Button components).
  2. The AI proposed a plan. I answered two questions: build **one screen at a time** and **use react-hook-form + zod**.
  3. The AI built one step, I checked it, then I approved the next step.
  4. I pushed the work and opened PR #3. A teammate reviewed it.

| Date | Commit | What happened |
|---|---|---|
| 2026-08-23 | `2199364` | Login, Sign Up, Profile, Change / Forgot / Reset Password, shared `FormInput`, `AuthLayout` |
| — | PR #3 | Teammate `huulocc` asked to use English for all UI text, then merged the PR |
| 2026-09-03 | `319a2d5` | All UI text and error messages translated to English (on the same branch) |
| 2026-09-11 | this change | Login error state with a demo account + this document |

---

## 4. AI-generated code

All files below were written by the AI and reviewed by me.

| File | Purpose |
|---|---|
| `frontend/src/components/FormInput.tsx` + `.module.css` | Reusable input: label, icon, error message, show/hide password button |
| `frontend/src/layouts/AuthLayout.tsx` + `.module.css` | Centered card layout for pages used before logging in |
| `frontend/src/schemas/authSchemas.ts` | Validation rules (zod) for all 6 forms |
| `frontend/src/data/mockUser.ts` | Mock user + demo login account |
| `frontend/src/pages/Login/*` | Log In form, mock credential check, error banner |
| `frontend/src/pages/Register/*` | Sign Up form |
| `frontend/src/pages/Profile/Profile.tsx` | Parent: holds user data and view/edit mode |
| `frontend/src/pages/Profile/ProfileView.tsx` | Read-only profile card |
| `frontend/src/pages/Profile/ProfileEditForm.tsx` | Edit form with Save / Cancel |
| `frontend/src/pages/ChangePassword/*` | Change Password form |
| `frontend/src/pages/ForgotPassword/*` | Request reset email → "Check your email" screen |
| `frontend/src/pages/ResetPassword/*` | Set a new password → success screen |

**Files edited by the AI:** `frontend/src/App.tsx` (new routes), `frontend/package.json` (added `@hookform/resolvers`), `.gitignore` (ignore local `.claude/` tool folder).

---

## 5. Human review performed

### 5.1 My decisions
- Chose to build step by step and approve each screen before the next one.
- Approved adding the `@hookform/resolvers` package.
- Installed dependencies myself with `npm install` (pnpm was not installed on my machine).
- Ran the app with `npm run dev` and checked the Login page before approving the next step.
- Asked for an extra feature that was not in the first plan: **Forgot Password**.
- Opened PR #3 and asked teammates to review.
- After the review, decided to keep the fix on the same feature branch instead of a new branch.
- Checked the work against the Homework 3A requirements and asked for a visible login error state.

### 5.2 Peer review (GitHub PR #3)
- Reviewer: `huulocc`.
- Comments: "using English for whole system", "change all field to English" (on `Profile.tsx` and `ChangePassword.tsx`).
- Result: every label, placeholder, button, message and validation error in 11 files was changed to English.

### 5.3 Problems found and fixed

| Problem | Found by | Fix |
|---|---|---|
| Enabling pnpm with corepack rewrote `pnpm-lock.yaml` with many unrelated version changes | AI (checked `git diff`) | Reverted the lock file; added only one dependency line; I ran `npm install` |
| An empty `frontend/frontend/` folder was created by mistake | AI | Deleted it |
| `ChangePassword` had an error state that was never used | AI self-review | Removed the unused code |
| UI text was Vietnamese while the rest of the system is English | Peer reviewer | Translated all strings |
| The fix was pushed to a new branch | Me | Moved the commit to `feature/UI-auth-and-profile`, deleted the extra branch |
| Log In had no visible "request failed" error | Me (homework check) | Added demo account check + red error banner |

### 5.4 Verification
- **Type check:** `npx tsc -b --noEmit` → no errors in the new files. (Old errors still exist in teammates' files `Button.tsx`, `MainLayout.tsx`, `DoctorsSection.tsx` — not changed by this work.)
- **Lint:** could not run — the repo has no `eslint.config.js` yet.
- **Browser tests** (run in Claude Code's built-in browser):
  - Log In: empty submit, invalid email, wrong password → red banner, demo account → goes to `/profile`
  - Sign Up: page renders with all fields (validation not yet tested by hand — try scenario C)
  - Profile: view → edit → save shows success banner; cancel keeps old data
  - Change Password: "passwords do not match" and "must be different" errors; valid submit goes back to Profile
  - Forgot → Reset Password: full flow back to Log In
  - Mobile (375 × 812): Log In and Profile display correctly
  - No errors in the browser console

### 5.5 My personal checklist
- [x] Ran the app locally and checked the Login page.
- [ ] Tried every scenario in section 6 myself.
- [ ] Read every file in section 4 and can explain what it does.
- [ ] Can explain state and event handling (section 8).

---

## 6. Demo scenarios (instructor picks one)

**Start the app:**
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`.

**Demo account:** `johndoe@example.com` / `password123`

| # | Scenario | Steps | Expected result |
|---|---|---|---|
| A | Log in | `/login` → enter demo account → Log In | "Logging in..." → goes to Profile |
| B | Wrong password | `/login` → demo email + `wrongpass` → Log In | Red banner: "Invalid email or password. Please try again." |
| C | Sign up | `/register` → submit empty, then fill all fields | Errors under each field; phone must be like `0901234567`; passwords must match |
| D | Edit profile | `/profile` → Edit Profile → change name → Save Changes | Success banner, new name shown. (Cancel = no change) |
| E | Change password | Profile → Change Password → new = current, then confirm ≠ new | Two error messages; valid input → back to Profile |
| F | Forgot password | Log In → Forgot password? → email → Send Instructions → demo link → new password | "Check your email" → "Password Reset Successful" → Go to Login |
| G | Find a doctor (teammate page) | `/doctors` → search `xyz` | Empty state "No doctors found" → Clear Filters |

> Data is mock data. Reloading the page resets the profile to the original values.

---

## 7. Invalid input + visible error state (demo script)

On `/login`:

1. Click **Log In** with empty fields → "Please enter your email" and "Password must be at least 6 characters".
2. Type `abc` as email → "Invalid email address". The input border turns red.
3. Type `johndoe@example.com` and `wrongpass` → button shows "Logging in..." → red banner "Invalid email or password. Please try again."
4. Type `password123` → you are sent to the Profile page.

**What to say:** there are two kinds of errors.
- **Validation errors** (steps 1–2): checked in the browser by the zod schema **before** any request is sent.
- **Submission error** (step 3): the form is valid, but the (mock) server rejects the login. This is shown as a banner with `role="alert"` so screen readers announce it.

---

## 8. Explaining component state and event handling

### 8.1 State = data that can change and makes the component re-render

| Component | State | Why |
|---|---|---|
| `Login` | `submitError` | Show or hide the red error banner |
| `FormInput` | `showPassword` | Switch the input between `password` and `text` |
| `Profile` | `user`, `isEditing`, `savedMessage` | Current data, view vs edit mode, success banner |
| `ForgotPassword` | `sentTo` | After submit, show "Check your email" instead of the form |
| `ResetPassword` | `isDone` | After submit, show the success screen |
| Every form | `errors`, `isSubmitting` (from react-hook-form) | Field error messages and the loading button |

### 8.2 Event handling — what happens when you click "Log In"

```tsx
<form onSubmit={handleSubmit(onSubmit)} noValidate>
```

1. The **submit event** fires.
2. `handleSubmit` (react-hook-form) runs the **zod** rules.
3. If invalid → it fills `errors` → error text appears under the inputs. `onSubmit` is **not** called.
4. If valid → `onSubmit(values)` runs. `isSubmitting` becomes `true` → button shows "Logging in..." and is disabled.
5. After the mock delay: wrong account → `setSubmitError(...)` → re-render → banner appears. Correct account → `navigate('/profile')`.

Other events:
- `register('email')` connects an input to the form (it adds `name`, `onChange`, `onBlur`, `ref`).
- Eye button: `onClick={() => setShowPassword(prev => !prev)}`. It has `type="button"` so it does not submit the form.
- `noValidate` turns off the browser's built-in popups so our own messages are shown.

### 8.3 Parent and child components (lifting state up)

`Profile` (parent) owns the state. The children only receive data and functions:

```tsx
{isEditing ? (
  <ProfileEditForm user={user} onSave={handleSave} onCancel={() => setIsEditing(false)} />
) : (
  <ProfileView user={user} onEdit={handleEdit} />
)}
```

- Child calls `onEdit()` → parent sets `isEditing = true` → the edit form is shown.
- Child calls `onSave(values)` → parent updates `user`, goes back to view mode, shows the success banner.
- This is **conditional rendering**: the same page shows different UI based on state.

### 8.4 Derived value (teammate's Doctors page)
`filteredDoctors` is **calculated** from `searchTerm` and `selectedDept` on every render — it is not stored as extra state. If the list is empty, the page shows the empty state.

### 8.5 30-second answer
> "State is data inside a component that can change, like `isEditing` in Profile or `submitError` in Login. When we call a setter such as `setIsEditing(true)`, React re-renders and the UI changes — for example the edit form replaces the profile card. For events, the form uses `onSubmit={handleSubmit(onSubmit)}`: react-hook-form validates the input with a zod schema first, shows errors if something is wrong, and only calls our `onSubmit` when the data is valid. The parent Profile component passes callbacks like `onSave` to its children, so children can ask the parent to update the state."

---

## 9. Peer-review checklist: clarity, responsiveness, accessibility

### Clarity
- Good: clear page titles and subtitles, specific error messages, loading text on buttons, same colors/spacing as the rest of the site, demo account shown on the Log In page.
- To improve: the browser tab title is "frontend" on every page (`frontend/index.html`) — should be "Smart Healthcare".

### Responsiveness
- Good: cards use `width: 100%` + `max-width`, so they shrink on small screens; checked at 375 px wide.
- To improve (Navbar, teammate component): under 768 px the nav links are hidden and there is no menu button; "Log In" / "Sign Up" wrap to two lines on mobile. On Profile, "Edit Profile" / "Change Password" also wrap.

### Accessibility
- Good:
  - Every input has a `<label>` linked by `htmlFor` / `id` (`useId`).
  - Invalid inputs get `aria-invalid="true"`.
  - Show/hide password button has an `aria-label`.
  - Login error banner uses `role="alert"`.
  - `<html lang="en">`, real `<form>`, `<button>` and `<label>` elements.
- To improve:
  - Error text is not linked to its input with `aria-describedby`.
  - The show/hide password button has `tabIndex={-1}`, so keyboard users cannot reach it.
  - Light gray text (`--text-light`, `#94a3b8`) on white has about 2.6:1 contrast — below the WCAG AA minimum of 4.5:1.

---

## 10. Known limitations
- No backend or real authentication; the demo account is hard-coded in `mockUser.ts`.
- Profile changes are not saved — reloading the page resets them.
- The reset-password link is a demo link (no real email is sent).
- Profile and Change Password pages are not protected; the Navbar does not change after login.
