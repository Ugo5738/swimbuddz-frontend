"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { useApi } from "@/hooks/useApi";
import { ClubPlan, createClubPlan } from "@/lib/clubOnboarding";
import { Club } from "@/lib/clubs";
import { formatCurrency } from "@/lib/upgradeContext";
import { MapPin, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const today = new Date().toISOString().slice(0, 10);

export default function ClubPlansAdminPage() {
  const clubs = useApi<Club[]>("/api/v1/clubs?active_only=false", { auth: false });
  const plans = useApi<ClubPlan[]>("/api/v1/clubs/admin/plans");
  const [form, setForm] = useState({
    club_id: "",
    name: "Quarterly Club",
    club_fee_naira: "60000",
    experience_fee_naira: "30000",
    experience_default_selected: true,
    sessions_included: "12",
    refreshments_included: true,
    capacity: "",
    premium_venue_note: "",
    effective_from: today,
    effective_to: "",
  });
  const [saving, setSaving] = useState(false);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.club_id) return;
    setSaving(true);
    try {
      await createClubPlan(form.club_id, {
        name: form.name,
        billing_cycle: "quarterly",
        currency: "NGN",
        club_fee_kobo: Math.round(Number(form.club_fee_naira) * 100),
        community_experience_fee_kobo: Math.round(Number(form.experience_fee_naira) * 100),
        community_experience_default_selected: form.experience_default_selected,
        sessions_included: Number(form.sessions_included),
        refreshments_included: form.refreshments_included,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        premium_venue_note: form.premium_venue_note || undefined,
        effective_from: form.effective_from,
        effective_to: form.effective_to || undefined,
        is_active: true,
      });
      plans.refetch();
      toast.success("Location-specific Club plan created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create plan");
    } finally {
      setSaving(false);
    }
  };

  if (clubs.loading || plans.loading) return <LoadingCard text="Loading Club plans..." />;

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Club location pricing</h1>
        <p className="mt-2 text-slate-600">
          Publish the member price for each pool location. Supplier pool and refreshment rates remain
          costing inputs; this plan is the commercial price a member buys.
        </p>
      </header>
      {clubs.error || plans.error ? <Alert variant="error">{clubs.error || plans.error}</Alert> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {(plans.data ?? []).map((plan) => (
          <Card key={plan.id} className={!plan.is_active ? "opacity-60" : ""}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-slate-900">{plan.club_name}</h2>
                <p className="mt-1 flex items-center gap-1 text-sm text-slate-600"><MapPin className="h-4 w-4" />{plan.location || plan.name}</p>
              </div>
              <div className="text-right"><p className="text-xl font-bold">{formatCurrency(plan.club_fee_kobo / 100)}</p><p className="text-xs text-slate-500">per quarter</p></div>
            </div>
            <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm text-slate-600">
              <p>{plan.sessions_included} sessions · {plan.refreshments_included ? "refreshments included" : "refreshments separate"}</p>
              <p>Community Experience: {formatCurrency(plan.community_experience_fee_kobo / 100)} · {plan.community_experience_default_selected ? "selected by default" : "not selected by default"}</p>
              <p>Effective {plan.effective_from}{plan.effective_to ? ` to ${plan.effective_to}` : " onward"}</p>
              {plan.premium_venue_note ? <p className="text-amber-700">{plan.premium_venue_note}</p> : null}
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Plus className="h-5 w-5" />Publish a plan version</h2>
        <form onSubmit={create} className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium sm:col-span-2">Club location
            <select required value={form.club_id} onChange={(event) => setForm((current) => ({ ...current, club_id: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal"><option value="">Select a Club location</option>{clubs.data?.map((club) => <option key={club.id} value={club.id}>{club.name} · {club.location || "location not set"}</option>)}</select>
          </label>
          <label className="space-y-1 text-sm font-medium">Plan name<input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal" /></label>
          <label className="space-y-1 text-sm font-medium">Quarterly Club price (₦)<input required type="number" min="0" value={form.club_fee_naira} onChange={(event) => setForm((current) => ({ ...current, club_fee_naira: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal" /></label>
          <label className="space-y-1 text-sm font-medium">Community Experience (₦)<input required type="number" min="0" value={form.experience_fee_naira} onChange={(event) => setForm((current) => ({ ...current, experience_fee_naira: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal" /></label>
          <label className="space-y-1 text-sm font-medium">Sessions included<input required type="number" min="1" value={form.sessions_included} onChange={(event) => setForm((current) => ({ ...current, sessions_included: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal" /></label>
          <label className="space-y-1 text-sm font-medium">Effective from<input required type="date" value={form.effective_from} onChange={(event) => setForm((current) => ({ ...current, effective_from: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal" /></label>
          <label className="space-y-1 text-sm font-medium">Effective to (optional)<input type="date" value={form.effective_to} onChange={(event) => setForm((current) => ({ ...current, effective_to: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal" /></label>
          <label className="space-y-1 text-sm font-medium">Capacity (optional)<input type="number" min="1" value={form.capacity} onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal" /></label>
          <label className="space-y-1 text-sm font-medium sm:col-span-2">Premium venue note (optional)<input value={form.premium_venue_note} onChange={(event) => setForm((current) => ({ ...current, premium_venue_note: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal" /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.experience_default_selected} onChange={(event) => setForm((current) => ({ ...current, experience_default_selected: event.target.checked }))} />Add the optional Community Experience by default</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.refreshments_included} onChange={(event) => setForm((current) => ({ ...current, refreshments_included: event.target.checked }))} />Refreshments included in Club price</label>
          <Button type="submit" disabled={saving || !form.club_id} className="sm:col-span-2">{saving ? "Publishing..." : "Publish plan version"}</Button>
        </form>
      </Card>
    </div>
  );
}
