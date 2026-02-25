"use client";

import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";
import { supabase } from "@/lib/auth";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type TabType = "sessions" | "events";

type SessionPreview = {
  id: string;
  title: string;
  starts_at: string;
  location_name?: string | null;
  location?: string | null;
  session_type?: string | null;
};

function formatPreviewDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date TBA";
  return date.toLocaleDateString("en-NG", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const LOGIN_REDIRECT_SESSIONS = `/login?redirect=${encodeURIComponent("/sessions")}`;

export default function SessionsAndEventsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("sessions");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [sessions, setSessions] = useState<SessionPreview[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoadingPreview(true);
        const [{ data }, sessionPreviews] = await Promise.all([
          supabase.auth.getUser(),
          apiGet<SessionPreview[]>(
            `/api/v1/sessions?types=${encodeURIComponent("club,community,event")}`,
          ).catch(() => []),
        ]);

        if (cancelled) return;
        setIsLoggedIn(Boolean(data.user));
        setSessions(sessionPreviews || []);
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const { clubPreview, communityPreview } = useMemo(() => {
    const now = Date.now();
    const upcoming = (sessions || [])
      .filter((item) => {
        const startsAt = Date.parse(String(item.starts_at || ""));
        return Number.isFinite(startsAt) && startsAt >= now;
      })
      .sort(
        (a, b) =>
          Date.parse(String(a.starts_at || "")) -
          Date.parse(String(b.starts_at || "")),
      );

    return {
      clubPreview: upcoming
        .filter((item) => String(item.session_type || "").toLowerCase() === "club")
        .slice(0, 3),
      communityPreview: upcoming
        .filter((item) => {
          const kind = String(item.session_type || "").toLowerCase();
          return kind === "community" || kind === "event";
        })
        .slice(0, 3),
    };
  }, [sessions]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="space-y-4">
        <h1 className="text-4xl font-bold text-slate-900">Sessions & Events</h1>
        <p className="text-lg text-slate-600 max-w-3xl">
          Preview what&apos;s coming up. Full schedules, booking, and ride-share
          details are available in your private member dashboard.
        </p>
      </section>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("events")}
            className={`border-b-2 pb-4 px-1 text-sm font-semibold transition ${
              activeTab === "events"
                ? "border-cyan-600 text-cyan-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            Community Events
          </button>
          <button
            onClick={() => setActiveTab("sessions")}
            className={`border-b-2 pb-4 px-1 text-sm font-semibold transition ${
              activeTab === "sessions"
                ? "border-cyan-600 text-cyan-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            Club Sessions
          </button>
        </nav>
      </div>
      
      {/* Tab Content */}
      {activeTab === "sessions" ? (
        <ClubSessionsTab
          isLoggedIn={isLoggedIn}
          loadingPreview={loadingPreview}
          previewItems={clubPreview}
        />
      ) : (
        <CommunityEventsTab
          isLoggedIn={isLoggedIn}
          loadingPreview={loadingPreview}
          previewItems={communityPreview}
        />
      )}
    </div>
  );
}

function ClubSessionsTab({
  isLoggedIn,
  loadingPreview,
  previewItems,
}: {
  isLoggedIn: boolean;
  loadingPreview: boolean;
  previewItems: SessionPreview[];
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-cyan-50 p-4 border border-cyan-100 space-y-1">
        <p className="text-sm text-cyan-900">
          <span className="font-semibold">Club sessions preview:</span> You can
          view upcoming titles and dates here.
        </p>
        <p className="text-xs text-cyan-700">
          Booking and full timetable are available in the private sessions page.
        </p>
      </div>

      {loadingPreview ? (
        <Card className="p-6 text-center text-slate-500">
          Loading upcoming session previews...
        </Card>
      ) : previewItems.length === 0 ? (
        <Card className="p-6 text-center text-slate-500">
          No upcoming club sessions to preview yet.
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {previewItems.map((item) => (
            <Card key={item.id} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
                {formatPreviewDate(item.starts_at)}
              </p>
              <h3 className="font-semibold text-slate-900">{item.title}</h3>
              <p className="text-sm text-slate-600">
                {item.location_name || item.location || "Location shared in dashboard"}
              </p>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-8 text-center space-y-4">
        <p className="text-slate-600">
          Open the private sessions page to see live availability and book.
        </p>
        <Link
          href={isLoggedIn ? "/sessions" : LOGIN_REDIRECT_SESSIONS}
          className="inline-block rounded-full bg-cyan-600 px-6 py-3 font-semibold text-white hover:bg-cyan-500 transition"
        >
          {isLoggedIn ? "Open Private Schedule" : "Sign In to View Full Schedule"}
        </Link>
        {!isLoggedIn && (
          <p className="text-sm text-slate-500">
            Not a Club member yet?{" "}
            <Link href="/club" className="underline font-semibold hover:text-cyan-700">
              Learn about Club tier
            </Link>
          </p>
        )}
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="space-y-2">
          <h3 className="font-semibold text-slate-900">📍 Locations</h3>
          <p className="text-sm text-slate-600">
            Yaba, Festac, and Victoria Island
          </p>
        </Card>
        <Card className="space-y-2">
          <h3 className="font-semibold text-slate-900">⏰ Schedule</h3>
          <p className="text-sm text-slate-600">
            Multiple sessions weekly at various times
          </p>
        </Card>
        <Card className="space-y-2">
          <h3 className="font-semibold text-slate-900">🚗 Ride-Share</h3>
          <p className="text-sm text-slate-600">
            Pickup plans available for selected sessions
          </p>
        </Card>
      </div>
    </div>
  );
}

function CommunityEventsTab({
  isLoggedIn,
  loadingPreview,
  previewItems,
}: {
  isLoggedIn: boolean;
  loadingPreview: boolean;
  previewItems: SessionPreview[];
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-cyan-50 p-4 border border-cyan-100 space-y-1">
        <p className="text-sm text-cyan-900">
          <span className="font-semibold">Community events preview:</span> Open
          to all SwimBuddz members. Beach days, hangouts, watch parties, and more!
        </p>
        <p className="text-xs text-cyan-700">
          RSVP and detailed event logistics are managed in the member dashboard.
        </p>
      </div>

      {loadingPreview ? (
        <Card className="p-6 text-center text-slate-500">
          Loading upcoming community previews...
        </Card>
      ) : previewItems.length === 0 ? (
        <Card className="p-6 text-center text-slate-500">
          No upcoming community events to preview yet.
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {previewItems.map((item) => (
            <Card key={item.id} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
                {formatPreviewDate(item.starts_at)}
              </p>
              <h3 className="font-semibold text-slate-900">{item.title}</h3>
              <p className="text-sm text-slate-600">
                {item.location_name || item.location || "Location shared in dashboard"}
              </p>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-8 text-center space-y-4">
        <p className="text-slate-600">
          Open the member dashboard for live event calendar and RSVP.
        </p>
        <Link
          href={isLoggedIn ? "/community/events" : LOGIN_REDIRECT_SESSIONS}
          className="inline-block rounded-full bg-cyan-600 px-6 py-3 font-semibold text-white hover:bg-cyan-500 transition"
        >
          {isLoggedIn ? "View Events Calendar" : "Sign In to RSVP"}
        </Link>
      </Card>

      {/* Event Types */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Types of Events
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="space-y-2">
            <h4 className="font-semibold text-cyan-700">🏖️ Beach Days</h4>
            <p className="text-sm text-slate-600">
              Relaxed ocean swims and beach hangouts
            </p>
          </Card>
          <Card className="space-y-2">
            <h4 className="font-semibold text-cyan-700">🎉 Social Hangouts</h4>
            <p className="text-sm text-slate-600">
              Meet fellow swimmers outside the pool
            </p>
          </Card>
          <Card className="space-y-2">
            <h4 className="font-semibold text-cyan-700">📺 Watch Parties</h4>
            <p className="text-sm text-slate-600">
              Watch swimming competitions together
            </p>
          </Card>
          <Card className="space-y-2">
            <h4 className="font-semibold text-cyan-700">🤝 Volunteer Events</h4>
            <p className="text-sm text-slate-600">
              Pool cleanups and community service
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

