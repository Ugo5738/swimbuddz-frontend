import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Dumbbell,
  LifeBuoy,
  ShieldCheck,
} from "lucide-react";
import { contents, quickRead, sessionFlow, standards, type Standard } from "./_content";

export const metadata: Metadata = {
  title: "Club Standards | SwimBuddz",
  description:
    "The official SwimBuddz Club standards for purposeful practice, pods, attendance, safety, conduct, progress and member care.",
  openGraph: {
    title: "SwimBuddz Club Standards",
    description: "Friendly by nature. Focused by design. Read before your next Club session.",
    url: "https://www.swimbuddz.com/club/standards",
    type: "website",
    images: [
      {
        url: "https://www.swimbuddz.com/images/club-standards-og.png",
        width: 1536,
        height: 1024,
        alt: "SwimBuddz Club Standards — friendly by nature, focused by design",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SwimBuddz Club Standards",
    description: "Friendly by nature. Focused by design.",
    images: ["https://www.swimbuddz.com/images/club-standards-og.png"],
  },
};

export default function ClubStandardsPage() {
  return (
    <div className="pb-8">
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-10 text-white shadow-xl sm:px-10 sm:py-14 lg:px-14">
        <div className="absolute -right-20 -top-20 -z-10 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 -z-10 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative max-w-4xl">
          <nav
            aria-label="Breadcrumb"
            className="mb-8 flex items-center gap-2 text-sm text-cyan-100"
          >
            <Link href="/club" className="font-medium text-cyan-100 hover:text-white">
              Club
            </Link>
            <span aria-hidden="true" className="text-slate-500">
              /
            </span>
            <span>Standards</span>
          </nav>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
            <ShieldCheck className="h-4 w-4" />
            The source of truth
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Friendly by nature. <span className="text-cyan-300">Focused by design.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            These standards protect the warm Club culture while giving every swimmer a serious
            opportunity to practise, improve and reach new milestones.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="#quick-read"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Read the two-minute version
              <ArrowRight className="h-4 w-4" />
            </a>
            <p className="text-sm text-slate-400">
              Published 2 August 2026 · Applies to Club sessions
            </p>
          </div>
        </div>
      </section>

      <section id="quick-read" className="scroll-mt-24 py-12 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-700">
              Two-minute read
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              What matters in practice
            </h2>
            <p className="mt-3 max-w-lg leading-7 text-slate-600">
              If members remember only six things, these are the six. The complete standards below
              explain how they work in real sessions.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {quickRead.map((item) => (
              <li
                key={item}
                className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm leading-6 text-slate-700">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
        <aside className="hidden lg:sticky lg:top-24 lg:block">
          <nav
            aria-label="Club standards sections"
            className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              On this page
            </p>
            <ol className="max-h-[calc(100vh-10rem)] space-y-0.5 overflow-y-auto pr-1">
              {contents.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="flex gap-2 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-cyan-50 hover:text-cyan-800"
                  >
                    <span className="w-5 shrink-0 font-mono text-xs text-slate-400">
                      {item.number}
                    </span>
                    <span>{item.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <div className="min-w-0 space-y-5">
          {standards.slice(0, 5).map((standard) => (
            <StandardCard key={standard.id} standard={standard} />
          ))}

          <section
            id="session-structure"
            className="scroll-mt-24 overflow-hidden rounded-3xl border border-cyan-200 bg-cyan-950 text-white shadow-sm"
          >
            <div className="p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-300 text-cyan-950">
                  <Dumbbell className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-mono text-xs font-semibold tracking-widest text-cyan-300">
                    STANDARD 06
                  </p>
                  <h2 className="mt-1 text-2xl font-bold">Standard session structure</h2>
                  <p className="mt-3 max-w-2xl leading-7 text-cyan-50/80">
                    Everyone should know the objective before the main set begins. A Club session
                    may use all or some of this sequence, depending on the session plan.
                  </p>
                </div>
              </div>
              <ol className="mt-7 grid gap-3 sm:grid-cols-2">
                {sessionFlow.map((step, index) => (
                  <li
                    key={step.title}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-300 text-xs font-bold text-cyan-950">
                        {index + 1}
                      </span>
                      <h3 className="font-semibold">{step.title}</h3>
                    </div>
                    <p className="mt-2 pl-10 text-sm leading-6 text-cyan-50/70">{step.detail}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {standards.slice(5).map((standard) => (
            <StandardCard key={standard.id} standard={standard} />
          ))}

          <section
            id="commitment"
            className="scroll-mt-24 rounded-3xl bg-gradient-to-br from-cyan-600 to-blue-700 p-6 text-white shadow-lg sm:p-8"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <p className="font-mono text-xs font-semibold tracking-widest text-cyan-100">
                  STANDARD 15
                </p>
                <h2 className="mt-1 text-2xl font-bold">Member commitment</h2>
              </div>
            </div>
            <p className="mt-5 max-w-3xl leading-7 text-cyan-50">
              By booking or attending a Club session, members agree to arrive prepared and on time,
              participate sincerely, follow the session structure and safety instructions, respect
              personal boundaries, support other swimmers and accept constructive feedback.
            </p>
            <p className="mt-4 max-w-3xl font-semibold leading-7">
              SwimBuddz should remain friendly, but it must also remain purposeful. Every member
              shares responsibility for making that possible.
            </p>
          </section>
        </div>
      </div>

      <section className="mt-12 grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <div className="flex items-center gap-2 text-rose-700">
            <LifeBuoy className="h-5 w-5" />
            <h2 className="font-semibold">Need to report a concern?</h2>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Contact the Club coordinator privately, or email the SwimBuddz team. For an immediate
            poolside safety issue, alert the nearest coach, coordinator, lifeguard or pool staff
            member.
          </p>
        </div>
        <a
          href="mailto:swimbuddz@gmail.com?subject=Private%20Club%20concern"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Email privately
        </a>
      </section>

      <section className="mt-4 flex flex-col items-start justify-between gap-4 rounded-3xl bg-cyan-50 p-6 sm:flex-row sm:items-center sm:p-8">
        <div>
          <p className="font-semibold text-slate-950">Ready to practise with purpose?</p>
          <p className="mt-1 text-sm text-slate-600">
            Browse the next sessions or learn more about Club membership.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link
            href="/sessions"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500"
          >
            View sessions
          </Link>
          <Link
            href="/club"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-cyan-200 bg-white px-5 py-2.5 text-sm font-semibold text-cyan-800 hover:bg-cyan-100"
          >
            Back to Club
          </Link>
        </div>
      </section>
    </div>
  );
}

function StandardCard({ standard }: { standard: Standard }) {
  const Icon = standard.icon;
  return (
    <section
      id={standard.id}
      className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold tracking-widest text-cyan-700">
            STANDARD {standard.number}
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
            {standard.title}
          </h2>
        </div>
      </div>
      <p className="mt-5 leading-7 text-slate-700">{standard.intro}</p>
      {standard.bullets && (
        <ul className="mt-4 space-y-3">
          {standard.bullets.map((bullet) => (
            <li key={bullet} className="flex gap-3 text-sm leading-6 text-slate-700 sm:text-base">
              <Check className="mt-1 h-4 w-4 shrink-0 text-cyan-600" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}
      {standard.ordered && (
        <ol className="mt-4 grid gap-2 sm:grid-cols-2">
          {standard.ordered.map((item, index) => (
            <li
              key={item}
              className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                {index + 1}
              </span>
              {item}
            </li>
          ))}
        </ol>
      )}
      {standard.closing && <p className="mt-4 leading-7 text-slate-700">{standard.closing}</p>}
      {standard.note && (
        <div className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <p>{standard.note}</p>
        </div>
      )}
    </section>
  );
}
