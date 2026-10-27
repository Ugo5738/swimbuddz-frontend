"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { buildPersonalSwimHistory, type HistoricalAttendance } from "@/lib/personal-swim-history";
import { CalendarDays, Images } from "lucide-react";

const attendedStatuses = new Set(["present","late","checked_in"]);

export function SessionMediaHistory({ onSelect }: { onSelect: (sessionId: string) => void }) {
  const attendance = useQuery({
    queryKey: ["my-media","full-attendance-history"],
    queryFn: () => apiGet<HistoricalAttendance[]>("/api/v1/attendance/me?include_session=true&limit=500", {auth:true}),
  });
  const history = useMemo(() => buildPersonalSwimHistory({
    activities: [],
    sessions: [],
    attendance: attendance.data ?? [],
  }).filter(record => record.sessionId && attendedStatuses.has((record.attendanceStatus||"").toLowerCase())),
    [attendance.data]);
  return <section className="space-y-4" aria-label="Browse media by swim session">
    <div><h2 className="text-lg font-semibold">Media by swim session</h2>
    <p className="text-sm text-slate-600">Browse attended sessions using their saved attendance records, including sessions no longer in the recent sessions catalogue. Availability of photos and videos depends on vault permissions.</p></div>
    {attendance.isLoading && <p role="status">Loading swimming history…</p>}
    {attendance.isError && <p role="alert" className="rounded-xl border p-4">Could not load attendance history. <Link href="/account/bookings?view=history" className="text-cyan-700 underline">View My Swims history</Link></p>}
    {!attendance.isLoading && !attendance.isError && (history.length ? <div className="grid gap-3 md:grid-cols-2">
      {history.map(record=><button key={record.key} type="button" onClick={()=>onSelect(record.sessionId!)} className="flex min-h-24 items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-600">
        <CalendarDays className="h-6 w-6 shrink-0 text-cyan-700"/>
        <span className="min-w-0 flex-1"><strong className="block">{record.title}</strong>
          <span className="block text-sm text-slate-600">{record.date ? new Date(record.date).toLocaleString("en-NG",{dateStyle:"medium",timeStyle:"short"}) : "Date unavailable"} · {record.location||"Location unavailable"}</span>
          <span className="block text-xs text-slate-500">View photos and videos, if shared</span></span>
        <Images className="h-5 w-5 text-slate-400"/>
      </button>)}
    </div> : <p className="rounded-xl border p-5 text-sm text-slate-600">No attended sessions found. You can still view your <Link href="/account/bookings?view=history" className="font-semibold text-cyan-700 underline">swimming history</Link>.</p>)}
  </section>;
}
