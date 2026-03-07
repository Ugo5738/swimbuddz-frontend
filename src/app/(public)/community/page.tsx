"use client";

import { Card } from "@/components/ui/Card";
import { API_BASE_URL } from "@/lib/config";
import {
  SessionsApi,
  SessionStatus,
  type Session,
} from "@/lib/sessions";
import {
  RECOGNITION_LABELS,
  VolunteersApi,
  type LeaderboardEntry,
  type RecognitionTier,
  type SpotlightData,
  type VolunteerRole,
} from "@/lib/volunteers";
import Link from "next/link";
import { useEffect, useState } from "react";

// ── Static data ──────────────────────────────────────────────────

const communityFeatures = [
  {
    title: "Meet Our Coaches",
    description:
      "Discover our certified swimming coaches, their expertise, and the programs they teach.",
    link: "/coaches",
    icon: "🏊‍♂️",
  },
  {
    title: "Events Calendar",
    description:
      "Social swims, casual meetups, beach hangouts, socials, watch parties and community-led activities.",
    link: "/community/events",
    icon: "📅",
  },
  {
    title: "Member Directory",
    description:
      "Connect with other swimmers who opted in to be visible in the community.",
    link: "/community/directory",
    icon: "👥",
  },
  {
    title: "Volunteer Hub",
    description:
      "Help build SwimBuddz by volunteering in media, logistics, or coaching support.",
    link: "/volunteer",
    icon: "🤝",
  },
  {
    title: "Tips & Articles",
    description:
      "Educational content on swimming techniques, safety, breathing, and more.",
    link: "/community/tips",
    icon: "📚",
  },
];

/** Guard against UUIDs or missing names showing in the UI */
function getDisplayName(name: string | null | undefined): string {
  if (!name) return "Volunteer";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(name)) return "Volunteer";
  return name;
}

/** Format a date as "Sat, Mar 8" */
function formatSessionDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-NG", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Format time as "10:00 AM" */
function formatSessionTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-NG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ── Types for page data ──────────────────────────────────────────

interface MemberStats {
  total_members: number;
  active_members: number;
}

interface GalleryPhoto {
  id: string;
  file_url: string;
  thumbnail_url?: string;
  title?: string;
}

// ── Component ────────────────────────────────────────────────────

