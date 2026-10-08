"use client";
import Link from "next/link";
import Image from "next/image";
import { useApi } from "@/hooks/useApi";
import { Episode, EPISODE_CATEGORY, youtubeId } from "./data";

export default function BeyondThePoolPage() {
  const { data, loading, error } = useApi<Episode[]>(`/api/v1/content/?category=${EPISODE_CATEGORY}&published_only=true`, { auth: false });
  const episodes = [...(data || [])].sort((a,b)=>(a.episode_number ?? 999)-(b.episode_number ?? 999));
  return <main className="mx-auto max-w-6xl space-y-9 px-4 py-12">
    <header className="max-w-3xl space-y-4"><p className="text-sm font-bold uppercase tracking-widest text-cyan-700">SwimBuddz conversations</p><h1 className="text-4xl font-bold text-slate-900 sm:text-5xl">Beyond the Pool</h1><p className="text-lg text-slate-600">Real stories about finding confidence, making time to swim, staying consistent and building community beyond the water.</p></header>
    {loading ? <p>Loading episodes…</p> : error ? <p role="alert">Episodes are temporarily unavailable.</p> : episodes.length === 0 ? <p>Episodes will appear here once they are published.</p> : <div className="grid gap-6 md:grid-cols-2">{episodes.map(episode=><Link key={episode.id} href={`/beyond-the-pool/${episode.id}`} className="overflow-hidden rounded-2xl border bg-white hover:shadow-lg">
      <div className="flex aspect-video items-center justify-center bg-slate-900">{youtubeId(episode.video_url) ? <Image unoptimized width={480} height={360} className="h-full w-full object-cover" alt={`Thumbnail for ${episode.title}`} src={`https://i.ytimg.com/vi/${youtubeId(episode.video_url)}/hqdefault.jpg`}/> : <span className="text-xl font-bold text-white">Beyond the Pool</span>}</div>
      <div className="space-y-2 p-6"><p className="text-xs font-bold uppercase text-cyan-700">Episode {episode.episode_number ?? "—"}</p><h2 className="text-xl font-bold text-slate-900">{episode.title}</h2><p className="text-slate-600">{episode.summary}</p></div>
    </Link>)}</div>}
    <Link href="/academy" className="inline-block rounded-lg bg-cyan-700 px-5 py-3 font-semibold text-white">Explore the Academy</Link>
  </main>;
}
