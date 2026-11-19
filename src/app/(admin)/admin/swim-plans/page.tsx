"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SwimPlansApi, type SwimPlan } from "@/lib/swim-plans";

function PlanCard({ plan, refresh }: { plan: SwimPlan; refresh: () => Promise<void> }) {
  const [reference, setReference] = useState(plan.venue_confirmation_reference ?? "");
  const [notes, setNotes] = useState(plan.admin_notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const act = async (action: () => Promise<unknown>, label: string) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(label);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update swim plan");
    } finally {
      setBusy(false);
    }
  };
  return <article className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-bold text-slate-950">{plan.title}</h2>
        <p className="text-sm text-slate-600">{plan.kind} · {new Date(plan.starts_at).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}</p>
        <p className="mt-1 text-sm text-slate-600">Pool {plan.pool_id || "not selected"} · {plan.participants} swimmers</p>
      </div>
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-800">{plan.status.replaceAll("_", " ")}</span>
    </div>
    <div className="grid gap-2 text-sm sm:grid-cols-2">
      <p>Publication approval: <strong className="capitalize">{plan.approval_status}</strong></p>
      <p>Venue verified: <strong className="capitalize">{plan.venue_status}</strong></p>
    </div>
    {plan.linked_event_id
      ? <Link className="text-sm font-semibold text-cyan-800 underline" href={`/community/events/${plan.linked_event_id}`}>View published event</Link>
      : <div className="space-y-3 border-t border-slate-100 pt-3">
        <label className="block text-sm font-medium text-slate-700">Admin notes
          <textarea className="mt-1 w-full rounded-xl border border-slate-300 p-2" maxLength={1000}
            value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
        </label>
        <div className="flex flex-wrap gap-2">
          {plan.approval_status !== "approved" &&
            <button disabled={busy} className="rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              onClick={() => void act(() => SwimPlansApi.review(plan.id, true, notes), "Plan approved")}>Approve</button>}
          {plan.approval_status !== "rejected" &&
            <button disabled={busy} className="rounded-lg border border-rose-400 px-3 py-2 text-sm font-semibold text-rose-800 disabled:opacity-50"
              onClick={() => void act(() => SwimPlansApi.review(plan.id, false, notes), "Plan rejected")}>Reject</button>}
        </div>
        <p className="text-xs text-amber-800">Only mark a venue verified after confirming its actual time and capacity with the pool. A tentative rate is not a reservation.</p>
        <label className="block text-sm font-medium text-slate-700">Pool partner reservation reference
          <input className="mt-1 w-full rounded-lg border border-slate-300 p-3" value={reference}
            maxLength={255} onChange={e => setReference(e.target.value)} placeholder="Partner confirmation number or booking reference" />
        </label>
        <button disabled={busy || reference.trim().length < 8 || !plan.pool_id}
          className="rounded-lg border border-cyan-700 px-3 py-2 text-sm font-semibold text-cyan-800 disabled:opacity-40"
          onClick={() => void act(() => SwimPlansApi.verifyVenue(plan.id, true, reference.trim(), notes), "Venue verification recorded")}>
          Verify booked pool time
        </button>
        {plan.kind === "open" && plan.approval_status === "approved" && plan.venue_status === "verified" &&
          <button disabled={busy} className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
            onClick={() => void act(() => SwimPlansApi.publish(plan.id), "Open Swim published")}>
            Publish approved Open Swim
          </button>}
        {plan.kind === "coached" &&
          <p className="text-xs text-slate-600">Coach assignment and member-facing pricing remain separate prerequisites. This screen does not create an operational coaching session.</p>}
      </div>}
    {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
    {message && <p role="status" className="text-sm text-emerald-800">{message}</p>}
  </article>;
}

export default function AdminSwimPlansPage() {
  const [plans, setPlans] = useState<SwimPlan[]>([]);
  const [autoApprove, setAutoApprove] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const [rows, policy] = await Promise.all([SwimPlansApi.adminList(), SwimPlansApi.getPolicy()]);
      setPlans(rows);
      setAutoApprove(policy.auto_approve_public);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load swim plans");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const changePolicy = async (checked: boolean) => {
    setBusy(true);
    try {
      const updated = await SwimPlansApi.setPolicy(checked);
      setAutoApprove(updated.auto_approve_public);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not change policy");
    } finally {
      setBusy(false);
    }
  };
  return <main className="space-y-6 p-4 md:p-6">
    <header><h1 className="text-3xl font-bold text-slate-950">Swim Plans</h1>
      <p className="text-sm text-slate-600">Review member requests and verify partner-pool time before publishing or payment.</p></header>
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="mb-2 text-lg font-semibold text-slate-900">Public Open Swim approval</h2>
      <label className="flex cursor-pointer items-center gap-3">
        <input type="checkbox" checked={autoApprove} disabled={busy} onChange={e => void changePolicy(e.target.checked)} />
        <span className="text-sm font-semibold text-slate-800">Auto-approve publication requests (default)</span>
      </label>
      <p className="mt-2 text-xs text-slate-600">Turn off to require manual admin approval for each public Open Swim. Even with automatic approval, every pool-dependent swim remains unpublished until an admin verifies the actual pool booking and publishes it.</p>
    </section>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-800">{error}</p>}
    {loading ? <p role="status">Loading swim requests…</p> :
      plans.length ? <div className="grid gap-4 lg:grid-cols-2">{plans.map(p =>
        <PlanCard key={p.id} plan={p} refresh={load} />)}</div> :
      <p className="rounded-xl bg-slate-50 p-6 text-sm text-slate-600">No member swim requests yet.</p>}
  </main>;
}
