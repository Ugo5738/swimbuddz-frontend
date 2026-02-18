"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";
import { Session, SessionsApi, SessionType } from "@/lib/sessions";
import {
  Calendar,
  CheckCircle,
  Clock,
  Lock,
  MapPin,
  Users,
  Waves,
} from "lucide-react";
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
  community: "bg-emerald-100 text-emerald-700",
  club: "bg-blue-100 text-blue-700",
  academy: "bg-purple-100 text-purple-700",
};

/** Accent bar colour per tier */
const tierAccentColors: Record<string, string> = {
  community: "bg-emerald-500",
  club: "bg-blue-500",
  academy: "bg-purple-500",
};

/** Convert slugs like "rowe_park_pool" → "Rowe Park Pool" */
function formatLocationName(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function MemberSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [memberTiers, setMemberTiers] = useState<Set<string>>(new Set());
  const [bookedSessionIds, setBookedSessionIds] = useState<Set<string>>(
    new Set(),
  );
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
          { auth: true },
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
          new Date(s.starts_at) > now && bookableTypes.includes(s.session_type),
      );
      setSessions(futureSessions);

      // Mark sessions already booked by this member (from attendance records).
      const booked = new Set<string>();
      for (const record of attendanceData || []) {
        const status = String(record.status || "").toLowerCase();
        if (!record.session_id) continue;
        if (
          status === "cancelled" ||
          status === "canceled" ||
          status === "no_show"
        ) {
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
      const hasCommunity =
        mem?.community_paid_until &&
        Date.parse(mem.community_paid_until) > nowMs;
      const hasClub =
        mem?.club_paid_until && Date.parse(mem.club_paid_until) > nowMs;
      const hasAcademy =
        mem?.academy_paid_until && Date.parse(mem.academy_paid_until) > nowMs;

      // Apply tier hierarchy: Academy > Club > Community
      if (hasAcademy) {
        tiers.add("academy");
        tiers.add("club"); // Academy includes Club
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
        <p className="text-lg font-medium text-slate-600">
          Loading sessions...
        </p>
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
          <Waves className="mx-auto h-12 w-12 text-slate-300" />
          <h2 className="mt-4 text-xl font-semibold text-slate-900">
            No upcoming sessions
          </h2>
          <p className="mt-2 text-slate-600">
            Check back later for new session listings.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => {
            const hasAccess = canAccessSession(session);
            const isBooked = bookedSessionIds.has(session.id);
            const requiredTier = sessionTierMap[session.session_type];
            const startDate = new Date(session.starts_at);
            const endDate = new Date(session.ends_at);
            const accentColor =
              tierAccentColors[requiredTier] || "bg-slate-400";

            return (
              <div
                key={session.id}
                className={`relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all ${
                  hasAccess
                    ? "hover:shadow-lg hover:border-slate-200"
                    : "opacity-60"
                }`}
              >
                {/* Coloured accent bar */}
                <div className={`h-1.5 ${accentColor}`} />

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
                <div className="flex flex-1 flex-col p-5">
                  {/* Header with tier badge + booked status */}
                  <div className="flex items-center justify-between mb-3">
                    <Badge className={tierColors[requiredTier]}>
                      {tierLabels[requiredTier]}
                    </Badge>
                    {isBooked && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Booked
                      </span>
                    )}
                    {!hasAccess && (
                      <Badge className="bg-slate-200 text-slate-500">
                        Locked
                      </Badge>
                    )}
                  </div>

                  {/* Title + description */}
                  <h3 className="text-lg font-semibold text-slate-900">
                    {session.title}
                  </h3>
                  {session.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                      {session.description}
                    </p>
                  )}

                  {/* Details */}
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                      <span>
                        {startDate.toLocaleDateString("en-NG", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                      <span>
                        {startDate.toLocaleTimeString("en-NG", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        –{" "}
                        {endDate.toLocaleTimeString("en-NG", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {session.location_name && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                        <span>{formatLocationName(session.location_name)}</span>
                      </div>
                    )}
                    {session.capacity > 0 && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 shrink-0 text-slate-400" />
                        <span>{session.capacity} spots</span>
                      </div>
                    )}
                  </div>

                  {/* Spacer to push CTA to bottom */}
                  <div className="flex-1" />

                  {/* CTA */}
                  <div className="mt-4">
                    {hasAccess ? (
                      isBooked ? (
                        <Link href={`/sessions/${session.id}/book`}>
                          <Button
                            className="w-full"
                            size="sm"
                            variant="secondary"
                          >
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
              </div>
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
              Upgrade now to access all {tierLabels[selectedTier]} sessions and
              more!
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
                <Button className="w-full">Upgrade Now</Button>
              </Link>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
