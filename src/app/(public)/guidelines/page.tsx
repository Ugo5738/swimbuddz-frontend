import Link from "next/link";
import { Card } from "@/components/ui/Card";

const sections = [
  {
    title: "Pool Safety Essentials",
    items: [
      "Listen to the lead coach or lifeguard at all times.",
      "Warm up properly and flag any injuries up front.",
      "No diving in shallow zones; feet-first entries unless instructed."
    ]
  },
  {
    title: "Community Behaviour",
    items: [
      "Respect every swimmer’s pace—lane etiquette keeps everyone flowing.",
      "No shaming or gossip; we operate with empathy.",
      "Phones stay off pool decks unless you’re logging training or helping admins."
    ]
  },
  {
    title: "Health & Wellness",
    items: [
      "Stay home if you’re ill or recovering from a contagious condition.",
      "Hydrate before/after sessions; bring your own bottle.",
      "Flag medical issues early so coaches can adjust sets."
    ]
  }
];

export default function GuidelinesPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">Community rules</p>
        <h1 className="text-4xl font-bold text-slate-900">Guidelines keep every SwimBuddz session safe.</h1>
        <p className="text-lg text-slate-600">
          These highlights summarise the SwimBuddz Community Rules & Safety Guidelines. Always review the latest version before joining new sessions.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        {sections.map((section) => (
          <Card key={section.title} className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Need the full detail?</p>
        <p className="text-sm text-slate-600">
          Download the complete SwimBuddz Community Rules & Safety Guidelines to share with parents, guardians, and venue partners.
        </p>
        <Link
          href="https://docs.google.com/document/d/placeholder-guidelines"
          className="mt-3 inline-flex text-sm font-semibold text-cyan-700 hover:underline"
          target="_blank"
        >
          View the latest Google Doc &rarr;
        </Link>
      </section>
    </div>
  );
}
