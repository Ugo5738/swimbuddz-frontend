"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { MemberScorecard } from "@/lib/scorecard";
import {
  Award,
  Gauge,
  Lock,
  Ruler,
  Share2,
  ShieldCheck,
  Waves,
} from "lucide-react";
import Image from "next/image";

type Props = {
  scorecard: MemberScorecard;
  onOpenPrivacyModal?: () => void;
};

export function ScorecardOverviewHero({ scorecard, onOpenPrivacyModal }: Props) {
  const { headline, club_readiness } = scorecard;
  const initials = scorecard.member_name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-cyan-950 to-blue-950 p-5 sm:p-7 text-white shadow-lg">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {scorecard.profile_photo_url ? (
            <Image
              src={scorecard.profile_photo_url}
              alt={scorecard.member_name}
              width={64}
              height={64}
              unoptimized
              className="h-16 w-16 rounded-2xl object-cover ring-2 ring-cyan-400/40 shrink-0"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/20 text-xl font-bold text-cyan-200 ring-2 ring-cyan-400/40">
              {initials || "SB"}
            </div>
          )}

          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
              SwimBuddz Swim Scorecard
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {scorecard.member_name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {club_readiness.is_club_ready && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/40">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Club Ready
                </span>
              )}
              {scorecard.active_programmes.map((prog) => (
                <span
                  key={prog}
                  className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-cyan-100"
                >
                  {prog}
                </span>
              ))}
              {scorecard.pod_name && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-400/20 px-2.5 py-0.5 text-xs font-medium text-blue-100">
                  <Waves className="h-3 w-3" />
                  {scorecard.pod_name}
                  {scorecard.club_name ? ` · ${scorecard.club_name}` : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        {scorecard.can_edit_self && onOpenPrivacyModal && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenPrivacyModal}
              className="!border-white/20 !bg-white/10 !text-white hover:!bg-white/20 gap-1.5"
            >
              {scorecard.settings?.public_share_card_enabled ? (
                <>
                  <Share2 className="h-4 w-4" />
                  Privacy &amp; Share Link
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Privacy &amp; Sharing
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Verified Strokes Unlocked */}
      {headline.verified_strokes_unlocked.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
          <span className="text-xs font-medium text-cyan-200/80">
            Verified strokes unlocked:
          </span>
          {headline.verified_strokes_unlocked.map((stroke) => (
            <Badge
              key={stroke}
              className="!bg-emerald-500/20 !text-emerald-100 ring-1 ring-emerald-400/40"
            >
              ✓ {stroke}
            </Badge>
          ))}
        </div>
      )}

      {/* Four Athletic Headline Tiles — zero single punitive grade */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 text-xs text-cyan-200">
            <ShieldCheck className="h-4 w-4" />
            Verified Skills
          </div>
          <p className="mt-1 text-2xl font-bold">
            {headline.verified_skills_count}
            <span className="text-sm font-normal text-cyan-200/70">
              /{headline.total_skills}
            </span>
          </p>
          <p className="mt-0.5 text-[11px] text-cyan-100/70">
            Safety gates: {headline.safety_gates_cleared}/{headline.safety_gates_total}
          </p>
        </div>

        <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 text-xs text-cyan-200">
            <Ruler className="h-4 w-4" />
            Longest Continuous
          </div>
          <p className="mt-1 text-2xl font-bold">
            {headline.top_distance_m ? `${headline.top_distance_m}m` : "—"}
          </p>
          <p className="mt-0.5 text-[11px] text-cyan-100/70">
            {headline.top_distance_stroke
              ? `${headline.top_distance_stroke}${headline.top_distance_verified ? " · Verified" : " · Self-logged"}`
              : "Log your first distance"}
          </p>
        </div>

        <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 text-xs text-cyan-200">
            <Award className="h-4 w-4" />
            Best Efficiency
          </div>
          <p className="mt-1 text-2xl font-bold">
            {headline.best_spl
              ? `${headline.best_spl} SPL`
              : headline.best_swolf
                ? `${headline.best_swolf} SWOLF`
                : "—"}
          </p>
          <p className="mt-0.5 text-[11px] text-cyan-100/70">
            {headline.best_spl && headline.best_spl_pool_length_m
              ? `${headline.best_spl_pool_length_m}m pool${headline.best_swolf ? ` · SWOLF ${headline.best_swolf}` : ""}`
              : headline.best_swolf && headline.best_swolf_pool_length_m
                ? `${headline.best_swolf_pool_length_m}m pool`
                : "SPL & SWOLF (Club)"}
          </p>
        </div>

        <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 text-xs text-cyan-200">
            <Gauge className="h-4 w-4" />
            Stroke Rate
          </div>
          <p className="mt-1 text-2xl font-bold">
            {headline.latest_stroke_rate_spm
              ? `${headline.latest_stroke_rate_spm.toFixed(1)}`
              : "—"}
            {headline.latest_stroke_rate_spm && (
              <span className="ml-1 text-xs font-normal text-cyan-200/80">SPM</span>
            )}
          </p>
          <p className="mt-0.5 text-[11px] text-cyan-100/70">
            {headline.latest_stroke_rate_source === "strokelab_ai"
              ? "From Stroke Lab AI"
              : headline.latest_stroke_rate_source === "coach_verified"
                ? "Coach / Pod Verified"
                : headline.latest_stroke_rate_spm
                  ? "Self-logged"
                  : "Via Stroke Lab or Benchmark"}
          </p>
        </div>
      </div>
    </div>
  );
}
