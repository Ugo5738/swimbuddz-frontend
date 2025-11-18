# SwimBuddz Frontend – Routes & Pages

This file defines which pages exist, what URLs they map to, and what each page is responsible for.

Implement pages in `src/app/` using the Next.js App Router.

---

## 1. Public Routes

### `/` – Home

**Goal:** Explain SwimBuddz and drive sign-ups.

**Responsibilities:**

- Show hero section:
  - “SwimBuddz – community, club, and academy for swimmers in Lagos.”
  - Short explanation and primary CTA: “Join SwimBuddz”.
- Summarise:
  - Community (vibe, meetups).
  - Club (structured training).
  - Academy (programs, future).
- Show link to session info and announcements.

**File:** `src/app/page.tsx`

---

### `/about`

**Goal:** Share the story and values.

**Responsibilities:**

- Show:
  - How SwimBuddz started.
  - Mission and goals.
  - Values (respect, safety, inclusiveness, fun, progress).

**File:** `src/app/(public)/about/page.tsx`

---

### `/guidelines`

**Goal:** Present community rules and safety guidelines.

**Responsibilities:**

- Render friendly presentation of:
  - Community Rules & Safety Guidelines (from backend docs).
- Link to the full Google Doc as “Latest version”.

**File:** `src/app/(public)/guidelines/page.tsx`

---

### `/privacy`

**Goal:** Present the SwimBuddz privacy policy.

**Responsibilities:**

- Summarise the privacy policy.
- Link to full Google Doc.

**File:** `src/app/(public)/privacy/page.tsx`

---

### `/announcements`

**Goal:** Show official updates and announcements.

**Responsibilities:**

- Fetch list of announcements from backend.
- Show:
  - Title.
  - Date.
  - Short summary or first lines.
- Link each item to its detail page.

**File:** `src/app/(public)/announcements/page.tsx`

---

### `/announcements/[id]`

**Goal:** Show a single announcement.

**Responsibilities:**

- Display:
  - Title.
  - Date.
  - Full content.
- Provide a button:
  - “Copy as WhatsApp message” (client-side helper).
  - “Copy as email text” (optional).

**File:** `src/app/(public)/announcements/[id]/page.tsx`

---

## 2. Auth Routes

### `/login`

**Goal:** Log in existing members via Supabase Auth.

**Responsibilities:**

- Show login form:
  - Email.
  - Password (or later magic link variant).
- On success:
  - Store session.
  - Redirect:
    - To requested page, OR
    - To `/member/profile` as default.

**File:** `src/app/(auth)/login/page.tsx`

---

### `/register`

**Goal:** Register new members and collect full profile info.

**Responsibilities:**

- Multi-step form:

  1. Basic info – full name, email, global phone capture (country code selector), city, country, and time zone.
  2. Swimming experience & goals – level, deep-water comfort, preferred strokes (multi-select), interests/goals, and any certifications (coach, lifeguard, CPR, first aid).
  3. Logistics & availability – preferred locations worldwide, ability to travel/relocate, local facility access, time-of-day availability, and equipment needs.
  4. Safety & medical info – emergency contact (name, relationship, phone, region) and optional safety/medical notes.
  5. Community engagement & consents – discovery source, social handles, volunteer interest, language preference, communication preference, payment readiness + currency preference, photo/video consent, and membership tier selection that supports choosing Community, Club, Academy in any combination.
  6. Agreement to guidelines & privacy (include any regional addenda if required).
- Show conditional fields only when relevant (e.g., additional info when “Coach” certification or “Academy” tier is selected).

- On completion:
  - Create Supabase user.
  - Call backend `POST /api/v1/members/`.
  - Redirect to a “Welcome / Next steps” state (e.g. profile page or WhatsApp group links).

**File:** `src/app/(auth)/register/page.tsx`

---

## 3. Member Routes

### `/member/profile`

**Goal:** Let members view and update their profile.

**Responsibilities:**

- Display fields from member profile.
- Allow editing of:
  - Contact info.
  - Swimming level.
  - Availability.
  - Consents (subject to backend rules).
