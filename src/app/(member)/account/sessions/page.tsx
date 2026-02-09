"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";
import { Session, SessionsApi, SessionType } from "@/lib/sessions";
import { Lock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type MemberInfo = {
    membership?: {
        active_tiers?: string[];
        primary_tier?: string;
        community_paid_until?: string;
        club_paid_until?: string;
        academy_paid_until?: string;
    };
};

// Map session types to required tier
const sessionTierMap: Record<SessionType, "community" | "club" | "academy"> = {
    [SessionType.COMMUNITY]: "community",
    [SessionType.EVENT]: "community",
    [SessionType.CLUB]: "club",
    [SessionType.GROUP_BOOKING]: "club",
    [SessionType.ONE_ON_ONE]: "academy",
    [SessionType.COHORT_CLASS]: "academy",
};

const tierLabels: Record<string, string> = {
    community: "Community",
    club: "Club",
    academy: "Academy",
};

const tierColors: Record<string, string> = {
    community: "bg-green-100 text-green-700",
    club: "bg-blue-100 text-blue-700",
    academy: "bg-purple-100 text-purple-700",
};

export default function MemberSessionsPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [memberTiers, setMemberTiers] = useState<Set<string>>(new Set());
    const [bookedSessionIds, setBookedSessionIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
    const [selectedTier, setSelectedTier] = useState<string>("");

    useEffect(() => {
        loadData();
    }, []);

	    const loadData = async () => {
	        try {
	            setLoading(true);
	            const [sessionsData, memberData, attendanceData] = await Promise.all([
	                SessionsApi.listSessions(),
	                apiGet<MemberInfo>("/api/v1/members/me", { auth: true }),
	                apiGet<Array<{ session_id: string; status?: string }>>(
	                    "/api/v1/attendance/me",
	                    { auth: true }
	                ).catch(() => []),
	            ]);

            // Filter to only future sessions AND only bookable session types
            // Hide COHORT_CLASS and ONE_ON_ONE (these are managed via enrollment/booking)
            const now = new Date();
            const bookableTypes = [
                SessionType.COMMUNITY,
                SessionType.EVENT,
                SessionType.CLUB,
                SessionType.GROUP_BOOKING,
            ];
	            const futureSessions = sessionsData.filter(
	                (s) =>
	                    new Date(s.starts_at) > now &&
	                    bookableTypes.includes(s.session_type)
	            );
	            setSessions(futureSessions);

	            // Mark sessions already booked by this member (from attendance records).
	            const booked = new Set<string>();
	            for (const record of attendanceData || []) {
	                const status = String(record.status || "").toLowerCase();
	                if (!record.session_id) continue;
	                if (status === "cancelled" || status === "canceled" || status === "no_show") {
	                    continue;
	                }
	                booked.add(record.session_id);
	            }
	            setBookedSessionIds(booked);

            // Determine member's active tiers with proper hierarchy
            const tiers = new Set<string>();
            const mem = memberData.membership;
            const nowMs = Date.now();

            // Check paid_until dates - with proper hierarchy
            const hasCommunity = mem?.community_paid_until && Date.parse(mem.community_paid_until) > nowMs;
            const hasClub = mem?.club_paid_until && Date.parse(mem.club_paid_until) > nowMs;
            const hasAcademy = mem?.academy_paid_until && Date.parse(mem.academy_paid_until) > nowMs;

            // Apply tier hierarchy: Academy > Club > Community
            if (hasAcademy) {
                tiers.add("academy");
                tiers.add("club");     // Academy includes Club
                tiers.add("community"); // Academy includes Community
            } else if (hasClub) {
                tiers.add("club");
                tiers.add("community"); // Club includes Community
            } else if (hasCommunity) {
                tiers.add("community");
            }

            // Also check active_tiers array and apply hierarchy
            mem?.active_tiers?.forEach((tier) => {
                const t = tier.toLowerCase();
                if (t === "academy") {
                    tiers.add("academy");
                    tiers.add("club");
                    tiers.add("community");
                } else if (t === "club") {
                    tiers.add("club");
                    tiers.add("community");
                } else if (t === "community") {
                    tiers.add("community");
                }
            });

            // Default to community if nothing
            if (tiers.size === 0) {
                tiers.add("community");
            }

            setMemberTiers(tiers);
        } catch (error) {
            console.error("Failed to load sessions:", error);
        } finally {
            setLoading(false);
        }
    };

    const canAccessSession = (session: Session): boolean => {
        const requiredTier = sessionTierMap[session.session_type];
        if (!requiredTier) return true; // Unknown type, allow access

        // Tier hierarchy: academy > club > community
        if (requiredTier === "community") return true; // Everyone can access community
        if (requiredTier === "club") {
            return memberTiers.has("club") || memberTiers.has("academy");
        }
        if (requiredTier === "academy") {
            return memberTiers.has("academy");
        }
        return false;
    };

    const handleLockedClick = (session: Session) => {
        const requiredTier = sessionTierMap[session.session_type];
        setSelectedTier(requiredTier);
        setUpgradeModalOpen(true);
    };

    if (loading) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
                <p className="text-lg font-medium text-slate-600">Loading sessions...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">My Sessions</h1>
                <p className="text-slate-600">
                    View and sign up for upcoming sessions based on your membership tier.
                </p>
            </div>

            {/* Tier indicators */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Your access:</span>
                {Array.from(memberTiers).map((tier) => (
                    <Badge key={tier} className={tierColors[tier]}>
                        {tierLabels[tier]}
                    </Badge>
                ))}
            </div>

            {/* Sessions Grid */}
            {sessions.length === 0 ? (
                <Card className="p-12 text-center">
                    <div className="text-4xl mb-4">📅</div>
                    <h2 className="text-xl font-semibold text-slate-900 mb-2">
                        No upcoming sessions
                    </h2>
                    <p className="text-slate-600">
                        Check back later for new session listings.
                    </p>
                </Card>
            ) : (
	                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
	                    {sessions.map((session) => {
	                        const hasAccess = canAccessSession(session);
	                        const isBooked = bookedSessionIds.has(session.id);
	                        const requiredTier = sessionTierMap[session.session_type];
	                        const startDate = new Date(session.starts_at);
	                        const endDate = new Date(session.ends_at);

                        return (
                            <Card
                                key={session.id}
                                className={`relative overflow-hidden transition-all ${hasAccess
                                    ? "hover:shadow-lg cursor-pointer"
                                    : "opacity-60"
                                    }`}
                            >
                                {/* Locked Overlay */}
                                {!hasAccess && (
                                    <div
                                        className="absolute inset-0 bg-slate-900/10 flex items-center justify-center z-10 cursor-pointer"
                                        onClick={() => handleLockedClick(session)}
                                    >
                                        <div className="bg-white rounded-full p-3 shadow-lg">
                                            <Lock className="h-6 w-6 text-slate-600" />
                                        </div>
                                    </div>
                                )}

	                                {/* Session Content */}
	                                <div className="p-5">
	                                    {/* Header with tier badge */}
	                                    <div className="flex items-start justify-between gap-2 mb-3">
	                                        <div className="flex flex-wrap items-center gap-2">
	                                            <Badge className={tierColors[requiredTier]}>
	                                                {tierLabels[requiredTier]}
	                                            </Badge>
	                                            {isBooked && (
	                                                <Badge className="bg-emerald-100 text-emerald-700">
	                                                    Booked
	                                                </Badge>
	                                            )}
	                                        </div>
	                                        {!hasAccess && (
	                                            <Badge className="bg-slate-200 text-slate-600">
	                                                Upgrade Required
	                                            </Badge>
	                                        )}
	                                    </div>

                                    {/* Title */}
                                    <h3 className="font-semibold text-slate-900 mb-2">
                                        {session.title}
                                    </h3>

                                    {/* Details */}
                                    <div className="space-y-1 text-sm text-slate-600">
                                        <p>
                                            📅 {startDate.toLocaleDateString("en-NG", {
                                                weekday: "short",
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </p>
                                        <p>
                                            🕐 {startDate.toLocaleTimeString("en-NG", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })} - {endDate.toLocaleTimeString("en-NG", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </p>
                                        {session.location_name && (
                                            <p>📍 {session.location_name}</p>
                                        )}
                                    </div>

	                                    {/* CTA */}
	                                    <div className="mt-4">
	                                        {hasAccess ? (
	                                            isBooked ? (
	                                                <Link href={`/sessions/${session.id}/book`}>
	                                                    <Button className="w-full" size="sm" variant="secondary">
	                                                        View Booking
	                                                    </Button>
	                                                </Link>
	                                            ) : (
	                                                <Link href={`/sessions/${session.id}/book`}>
	                                                    <Button className="w-full" size="sm">
	                                                        View & Book Spot
	                                                    </Button>
	                                                </Link>
	                                            )
	                                        ) : (
	                                            <Button
	                                                variant="outline"
	                                                className="w-full"
                                                size="sm"
                                                onClick={() => handleLockedClick(session)}
                                            >
                                                Upgrade to {tierLabels[requiredTier]}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Upgrade Modal */}
            {upgradeModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
                    <Card className="max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-slate-900 mb-2">
                            Upgrade to {tierLabels[selectedTier]}
                        </h2>
                        <p className="text-slate-600 mb-6">
                            This session requires a {tierLabels[selectedTier]} membership.
                            Upgrade now to access all {tierLabels[selectedTier]} sessions
                            and more!
                        </p>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setUpgradeModalOpen(false)}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Link href={`/upgrade/${selectedTier}`} className="flex-1">
                                <Button className="w-full">
                                    Upgrade Now
                                </Button>
                            </Link>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
