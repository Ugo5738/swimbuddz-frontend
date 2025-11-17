# SwimBuddz Frontend – TODO

This TODO list is for **AI agents and developers** working on the SwimBuddz frontend.

**You MUST:**

1. Read these files before coding:
   - `ARCHITECTURE.md`
   - `AGENT_INSTRUCTIONS.md`
   - `CONVENTIONS.md`
   - `ROUTES_AND_PAGES.md`
   - `UI_FLOWS.md`
2. Follow the tasks **in order**, unless a task explicitly says it can be parallelised.
3. Do not change routes or introduce new features that are not described in these docs.

The backend API shape is defined in the backend repo’s `API_CONTRACT.md`.  
All API calls must respect that contract.

---

## PHASE 0 – Project Setup & Foundations

### 0.1 – Initialise Next.js + TypeScript + Tailwind

- [x] **0.1.1 – Create base Next.js app (App Router)**

  - **Goal:** Create a Next.js app using the App Router and TypeScript.
  - **Requirements:**
    - Use `src/` directory.
    - Use `app/` directory (App Router).
    - Enable TypeScript.
  - **Output:**
    - `package.json`, `tsconfig.json`, `next.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`.

- [x] **0.1.2 – Configure Tailwind CSS**

  - **Goal:** Add Tailwind for styling.
  - **Requirements:**
    - Tailwind config file (`tailwind.config.mjs`).
    - PostCSS config (`postcss.config.mjs`).
    - `src/styles/globals.css` or equivalent with Tailwind base, components, utilities.
    - Wire CSS in `src/app/layout.tsx`.
  - **Output:**
    - Tailwind functioning with a simple test class on the home page (e.g. `text-2xl`).

- [x] **0.1.3 – Base layout & fonts**
  - **Goal:** Define the global layout.
  - **Requirements:**
    - `src/app/layout.tsx`:
      - `<html>` and `<body>` structure.
      - Main container (`<main>`).
      - Placeholder header and footer.
    - Use a clean, legible font (system fonts or Google Font).
  - **Output:**
    - Consistent shell for all pages.

---

### 0.2 – Directory & Component Skeleton

- [x] **0.2.1 – Create base directory structure**

  - **Goal:** Prepare folders for later tasks.
  - **Requirements:**
    - Create:
      - `src/components/layout/`
      - `src/components/ui/`
      - `src/components/forms/`
      - `src/components/sections/`
      - `src/lib/`
      - `src/styles/` (if not already).
  - **Output:**
    - Empty but committed directories with placeholder `README.md` or minimal files if needed.

- [x] **0.2.2 – Layout components**

  - **Goal:** Centralise the main and admin layouts.
  - **Requirements:**
    - `src/components/layout/MainLayout.tsx`
    - `src/components/layout/AdminLayout.tsx`
    - MainLayout:
      - Header with logo/brand and basic nav (Home, About, Guidelines, Login/Register).
      - Footer with links to Guidelines and Privacy.
    - AdminLayout:
      - Admin-specific nav (Dashboard, Members, Sessions, Announcements).
  - **Output:**
    - Use MainLayout in root-level `layout.tsx`.
    - AdminLayout will be used in `(admin)/layout.tsx` later.

- [x] **0.2.3 – Base UI primitives**
  - **Goal:** Create simple reusable UI components.
  - **Requirements:**
    - Create at least:
      - `Button`
      - `Input`
      - `Select`
      - `Textarea`
      - `Card`
      - `Alert` (info/error)
      - `Badge`
      - `Table` (basic)
    - Files under `src/components/ui/`.
    - Styled with Tailwind and props for className extension.
  - **Output:**
    - Components that can be used by later tasks instead of ad-hoc markup.

---

## PHASE 1 – Public Site (Community Layer)

### 1.1 – Home Page (`/`)

- [x] **1.1.1 – Implement home hero section**

  - **Goal:** Explain SwimBuddz and direct users to registration.
  - **Requirements:**
    - Use `ROUTES_AND_PAGES.md` description for `/`.
    - Content:
      - Main title: SwimBuddz – community, club, and academy for swimmers in Lagos.
      - Short subtitle describing who it’s for and where.
      - Primary CTA button: “Join SwimBuddz” → `/register`.
    - Add a short summary of the three pillars:
      - Community, Club, Academy.
  - **Output:**
    - `src/app/page.tsx` with a usable hero section.

