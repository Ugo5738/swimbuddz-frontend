"use client";

import { useApi } from "@/hooks/useApi";

type Row = { post_id: string; title: string; event: string; count: number };
const labels: Record<string,string> = {
  page_view: "Page views", watch_click: "Player loads",
  assessment_click: "Assessment clicks", academy_click: "Academy clicks",
  club_click: "Club clicks", event_click: "Event clicks", register_click: "Registration clicks",
};
export default function ContentAnalyticsPage() {
  const {data, loading, error} = useApi<Row[]>("/api/v1/content/admin/engagement", {auth:true});
  const total = (data || []).filter(x=>x.event==="page_view").reduce((sum,row)=>sum+row.count,0);
  return <main className="mx-auto max-w-6xl space-y-6 p-6">
    <header><h1 className="text-3xl font-bold">Learning content analytics</h1>
      <p className="mt-2 text-slate-600">Anonymous aggregate counters. These are engagement and outbound intent, not verified registrations or paid enrollments.</p></header>
    <p className="text-xl font-semibold">Tracked page views: {total.toLocaleString()}</p>
    {loading ? <p>Loading…</p> : error ? <p role="alert">Unable to load analytics.</p> : <div className="overflow-x-auto rounded-xl border"><table className="w-full text-left text-sm">
      <thead className="bg-slate-100"><tr><th className="p-3">Content</th><th className="p-3">Event</th><th className="p-3 text-right">Count</th></tr></thead>
      <tbody>{(data||[]).map((r,i)=><tr key={r.post_id+r.event+i} className="border-t"><td className="p-3">{r.title}</td><td className="p-3">{labels[r.event] || r.event}</td><td className="p-3 text-right">{r.count}</td></tr>)}</tbody>
    </table></div>}
  </main>;
}
