"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet } from "@/lib/api";
import { type CachedPaymentIntent, loadPaymentIntentCache } from "@/lib/paymentCache";
import {
    ArrowRight,
    Bell,
    Calendar,
    CheckCircle,
    Circle,
    Clock,
    Sparkles,
    TrendingUp,
    Users
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function MemberDashboardPage() {
    const [member, setMember] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [resumePaymentIntent, setResumePaymentIntent] = useState<CachedPaymentIntent | null>(null);

    useEffect(() => {
        apiGet("/api/v1/members/me", { auth: true })
            .then((data) => setMember(data))
            .catch((err) => console.error("Failed to load member", err))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!member) return;
        const paymentMemberKey = member?.id ? String(member.id) : member?.email ? String(member.email) : "me";
        const cached = loadPaymentIntentCache(paymentMemberKey);
        if (cached?.purpose && cached.purpose !== "community_annual") {
            setResumePaymentIntent(null);
            return;
        }
        setResumePaymentIntent(cached || null);
    }, [member]);

    if (loading) {
        return <LoadingCard text="Loading dashboard..." />;
    }

    const firstName = member?.first_name || "Member";
    const now = Date.now();

    // Extract nested data with safe defaults
    const membership = member?.membership || {};
    const profile = member?.profile || {};
    const emergency = member?.emergency_contact || {};
    const availability = member?.availability || {};

    const communityPaidUntilMs = membership.community_paid_until ? Date.parse(String(membership.community_paid_until)) : NaN;
    const communityActive = Number.isFinite(communityPaidUntilMs) && communityPaidUntilMs > now;
    const clubPaidUntilMs = membership.club_paid_until ? Date.parse(String(membership.club_paid_until)) : NaN;
    const clubActive = Number.isFinite(clubPaidUntilMs) && clubPaidUntilMs > now;
    const academyPaidUntilMs = membership.academy_paid_until ? Date.parse(String(membership.academy_paid_until)) : NaN;
    const academyActive = Number.isFinite(academyPaidUntilMs) && academyPaidUntilMs > now;

    const memberTiers = membership.active_tiers?.map((t: string) => t.toLowerCase()) ||
        (membership.primary_tier ? [membership.primary_tier.toLowerCase()] : ["community"]);

    const requestedTiers: string[] = (membership.requested_tiers || []).map((t: any) => String(t).toLowerCase());
    const wantsAcademy = requestedTiers.includes("academy");
    const wantsClub = requestedTiers.includes("club") || wantsAcademy;

    const clubContext = wantsClub || memberTiers.includes("club") || memberTiers.includes("academy");
    const academyContext = wantsAcademy || memberTiers.includes("academy");

    // Use profile_photo_media_id (source of truth) not profile_photo_url
    const hasProfileBasics = Boolean(member?.profile_photo_media_id && profile.gender && profile.date_of_birth);
    const hasCoreProfile = Boolean(profile.phone && profile.country && profile.city && profile.time_zone);
    const hasSwimBackground = Boolean(
        profile.swim_level &&
        profile.deep_water_comfort &&
        profile.personal_goals &&
        String(profile.personal_goals).trim()
    );
    const hasSafetyLogistics = Boolean(
        emergency.name &&
        emergency.contact_relationship &&
        emergency.phone &&
        availability.preferred_locations &&
        availability.preferred_locations.length > 0 &&
        availability.preferred_times &&
        availability.preferred_times.length > 0
    );
    const hasClubAvailability = Boolean(availability.available_days && availability.available_days.length > 0);
    const hasClubReadiness = !clubContext || hasClubAvailability;

    const needsProfileCore =
        !hasProfileBasics ||
        !profile.country ||
        !profile.city ||
        !profile.time_zone ||
        !profile.swim_level ||
        !hasSafetyLogistics ||
        !hasSwimBackground;
    const needsClubReadiness = clubContext && !hasClubAvailability;

    const assessment = membership.academy_skill_assessment;
    const hasAssessment =
        assessment &&
        ["canFloat", "headUnderwater", "deepWaterComfort", "canSwim25m"].some(
            (k) => Object.prototype.hasOwnProperty.call(assessment, k)
        );
    const needsAcademyReadiness =
        academyContext &&
        (!hasAssessment ||
            !membership.academy_goals ||
            !membership.academy_preferred_coach_gender ||
            !membership.academy_lesson_preference);
    const hasAcademyReadiness = !academyContext || !needsAcademyReadiness;

    const hasCoreOnboarding = hasProfileBasics && hasCoreProfile;
    const onboardingReadyForPayment =
        hasCoreOnboarding &&
        hasSafetyLogistics &&
        hasSwimBackground &&
        hasClubReadiness &&
        hasAcademyReadiness;
    const needsOnboarding = !onboardingReadyForPayment;

    // Calculate onboarding progress
    const totalSteps = 2 + (clubContext ? 1 : 0) + (academyContext ? 1 : 0);
    let completedSteps = 0;
    if (!needsProfileCore) completedSteps++;
    if (communityActive) completedSteps++;
    if (clubContext && !needsClubReadiness) completedSteps++;
    if (academyContext && !needsAcademyReadiness) completedSteps++;
    const progressPercent = Math.round((completedSteps / totalSteps) * 100);

    const tierLabel = wantsAcademy && !academyActive
        ? "Academy (Pending)"
        : wantsClub && !clubActive
            ? "Club (Pending)"
            : memberTiers.includes("academy")
                ? "Academy"
                : memberTiers.includes("club")
                    ? "Club"
                    : "Community";
    const resumeCheckoutUrl = resumePaymentIntent?.checkout_url || null;
    const showPaymentRecoveryBanner = !communityActive && onboardingReadyForPayment;
    const showCommunityActivationBanner = !communityActive && !onboardingReadyForPayment;

    return (
        <div className="space-y-8">
            {/* Setup Progress Banner */}
            {needsOnboarding && (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-500 p-6 text-white shadow-lg">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                    <div className="absolute bottom-0 left-0 -mb-8 -ml-8 h-40 w-40 rounded-full bg-blue-400/20 blur-3xl" />

                    <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="h-5 w-5 text-amber-300" />
                                <span className="text-sm font-medium text-cyan-100">Complete Your Setup</span>
                            </div>
                            <h2 className="text-2xl font-bold mb-2">You're {progressPercent}% there!</h2>
                            <p className="text-cyan-100 text-sm max-w-md">
                                Complete a few quick steps to unlock all features and get the most out of SwimBuddz.
                            </p>

                            {/* Progress bar */}
                            <div className="mt-4 flex items-center gap-3">
                                <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-white rounded-full transition-all duration-500"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                                <span className="text-sm font-semibold">{progressPercent}%</span>
                            </div>

                            {/* Checklist */}
                            <ul className="mt-4 space-y-2">
                                <li className="flex items-center gap-2 text-sm">
                                    {needsProfileCore ? (
                                        <Circle className="h-4 w-4 text-cyan-200" />
                                    ) : (
                                        <CheckCircle className="h-4 w-4 text-emerald-300" />
                                    )}
                                    <span className={needsProfileCore ? "text-white" : "text-cyan-200 line-through"}>
                                        Complete profile, safety, and swim basics
                                    </span>
                                </li>
                                <li className="flex items-center gap-2 text-sm">
                                    {!communityActive ? (
                                        <Circle className="h-4 w-4 text-cyan-200" />
                                    ) : (
                                        <CheckCircle className="h-4 w-4 text-emerald-300" />
                                    )}
                                    <span className={!communityActive ? "text-white" : "text-cyan-200 line-through"}>
                                        Activate Community membership
                                    </span>
                                </li>
                                {(wantsClub || memberTiers.includes("club") || memberTiers.includes("academy")) && (
                                    <li className="flex items-center gap-2 text-sm">
                                        {needsClubReadiness ? (
                                            <Circle className="h-4 w-4 text-cyan-200" />
                                        ) : (
                                            <CheckCircle className="h-4 w-4 text-emerald-300" />
                                        )}
                                        <span className={needsClubReadiness ? "text-white" : "text-cyan-200 line-through"}>
                                            Complete Club readiness
                                        </span>
                                    </li>
                                )}
                            </ul>
                        </div>

                        <div className="flex-shrink-0">
                            <Link href="/account/onboarding">
                                <Button variant="secondary" className="shadow-lg border-white/20">
                                    Continue Setup
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {showPaymentRecoveryBanner && (
                <Card className="p-6 border-emerald-200 bg-emerald-50">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-shrink-0 rounded-xl bg-emerald-100 p-3">
                            <CheckCircle className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-slate-900">Onboarding complete - payment pending</h3>
                            <p className="text-sm text-slate-600 mt-1">
                                Finish payment to activate your Community membership and unlock member features.
                            </p>
                            {resumePaymentIntent?.reference ? (
                                <p className="text-xs text-slate-500 mt-2">
                                    Last payment reference: <span className="font-mono">{resumePaymentIntent.reference}</span>
                                </p>
                            ) : null}
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {resumeCheckoutUrl ? (
                                <Button
                                    onClick={() => {
                                        window.location.href = resumeCheckoutUrl;
                                    }}
                                >
                                    Resume payment
                                </Button>
                            ) : null}
                            <Link href="/account/billing?required=community">
                                <Button variant={resumeCheckoutUrl ? "outline" : "primary"}>Go to Billing</Button>
                            </Link>
                        </div>
                    </div>
                </Card>
            )}

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Link href="/account/billing">
                    <Card className="p-5 bg-gradient-to-br from-cyan-50 to-white border-cyan-100 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-cyan-600">Membership Status</p>
                                <p className="mt-1 text-2xl font-bold text-slate-900">{tierLabel}</p>
                                <p className="text-sm text-slate-500 mt-1">
                                    {communityActive ? "Active" : "Pending activation"}
                                </p>
                            </div>
                            <div className="rounded-xl bg-cyan-100 p-3">
                                <TrendingUp className="h-6 w-6 text-cyan-600" />
                            </div>
                        </div>
                    </Card>
                </Link>

                <Link href="/sessions-and-events">
                    <Card className="p-5 bg-gradient-to-br from-blue-50 to-white border-blue-100 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-600">Upcoming Sessions</p>
                                <p className="mt-1 text-2xl font-bold text-slate-900">0</p>
                                <p className="text-sm text-slate-500 mt-1">No sessions scheduled</p>
                            </div>
                            <div className="rounded-xl bg-blue-100 p-3">
                                <Calendar className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </Card>
                </Link>

                <Link href="/community/directory">
                    <Card className="p-5 bg-gradient-to-br from-purple-50 to-white border-purple-100 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-purple-600">Community</p>
                                <p className="mt-1 text-2xl font-bold text-slate-900">Connect</p>
                                <p className="text-sm text-slate-500 mt-1">Meet other swimmers</p>
                            </div>
                            <div className="rounded-xl bg-purple-100 p-3">
                                <Users className="h-6 w-6 text-purple-600" />
                            </div>
                        </div>
                    </Card>
                </Link>
            </div>

            {/* Community Activation Banner (if not active) */}
            {showCommunityActivationBanner && (
                <Card className="p-6 border-amber-200 bg-amber-50">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-shrink-0 rounded-xl bg-amber-100 p-3">
                            <Clock className="h-6 w-6 text-amber-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-slate-900">Activate Your Community Membership</h3>
                            <p className="text-sm text-slate-600 mt-1">
                                Pay ₦20,000/year to unlock the member directory, events, and community features.
                            </p>
                        </div>
                        <Link href="/account/billing">
                            <Button>Activate Now</Button>
                        </Link>
                    </div>
                </Card>
            )}

            {/* Upgrade Request Banner */}
            {(wantsClub || wantsAcademy) && (
                <Card className="p-6 border-blue-200 bg-blue-50">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-shrink-0 rounded-xl bg-blue-100 p-3">
                            <TrendingUp className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-slate-900">
                                Your {wantsAcademy ? "Academy" : "Club"} Request is Saved
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                                Complete your readiness to speed up review. Payments happen when you activate a plan.
                            </p>
                        </div>
                        <Link href="/account/onboarding">
                            <Button variant="outline">Complete Readiness</Button>
                        </Link>
                    </div>
                </Card>
            )}

            {/* Recent Announcements */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-900">Recent Announcements</h2>
                    <Link href="/announcements" className="text-sm font-medium text-cyan-600 hover:text-cyan-700 flex items-center gap-1">
                        View all <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
                <Card className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 rounded-full bg-cyan-100 p-2">
                            <Bell className="h-5 w-5 text-cyan-600" />
                        </div>
                        <div>
                            <p className="font-medium text-slate-900">Welcome to SwimBuddz!</p>
                            <p className="text-sm text-slate-600 mt-1">
                                Complete your profile setup to get started and connect with other swimmers in the community.
                            </p>
                            <p className="text-xs text-slate-400 mt-2">Just now</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Coach Card (if applicable) */}
            {member?.coach_profile && (
                <Link href="/account/coach" className="block">
                    <Card className="p-6 border-purple-200 bg-gradient-to-r from-purple-50 to-purple-100/50 hover:shadow-lg transition-shadow">
                        <div className="flex items-center gap-4">
                            <div className="rounded-xl bg-purple-200 p-3">
                                <Sparkles className="h-6 w-6 text-purple-700" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-purple-900">Coach Dashboard</h3>
                                <p className="text-sm text-purple-700">Manage your cohorts and view student progress</p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-purple-400" />
                        </div>
                    </Card>
                </Link>
            )}
        </div>
    );
}
