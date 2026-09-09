"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { useApi } from "@/hooks/useApi";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import {
  ClubPlan,
  ClubPool,
  CommunityExperienceOffering,
  createClubPlan,
} from "@/lib/clubOnboarding";
import { Club } from "@/lib/clubs";
import { formatCurrency } from "@/lib/upgradeContext";
import { ClubQuarterRecommendation } from "@/components/admin/ClubQuarterRecommendation";
import { RescheduleClubPractice } from "@/components/club/RescheduleClubPractice";

type ScheduleRow = {
  id: string;
  title: string;
  starts_at: string;
  pool_id: string;
  status: string;
  fee_kobo: number;
  included_fee_kobo?: number | null;
  pricing: { mode: string; cost_per_attendee_kobo: number; margin_per_attendee_kobo: number };
};
type Schedule = { sessions: ScheduleRow[]; suggested_experience_date: string; warnings?: string[] };
const money = (kobo: number) => formatCurrency(kobo / 100);
const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal";
const initialForm = () => {
  const now = new Date();
  const month = Math.floor(now.getUTCMonth() / 3) * 3;
  return {
    club_id: "",
    name: "Quarterly Club",
    price: "",
    period_start: new Date(Date.UTC(now.getUTCFullYear(), month, 1)).toISOString().slice(0, 10),
    period_end: new Date(Date.UTC(now.getUTCFullYear(), month + 3, 0)).toISOString().slice(0, 10),
    minimum: "5",
    capacity: "",
    effective_from: now.toISOString().slice(0, 10),
    effective_to: "",
    experience: "",
    bundle_selected: false,
    refreshments: true,
    note: "",
  };
};

