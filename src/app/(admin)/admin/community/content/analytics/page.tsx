"use client";

import { useApi } from "@/hooks/useApi";

type Acquisition = { content_id: string; registrations: number; paying_members: number; payment_count: number; paid_amount_ngn: number; period_start: string; period_end: string };
type Row = { post_id: string; title: string; event: string; count: number };
const labels: Record<string,string> = {
  page_view: "Page views", watch_click: "Player loads",
  assessment_click: "Assessment clicks", academy_click: "Academy clicks",
  club_click: "Club clicks", event_click: "Event clicks", register_click: "Registration clicks",
};
export default function ContentAnalyticsPage() {
  const {data, loading, error} = useApi<Row[]>("/api/v1/content/admin/engagement", {auth:true});
  const {data: acquisitions, loading: acquisitionLoading, error: acquisitionError} = useApi<Acquisition[]>("/api/v1/admin/reports/flywheel/content-acquisition", {auth:true});
  const titles = new Map((data || []).map(row=>[row.post_id,row.title]));
  const totalRegistrations = (acquisitions || []).reduce((count, item)=>count+item.registrations,0);
  const total = (data || []).filter(x=>x.event==="page_view").reduce((sum,row)=>sum+row.count,0);
  return <main className="mx-auto max-w-6xl space-y-6 p-6">
    <header><h1 className="text-3xl font-bold">Learning content analytics</h1>
      <p className="mt-2 text-slate-600">First-party content engagement and registrations. Reporting retrieves registrations from Members using its existing scheduled snapshot; this page does not make services depend on each other. Paid amounts reflect confirmed Payments records for first-party content-sourced members; this is source-cohort attribution, not proof that a specific article directly caused a sale.</p></header>
    <div className="grid gap-4 md:grid-cols-2"><p className="rounded-lg border p-5 text-xl font-semibold">Tracked page views: {total.toLocaleString()}</p><p className="rounded-lg border p-5 text-xl font-semibold">Confirmed registrations in latest snapshot: {totalRegistrations.toLocaleString()}</p></div>
    <h2 className="text-xl font-bold">Registrations attributed to content</h2>
    {acquisitionLoading ? <p>Loading registration snapshot…</p> : acquisitionError ? <p role="alert">Reporting snapshot unavailable.</p> : acquisitions?.length ? <div className="overflow-x-auto rounded-lg border"><table className="w-full text-sm"><thead><tr className="bg-slate-100 text-left"><th className="p-3">Content</th><th className="p-3">Period</th><th className="p-3 text-right">Registrations</th><th className="p-3 text-right">Paying members</th><th className="p-3 text-right">Paid payments</th><th className="p-3 text-right">Paid amount (NGN)</th></tr></thead><tbody>{acquisitions.map(row=><tr className="border-t" key={row.content_id}><td className="p-3">{titles.get(row.content_id) || row.content_id}</td><td className="p-3">{row.period_start} – {row.period_end}</td><td className="p-3 text-right">{row.registrations}</td><td className="p-3 text-right">{row.paying_members}</td><td className="p-3 text-right">{row.payment_count}</td><td className="p-3 text-right">{row.paid_amount_ngn.toLocaleString()}</td></tr>)}</tbody></table></div> : <p>No attributed registrations in the latest Reporting snapshot yet.</p>}
    <h2 className="text-xl font-bold">Content engagement</h2>
    {loading ? <p>Loading…</p> : error ? <p role="alert">Unable to load analytics.</p> : <div className="overflow-x-auto rounded-xl border"><table className="w-full text-left text-sm">
      <thead className="bg-slate-100"><tr><th className="p-3">Content</th><th className="p-3">Event</th><th className="p-3 text-right">Count</th></tr></thead>
      <tbody>{(data||[]).map((r,i)=><tr key={r.post_id+r.event+i} className="border-t"><td className="p-3">{r.title}</td><td className="p-3">{labels[r.event] || r.event}</td><td className="p-3 text-right">{r.count}</td></tr>)}</tbody>
    </table></div>}
  </main>;
}
