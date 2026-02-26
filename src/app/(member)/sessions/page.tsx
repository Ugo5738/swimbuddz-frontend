"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet } from "@/lib/api";
import {
  hasTierAccess,
  requiredTierForSessionType,
  tierDisplayLabel,
} from "@/lib/sessionAccess";
import { Session, SessionType } from "@/lib/sessions";
import { getEffectiveTier, MembershipTier } from "@/lib/tiers";
import { CheckCircle2, Lock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const SESSION_TYPES_QUERY = [
  SessionType.COMMUNITY,
  SessionType.CLUB,
  SessionType.COHORT_CLASS,
  SessionType.ONE_ON_ONE,
  SessionType.GROUP_BOOKING,
  SessionType.EVENT,
].join(",");

function formatDate(start: string, end: string) {
  const dateObj = new Date(start);
  const formattedDate = dateObj.toLocaleDateString("en-NG", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const startTime = dateObj.toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = new Date(end).toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${formattedDate} • ${startTime} – ${endTime}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(value);
}

type SessionWithRides = Session & {
  ride_configs?: Array<{
    id: string;
    ride_area_name: string;
    cost: number;
    capacity: number;
    pickup_locations?: Array<{ id: string; name: string }>;
  }>;
};

type MemberProfile = {
  membership?: {
    primary_tier?: string | null;
    active_tiers?: string[] | null;
    requested_tiers?: string[] | null;
    community_paid_until?: string | null;
    club_paid_until?: string | null;
    academy_paid_until?: string | null;
  } | null;
};

function formatSessionTypeLabel(value?: string | null): string {
  return String(value || "session")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getUpgradeHref(requiredTier: MembershipTier): string {
  if (requiredTier === "academy") return "/account/academy/browse";
  if (requiredTier === "club") return "/club";
  return "/community";
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionWithRides[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [membership, setMembership] = useState<MembershipTier>("community");
  const [bookedSessionIds, setBookedSessionIds] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        let resolvedTier: MembershipTier = "community";
        let bookedIds = new Set<string>();

        try {
          const profile = await apiGet<MemberProfile>("/api/v1/members/me", {
            auth: true,
          });
          resolvedTier = getEffectiveTier(profile);

          const attendance = await apiGet<
            Array<{ session_id: string; status?: string }>
          >("/api/v1/attendance/me", { auth: true }).catch(() => []);
          for (const record of attendance || []) {
            const status = String(record.status || "").toLowerCase();
            if (!record.session_id) continue;
            if (
              status === "cancelled" ||
              status === "canceled" ||
              status === "no_show"
            ) {
              continue;
            }
            bookedIds.add(record.session_id);
          }
        } catch (e) {
          console.log("Membership lookup failed, defaulting to community tier.");
        }
        setMembership(resolvedTier);
        setBookedSessionIds(bookedIds);

        const sessionsData = await apiGet<SessionWithRides[]>(
          `/api/v1/sessions?types=${encodeURIComponent(SESSION_TYPES_QUERY)}`,
        );

        // Fetch ride configs for each session
        const sessionsWithRides = await Promise.all(
          sessionsData.map(async (session) => {
            try {
              const rideConfigs = await apiGet<any[]>(
                `/api/v1/transport/sessions/${session.id}/ride-configs`,
              );
              return { ...session, ride_configs: rideConfigs };
            } catch (err) {
              // If ride configs fail, just return session without them
              return { ...session, ride_configs: [] };
            }
          }),
        );

        setSessions(sessionsWithRides);
      } catch (err) {
        console.error(err);
        setError("Unable to load sessions. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
          Sessions
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-4xl font-bold text-slate-900">Upcoming swims</h1>
          <Badge variant="info">{tierDisplayLabel(membership)} member</Badge>
        </div>
        <p className="text-base text-slate-600">
          Browse all upcoming sessions. Your tier controls which sessions you
          can book.
        </p>
      </header>
      <section aria-live="polite">
        {loading ? (
          <LoadingCard text="Loading sessions..." />
        ) : error ? (
          <Alert variant="error" title="Error loading sessions">
            {error}
          </Alert>
        ) : sessions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
            <p className="text-slate-600">
              No upcoming sessions found for your tier.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {sessions.map((session) => {
              const requiredTier = requiredTierForSessionType(
                session.session_type,
              );
              const canBook = hasTierAccess(membership, requiredTier);
              const isBooked = bookedSessionIds.has(session.id);
              return (
                <Card
                  key={session.id}
                  className={
                    isBooked
                      ? "space-y-4 border-l-4 border-l-emerald-400/70 border-r-4 border-r-emerald-400/70"
                      : !canBook
                        ? "space-y-4 opacity-75"
                        : "space-y-4"
                  }
                >
                  {/* Title + badges row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h2 className="text-xl font-semibold text-slate-900">
                        {session.title}
                      </h2>
                      <p className="text-sm text-slate-500">
                        {session.location_name || session.location || "Location TBA"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Badge variant="info">
                        {formatSessionTypeLabel(session.session_type)}
                      </Badge>
                      {!canBook && !isBooked ? (
                        <Badge variant="warning" className="capitalize">
                          Requires {tierDisplayLabel(requiredTier)}
                        </Badge>
                      ) : isBooked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Booked
                        </span>
                      ) : (
                        <Badge variant="success">Available</Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-sm font-semibold text-slate-700">
                    {formatDate(session.starts_at, session.ends_at)}
                  </p>
                  <p className="text-sm text-slate-600">
                    {session.description}
                  </p>

                  {/* Fees */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Pool fee
                      </p>
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(session.pool_fee)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Ride-share
                      </p>
                      <p className="font-semibold text-slate-900">
                        {session.ride_configs && session.ride_configs.length > 0
                          ? `From ${formatCurrency(Math.min(...session.ride_configs.map((c) => c.cost)))}`
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Ride-share areas */}
                  {session.ride_configs && session.ride_configs.length > 0 ? (
                    <div className="rounded bg-emerald-50 px-3 py-2 space-y-1">
                      <p className="text-xs font-semibold text-emerald-900">
                        Ride-share available:
                      </p>
                      {session.ride_configs.map((config, idx) => (
                        <div key={idx} className="text-xs text-emerald-800">
                          • {config.ride_area_name} –{" "}
                          {formatCurrency(config.cost)} (
                          {config.pickup_locations?.length || 0} pickup points)
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {/* CTA */}
                  {isBooked ? (
                    <Link
                      href={`/sessions/${session.id}/book`}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      View my booking
                    </Link>
                  ) : !canBook ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-1.5 text-amber-700">
                        <Lock className="h-3.5 w-3.5 shrink-0" />
                        <p>
                          Available to {tierDisplayLabel(requiredTier)} members
                        </p>
                      </div>
                      <Link
                        href={getUpgradeHref(requiredTier)}
                        className="inline-flex font-semibold text-cyan-700 hover:underline"
                      >
                        Upgrade to {tierDisplayLabel(requiredTier)} →
                      </Link>
                    </div>
                  ) : (
                    <Link
                      href={`/sessions/${session.id}/book`}
                      className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700 transition-colors"
                    >
                      Book spot
                    </Link>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
