# SwimBuddz Frontend – UI Flows

This document describes the key **user flows** in the SwimBuddz frontend.
The implementation of pages should follow these flows closely.

**Last Updated:** September 2026
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

   - Step 1: choose a starting path—Annual SwimBuddz Membership, Club
     practice, or an Academy programme. This records intent; it does not grant
     programme access.
   - Step 2: create the account with essential identity/contact details.
   - Step 3: review the selected path and accept the community rules.
   - Club and Academy remain independent programmes. Neither is presented as a
     higher membership rank, and selecting Academy never implies Club access.

4. When user submits final step:

   - Frontend:
     - Calls backend `POST /api/v1/pending-registrations` with full profile data.
     - Creates Supabase user (sign-up).
   - On success:
     - Displays “Check your email” screen.

5. User clicks confirmation link in email:

   - Supabase verifies email and redirects to `/auth/callback`.
   - App calls `POST /api/v1/pending-registrations/complete`.
   - Redirects to the shared account onboarding flow, preserving the selected
     path or cohort deep link.

6. In account onboarding, the member completes the shared profile, safety
   contacts, logistics, and swimming background once. Product-specific steps
   then continue in Club readiness or Academy cohort selection.

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
     - For Club sessions, require acknowledgement of the linked Club Standards before booking.

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

### Included Academy classes and paid extras

- Cohort-generated regular classes use `cohort_fee_mode=included`. Enrolled
  students book at ₦0 even if a nonzero operating/pool rate is stored.
- To offer extra practice, use Admin Sessions or the cohort's Add Session form:
  select **Paid extra class**, set the per-student price/capacity, and publish.
  Eligible students use the normal session link/dashboard checkout. Successful
  payment confirms and links the booking automatically; discounts and Bubbles
  remain supported. Pending payment must not display a confirmed booking.
- Cost-plus spreads shared operating costs over expected attendance (never above
  capacity). Manual pricing is simply the per-student amount. Neither reprices
  an already-paid booking after the fact.
- Admin Attendance can search for a registered member outside the roster to
  record an actual past swim. This does not collect payment or activate Club.
  **Record paid** records verified off-platform funds against an outstanding
  booking. It is separate from an outgoing coach payout and uses the existing
  incoming-payment/ledger workflow.
- **Correct missing class fee** is restricted to legacy unpriced paid-extra
  bookings and requires a verification reason. It creates no payment and cannot
  rewrite a paid, priced or deliberately included booking.
- Session templates can be archived/restored. Archived templates cannot generate
  sessions. Permanent deletion remains available for unused templates; linked
  templates must be archived to preserve their sessions and bookings.
- Academy templates require a cohort and an explicit class-payment setting.
  Generation preserves both: tuition-included stays free, and paid extras use
  the configured per-student price. Edit older Academy templates to choose the
  cohort before generating; the system never guesses billing from a title.
- Admin payment review loads the submitted receipt from its media UUID through
  authenticated access, and supports an allocation/reference review note.

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

## 10. Member → View or Book Community Activities

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
   - For a social Event or peer-organised `open_swim`, clicks "RSVP".
   - For an official Community Swim with a linked operational Session, clicks
     "View and book session". The Session flow owns capacity, guests, payment,
     attendance, volunteer roles, ride-share, and media assignments; Event RSVP
     is not duplicated.

3. Confirmation:

   - If authenticated:
     - Social Event: calls `POST /api/v1/events/{id}/rsvp` and shows
       "You're registered!".
     - Official Community Swim: continues through the linked Session booking
       flow and its booking/payment confirmation.
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

Annual Membership supports Paystack or Bank Transfer. Billing includes an
**Already paid?** link for inactive members; it selects Bank Transfer, and
**Continue to upload receipt** opens the pending receipt section after creating
a payment reference. The payment remains pending until Admin verifies it.
Combined transfers need explicit Membership/session allocations, not duplicate
payments or discount codes. All receiving-account displays use the shared
`src/lib/bank-transfer.ts` configuration.

Published Club plans can attach a previously absent optional same-quarter
Community Experience in Admin Club Pricing. This leaves all Club commercial
terms unchanged and adds an unselected checkout option; it cannot replace an
existing link. Merely creating an offering does not attach it to a Club plan.

Member navigation shows Make-ups only for members with Academy payment/history,
including members who also have Club. Stroke Lab links to
`https://analyzer.swimbuddz.com`; old `/account/strokelab` reports remain available.

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

---

## 14. Session Media Capture → Social Handoff

### Admin setup

1. Admin opens `/admin/media-vault` and chooses a scheduled session.
2. The vault inherits its title, date, time and venue, opens four hours before
   the session, and closes 24 hours afterward.
3. The backend mirrors `media` volunteers as uploaders and `gallery_support`
   volunteers as curators. Admin can sync, add, expire or revoke access.
4. If the photographer has no account, admin creates a revocable guest link.
   The secret URL is shown once.

### Contributor upload

1. Contributor opens the assignment or guest link on their phone.
2. They select any number of full-quality image/video files, complete the shot
   checklist, read the opt-out notice, attest consent and optionally leave
   handoff notes.
3. Files go directly to private S3 in resumable chunks with live per-file
   progress. Network failures keep resumable browser state; the contributor
   reselects the same local files and taps Resume.
4. The backend accepts each item only after S3 verifies its exact byte length.
   Curators are notified when the batch is complete.

### Curator review and publication

