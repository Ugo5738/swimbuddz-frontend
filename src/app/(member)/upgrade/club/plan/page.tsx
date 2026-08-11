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

type Member = {
  membership?: { community_paid_until?: string | null } | null;
};

type Pod = {
  id: string;
  club_id: string;
  name: string;
  handle: string | null;
  active_member_count: number;
  max_size: number;
};

export default function ClubPlanSelectionPage() {
  const router = useRouter();
  const { state, setClubApplicationId } = useUpgrade();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [experienceSelected, setExperienceSelected] = useState(true);
  const [preferredPodId, setPreferredPodId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const plansQuery = useApi<ClubPlan[]>("/api/v1/clubs/plans", { auth: false });
  const applicationsQuery = useApi<ClubApplication[]>("/api/v1/clubs/applications/me");
  const memberQuery = useApi<Member>("/api/v1/members/me");
  const selectedPlan = plansQuery.data?.find((plan) => plan.id === selectedPlanId) ?? null;
  const podsQuery = useApi<Pod[]>(
    selectedPlan ? `/api/v1/members/pods/public?club_id=${selectedPlan.club_id}` : null,
    { auth: false },
  );

  const latestApplication = applicationsQuery.data?.[0] ?? null;
  const approvedApplication = useMemo(
    () => applicationsQuery.data?.find((application) => application.status === "approved") ?? null,
    [applicationsQuery.data],
  );
  const communityActive = Boolean(
    memberQuery.data?.membership?.community_paid_until &&
      new Date(memberQuery.data.membership.community_paid_until) > new Date(),
  );

  const selectPlan = (plan: ClubPlan) => {
    setSelectedPlanId(plan.id);
    setExperienceSelected(plan.community_experience_default_selected);
    setPreferredPodId("");
  };

  const submit = async () => {
    const readiness = state.clubReadinessData;
    if (!selectedPlan || !readiness) {
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
        plan_version_id: selectedPlan.id,
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

  if (plansQuery.loading || applicationsQuery.loading || memberQuery.loading) {
    return <LoadingCard text="Loading Club locations..." />;
  }

  const error = plansQuery.error || applicationsQuery.error || memberQuery.error;
  const planSubtotal = selectedPlan
    ? selectedPlan.club_fee_kobo / 100 +
      (experienceSelected ? selectedPlan.community_experience_fee_kobo / 100 : 0)
    : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-16">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-600 text-white">
          <MapPin className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Choose your Club location</h1>
        <p className="text-slate-600">
          Pool and refreshment costs differ by location, so each location shows its own quarterly price.
        </p>
      </div>

      {error ? <Alert variant="error" title="Could not load Club options">{error}</Alert> : null}

      {!communityActive ? (
        <Alert title="Annual SwimBuddz membership required">
          Club fees are separate from the annual Community membership. Complete the annual membership
          payment before paying an approved Club application.
        </Alert>
      ) : null}

      {approvedApplication ? (
        <Alert variant="success" title="Assessment approved">
          <div className="space-y-3">
            <p>Your Club application is ready for payment.</p>
            <Button
              size="sm"
              onClick={() =>
                router.push(`/checkout?purpose=club&application_id=${approvedApplication.id}`)
              }
              disabled={!communityActive}
            >
              Review approved plan and pay
            </Button>
          </div>
        </Alert>
      ) : latestApplication?.status === "assessment_pending" ? (
        <Alert variant="success" title="Application received">
          We will complete a 10–15 minute in-pool readiness assessment, then email your result. Payment
          becomes available only after a Club-ready outcome.
        </Alert>
      ) : null}

      <div className="space-y-3">
        {(plansQuery.data ?? []).map((plan) => {
          const selected = selectedPlanId === plan.id;
          return (
            <button key={plan.id} type="button" onClick={() => selectPlan(plan)} className="w-full text-left">
              <Card className={selected ? "border-cyan-500 ring-2 ring-cyan-100" : "hover:border-slate-300"}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-900">{plan.club_name}</p>
                    <p className="text-sm text-slate-600">{plan.location || plan.name}</p>
                    <p className="text-xs text-slate-500">
                      {plan.sessions_included} sessions · {plan.refreshments_included ? "refreshments included" : "refreshments separate"}
                    </p>
                    {plan.premium_venue_note ? (
                      <p className="text-xs text-amber-700">{plan.premium_venue_note}</p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-slate-900">
                      {formatCurrency(plan.club_fee_kobo / 100)}
                    </p>
                    <p className="text-xs text-slate-500">per quarter</p>
                  </div>
                </div>
              </Card>
            </button>
          );
        })}
        {!plansQuery.data?.length && !error ? (
          <Alert>No Club location is currently open for registration.</Alert>
        ) : null}
      </div>

      {selectedPlan ? (
        <Card className="space-y-5 border-cyan-100">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={experienceSelected}
              onChange={(event) => setExperienceSelected(event.target.checked)}
              className="mt-1 h-5 w-5 rounded border-slate-300 text-cyan-600"
            />
            <span className="flex-1">
              <span className="flex items-center gap-2 font-semibold text-slate-900">
                Quarterly Community Experience
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Optional</span>
              </span>
              <span className="mt-1 block text-sm text-slate-600">
                Added by default for the quarterly get-together and community experience. Untick it to opt out.
              </span>
            </span>
            <span className="font-semibold text-slate-900">
              {formatCurrency(selectedPlan.community_experience_fee_kobo / 100)}
            </span>
          </label>

          {podsQuery.data?.length ? (
            <label className="block space-y-2 text-sm font-medium text-slate-800">
              Preferred pod at this location (optional)
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
            <div className="flex justify-between"><span>Club practice</span><span>{formatCurrency(selectedPlan.club_fee_kobo / 100)}</span></div>
            {experienceSelected ? (
              <div className="flex justify-between"><span>Community Experience (optional)</span><span>{formatCurrency(selectedPlan.community_experience_fee_kobo / 100)}</span></div>
            ) : null}
            <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold">
              <span>Plan subtotal</span><span>{formatCurrency(planSubtotal)}</span>
            </div>
            <p className="text-xs text-slate-500">
              Any enabled online payment processing charge is shown separately before payment. It is not VAT.
            </p>
          </div>

          <Button onClick={submit} disabled={submitting} size="lg" className="w-full">
            {submitting ? "Submitting..." : "Submit for Club assessment"}
          </Button>
        </Card>
      ) : null}

      <div className="grid gap-3 rounded-2xl bg-slate-50 p-5 sm:grid-cols-3">
        {["Structured weekly practice", "Location-matched pods", "Progress assessment by email"].map((item, index) => (
          <div key={item} className="flex gap-2 text-sm text-slate-600">
            {index === 0 ? <Waves className="h-4 w-4 text-cyan-600" /> : index === 1 ? <Users className="h-4 w-4 text-cyan-600" /> : <Check className="h-4 w-4 text-cyan-600" />}
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
