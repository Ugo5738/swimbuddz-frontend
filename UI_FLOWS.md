# SwimBuddz Frontend – UI Flows

This document describes the key **user flows** in the SwimBuddz frontend.
The implementation of pages should follow these flows closely.

**Last Updated:** January 2026
**Total Routes:** 103 pages across Community, Club, Academy, Store, Events, and Admin domains

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
     - Calls backend `POST /api/v1/pending-registrations` with full profile data.
     - Creates Supabase user (sign-up).
   - On success:
     - Displays “Check your email” screen.

5. User clicks confirmation link in email:
   - Supabase verifies email and redirects to `/auth/callback`.
   - App calls `POST /api/v1/pending-registrations/complete`.
   - Redirects to `/member/profile`.

6. On `/member/profile`:
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

## 7. Member → Browse & Purchase Store Items

### Flow: Store → Product → Cart → Checkout

1. Member navigates to `/store`.
   - Sees featured products and categories.
   - Can filter by category, price, availability.

2. Member clicks on a product.
   - Navigates to `/store/products/[slug]`.
   - Sees product details, images, sizes, price.
   - Can add to cart with size/quantity selection.

3. Member clicks "View Cart".
   - Navigates to `/store/cart`.
   - Reviews items, quantities, subtotal.
   - Can update quantities or remove items.
   - Clicks "Proceed to Checkout".

4. On `/store/checkout`:
   - **Step 1: Delivery Info**
     - Name, phone, address fields.
   - **Step 2: Payment**
     - Payment instructions or Paystack integration.
   - Submit order.

5. After successful order:
   - Navigates to `/store/orders/[id]`.
   - Shows order confirmation with order number.
   - Member can track order status.

---

## 8. Member → Enroll in Academy Program

### Flow: Academy → Program → Enrollment → Cohort

1. Member navigates to `/academy`.
   - Sees list of available programs (e.g., "Learn to Swim", "Advanced Techniques").
   - Each program shows duration, price, description.

2. Member clicks on a program.
   - Navigates to `/academy/programs/[id]`.
   - Sees detailed program info:
     - Curriculum modules.
     - Prerequisites.
     - Upcoming cohorts with start dates.
   - Clicks "Enroll" button.

3. On enrollment flow (could be modal or separate page):
   - If authenticated:
     - Select cohort (if multiple available).
     - Confirm enrollment details.
     - Submit: Calls `POST /api/v1/academy/enrollments`.
   - If not authenticated:
     - Redirect to login/register, then return to enrollment.

4. After successful enrollment:
   - Navigates to `/account/academy/enrollments`.
   - Shows enrolled programs with cohort info.
   - Member can access:
     - Program dashboard `/account/academy/programs/[id]`.
     - View curriculum and progress.
     - See cohort members (if enabled).

5. Member tracks progress:
   - On `/account/academy/programs/[id]`:
     - Sees curriculum modules with completion status.
     - Can mark modules complete (if self-paced).
     - View assessments and certificates.

---

## 9. Admin → Manage Academy Programs & Cohorts

### Flow: Admin Dashboard → Academy → Create Cohort

1. Admin navigates to `/admin/academy/programs`.
   - Sees list of all programs.
   - Can create new program or edit existing.

2. Admin clicks on a program.
   - Navigates to `/admin/academy/programs/[id]`.
   - Sees program details and existing cohorts.

3. Admin clicks "Create Cohort".
   - Modal or form appears:
     - Name (e.g., "Batch 5").
     - Start date and end date.
     - Capacity (max students).
     - Enrollment period (open/closed dates).
   - Submit: Calls `POST /api/v1/academy/programs/{id}/cohorts`.

4. Admin manages enrollments:
   - Navigates to `/admin/academy/cohorts/[id]`.
   - Sees enrolled students list.
   - Can manually enroll/unenroll students.
   - Can track progress for each student.

5. Admin reviews progress:
   - On `/admin/academy/cohorts/[id]/progress`:
     - Table showing each student's completion status.
     - Can export data or view detailed reports.

---

## 10. Member → View & RSVP to Community Events

