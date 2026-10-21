import Link from "next/link";
import { BookOpen, CalendarCheck2, CalendarDays, MapPin, UsersRound } from "lucide-react";

const choices = [
  {
    title: "Find a SwimBuddz session",
    desc: "Browse Club practice, Academy classes and organised swims. Keep recommended sessions, pod/cohort eligibility, filters and multi-session booking.",
    href: "/account/find-a-swim/sessions",
    icon: CalendarCheck2,
  },
  {
    title: "Find independent pool access",
    desc: "Explore available partner-pool visits by location, check entry rules and book verified access.",
    href: "/pool-access",
    icon: MapPin,
  },
  {
    title: "Learn to swim",
    desc: "Explore structured Academy programmes and upcoming cohorts.",
    href: "/academy",
    icon: BookOpen,
  },
  {
    title: "Community swims and experiences",
    desc: "Explore social swimming and other SwimBuddz experiences.",
    href: "/community/events",
    icon: UsersRound,
  },
];

export default function FindASwim() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <header className="max-w-3xl space-y-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-700">
          SwimBuddz discovery
        </p>
        <h1 className="text-4xl font-bold text-slate-900">Find a Swim</h1>
        <p className="text-slate-600">
          Find where and when to swim: a coached session, organised group swim, or independent
          pool access. Availability, supervision and admission rules differ by experience.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {choices.map(({ title, desc, href, icon: Icon }) => (
          <Link key={href} href={href}
            className="group rounded-xl border border-slate-200 bg-white p-6 hover:border-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-600">
            <Icon className="mb-3 h-7 w-7 text-cyan-700" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-slate-950 group-hover:text-cyan-700">{title}</h2>
            <p className="mt-2 text-sm text-slate-600">{desc}</p>
            <span className="mt-4 inline-block text-sm font-semibold text-cyan-700">Explore →</span>
          </Link>
        ))}
      </div>
      <p className="text-sm text-slate-600">
        Looking for all SwimBuddz activities, including talks and events?{" "}
        <Link href="/account/calendar" className="font-semibold text-cyan-700 underline">Open the SwimBuddz calendar</Link>.
        {" "}Know a pool we should consider?{" "}
        <Link href="/account/pools/suggest" className="font-semibold text-cyan-700 underline">Suggest a pool</Link>.
      </p>
    </main>
  );
}