- [x] **1.1.2 – Add quick links to key pages**
  - **Goal:** Provide navigation entry points to important sections.
  - **Requirements:**
    - On home page, add links/sections for:
      - About.
      - Guidelines.
      - Announcements.
      - Sessions (for later).
  - **Output:**
    - Simple cards or links that help new visitors navigate.

---

### 1.2 – About Page (`/about`)

- [x] **1.2.1 – Implement About page**
  - **Goal:** Present story, mission, and values.
  - **Requirements:**
    - Follow responsibilities in `ROUTES_AND_PAGES.md`.
    - Use static content scaffolding:
      - Story section.
      - Mission section.
      - Values section.
    - Use layout components and cards.
  - **Output:**
    - `src/app/(public)/about/page.tsx`.

---

### 1.3 – Guidelines & Privacy (`/guidelines`, `/privacy`)

- [x] **1.3.1 – Implement Guidelines page**

  - **Goal:** Display community rules and safety guidelines.
  - **Requirements:**
    - Summarise key sections.
    - Provide link to full Google Doc.
    - Use headings and clear typography for readability.
  - **Output:**
    - `src/app/(public)/guidelines/page.tsx`.

- [x] **1.3.2 – Implement Privacy page**
  - **Goal:** Display privacy policy summary.
  - **Requirements:**
    - Summarise key sections of SwimBuddz privacy policy.
    - Provide link to full Google Doc.
  - **Output:**
    - `src/app/(public)/privacy/page.tsx`.

---

### 1.4 – Announcements (`/announcements`, `/announcements/[id]`)

> This depends on having the backend announcements API available. Use stubs/mocks temporarily if needed, then wire to real API once available.

- [x] **1.4.1 – Announcements list page**

  - **Goal:** Show a list of official updates.
  - **Requirements:**
    - `src/app/(public)/announcements/page.tsx`.
    - Fetch from backend: `GET /api/v1/announcements` (per API_CONTRACT).
    - Show list:
      - Title.
      - Date.
      - Short snippet.
    - Link each announcement to `/announcements/[id]`.
  - **Output:**
    - Functional announcements index page.

- [x] **1.4.2 – Announcement detail page with copy helpers**
  - **Goal:** Show full announcement and support copy-to-clipboard.
  - **Requirements:**
    - `src/app/(public)/announcements/[id]/page.tsx`.
    - Fetch `GET /api/v1/announcements/{id}`.
    - Display title, date, content.
    - Add buttons:
      - “Copy as WhatsApp message” → copies formatted text.
      - “Copy as email text” → copies email-style text.
  - **Output:**
    - Announcement page usable by both members and admins for sharing news.

---

## PHASE 2 – Auth & Member Identity

### 2.1 – Supabase Client & Auth Helpers

- [x] **2.1.1 – Implement Supabase client in `src/lib/auth.ts`**

  - **Goal:** Provide a single place to initialize Supabase.
  - **Requirements:**
    - Use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
    - Export Supabase client instance.
  - **Output:**
    - `src/lib/auth.ts` with reusable Supabase client.

- [x] **2.1.2 – Implement helper to get current session/token**
  - **Goal:** Provide helpers for authenticated requests.
  - **Requirements:**
    - Utility to get current access token (client-side).
    - May use Supabase Auth session features.
  - **Output:**
    - Function like `getCurrentAccessToken()` in `auth.ts`.

### 2.2 – API Wrapper

- [x] **2.2.1 – Implement API helpers in `src/lib/api.ts`**
  - **Goal:** Centralise backend HTTP calls.
  - **Requirements:**
    - `apiGet`, `apiPost`, `apiPatch`, etc.
    - Accept `auth?: boolean` to optionally include Authorization header.
    - Base URL from `NEXT_PUBLIC_API_BASE_URL`.
  - **Output:**
    - `src/lib/api.ts` used for all backend calls.

---

### 2.3 – Login Page (`/login`)

