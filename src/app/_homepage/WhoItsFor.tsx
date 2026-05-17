// Homepage section 2 — "Who SwimBuddz Is For". Extracted from the
// 980-line page.tsx (review finding G2, the §12 "split a page into
// focused children" pattern). Purely presentational + data-driven
// (no state) so it's a Server Component (CONVENTIONS §5, G3).

import { Card } from "@/components/ui/Card";
import Link from "next/link";

import { whoSwimBudzIsFor } from "./data";

export function WhoItsFor() {
  return (
    <section className="space-y-10">
      <div className="text-center space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
          For Everyone
        </p>
        <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
          Who SwimBuddz Is For
        </h2>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {whoSwimBudzIsFor.map((audience) => (
          <Link
            key={audience.title}
            href={audience.link}
            className="group block h-full"
          >
            <Card className="relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] hover:ring-2 hover:ring-cyan-200 h-full">
              <div
                className={`absolute inset-0 bg-gradient-to-br ${audience.gradient} opacity-0 group-hover:opacity-5 transition-opacity`}
              />
              <div className="relative flex flex-col items-center text-center p-6 h-full">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 text-4xl shadow-sm flex-shrink-0">
                  {audience.icon}
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mt-4">
                  {audience.title}
                </h3>
                <p className="text-slate-600 mt-2 flex-1">
                  {audience.description}
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-cyan-600 group-hover:text-cyan-700 transition-colors mt-4">
                  Learn more
                  <svg
                    className="w-4 h-4 transition-transform group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
