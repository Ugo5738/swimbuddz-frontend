# SwimBuddz Frontend – Coding & UI Conventions

These rules keep the frontend consistent and easier to maintain.

---

## 1. Languages & Versions

- **Node:** as specified in `package.json` `engines` (if set).
- **Framework:** Next.js 13+ with App Router.
- **Language:** TypeScript.
- **Styling:** Tailwind CSS.
- **Components:** React functional components.

---

## 2. File Naming & Structure

- Use **PascalCase** for React component files and components in `src/components/`:
  - `MemberProfileCard.tsx`
- Use **lowercase** file names for pages in `src/app/`:
  - `page.tsx`
- Use **kebab-case** for non-component utility files if needed:
  - `date-utils.ts`

Route-specific rules:

- `src/app/page.tsx` – home page (`/`).
- Other routes follow:
  - `src/app/<route>/page.tsx` for `/route`.
  - Additional nesting for segments and dynamic segments as usual in App Router.

---

## 3. TypeScript

- All React components should be typed.
- Use `FC` sparingly; prefer explicit prop types.

Example:

```tsx
type Props = {
  title: string;
};

export function SectionHeader({ title }: Props) {
  return <h2 className="text-xl font-semibold">{title}</h2>;
}
```

---

## 4. Tailwind & Styling

- Use Tailwind utility classes for layout, spacing, typography, and colours.
- Keep class lists readable by grouping related utilities (layout, spacing, colours, typography).
- Compose components when styles get long instead of piling up massive class lists.

Example:

```tsx
<button className="inline-flex items-center justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2">
  Confirm
</button>
```

For repeated patterns, extract a reusable component in `src/components/ui/`.

---

## 5. UI Components

- Use `src/components/ui/` for shared primitives (Button, Input, Select, Checkbox, Card, Table, Modal, Alert, Badge).
- Use `src/components/layout/` for layout shells like `MainLayout`, `AdminLayout`, headers, footers, and navigation.
- Keep components presentational when possible; place data fetching in server components or top-level client containers.

---

## 6. Data Fetching and API Calls

- Use `src/lib/api.ts` as the central place for backend calls.
- Do not copy-paste raw `fetch` logic throughout components.
- Patterns:
  - Simple SEO-friendly pages: prefer server components with async data fetching.
  - Interactive forms: use client components that call helpers from `api.ts` on submit.

---

## 7. Error & Loading States

Every network-dependent page/component should handle:

- **Loading state:** skeletons, spinners, or text such as “Loading…”.
- **Error state:** inline error messages with retry options when appropriate.

Do not leave users with blank screens.

---

## 8. Accessibility & Semantics

- Use semantic HTML (`<header>`, `<main>`, `<nav>`, `<section>`, `<footer>`).
- Buttons must use `<button>`, not clickable `<div>`s.
- Provide `aria-*` labels or discernible text for interactive elements as needed.
- Maintain sufficient colour contrast between text and backgrounds.

---

## 9. Forms

- Group related inputs, with clear labels and helper text.
- Show validation messages near the relevant inputs.
- Disable submit buttons while requests are in flight to avoid duplicates.

---

## 10. Admin UI

- Admin layout must clearly indicate the admin context.
- Use tables and filters for member, session, and attendance lists.
- Keep the UI clean, minimal, and functional—avoid unnecessary complexity.

---

## 11. Testing (if added)

- Use React Testing Library by default.
- Place tests alongside components in `__tests__` directories or under `tests/`.
- Focus on rendering correctness, key interactions (clicks, submissions), and API integration with mocks.