1. Curator/admin opens the vault Review tab. Full originals are not loaded into
   the grid automatically.
2. They select items and explicitly request lightweight previews as needed.
3. They shortlist, approve/reject and separately mark consent clear/restricted.
   Fingerprint matches are shown as possible duplicates.
4. One selected original downloads directly; multiple originals create a
   background ZIP that expires after 24 hours. Each authorization and known
   byte count is written to the transfer ledger.
5. Publish succeeds only for approved/shortlisted and consent-cleared items.
   Publishing copies the original bytes into a gallery album; the private
   source remains the system of record.
6. Access & Links manages people/capabilities. Exports & Bandwidth shows ZIP
   status, upload bytes, authorized downloads and client-confirmed downloads.

The product does not automatically transcode originals and does not use AI in
this flow.

---

## 15. Member → Club Application → Assessment → Payment

1. The member completes the Club safety pre-assessment.
2. They choose an operating area, then an active partner pool/Club location,
   followed by quarter plans. If at least five sessions
   remain, the prorated current quarter is required; with four or fewer sessions
   remaining, the UI directs them to Community/drop-in swims until next quarter.
   Future quarters are optional, start unselected, and must be consecutive.
3. The current-quarter Community Experience appears as an optional, separately
   priced item selected by default. It is ₦30,000 with the current Club checkout,
   ₦40,000 for an active Club member buying later, or ₦50,000 at the standard
   member rate. Every new quarter starts a new experience purchase.
4. The member may request an available pod at the selected location, then submits
   the application.
5. Admin conducts the in-pool assessment, records the baseline and selects
   Club-ready, Club-ready with modified participation, or Academy first. For a
   Club-ready outcome, Admin explicitly allows quarterly prepaid, the temporary
   2026 pay-per-session transition, or both. Transition approval records the
   expiry only; each session's Admin-set price remains authoritative. The result
   can be emailed from the review screen.
6. An approved member sees only the payment arrangements enabled on their
   application. If both are enabled, they choose one. Checkout retrieves the
   application price from the server and presents each selected Club quarter,
   or a ₦0 transition enrollment, plus annual SwimBuddz Membership if due,
   enabled online payment charges, and the total as separate lines. A transition
   activation never carries the quarterly Community Experience bundle; that
   remains a separate explicit purchase. Transition sessions are paid later at
   each session's current Admin-set price when booked.
7. Starting checkout reserves plan and preferred-pod capacity for 30 minutes.
   Successful payment consumes the reservation and creates a separate dated,
   location-specific entitlement for each paid quarter, so a future quarter
   cannot unlock sessions today.
8. A Club session's server access result determines its member price: prepaid
   quarter is included (₦0), active transition uses its snapshotted rate, and an
   annual member uses the Community drop-in rate only when Admin enabled
   drop-ins on that session. Guest pricing remains independent.
9. A later Club quarter can reuse a completed Club-ready assessment, with its
   source application recorded. It remains a member-selected purchase and does
   not auto-enroll or auto-charge.

## 16. Referrer → Self-paying Guest → Follow-up

1. A member/admin shares `/guest-pass/session/{sessionId}?ref={code}`. The
   referrer does not need to book or attend.
2. The guest enters name, email, and phone, accepts the safety waiver, separately
   chooses marketing consent, and pays the session's guest price.
3. An unpaid guest pass reserves one place for 30 minutes. Expired holds stop
   reducing availability; the public status page shows a redacted receipt. Guest identity, safeguarding
   data, assessment, and referral data remain admin-only.
4. Admin records attendance and actual swim minutes, then optionally emails the
   guest assessment result.
5. A first paid, attended guest pass with a referrer emits one idempotent reward
   event. The existing wallet reward engine grants the referrer 10 Bubbles; it is
   not a cash payment and repeat visits do not repeat the acquisition reward.
6. Guest, Community drop-in, and Club/member prices remain independently
   configurable per session/location.
7. Guest swim minutes contribute to aggregate swimmer-hours. If the guest later
   becomes a member, matched historical guest hours follow their lifetime total
   and leave the guest bucket so the same minutes are never counted twice.

## 17. Member → Community Experience

1. A standard member opens `/community/experiences` and receives the current
   quarter's server quote at ₦50,000.
2. An active Club member buying the same experience later receives the ₦40,000
   Club-later price.
3. A Club applicant buying it with the current Club quarter receives the
   ₦30,000 bundle price through Club checkout instead.
4. Payment charges, when enabled for this payment purpose and method, are shown
   transparently before payment. The admin may configure an additive fee or a
   gross-up calculation, cap it, waive it, or turn it off.

## 18. Learner → Academy Checkout

1. The learner chooses a programme/cohort and an enrollment is created or reused.
2. Checkout requests a server-authoritative quote. Programme/cohort policy is one
   of: open, active annual membership required, or annual membership included in
   the published Academy price.
3. Admins may build the internal published price from cost lines, margin, and an
   upward rounding increment (₦5,000 by default). Learners see the final published
   price and applicable membership line, not the internal margin calculation.
4. Full and installment payments use the same quote policy; membership money is
   not incorrectly counted as an Academy installment.
5. Admin can configure 0–12 months of post-graduation Club eligibility on the
   cohort. Graduation calls the existing bridge idempotently when positive;
   zero or unset grants nothing. This bridge is eligibility, not prepaid Club,
   and Academy enrollment by itself still never implies Club access.