export default function ClubPlansAdminPage() {
  const clubs = useApi<Club[]>("/api/v1/clubs?active_only=false", { auth: false });
  const plans = useApi<ClubPlan[]>("/api/v1/clubs/admin/plans");
  const experiences = useApi<CommunityExperienceOffering[]>(
    "/api/v1/clubs/community-experiences/admin"
  );
  const pools = useApi<{ items: ClubPool[] }>("/api/v1/pools?page_size=100", { auth: false });
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState<ClubPlan | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const field = (key: keyof ReturnType<typeof initialForm>, value: string | boolean) =>
    setForm((old) => ({ ...old, [key]: value }));
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not complete this action");
    } finally {
      setBusy(false);
    }
  };
  const open = async (plan: ClubPlan) => {
    const rows = await apiGet<Schedule>(`/api/v1/clubs/admin/plans/${plan.id}/schedule`, {
      auth: true,
    });
    setEditing(plan);
    setSchedule(rows);
    setSelected(plan.session_ids ?? []);
    setForm({
      club_id: plan.club_id,
      name: plan.name,
      price:
        plan.club_fee_kobo === plan.recommended_fee_kobo ? "" : String(plan.club_fee_kobo / 100),
      period_start: plan.period_start,
      period_end: plan.period_end,
      minimum: String(plan.minimum_entry_sessions),
      capacity: plan.capacity ? String(plan.capacity) : "",
      effective_from: plan.effective_from,
      effective_to: plan.effective_to ?? "",
      experience: plan.community_experience_offering_id ?? "",
      bundle_selected: plan.community_experience_default_selected,
      refreshments: plan.refreshments_included,
      note: plan.premium_venue_note ?? "",
    });
  };
  const recommended = editing?.published_at
    ? (editing.recommended_fee_kobo ?? editing.club_fee_kobo)
    : (schedule?.sessions ?? [])
        .filter((s) => selected.includes(s.id))
        .reduce((sum, s) => sum + s.fee_kobo, 0);
  const save = async () => {
    const offering = experiences.data?.find((e) => e.id === form.experience);
    const body = {
      name: form.name,
      billing_cycle: "quarterly" as const,
      currency: "NGN",
      club_fee_kobo: form.price === "" ? null : Math.round(Number(form.price) * 100),
      community_experience_fee_kobo: offering?.club_bundle_fee_kobo ?? 0,
      community_experience_default_selected: Boolean(offering && form.bundle_selected),
      community_experience_offering_id: form.experience || undefined,
      sessions_included: selected.length,
      session_ids: selected,
      period_start: form.period_start,
      period_end: form.period_end,
      minimum_entry_sessions: Number(form.minimum),
      capacity: form.capacity ? Number(form.capacity) : undefined,
      effective_from: form.effective_from,
      effective_to: form.effective_to || undefined,
      refreshments_included: form.refreshments,
      premium_venue_note: form.note || undefined,
      is_active: false,
    };
    const saved = editing
      ? await apiPut<ClubPlan>(`/api/v1/clubs/admin/plans/${editing.id}`, body, { auth: true })
      : await createClubPlan(form.club_id, body);
    await plans.refetch();
    await open(saved);
    return saved;
  };
  if (plans.loading || clubs.loading) return <LoadingCard text="Loading Club plans..." />;
  return (
    <div className="mx-auto max-w-6xl space-y-6 py-8">
      <header>
        <h1 className="text-3xl font-bold">Club location pricing</h1>
        <p className="mt-2 text-slate-600">
          Actual sessions supply pool, refreshment and margin economics. Each location has its own
          quarter; paid prices stay frozen.
        </p>
        <Link className="text-cyan-700 underline" href="/admin/community/experiences">
          Manage separate Community Experience offerings
        </Link>
      </header>
      {(error || plans.error || clubs.error || experiences.error) && (
        <Alert variant="error">{error || plans.error || clubs.error || experiences.error}</Alert>
      )}
      <ClubQuarterRecommendation
        clubs={clubs.data ?? []}
        onCreated={async (plan) => {
          plans.refetch();
          await open(plan);
        }}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {plans.data?.map((plan) => (
          <Card key={plan.id}>
            <h2 className="font-semibold">
              {plan.name} · {plan.published_at ? "Published" : "Draft"}
            </h2>
            <p>
              {plan.club_name} · {plan.period_start} → {plan.period_end}
            </p>
            <p>
              {plan.sessions_included} sessions · {money(plan.club_fee_kobo)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" disabled={busy} onClick={() => run(() => open(plan))}>
                {plan.published_at ? "View schedule" : "Review draft"}
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const next = await apiPost<ClubPlan>(
                      `/api/v1/clubs/admin/plans/${plan.id}/next-quarter`,
                      {},
                      { auth: true }
                    );
                    plans.refetch();
                    await open(next);
                    toast.success("Next-quarter draft ready for review");
                  })
                }
              >
                Generate next quarter
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {editing
              ? editing.published_at
                ? "Published schedule (read-only)"
                : "Review draft"
              : "Create a quarter draft"}
          </h2>
          {editing && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                setEditing(null);
                setSchedule(null);
                setSelected([]);
                setForm(initialForm());
              }}
            >
              New draft
            </Button>
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await save();
              toast.success("Draft saved. Review its sessions before publishing.");
            });
          }}
        >
          <fieldset
            disabled={busy || Boolean(editing?.published_at)}
            className="grid gap-4 sm:grid-cols-2"
          >
            <label>
              Club location
              <select
                required
                disabled={Boolean(editing)}
                className={inputClass}
                value={form.club_id}
                onChange={(e) => field("club_id", e.target.value)}
              >
                <option value="">Choose location</option>
                {clubs.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Plan name
              <input
                required
                className={inputClass}
                value={form.name}
                onChange={(e) => field("name", e.target.value)}
              />
            </label>
            {(
              [
                ["period_start", "Quarter starts"],
                ["period_end", "Quarter ends"],
                ["effective_from", "Applications open from"],
                ["effective_to", "Applications close (optional)"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  type="date"
                  required={key !== "effective_to"}
                  className={inputClass}
                  value={form[key]}
                  onChange={(e) => field(key, e.target.value)}
                />
              </label>
            ))}
            <label>
              Minimum remaining sessions
              <input
                required
                type="number"
                min="1"
                max="52"
                className={inputClass}
                value={form.minimum}
                onChange={(e) => field("minimum", e.target.value)}
              />
            </label>
            <label>
              Plan capacity (optional)
              <input
                type="number"
                min="1"
                className={inputClass}
                value={form.capacity}
                onChange={(e) => field("capacity", e.target.value)}
              />
            </label>
            <label>
              Final quarter override (₦, optional)
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                placeholder="Use sum of selected sessions"
                value={form.price}
                onChange={(e) => field("price", e.target.value)}
              />
            </label>
            <label>
              Separate Experience bundle
              <select
                className={inputClass}
                value={form.experience}
                onChange={(e) => field("experience", e.target.value)}
              >
                <option value="">No Community Experience bundle</option>
                {experiences.data
                  ?.filter(
                    (x) =>
                      x.is_active &&
                      x.period_start === form.period_start &&
                      x.period_end === form.period_end
                  )
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name} · {money(x.club_bundle_fee_kobo)}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.refreshments}
                onChange={(e) => field("refreshments", e.target.checked)}
              />{" "}
              Refreshments included
            </label>
            <label>
              <input
                type="checkbox"
                disabled={!form.experience}
                checked={form.bundle_selected}
                onChange={(e) => field("bundle_selected", e.target.checked)}
              />{" "}
              Suggest optional Experience in quarterly checkout
            </label>
            <label className="sm:col-span-2">
              Venue note
              <input
                className={inputClass}
                value={form.note}
                onChange={(e) => field("note", e.target.value)}
              />
            </label>
          </fieldset>
          {!editing && (
            <p className="my-4 text-sm text-slate-600">
              Save this draft first to choose its actual Session records. Session count is derived,
              never typed or capped at twelve.
            </p>
          )}
          {schedule && (
            <section className="my-5 space-y-3">
              <h3 className="font-semibold">Actual included Club sessions</h3>
              {schedule.warnings?.map((warning) => (
                <Alert key={warning}>{warning}</Alert>
              ))}
              <p className="text-sm text-slate-600">
                Experience suggestion: {schedule.suggested_experience_date} (Q4: first Saturday of
                December). This is not a cancellation. Link the actual Event separately; keep the
                swim for non-attenders or explicitly replace it before publishing.
              </p>
              {!editing?.published_at && (
                <label className="block">
                  Browse another pool for an explicitly included visit
                  <select
                    className={inputClass}
                    defaultValue=""
                    disabled={busy}
                    onChange={(e) => {
                      const poolId = e.target.value;
                      if (!poolId || !editing) return;
                      run(async () => {
                        const result = await apiGet<Schedule>(
                          `/api/v1/clubs/admin/plans/${editing.id}/schedule?pool_id=${poolId}`,
                          { auth: true }
                        );
                        setSchedule((old) => ({
                          ...result,
                          sessions: Array.from(
                            new Map(
                              [...(old?.sessions ?? []), ...result.sessions].map((s) => [s.id, s])
                            ).values()
                          ).sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
                        }));
                      });
                    }}
                  >
                    <option value="">Choose pool</option>
                    {pools.data?.items.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {!schedule.sessions.length && (
                <Alert>
                  No Club sessions exist for this pool and quarter. Use the quarter recommendation
                  generator, or select explicitly created sessions.
                </Alert>
              )}
              {schedule.sessions.map((s) => (
                <div key={s.id} className="rounded-lg border p-3">
                  <label className="flex gap-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(s.id)}
                      disabled={
                        busy ||
                        Boolean(editing?.published_at) ||
                        !["scheduled", "draft"].includes(s.status)
                      }
                      onChange={(e) =>
                        setSelected((old) =>
                          e.target.checked ? [...old, s.id] : old.filter((id) => id !== s.id)
                        )
                      }
                    />
                    <span>
                      {s.title} ·{" "}
                      {new Date(s.starts_at).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}{" "}
                      · {s.status} · {money(s.fee_kobo)}
                    </span>
                  </label>
                  <details className="mt-2 text-sm text-slate-600">
                    <summary>Session economics</summary>
                    <p>
                      {s.pricing.mode} · cost/attendee{" "}
                      {money(s.pricing.cost_per_attendee_kobo ?? 0)} · margin{" "}
                      {money(s.pricing.margin_per_attendee_kobo ?? 0)}
                    </p>
                    <Link className="text-cyan-700 underline" href={`/admin/sessions/${s.id}/edit`}>
                      Review session costs and logistics
                    </Link>
                  </details>
                  {editing?.published_at && s.status === "scheduled" && (
                    <RescheduleClubPractice sessionId={s.id} onChanged={() => open(editing)} />
                  )}
                </div>
              ))}
              <p className="font-semibold">
                {selected.length} included sessions · recommended {money(recommended)} · final{" "}
                {money(form.price === "" ? recommended : Math.round(Number(form.price) * 100))}
              </p>
            </section>
          )}
          {!editing?.published_at && (
            <div className="mt-4 flex flex-wrap gap-3">
              <Button type="submit" disabled={busy}>
                {busy ? "Working…" : "Save draft"}
              </Button>
              {editing && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const saved = await save();
                      const published = await apiPost<ClubPlan>(
                        `/api/v1/clubs/admin/plans/${saved.id}/publish`,
                        {},
                        { auth: true }
                      );
                      await plans.refetch();
                      await open(published);
                      toast.success("Quarter published with its reviewed sessions and price");
                    })
                  }
                >
                  Save and publish reviewed quarter
                </Button>
              )}
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}
