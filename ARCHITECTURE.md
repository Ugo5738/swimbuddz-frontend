# SwimBuddz Frontend – Architecture

This document describes the **frontend architecture** for the SwimBuddz web app.

Goals:

- Provide a **mobile-first**, fast, and clear UI for:
  - Members (Community + Club + Academy).
  - Admins and volunteers.
  - New visitors discovering SwimBuddz.
- Integrate cleanly with:
  - The SwimBuddz backend gateway (`/api/v1/...` as defined in API_CONTRACT.md in the backend repo).
  - Supabase Auth for authentication.
- Be easy for AI agents and humans to extend without breaking structure.

---

## 1. Tech Stack

- **Framework:** Next.js (App Router, `src/app`), React, TypeScript.
- **Styling:** Tailwind CSS.
- **UI Library:** shadcn/ui style components (or equivalent) built in `src/components/ui/`.
- **State Management:** Lightweight:
  - React hooks + context.
  - No global Redux unless explicitly added later.
- **Auth:** Supabase Auth (email-based).
  - Supabase client created on the frontend using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  - Access tokens sent to the backend as `Authorization: Bearer <token>`.

---

## 2. Directory Structure

Top-level (simplified):

```bash
swimbuddz-frontend/
  ARCHITECTURE.md
  AGENT_INSTRUCTIONS.md
  CONVENTIONS.md
  ROUTES_AND_PAGES.md
  UI_FLOWS.md
  TODO.md
  .env.example
  package.json
  next.config.mjs
  postcss.config.mjs
  tailwind.config.mjs
  tsconfig.json
  src/
    app/
    components/
    lib/
    styles/
```

### 2.1 src/app – Routes & Layouts (Next.js App Router)

We use route groups to keep things organised:

```bash
src/app/
  layout.tsx                # Root layout
  page.tsx                  # Home page (Public)
  (public)/
    about/
      page.tsx
    guidelines/
      page.tsx
    privacy/
      page.tsx
    announcements/
      page.tsx
    announcements/[id]/
      page.tsx
  (auth)/
    login/
      page.tsx
    register/
      page.tsx
  (member)/
    profile/
      page.tsx
    attendance/
      page.tsx
  (sessions)/
    sessions/
      page.tsx              # List of sessions (for members)
    sessions/[id]/
      sign-in/
        page.tsx            # 3-step sign-in flow
  (admin)/
    layout.tsx              # Admin layout (nav, guard)
    dashboard/
      page.tsx
    members/
      page.tsx
    sessions/
      page.tsx
    sessions/[id]/attendance/
      page.tsx
    announcements/
      page.tsx
```

Route groups `(public)`, `(auth)`, `(member)`, `(sessions)`, `(admin)` only organise code; they do not appear in URLs.

### 2.2 src/components

- `src/components/layout/` – layouts, headers, footers, navigation.
- `src/components/ui/` – shared UI primitives (Button, Input, Card, Table, Modal, Alert, Badge, etc.).
- `src/components/forms/` – form building blocks for registration, sign-in, and admin CRUD.
- `src/components/sections/` – hero, about sections, testimonials, and other marketing blocks.

### 2.3 src/lib

- `src/lib/api.ts` – functions to call backend HTTP APIs (using `fetch` or a tiny wrapper).
- `src/lib/auth.ts` – Supabase client setup plus helpers for login, logout, and session management.
- `src/lib/routes.ts` – centralised route constants.
- `src/lib/utils.ts` – generic utilities (date formatting, currency formatting, etc.).

### 2.4 src/styles

- `globals.css` for Tailwind directives and base styles.
- Additional CSS modules only when Tailwind classes are insufficient.

---

## 3. Backend Integration

The frontend talks to the backend using:

- `NEXT_PUBLIC_API_BASE_URL` – e.g. `https://api.swimbuddz.com`.
- The API contract defined in the backend repo’s `API_CONTRACT.md`.

Patterns:

- All API calls go through `src/lib/api.ts`.
- Authenticated calls:
  - Use the Supabase client to obtain the current access token.
  - Include the `Authorization: Bearer <token>` header.

Example:

```ts
// src/lib/api.ts
export async function apiGet<T>(
  path: string,
  options?: { auth?: boolean },
): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL!;
  const headers: HeadersInit = { 'Content-Type': 'application/json' };

  if (options?.auth) {
    const token = await getAccessTokenSomehow();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${baseUrl}${path}`, { headers, cache: 'no-store' });
  if (!res.ok) {
    // handle error, parse JSON error if available
    throw new Error(`API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}
```

---

## 4. Authentication Flow (Frontend)

Supabase Auth UI is not used directly; we integrate via custom forms:

- `/login` – form for email + password (later magic link support if needed).
- `/register` – multi-step flow that:
  - Creates a Supabase user.
  - Calls backend `POST /api/v1/members/` to create the member profile.

A React context (or server components + cookies) holds the current session info for client-side components.

Auth states:

- **Unauthenticated** – access to public pages (home, about, guidelines, privacy, announcements). Redirect to `/login` when hitting member/admin routes.
- **Authenticated member** – access to profile, attendance history, session listing, and sign-in.
- **Authenticated admin** – access to the `(admin)` route group.

---

## 5. Mobile-First UX

Assume most users visit via WhatsApp → mobile browser. Priorities:

- Layouts that work on narrow viewports first.
- Large touch targets for buttons and fields.
- Minimal steps for key flows (3-step sign-in, short registration steps).

---

## 6. Future: MCP-aware UI

Future UI may include “AI helpers” (coach chat, ask-about-plan). These will talk to a host that knows about the MCP server, not directly to MCP from the browser. For now, only anticipate where helpers might live (side panels, floating buttons) without coupling to MCP.

---

## 7. Non-Goals (for this codebase)

- Implementing AI logic directly in the browser.
- Implementing backend business rules in the frontend.
- Using heavy, global state libraries (MobX, Redux) in the first implementation.

The frontend should remain a thin, predictable UI layer over the backend API.
