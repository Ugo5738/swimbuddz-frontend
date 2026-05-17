// Homepage section 4 — "How It Works". Extracted from the 980-line
// page.tsx (review finding G2, the §12 "split a page into focused
// children" pattern). Purely presentational + data-driven (no state)
// so it's a Server Component (CONVENTIONS §5, G3).

import { howItWorks } from "./data";

export function HowItWorks() {
  return (
    <section className="space-y-10">
      <div className="text-center space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
          Simple Process
        </p>
        <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
          How It Works
        </h2>
      </div>
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 items-start">
        {howItWorks.map((step, idx) => (
          <div
            key={step.step}
            className="relative flex flex-col items-center md:items-start text-center md:text-left"
          >
            {idx < howItWorks.length - 1 && (
              <div className="hidden lg:block absolute top-6 left-[60%] w-full h-0.5 bg-gradient-to-r from-cyan-200 to-transparent" />
            )}
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 text-xl font-bold text-white shadow-lg shadow-cyan-500/25 flex-shrink-0">
              {step.step}
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mt-4">
              {step.title}
            </h3>
            <p className="text-sm text-slate-600 mt-2">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
