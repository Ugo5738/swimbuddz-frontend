"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet } from "@/lib/api";

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
  start_time: string;
  end_time: string;
  pool_fee: number;
  ride_share_fee: number;
  description?: string;
  allowed_tiers: string[];
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        let tier = "community"; // Default for public

        try {
          // Try to get user profile to determine tier
          const profile = await apiGet<any>("/api/v1/members/me", { auth: true });
          if (profile) {
            tier = profile.membership_tier || (profile.membership_tiers && profile.membership_tiers[0]) || "community";
          }
        } catch (e) {
          // Not logged in or error fetching profile, stick to community
          console.log("User not logged in or profile fetch failed, defaulting to community view.");
        }

        // Fetch sessions filtered by tier
        // Note: The backend endpoint is public
        const data = await apiGet<Session[]>(`/api/v1/sessions/?tier=${tier.toLowerCase()}`);
        setSessions(data);
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
            {sessions.map((session) => (
              <Card key={session.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-slate-900">{session.title}</h2>
                    <p className="text-sm text-slate-500">{session.location}</p>
                  </div>
                  {/* <Badge variant="info">{session.type}</Badge> */}
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  {formatDate(session.start_time, session.end_time)}
                </p>
                <p className="text-sm text-slate-600">{session.description}</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Pool fee</p>
                    <p className="font-semibold text-slate-900">{formatCurrency(session.pool_fee)}</p>
                  </div>
                  {session.ride_share_fee ? (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Ride-share</p>
                      <p className="font-semibold text-slate-900">{formatCurrency(session.ride_share_fee)}</p>
                    </div>
                  ) : null}
                </div>
                <Link href={`/sessions/${session.id}/sign-in`} className="inline-flex font-semibold text-cyan-700 hover:underline">
                  Sign in &rarr;
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
