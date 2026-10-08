import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = { title: "Swimmer Stories | SwimBuddz" };
export default function SwimmerStoriesPage() {
  return <main className="mx-auto max-w-4xl space-y-6 px-4 py-16">
    <p className="font-semibold uppercase tracking-wider text-cyan-700">Swimmer stories</p>
    <h1 className="text-4xl font-bold">Every swim has a story.</h1>
    <p className="text-lg text-slate-600">Celebrate milestones, confidence and consistency. We feature swimmers only after their permission has been confirmed.</p>
    <p className="rounded-xl border p-6 text-slate-700">New approved stories will appear here as they are published.</p>
    <Link href="/academy" className="inline-flex rounded-lg bg-cyan-700 px-5 py-3 font-semibold text-white">Begin your swimming journey</Link>
  </main>;
}
