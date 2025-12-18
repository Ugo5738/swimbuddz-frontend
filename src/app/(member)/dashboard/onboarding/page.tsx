"use client";

import { TimezoneCombobox } from "@/components/forms/TimezoneCombobox";
import { ClubReadinessStep } from "@/components/onboarding/ClubReadinessStep";
import { CommunitySignalsStep } from "@/components/onboarding/CommunitySignalsStep";
import { SwimBackgroundStep } from "@/components/onboarding/SwimBackgroundStep";
import { AcademyDetailsStep } from "@/components/registration/AcademyDetailsStep";
import { ClubDetailsStep } from "@/components/registration/ClubDetailsStep";
import { RegistrationEssentialsStep } from "@/components/registration/RegistrationEssentialsStep";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { Select } from "@/components/ui/Select";
import { apiGet, apiPatch } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Member = {
    membership_tier?: string;
    membership_tiers?: string[];
    requested_membership_tiers?: string[] | null;
    community_paid_until?: string | null;
    club_paid_until?: string | null;
    academy_paid_until?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    area_in_lagos?: string | null;
    profile_photo_url?: string | null;
    gender?: string | null;
    date_of_birth?: string | null;
    city?: string | null;
    country?: string | null;
    time_zone?: string | null;
    swim_level?: string | null;
    deep_water_comfort?: string | null;
    strokes?: string[] | null;
    interests?: string[] | null;
    goals_narrative?: string | null;
    comms_preference?: string | null;
    language_preference?: string | null;
    volunteer_interest?: string[] | null;
    availability_slots?: string[] | null;

    emergency_contact_name?: string | null;
    emergency_contact_relationship?: string | null;
    emergency_contact_phone?: string | null;
    medical_info?: string | null;
    location_preference?: string[] | null;
    time_of_day_availability?: string[] | null;
    club_notes?: string | null;

    academy_skill_assessment?: Record<string, boolean> | null;
    academy_goals?: string | null;
    academy_preferred_coach_gender?: string | null;
    academy_lesson_preference?: string | null;
};

function formatDateForInput(value?: string | null) {
    if (!value) return "";
    const ms = Date.parse(String(value));
    if (!Number.isFinite(ms)) return "";
    return new Date(ms).toISOString().split("T")[0] || "";
}

type StepKey = "welcome" | "core" | "safety" | "swim" | "club" | "academy" | "signals" | "review";
type Step = { key: StepKey; title: string; required: boolean };