export default function CommunityPage() {
  // Data states
  const [spotlight, setSpotlight] = useState<SpotlightData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<
    "all_time" | "this_month"
  >("all_time");
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [memberStats, setMemberStats] = useState<MemberStats | null>(null);
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [roleMap, setRoleMap] = useState<Record<string, string>>({});
  const [photoMap, setPhotoMap] = useState<Record<string, string>>({});
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [pageLoading, setPageLoading] = useState(true);

  // ── Parallel data fetching ──────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      const results = await Promise.allSettled([
        // 0: Volunteer spotlight
        VolunteersApi.getSpotlight(),
        // 1: Leaderboard
        VolunteersApi.getLeaderboard("all_time"),
        // 2: Volunteer roles (for name resolution)
        VolunteersApi.listRoles(),
        // 3: Upcoming sessions (community type)
        SessionsApi.listSessions({ types: "community,event" }),
        // 4: Member stats
        fetch(`${API_BASE_URL}/api/v1/members/stats`).then((r) =>
          r.ok ? r.json() : null,
        ),
        // 5: Community photos
        fetch(`${API_BASE_URL}/api/v1/media/assets`).then((r) =>
          r.ok ? r.json() : [],
        ),
      ]);

      // Spotlight
      if (results[0].status === "fulfilled" && results[0].value) {
        setSpotlight(results[0].value);
      }

      // Leaderboard
      if (results[1].status === "fulfilled" && results[1].value) {
        setLeaderboard(results[1].value);
      }

      // Role map
      if (results[2].status === "fulfilled" && results[2].value) {
        const map: Record<string, string> = {};
        (results[2].value as VolunteerRole[]).forEach((r) => {
          map[r.id] = r.title;
        });
        setRoleMap(map);
      }

      // Upcoming sessions — filter scheduled, sort by date, take next 3
      if (results[3].status === "fulfilled" && results[3].value) {
        const now = new Date();
        const upcoming = (results[3].value as Session[])
          .filter(
            (s) =>
              s.status === SessionStatus.SCHEDULED &&
              new Date(s.starts_at) > now,
          )
          .sort(
            (a, b) =>
              new Date(a.starts_at).getTime() -
              new Date(b.starts_at).getTime(),
          )
          .slice(0, 3);
        setUpcomingSessions(upcoming);
      }

      // Member stats
      if (results[4].status === "fulfilled" && results[4].value) {
        setMemberStats(results[4].value as MemberStats);
      }

      // Community photos
      if (results[5].status === "fulfilled" && results[5].value) {
        const assets = results[5].value as any[];
        const photos = assets
          .filter(
            (a) =>
              a.key.startsWith("community_photo_") && a.media_item?.file_url,
          )
          .sort((a, b) => {
            const orderA = parseInt(a.key.split("_").pop() || "0");
            const orderB = parseInt(b.key.split("_").pop() || "0");
            return orderA - orderB;
          })
          .map((a) => ({
            id: a.id,
            file_url: a.media_item.file_url,
            thumbnail_url: a.media_item.thumbnail_url,
            title: a.description || "SwimBuddz community",
          }));
        setGalleryPhotos(photos);
      }

      setPageLoading(false);
    };

    fetchAll();
  }, []);

  // Fetch profile photos for spotlight volunteers
  useEffect(() => {
    if (!spotlight) return;
    const memberIds = new Set<string>();
    if (spotlight.featured_volunteer) {
      memberIds.add(spotlight.featured_volunteer.member_id);
    }
    spotlight.top_volunteers?.forEach((v) => memberIds.add(v.member_id));

    if (memberIds.size === 0) return;

    const fetchPhotos = async () => {
      const map: Record<string, string> = {};
      await Promise.allSettled(
        Array.from(memberIds).map(async (id) => {
          try {
            const res = await fetch(
              `${API_BASE_URL}/api/v1/members/public/${id}`,
            );
            if (res.ok) {
              const data = await res.json();
              if (data.profile_photo_url) {
                map[id] = data.profile_photo_url;
              }
            }
          } catch {
            /* ignore per-member failures */
          }
        }),
      );
      if (Object.keys(map).length > 0) {
        setPhotoMap(map);
      }
    };
    fetchPhotos();
  }, [spotlight]);

  // Fetch leaderboard when period changes
  useEffect(() => {
    VolunteersApi.getLeaderboard(leaderboardPeriod)
      .then(setLeaderboard)
      .catch(() => {});
  }, [leaderboardPeriod]);

  const handleImageLoad = (id: string) => {
    setLoadedImages((prev) => new Set(prev).add(id));
  };

  // ── Loading state ───────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
        <p className="text-lg font-medium text-slate-600">
          Loading community...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-14">
      {/* ─── 1. HERO + STATS BAR ────────────────────────────────────── */}
      <section className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
            Community
          </p>
          <h1 className="text-4xl font-bold text-slate-900 md:text-5xl mt-2">
            The SwimBuddz Community
          </h1>
          <p className="text-lg text-slate-600 max-w-3xl mt-3">
            A welcoming space for swimmers of all levels to connect, share, and
            grow together. See what&apos;s happening in the community right now.
          </p>
        </div>

        {/* Stats chips — horizontally scrollable on mobile */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {memberStats && memberStats.total_members > 0 && (
            <div className="flex-shrink-0 inline-flex items-center gap-2 rounded-full bg-cyan-50 border border-cyan-200 px-4 py-2">
              <span className="text-lg">👥</span>
              <span className="text-sm font-semibold text-cyan-700">
                {memberStats.total_members}+ Members
              </span>
            </div>
          )}
          {spotlight && spotlight.total_active_volunteers > 0 && (
            <div className="flex-shrink-0 inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-4 py-2">
              <span className="text-lg">🤝</span>
              <span className="text-sm font-semibold text-amber-700">
                {spotlight.total_active_volunteers} Active Volunteers
              </span>
            </div>
          )}
          {spotlight && spotlight.total_hours_all_time > 0 && (
            <div className="flex-shrink-0 inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-4 py-2">
              <span className="text-lg">⏱️</span>
              <span className="text-sm font-semibold text-emerald-700">
                {Math.floor(spotlight.total_hours_all_time)}+ Hours
                Volunteered
              </span>
            </div>
          )}
          {upcomingSessions.length > 0 && (
            <div className="flex-shrink-0 inline-flex items-center gap-2 rounded-full bg-purple-50 border border-purple-200 px-4 py-2">
              <span className="text-lg">📅</span>
              <span className="text-sm font-semibold text-purple-700">
                {upcomingSessions.length} Upcoming Session
                {upcomingSessions.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ─── 2. WHAT'S HAPPENING ────────────────────────────────────── */}
      {(upcomingSessions.length > 0 ||
        (spotlight && spotlight.milestones_this_month.length > 0)) && (
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">
              What&apos;s Happening
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Upcoming sessions and recent community activity.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Upcoming sessions */}
            {upcomingSessions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Next Sessions
                </h3>
                {upcomingSessions.map((session) => (
                  <Card key={session.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center text-xl">
                        🏊
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">
                          {session.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatSessionDate(session.starts_at)} &middot;{" "}
                          {formatSessionTime(session.starts_at)}
                        </p>
                        {session.location_name && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            📍 {session.location_name}
                          </p>
                        )}
                      </div>
                      <Link
                        href="/sessions-and-events"
                        className="flex-shrink-0 text-xs font-medium text-cyan-600 hover:text-cyan-700"
                      >
                        View →
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Milestones / Activity Feed */}
            {spotlight && spotlight.milestones_this_month.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Recent Milestones
                </h3>
                {spotlight.milestones_this_month.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3"
                  >
                    <span className="text-xl flex-shrink-0">🏅</span>
                    <span className="text-sm text-amber-800">
                      {m.description} this month
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── 3. VOLUNTEER SPOTLIGHT ─────────────────────────────────── */}
      {spotlight?.featured_volunteer && (
        <section className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-600">
              Volunteer Spotlight
            </p>
            <h2 className="text-2xl font-semibold text-slate-900 mt-1">
              Volunteer of the Month
            </h2>
          </div>

          <Card className="overflow-hidden bg-gradient-to-br from-amber-50 to-white border-amber-200">
            <div className="p-6 flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-5">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {photoMap[spotlight.featured_volunteer.member_id] ||
                spotlight.featured_volunteer.profile_photo_url ? (
                  <img
                    src={
                      photoMap[spotlight.featured_volunteer.member_id] ||
                      spotlight.featured_volunteer.profile_photo_url!
                    }
                    alt={getDisplayName(
                      spotlight.featured_volunteer.member_name,
                    )}
                    className="w-24 h-24 rounded-full object-cover ring-4 ring-amber-200 shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-white text-3xl font-bold ring-4 ring-amber-200 shadow-lg">
                    {getDisplayName(spotlight.featured_volunteer.member_name)
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                )}
              </div>

              <div className="space-y-2 flex-1">
                <div className="inline-flex items-center gap-1.5 text-amber-600">
                  <span className="text-lg">🏆</span>
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Featured Volunteer
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  {getDisplayName(spotlight.featured_volunteer.member_name)}
                </h3>
                {(() => {
                  const roleId =
                    spotlight.featured_volunteer.preferred_roles?.[0];
                  if (!roleId) return null;
                  const label = roleMap[roleId];
                  if (!label) return null;
                  return (
                    <p className="text-sm text-amber-700 font-medium">
                      {label}
                    </p>
                  );
                })()}
                <p className="text-sm text-slate-500">
                  {spotlight.featured_volunteer.total_hours} hours contributed
                </p>
                {spotlight.featured_volunteer.spotlight_quote && (
                  <blockquote className="mt-2 border-l-2 border-amber-300 pl-3 text-sm italic text-slate-600">
                    &ldquo;{spotlight.featured_volunteer.spotlight_quote}
                    &rdquo;
                  </blockquote>
                )}
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* ─── 4. LEADERBOARD ─────────────────────────────────────────── */}
      {leaderboard.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">
                Top Contributors
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Volunteers who have given the most time.
              </p>
            </div>
            {/* Period toggle */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setLeaderboardPeriod("all_time")}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  leaderboardPeriod === "all_time"
                    ? "bg-white text-cyan-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => setLeaderboardPeriod("this_month")}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  leaderboardPeriod === "this_month"
                    ? "bg-white text-cyan-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                This Month
              </button>
            </div>
          </div>

          {/* Leaderboard list */}
          <div className="space-y-2">
            {leaderboard
              .filter((v) => getDisplayName(v.member_name) !== "Volunteer")
              .slice(0, 10)
              .map((volunteer, idx) => (
                <div
                  key={volunteer.member_id}
                  className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-colors ${
                    idx === 0
                      ? "bg-amber-50 border border-amber-200"
                      : idx === 1
                        ? "bg-slate-50 border border-slate-200"
                        : idx === 2
                          ? "bg-orange-50 border border-orange-200"
                          : "bg-white border border-slate-100"
                  }`}
                >
                  {/* Rank */}
                  <span
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      idx === 0
                        ? "bg-amber-400 text-white"
                        : idx === 1
                          ? "bg-slate-400 text-white"
                          : idx === 2
                            ? "bg-orange-400 text-white"
                            : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {idx + 1}
                  </span>

                  {/* Avatar */}
                  {photoMap[volunteer.member_id] ? (
                    <img
                      src={photoMap[volunteer.member_id]}
                      alt={getDisplayName(volunteer.member_name)}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {getDisplayName(volunteer.member_name)
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                  )}

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {getDisplayName(volunteer.member_name)}
                    </p>
                    {volunteer.recognition_tier && (
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${
                          volunteer.recognition_tier === "gold"
                            ? "bg-amber-100 text-amber-700"
                            : volunteer.recognition_tier === "silver"
                              ? "bg-slate-100 text-slate-700"
                              : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {RECOGNITION_LABELS[
                          volunteer.recognition_tier as RecognitionTier
                        ] || volunteer.recognition_tier}
                      </span>
                    )}
                  </div>

                  {/* Hours */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-cyan-600">
                      {volunteer.total_hours}
                    </p>
                    <p className="text-xs text-slate-400">hours</p>
                  </div>
                </div>
              ))}
          </div>

          <div className="text-center">
            <Link
              href="/volunteer"
              className="inline-flex items-center gap-1 text-sm font-medium text-cyan-600 hover:text-cyan-700 transition-colors"
            >
              Explore volunteer opportunities →
            </Link>
          </div>
        </section>
      )}

      {/* ─── 5. COMMUNITY PHOTOS ────────────────────────────────────── */}
      {galleryPhotos.length > 0 && (
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">
              Community Moments
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Snapshots from our sessions, meetups, and events.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {galleryPhotos.slice(0, 6).map((photo) => (
              <div
                key={photo.id}
                className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100"
              >
                {!loadedImages.has(photo.id) && (
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-100 to-cyan-200 animate-pulse flex items-center justify-center">
                    <span className="text-3xl">🏊</span>
                  </div>
                )}
                <img
                  src={photo.file_url || photo.thumbnail_url}
                  alt={photo.title || "SwimBuddz community"}
                  loading="lazy"
                  className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
                    loadedImages.has(photo.id) ? "opacity-100" : "opacity-0"
                  }`}
                  onLoad={() => handleImageLoad(photo.id)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/gallery"
              className="inline-flex items-center gap-2 text-sm font-medium text-cyan-600 hover:text-cyan-700 transition-colors"
            >
              Browse full gallery →
            </Link>
          </div>
        </section>
      )}

      {/* ─── 6. EXPLORE COMMUNITY FEATURES ──────────────────────────── */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">
            Explore Community Features
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Jump into the different areas of the SwimBuddz community.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {communityFeatures.map((feature) => (
            <Link key={feature.title} href={feature.link} className="group">
              <Card className="h-full p-5 transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-cyan-200">
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0 mt-0.5">
                    {feature.icon}
                  </span>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-slate-900 group-hover:text-cyan-700 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── 7. CTA ─────────────────────────────────────────────────── */}
      <section className="rounded-3xl bg-gradient-to-br from-cyan-600 to-cyan-700 px-8 py-12 text-center text-white">
        <h2 className="text-3xl font-bold mb-4">Who is this for?</h2>
        <p className="text-lg mb-6 text-cyan-50 max-w-2xl mx-auto">
          Anyone who wants to join the movement, make friends, and participate
          casually — no commitments or training expectations.
        </p>
        <Link
          href="/register"
          className="inline-block rounded-full bg-white px-8 py-3 font-semibold text-cyan-700 hover:bg-slate-50 transition"
        >
          Join SwimBuddz
        </Link>
      </section>

      {/* ─── 8. UPSELL ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Want More?</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="space-y-2">
            <h3 className="text-lg font-semibold text-cyan-700">Club Tier</h3>
            <p className="text-sm text-slate-600">
              Join structured training sessions, track your attendance, and
              build consistency.
            </p>
            <Link
              href="/club"
              className="inline-flex text-sm font-semibold text-cyan-700 hover:underline"
            >
              Learn about Club →
            </Link>
          </Card>
          <Card className="space-y-2">
            <h3 className="text-lg font-semibold text-cyan-700">
              Academy Tier
            </h3>
            <p className="text-sm text-slate-600">
              Enroll in structured learning programs with clear milestones and
              coach feedback.
            </p>
            <Link
              href="/academy"
              className="inline-flex text-sm font-semibold text-cyan-700 hover:underline"
            >
              Learn about Academy →
            </Link>
          </Card>
        </div>
      </section>
    </div>
  );
}
