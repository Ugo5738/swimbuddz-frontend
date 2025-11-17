import Link from "next/link";
import { Card } from "@/components/ui/Card";

const pillars = [
  {
    title: "Community",
    description:
      "Inclusive meetups and WhatsApp groups that keep swimmers connected across Lagos.",
    highlight: "Weekly meetups • Shared accountability"
  },
  {
    title: "Club",
    description: "Structured training plans, certified coaches, and performance tracking.",
    highlight: "Technique blocks • Performance squads"
  },
  {
    title: "Academy",
    description: "Long-term development programs for new and advanced swimmers alike.",
    highlight: "Beginner ramps • Trip planning"
  }
];

const quickLinks = [
  {
    title: "About SwimBuddz",
    description: "Discover how the club started and what keeps us moving.",
    href: "/about"
  },
  {
    title: "Community Guidelines",
    description: "Safety, respect, and clarity for every session.",
    href: "/guidelines"
  },
  {
    title: "Announcements",
    description: "Stay on top of official updates and rain-checks.",
    href: "/announcements"
  },
  {
    title: "Sessions (coming soon)",
    description: "Peek at upcoming sessions and sign-in windows.",
    href: "/sessions"
  }
];

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="space-y-8 rounded-3xl bg-white px-6 py-12 shadow-sm ring-1 ring-slate-100">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-600">
          Welcome to SwimBuddz
        </p>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-slate-900 md:text-5xl">
            SwimBuddz – community, club, and academy for swimmers in Lagos.
          </h1>
          <p className="text-lg text-slate-600">
            A clear, mobile-first experience to manage sign-ins, track attendance, and keep every
            swimmer in sync—from first dip to elite training.
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/register"
            className="rounded-full bg-cyan-600 px-6 py-3 text-center font-semibold text-white transition hover:bg-cyan-500"
          >
            Join SwimBuddz
          </Link>
          <Link
            href="/about"
            className="rounded-full border border-slate-200 px-6 py-3 text-center font-semibold text-slate-700 transition hover:border-slate-300"
          >
            Learn more
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {pillars.map((pillar) => (
            <Card key={pillar.title} className="h-full space-y-3">
              <p className="text-xs font-semibold tracking-wide text-cyan-600">{pillar.title}</p>
              <p className="text-base text-slate-600">{pillar.description}</p>
              <p className="text-sm font-semibold text-slate-900">{pillar.highlight}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
            Quick links
          </p>
          <h2 className="text-2xl font-semibold text-slate-900">Explore the SwimBuddz universe</h2>
          <p className="text-base text-slate-600">
            Jump straight to the resources that new members ask about the most.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {quickLinks.map((link) => (
            <Card key={link.href} className="space-y-3 border-slate-200">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-slate-900">{link.title}</h3>
                <p className="text-sm text-slate-600">{link.description}</p>
              </div>
              <Link href={link.href} className="text-sm font-semibold text-cyan-700 hover:underline">
                Visit page &rarr;
              </Link>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