- Show:
  - Membership status.
  - Role (member, volunteer, etc.).

**File:** `src/app/(member)/profile/page.tsx`

---

### `/member/attendance`

**Goal:** Show member’s attendance history and summary.

**Responsibilities:**

- Fetch from backend:
  - Summary: e.g. “You’ve attended 7 sessions in the last 2 months.”
  - List of sessions attended with:
    - Date.
    - Location.
    - Status (registered, confirmed_paid, no_show).
- Present in a simple list or table.

**File:** `src/app/(member)/attendance/page.tsx`

---

## 4. Sessions & Sign-in

### `/sessions`

**Goal:** Show list of upcoming sessions relevant to members.

**Responsibilities:**

- Fetch upcoming sessions:
  - Title.
  - Type (club_training, meetup, etc.).
  - Location.
  - Date/time.
  - Fees (pool + optional ride-share).
- Provide:
  - “View details” button → `/sessions/[id]`.
  - “Sign in” button → `/sessions/[id]/sign-in`.

**File:** `src/app/(sessions)/sessions/page.tsx`

_(If you want a separate details page, you may add `/sessions/[id]/page.tsx` later.)_

---

### `/sessions/[id]/sign-in`

**Goal:** Implement 3-step sign-in flow started from a WhatsApp link.

**Responsibilities:**

- Step 1:
  - Fetch session details.
  - Show summary: date, time, location, fees.
- Step 2:
  - If logged in:
    - Show “Signing in as [Name]”.
  - If not logged in:
    - Prompt login.
- Step 3:

  - Show default options:
    - Attend full session.
    - No ride-share.
  - Optional “More options” to:
    - Adjust time (arrive late / leave early).
    - Set ride-share role and seats.
  - On submit, call `POST /api/v1/sessions/{id}/sign-in`.

- Confirmation:
  - Show:
    - Status (“Registered – awaiting payment” or similar).
    - Payment breakdown and reference.

**File:** `src/app/(sessions)/sessions/[id]/sign-in/page.tsx`

---

## 5. Admin Routes

All admin pages live under `(admin)` and require admin role.

### `/admin/dashboard`

**Goal:** High-level admin overview.

**Responsibilities:**

- Show:
  - Total members (active/inactive).
  - Upcoming sessions with sign-in counts.
  - Recent announcements.

**File:** `src/app/(admin)/dashboard/page.tsx`

---

### `/admin/members`

**Goal:** Admin view/control of members.

**Responsibilities:**

- Table with:
  - Name, email, phone.
  - Swimming level.
  - Location preference.
  - Membership status.
- Filters by:
  - Level.
  - Location.
  - Status.
  - Volunteer interest.
- Action:
  - Change membership status (active/inactive/banned).

**File:** `src/app/(admin)/members/page.tsx`

---

### `/admin/sessions`

**Goal:** Admin management of sessions.

**Responsibilities:**

- List upcoming sessions with:
  - Title, type, location.
  - Date/time.
  - Sign-in count (if available).
- Actions:
  - Create new session.
  - Edit existing session.
  - Link to attendance view for each session.

**File:** `src/app/(admin)/sessions/page.tsx`

---

### `/admin/sessions/[id]/attendance`

**Goal:** Admin attendance and pool-list view for a session.

**Responsibilities:**

- Table of attendees:
  - Member name.
  - Level.
  - Ride-share role.
  - Payment status.
- Controls:
  - Mark payment as confirmed.
  - Mark no-show after session.
- Button:
  - “Download pool list” (calls backend export endpoint).

**File:** `src/app/(admin)/sessions/[id]/attendance/page.tsx`

---

### `/admin/announcements`

**Goal:** Admin management of announcements.

**Responsibilities:**

- List all announcements.
- Form to create new or edit existing announcement.
- Show “Copy to WhatsApp” preview text for each announcement.

**File:** `src/app/(admin)/announcements/page.tsx`

---

This file is the **single source of truth** for what pages exist and what they should do.  
Any new route must be added here with its responsibilities before implementation.
