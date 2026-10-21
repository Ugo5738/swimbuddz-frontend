"use client";

import { apiGet } from "@/lib/api";
import { MapPin, Search, Waves, Star, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Pool = {
  id: string; slug: string; name: string; location_area: string | null;
  address: string | null; latitude: number | null; longitude: number | null;
  pool_length_m: number | null; depth_min_m: number | null; depth_max_m: number | null;
  has_lifeguard: boolean | null; is_partner: boolean; bookable: boolean;
  rating_average: number | null; rating_count: number; last_verified_at: string | null;
};
type Results = { items: Pool[]; total: number; page: number; page_size: number };

export default function PoolsDirectoryPage() {
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("");
  const [applied, setApplied] = useState({ search: "", area: "" });
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const qs = new URLSearchParams({ page: String(page), page_size: "12" });
    if (applied.search) qs.set("search", applied.search);
    if (applied.area) qs.set("area", applied.area);
    try { setResults(await apiGet<Results>(`/api/v1/pools/directory?${qs.toString()}`)); }
    catch (e) { setError(e instanceof Error ? e.message : "The pool directory is unavailable."); }
    finally { setLoading(false); }
  }, [applied, page]);
  useEffect(() => { void load(); }, [load]);

  return <main className="mx-auto max-w-6xl space-y-7 px-4 py-8 sm:py-12">
    <header className="space-y-3">
      <p className="text-sm font-semibold uppercase tracking-widest text-cyan-700">Explore swimming pools</p>
      <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Find a swimming pool</h1>
      <p className="max-w-2xl text-slate-600">Discover pools by name or neighbourhood, compare facilities and read moderated swimmer reviews. Listings do not imply SwimBuddz partnership or available booking.</p>
      <div className="flex flex-wrap gap-4 text-sm font-semibold">
        <Link href="/account/pools/suggest" className="text-cyan-700 underline">Suggest a pool</Link>
        <Link href="/pool-access" className="text-cyan-700 underline">See bookable pool visits</Link>
        <Link href="/calendar" className="text-cyan-700 underline">SwimBuddz calendar</Link>
      </div>
    </header>

    <form onSubmit={e => { e.preventDefault(); setPage(1); setApplied({search: search.trim(),area: area.trim()}); }} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto]">
      <label className="text-sm font-semibold text-slate-700">Pool or location
        <span className="mt-1 flex items-center gap-2 rounded-lg border border-slate-300 px-3"><Search className="h-4 w-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pool name or area" className="w-full min-w-0 py-3 font-normal outline-none" maxLength={100}/></span>
      </label>
      <label className="text-sm font-semibold text-slate-700">Neighbourhood
        <span className="mt-1 flex items-center gap-2 rounded-lg border border-slate-300 px-3"><MapPin className="h-4 w-4 text-slate-400" /><input value={area} onChange={e => setArea(e.target.value)} placeholder="e.g. Yaba, Ikeja, Victoria Island" className="w-full min-w-0 py-3 font-normal outline-none" maxLength={100}/></span>
      </label>
      <button type="submit" className="min-h-11 self-end rounded-lg bg-cyan-700 px-6 py-3 text-sm font-semibold text-white hover:bg-cyan-800">Find pools</button>
    </form>

    <div aria-live="polite" className="text-sm text-slate-600">{loading ? "Searching pools…" : results ? `${results.total} published pool${results.total === 1 ? "" : "s"} found` : ""}</div>
    {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error} <button type="button" onClick={() => void load()} className="font-semibold underline">Retry</button></div>}
    {!loading && !error && results?.items.length === 0 && <section className="rounded-2xl border bg-white p-8 text-center">
      <Waves className="mx-auto mb-3 h-9 w-9 text-cyan-600" /><h2 className="text-lg font-semibold">No published pools match yet</h2>
      <p className="mt-2 text-sm text-slate-600">Try another area or help our team discover a missing swimming pool.</p>
      <Link href="/account/pools/suggest" className="mt-3 inline-block text-cyan-700 underline">Suggest a pool</Link>
    </section>}
    {results?.items && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {results.items.map(pool => <article key={pool.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-cyan-300">
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {pool.bookable && <span className="rounded-full bg-green-50 px-3 py-1 text-green-700">SwimBuddz booking available</span>}
          {!pool.bookable && <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">Directory listing</span>}
        </div>
        <h2 className="text-lg font-semibold text-slate-900">{pool.name}</h2>
        <p className="flex items-start gap-1 text-sm text-slate-600"><MapPin className="mt-0.5 h-4 w-4 shrink-0"/>{[pool.location_area,pool.address].filter(Boolean).join(" · ") || "Location details pending verification"}</p>
        <p className="text-sm text-slate-600">{pool.pool_length_m ? `${pool.pool_length_m}m pool · ` : ""}{pool.has_lifeguard === true ? "Lifeguard reported" : "Check safety arrangements before visiting"}</p>
        <p className="flex items-center gap-1 text-sm"><Star className="h-4 w-4 text-amber-500"/>{pool.rating_count ? `${pool.rating_average}/5 from ${pool.rating_count} reviews` : "No published reviews yet"}</p>
        <Link href={`/pools/${pool.id}`} className="mt-auto inline-flex min-h-11 items-center gap-1 font-semibold text-cyan-700 hover:underline">Explore pool <ArrowRight className="h-4 w-4"/></Link>
      </article>)}
    </div>}
    {results && results.total > results.page_size && <nav aria-label="Pool search pages" className="flex items-center justify-center gap-4">
      <button disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">Previous</button>
      <span className="text-sm">Page {page} of {Math.ceil(results.total / results.page_size)}</span>
      <button disabled={page * results.page_size >= results.total || loading} onClick={() => setPage(p => p + 1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">Next</button>
    </nav>}
  </main>;
}