- [x] **2.3.1 – Implement login form**
  - **Goal:** Allow existing users to log in via Supabase.
  - **Requirements:**
    - `src/app/(auth)/login/page.tsx`.
    - Form with:
      - Email.
      - Password (or suitable auth method defined in backend/infra).
    - On submit:
      - Use Supabase client to sign in.
      - On success:
        - Redirect to:
          - `redirect` query param if provided, else `/member/profile`.
      - On error:
        - Show error message with inline `Alert`.
  - **Output:**
    - Functional login page.

---

## PHASE 3 – Registration & Profile (Member Layer)

### 3.1 – Registration Flow (`/register`)

- [x] **3.1.1 – Multi-step registration UI**

  - **Goal:** Implement the multi-step registration described in `UI_FLOWS.md`.
  - **Requirements:**
    - `src/app/(auth)/register/page.tsx` as client component.
    - Steps:
      1. Basic info.
      2. Swimming experience & goals.
      3. Logistics & availability.
      4. Safety & medical.
      5. Community engagement & consents.
      6. Agreements.
    - Use `src/components/forms/` for step UI elements where helpful.
    - Show step indicators and “Next”/“Back” navigation; disable Next until required fields are valid.
  - **Output:**
    - Working front-end only (no backend calls yet).

- [x] **3.1.2 – Hook registration UI to Supabase + backend**
  - **Goal:** Actually register user and create member profile.
  - **Requirements:**
    - On final submit:
      - Create Supabase user (sign-up).
      - Retrieve access token from Supabase.
      - Call backend `POST /api/v1/members/` with full profile body (shape defined in API_CONTRACT).
    - On success:
      - Redirect to `/member/profile`.
    - On error:
      - Show clear error messages.
  - **Output:**
    - Fully functional registration flow.

### 3.2 – Member Profile (`/member/profile`)

- [x] **3.2.1 – Implement profile view**

  - **Goal:** Show current member profile.
  - **Requirements:**
    - `src/app/(member)/profile/page.tsx`.
    - Fetch `GET /api/v1/members/me` (authenticated).
    - Display:
      - Name, email, phone.
      - Level, deep-water comfort, interests, location preference.
      - Emergency contact and medical info (marked as confidential).
      - Membership status and role.
  - **Output:**
    - Read-only profile display.

- [x] **3.2.2 – Implement profile edit**
  - **Goal:** Allow members to update their own data.
  - **Requirements:**
    - Provide editable form for allowed fields (per backend contract).
    - Use `PATCH /api/v1/members/me`.
    - Show success and error feedback.
  - **Output:**
    - Profile page that supports edit → save → re-fetch.

---

### 3.3 – Member Attendance (`/member/attendance`)

- [x] **3.3.1 – Implement attendance history page**
  - **Goal:** Show summary and list of past attendance.
  - **Requirements:**
    - `src/app/(member)/attendance/page.tsx`.
    - Call `GET /api/v1/members/me/attendance` (or equivalent).
    - Show summary line (using backend response).
    - Show table/list of past sessions:
      - Date/time.
      - Location.
      - Type.
      - Status.
  - **Output:**
    - Functional attendance history page.

---

## PHASE 4 – Sessions & Sign-In (Club Layer)

### 4.1 – Sessions List (`/sessions`)

- [ ] **4.1.1 – Implement sessions page**
  - **Goal:** Show upcoming sessions for logged-in members.
  - **Requirements:**
    - `src/app/(sessions)/sessions/page.tsx`.
    - Call `GET /api/v1/sessions` (filtered for upcoming).
    - Show for each:
      - Title.
      - Type.
      - Location.
      - Date/time.
      - Pool fee (and ride-share fee if available).
    - Add actions:
      - “Sign in” → `/sessions/[id]/sign-in`.
  - **Output:**
    - Sessions listing with navigation to sign-in.

### 4.2 – Session Sign-in (`/sessions/[id]/sign-in`)

