"use client";

import { ClubReadinessStep } from "@/components/onboarding/ClubReadinessStep";
import { Button } from "@/components/ui/Button";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet, apiPatch } from "@/lib/api";
import { useUpgrade } from "@/lib/upgradeContext";
import { Calendar, Check, Waves } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Member = {
  id?: string;
  availability?: {
    available_days?: string[] | null;
  } | null;
  membership?: {
    club_notes?: string | null;
  } | null;
};

export default function ClubReadinessPage() {
  const router = useRouter();
  const {
    state,
    setClubReadinessData,
    markClubReadinessComplete,
    setTargetTier,
  } = useUpgrade();

  const [formData, setFormData] = useState({
    availabilitySlots: state.clubReadinessData?.availableDays || [],
    clubNotes: state.clubReadinessData?.clubNotes || "",
    canSwim25mContinuously: state.clubReadinessData?.canSwim25mContinuously,
    controlledBreathing: state.clubReadinessData?.controlledBreathing,
    comfortableInDeepWater: state.clubReadinessData?.comfortableInDeepWater,
    canFloatOrTread30Seconds: state.clubReadinessData?.canFloatOrTread30Seconds,
    canStopAndRecover: state.clubReadinessData?.canStopAndRecover,
    currentNonstopDistanceM: state.clubReadinessData?.currentNonstopDistanceM ?? null,
    lastSwimDate: state.clubReadinessData?.lastSwimDate || "",
    injuriesOrAccommodations: state.clubReadinessData?.injuriesOrAccommodations || "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Set target tier on mount
  useEffect(() => {
    setTargetTier("club");
  }, [setTargetTier]);

  // Load existing data from member profile
  const loadMember = useCallback(async () => {
    setLoading(true);
    try {
      const member = await apiGet<Member>("/api/v1/members/me", { auth: true });
      setFormData({
        availabilitySlots: member.availability?.available_days || [],
        clubNotes: member.membership?.club_notes || "",
        canSwim25mContinuously: state.clubReadinessData?.canSwim25mContinuously,
        controlledBreathing: state.clubReadinessData?.controlledBreathing,
        comfortableInDeepWater: state.clubReadinessData?.comfortableInDeepWater,
        canFloatOrTread30Seconds: state.clubReadinessData?.canFloatOrTread30Seconds,
        canStopAndRecover: state.clubReadinessData?.canStopAndRecover,
        currentNonstopDistanceM: state.clubReadinessData?.currentNonstopDistanceM ?? null,
        lastSwimDate: state.clubReadinessData?.lastSwimDate || "",
        injuriesOrAccommodations: state.clubReadinessData?.injuriesOrAccommodations || "",
      });
    } catch (e) {
      console.error("Failed to load member data:", e);
    } finally {
      setLoading(false);
    }
  }, [state.clubReadinessData]);

  useEffect(() => {
    loadMember();
  }, [loadMember]);

  const handleToggleAvailability = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      availabilitySlots: prev.availabilitySlots.includes(value)
        ? prev.availabilitySlots.filter((v) => v !== value)
        : [...prev.availabilitySlots, value],
    }));
  };

  const handleUpdateNotes = (value: string) => {
    setFormData((prev) => ({ ...prev, clubNotes: value }));
  };

  const readinessAnswers = [
    formData.canSwim25mContinuously,
    formData.controlledBreathing,
    formData.comfortableInDeepWater,
    formData.canFloatOrTread30Seconds,
    formData.canStopAndRecover,
  ];
  const isValid =
    formData.availabilitySlots.length > 0 &&
    readinessAnswers.every((answer) => typeof answer === "boolean");

  const handleSubmit = async () => {
    if (!isValid) return;

    setSaving(true);
    try {
      // Save to backend - include 'club' in requested_tiers so entitlement can be applied after payment
      await apiPatch(
        "/api/v1/members/me",
        {
          availability: { available_days: formData.availabilitySlots },
          membership: {
            club_notes: formData.clubNotes,
            requested_tiers: ["club"], // Required for club entitlement activation
          },
        },
        { auth: true },
      );

      // Update context
      setClubReadinessData({
        availableDays: formData.availabilitySlots,
        clubNotes: formData.clubNotes,
        canSwim25mContinuously: formData.canSwim25mContinuously,
        controlledBreathing: formData.controlledBreathing,
        comfortableInDeepWater: formData.comfortableInDeepWater,
        canFloatOrTread30Seconds: formData.canFloatOrTread30Seconds,
        canStopAndRecover: formData.canStopAndRecover,
        currentNonstopDistanceM: formData.currentNonstopDistanceM,
        lastSwimDate: formData.lastSwimDate,
        injuriesOrAccommodations: formData.injuriesOrAccommodations,
      });
      markClubReadinessComplete();

      // Navigate to plan selection
      router.push("/upgrade/club/plan");
    } catch (e) {
      toast.error("Failed to save. Please try again.");
      console.error("Save error:", e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingCard text="Loading your profile..." />;
  }

  return (
    <div className="max-w-xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-500/25">
          <Calendar className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          Set Your Availability
        </h1>
        <p className="text-slate-500">
          Tell us when you're available so we can match you with the right
          sessions.
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <ClubReadinessStep
          formData={formData}
          onToggleAvailability={handleToggleAvailability}
          onUpdateNotes={handleUpdateNotes}
        />
      </div>

      <div className="space-y-5 rounded-2xl border border-cyan-200 bg-cyan-50/50 p-5">
        <div className="flex gap-3">
          <Waves className="mt-0.5 h-5 w-5 flex-none text-cyan-600" />
          <div>
            <h2 className="font-semibold text-slate-900">Safety pre-assessment</h2>
            <p className="text-sm text-slate-600">
              This helps us plan your in-pool assessment. It is not a pass or fail decision by itself.
            </p>
          </div>
        </div>

        {([
          ["canSwim25mContinuously", "Can you swim 25 metres continuously without assistance?"],
          ["controlledBreathing", "Can you breathe in a controlled way while swimming?"],
          ["comfortableInDeepWater", "Are you calm where your feet cannot touch the bottom?"],
          ["canFloatOrTread30Seconds", "Can you float or tread water for about 30 seconds?"],
          ["canStopAndRecover", "Can you stop mid-swim, regain control, and reach the wall safely?"],
        ] as const).map(([key, label]) => (
          <fieldset key={key} className="space-y-2">
            <legend className="text-sm font-medium text-slate-800">{label}</legend>
            <div className="grid grid-cols-2 gap-2">
              {[true, false].map((answer) => (
                <button
                  key={String(answer)}
                  type="button"
                  onClick={() => setFormData((current) => ({ ...current, [key]: answer }))}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                    formData[key] === answer
                      ? "border-cyan-500 bg-cyan-600 text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {answer ? "Yes" : "Not yet"}
                </button>
              ))}
            </div>
          </fieldset>
        ))}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-slate-800">
            Current non-stop distance (metres)
            <input
              type="number"
              min={0}
              value={formData.currentNonstopDistanceM ?? ""}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  currentNonstopDistanceM: event.target.value ? Number(event.target.value) : null,
                }))
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-800">
            When did you last swim?
            <input
              type="date"
              value={formData.lastSwimDate}
              onChange={(event) =>
                setFormData((current) => ({ ...current, lastSwimDate: event.target.value }))
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
            />
          </label>
        </div>
        <label className="space-y-1 text-sm font-medium text-slate-800">
          Injuries or accommodations (optional)
          <textarea
            value={formData.injuriesOrAccommodations}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                injuriesOrAccommodations: event.target.value,
              }))
            }
            rows={3}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal"
          />
        </label>
      </div>

      {/* Benefits */}
      <div className="bg-slate-50 rounded-2xl p-5">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">
          Why we ask this
        </h4>
        <ul className="space-y-2">
          {[
            "Match you with sessions at your preferred times",
            "Group you with swimmers on similar schedules",
            "Send relevant session notifications only",
          ].map((item) => (
            <li
              key={item}
              className="flex items-center gap-2 text-sm text-slate-600"
            >
              <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Continue button */}
      <Button
        onClick={handleSubmit}
        disabled={!isValid || saving}
        size="lg"
        className="w-full"
      >
        {saving ? "Saving..." : "Choose a Club Location"}
      </Button>

      <p className="text-center text-xs text-slate-400">
        You can update your availability anytime from your profile
      </p>
    </div>
  );
}
