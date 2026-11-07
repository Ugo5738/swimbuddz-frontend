# AGENTS.md — Universal AI Agent Instructions (`swimbuddz-frontend`)

> **Applies to ALL AI Assistants:** OpenAI ChatGPT / Codex, Anthropic Claude, Google Gemini / Antigravity, Cursor, GitHub Copilot, and any automated coding or planning agent.

---

## 1. Mandatory Working Habit: "Deliberate → Document (`docs/DECISIONS.md`) → Code"

1. **Read Settled Decisions FIRST:**
   - Before proposing, modifying, or refactoring any product workflow, pricing/checkout UI, attendance UI, Club/Academy onboarding flow, or admin member management flow, **read [`docs/DECISIONS.md`](./docs/DECISIONS.md)** and [`UI_FLOWS.md`](./UI_FLOWS.md).
2. **Never Silently Override a Settled Decision:**
   - Do **not** change an invariant documented in `docs/DECISIONS.md` (`ADR-001` through `ADR-006`) or `UI_FLOWS.md` as a side effect of another task.
   - If a request conflicts with an existing ADR in `docs/DECISIONS.md`, cite the ADR number and rationale and ask whether the user wants to explicitly supersede it.
3. **Always Update Documentation When Deliberating or Building:**
   - Whenever you and the user think through, debate, or agree on a product rule, UX flow, pricing model, or architecture choice, **immediately record or update the decision and *why* it was made in [`docs/DECISIONS.md`](./docs/DECISIONS.md)** (and `../docs/DECISIONS.md` if accessible) as well as `UI_FLOWS.md` / `ROUTES_AND_PAGES.md`.

---

## 2. Required Frontend Reading

- [`docs/DECISIONS.md`](./docs/DECISIONS.md) — Canonical Product & Architecture Decision Log (`ADR-001`–`ADR-006`)
- [`AGENT_INSTRUCTIONS.md`](./AGENT_INSTRUCTIONS.md) — Frontend AI agent instructions
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Next.js App Router architecture
- [`CONVENTIONS.md`](./CONVENTIONS.md) — TypeScript / React / Tailwind conventions
- [`ROUTES_AND_PAGES.md`](./ROUTES_AND_PAGES.md) & [`UI_FLOWS.md`](./UI_FLOWS.md) — Routes and user journeys
