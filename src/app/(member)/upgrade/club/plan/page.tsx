"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { useApi } from "@/hooks/useApi";
import {
  ClubApplication,
  ClubPlan,
  createClubApplication,
  submitClubPreAssessment,
} from "@/lib/clubOnboarding";
import { formatCurrency, useUpgrade } from "@/lib/upgradeContext";
import { Check, MapPin, Users, Waves } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type Pod = {
  id: string;
  club_id: string;
  name: string;
  handle: string | null;
  active_member_count: number;
  max_size: number;
};

function quarterLabel(plan: ClubPlan) {
  const start = new Date(`${plan.period_start}T00:00:00`);
  const quarter = Math.floor(start.getMonth() / 3) + 1;
  return `Q${quarter} ${start.getFullYear()}`;
}

export default function ClubPlanSelectionPage() {
  const router = useRouter();
  const { state, setClubApplicationId } = useUpgrade();
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [experienceSelected, setExperienceSelected] = useState(true);
  const [preferredPodId, setPreferredPodId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const plansQuery = useApi<ClubPlan[]>("/api/v1/clubs/plans", { auth: false });
  const applicationsQuery = useApi<ClubApplication[]>("/api/v1/clubs/applications/me");
  const plans = useMemo(() => plansQuery.data ?? [], [plansQuery.data]);
  const locations = useMemo(() => {
    const grouped = new Map<string, ClubPlan[]>();
    plans.forEach((plan) => {
      grouped.set(plan.club_id, [...(grouped.get(plan.club_id) ?? []), plan]);
    });
    grouped.forEach((items, id) => {
      grouped.set(id, items.sort((a, b) => a.period_start.localeCompare(b.period_start)));
    });
    return [...grouped.entries()];
  }, [plans]);
  const locationPlans = selectedClubId
    ? locations.find(([clubId]) => clubId === selectedClubId)?.[1] ?? []
    : [];
  const selectedPlans = locationPlans.filter((plan) => selectedPlanIds.includes(plan.id));
  const primaryPlan = selectedPlans[0] ?? null;
  const podsQuery = useApi<Pod[]>(
    selectedClubId ? `/api/v1/members/pods/public?club_id=${selectedClubId}` : null,
    { auth: false },
  );

  const latestApplication = applicationsQuery.data?.[0] ?? null;
  const approvedApplication = applicationsQuery.data?.find(
    (application) => application.status === "approved",
  );

  const selectLocation = (clubPlans: ClubPlan[]) => {
    const primary = clubPlans.find((plan) => plan.entry_available);
    setSelectedClubId(clubPlans[0].club_id);
    setSelectedPlanIds(primary ? [primary.id] : []);
    setExperienceSelected(primary?.community_experience_default_selected ?? true);
    setPreferredPodId("");
  };

  const toggleFutureQuarter = (plan: ClubPlan) => {
    if (!primaryPlan || plan.id === primaryPlan.id) return;
    setSelectedPlanIds((current) =>
      current.includes(plan.id)
        ? current.filter((id) => id !== plan.id)
        : [...current, plan.id].sort(
            (a, b) =>
              locationPlans.findIndex((item) => item.id === a) -
              locationPlans.findIndex((item) => item.id === b),
          ),
    );
  };

  const submit = async () => {
    const readiness = state.clubReadinessData;
    if (!primaryPlan || !readiness) {
      router.push("/upgrade/club/readiness");
      return;
    }
    const requiredAnswers = [
      readiness.canSwim25mContinuously,
      readiness.controlledBreathing,
      readiness.comfortableInDeepWater,
      readiness.canFloatOrTread30Seconds,
      readiness.canStopAndRecover,
    ];
    if (!requiredAnswers.every((answer) => typeof answer === "boolean")) {
      toast.error("Complete the Club safety pre-assessment first.");
      router.push("/upgrade/club/readiness");
      return;
    }
    setSubmitting(true);
    try {
      const application = await createClubApplication({
        plan_version_id: primaryPlan.id,
        plan_version_ids: selectedPlans.slice(1).map((plan) => plan.id),
        community_experience_selected: experienceSelected,
        preferred_pod_id: preferredPodId || undefined,
        notes: readiness.clubNotes || undefined,
      });
      await submitClubPreAssessment(application.id, {
        can_swim_25m_continuously: Boolean(readiness.canSwim25mContinuously),
        controlled_breathing: Boolean(readiness.controlledBreathing),
        comfortable_in_deep_water: Boolean(readiness.comfortableInDeepWater),
        can_float_or_tread_30_seconds: Boolean(readiness.canFloatOrTread30Seconds),
        can_stop_and_recover: Boolean(readiness.canStopAndRecover),
        current_nonstop_distance_m: readiness.currentNonstopDistanceM,
        last_swim_date: readiness.lastSwimDate || undefined,
        injuries_or_accommodations: readiness.injuriesOrAccommodations || undefined,
        notes: readiness.clubNotes || undefined,
      });
      setClubApplicationId(application.id);
      applicationsQuery.refetch();
      toast.success("Application submitted. We will arrange your in-pool assessment.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit your application");
    } finally {
      setSubmitting(false);
    }
  };

  if (plansQuery.loading || applicationsQuery.loading) {
    return <LoadingCard text="Loading Club locations..." />;
  }

  const planSubtotal = selectedPlans.reduce(
    (sum, plan) => sum + plan.current_price_kobo,
    0,
  );
  const experienceFee = primaryPlan?.community_experience_fee_kobo ?? 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-16">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-600 text-white">
          <MapPin className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Choose your Club location</h1>
        <p className="text-slate-600">
          Each pool has its own quarterly price. Mid-quarter entry is adjusted to the sessions remaining.
        </p>
      </div>

      {plansQuery.error ? (
        <Alert variant="error" title="Could not load Club options">{plansQuery.error}</Alert>
      ) : null}

      <Alert title="One membership, one checkout">
        If your annual SwimBuddz Membership is due, the server adds it as a separate ₦20,000 line in
        your approved quote. You do not need to register through a different path first.
      </Alert>

      {approvedApplication ? (
        <Alert variant="success" title="Assessment approved">
          <div className="space-y-3">
            <p>Your exact server-calculated Club quote is ready.</p>
            <Button
              size="sm"
              onClick={() =>
                router.push(`/checkout?purpose=club&application_id=${approvedApplication.id}`)
              }
            >
              Review approved plan and pay
            </Button>
          </div>
        </Alert>
      ) : latestApplication?.status === "assessment_pending" ? (
        <Alert variant="success" title="Application received">
          We will complete a 10–15 minute in-pool readiness assessment, then email your result.
        </Alert>
      ) : null}

      <div className="space-y-3">
        {locations.map(([clubId, clubPlans]) => {
          const firstAvailable = clubPlans.find((plan) => plan.entry_available);
          const selected = selectedClubId === clubId;
          return (
            <button
              key={clubId}
              type="button"
              onClick={() => selectLocation(clubPlans)}
              className="w-full text-left"
            >
              <Card className={selected ? "border-cyan-500 ring-2 ring-cyan-100" : "hover:border-slate-300"}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{clubPlans[0].club_name}</p>
                    <p className="text-sm text-slate-600">{clubPlans[0].location || clubPlans[0].name}</p>
                    {!firstAvailable ? (
                      <p className="mt-1 text-xs text-amber-700">Use drop-ins until the next quarter opens.</p>
                    ) : null}
                  </div>
                  {firstAvailable ? (
                    <div className="text-right">
                      <p className="text-xl font-bold text-slate-900">
                        {formatCurrency(firstAvailable.current_price_kobo / 100)}
                      </p>
                      <p className="text-xs text-slate-500">{quarterLabel(firstAvailable)}</p>
                    </div>
                  ) : null}
                </div>
              </Card>
            </button>
          );
        })}
      </div>

      {primaryPlan ? (
        <Card className="space-y-5 border-cyan-100">
          <div>
            <h2 className="font-semibold text-slate-900">Choose quarters</h2>
            <p className="text-sm text-slate-600">
              Your first available quarter is required. Future quarters are optional and start unselected.
            </p>
          </div>
          <div className="space-y-2">
            {locationPlans.map((plan) => {
              const checked = selectedPlanIds.includes(plan.id);
              const required = plan.id === primaryPlan.id;
              return (
                <label
                  key={plan.id}
                  className={`flex items-start gap-3 rounded-xl border p-3 ${!plan.entry_available ? "opacity-60" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={required || !plan.entry_available}
                    onChange={() => toggleFutureQuarter(plan)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600"
                  />
                  <span className="flex-1">
                    <span className="font-medium text-slate-900">{quarterLabel(plan)}</span>
                    <span className="block text-xs text-slate-500">
                      {plan.remaining_sessions} sessions remaining
                      {required ? " · required" : " · optional prepayment"}
                    </span>
                    {!plan.entry_available ? (
                      <span className="block text-xs text-amber-700">{plan.entry_reason}</span>
                    ) : null}
                  </span>
                  <span className="text-right font-semibold text-slate-900">
                    {formatCurrency(plan.current_price_kobo / 100)}
                    {plan.current_price_kobo !== plan.club_fee_kobo ? (
                      <span className="block text-xs font-normal text-slate-400 line-through">
                        {formatCurrency(plan.club_fee_kobo / 100)}
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-cyan-50 p-4">
            <input
              type="checkbox"
              checked={experienceSelected}
              onChange={(event) => setExperienceSelected(event.target.checked)}
              className="mt-1 h-5 w-5 rounded border-slate-300 text-cyan-600"
            />
            <span className="flex-1">
              <span className="font-semibold text-slate-900">Current-quarter Community Experience</span>
              <span className="block text-sm text-slate-600">
                Optional, selected by default. The Club checkout rate is ₦30,000; buying later as a Club
                member is ₦40,000, and the standard member rate is ₦50,000.
              </span>
            </span>
            <span className="font-semibold text-slate-900">{formatCurrency(experienceFee / 100)}</span>
          </label>

          {podsQuery.data?.length ? (
            <label className="block space-y-2 text-sm font-medium text-slate-800">
              Preferred pod (optional)
              <select
                value={preferredPodId}
                onChange={(event) => setPreferredPodId(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal"
              >
                <option value="">Let SwimBuddz assign the best fit</option>
                {podsQuery.data.map((pod) => (
                  <option key={pod.id} value={pod.id} disabled={pod.active_member_count >= pod.max_size}>
                    {pod.handle || pod.name} · {pod.active_member_count}/{pod.max_size}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="space-y-2 border-t border-slate-100 pt-4 text-sm">
            <div className="flex justify-between"><span>Selected Club quarters</span><span>{formatCurrency(planSubtotal / 100)}</span></div>
            {experienceSelected ? (
              <div className="flex justify-between"><span>Community Experience (optional)</span><span>{formatCurrency(experienceFee / 100)}</span></div>
            ) : null}
            <p className="text-xs text-slate-500">
              Annual membership and any enabled payment-processing charge appear transparently in the final quote.
            </p>
          </div>

          <Button onClick={submit} disabled={submitting} size="lg" className="w-full">
            {submitting ? "Submitting..." : "Submit for Club assessment"}
          </Button>
        </Card>
      ) : null}

      <div className="grid gap-3 rounded-2xl bg-slate-50 p-5 sm:grid-cols-3">
        {["Structured weekly practice", "Location-matched pods", "Assessment result by email"].map((item, index) => (
          <div key={item} className="flex gap-2 text-sm text-slate-600">
            {index === 0 ? <Waves className="h-4 w-4 text-cyan-600" /> : index === 1 ? <Users className="h-4 w-4 text-cyan-600" /> : <Check className="h-4 w-4 text-cyan-600" />}
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
