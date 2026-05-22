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
- **No `any` for API payloads (review findings F5–F7).** A response body must be typed: prefer the generated types in `src/lib/api-types.ts`, or a narrow hand-written `interface` for the fields you actually read (see `MiddlewareMember` in `src/lib/middlewareAccess.ts` for the pattern). `useApi<T>(…)` makes this the path of least resistance — pass the response type as `T`. Treat a new `any` on a network payload as a review blocker.

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
- **Do not add `"use client"` by default (review finding G3).** A component needs it only if it uses hooks, event handlers, browser APIs, context, or a client-only library. Pure presentational components that just take props and render markup/`next/link`/icons should be Server Components — `next/link` and `lucide-react` render fine server-side. Adding `"use client"` to a pure leaf needlessly pulls it (and its tree) into the client bundle.
- **Use `next/image`, not raw `<img>` (review finding G4).** `<img>` ships unoptimised bytes — costly for our mobile-first, bandwidth-constrained users. ESLint's `@next/next/no-img-element` already warns; treat it as a migrate-on-touch backlog (~150 sites): whenever you touch a component with a raw `<img>`, convert it as part of the change; new code uses `next/image` from the start. Patterns:
  - Static/known-size asset (e.g. the logo): `<Image src="/x.png" width={W} height={H} className="h-N w-auto" priority />` — `priority` only for above-the-fold.
  - Dynamic image filling a sized box: parent `relative` (+ fixed aspect/size), then `<Image fill sizes="…" className="object-cover" />`.
  - Unknown-aspect remote image (evidence galleries, lightboxes — `object-contain` with `max-h-*`): use the intrinsic pattern `<Image src={url} width={0} height={0} sizes="…" className="w-full max-h-… object-contain" style={{ width: "100%", height: "auto" }} />`. `width={0}/height={0}` is the Next.js-sanctioned escape hatch; CSS does the actual sizing.
  - **Legitimate exceptions (keep raw `<img>`):** blob:/data: object-URL previews of a just-selected file (e.g. `MediaInput`), where `next/image` can't optimise anyway. Add a brief comment so it's not "fixed" later.
  - Remote `src` hosts must be in `next.config` `images.remotePatterns` or the image 500s — verify before converting a new host.
  - If `lucide-react`'s `Image` icon is already imported in the file, alias the import: `import NextImage from "next/image"`.

---

## 6. Data Fetching and API Calls

- Use `src/lib/api.ts` as the central place for backend calls (`apiGet`/`apiPost`/…). Never call `fetch()` directly from a component.
- For **client-component GETs with loading/error/refetch state**, use the canonical `useApi` hook (`src/hooks/useApi.ts`) instead of the hand-rolled `useState(loading)/useEffect(fetch)/catch` triad. It aborts in-flight requests on unmount/path-change, surfaces a friendly error string (never a raw exception), and supports conditional fetch (`path = null` / `enabled: false`) and `refetch()`. Reference usage: `src/app/(member)/community/directory/page.tsx`.
- **Migrate-on-touch (review findings F5–F7).** There are still ~50 components on the raw-`fetch()` + manual-state triad and ~130 `any` API payloads. Do **not** attempt a big-bang sweep. Whenever you modify a component that still uses the old pattern, migrate that component to `useApi` (and type its payload, see §3) as part of the change. New code must use `useApi` (or React Query for cache-sharing cases) from the start.
- Patterns:
  - Simple SEO-friendly pages: prefer server components with async data fetching.
  - Interactive forms: use client components that call helpers from `api.ts` on submit.
  - Client read-and-render: `const { data, loading, error, refetch } = useApi<T>(path)`.

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

---

## 12. File Size Limits

Large files hurt review velocity, IDE responsiveness, AI assistance, and bundle-splitting decisions. We aim for files that fit on one screen end-to-end and split anything beyond that into focused modules.

**Targets (lines, excluding blank lines and comments — ESLint measures it this way):**

| File kind | Soft target | Hard cap |
|---|---:|---:|
| Page (`src/app/**/page.tsx`) | 500 | 800 |
| Component (`src/components/**/*.tsx`) | 300 | 500 |
| Hook (`src/hooks/*.ts`) | 200 | 400 |
| Utility / API client module (`src/lib/*.ts`) | 500 | 800 |

**Excluded:**

- Generated files (`src/lib/api-types.ts`) — already excluded via ESLint override.
- Test files.

**How to split:**

- **Pages** — extract per-tab and per-section components into sibling files; move data shaping into custom hooks; move helpers into `lib/`. A 1,500-line `page.tsx` should usually become a 200-line `page.tsx` orchestrating five focused children.
- **Components** — prefer sub-components in the same folder over single-file mega-components. If a component file has more than one default export's worth of logic, split.
- **Hooks** — one responsibility per hook. A hook handling list + detail + mutation should split into three.
- **Utilities** — split by responsibility (`lib/academy-types.ts`, `lib/academy-api.ts`, `lib/academy-enums.ts`) rather than one 1,000-line mega-file.

**Enforcement:**

ESLint's `max-lines` rule is enabled at the **warn** level in `.eslintrc.json` (cap: 500 lines, blank lines and comments excluded). Warnings surface in IDEs and during `npm run lint`. Treat them as a backlog — once oversize files are split, raise the level to `error` to make new violations block CI.
