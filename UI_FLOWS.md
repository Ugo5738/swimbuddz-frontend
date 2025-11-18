# SwimBuddz Frontend – UI Flows

This document describes the key **user flows** in the SwimBuddz frontend.  
The implementation of pages should follow these flows closely.

---

## 1. New Visitor → Registered Member

### Flow: Home → Register → Profile

1. User lands on `/`.
   - Sees hero explaining SwimBuddz.
   - Sees primary CTA: “Join SwimBuddz”.
2. User clicks “Join SwimBuddz”.

   - Navigates to `/register`.

3. On `/register`:

   - Multi-step registration:
     - Step 1: Basic info (name, email, international phone capture, city, country, time zone).
     - Step 2: Swimming level, deep-water comfort, strokes (multi-select), interests/goals (fitness, open water, remote coaching, academy track), certifications/background (coach, lifeguard, CPR).
     - Step 3: Availability and global logistics (preferred locations, ability to travel/relocate, existing pool/open-water access, equipment needs).
     - Step 4: Emergency contact & optional medical info (include region + special safety considerations).
     - Step 5: Community engagement & consents (discovery source, socials, volunteer interest, language preference, comms preference, payment readiness, currency preference, photo/video consent, multi-select membership tiers so users can opt into Community/Club/Academy simultaneously).
     - Step 6: Confirm agreements to guidelines + privacy (with links and any regional policy addenda).
   - Allow multiple membership tiers to be selected simultaneously and surface conditional follow-up fields only when relevant (e.g., coaching credentials, hosting sessions).

4. When user submits final step:

   - Frontend:
     - Creates Supabase user (if not already created).
     - Obtains access token.
     - Calls backend `POST /api/v1/members/` with full profile data.
   - On success:
     - Displays short “Welcome” message.
     - Redirects to `/member/profile`.

5. On `/member/profile`:
   - User sees their saved data.
   - Optional: Show suggested WhatsApp groups and links (based on level & location).

---

## 2. Existing Member → Session Sign-in (3-step flow)

### Flow: WhatsApp Link → Sign-in Page → Confirmation

1. Admin posts sign-in link in WhatsApp:

   - Example:  
     `https://app.swimbuddz.com/sessions/<session_id>/sign-in`

2. Member taps the link:

   - Browser opens `/sessions/<session_id>/sign-in`.

3. On `/sessions/[id]/sign-in`:

   - **Step 1: Session overview**

     - Show session title, type, location.
     - Show date and time (e.g. “Sat 16 Nov, 12–3 pm”).
     - Show pool fee and optional ride-share fee.

   - **Step 2: Identity**

     - If authenticated:
       - Show “Signing in as [Full Name]”.
       - Display a button: “Confirm attendance”.
     - If not authenticated:
       - Display login prompt (either inline or via redirect to `/login` then back).
       - After login, resume sign-in flow.

   - **Step 3: Options & Submit**

     - Default:
       - Attend full session.
       - No ride-share.
     - Optional “More options” collapsible section:

       - Toggle time variant:
         - Arriving late.
         - Leaving early.
         - Custom note.
       - Ride-share:
         - I need a ride → passenger.
         - I have a car and can take X people → driver + seat count.
         - I’m going by myself.

     - Submit:
       - Calls `POST /api/v1/sessions/{id}/sign-in`.

4. After successful sign-in:

   - Show confirmation page/section:
     - “You’re confirmed for Yaba – Sat 16 Nov, 12–3 pm (pending payment confirmation).”
     - Show breakdown: pool fee + ride-share fee + total.
     - Show payment instructions from backend (account details & reference).

---

## 3. Member → View Attendance History

### Flow: Profile → Attendance

1. Member logs in and goes to `/member/profile`.

   - Nav shows a link to “Attendance”.

2. Member clicks “Attendance”.

   - Navigates to `/member/attendance`.

3. On `/member/attendance`:

   - Fetch data from `GET /api/v1/members/me/attendance`.
   - Show top summary:
     - Example: “You’ve attended 7 sessions in the last 2 months.”
   - Below, list each attended session:
     - Date.
     - Location.
     - Type (club, meetup, trip).
     - Status (registered, confirmed_paid, no_show).
   - Optionally allow filtering by date range.

---

## 4. Admin → Manage Sessions & Attendance

### Flow: Admin Dashboard → Sessions → Session Attendance

1. Admin logs in and navigates to `/admin/dashboard`.

   - Sees basic metrics: total members, upcoming sessions, latest announcements.

2. Admin clicks “Sessions”.

   - Navigates to `/admin/sessions`.

3. On `/admin/sessions`:

   - See table of upcoming sessions:
     - Title, type, location, date, and sign-in counts.
   - Can:
     - Create new session via a button and form.
     - Click on a session row to manage attendance.

4. Admin clicks on a session row.

   - Navigates to `/admin/sessions/[id]/attendance`.

5. On `/admin/sessions/[id]/attendance`:

   - See table of attendees:
     - Name, level, ride-share role, payment status.
   - Can:
     - Mark payment as confirmed for each attendee.
     - Mark no-shows after the session.
   - Can:
     - Click “Download pool list” to download or view a pool-ready list.

---

## 5. Admin → Announcements & WhatsApp Copy

### Flow: Admin Dashboard → Announcements

1. Admin goes to `/admin/announcements`.

2. On `/admin/announcements`:

   - See list of existing announcements:
     - Title, date, category.
   - Can:
     - Create new announcement via form:
       - Title.
       - Category (e.g. rain-update, event, general).
       - Full content/body.

3. After creating an announcement:

   - The detail view shows:
     - Announcement content.
     - A “Copy for WhatsApp” button.
       - Copies formatted text to clipboard (simple text formatting).
     - A “Copy for email” button (optional).

---

## 6. Public User → Announcements

### Flow: Home → Announcements

1. User lands on `/`.

   - Sees link “Announcements / News”.

2. User clicks link.

   - Navigates to `/announcements`.

3. On `/announcements`:

   - Sees list of announcements in reverse chronological order.
   - Clicks one to view full details on `/announcements/[id]`.

---

The components and pages you build should follow these flows closely.  
If UI complexity is added, keep the underlying flow and endpoints the same.
