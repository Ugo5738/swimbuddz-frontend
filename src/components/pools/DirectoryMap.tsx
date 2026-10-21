"use client";
import { useMemo, useState } from "react";
import Link from "next/link";

type LocatedPool = { id: string; name: string; location_area: string | null; latitude: number | null; longitude: number | null };
export function DirectoryMap({ pools }: { pools: LocatedPool[] }) {
  const located = useMemo(() => pools.filter((p): p is LocatedPool & { latitude: number; longitude: number } =>
    p.latitude !== null && p.longitude !== null && Number.isFinite(p.latitude) && Number.isFinite(p.longitude) &&
    p.latitude >= -90 && p.latitude <= 90 && p.longitude >= -180 && p.longitude <= 180), [pools]);
  const [selected, setSelected] = useState<string | null>(null);
  const pool = located.find(p => p.id === selected) || located[0];
  if (!pool) return <div className="rounded-xl border bg-slate-50 p-5 text-sm text-slate-600">Map locations are not yet verified for these pools. You can still browse the directory by neighbourhood.</div>;
  const range = 0.028;
  const bbox = [pool.longitude-range,pool.latitude-range,pool.longitude+range,pool.latitude+range].join(",");
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${pool.latitude}%2C${pool.longitude}`;
  return <section aria-label="Pool locations on map" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
      <div><p className="text-sm font-semibold text-slate-900">{pool.name}</p><p className="text-xs text-slate-500">{pool.location_area || "Mapped location"} · {located.length} located pool(s) on this page</p></div>
      <Link href={`/pools/${pool.id}`} className="text-sm font-semibold text-cyan-700 underline">View pool details</Link>
    </div>
    <iframe title={`OpenStreetMap around ${pool.name}`} src={mapUrl} loading="lazy" referrerPolicy="no-referrer" className="h-80 w-full border-0 sm:h-[420px]" />
    <div className="flex gap-2 overflow-x-auto p-3" aria-label="Choose pool map marker">
      {located.map(item=><button type="button" key={item.id} aria-pressed={pool.id===item.id} onClick={()=>setSelected(item.id)}
        className={`shrink-0 rounded-lg border px-3 py-2 text-sm ${pool.id===item.id ? "border-cyan-700 bg-cyan-50 font-semibold text-cyan-900" : "border-slate-200 text-slate-700"}`}>{item.name}</button>)}
    </div>
    <p className="px-3 pb-3 text-xs text-slate-500">Map data © OpenStreetMap contributors. Only verified coordinates are shown; map position is not a guarantee of pool entrance access.</p>
  </section>;
}