- [ ] **4.2.1 – Implement session sign-in page scaffolding**

  - **Goal:** Implement layout and data fetching for sign-in page.
  - **Requirements:**
    - `src/app/(sessions)/sessions/[id]/sign-in/page.tsx`.
    - Fetch:
      - Session details from backend.
      - Existing attendance state for the user if any.
    - Show:
      - Session title, location, type, date/time.
      - Fee breakdown (pool + optional ride-share).
  - **Output:**
    - Read-only summary view for selected session.

- [ ] **4.2.2 – Implement 3-step sign-in UI**

  - **Goal:** Match the 3-step flow described in `UI_FLOWS.md`.
  - **Requirements:**
    - If not authenticated:
      - Redirect or inline prompt to `/login` (with redirect back).
    - Steps:
      1. Confirm identity: “Signing in as [Full Name]”.
      2. Defaults:
         - Attend full session.
         - No ride-share.
      3. Optional “More options” section:
         - Time variant: late arrival, early leave, custom note.
         - Ride-share role: none/passenger/driver; seat count for drivers.
    - On submit:
      - Call `POST /api/v1/sessions/{id}/sign-in`.
  - **Output:**
    - Functional sign-in that creates attendance records.

- [ ] **4.2.3 – Confirmation state**
  - **Goal:** Confirm sign-in and show payment instructions.
  - **Requirements:**
    - After successful sign-in:
      - Show a confirmation card:
        - “You’re confirmed for Yaba – Sat 16 Nov, 12–3 pm (pending payment confirmation).”
        - Show fees and totals.
        - Show payment instructions from backend:
          - Bank account details.
          - Payment reference (from backend).
  - **Output:**
    - Clear, mobile-friendly confirmation UI.

---

## PHASE 5 – Admin Area

> All admin routes must enforce admin role checks using backend identity info.

### 5.1 – Admin Layout & Guard

- [ ] **5.1.1 – Implement `(admin)/layout.tsx`**
  - **Goal:** Wrap admin routes with AdminLayout and role check.
  - **Requirements:**
    - Create `src/app/(admin)/layout.tsx`.
    - Use `AdminLayout` from `src/components/layout/AdminLayout.tsx`.
    - Implement server-side or client-side check:
      - Call `GET /api/v1/identity/me` (or equivalent).
      - If user is not admin:
        - Redirect to `/` or show “Access denied”.
  - **Output:**
    - All admin pages share the same layout and protection.

### 5.2 – Admin Dashboard (`/admin/dashboard`)

- [ ] **5.2.1 – Implement dashboard**
  - **Goal:** Provide quick overview for admins.
  - **Requirements:**
    - `src/app/(admin)/dashboard/page.tsx`.
    - Fetch aggregated info from backend (if available), or stub for later:
      - Total members.
      - Active vs inactive counts.
      - Upcoming sessions with sign-in counts.
      - Recent announcements.
  - **Output:**
    - Simple card-based dashboard.

### 5.3 – Admin Members (`/admin/members`)

- [ ] **5.3.1 – Implement members table**

  - **Goal:** Show and filter members.
  - **Requirements:**
    - `src/app/(admin)/members/page.tsx`.
    - Call `GET /api/v1/admin/members`.
    - Show table with:
      - Name, email, phone.
      - Swimming level.
      - Location preference.
      - Membership status.
    - Filters:
      - Level, location, status, volunteer interest (server-side or client-side per backend).
  - **Output:**
    - Admin members view with filtering controls.

- [ ] **5.3.2 – Membership status controls**
  - **Goal:** Allow admins to change membership status.
  - **Requirements:**
    - For each row, allow:
      - Change `membership_status` via `PATCH /api/v1/admin/members/{id}/status`.
    - Confirm before making changes (modal or confirm dialog).
  - **Output:**
    - Admin can set active/inactive/banned from UI.

### 5.4 – Admin Sessions (`/admin/sessions`)

- [ ] **5.4.1 – Admin sessions list & creation**
  - **Goal:** Let admins manage sessions.
  - **Requirements:**
    - `src/app/(admin)/sessions/page.tsx`.
    - Show table of sessions with:
      - Title, type, location, date/time, sign-up count (if available).
    - Provide:
      - “Create session” form in a modal or dedicated section.
      - Fields: as per backend session model.
  - **Output:**
    - Admin can view and create sessions.

