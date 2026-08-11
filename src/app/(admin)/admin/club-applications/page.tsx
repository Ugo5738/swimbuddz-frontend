"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { useApi } from "@/hooks/useApi";
import {
  ClubApplication,
  completeObservedClubAssessment,
} from "@/lib/clubOnboarding";
import { ClipboardCheck, Mail, Waves } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const observedChecks = [
  ["independent_entry", "Independent water entry and comfort"],
  ["continuous_25m", "25m continuous swim"],
  ["controlled_breathing", "Functional controlled breathing"],
  ["deep_water_control", "Calm in deep water"],
  ["float_or_tread", "Float or tread for about 30 seconds"],
  ["stop_and_recover", "Stop, recover, and reach the wall"],
  ["repeat_25m", "Repeat 25m after a short rest"],
] as const;

export default function ClubApplicationsPage() {
  const applications = useApi<ClubApplication[]>("/api/v1/clubs/admin/applications");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    outcome: "club_ready_modified" as "club_ready" | "club_ready_modified" | "academy_first",
    checks: {} as Record<string, boolean>,
    nonstop_distance_m: "",
    deep_water_comfort: "",
    primary_technique_focus: "",
    first_club_milestone: "",
    assessor_notes: "",
    send_result_email: true,
  });
  const [saving, setSaving] = useState(false);
  const selected = applications.data?.find((application) => application.id === selectedId) ?? null;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      await completeObservedClubAssessment(selected.id, {
        outcome: form.outcome,
        observed_checks: form.checks,
        nonstop_distance_m: form.nonstop_distance_m ? Number(form.nonstop_distance_m) : undefined,
        deep_water_comfort: form.deep_water_comfort || undefined,
        primary_technique_focus: form.primary_technique_focus || undefined,
        first_club_milestone: form.first_club_milestone || undefined,
        assessor_notes: form.assessor_notes || undefined,
        send_result_email: form.send_result_email,
      });
      applications.refetch();
      setSelectedId(null);
      toast.success("Assessment saved and application updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save assessment");
    } finally {
      setSaving(false);
    }
  };

  if (applications.loading) return <LoadingCard text="Loading Club applications..." />;

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Club readiness reviews</h1>
        <p className="mt-2 text-slate-600">
          Review the self-report, record the observed 10–15 minute assessment, and email a consistent outcome.
        </p>
      </header>
      {applications.error ? <Alert variant="error">{applications.error}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-3">
          {(applications.data ?? []).map((application) => (
            <button key={application.id} type="button" onClick={() => setSelectedId(application.id)} className="w-full text-left">
              <Card className={selectedId === application.id ? "border-cyan-500 ring-2 ring-cyan-100" : "hover:border-slate-300"}>
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-semibold text-slate-900">{application.member_name || "Member"}</p><p className="text-sm text-slate-500">{application.member_email}</p></div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{application.status.replaceAll("_", " ")}</span>
                </div>
                <p className="mt-3 flex items-center gap-2 text-sm text-slate-600"><Waves className="h-4 w-4" />{application.plan?.club_name} · {application.plan?.location}</p>
                <p className="mt-1 text-xs text-slate-500">Community Experience: {application.community_experience_selected ? "selected" : "opted out"}</p>
              </Card>
            </button>
          ))}
          {!applications.data?.length ? <Alert>No Club applications yet.</Alert> : null}
        </div>

        {selected ? (
          <Card>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div><h2 className="text-xl font-semibold text-slate-900">Observed assessment</h2><p className="text-sm text-slate-600">{selected.member_name}</p></div>
              <ClipboardCheck className="h-6 w-6 text-cyan-600" />
            </div>
            <div className="mb-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              <p className="mb-2 font-semibold">Member self-report</p>
              <dl className="grid gap-2 sm:grid-cols-2">
                {Object.entries(selected.assessment?.self_report ?? {}).map(([key, value]) => (
                  <div key={key}><dt className="text-xs text-slate-500">{key.replaceAll("_", " ")}</dt><dd>{typeof value === "boolean" ? (value ? "Yes" : "Not yet") : String(value || "—")}</dd></div>
                ))}
              </dl>
            </div>
            <form onSubmit={save} className="space-y-5">
              <fieldset className="space-y-2"><legend className="text-sm font-semibold text-slate-900">Observed checks</legend>{observedChecks.map(([key, label]) => <label key={key} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm"><input type="checkbox" checked={form.checks[key] || false} onChange={(event) => setForm((current) => ({ ...current, checks: { ...current.checks, [key]: event.target.checked } }))} />{label}</label>)}</fieldset>
              <label className="block space-y-1 text-sm font-medium">Outcome<select value={form.outcome} onChange={(event) => setForm((current) => ({ ...current, outcome: event.target.value as typeof form.outcome }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal"><option value="club_ready">Club-ready</option><option value="club_ready_modified">Club-ready — modified participation</option><option value="academy_first">Academy first</option></select></label>
              <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1 text-sm font-medium">Non-stop distance (m)<input type="number" min="0" value={form.nonstop_distance_m} onChange={(event) => setForm((current) => ({ ...current, nonstop_distance_m: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal" /></label><label className="space-y-1 text-sm font-medium">Deep-water comfort<input value={form.deep_water_comfort} onChange={(event) => setForm((current) => ({ ...current, deep_water_comfort: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal" /></label></div>
              {([[
                "primary_technique_focus", "Primary technique focus"
              ], ["first_club_milestone", "First Club milestone"], ["assessor_notes", "Assessor notes"]] as const).map(([key, label]) => <label key={key} className="block space-y-1 text-sm font-medium">{label}<textarea rows={2} value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal" /></label>)}
              <label className="flex items-start gap-3 rounded-lg bg-cyan-50 p-3 text-sm text-cyan-900"><input type="checkbox" checked={form.send_result_email} onChange={(event) => setForm((current) => ({ ...current, send_result_email: event.target.checked }))} className="mt-1" /><span><span className="flex items-center gap-1 font-semibold"><Mail className="h-4 w-4" />Email result</span>Send the outcome, technique focus, milestone, and approved price to the member.</span></label>
              <Button type="submit" disabled={saving} className="w-full">{saving ? "Saving..." : "Save assessment outcome"}</Button>
            </form>
          </Card>
        ) : <Card className="flex min-h-64 items-center justify-center text-center text-slate-500">Select an application to record the assessment.</Card>}
      </div>
    </div>
  );
}
