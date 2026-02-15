"use client";

import { TimezoneCombobox } from "@/components/forms/TimezoneCombobox";
import { ClubReadinessStep } from "@/components/onboarding/ClubReadinessStep";
import { CommunitySignalsStep } from "@/components/onboarding/CommunitySignalsStep";
import { buildGoalsNarrative, OTHER_GOAL_VALUE, parseGoalsNarrative, SwimBackgroundStep } from "@/components/onboarding/SwimBackgroundStep";
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
import { uploadMedia } from "@/lib/media";
import { VolunteersApi } from "@/lib/volunteers";
import { Camera, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type MemberProfile = {
    phone?: string | null;
    area_in_lagos?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    time_zone?: string | null;
    gender?: string | null;
    date_of_birth?: string | null;
    swim_level?: string | null;
    deep_water_comfort?: string | null;
    strokes?: string[] | null;
    interests?: string[] | null;
    personal_goals?: string | null;
};

type MemberEmergencyContact = {
    name?: string | null;
    contact_relationship?: string | null;
    phone?: string | null;
    medical_info?: string | null;
};

type MemberAvailability = {
    available_days?: string[] | null;
    preferred_times?: string[] | null;
    preferred_locations?: string[] | null;
};

type MemberMembership = {
    primary_tier?: string | null;
    active_tiers?: string[] | null;
    requested_tiers?: string[] | null;
    community_paid_until?: string | null;
    club_paid_until?: string | null;
    academy_paid_until?: string | null;
    club_notes?: string | null;
    academy_skill_assessment?: Record<string, boolean> | null;
    academy_goals?: string | null;
    academy_preferred_coach_gender?: string | null;
    academy_lesson_preference?: string | null;
};

type MemberPreferences = {
    comms_preference?: string | null;
    language_preference?: string | null;
    volunteer_interest?: string[] | null;
};

type Member = {
    id?: string;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    profile_photo_url?: string | null;
    profile_photo_media_id?: string | null;

    // Nested sub-records
    profile?: MemberProfile | null;
    emergency_contact?: MemberEmergencyContact | null;
    availability?: MemberAvailability | null;
    membership?: MemberMembership | null;
    preferences?: MemberPreferences | null;
};

function formatDateForInput(value?: string | null) {
    if (!value) return "";
    const ms = Date.parse(String(value));
    if (!Number.isFinite(ms)) return "";
    return new Date(ms).toISOString().split("T")[0] || "";
}

type StepKey = "core" | "safety" | "swim" | "club" | "academy" | "signals" | "review";
type Step = { key: StepKey; title: string; required: boolean };

const ONBOARDING_DRAFT_VERSION = 2;

type OnboardingDraft = {
    version: number;
    updatedAt: number;
    currentStep: StepKey;
    coreForm: {
        firstName: string;
        lastName: string;
        phone: string;
        areaInLagos: string;
        city: string;
        state: string;
        country: string;
        gender: string;
        dateOfBirth: string;
        profilePhotoUrl: string;
        timeZone: string;
    };
    clubForm: {
        emergencyContactName: string;
        emergencyContactRelationship: string;
        emergencyContactPhone: string;
        medicalInfo: string;
        locationPreference: string[];
        timeOfDayAvailability: string[];
        clubNotes: string;
    };
    clubReadinessForm: {
        availabilitySlots: string[];
        clubNotes: string;
    };
    swimForm: {
        swimLevel: string;
        deepWaterComfort: string;
        strokes: string[];
        goals: string[];
        otherGoals: string;
    };
    academyForm: {
        academySkillAssessment: {
            canFloat: boolean;
            headUnderwater: boolean;
            deepWaterComfort: boolean;
            canSwim25m: boolean;
        };
        academyGoals: string;
        academyPreferredCoachGender: string;
        academyLessonPreference: string;
    };
    signalsForm: {
        interests: string[];
        volunteerInterest: string[];
    };
};

function getDraftKey(member: Member) {
    const id = member.id ? String(member.id) : "";
    const email = member.email ? String(member.email) : "";
    const suffix = id || email || "me";
    return `swimbuddz:onboarding:draft:v${ONBOARDING_DRAFT_VERSION}:${suffix}`;
}

function safeParseDraft(raw: string | null): OnboardingDraft | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as Partial<OnboardingDraft>;
        if (parsed.version !== ONBOARDING_DRAFT_VERSION) return null;
        if (!parsed.currentStep) return null;
        return parsed as OnboardingDraft;
    } catch {
        return null;
    }
}

