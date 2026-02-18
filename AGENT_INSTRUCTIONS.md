# Agent Instructions – SwimBuddz Frontend

This document tells **AI coding agents** how to work inside the frontend repo.

If you are an automated AI assistant modifying this codebase, you MUST follow these rules.

---

## 1. Always Read These Files First

Before making code changes, always read:

1. `ARCHITECTURE.md` – frontend structure & principles.
2. `ROUTES_AND_PAGES.md` – the intended routes and page responsibilities.
3. `UI_FLOWS.md` – user flows & UX expectations.
4. `CONVENTIONS.md` – coding and UI conventions.
5. `TODO.md` – the ordered list of tasks to implement.

Do not start coding without absorbing these.

---

## 2. Task Execution Rules

- **Follow `TODO.md` in order.**
  - Implement tasks sequentially unless a task explicitly says otherwise.
  - Do not invent new epics or large features that are not in `TODO.md`.

- **One focused task at a time.**
  - Keep PR / change scope limited to the relevant task.
  - If you need to change other parts of the app to support a task, keep changes minimal and related.

- **Do not restructure folders** unless a task explicitly says so.

- **When in doubt, prefer simplicity.**
  - Use simple React components.
  - Avoid introducing new dependencies unless necessary and clearly justified.

---

## 3. Routing & Files

- We use **Next.js App Router** with `src/app/`.
- Do not create a `pages/` directory.
- Follow the route structure defined in `ROUTES_AND_PAGES.md`.

Rules:

- If a route is described (e.g. `/sessions/[id]/sign-in`), its file must live under `src/app/(sessions)/sessions/[id]/sign-in/page.tsx`.
- Do not change URLs without updating `ROUTES_AND_PAGES.md` and all usages.

---

## 4. Styling and UI Components

- Use **Tailwind CSS** classes for styling.
- Use shared UI components from:
  - `src/components/ui/` for low-level UI primitives.
  - `src/components/layout/` for layouts and navigation.
  - `src/components/forms/` for common form controls and patterns.

Do NOT:

- Add external CSS frameworks (Bootstrap, Material UI, etc.).
- Inline too much CSS-in-JS if simple Tailwind classes are enough.

---

## 5. Backend Integration

- All HTTP calls to backend should go through:
  - `src/lib/api.ts` (or a small suite of helpers in that file).

- Do not call `fetch` directly from random components for backend calls, unless you are:
  - In a Next.js server component doing simple data fetching AND still respecting `api.ts` contract.

- Use the endpoints and shapes defined in the backend’s `API_CONTRACT.md`.  
  If you’re uncertain, prefer using existing helpers or adapt to the contract rather than inventing new API paths.

---

## 6. Authentication & Supabase

- Use a single place (e.g. `src/lib/auth.ts`) to initialise the Supabase client.
- Do not initialise Supabase clients in multiple places.
- For authenticated requests:
  - Retrieve the current session token from Supabase.
  - Include it as `Authorization: Bearer <token>` in backend requests (via `api.ts`).

- Protect routes:
  - Member-only pages should redirect to `/login` if not authenticated.
  - Admin pages should check role and show an appropriate error or redirect.

---

## 7. UX and Behaviour Conventions

- The SwimBuddz app must be **clear and fast** on mobile devices.
- Avoid:
  - Long, scroll-heavy forms in a single screen.
- Prefer:
  - Multi-step forms for registration (as described in `UI_FLOWS.md`).
  - Minimal friction for the session sign-in flow.

When duplicating UI patterns (e.g., forms, tables):

- Extract shared components if at least 2-3 different screens share the pattern.
- Keep them in `src/components/`.

---

## 8. Forms and Validation

- Use controlled components (React state) or form libraries if introduced in a controlled way.
- Show validation errors near the relevant fields.
- For API errors (e.g., network failures, 4xx/5xx responses):
  - Show a non-intrusive toast or inline alert with a human-friendly message.

---

## 9. Admin vs Member UI

- Admin routes live under the `(admin)` route group.
- Admin pages must not be accessible to non-admin users:
  - Use backend role info from `/api/v1/identity/me`.
  - If a user is not admin → redirect or show “Access denied”.

- Member-only routes must:
  - Show the member’s name and relevant info in the UI.
  - Hide admin actions.

---

## 10. If Unsure

If you are an AI agent and not sure what to do:

- Do NOT invent new UX flows. Instead:
  - Check `UI_FLOWS.md` and `ROUTES_AND_PAGES.md`.
- Do NOT create new top-level directories.
- Add comments or TODOs when something is ambiguous instead of making large structural changes.

---