export default function DashboardOnboardingPage() {
    const router = useRouter();
    const [member, setMember] = useState<Member | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentStep, setCurrentStep] = useState<StepKey>("welcome");

    const loadMember = async (options?: { silent?: boolean }) => {
        if (!options?.silent) setLoading(true);
        if (!options?.silent) setError(null);
        try {
            const data = await apiGet<Member>("/api/v1/members/me", { auth: true });
            setMember(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load onboarding.");
        } finally {
            if (!options?.silent) setLoading(false);
        }
    };

    useEffect(() => {
        loadMember();
    }, []);

    const approvedTiers = useMemo(() => {
        const tiers = (member?.membership_tiers && member.membership_tiers.length > 0)
            ? member.membership_tiers
            : member?.membership_tier
                ? [member.membership_tier]
                : ["community"];
        return tiers.map((t) => String(t).toLowerCase());
    }, [member]);

    const requestedTiers = useMemo(() => (member?.requested_membership_tiers || []).map((t) => String(t).toLowerCase()), [member]);
    const wantsAcademy = requestedTiers.includes("academy");
    const wantsClub = requestedTiers.includes("club") || wantsAcademy;

    const clubContext = wantsClub || approvedTiers.includes("club") || approvedTiers.includes("academy");
    const academyContext = wantsAcademy || approvedTiers.includes("academy");

    const needsCoreProfile = useMemo(() => {
        if (!member) return false;
        return !member.profile_photo_url ||
            !member.gender ||
            !member.date_of_birth ||
            !member.first_name ||
            !member.last_name ||
            !member.phone ||
            !member.country ||
            !member.city ||
            !member.time_zone;
    }, [member]);

    const needsSafetyLogistics = useMemo(() => {
        if (!member) return false;
        return !member.emergency_contact_name ||
            !member.emergency_contact_relationship ||
            !member.emergency_contact_phone ||
            !(member.location_preference && member.location_preference.length > 0) ||
            !(member.time_of_day_availability && member.time_of_day_availability.length > 0);
    }, [member]);

    const needsSwimBackground = useMemo(() => {
        if (!member) return false;
        return !member.swim_level || !member.deep_water_comfort || !member.goals_narrative;
    }, [member]);

    const needsClubReadiness = useMemo(() => {
        if (!member) return false;
        if (!clubContext) return false;
        return !(member.availability_slots && member.availability_slots.length > 0);
    }, [member, clubContext]);

    const needsAcademyReadiness = useMemo(() => {
        if (!member) return false;
        if (!academyContext) return false;
        const assessment = member.academy_skill_assessment;
        const hasAssessment =
            assessment &&
            ["canFloat", "headUnderwater", "deepWaterComfort", "canSwim25m"].some(
                (k) => Object.prototype.hasOwnProperty.call(assessment, k)
            );
        return !hasAssessment ||
            !member.academy_goals ||
            !member.academy_preferred_coach_gender ||
            !member.academy_lesson_preference;
    }, [member, academyContext]);

    const [coreForm, setCoreForm] = useState({
        firstName: "",
        lastName: "",
        phone: "",
        areaInLagos: "",
        city: "",
        country: "",
        gender: "",
        dateOfBirth: "",
        profilePhotoUrl: "",
        timeZone: "",
    });

    const [clubForm, setClubForm] = useState({
        emergencyContactName: "",
        emergencyContactRelationship: "",
        emergencyContactPhone: "",
        medicalInfo: "",
        locationPreference: [] as string[],
        timeOfDayAvailability: [] as string[],
        clubNotes: "",
    });

    const [clubReadinessForm, setClubReadinessForm] = useState({
        availabilitySlots: [] as string[],
        clubNotes: "",
    });

    const [swimForm, setSwimForm] = useState({
        swimLevel: "",
        deepWaterComfort: "",
        strokes: [] as string[],
        goalsNarrative: "",
    });

    const [academyForm, setAcademyForm] = useState({
        academySkillAssessment: {
            canFloat: false,
            headUnderwater: false,
            deepWaterComfort: false,
            canSwim25m: false,
        },
        academyGoals: "",
        academyPreferredCoachGender: "",
        academyLessonPreference: "",
    });

    const [signalsForm, setSignalsForm] = useState({
        interests: [] as string[],
        volunteerInterest: [] as string[],
    });

    useEffect(() => {
        if (!member) return;
        setCoreForm({
            firstName: member.first_name || "",
            lastName: member.last_name || "",
            phone: member.phone || "",
            areaInLagos: member.area_in_lagos || "",
            city: member.city || "",
            country: member.country || "",
            gender: member.gender || "",
            dateOfBirth: formatDateForInput(member.date_of_birth),
            profilePhotoUrl: member.profile_photo_url || "",
            timeZone: member.time_zone || "",
        });
        setClubForm({
            emergencyContactName: member.emergency_contact_name || "",
            emergencyContactRelationship: member.emergency_contact_relationship || "",
            emergencyContactPhone: member.emergency_contact_phone || "",
            medicalInfo: member.medical_info || "",
            locationPreference: member.location_preference || [],
            timeOfDayAvailability: member.time_of_day_availability || [],
            clubNotes: member.club_notes || "",
        });
        setClubReadinessForm({
            availabilitySlots: member.availability_slots || [],
            clubNotes: member.club_notes || "",
        });
        setSwimForm({
            swimLevel: member.swim_level || "",
            deepWaterComfort: member.deep_water_comfort || "",
            strokes: member.strokes || [],
            goalsNarrative: member.goals_narrative || "",
        });
        setAcademyForm({
            academySkillAssessment: (member.academy_skill_assessment as any) || {
                canFloat: false,
                headUnderwater: false,
                deepWaterComfort: false,
                canSwim25m: false,
            },
            academyGoals: member.academy_goals || "",
            academyPreferredCoachGender: member.academy_preferred_coach_gender || "",
            academyLessonPreference: member.academy_lesson_preference || "",
        });
        setSignalsForm({
            interests: member.interests || [],
            volunteerInterest: member.volunteer_interest || [],
        });
    }, [member]);

    const toggleClubMulti = (field: "locationPreference" | "timeOfDayAvailability", option: string) => {
        setClubForm((prev) => {
            const current = prev[field];
            const exists = current.includes(option);
            return {
                ...prev,
                [field]: exists ? current.filter((x) => x !== option) : [...current, option],
            };
        });
    };

    const toggleClubReadinessMulti = (option: string) => {
        setClubReadinessForm((prev) => {
            const exists = prev.availabilitySlots.includes(option);
            return {
                ...prev,
                availabilitySlots: exists ? prev.availabilitySlots.filter((x) => x !== option) : [...prev.availabilitySlots, option],
            };
        });
    };

    const toggleStroke = (stroke: string) => {
        setSwimForm((prev) => {
            const exists = prev.strokes.includes(stroke);
            return {
                ...prev,
                strokes: exists ? prev.strokes.filter((x) => x !== stroke) : [...prev.strokes, stroke],
            };
        });
    };

    const toggleSignalsMulti = (field: "interests" | "volunteerInterest", value: string) => {
        setSignalsForm((prev) => {
            const current = prev[field];
            const exists = current.includes(value);
            return {
                ...prev,
                [field]: exists ? current.filter((x) => x !== value) : [...current, value],
            };
        });
    };

    const coreFormValid = Boolean(
        coreForm.firstName &&
        coreForm.lastName &&
        coreForm.phone &&
        coreForm.country &&
        coreForm.city &&
        coreForm.gender &&
        coreForm.dateOfBirth &&
        coreForm.profilePhotoUrl &&
        coreForm.timeZone
    );

    const safetyFormValid = Boolean(
        clubForm.emergencyContactName &&
        clubForm.emergencyContactRelationship &&
        clubForm.emergencyContactPhone &&
        clubForm.locationPreference.length > 0 &&
        clubForm.timeOfDayAvailability.length > 0
    );

    const swimFormValid = Boolean(
        swimForm.swimLevel &&
        swimForm.deepWaterComfort &&
        swimForm.goalsNarrative && swimForm.goalsNarrative.trim()
    );

    const clubReadinessValid = !clubContext || clubReadinessForm.availabilitySlots.length > 0;

    const academyFormValid = Boolean(
        academyForm.academyGoals &&
        academyForm.academyPreferredCoachGender &&
        academyForm.academyLessonPreference
    );

    const steps = useMemo<Step[]>(() => {
        const base: Step[] = [
            { key: "welcome", title: "Welcome", required: false },
            { key: "core", title: "Core profile", required: true },
            { key: "safety", title: "Safety & logistics", required: true },
            { key: "swim", title: "Swimming background", required: true },
        ];

        if (clubContext) base.push({ key: "club", title: "Club readiness", required: true });
        if (academyContext) base.push({ key: "academy", title: "Academy readiness", required: true });

        base.push({ key: "signals", title: "Community signals", required: false });
        base.push({ key: "review", title: "Finish", required: true });
        return base;
    }, [clubContext, academyContext]);

    const stepIndex = steps.findIndex((s) => s.key === currentStep);
    const stepCountExcludingWelcome = Math.max(steps.length - 1, 1);
    const currentNumber = Math.max(stepIndex, 1);

    const requiredStepCount = steps.filter((s) => s.required && s.key !== "welcome" && s.key !== "review").length;
    const completedRequiredCount = [
        { complete: !needsCoreProfile },
        { complete: !needsSafetyLogistics },
        { complete: !needsSwimBackground },
        ...(clubContext ? [{ complete: !needsClubReadiness }] : []),
        ...(academyContext ? [{ complete: !needsAcademyReadiness }] : []),
    ].filter((item) => item.complete).length;
    const progressPercent = requiredStepCount > 0 ? Math.round((completedRequiredCount / requiredStepCount) * 100) : 100;

    function firstIncompleteStep(): StepKey {
        if (needsCoreProfile) return "core";
        if (needsSafetyLogistics) return "safety";
        if (needsSwimBackground) return "swim";
        if (needsClubReadiness) return "club";
        if (needsAcademyReadiness) return "academy";
        return "review";
    }

    function isStepSatisfied(step: StepKey, opts?: { assumeSatisfied?: StepKey }) {
        if (opts?.assumeSatisfied && step === opts.assumeSatisfied) return true;
        if (step === "welcome") return true;
        if (step === "core") return !needsCoreProfile;
        if (step === "safety") return !needsSafetyLogistics;
        if (step === "swim") return !needsSwimBackground;
        if (step === "club") return !needsClubReadiness;
        if (step === "academy") return !needsAcademyReadiness;
        if (step === "signals") return false;
        if (step === "review") return firstIncompleteStep() === "review";
        return false;
    }

    function nextStepFrom(step: StepKey, opts?: { assumeSatisfied?: StepKey }): StepKey {
        const idx = steps.findIndex((s) => s.key === step);
        for (let i = Math.max(idx + 1, 0); i < steps.length; i++) {
            const key = steps[i].key;
            if (key === "signals" || key === "review") return key;
            if (!isStepSatisfied(key, opts)) return key;
        }
        return "review";
    }

    const saveCore = async () => {
        setSaving(true);
        try {
            await apiPatch(
                "/api/v1/members/me",
                {
                    first_name: coreForm.firstName,
                    last_name: coreForm.lastName,
                    phone: coreForm.phone,
                    area_in_lagos: coreForm.areaInLagos || undefined,
                    country: coreForm.country,
                    city: coreForm.city,
                    gender: coreForm.gender,
                    date_of_birth: coreForm.dateOfBirth,
                    profile_photo_url: coreForm.profilePhotoUrl,
                    time_zone: coreForm.timeZone,
                },
                { auth: true }
            );
            toast.success("Core profile saved");
            await loadMember({ silent: true });
        } catch (e) {
            toast.error("Failed to save core profile");
        } finally {
            setSaving(false);
        }
    };

    const saveSafety = async () => {
        setSaving(true);
        try {
            await apiPatch(
                "/api/v1/members/me",
                {
                    emergency_contact_name: clubForm.emergencyContactName,
                    emergency_contact_relationship: clubForm.emergencyContactRelationship,
                    emergency_contact_phone: clubForm.emergencyContactPhone,
                    medical_info: clubForm.medicalInfo,
                    location_preference: clubForm.locationPreference,
                    time_of_day_availability: clubForm.timeOfDayAvailability,
                },
                { auth: true }
            );
            toast.success("Safety & logistics saved");
            await loadMember({ silent: true });
        } catch (e) {
            toast.error("Failed to save safety & logistics");
        } finally {
            setSaving(false);
        }
    };

    const saveSwimBackground = async () => {
        setSaving(true);
        try {
            await apiPatch(
                "/api/v1/members/me",
                {
                    swim_level: swimForm.swimLevel,
                    deep_water_comfort: swimForm.deepWaterComfort,
                    strokes: swimForm.strokes,
                    goals_narrative: swimForm.goalsNarrative,
                },
                { auth: true }
            );
            toast.success("Swimming background saved");
            await loadMember({ silent: true });
        } catch {
            toast.error("Failed to save swimming background");
        } finally {
            setSaving(false);
        }
    };

    const saveClubReadiness = async () => {
        if (!clubContext) return;
        setSaving(true);
        try {
            await apiPatch(
                "/api/v1/members/me",
                {
                    availability_slots: clubReadinessForm.availabilitySlots,
                    club_notes: clubReadinessForm.clubNotes || undefined,
                },
                { auth: true }
            );
            toast.success("Club readiness saved");
            await loadMember({ silent: true });
        } catch {
            toast.error("Failed to save Club readiness");
        } finally {
            setSaving(false);
        }
    };

    const saveAcademy = async () => {
        if (!academyContext) return;
        setSaving(true);
        try {
            await apiPatch(
                "/api/v1/members/me",
                {
                    academy_skill_assessment: academyForm.academySkillAssessment,
                    academy_goals: academyForm.academyGoals,
                    academy_preferred_coach_gender: academyForm.academyPreferredCoachGender,
                    academy_lesson_preference: academyForm.academyLessonPreference,
                },
                { auth: true }
            );
            toast.success("Academy readiness saved");
            await loadMember({ silent: true });
        } catch (e) {
            toast.error("Failed to save Academy readiness");
        } finally {
            setSaving(false);
        }
    };

    const saveSignals = async () => {
        setSaving(true);
        try {
            await apiPatch(
                "/api/v1/members/me",
                {
                    interests: signalsForm.interests,
                    volunteer_interest: signalsForm.volunteerInterest,
                },
                { auth: true }
            );
            toast.success("Preferences saved");
            await loadMember({ silent: true });
        } catch {
            toast.error("Failed to save preferences");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <LoadingCard text="Loading onboarding..." />;
    }

    if (error) {
        return (
            <div className="p-6">
                <Alert variant="error" title="Onboarding error">
                    {error}
                </Alert>
            </div>
        );
    }

    if (!member) return null;

    const nextStepKey = steps[stepIndex + 1]?.key;
    const prevStepKey = steps[stepIndex - 1]?.key;

    const canGoBack = Boolean(prevStepKey);

    const goNext = () => {
        if (nextStepKey) setCurrentStep(nextStepKey);
    };

    const goBack = () => {
        if (prevStepKey) setCurrentStep(prevStepKey);
    };

    const handleContinue = async () => {
        if (currentStep === "welcome") {
            setCurrentStep(nextStepFrom("welcome"));
            return;
        }

        if (currentStep === "core") {
            if (!coreFormValid) return;
            await saveCore();
            setCurrentStep(nextStepFrom("core", { assumeSatisfied: "core" }));
            return;
        }

        if (currentStep === "safety") {
            if (!safetyFormValid) return;
            await saveSafety();
            setCurrentStep(nextStepFrom("safety", { assumeSatisfied: "safety" }));
            return;
        }

        if (currentStep === "swim") {
            if (!swimFormValid) return;
            await saveSwimBackground();
            setCurrentStep(nextStepFrom("swim", { assumeSatisfied: "swim" }));
            return;
        }

        if (currentStep === "club") {
            if (!clubReadinessValid) return;
            await saveClubReadiness();
            setCurrentStep(nextStepFrom("club", { assumeSatisfied: "club" }));
            return;
        }

        if (currentStep === "academy") {
            if (!academyFormValid) return;
            await saveAcademy();
            setCurrentStep(nextStepFrom("academy", { assumeSatisfied: "academy" }));
            return;
        }

        if (currentStep === "signals") {
            const hasAnything =
                (signalsForm.interests && signalsForm.interests.length > 0) ||
                (signalsForm.volunteerInterest && signalsForm.volunteerInterest.length > 0);
            if (hasAnything) await saveSignals();
            setCurrentStep("review");
            return;
        }

        if (currentStep === "review") {
            router.push("/dashboard");
            return;
        }

        goNext();
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold text-slate-900">Onboarding</h1>
                <p className="text-slate-600">
                    Let’s get you set up properly. This takes about 3–5 minutes. You can skip optional items and come back later.
                </p>
            </header>

            <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                    <div className="text-sm text-slate-600">
                        Step {currentNumber} of {stepCountExcludingWelcome} • {progressPercent}% complete
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => router.push("/dashboard")}>Skip for now</Button>
                    </div>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-cyan-600" style={{ width: `${progressPercent}%` }} />
                </div>
            </Card>

            {(wantsClub || wantsAcademy) && member?.requested_membership_tiers && member.requested_membership_tiers.length > 0 ? (
                <Card className="p-4 space-y-1">
                    <p className="text-sm font-medium text-slate-900">Your selection is saved</p>
                    <p className="text-sm text-slate-600">
                        You selected {wantsAcademy ? "Academy" : "Club"} during signup. Completing readiness here helps us support you and speed up the next steps.
                    </p>
                </Card>
            ) : null}

            <Card className="p-6 space-y-6">
                {currentStep === "welcome" ? (
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-xl font-semibold text-slate-900">
                                Welcome{member.first_name ? `, ${member.first_name}` : ""} 👋
                            </h2>
                            <p className="text-sm text-slate-600">
                                We’ll collect: core profile, safety & logistics, swimming background
                                {clubContext ? ", Club readiness" : ""}{academyContext ? ", Academy readiness" : ""}.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Button onClick={handleContinue}>Start</Button>
                            <Button variant="outline" onClick={() => setCurrentStep(firstIncompleteStep())}>
                                Resume
                            </Button>
                        </div>
                    </div>
                ) : null}

                {currentStep === "core" ? (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h2 className="text-xl font-semibold text-slate-900">Core profile</h2>
                            <p className="text-sm text-slate-600">Basic identity and contact details so we can support you safely.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">
                                Profile photo <span className="text-rose-500">*</span>
                            </label>
                            {coreForm.profilePhotoUrl ? (
                                <div className="flex items-center gap-4">
                                    <img
                                        src={coreForm.profilePhotoUrl}
                                        alt="Profile preview"
                                        className="h-16 w-16 rounded-full object-cover border border-slate-200"
                                    />
                                    <div className="flex items-center gap-2">
                                        <label className="inline-flex">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(event) => {
                                                    const file = event.target.files?.[0];
                                                    if (!file) return;
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        setCoreForm((prev) => ({ ...prev, profilePhotoUrl: String(reader.result || "") }));
                                                    };
                                                    reader.readAsDataURL(file);
                                                }}
                                            />
                                            <Button type="button" variant="outline">Change</Button>
                                        </label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setCoreForm((prev) => ({ ...prev, profilePhotoUrl: "" }))}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <label className="flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
                                    <span className="text-sm text-slate-600">Upload a photo</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(event) => {
                                            const file = event.target.files?.[0];
                                            if (!file) return;
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                                setCoreForm((prev) => ({ ...prev, profilePhotoUrl: String(reader.result || "") }));
                                            };
                                            reader.readAsDataURL(file);
                                        }}
                                    />
                                    <span className="text-sm font-medium text-cyan-700">Choose file</span>
                                </label>
                            )}
                        </div>

                        <RegistrationEssentialsStep
                            mode="onboarding"
                            includeSwimLevel={false}
                            formData={{
                                firstName: coreForm.firstName,
                                lastName: coreForm.lastName,
                                phone: coreForm.phone,
                                areaInLagos: coreForm.areaInLagos,
                                city: coreForm.city,
                                country: coreForm.country,
                            }}
                            onUpdate={(field, value) => setCoreForm((prev) => ({ ...prev, [field]: value }))}
                        />

                        <div className="grid gap-4 md:grid-cols-2">
                            <Select
                                label="Gender"
                                name="gender"
                                value={coreForm.gender}
                                onChange={(e) => setCoreForm((prev) => ({ ...prev, gender: e.target.value }))}
                                required
                            >
                                <option value="">Select gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </Select>

                            <Input
                                label="Date of birth"
                                name="dateOfBirth"
                                type="date"
                                value={coreForm.dateOfBirth}
                                onChange={(e) => setCoreForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
                                required
                            />
                        </div>

                        <TimezoneCombobox
                            label="Time zone"
                            value={coreForm.timeZone}
                            onChange={(value) => setCoreForm((prev) => ({ ...prev, timeZone: value }))}
                            required
                            name="timeZone"
                        />
                    </div>
                ) : null}

                {currentStep === "safety" ? (
                    <ClubDetailsStep
                        mode="onboarding"
                        includeNotesField={false}
                        formData={clubForm}
                        onUpdate={(field, value) => setClubForm((prev) => ({ ...prev, [field]: value as any }))}
                        onToggleMulti={(field, option) => {
                            if (field === "locationPreference" || field === "timeOfDayAvailability") {
                                toggleClubMulti(field, option);
                            }
                        }}
                    />
                ) : null}

                {currentStep === "swim" ? (
                    <SwimBackgroundStep
                        formData={swimForm}
                        onUpdate={(field, value) => setSwimForm((prev) => ({ ...prev, [field]: value as any }))}
                        onToggleStroke={toggleStroke}
                    />
                ) : null}

                {currentStep === "club" ? (
                    <ClubReadinessStep
                        formData={clubReadinessForm}
                        onToggleAvailability={toggleClubReadinessMulti}
                        onUpdateNotes={(value) => setClubReadinessForm((prev) => ({ ...prev, clubNotes: value }))}
                    />
                ) : null}

                {currentStep === "academy" ? (
                    <AcademyDetailsStep
                        formData={academyForm}
                        onUpdate={(field, value) => setAcademyForm((prev) => ({ ...prev, [field]: value as any }))}
                    />
                ) : null}

                {currentStep === "signals" ? (
                    <CommunitySignalsStep
                        formData={signalsForm}
                        onToggleMulti={toggleSignalsMulti}
                    />
                ) : null}

                {currentStep === "review" ? (
                    <div className="space-y-4 text-center">
                        <h2 className="text-xl font-semibold text-slate-900">You’re all set</h2>
                        <p className="text-sm text-slate-600">
                            Your onboarding details are saved. Your dashboard will guide you to activation or Academy programs when you're ready.
                        </p>
                        <div className="flex justify-center gap-3">
                            <Link href="/dashboard">
                                <Button>Go to Dashboard</Button>
                            </Link>
                            <Link href="/profile">
                                <Button variant="outline">Review Profile</Button>
                            </Link>
                        </div>
                    </div>
                ) : null}

                {currentStep !== "review" ? (
                    <div className="flex items-center justify-between pt-2">
                        <Button variant="outline" onClick={goBack} disabled={!canGoBack || saving}>
                            Back
                        </Button>
                        <Button
                            onClick={handleContinue}
                            disabled={
                                saving ||
                                (currentStep === "core" && !coreFormValid) ||
                                (currentStep === "safety" && !safetyFormValid) ||
                                (currentStep === "swim" && !swimFormValid) ||
                                (currentStep === "club" && !clubReadinessValid) ||
                                (currentStep === "academy" && !academyFormValid)
                            }
                        >
                            {saving ? "Saving..." : currentStep === "signals" ? "Continue" : "Save & continue"}
                        </Button>
                    </div>
                ) : null}
            </Card>
        </div>
    );
}
