"use client";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";

type Story = { id: string; title: string; display_name: string; published_at: string };
export default function SwimmerStoriesPage() {
  const { data, loading, error } = useApi<Story[]>("/api/v1/academy/public/showcase", { auth: false });
  return <main className="mx-auto max-w-5xl space-y-7 px-4 py-14">
    <p className="font-semibold uppercase tracking-wider text-cyan-700">Swimmer stories</p>
    <h1 className="text-4xl font-bold">Every swim has a story.</h1>
    <p className="text-lg text-slate-600">Milestones, consistency, and confidence—shared only with the swimmer’s permission and SwimBuddz approval.</p>
    {loading ? <p>Loading stories…</p> : error ? <p>Stories are temporarily unavailable.</p> : data?.length ? <div className="grid gap-4 sm:grid-cols-2">{data.map(story=><article key={story.id} className="rounded-xl border bg-white p-6">
      <p className="text-xs font-semibold uppercase text-cyan-700">Swimming milestone</p>
      <h2 className="mt-2 text-xl font-bold">{story.title}</h2>
      <p className="mt-2 text-slate-600">Shared by {story.display_name}</p>
    </article>)}</div> : <p className="rounded-xl border p-6">Approved swimmer stories will appear here.</p>}
    <Link href="/academy" className="inline-flex rounded-lg bg-cyan-700 px-5 py-3 font-semibold text-white">Begin your swimming journey</Link>
  </main>;
}
