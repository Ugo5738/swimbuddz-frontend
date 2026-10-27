"use client";

import { useMemo } from "react";
import { useSessionsHubData } from "@/app/(member)/sessions/useSessionsHubData";
import { CalendarDays, Images } from "lucide-react";
import Link from "next/link";

export function SessionMediaHistory({ onSelect }: { onSelect: (sessionId: string) => void }) {
  const data = useSessionsHubData({ loadPast: true });
  const attended = useMemo(() => {
    const records = new Map(data.attendance.filter(a => ["present","late","checked_in"].includes(a.status?.toLowerCase() ?? "") && !!a.session_id).map(a => [a.session_id!,a]));
    return data.pastSessions.filter(s => records.has(s.id))
      .sort((a,b)=>new Date(b.starts_at).getTime()-new Date(a.starts_at).getTime());
  }, [data.attendance, data.pastSessions]);
  if(data.pastLoading || data.attendanceLoading) return <p role="status" className="text-sm text-slate-600">Loading your attended sessions…</p>;
  if(data.pastError) return <p role="alert" className="rounded-xl border p-4">Session history could not be loaded. <Link href="/account/bookings?view=history" className="text-cyan-700 underline">See all history</Link></p>;
  return <section className="space-y-4" aria-label="Browse media by swim session">
    <div><h2 className="text-lg font-semibold">Media by swim session</h2><p className="mt-1 text-sm text-slate-600">Choose a session you attended to see available photos and videos or contribute media if permitted. Recent sessions are shown first.</p></div>
    {attended.length ? <div className="grid gap-3 md:grid-cols-2">{attended.map(s=><button type="button" key={s.id} onClick={()=>onSelect(s.id)} className="flex min-h-24 items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-600">
      <CalendarDays className="h-6 w-6 shrink-0 text-cyan-700"/><span className="min-w-0 flex-1"><strong className="block">{s.title}</strong><span className="block text-sm text-slate-600">{new Date(s.starts_at).toLocaleString("en-NG",{dateStyle:"medium",timeStyle:"short"})} · {s.location_name||s.location||"Location unavailable"}</span></span><Images className="h-5 w-5 text-slate-400"/></button>)}</div>
      : <p className="rounded-xl border p-5 text-sm text-slate-600">No recent attended sessions were returned. Older records are available in <Link className="font-semibold text-cyan-700 underline" href="/account/bookings?view=history">My Swims → History</Link>.</p>}
  </section>;
}
