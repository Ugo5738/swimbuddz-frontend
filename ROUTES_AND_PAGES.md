# Frontend Routes & Pages

Complete reference for all routes in the SwimBuddz Next.js application.

**Total Pages:** 103

---

## Route Groups

| Group                               | Pages | Description                                     |
| ----------------------------------- | ----- | ----------------------------------------------- |
| [Public Routes](#public-routes)     | 19    | Accessible without authentication               |
| [Auth Routes](#auth-routes)         | 7     | Authentication flows (login, register, confirm) |
| [Member Routes](#member-routes)     | 26    | Authenticated member dashboards and features    |
| [Coach Routes](#coach-routes)       | 2     | Coach application and onboarding                |
| [Sessions Routes](#sessions-routes) | 1     | Public sessions list                            |
| [Admin Routes](#admin-routes)       | 48    | Administrative tools and management             |

---

## Public Routes

**19 pages** - Accessible to all visitors

### Landing & Info Pages

| Route                   | File                                             | Purpose                                             |
| ----------------------- | ------------------------------------------------ | --------------------------------------------------- |
| `/`                     | `src/app/page.tsx`                               | Landing page - Explain SwimBuddz and drive sign-ups |
| `/about`                | `src/app/(public)/about/page.tsx`                | About page - SwimBuddz story and values             |
| `/academy`              | `src/app/(public)/academy/page.tsx`              | Academy landing - Program information and benefits  |
| `/club`                 | `src/app/(public)/club/page.tsx`                 | Club landing - Training information                 |
| `/community`            | `src/app/(public)/community/page.tsx`            | Community landing - Social swimming information     |
| `/guidelines-and-rules` | `src/app/(public)/guidelines-and-rules/page.tsx` | Community rules and safety guidelines               |
| `/membership`           | `src/app/(public)/membership/page.tsx`           | Membership information and tiers                    |
| `/privacy`              | `src/app/(public)/privacy/page.tsx`              | Privacy policy                                      |
| `/sessions-and-events`  | `src/app/(public)/sessions-and-events/page.tsx`  | Sessions and events information                     |

### Announcements

| Route                 | File                                           | Purpose                    |
| --------------------- | ---------------------------------------------- | -------------------------- |
| `/announcements`      | `src/app/(public)/announcements/page.tsx`      | List of announcements      |
| `/announcements/[id]` | `src/app/(public)/announcements/[id]/page.tsx` | Single announcement detail |

### Gallery

| Route           | File                                     | Purpose                    |
| --------------- | ---------------------------------------- | -------------------------- |
| `/gallery`      | `src/app/(public)/gallery/page.tsx`      | Photo/video galleries list |
| `/gallery/[id]` | `src/app/(public)/gallery/[id]/page.tsx` | Single gallery detail      |

### Store (Public)

| Route                   | File                                             | Purpose                      |
| ----------------------- | ------------------------------------------------ | ---------------------------- |
| `/store`                | `src/app/(public)/store/page.tsx`                | Store home - Browse products |
| `/store/cart`           | `src/app/(public)/store/cart/page.tsx`           | Shopping cart                |
| `/store/checkout`       | `src/app/(public)/store/checkout/page.tsx`       | Checkout flow                |
| `/store/product/[slug]` | `src/app/(public)/store/product/[slug]/page.tsx` | Product detail page          |

### Verification

| Route          | File                                    | Purpose                    |
| -------------- | --------------------------------------- | -------------------------- |
| `/verify/[id]` | `src/app/(public)/verify/[id]/page.tsx` | Email verification handler |

---

## Auth Routes

**7 pages** - Authentication and registration flows

### Login & Registration

| Route               | File                                       | Purpose                                       |
| ------------------- | ------------------------------------------ | --------------------------------------------- |
| `/login`            | `src/app/(auth)/login/page.tsx`            | Login with Supabase Auth                      |
| `/register`         | `src/app/(auth)/register/page.tsx`         | Multi-step registration form                  |
| `/register/pending` | `src/app/(auth)/register/pending/page.tsx` | "Check your email" message after registration |
| `/register/success` | `src/app/(auth)/register/success/page.tsx` | Registration success confirmation             |

### Email & Confirmation

| Route                  | File                                          | Purpose                                        |
| ---------------------- | --------------------------------------------- | ---------------------------------------------- |
| `/resend-confirmation` | `src/app/(auth)/resend-confirmation/page.tsx` | Resend confirmation email                      |
| `/confirm`             | `src/app/(auth)/confirm/page.tsx`             | Email confirmation page                        |
| `/auth/callback`       | `src/app/auth/callback/route.ts`              | Supabase auth callback handler (Route Handler) |

---

## Member Routes

**26 pages** - Authenticated member features

### Dashboards

| Route              | File                                        | Purpose                                       |
| ------------------ | ------------------------------------------- | --------------------------------------------- |
| `/account`         | `src/app/(member)/account/page.tsx`         | Main member dashboard                         |
| `/account/profile` | `src/app/(member)/account/profile/page.tsx` | View/edit member profile                      |
| `/account/coach`   | `src/app/(member)/account/coach/page.tsx`   | Coach dashboard (for members who are coaches) |

### Onboarding

| Route                 | File                                           | Purpose                                   |
| --------------------- | ---------------------------------------------- | ----------------------------------------- |
| `/account/onboarding` | `src/app/(member)/account/onboarding/page.tsx` | Member onboarding flow after registration |

### Sessions & Attendance

| Route                         | File                                                   | Purpose                         |
| ----------------------------- | ------------------------------------------------------ | ------------------------------- |
| `/account/sessions`           | `src/app/(member)/account/sessions/page.tsx`           | Member's upcoming sessions      |
| `/sessions/[id]/sign-in`      | `src/app/(member)/sessions/[id]/sign-in/page.tsx`      | Three-step session sign-in flow |
| `/account/attendance/history` | `src/app/(member)/account/attendance/history/page.tsx` | Attendance history and stats    |

### Academy (Member)

| Route                                 | File                                                           | Purpose                                  |
| ------------------------------------- | -------------------------------------------------------------- | ---------------------------------------- |
| `/account/academy`                    | `src/app/(member)/account/academy/page.tsx`                    | Academy dashboard - Member's enrollments |
| `/account/academy/browse`             | `src/app/(member)/account/academy/browse/page.tsx`             | Browse available programs                |
| `/account/academy/programs/[id]`      | `src/app/(member)/account/academy/programs/[id]/page.tsx`      | Program detail page                      |
| `/account/academy/cohorts/[id]`       | `src/app/(member)/account/academy/cohorts/[id]/page.tsx`       | Cohort detail page                       |
| `/account/academy/enrollments/[id]`   | `src/app/(member)/account/academy/enrollments/[id]/page.tsx`   | Enrollment detail and progress           |
| `/account/academy/enrollment-success` | `src/app/(member)/account/academy/enrollment-success/page.tsx` | Post-enrollment confirmation             |

### Billing & Orders

| Route                  | File                                            | Purpose                          |
| ---------------------- | ----------------------------------------------- | -------------------------------- |
| `/account/billing`     | `src/app/(member)/account/billing/page.tsx`     | Payment history and billing info |
| `/account/orders`      | `src/app/(member)/account/orders/page.tsx`      | Store orders list                |
| `/account/orders/[id]` | `src/app/(member)/account/orders/[id]/page.tsx` | Order detail page                |
| `/checkout`            | `src/app/(member)/checkout/page.tsx`            | General checkout flow            |

### Community Features

| Route                                      | File                                                                | Purpose                                                |
| ------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------ |
| `/community/coaches`                       | `src/app/(member)/community/coaches/page.tsx`                       | Browse coaches directory                               |
| `/community/directory`                     | `src/app/(member)/community/directory/page.tsx`                     | Member directory                                       |
| `/community/events`                        | `src/app/(member)/community/events/page.tsx`                        | Community events list                                  |
| `/community/events/[id]`                   | `src/app/(member)/community/events/[id]/page.tsx`                   | Event detail and RSVP                                  |
| `/community/tips`                          | `src/app/(member)/community/tips/page.tsx`                          | Swimming tips library                                  |
| `/community/tips/[id]`                     | `src/app/(member)/community/tips/[id]/page.tsx`                     | Single tip detail                                      |
| `/community/volunteers`                    | `src/app/(member)/community/volunteers/page.tsx`                    | Volunteer hub — profile, opportunities, roles, rewards |
| `/community/volunteers/opportunities`      | `src/app/(member)/community/volunteers/opportunities/page.tsx`      | Browse all open volunteer opportunities                |
| `/community/volunteers/opportunities/[id]` | `src/app/(member)/community/volunteers/opportunities/[id]/page.tsx` | Opportunity detail — claim/cancel slot                 |
| `/community/volunteers/leaderboard`        | `src/app/(member)/community/volunteers/leaderboard/page.tsx`        | Volunteer leaderboard (all-time and monthly)           |

### Upgrade Flows

| Route                      | File                                                | Purpose                             |
| -------------------------- | --------------------------------------------------- | ----------------------------------- |
| `/upgrade/academy/cohort`  | `src/app/(member)/upgrade/academy/cohort/page.tsx`  | Upgrade to academy - Select cohort  |
| `/upgrade/academy/details` | `src/app/(member)/upgrade/academy/details/page.tsx` | Academy upgrade - Program details   |
| `/upgrade/club/plan`       | `src/app/(member)/upgrade/club/plan/page.tsx`       | Upgrade to club - Select plan       |
| `/upgrade/club/readiness`  | `src/app/(member)/upgrade/club/readiness/page.tsx`  | Club upgrade - Readiness assessment |

---

## Coach Routes

**2 pages** - Coach-specific features

| Route               | File                                        | Purpose                |
| ------------------- | ------------------------------------------- | ---------------------- |
| `/coach/apply`      | `src/app/(coach)/coach/apply/page.tsx`      | Coach application form |
| `/coach/onboarding` | `src/app/(coach)/coach/onboarding/page.tsx` | Coach onboarding flow  |

---

## Sessions Routes

**1 page** - Public sessions

| Route       | File                                   | Purpose                       |
| ----------- | -------------------------------------- | ----------------------------- |
| `/sessions` | `src/app/(sessions)/sessions/page.tsx` | List of all upcoming sessions |

---

## Admin Routes

**48 pages** - Administrative tools (requires admin role)

### Admin Dashboard

| Route              | File                                       | Purpose                              |
| ------------------ | ------------------------------------------ | ------------------------------------ |
| `/admin/dashboard` | `src/app/(admin)/admin/dashboard/page.tsx` | Main admin dashboard with statistics |

### Members Management

| Route                    | File                                             | Purpose                             |
| ------------------------ | ------------------------------------------------ | ----------------------------------- |
| `/admin/members`         | `src/app/(admin)/admin/members/page.tsx`         | List all members with filters       |
| `/admin/members/[id]`    | `src/app/(admin)/admin/members/[id]/page.tsx`    | Single member detail and management |
| `/admin/members/pending` | `src/app/(admin)/admin/members/pending/page.tsx` | Pending member registrations        |

### Sessions Management

| Route                             | File                                                      | Purpose                                      |
| --------------------------------- | --------------------------------------------------------- | -------------------------------------------- |
| `/admin/sessions`                 | `src/app/(admin)/admin/sessions/page.tsx`                 | List/manage all sessions                     |
| `/admin/sessions/[id]/attendance` | `src/app/(admin)/admin/sessions/[id]/attendance/page.tsx` | Session attendance list and pool list export |

### Attendance Management

| Route               | File                                        | Purpose                      |
| ------------------- | ------------------------------------------- | ---------------------------- |
| `/admin/attendance` | `src/app/(admin)/admin/attendance/page.tsx` | Global attendance management |

### Announcements Management

| Route                  | File                                           | Purpose                   |
| ---------------------- | ---------------------------------------------- | ------------------------- |
| `/admin/announcements` | `src/app/(admin)/admin/announcements/page.tsx` | Create/edit announcements |

### Payments Management

| Route             | File                                      | Purpose                          |
| ----------------- | ----------------------------------------- | -------------------------------- |
| `/admin/payments` | `src/app/(admin)/admin/payments/page.tsx` | Payment records and verification |

### Discounts Management

| Route              | File                                       | Purpose               |
| ------------------ | ------------------------------------------ | --------------------- |
| `/admin/discounts` | `src/app/(admin)/admin/discounts/page.tsx` | Manage discount codes |

### Coaches Management

| Route                 | File                                          | Purpose                     |
| --------------------- | --------------------------------------------- | --------------------------- |
| `/admin/coaches`      | `src/app/(admin)/admin/coaches/page.tsx`      | List all coaches            |
| `/admin/coaches/[id]` | `src/app/(admin)/admin/coaches/[id]/page.tsx` | Coach detail and management |

### Academy Management (Admin)

| Route                                     | File                                                              | Purpose                      |
| ----------------------------------------- | ----------------------------------------------------------------- | ---------------------------- |
| `/admin/academy`                          | `src/app/(admin)/admin/academy/page.tsx`                          | Academy overview dashboard   |
| `/admin/academy/page`                     | `src/app/(admin)/admin/academy/page/page.tsx`                     | Academy landing page editor  |
| `/admin/academy/programs/new`             | `src/app/(admin)/admin/academy/programs/new/page.tsx`             | Create new program           |
| `/admin/academy/programs/[id]`            | `src/app/(admin)/admin/academy/programs/[id]/page.tsx`            | Program management           |
| `/admin/academy/programs/[id]/edit`       | `src/app/(admin)/admin/academy/programs/[id]/edit/page.tsx`       | Edit program details         |
| `/admin/academy/programs/[id]/curriculum` | `src/app/(admin)/admin/academy/programs/[id]/curriculum/page.tsx` | Curriculum builder/editor    |
| `/admin/academy/cohorts/new`              | `src/app/(admin)/admin/academy/cohorts/new/page.tsx`              | Create new cohort            |
| `/admin/academy/cohorts/[id]`             | `src/app/(admin)/admin/academy/cohorts/[id]/page.tsx`             | Cohort management            |
| `/admin/academy/enrollments`              | `src/app/(admin)/admin/academy/enrollments/page.tsx`              | All enrollments list         |
| `/admin/academy/enrollments/[id]`         | `src/app/(admin)/admin/academy/enrollments/[id]/page.tsx`         | Single enrollment management |

### Gallery Management

| Route                        | File                                                 | Purpose                      |
| ---------------------------- | ---------------------------------------------------- | ---------------------------- |
| `/admin/gallery`             | `src/app/(admin)/admin/gallery/page.tsx`             | Manage photo/video galleries |
| `/admin/gallery/create`      | `src/app/(admin)/admin/gallery/create/page.tsx`      | Create new gallery           |
| `/admin/gallery/[id]/upload` | `src/app/(admin)/admin/gallery/[id]/upload/page.tsx` | Upload media to gallery      |

### Homepage Media Management

| Route                   | File                                            | Purpose                           |
| ----------------------- | ----------------------------------------------- | --------------------------------- |
| `/admin/homepage-media` | `src/app/(admin)/admin/homepage-media/page.tsx` | Manage homepage banners and media |

### Store Management (Admin)

| Route                             | File                                                      | Purpose                      |
| --------------------------------- | --------------------------------------------------------- | ---------------------------- |
| `/admin/store`                    | `src/app/(admin)/admin/store/page.tsx`                    | Store overview dashboard     |
| `/admin/store/products`           | `src/app/(admin)/admin/store/products/page.tsx`           | All products list            |
| `/admin/store/products/new`       | `src/app/(admin)/admin/store/products/new/page.tsx`       | Create new product           |
| `/admin/store/products/[id]/edit` | `src/app/(admin)/admin/store/products/[id]/edit/page.tsx` | Edit product                 |
| `/admin/store/inventory`          | `src/app/(admin)/admin/store/inventory/page.tsx`          | Inventory management         |
| `/admin/store/orders`             | `src/app/(admin)/admin/store/orders/page.tsx`             | All orders list              |
| `/admin/store/orders/[id]`        | `src/app/(admin)/admin/store/orders/[id]/page.tsx`        | Order detail and fulfillment |

### Transport Management

| Route                  | File                                           | Purpose                         |
| ---------------------- | ---------------------------------------------- | ------------------------------- |
| `/admin/transport`     | `src/app/(admin)/admin/transport/page.tsx`     | Transport/ride-share management |
| `/admin/transport/new` | `src/app/(admin)/admin/transport/new/page.tsx` | Create new ride route           |

### Community Content Management

| Route                                            | File                                                                     | Purpose                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `/admin/community/challenges`                    | `src/app/(admin)/admin/community/challenges/page.tsx`                    | Manage community challenges                                      |
| `/admin/community/content`                       | `src/app/(admin)/admin/community/content/page.tsx`                       | Manage community content (tips, articles)                        |
| `/admin/community/events`                        | `src/app/(admin)/admin/community/events/page.tsx`                        | Manage community events                                          |
| `/admin/community/volunteers`                    | `src/app/(admin)/admin/community/volunteers/page.tsx`                    | Volunteer management — dashboard, roles, profiles, opportunities |
| `/admin/community/volunteers/opportunities/[id]` | `src/app/(admin)/admin/community/volunteers/opportunities/[id]/page.tsx` | Admin slot management — approve, check-in/out, no-show           |

---

## Route Protection

### Public Routes

- No authentication required
- Accessible to all visitors

### Auth Routes

- Mixed protection:
  - Login/Register: Public (redirect if already logged in)
  - Callbacks: Public (handle Supabase auth flow)

### Member Routes

- Require authentication
- Use `@supabase/ssr` for session validation
- Redirect to `/login` if not authenticated

### Admin Routes

- Require authentication AND admin role
- Role check via Supabase JWT claims or member record
- Redirect to `/account` if not admin

---

## Layout Structure

```
src/app/
├── layout.tsx                    # Root layout
├── (public)/                     # Public pages group
│   └── layout.tsx               # Public layout (header/footer)
├── (auth)/                      # Auth pages group
│   └── layout.tsx              # Auth layout (centered forms)
├── (member)/                    # Member pages group
│   └── layout.tsx              # Member layout (sidebar nav)
├── (admin)/                     # Admin pages group
│   └── layout.tsx              # Admin layout (admin sidebar)
├── (coach)/                     # Coach pages group
│   └── layout.tsx              # Coach layout
└── (sessions)/                  # Sessions pages group
    └── layout.tsx              # Sessions layout
```

---

## API Integration

All pages interact with the backend via the gateway at `http://localhost:8000` (dev) or `https://api.swimbuddz.com` (prod).

**Type Safety:** TypeScript types are generated from backend OpenAPI spec using `npm run generate:types`.

**API Client:** Centralized in `src/lib/api-client.ts` with typed methods for each service.

---

## Adding New Routes

When adding a new route:

1. Create the page file in the appropriate route group directory
2. Add the route to this document under the correct section
3. Update `UI_FLOWS.md` if it affects user journeys
4. Ensure proper authentication/authorization is implemented
5. Add to the relevant layout's navigation if needed

---

_Last updated: January 2026_