### Flow: Events → Event Detail → RSVP

1. Member navigates to `/events`.
   - Sees list of upcoming community events.
   - Events show: title, date, location, type (meetup, social, trip).

2. Member clicks on an event.
   - Navigates to `/events/[id]`.
   - Sees full event details:
     - Description, organizer.
     - Date, time, location.
     - RSVP count and attendee list (if public).
   - Clicks "RSVP" button.

3. RSVP confirmation:
   - If authenticated:
     - Calls `POST /api/v1/events/{id}/rsvp`.
     - Shows "You're registered!" message.
   - If not authenticated:
     - Redirect to login, then return to RSVP.

4. Member views their RSVPs:
   - On `/account/events`:
     - List of all events they've RSVP'd to.
     - Can cancel RSVP if needed.

---

## 11. Member → Browse Media Galleries

### Flow: Media → Gallery → Photos

1. Member navigates to `/media`.
   - Sees list of media galleries.
   - Galleries organized by: session, event, trip.

2. Member clicks on a gallery.
   - Navigates to `/media/galleries/[id]`.
   - Sees grid of photos/videos from that event.
   - Can click to view full-size images.
   - Can download images (if enabled).

3. Admin uploads media:
   - On `/admin/media/galleries/[id]`:
     - Upload form for photos/videos.
     - Calls `POST /api/v1/media/galleries/{id}/upload`.
     - Can organize, tag, or delete media.

---

## 12. Admin → Manage Payments & Verify Records

### Flow: Admin Dashboard → Payments → Verify

1. Admin navigates to `/admin/payments`.
   - Sees list of recent payment records.
   - Can filter by: status, member, date range.

2. Admin clicks on a payment record.
   - Navigates to `/admin/payments/[id]`.
   - Sees payment details:
     - Member name, amount, reference.
     - Session/program linked to payment.
     - Status (pending, confirmed, failed).

3. Admin verifies payment:
   - Checks bank statement or Paystack dashboard.
   - Clicks "Mark as Verified".
   - Calls `PATCH /api/v1/payments/{id}` to update status.

4. Admin views payment dashboard:
   - On `/admin/payments/dashboard`:
     - Summary metrics: total collected, pending verification.
     - Charts by month, payment method.
     - Export functionality for accounting.

---

## 13. Member → Manage Transport/Ride-Share

### Flow: Session Sign-in → Select Ride-Share

1. Member signs in for a session (see Flow #2).

2. In "Step 3: Options & Submit" section:
   - Expands "Ride-share" options:
     - **I need a ride (passenger)**:
       - Select pickup location from available areas.
       - See estimated cost.
     - **I can drive (lead)**:
       - Select pickup location.
       - Specify number of seats offered.
       - Set transport fee (defaults to suggested).
     - **No ride-share**:
       - Default option.

3. After sign-in confirmation:
   - On confirmation page, shows ride-share details:
     - If passenger: "You'll be picked up at [Location]".
     - If driver: "You're offering [X] seats from [Location]".

4. Admin coordinates rides:
   - On `/admin/sessions/[id]/attendance`:
     - See ride-share column showing:
       - Drivers with available seats.
       - Passengers looking for rides.
       - Matches passengers to drivers at same pickup location.

---

## Flow Summary

The SwimBuddz platform supports these primary user journeys:

### Public Flows

- Home → Register → Profile
- Home → Announcements
- Home → Events → RSVP

### Member Flows

- Session Sign-in (3-step: overview → identity → options)
- View Attendance History
- Browse Store → Purchase
- Enroll in Academy Program → Track Progress
- RSVP to Events
- Browse Media Galleries
- Manage Transport/Ride-Share

### Admin Flows

- Manage Sessions & Attendance
- Create Announcements
- Manage Academy Programs & Cohorts
- Manage Store Orders
- Verify Payments
- Coordinate Ride-Sharing

---

The components and pages you build should follow these flows closely.
If UI complexity is added, keep the underlying flow and endpoints the same.

For complete route reference, see [ROUTES_AND_PAGES.md](./ROUTES_AND_PAGES.md).
