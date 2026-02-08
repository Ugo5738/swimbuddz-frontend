"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { StatsCard } from "@/components/ui/StatsCard";
import {
    CATEGORY_LABELS,
    RECOGNITION_LABELS,
    TIER_SHORT_LABELS,
    VolunteersApi,
    type HoursSummary,
    type VolunteerOpportunity,
    type VolunteerProfile,
    type VolunteerReward,
    type VolunteerRole,
} from "@/lib/volunteers";
import {
    ArrowRight,
    Calendar, ChevronRight,
    Clock,
    HandHeart, Shield,
    Star,
    Trophy,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function VolunteerHubPage() {
    const [profile, setProfile] = useState<VolunteerProfile | null>(null);
    const [profileNotFound, setProfileNotFound] = useState(false);
    const [roles, setRoles] = useState<VolunteerRole[]>([]);
    const [upcoming, setUpcoming] = useState<VolunteerOpportunity[]>([]);
    const [summary, setSummary] = useState<HoursSummary | null>(null);
    const [rewards, setRewards] = useState<VolunteerReward[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Registration modal
    const [showRegister, setShowRegister] = useState(false);
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [registering, setRegistering] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Load roles (public)
            const rolesData = await VolunteersApi.listRoles();
            setRoles(rolesData);

            // Load upcoming opportunities (public)
            const upcomingData = await VolunteersApi.listUpcomingOpportunities();
            setUpcoming(upcomingData);

            // Try to load profile (may 404 if not registered)
            try {
                const profileData = await VolunteersApi.getMyProfile();
                setProfile(profileData);

                // If registered, load summary and rewards
                const [summaryData, rewardsData] = await Promise.all([
                    VolunteersApi.getMyHoursSummary(),
                    VolunteersApi.getMyRewards(),
                ]);
                setSummary(summaryData);
                setRewards(rewardsData);
            } catch {
                setProfileNotFound(true);
            }
        } catch {
            setError("Failed to load volunteer data. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        setRegistering(true);
        try {
            const newProfile = await VolunteersApi.registerAsVolunteer({
                preferred_roles: selectedRoles.length > 0 ? selectedRoles : undefined,
            });
            setProfile(newProfile);
            setProfileNotFound(false);
            setShowRegister(false);
            // Reload summary
            const summaryData = await VolunteersApi.getMyHoursSummary();
            setSummary(summaryData);
        } catch {
            setError("Failed to register. Please try again.");
        } finally {
            setRegistering(false);
        }
    };

    if (loading) {
        return <LoadingPage text="Loading volunteer hub..." />;
    }

    const unredeemed = rewards.filter((r) => !r.is_redeemed);
    const tierColor = profile?.tier === "tier_3" ? "amber" : profile?.tier === "tier_2" ? "green" : "cyan";

    return (
        <div className="mx-auto max-w-6xl space-y-6 py-4 md:py-8">
            {/* Header */}
            <header className="space-y-3">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Volunteer Hub</h1>
                <p className="text-sm md:text-base text-slate-600">
                    Help make SwimBuddz sessions and events better by volunteering your time.
                </p>
            </header>

            {error && <Alert variant="error">{error}</Alert>}

            {/* Not Registered Banner */}
            {profileNotFound && (
                <Card className="bg-cyan-50 border-cyan-200">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <HandHeart className="h-6 w-6 text-cyan-600 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-cyan-900">Join the Volunteer Team</h3>
                                <p className="mt-1 text-sm text-cyan-800">
                                    Volunteering is rotational, flexible, and rewarding. Pick roles
                                    that interest you, claim opportunities when they fit your schedule, and
                                    earn recognition and perks as you contribute.
                                </p>
                            </div>
                        </div>
                        <Button onClick={() => setShowRegister(true)} className="whitespace-nowrap">
                            Register as Volunteer
                        </Button>
                    </div>
                </Card>
            )}

            {/* Profile Summary (if registered) */}
            {profile && summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatsCard
                        label="Total Hours"
                        value={summary.total_hours.toFixed(1)}
                        icon={<Clock className="h-5 w-5" />}
                        color="cyan"
                        description={`${summary.hours_this_month.toFixed(1)} this month`}
                    />
                    <StatsCard
                        label="Tier"
                        value={TIER_SHORT_LABELS[profile.tier]}
                        icon={<Shield className="h-5 w-5" />}
                        color={tierColor as "cyan" | "green" | "amber"}
                        description={
                            summary.next_tier_hours_needed
                                ? `${summary.next_tier_hours_needed.toFixed(0)}h to next milestone`
                                : "Top milestone reached"
                        }
                    />
                    <StatsCard
                        label="Sessions"
                        value={summary.total_sessions}
                        icon={<Calendar className="h-5 w-5" />}
                        color="blue"
                    />
                    <StatsCard
                        label="Reliability"
                        value={`${profile.reliability_score}%`}
                        icon={<Star className="h-5 w-5" />}
                        color={profile.reliability_score >= 80 ? "green" : "amber"}
                    />
                </div>
            )}

            {/* Recognition Badge */}
            {profile?.recognition_tier && (
                <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
                    <div className="flex items-center gap-3">
                        <Trophy className="h-6 w-6 text-amber-600" />
                        <div>
                            <span className="font-semibold text-amber-900">
                                {RECOGNITION_LABELS[profile.recognition_tier]}
                            </span>
                            <span className="text-sm text-amber-700 ml-2">Volunteer Recognition</span>
                        </div>
                    </div>
                </Card>
            )}

            {/* Unredeemed Rewards */}
            {unredeemed.length > 0 && (
                <Card>
                    <h3 className="mb-3 font-semibold text-slate-900">Your Rewards</h3>
                    <div className="space-y-2">
                        {unredeemed.map((reward) => (
                            <div
                                key={reward.id}
                                className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3"
                            >
                                <div>
                                    <p className="font-medium text-emerald-900">{reward.title}</p>
                                    {reward.description && (
                                        <p className="text-sm text-emerald-700">{reward.description}</p>
                                    )}
                                </div>
                                <Badge variant="success">Available</Badge>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Upcoming Opportunities */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-900">Upcoming Opportunities</h2>
                    <Link
                        href="/community/volunteers/opportunities"
                        className="flex items-center gap-1 text-sm font-medium text-cyan-600 hover:text-cyan-700"
                    >
                        View all <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>

                {upcoming.length === 0 ? (
                    <Card className="py-10 text-center">
                        <Calendar className="mx-auto h-10 w-10 text-slate-400" />
                        <p className="mt-3 text-sm text-slate-600">
                            No upcoming opportunities right now. Check back soon!
                        </p>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {upcoming.slice(0, 4).map((opp) => (
                            <Link key={opp.id} href={`/community/volunteers/opportunities/${opp.id}`}>
                                <Card className="h-full transition-shadow hover:shadow-md cursor-pointer">
                                    <div className="space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="font-semibold text-slate-900">{opp.title}</h3>
                                            <Badge
                                                variant={
                                                    opp.slots_filled >= opp.slots_needed
                                                        ? "warning"
                                                        : "info"
                                                }
                                            >
                                                {opp.slots_filled}/{opp.slots_needed} filled
                                            </Badge>
                                        </div>
                                        {opp.role_title && (
                                            <Badge variant="default">{opp.role_title}</Badge>
                                        )}
                                        <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                                            <span>
                                                {new Date(opp.date).toLocaleDateString("en-NG", {
                                                    weekday: "short",
                                                    month: "short",
                                                    day: "numeric",
                                                })}
                                            </span>
                                            {opp.start_time && <span>{opp.start_time.slice(0, 5)}</span>}
                                            {opp.location_name && <span>{opp.location_name}</span>}
                                        </div>
                                        {opp.opportunity_type === "approval_required" && (
                                            <p className="text-xs text-amber-600">Requires admin approval</p>
                                        )}
                                    </div>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            {/* Volunteer Roles */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-900">Volunteer Roles</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {roles.map((role) => (
                        <Card key={role.id} className="p-4">
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">{role.icon || "🙋"}</span>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-slate-900">{role.title}</h3>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {CATEGORY_LABELS[role.category] || role.category}
                                    </p>
                                    {role.description && (
                                        <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                                            {role.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Leaderboard Link */}
            <Link href="/community/volunteers/leaderboard">
                <Card className="flex items-center justify-between transition-shadow hover:shadow-md cursor-pointer">
                    <div className="flex items-center gap-3">
                        <Trophy className="h-5 w-5 text-amber-500" />
                        <span className="font-medium text-slate-900">Volunteer Leaderboard</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                </Card>
            </Link>

            {/* Registration Modal */}
            <Modal
                isOpen={showRegister}
                onClose={() => setShowRegister(false)}
                title="Register as a Volunteer"
            >
                <p className="text-sm text-slate-600">
                    Select the roles you&apos;re interested in. Don&apos;t worry — you can change
                    these later, and you&apos;re never locked into anything.
                </p>

                <div className="mt-4 space-y-2">
                    {roles.map((role) => (
                        <label
                            key={role.id}
                            className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 cursor-pointer hover:bg-slate-50 transition"
                        >
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                checked={selectedRoles.includes(role.id)}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setSelectedRoles([...selectedRoles, role.id]);
                                    } else {
                                        setSelectedRoles(selectedRoles.filter((id) => id !== role.id));
                                    }
                                }}
                            />
                            <div>
                                <span className="font-medium text-slate-900">
                                    {role.icon || "🙋"} {role.title}
                                </span>
                                {role.description && (
                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                                        {role.description}
                                    </p>
                                )}
                            </div>
                        </label>
                    ))}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <Button variant="secondary" onClick={() => setShowRegister(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleRegister} disabled={registering}>
                        {registering ? "Registering..." : "Join Volunteer Team"}
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