export default function DashboardOnboardingPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [member, setMember] = useState<Member | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [navigatingToBilling, setNavigatingToBilling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentStep, setCurrentStep] = useState<StepKey>("core");
    const hasInitializedStep = useRef(false);
    const draftSaveTimer = useRef<number | null>(null);

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
        const membership = member?.membership;
        const tiers = (membership?.active_tiers && membership.active_tiers.length > 0)
            ? membership.active_tiers
            : membership?.primary_tier
                ? [membership.primary_tier]
                : ["community"];
        return tiers.map((t: string) => String(t).toLowerCase());
    }, [member]);

    const now = Date.now();
    const communityActive = useMemo(() => {
        const until = member?.membership?.community_paid_until ? Date.parse(String(member.membership.community_paid_until)) : NaN;
        return Number.isFinite(until) && until > now;
    }, [member, now]);

    const requestedTiers = useMemo(() => (member?.membership?.requested_tiers || []).map((t: string) => String(t).toLowerCase()), [member]);
    const wantsAcademy = requestedTiers.includes("academy");
    const wantsClub = requestedTiers.includes("club") || wantsAcademy;

    const clubContext = wantsClub || approvedTiers.includes("club") || approvedTiers.includes("academy");
    const academyContext = wantsAcademy || approvedTiers.includes("academy");

    const needsCoreProfile = useMemo(() => {
        if (!member) return false;
        const profile = member.profile;
        // Check profile_photo_media_id - the source of truth (URL is just computed for display)
        return !member.profile_photo_media_id ||
            !profile?.gender ||
            !profile?.date_of_birth ||
            !member.first_name ||
            !member.last_name ||
            !profile?.phone ||
            !profile?.country ||
            !profile?.city ||
            !profile?.time_zone;
    }, [member]);

    const needsSafetyLogistics = useMemo(() => {
        if (!member) return false;
        const emergency = member.emergency_contact;
        const availability = member.availability;
        return !emergency?.name ||
            !emergency?.contact_relationship ||
            !emergency?.phone ||
            !(availability?.preferred_locations && availability.preferred_locations.length > 0) ||
            !(availability?.preferred_times && availability.preferred_times.length > 0);
    }, [member]);

    const needsSwimBackground = useMemo(() => {
        if (!member) return false;
        const profile = member.profile;
        return !profile?.swim_level || !profile?.deep_water_comfort || !profile?.personal_goals;
    }, [member]);

    const needsClubReadiness = useMemo(() => {
        if (!member) return false;
        if (!clubContext) return false;
        const availability = member.availability;
        return !(availability?.available_days && availability.available_days.length > 0);
    }, [member, clubContext]);

    const needsAcademyReadiness = useMemo(() => {
        if (!member) return false;
        if (!academyContext) return false;
        const membership = member.membership;
        const assessment = membership?.academy_skill_assessment;
        const hasAssessment =
            assessment &&
            ["canFloat", "headUnderwater", "deepWaterComfort", "canSwim25m"].some(
                (k) => Object.prototype.hasOwnProperty.call(assessment, k)
            );
        return !hasAssessment ||
            !membership?.academy_goals ||
            !membership?.academy_preferred_coach_gender ||
            !membership?.academy_lesson_preference;
    }, [member, academyContext]);

    const [coreForm, setCoreForm] = useState({
        firstName: "",
        lastName: "",
        phone: "",
        areaInLagos: "",
        city: "",
        state: "",
        country: "",
        gender: "",
        dateOfBirth: "",
        profilePhotoUrl: "",
        profilePhotoMediaId: "",
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
        goals: [] as string[],
        otherGoals: "",
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

    const draftKey = useMemo(() => (member ? getDraftKey(member) : null), [member?.id, member?.email]);

    const clearDraft = useCallback(() => {
        if (!draftKey) return;
        try {
            localStorage.removeItem(draftKey);
        } catch {
            // ignore
        }
    }, [draftKey]);

    useEffect(() => {
        if (!member) return;

        // Extract nested records (may be null)
        const profile = member.profile;
        const emergency = member.emergency_contact;
        const availability = member.availability;
        const membership = member.membership;
        const prefs = member.preferences;

        setCoreForm({
            firstName: member.first_name || "",
            lastName: member.last_name || "",
            phone: profile?.phone || "",
            areaInLagos: profile?.area_in_lagos || "",
            city: profile?.city || "",
            state: profile?.state || "",
            country: profile?.country || "",
            gender: profile?.gender || "",
            dateOfBirth: formatDateForInput(profile?.date_of_birth),
            profilePhotoUrl: member.profile_photo_url || "",
            profilePhotoMediaId: member.profile_photo_media_id || "",
            timeZone: profile?.time_zone || "",
        });
        setClubForm({
            emergencyContactName: emergency?.name || "",
            emergencyContactRelationship: emergency?.contact_relationship || "",
            emergencyContactPhone: emergency?.phone || "",
            medicalInfo: emergency?.medical_info || "",
            locationPreference: availability?.preferred_locations || [],
            timeOfDayAvailability: availability?.preferred_times || [],
            clubNotes: membership?.club_notes || "",
        });
        setClubReadinessForm({
            availabilitySlots: availability?.available_days || [],
            clubNotes: membership?.club_notes || "",
        });
        setSwimForm({
            swimLevel: profile?.swim_level || "",
            deepWaterComfort: profile?.deep_water_comfort || "",
            strokes: profile?.strokes || [],
            ...(parseGoalsNarrative(profile?.personal_goals)),
        });
        setAcademyForm({
            academySkillAssessment: (membership?.academy_skill_assessment as any) || {
                canFloat: false,
                headUnderwater: false,
                deepWaterComfort: false,
                canSwim25m: false,
            },
            academyGoals: membership?.academy_goals || "",
            academyPreferredCoachGender: membership?.academy_preferred_coach_gender || "",
            academyLessonPreference: membership?.academy_lesson_preference || "",
        });
        setSignalsForm({
            interests: profile?.interests || [],
            volunteerInterest: prefs?.volunteer_interest || [],
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

    const toggleGoal = (goal: string) => {
        setSwimForm((prev) => {
            const exists = prev.goals.includes(goal);
            const nextGoals = exists ? prev.goals.filter((x) => x !== goal) : [...prev.goals, goal];
            return {
                ...prev,
                goals: nextGoals,
                otherGoals: exists && goal === OTHER_GOAL_VALUE ? "" : prev.otherGoals,
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
        coreForm.state &&
        coreForm.city &&
        coreForm.gender &&
        coreForm.dateOfBirth &&
        (coreForm.profilePhotoMediaId || coreForm.profilePhotoUrl) &&
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
        swimForm.goals.length > 0 &&
        (!swimForm.goals.includes(OTHER_GOAL_VALUE) || Boolean(swimForm.otherGoals && swimForm.otherGoals.trim()))
    );

    const clubReadinessValid = !clubContext || clubReadinessForm.availabilitySlots.length > 0;

    const academyFormValid = Boolean(
        academyForm.academyGoals &&
        academyForm.academyPreferredCoachGender &&
        academyForm.academyLessonPreference
    );

    const steps = useMemo<Step[]>(() => {
        const base: Step[] = [
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
    const stepCount = Math.max(steps.length, 1);
    const currentNumber = stepIndex >= 0 ? stepIndex + 1 : 1;
    const currentStepTitle = stepIndex >= 0 ? steps[stepIndex].title : "Onboarding";

    const requiredStepCount = steps.filter((s) => s.required).length;
    const completedRequiredCount = [
        { complete: !needsCoreProfile },
        { complete: !needsSafetyLogistics },
        { complete: !needsSwimBackground },
        ...(clubContext ? [{ complete: !needsClubReadiness }] : []),
        ...(academyContext ? [{ complete: !needsAcademyReadiness }] : []),
        { complete: currentStep === "review" },
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

    useEffect(() => {
        if (!member) return;
        if (hasInitializedStep.current) return;
        hasInitializedStep.current = true;

        // Check for step query param (e.g., ?step=club from upgrade flow)
        const requestedStep = searchParams.get("step") as StepKey | null;
        const allowedSteps = new Set(steps.map((s) => s.key));

        const draft = safeParseDraft(draftKey ? localStorage.getItem(draftKey) : null);
        if (draft) {
            setCoreForm((prev) => ({
                ...prev,
                ...draft.coreForm,
                profilePhotoUrl: draft.coreForm.profilePhotoUrl || prev.profilePhotoUrl,
            }));
            setClubForm((prev) => ({ ...prev, ...draft.clubForm }));
            setClubReadinessForm((prev) => ({ ...prev, ...draft.clubReadinessForm }));
            setSwimForm((prev) => ({ ...prev, ...draft.swimForm }));
            setAcademyForm((prev) => ({ ...prev, ...draft.academyForm }));
            setSignalsForm((prev) => ({ ...prev, ...draft.signalsForm }));

            // If step query param is valid and in the allowed steps, use it; otherwise use draft or first incomplete
            if (requestedStep && allowedSteps.has(requestedStep)) {
                setCurrentStep(requestedStep);
            } else {
                setCurrentStep(allowedSteps.has(draft.currentStep) ? draft.currentStep : firstIncompleteStep());
                toast.message("Restored your in-progress onboarding");
            }
            return;
        }

        // If step query param is valid, jump directly to it
        if (requestedStep && allowedSteps.has(requestedStep)) {
            setCurrentStep(requestedStep);
        } else {
            setCurrentStep(firstIncompleteStep());
        }
    }, [member, needsAcademyReadiness, needsClubReadiness, needsCoreProfile, needsSafetyLogistics, needsSwimBackground, searchParams, steps]);

    useEffect(() => {
        if (!draftKey) return;
        if (!hasInitializedStep.current) return;

        if (draftSaveTimer.current) {
            window.clearTimeout(draftSaveTimer.current);
        }

        draftSaveTimer.current = window.setTimeout(() => {
            const profilePhotoUrlToPersist =
                coreForm.profilePhotoUrl && !coreForm.profilePhotoUrl.startsWith("data:")
                    ? coreForm.profilePhotoUrl
                    : "";

            const draft: OnboardingDraft = {
                version: ONBOARDING_DRAFT_VERSION,
                updatedAt: Date.now(),
                currentStep,
                coreForm: { ...coreForm, profilePhotoUrl: profilePhotoUrlToPersist },
                clubForm,
                clubReadinessForm,
                swimForm,
                academyForm,
                signalsForm,
            };

            try {
                localStorage.setItem(draftKey, JSON.stringify(draft));
            } catch {
                // ignore (e.g., quota exceeded)
            }
        }, 250);

        return () => {
            if (draftSaveTimer.current) window.clearTimeout(draftSaveTimer.current);
        };
    }, [academyForm, clubForm, clubReadinessForm, coreForm, currentStep, draftKey, signalsForm, swimForm]);

    function isStepSatisfied(step: StepKey, opts?: { assumeSatisfied?: StepKey }) {
        if (opts?.assumeSatisfied && step === opts.assumeSatisfied) return true;
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

    const missingRequiredSteps = useMemo(() => {
        return steps.filter(
            (step) => step.required && step.key !== "review" && !isStepSatisfied(step.key)
        );
    }, [
        steps,
        needsCoreProfile,
        needsSafetyLogistics,
        needsSwimBackground,
        needsClubReadiness,
        needsAcademyReadiness,
    ]);

    const hasMissingRequiredSteps = missingRequiredSteps.length > 0;
    const firstMissingRequiredStep = missingRequiredSteps[0];

    // Check for upgrade flow via URL param
    const upgradeStepFromUrl = searchParams.get("step") as StepKey | null;
    const isClubUpgradeFlow = upgradeStepFromUrl === "club";

    const activationTarget = wantsClub || wantsAcademy || isClubUpgradeFlow
        ? "club"
        : !communityActive
            ? "community"
            : null;
    const showBillingCta = Boolean(activationTarget);
    const billingHref = activationTarget === "club"
        ? "/upgrade/club/plan"
        : activationTarget === "community"
            ? "/checkout?purpose=community"
            : "/account/billing";
    const billingCtaLabel = activationTarget === "club"
        ? "Activate Club Membership"
        : activationTarget === "community"
            ? "Activate Community Membership"
            : "Go to Billing";
    const reviewDescription = activationTarget === "club"
        ? communityActive
            ? "You're almost set. Activate your Club membership to unlock Club benefits."
            : "You're almost set. Activate Community + Club to unlock full access."
        : activationTarget === "community"
            ? "You're almost set. Activate your Community membership to unlock full access."
            : "Your onboarding details are saved. Your dashboard will guide you to activation or Academy programs when you're ready.";

    const saveCore = async (): Promise<boolean> => {
        setSaving(true);
        try {
            await apiPatch(
                "/api/v1/members/me",
                {
                    first_name: coreForm.firstName,
                    last_name: coreForm.lastName,
                    profile_photo_media_id: coreForm.profilePhotoMediaId || null,
                    profile: {
                        phone: coreForm.phone,
                        area_in_lagos: coreForm.areaInLagos || undefined,
                        address: coreForm.areaInLagos || undefined,
                        country: coreForm.country,
                        city: coreForm.city,
                        state: coreForm.state,
                        gender: coreForm.gender,
                        date_of_birth: coreForm.dateOfBirth,
                        time_zone: coreForm.timeZone,
                    },
                },
                { auth: true }
            );
            toast.success("Core profile saved");
            clearDraft();
            await loadMember({ silent: true });
            return true;
        } catch (e) {
            toast.error("Failed to save core profile");
            return false;
        } finally {
            setSaving(false);
        }
        return false;
    };

    const saveSafety = async (): Promise<boolean> => {
        setSaving(true);
        try {
            await apiPatch(
                "/api/v1/members/me",
                {
                    emergency_contact: {
                        name: clubForm.emergencyContactName,
                        contact_relationship: clubForm.emergencyContactRelationship,
                        phone: clubForm.emergencyContactPhone,
                        medical_info: clubForm.medicalInfo,
                    },
                    availability: {
                        preferred_locations: clubForm.locationPreference,
                        preferred_times: clubForm.timeOfDayAvailability,
                    },
                },
                { auth: true }
            );
            toast.success("Safety & logistics saved");
            clearDraft();
            await loadMember({ silent: true });
            return true;
        } catch (e) {
            toast.error("Failed to save safety & logistics");
            return false;
        } finally {
            setSaving(false);
        }
        return false;
    };

    const saveSwimBackground = async (): Promise<boolean> => {
        setSaving(true);
        try {
            await apiPatch(
                "/api/v1/members/me",
                {
                    profile: {
                        swim_level: swimForm.swimLevel,
                        deep_water_comfort: swimForm.deepWaterComfort,
                        strokes: swimForm.strokes,
                        personal_goals: buildGoalsNarrative(swimForm.goals, swimForm.otherGoals),
                    },
                },
                { auth: true }
            );
            toast.success("Swimming background saved");
            clearDraft();
            await loadMember({ silent: true });
            return true;
        } catch {
            toast.error("Failed to save swimming background");
            return false;
        } finally {
            setSaving(false);
        }
        return false;
    };

    const saveClubReadiness = async (): Promise<boolean> => {
        if (!clubContext) return true;
        setSaving(true);
        try {
            await apiPatch(
                "/api/v1/members/me",
                {
                    availability: {
                        available_days: clubReadinessForm.availabilitySlots,
                    },
                    membership: {
                        club_notes: clubReadinessForm.clubNotes || undefined,
                    },
                },
                { auth: true }
            );
            toast.success("Club readiness saved");
            clearDraft();
            await loadMember({ silent: true });
            return true;
        } catch {
            toast.error("Failed to save Club readiness");
            return false;
        } finally {
            setSaving(false);
        }
        return false;
    };

    const saveAcademy = async (): Promise<boolean> => {
        if (!academyContext) return true;
        setSaving(true);
        try {
            await apiPatch(
                "/api/v1/members/me",
                {
                    membership: {
                        academy_goals: academyForm.academyGoals,
                        academy_preferred_coach_gender: academyForm.academyPreferredCoachGender,
                        academy_lesson_preference: academyForm.academyLessonPreference,
                    },
                },
                { auth: true }
            );
            toast.success("Academy readiness saved");
            clearDraft();
            await loadMember({ silent: true });
            return true;
        } catch (e) {
            toast.error("Failed to save Academy readiness");
            return false;
        } finally {
            setSaving(false);
        }
        return false;
    };

    const saveSignals = async () => {
        setSaving(true);
        try {
            await apiPatch(
                "/api/v1/members/me",
                {
                    profile: {
                        interests: signalsForm.interests,
                    },
                    preferences: {
                        volunteer_interest: signalsForm.volunteerInterest,
                    },
                },
                { auth: true }
            );

            // Also create/update volunteer profile in volunteer service
            // Map category codes from registration to role IDs
            if (signalsForm.volunteerInterest.length > 0) {
                try {
                    const allRoles = await VolunteersApi.listRoles();
                    const roleIds = signalsForm.volunteerInterest
                        .map((cat) => {
                            const match = allRoles.find(
                                (r) => r.category.toLowerCase() === cat.toLowerCase()
                            );
                            return match?.id;
                        })
                        .filter(Boolean) as string[];

                    if (roleIds.length > 0) {
                        try {
                            // Try to create new profile
                            await VolunteersApi.registerAsVolunteer({
                                preferred_roles: roleIds,
                            });
                        } catch {
                            // 409 = already registered → update instead
                            await VolunteersApi.updateMyProfile({
                                preferred_roles: roleIds,
                            }).catch(() => {});
                        }
                    }
                } catch {
                    // Non-critical — volunteer profile sync is best-effort
                    console.warn("Could not sync volunteer profile from onboarding");
                }
            }

            toast.success("Preferences saved");
            clearDraft();
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
        if (currentStep === "core") {
            if (!coreFormValid) return;
            const saved = await saveCore();
            if (!saved) return;
            setCurrentStep(nextStepFrom("core", { assumeSatisfied: "core" }));
            return;
        }

        if (currentStep === "safety") {
            if (!safetyFormValid) return;
            const saved = await saveSafety();
            if (!saved) return;
            setCurrentStep(nextStepFrom("safety", { assumeSatisfied: "safety" }));
            return;
        }

        if (currentStep === "swim") {
            if (!swimFormValid) return;
            const saved = await saveSwimBackground();
            if (!saved) return;
            setCurrentStep(nextStepFrom("swim", { assumeSatisfied: "swim" }));
            return;
        }

        if (currentStep === "club") {
            if (!clubReadinessValid) return;
            const saved = await saveClubReadiness();
            if (!saved) return;
            setCurrentStep(nextStepFrom("club", { assumeSatisfied: "club" }));
            return;
        }

        if (currentStep === "academy") {
            if (!academyFormValid) return;
            const saved = await saveAcademy();
            if (!saved) return;
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
            clearDraft();
            router.push("/account");
            return;
        }

        goNext();
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold text-slate-900">Onboarding</h1>
                <p className="text-slate-600">
                    Let’s get you set up properly. This takes about 3–5 minutes.
                </p>
            </header>

            <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                    <div className="text-sm text-slate-600">
                        Step {currentNumber} of {stepCount} • {currentStepTitle} • {progressPercent}% complete
                    </div>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-cyan-600" style={{ width: `${progressPercent}%` }} />
                </div>
            </Card>

            {wantsAcademy && member?.membership?.requested_tiers && member.membership.requested_tiers.length > 0 ? (
                <Card className="p-4 space-y-1">
                    <p className="text-sm font-medium text-slate-900">Your selection is saved</p>
                    <p className="text-sm text-slate-600">
                        You selected Academy during signup. Completing readiness here helps us support you and speed up the next steps.
                    </p>
                </Card>
            ) : null}

            <Card className="p-6 space-y-6">
                {currentStep === "core" ? (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h2 className="text-xl font-semibold text-slate-900">Core profile</h2>
                            <p className="text-sm text-slate-600">Basic identity and contact details so we can support you safely.</p>
                        </div>

                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-slate-700">
                                Profile photo <span className="text-rose-500">*</span>
                            </label>
                            <div className="flex items-center gap-6">
                                <label className="relative group cursor-pointer">
                                    <div
                                        className={[
                                            "h-24 w-24 overflow-hidden rounded-full transition-all",
                                            coreForm.profilePhotoUrl
                                                ? "ring-4 ring-cyan-200"
                                                : "bg-gradient-to-br from-cyan-100 to-cyan-200 hover:from-cyan-200 hover:to-cyan-300",
                                        ].join(" ")}
                                    >
                                        {coreForm.profilePhotoUrl ? (
                                            <img
                                                src={coreForm.profilePhotoUrl}
                                                alt="Profile preview"
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-cyan-700">
                                                {saving ? (
                                                    <Loader2 className="h-7 w-7 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Camera className="h-7 w-7" />
                                                        <span className="text-xs font-medium">Add photo</span>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="sr-only"
                                        disabled={saving}
                                        onChange={async (event) => {
                                            const input = event.currentTarget;
                                            const file = input.files?.[0];
                                            if (!file) return;
                                            input.value = "";

                                            setSaving(true);
                                            try {
                                                const mediaItem = await uploadMedia(file, "profile_photo");
                                                setCoreForm((prev) => ({
                                                    ...prev,
                                                    profilePhotoMediaId: mediaItem.id,
                                                    profilePhotoUrl: mediaItem.file_url,
                                                }));
                                                toast.success("Photo uploaded!");
                                            } catch (err) {
                                                toast.error(err instanceof Error ? err.message : "Failed to upload photo");
                                            } finally {
                                                setSaving(false);
                                            }
                                        }}
                                    />
                                    {coreForm.profilePhotoUrl && !saving ? (
                                        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                                            <Camera className="h-8 w-8 text-white" />
                                        </div>
                                    ) : null}
                                </label>
                                <div className="flex-1 space-y-2">
                                    <p className="text-sm text-slate-700 font-medium">
                                        {coreForm.profilePhotoUrl ? "Tap to change photo" : "Tap the circle to upload"}
                                    </p>
                                    <p className="text-xs text-slate-500">JPG/PNG/GIF. This helps members recognize you.</p>
                                    {coreForm.profilePhotoUrl ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCoreForm((prev) => ({
                                                ...prev,
                                                profilePhotoMediaId: "",
                                                profilePhotoUrl: "",
                                            }))}
                                            className="gap-2"
                                        >
                                            <X className="h-4 w-4" />
                                            Remove photo
                                        </Button>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        <RegistrationEssentialsStep
                            mode="onboarding"
                            includeSwimLevel={false}
                            formData={{
                                firstName: coreForm.firstName,
                                lastName: coreForm.lastName,
                                phone: coreForm.phone,
                                city: coreForm.city,
                                state: coreForm.state,
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
                        onToggleGoal={toggleGoal}
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
                    <div className="space-y-6">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <h2 className="text-xl font-semibold text-slate-900">Community signals (optional)</h2>
                                <p className="text-sm text-slate-600">Light preferences so we can personalize your experience.</p>
                            </div>
                            <Button variant="outline" type="button" onClick={() => setCurrentStep("review")}>
                                Skip
                            </Button>
                        </div>
                        <CommunitySignalsStep
                            showHeader={false}
                            formData={signalsForm}
                            onToggleMulti={toggleSignalsMulti}
                        />
                    </div>
                ) : null}

                {currentStep === "review" ? (
                    <div className="space-y-4 text-center">
                        {hasMissingRequiredSteps ? (
                            <>
                                <h2 className="text-xl font-semibold text-slate-900">Almost there</h2>
                                <p className="text-sm text-slate-600">
                                    Finish {missingRequiredSteps.map((step) => step.title).join(", ")} to complete setup.
                                </p>
                                <div className="flex justify-center gap-3">
                                    {firstMissingRequiredStep ? (
                                        <Button onClick={() => setCurrentStep(firstMissingRequiredStep.key)}>
                                            Continue {firstMissingRequiredStep.title}
                                        </Button>
                                    ) : null}
                                    <Link href="/account">
                                        <Button variant="outline">Go to Dashboard</Button>
                                    </Link>
                                </div>
                            </>
                        ) : (
                            <>
                                <h2 className="text-xl font-semibold text-slate-900">Onboarding complete</h2>
                                <p className="text-sm text-slate-600">
                                    {reviewDescription}
                                </p>
                                <div className="flex justify-center gap-3">
                                    {showBillingCta ? (
                                        <Button
                                            onClick={() => {
                                                setNavigatingToBilling(true);
                                                router.push(billingHref);
                                            }}
                                            disabled={navigatingToBilling}
                                        >
                                            {navigatingToBilling ? "Loading..." : billingCtaLabel}
                                        </Button>
                                    ) : (
                                        <Link href="/account">
                                            <Button>Go to Dashboard</Button>
                                        </Link>
                                    )}
                                    {!showBillingCta ? (
                                        <Link href="/account/profile">
                                            <Button variant="outline">Review Profile</Button>
                                        </Link>
                                    ) : null}
                                </div>
                            </>
                        )}
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