### 5.5 – Admin Session Attendance (`/admin/sessions/[id]/attendance`)

- [ ] **5.5.1 – Implement attendance table**

  - **Goal:** Show and manage attendance for a specific session.
  - **Requirements:**
    - `src/app/(admin)/sessions/[id]/attendance/page.tsx`.
    - Fetch from `GET /api/v1/admin/sessions/{id}/attendance`.
    - Show:
      - Member name, level.
      - Ride-share role and seats.
      - Payment status.
      - Attendance status (registered/no_show, etc.).
  - **Output:**
    - Admin attendance page.

- [ ] **5.5.2 – Admin controls & pool list export**
  - **Goal:** Allow admin to confirm payments and export attendee lists.
  - **Requirements:**
    - Controls on each row:
      - Set payment status (e.g., confirm paid).
      - Mark no-show after session.
      - Call relevant backend endpoints.
    - Add “Download pool list” button:
      - Calls backend export endpoint and:
        - Either downloads CSV.
        - Or shows text that can be copy-pasted.
  - **Output:**
    - Page fully usable for session-day operations.

### 5.6 – Admin Announcements (`/admin/announcements`)

- [ ] **5.6.1 – Implement admin announcement manager**
  - **Goal:** CRUD for announcements.
  - **Requirements:**
    - `src/app/(admin)/announcements/page.tsx`.
    - List all announcements with:
      - Title, date, category.
    - Provide form to:
      - Create new announcement.
      - Edit existing announcement (inline or separate UI).
    - Use backend endpoints:
      - `GET /api/v1/admin/announcements`
      - `POST /api/v1/admin/announcements`
      - `PATCH /api/v1/admin/announcements/{id}` (or equivalent).
  - **Output:**
    - Admin announcement management UI.

---

## PHASE 6 – UX Polish & Reliability

### 6.1 – Loading & Error States

- [ ] **6.1.1 – Implement loading indicators**

  - **Goal:** Avoid blank screens during data fetch.
  - **Requirements:**
    - For each data-fetching page (sessions, announcements, profile, admin lists):
      - Show loading skeleton or “Loading…” state.
  - **Output:**
    - All major networked pages have visible loading states.

- [ ] **6.1.2 – Implement error handling**
  - **Goal:** Show meaningful errors for failed API calls.
  - **Requirements:**
    - Handle non-2xx responses from `api.ts`.
    - Display inline `Alert` components with human-readable messages.
    - Provide simple retry where appropriate (e.g., button).
  - **Output:**
    - User-facing errors instead of silent failures.

### 6.2 – Mobile-First Checks

- [ ] **6.2.1 – Mobile responsiveness pass**
  - **Goal:** Ensure key flows work well on narrow screens.
  - **Requirements:**
    - Test on mobile viewport sizes:
      - Home.
      - Register.
      - Login.
      - Session sign-in.
      - Member profile.
      - Admin core pages (for admins using phones).
    - Adjust spacing, font sizes, and layout where necessary.
  - **Output:**
    - Clean, usable UI on small devices.

### 6.3 – Accessibility Basics

- [ ] **6.3.1 – Accessibility improvements**
  - **Goal:** Improve accessibility and semantics.
  - **Requirements:**
    - Ensure:
      - Semantic tags (`<main>`, `<header>`, `<nav>`, `<section>`, `<footer>`).
      - Buttons are `<button>`, not clickable `<div>`.
      - Labels are linked to inputs.
      - Links have descriptive text.
  - **Output:**
    - More accessible base experience.

---

## IMPLEMENTATION ORDER SUMMARY

If you are an AI agent, **implement in this order**:

1. Phase 0 – Setup & foundations.
2. Phase 1 – Public site (home, about, guidelines, privacy, announcements).
3. Phase 2 – Auth helpers & login.
4. Phase 3 – Registration & profile & member attendance.
5. Phase 4 – Sessions + sign-in.
6. Phase 5 – Admin area (dashboard, members, sessions, attendance, announcements).
7. Phase 6 – UX polish, loading/error, mobile, accessibility.

Do not skip ahead or introduce new features that are not described here or in the other documentation files.
