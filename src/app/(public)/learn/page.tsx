import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learn to Swim & Grow | SwimBuddz",
  description: "Swimming advice, Beyond the Pool conversations, swimmer journeys and practical resources.",
};
const resources = [
  { href: "/beyond-the-pool", title: "Beyond the Pool", description: "Conversations about confidence, consistency and community." },
  { href: "/tips", title: "Swimming Tips & Articles", description: "Practical skills, technique and water-safety knowledge." },
  { href: "/guides", title: "Guides", description: "Get the most out of SwimBuddz programs and experiences." },
  { href: "/learn/stories", title: "Swimmer Stories", description: "Progress and personal journeys shared with permission." },
  { href: "/gallery", title: "Community Highlights", description: "Our swims, events, achievements and memories." },
  { href: "/assessment", title: "Find Your Swim Level", description: "Get oriented before choosing your next swimming experience." },
];
export default function LearnPage() {
  return <main className="mx-auto max-w-6xl space-y-10 px-4 py-12">
    <header className="max-w-3xl space-y-3"><p className="font-semibold uppercase tracking-widest text-cyan-700">Learn</p><h1 className="text-4xl font-bold text-slate-900">There is more to swimming than the pool.</h1><p className="text-lg text-slate-600">Real conversations, practical guidance and inspiration for every stage of your swimming journey.</p></header>
    <div className="grid gap-5 md:grid-cols-2">{resources.map(item=><Link href={item.href} key={item.href} className="rounded-2xl border bg-white p-7 transition hover:border-cyan-500 hover:shadow-md"><h2 className="text-xl font-semibold text-slate-900">{item.title} →</h2><p className="mt-2 text-slate-600">{item.description}</p></Link>)}</div>
    <aside className="rounded-2xl bg-cyan-50 p-8"><h2 className="text-2xl font-bold">Ready to get in the water?</h2><p className="mt-2 text-slate-700">Explore structured lessons, ongoing practice, and the wider SwimBuddz community.</p><Link href="/academy" className="mt-4 inline-block rounded-lg bg-cyan-700 px-5 py-3 font-semibold text-white">Explore Academy</Link></aside>
  </main>;
}
