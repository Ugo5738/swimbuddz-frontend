"use client";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { fetchPublicScorecard, type PublicShareScorecard } from "@/lib/scorecard";
import {
  Award,
  Calendar,
  Clock,
  Heart,
  Ruler,
  ShieldCheck,
  Waves,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function PublicSharedScorecardPage() {
  const params = useParams();
  const token = params.token as string;
  const [card, setCard] = useState<PublicShareScorecard | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    fetchPublicScorecard(token)
      .then(setCard)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <LoadingCard text="Loading Swim Scorecard…" />
      </div>
    );
  }

  if (notFound || !card) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-4">
        <Waves className="mx-auto h-12 w-12 text-cyan-500" />
        <h1 className="text-2xl font-bold text-slate-900">
          Swim Scorecard Unavailable
        </h1>
        <p className="text-sm text-slate-600">
          This shared scorecard link is either disabled by the swimmer or no longer active.
        </p>
        <Link
          href="/"
          className="inline-flex items-center rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
        >
          Explore SwimBuddz
        </Link>
      </div>
    );
  }

  const initials = card.display_name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-cyan-950 to-blue-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-cyan-300">
            <Waves className="h-4 w-4" />
            SwimBuddz Swim Passport
          </span>
          <span className="text-xs text-cyan-200/80">
            Swimmer since{" "}
            {new Date(card.member_since).toLocaleDateString("en-NG", {
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>

        <div className="mt-6 flex items-center gap-4">
          {card.profile_photo_url ? (
            <Image
              src={card.profile_photo_url}
              alt={card.display_name}
              width={64}
              height={64}
              unoptimized
              className="h-16 w-16 rounded-2xl object-cover ring-2 ring-cyan-400/50"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/20 text-xl font-bold text-cyan-100 ring-2 ring-cyan-400/50">
              {initials || "SB"}
            </div>
          )}
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold">{card.display_name}</h1>
            <div className="flex flex-wrap gap-1.5">
              {card.is_club_ready && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/40">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Club Ready
                </span>
              )}
              {card.active_programmes.map((p) => (
                <span
                  key={p}
                  className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-cyan-100"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>

        {card.verified_strokes_unlocked.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
            <span className="text-xs text-cyan-200/80">Verified strokes:</span>
            {card.verified_strokes_unlocked.map((stroke) => (
              <Badge
                key={stroke}
                className="!bg-emerald-500/20 !text-emerald-100 ring-1 ring-emerald-400/40"
              >
                ✓ {stroke}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-white/10 p-3.5">
            <p className="text-[11px] text-cyan-200 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified Skills
            </p>
            <p className="mt-1 text-xl font-bold">
              {card.verified_skills_count}/{card.total_skills}
            </p>
          </div>

          <div className="rounded-xl bg-white/10 p-3.5">
            <p className="text-[11px] text-cyan-200 flex items-center gap-1">
              <Ruler className="h-3.5 w-3.5" />
              Top Verified Swim
            </p>
            <p className="mt-1 text-xl font-bold">
              {card.top_verified_distance_m ? `${card.top_verified_distance_m}m` : "—"}
            </p>
            {card.top_verified_distance_stroke && (
              <p className="text-[10px] text-cyan-200/70">
                {card.top_verified_distance_stroke}
              </p>
            )}
          </div>

          <div className="rounded-xl bg-white/10 p-3.5">
            <p className="text-[11px] text-cyan-200 flex items-center gap-1">
              <Award className="h-3.5 w-3.5" />
              Verified Efficiency
            </p>
            <p className="mt-1 text-xl font-bold">
              {card.best_verified_spl
                ? `${card.best_verified_spl} SPL`
                : card.best_verified_swolf
                  ? `${card.best_verified_swolf} SWOLF`
                  : "—"}
            </p>
            {(card.best_verified_spl_pool_length_m || card.best_verified_swolf_pool_length_m) && (
              <p className="text-[10px] text-cyan-200/70">
                {card.best_verified_spl_pool_length_m ?? card.best_verified_swolf_pool_length_m}m pool
              </p>
            )}
          </div>

          <div className="rounded-xl bg-white/10 p-3.5">
            <p className="text-[11px] text-cyan-200 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Pool Time
            </p>
            <p className="mt-1 text-xl font-bold">
              {card.total_pool_hours != null ? `${card.total_pool_hours.toFixed(1)}h` : "—"}
            </p>
            {card.total_sessions_attended != null && (
              <p className="text-[10px] text-cyan-200/70">
                {card.total_sessions_attended} swims
              </p>
            )}
          </div>
        </div>
      </div>

      {card.domain_highlights.length > 0 && (
        <Card className="p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Verified Competency Highlights
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {card.domain_highlights.map((d) => {
              const pct = Math.round((d.verified_count / Math.max(d.total_skills, 1)) * 100);
              return (
                <div key={d.code} className="rounded-xl bg-slate-50 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">{d.title}</span>
                    <span className="text-xs font-semibold text-emerald-700">
                      {d.verified_count}/{d.total_skills}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {card.volunteer_recognition_tier && (
        <Card className="p-4 flex items-center gap-3 bg-rose-50/60 border-rose-100">
          <Heart className="h-5 w-5 text-rose-500 shrink-0" />
          <p className="text-sm text-slate-700">
            Recognized SwimBuddz Community Volunteer —{" "}
            <strong className="capitalize">
              {card.volunteer_recognition_tier.replace(/_/g, " ")}
            </strong>
          </p>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-2">
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          Verified SwimBuddz milestones only · Private notes never shared
        </span>
        <Link href="/register" className="font-semibold text-cyan-700 hover:underline">
          Swim with SwimBuddz →
        </Link>
      </div>
    </div>
  );
}
