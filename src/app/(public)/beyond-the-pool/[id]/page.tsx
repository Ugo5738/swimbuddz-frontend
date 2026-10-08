"use client";
import Link from "next/link";
import { useEffect } from "react";
import { apiPost } from "@/lib/api";
import { useParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { BlockViewer } from "@/components/editor/BlockViewer";
import { Episode, youtubeId } from "../data";

export default function EpisodePage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error } = useApi<Episode & { category: string; status: string }>(id ? `/api/v1/content/${id}` : null, { auth: false });
  useEffect(() => {
    if (!data || data.status !== "published" || data.category !== "beyond_the_pool") return;
    void apiPost(`/api/v1/content/${data.id}/engagement`, {
      event_type: "page_view", source: "beyond_the_pool",
    }, { auth: false }).catch(() => undefined);
  }, [data?.id, data?.status, data?.category]);
  const track = (event_type: string) => {
    if (!data) return;
    void apiPost(`/api/v1/content/${data.id}/engagement`, {
      event_type, source: "beyond_the_pool",
    }, { auth: false }).catch(() => undefined);
  };
  if (loading) return <main className="mx-auto max-w-4xl px-4 py-12">Loading episode…</main>;
  if (error || !data || data.category !== "beyond_the_pool" || data.status !== "published") return <main className="mx-auto max-w-4xl px-4 py-12">Episode unavailable. <Link className="underline" href="/beyond-the-pool">View all episodes</Link></main>;
  const videoId = youtubeId(data.video_url);
  return <main className="mx-auto max-w-4xl space-y-7 px-4 py-12">
    <Link href="/beyond-the-pool" className="text-cyan-700">← All episodes</Link>
    <header className="space-y-3"><p className="font-bold uppercase tracking-widest text-cyan-700">Beyond the Pool · Episode {data.episode_number ?? "—"}</p><h1 className="text-4xl font-bold">{data.title}</h1><p className="text-lg text-slate-600">{data.summary}</p>{data.guest_names && <p className="text-sm text-slate-500">With {data.guest_names}</p>}</header>
    {videoId ? <div className="aspect-video overflow-hidden rounded-xl bg-slate-900"><iframe title={data.title} src={`https://www.youtube-nocookie.com/embed/${videoId}`} onLoad={()=>track("watch_click")} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen loading="lazy"/></div> : <p>Video coming soon.</p>}
    <section className="prose max-w-none"><BlockViewer content={data.body}/></section>
    <aside className="rounded-xl bg-cyan-50 p-6"><h2 className="text-2xl font-bold">Your swimming journey starts here.</h2><p className="mt-2">Learn with the Academy or find your swimming level.</p><div className="mt-4 flex flex-wrap gap-4"><Link href="/academy" onClick={()=>track("academy_click")} className="rounded-lg bg-cyan-700 px-5 py-3 font-medium text-white">Explore Academy</Link><Link href="/assessment" onClick={()=>track("assessment_click")} className="rounded-lg border border-cyan-700 px-5 py-3 font-medium text-cyan-700">Take an assessment</Link></div></aside>
  </main>;
}
