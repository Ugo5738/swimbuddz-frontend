"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet } from "@/lib/api";
import Link from "next/link";
import { useEffect, useState } from "react";

function formatDate(start: string, end: string) {
  const dateObj = new Date(start);
  const formattedDate = dateObj.toLocaleDateString("en-NG", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
  const startTime = dateObj.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
  const endTime = new Date(end).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
  return `${formattedDate} • ${startTime} – ${endTime}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(value);
}

interface Session {
  id: string;
  title: string;
  location: string;
  starts_at: string;  // API returns starts_at, not start_time
  ends_at: string;    // API returns ends_at, not end_time
  pool_fee: number;
  ride_share_fee?: number;
  description?: string;
  session_type?: "club" | "academy" | "community" | "cohort_class" | "one_on_one" | "group_booking" | "event";
  ride_configs?: Array<{
    id: string;
    ride_area_name: string;
    cost: number;
    capacity: number;
    pickup_locations?: Array<{ id: string; name: string }>;
  }>;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [membership, setMembership] = useState<"community" | "club" | "academy">("community");
  const [bookedSessionIds, setBookedSessionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        let membership = "community"; // default if not logged in
        let bookedIds = new Set<string>();
        try {
          const profile = await apiGet<any>("/api/v1/members/me", { auth: true });
          if (profile) {
            membership = (
              profile.membership_tier ||
              (profile.membership_tiers && profile.membership_tiers[0]) ||
              "community"
            ).toLowerCase();
          }

          // If logged in, fetch attendance to mark sessions already booked.
          const attendance = await apiGet<Array<{ session_id: string; status?: string }>>(
            "/api/v1/attendance/me",
            { auth: true }
          ).catch(() => []);
          for (const record of attendance || []) {
            const status = String(record.status || "").toLowerCase();
            if (!record.session_id) continue;
            if (status === "cancelled" || status === "canceled" || status === "no_show") {
              continue;
            }
            bookedIds.add(record.session_id);
          }
        } catch (e) {
          console.log("User not logged in or profile fetch failed, defaulting to community view.");
        }
        setMembership(membership as "community" | "club" | "academy");
        setBookedSessionIds(bookedIds);

        // Filter by session type instead of allowed tiers
        let types: string[] = [];
        if (membership === "academy") {
          types = ["club", "academy", "community"];
        } else if (membership === "club") {
          types = ["club", "community"];
        } else {
          // public/community: show community-facing sessions only
          types = ["community"];
        }

        const typeQuery = types.length ? `?types=${types.join(",")}` : "";
        console.log("Fetching sessions for membership:", membership, "with types:", types);
        const sessionsData = await apiGet<Session[]>(`/api/v1/sessions/${typeQuery}`);
        console.log("Received sessions:", sessionsData);

        // Fetch ride configs for each session
        const sessionsWithRides = await Promise.all(
          sessionsData.map(async (session) => {
            try {
              const rideConfigs = await apiGet<any[]>(`/api/v1/transport/sessions/${session.id}/ride-configs`);
              return { ...session, ride_configs: rideConfigs };
            } catch (err) {
              // If ride configs fail, just return session without them
              return { ...session, ride_configs: [] };
            }
          })
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
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">Sessions</p>
        <h1 className="text-4xl font-bold text-slate-900">Upcoming swims</h1>
        <p className="text-base text-slate-600">
          Join us for a swim! Sessions are tailored to your membership tier.
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
            <p className="text-slate-600">No upcoming sessions found for your tier.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {sessions.map((session) => {
              const isBooked = bookedSessionIds.has(session.id);
              return (
                <Card key={session.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-slate-900">{session.title}</h2>
                    <p className="text-sm text-slate-500">{session.location}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="info">{(session.session_type || "SESSION").replace("_", " ")}</Badge>
                    {isBooked ? <Badge variant="success">Booked</Badge> : null}
                  </div>
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  {formatDate(session.starts_at, session.ends_at)}
                </p>
                <p className="text-sm text-slate-600">{session.description}</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Pool fee</p>
                    <p className="font-semibold text-slate-900">{formatCurrency(session.pool_fee)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Ride-share</p>
                    <p className="font-semibold text-slate-900">
                      {session.ride_configs && session.ride_configs.length > 0
                        ? `From ${formatCurrency(Math.min(...session.ride_configs.map(c => c.cost)))}`
                        : "N/A"}
                    </p>
                  </div>
                </div>
                {session.ride_configs && session.ride_configs.length > 0 ? (
                  <div className="rounded bg-emerald-50 px-3 py-2 space-y-1">
                    <p className="text-xs font-semibold text-emerald-900">Ride-share available:</p>
                    {session.ride_configs.map((config, idx) => (
                      <div key={idx} className="text-xs text-emerald-800">
                        • {config.ride_area_name} - {formatCurrency(config.cost)} ({config.pickup_locations?.length || 0} pickup points)
                      </div>
                    ))}
                  </div>
                ) : null}
                {session.session_type === "club" && membership === "community" ? (
                  <div className="text-sm text-amber-700">
                    Club members only.{" "}
                    <Link href="/club" className="font-semibold underline">
                      Learn about Club tier
                    </Link>
                  </div>
                ) : (
                  <div>
                    <Link
                      href={`/sessions/${session.id}/book`}
                      className="inline-flex font-semibold text-cyan-700 hover:underline"
                    >
                      {isBooked ? "View booking →" : "Book spot →"}
                    </Link>
                  </div>
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
