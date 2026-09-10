"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { ClubPaymentModeSelector } from "@/components/club/ClubPaymentModeSelector";
import { useApi } from "@/hooks/useApi";
import {
  ClubApplication,
  ClubOperatingArea,
  ClubPlan,
  ClubPool,
  ClubPaymentMode,
  createClubApplication,
  submitClubPreAssessment,
} from "@/lib/clubOnboarding";
import {
  clubQuarterLabel,
  sortClubPlans,
  toggleIndependentClubPlan,
} from "@/lib/clubPlanSelection";
import { formatCurrency, useUpgrade } from "@/lib/upgradeContext";
import { Check, MapPin, Users, Waves } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Pod = {
  id: string;
  club_id: string;
  name: string;
  handle: string | null;
  active_member_count: number;
  max_size: number;
};

type PoolList = {
  items: ClubPool[];
  total: number;
};

const UNASSIGNED_AREA = "unassigned";

export default function ClubPlanSelectionPage() {
  const router = useRouter();
  const { state, setClubApplicationId } = useUpgrade();
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [experienceSelected, setExperienceSelected] = useState(false);
  const [preferredPodId, setPreferredPodId] = useState("");
  const [paymentMode, setPaymentMode] = useState<ClubPaymentMode>("quarterly_prepaid");
  const [submitting, setSubmitting] = useState(false);

  const plansQuery = useApi<ClubPlan[]>("/api/v1/clubs/plans", { auth: false });
  const areasQuery = useApi<ClubOperatingArea[]>("/api/v1/pools/operating-areas", {
    auth: false,
  });
  const poolsQuery = useApi<PoolList>(
    selectedAreaId
      ? `/api/v1/pools?page_size=100${
          selectedAreaId === UNASSIGNED_AREA
            ? ""
            : `&operating_area_id=${encodeURIComponent(selectedAreaId)}`
        }`
      : null,
    { auth: false }
  );
  const applicationsQuery = useApi<ClubApplication[]>("/api/v1/clubs/applications/me");

  const plans = useMemo(() => plansQuery.data ?? [], [plansQuery.data]);
  const areas = useMemo(() => {
    const planAreaIds = new Set(plans.map((plan) => plan.operating_area_id).filter(Boolean));
    const configured = (areasQuery.data ?? []).filter((area) => planAreaIds.has(area.id));
    const configuredIds = new Set(configured.map((area) => area.id));
    const missingNames = [...planAreaIds].filter((id) => id && !configuredIds.has(id));
    const result: Array<ClubOperatingArea & { isFallback?: boolean }> = [
      ...configured,
      ...missingNames.map((id) => ({
        id: id as string,
        name: "Other configured area",
        slug: `area-${id}`,
        area_type: "locality" as const,
        parent_id: null,
        country_code: "NG",
        timezone: "Africa/Lagos",
        currency: "NGN",
        is_active: true,
        isFallback: true,
      })),
    ];
    if (plans.some((plan) => !plan.operating_area_id)) {
      result.push({
        id: UNASSIGNED_AREA,
        name: "Other Lagos locations",
        slug: UNASSIGNED_AREA,
        area_type: "locality",
        parent_id: null,
        country_code: "NG",
        timezone: "Africa/Lagos",
        currency: "NGN",
        is_active: true,
        isFallback: true,
      });
    }
    return result;
  }, [areasQuery.data, plans]);

  const areaPlans = useMemo(
    () =>
      selectedAreaId
        ? plans.filter((plan) =>
            selectedAreaId === UNASSIGNED_AREA
              ? !plan.operating_area_id
              : plan.operating_area_id === selectedAreaId
          )
        : [],
    [plans, selectedAreaId]
  );
  const locations = useMemo(() => {
    const grouped = new Map<string, ClubPlan[]>();
    areaPlans.forEach((plan) => {
      grouped.set(plan.club_id, [...(grouped.get(plan.club_id) ?? []), plan]);
    });
    return [...grouped.entries()].map(
      ([clubId, clubPlans]) => [clubId, sortClubPlans(clubPlans)] as const
    );
  }, [areaPlans]);
  const poolsById = useMemo(
    () => new Map((poolsQuery.data?.items ?? []).map((pool) => [pool.id, pool])),
    [poolsQuery.data]
  );
  const locationPlans = selectedClubId
    ? (locations.find(([clubId]) => clubId === selectedClubId)?.[1] ?? [])
    : [];
  const selectedPlans = locationPlans.filter((plan) => selectedPlanIds.includes(plan.id));
  const primaryPlan = selectedPlans[0] ?? null;
  const podsQuery = useApi<Pod[]>(
    selectedClubId ? `/api/v1/members/pods/public?club_id=${selectedClubId}` : null,
    { auth: false }
  );

  const latestApplication = applicationsQuery.data?.[0] ?? null;
  const approvedApplication = applicationsQuery.data?.find(
    (application) => application.status === "approved"
  );
  const approvedPaymentModes = approvedApplication
    ? approvedApplication.approved_payment_modes.length
      ? approvedApplication.approved_payment_modes
      : (["quarterly_prepaid"] as ClubPaymentMode[])
    : [];
  const effectivePaymentMode = approvedPaymentModes.includes(paymentMode)
    ? paymentMode
    : (approvedPaymentModes[0] ?? paymentMode);
  const openApplication = applicationsQuery.data?.find((application) =>
    ["assessment_required", "assessment_pending", "approved"].includes(application.status)
  );
  const reusableReadinessApplication = applicationsQuery.data?.find(
    (application) =>
      application.status === "enrolled" &&
      ["club_ready", "club_ready_modified"].includes(application.assessment?.outcome ?? "")
  );

  useEffect(() => {
    if (!approvedApplication) return;
    if (paymentMode !== effectivePaymentMode) setPaymentMode(effectivePaymentMode);
  }, [approvedApplication, effectivePaymentMode, paymentMode]);

  const selectArea = (areaId: string) => {
    setSelectedAreaId(areaId);
    setSelectedClubId(null);
    setSelectedPlanIds([]);
    setPreferredPodId("");
  };

  const selectLocation = (clubPlans: ClubPlan[]) => {
    const primary = clubPlans.find((plan) => plan.entry_available);
    setSelectedClubId(clubPlans[0].club_id);
    setSelectedPlanIds(primary ? [primary.id] : []);
    setExperienceSelected(
      Boolean(primary?.community_experience_offering_id) &&
        Boolean(primary?.community_experience_default_selected)
    );
    setPreferredPodId("");
  };

  const toggleFutureQuarter = (plan: ClubPlan) => {
    if (!primaryPlan || plan.id === primaryPlan.id || !plan.entry_available) return;
    setSelectedPlanIds((current) => toggleIndependentClubPlan(current, plan));
  };

  const submit = async () => {
    const readiness = state.clubReadinessData;
    if (!primaryPlan) return;
    if (!readiness && !reusableReadinessApplication) {
      router.push("/upgrade/club/readiness");
      return;
    }
    if (readiness) {
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
    }
    setSubmitting(true);
    try {
      const application = await createClubApplication({
        plan_version_id: primaryPlan.id,
        plan_version_ids: selectedPlans.slice(1).map((plan) => plan.id),
        community_experience_selected:
          Boolean(primaryPlan.community_experience_offering_id) && experienceSelected,
        preferred_pod_id: preferredPodId || undefined,
        notes: readiness?.clubNotes || undefined,
      });
      if (application.status !== "approved") {
        if (!readiness) {
          throw new Error(
            "Your previous readiness approval could not be reused. Please complete the safety pre-assessment."
          );
        }
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
      }
      setClubApplicationId(application.id);
      applicationsQuery.refetch();
      if (application.status === "approved") {
        toast.success("Your prior Club readiness approval was reused. Your new quarter is ready.");
        router.push(
          `/checkout?purpose=club&application_id=${application.id}&payment_mode=quarterly_prepaid`
        );
      } else {
        toast.success("Application submitted. We will arrange your in-pool assessment.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit your application");
    } finally {
      setSubmitting(false);
    }
  };

  if (plansQuery.loading || areasQuery.loading || applicationsQuery.loading) {
    return <LoadingCard text="Loading Club locations..." />;
  }

  const planSubtotal = selectedPlans.reduce((sum, plan) => sum + plan.current_price_kobo, 0);
  const experienceFee = primaryPlan?.community_experience_fee_kobo ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-600 text-white">
          <MapPin className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Choose where you want to practise</h1>
        <p className="text-slate-600">
          Start with an area, then choose an available pool. Compare the available Club Club
          quarters.
        </p>
      </div>

      {plansQuery.error || areasQuery.error ? (
        <Alert variant="error" title="Could not load Club options">
          {plansQuery.error || areasQuery.error}
        </Alert>
      ) : null}

      <Alert title="One SwimBuddz identity, one checkout">
        Club is a practice programme. If your annual SwimBuddz Membership is due, it appears as a
        separate ₦20,000 line in your approved quote—you do not register twice.
      </Alert>

      {approvedApplication ? (
        <Alert variant="success" title="Assessment approved">
          <div className="space-y-3">
            <p>You&apos;re approved. Review your options and continue your registration.</p>
            <ClubPaymentModeSelector
              approvedModes={approvedPaymentModes}
              value={effectivePaymentMode}
              transitionExpiresAt={approvedApplication.transition_expires_at}
              onChange={setPaymentMode}
            />
            <Button
              size="sm"
              onClick={() =>
                router.push(
                  `/checkout?purpose=club&application_id=${approvedApplication.id}&payment_mode=${effectivePaymentMode}`
                )
              }
            >
              Continue Club registration
            </Button>
          </div>
        </Alert>
      ) : openApplication?.status === "assessment_pending" ? (
        <Alert variant="success" title="Application received">
          We will complete a 10–15 minute in-pool assessment, then email your result.
        </Alert>
      ) : openApplication?.status === "assessment_required" ? (
        <Alert variant="info" title="Finish your safety pre-assessment">
          Your Club location is saved, but the safety answers were not submitted. Return to Club
          readiness to complete this application.
          <div className="mt-3">
            <Button size="sm" onClick={() => router.push("/upgrade/club/readiness")}>
              Continue readiness
            </Button>
          </div>
        </Alert>
      ) : latestApplication?.status === "academy_recommended" ? (
        <Alert variant="info" title="Academy recommended">
          Your assessment recommends building your foundation through an Academy programme before
          Club practice.
          <div className="mt-3">
            <Button size="sm" onClick={() => router.push("/upgrade/academy/cohort")}>
              View Academy programmes
            </Button>
          </div>
        </Alert>
      ) : null}

      {!openApplication ? (
        <fieldset className="space-y-3">
          <legend className="text-base font-semibold text-slate-900">1. Choose an area</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {areas.map((area) => {
              const selected = selectedAreaId === area.id;
              const optionCount = new Set(
                plans
                  .filter((plan) =>
                    area.id === UNASSIGNED_AREA
                      ? !plan.operating_area_id
                      : plan.operating_area_id === area.id
                  )
                  .map((plan) => plan.club_id)
              ).size;
              return (
                <button
                  key={area.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => selectArea(area.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    selected
                      ? "border-cyan-500 bg-cyan-50 ring-2 ring-cyan-100"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <span className="font-semibold text-slate-900">{area.name}</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {optionCount} Club {optionCount === 1 ? "location" : "locations"}
                  </span>
                </button>
              );
            })}
          </div>
          {!areas.length ? (
            <Card className="text-sm text-slate-600">
              No Club locations are accepting applications right now.
            </Card>
          ) : null}
        </fieldset>
      ) : null}

      {selectedAreaId ? (
        <fieldset className="space-y-3">
          <legend className="text-base font-semibold text-slate-900">
            2. Choose a pool location
          </legend>
          {poolsQuery.error ? <Alert variant="error">{poolsQuery.error}</Alert> : null}
          <div className="space-y-3">
            {locations.map(([clubId, clubPlans]) => {
              const firstAvailable = clubPlans.find((plan) => plan.entry_available);
              const first = clubPlans[0];
              const planPoolId = first.pool_id || first.default_pool_id;
              const pool = planPoolId ? poolsById.get(planPoolId) : null;
              const selected = selectedClubId === clubId;
              return (
                <button
                  key={clubId}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => selectLocation(clubPlans)}
                  className="w-full text-left"
                >
                  <Card
                    className={
                      selected
                        ? "border-cyan-500 bg-cyan-50/40 ring-2 ring-cyan-100"
                        : "hover:border-slate-300"
                    }
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {pool?.name || first.location || first.club_name}
                        </p>
                        <p className="text-sm text-slate-600">
                          {first.club_name}
                          {pool?.location_area ? ` · ${pool.location_area}` : ""}
                        </p>
                        {pool?.address ? (
                          <p className="mt-1 text-xs text-slate-500">{pool.address}</p>
                        ) : null}
                        {!firstAvailable ? (
                          <p className="mt-1 text-xs text-amber-700">
                            Use drop-ins until a new Club quarter opens.
                          </p>
                        ) : null}
                      </div>
                      {firstAvailable ? (
                        <div className="text-right">
                          <p className="text-xl font-bold text-slate-900">
                            {formatCurrency(firstAvailable.current_price_kobo / 100)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {clubQuarterLabel(firstAvailable)}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </Card>
                </button>
              );
            })}
          </div>
          {!locations.length ? (
            <Card className="text-sm text-slate-600">
              No Club pool is available in this area yet.
            </Card>
          ) : null}
        </fieldset>
      ) : null}

      {selectedClubId && !primaryPlan ? (
        <Alert variant="info" title="Quarterly entry is closed">
          You can use Community drop-in swims for now. Come back when the next Club quarter is
          published; you can still complete your assessment ahead of time.
        </Alert>
      ) : null}

      {primaryPlan ? (
        <Card className="space-y-5 border-cyan-100">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
              3. Build your application
            </p>
            <h2 className="mt-1 font-semibold text-slate-900">Choose Club quarters</h2>
            <p className="text-sm text-slate-600">
              Your current or first available quarter is required. Future published quarters are
              optional and can be selected independently.
            </p>
          </div>
          <div className="space-y-2">
            {locationPlans.map((plan) => {
              const checked = selectedPlanIds.includes(plan.id);
              const required = plan.id === primaryPlan.id;
              const disabled = required || !plan.entry_available;
              return (
                <label
                  key={plan.id}
                  className={`flex items-start gap-3 rounded-xl border p-3 ${
                    disabled && !required ? "opacity-60" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleFutureQuarter(plan)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600"
                  />
                  <span className="flex-1">
                    <span className="font-medium text-slate-900">{clubQuarterLabel(plan)}</span>
                    <span className="block text-xs text-slate-500">
                      {plan.remaining_sessions} sessions remaining
                      {required ? " · your starting quarter" : " · add another quarter"}
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

          {primaryPlan.community_experience_offering_id ? (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-cyan-100 bg-cyan-50 p-4">
              <input
                type="checkbox"
                checked={experienceSelected}
                onChange={(event) => setExperienceSelected(event.target.checked)}
                className="mt-1 h-5 w-5 rounded border-slate-300 text-cyan-600"
              />
              <span className="flex-1">
                <span className="font-semibold text-slate-900">
                  {clubQuarterLabel(primaryPlan)} Community Experience
                </span>
                <span className="block text-sm text-slate-600">
                  Optional. This price applies when buying the Club quarter. If you join on
                  pay-per-swim access, the Standard member price applies instead. You can review or
                  remove this at checkout.
                </span>
                {experienceSelected ? (
                  <span className="mt-1 block text-xs font-medium text-cyan-800">
                    Untick this box to remove it before submitting.
                  </span>
                ) : null}
              </span>
              <span className="font-semibold text-slate-900">
                {formatCurrency(experienceFee / 100)}
              </span>
            </label>
          ) : null}

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
                  <option
                    key={pod.id}
                    value={pod.id}
                    disabled={pod.active_member_count >= pod.max_size}
                  >
                    {pod.handle || pod.name} · {pod.active_member_count}/{pod.max_size}
                    {pod.active_member_count >= pod.max_size ? " · full" : ""}
                  </option>
                ))}
              </select>
              <span className="block text-xs font-normal text-slate-500">
                A preference is not a guarantee; final placement depends on assessment fit and
                capacity.
              </span>
            </label>
          ) : null}

          <div className="space-y-2 border-t border-slate-100 pt-4 text-sm">
            <div className="flex justify-between gap-3">
              <span>Selected Club quarters</span>
              <span>{formatCurrency(planSubtotal / 100)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Community Experience (optional)</span>
              <span>{experienceSelected ? formatCurrency(experienceFee / 100) : "Not added"}</span>
            </div>
            <div className="flex justify-between gap-3 border-t border-slate-100 pt-2 font-semibold">
              <span>Estimated total</span>
              <span>
                {formatCurrency((planSubtotal + (experienceSelected ? experienceFee : 0)) / 100)}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              This is an estimate. Before you pay, you&apos;ll see the final amount, including
              annual Membership if due and any payment-processing fee.
            </p>
          </div>

          <Button onClick={submit} disabled={submitting} size="lg" className="w-full">
            {submitting
              ? "Submitting..."
              : reusableReadinessApplication
                ? "Renew Club quarter"
                : "Submit for Club assessment"}
          </Button>
        </Card>
      ) : null}

      <div className="grid gap-3 rounded-2xl bg-slate-50 p-5 sm:grid-cols-3">
        {["Structured weekly practice", "Location-matched pods", "Assessment result by email"].map(
          (item, index) => (
            <div key={item} className="flex gap-2 text-sm text-slate-600">
              {index === 0 ? (
                <Waves className="h-4 w-4 text-cyan-600" />
              ) : index === 1 ? (
                <Users className="h-4 w-4 text-cyan-600" />
              ) : (
                <Check className="h-4 w-4 text-cyan-600" />
              )}
              {item}
            </div>
          )
        )}
      </div>
    </div>
  );
}
