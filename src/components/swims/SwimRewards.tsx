"use client";

import { apiGet } from "@/lib/api";
import {
  ArrowRight,
  Bubbles,
  Check,
  ChevronDown,
  ChevronUp,
  Gift,
  Trophy,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState } from "react";

import {
  getAllTimeActiveWeeks,
  getAllTimeBestStreak,
  getAllTimeSwims,
  getNextRewardMessage,
  getNextSwimRewardCue,
  NAIRA_PER_BUBBLE,
  SWIM_MILESTONES,
  swimNumberFormat as number,
  type SwimProgress,
  type SwimRewardsVariant,
  type WalletBalanceSnapshot,
} from "./swimRewardsHelpers";

export {
  getAllTimeActiveWeeks,
  getAllTimeBestStreak,
  getAllTimeSwims,
  getNextSwimRewardCue,
  type SwimProgress,
  type SwimRewardsVariant,
};

const MILESTONES = SWIM_MILESTONES;
const nextRewardMessage = getNextRewardMessage;

function DayPills({
  weekDays,
  weeklyLimit,
  compact = false,
}: {
  weekDays: number;
  weeklyLimit: number;
  compact?: boolean;
}) {
  return (
    <div
      className="grid grid-cols-3 gap-2"
      role="img"
      aria-label={`${weekDays} of ${weeklyLimit} reward days earned this week`}
    >
      {Array.from({ length: weeklyLimit }, (_, idx) => {
        const dayNum = idx + 1;
        const earned = dayNum <= weekDays;
        return (
          <div
            key={dayNum}
            className={`flex items-center justify-center gap-1 rounded-xl border px-2 text-xs font-semibold ${
              compact ? "py-1.5" : "py-2"
            } ${
              earned
                ? "border-cyan-600 bg-cyan-600 text-white shadow-sm"
                : "border-slate-200 bg-slate-50 text-slate-500"
            }`}
          >
            {earned ? (
              <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <span aria-hidden="true">🫧</span>
            )}
            <span>Day {dayNum}</span>
          </div>
        );
      })}
    </div>
  );
}

export function SwimRewardCard({
  data,
  variant,
  compact = false,
  walletBalance = null,
}: {
  data: SwimProgress;
  variant?: SwimRewardsVariant;
  compact?: boolean;
  walletBalance?: WalletBalanceSnapshot | null;
}) {
  const heading = useId();
  const [expanded, setExpanded] = useState(false);

  const resolvedVariant: SwimRewardsVariant = variant ?? (compact ? "dashboard" : "hub");
  const allTimeSwims = getAllTimeSwims(data);
  const allTimeActiveWeeks = getAllTimeActiveWeeks(data);
  const allTimeBestStreak = getAllTimeBestStreak(data);
  const nextBadge = MILESTONES.find(({ swims }) => swims > allTimeSwims);
  const swimsToBadge = nextBadge ? nextBadge.swims - allTimeSwims : 0;

  // ── Variant 1: Dashboard unified Wallet & Weekly Rewards hero card ──
  if (resolvedVariant === "dashboard") {
    const liveBalance = walletBalance?.balance ?? null;
    return (
      <section
        aria-labelledby={heading}
        className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Wallet className="h-3.5 w-3.5 text-cyan-700" aria-hidden="true" />
              Wallet &amp; Rewards
            </span>
            <Link
              href="/account/wallet/topup"
              className="text-xs font-semibold text-cyan-700 hover:underline"
            >
              Top up
            </Link>
          </div>
          {liveBalance !== null ? (
            <div className="mt-2 flex items-baseline gap-2">
              <Link
                href="/account/wallet"
                className="text-3xl font-bold tabular-nums text-slate-950 hover:text-cyan-800"
              >
                {number.format(liveBalance)} 🫧
              </Link>
              <span className="text-xs font-medium text-slate-500">
                ₦{number.format(liveBalance * NAIRA_PER_BUBBLE)} value
              </span>
            </div>
          ) : (
            <div className="mt-2">
              <Link
                href="/account/wallet"
                className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-800 hover:underline"
              >
                Open My Wallet <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between gap-2">
            <h2
              id={heading}
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-900"
            >
              <Bubbles className="h-4 w-4 text-cyan-700" aria-hidden="true" />
              This week’s swim rewards
            </h2>
            <span className="text-xs font-semibold tabular-nums text-cyan-700">
              {data.week_days} of {data.weekly_limit} days
            </span>
          </div>

          <DayPills weekDays={data.week_days} weeklyLimit={data.weekly_limit} compact />

          <p className="text-xs leading-relaxed text-slate-600">{nextRewardMessage(data)}</p>

          <Link
            href="/account/wallet/rewards"
            className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 underline-offset-4 hover:underline"
          >
            View reward details <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </section>
    );
  }

  // ── Variant 2: My Swims slim collapsible strip (keeps swims above the fold) ──
  if (resolvedVariant === "strip") {
    return (
      <section
        aria-labelledby={heading}
        className="rounded-2xl border border-cyan-200 bg-cyan-50/80 px-4 py-3 text-slate-900"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
            <h2 id={heading} className="flex items-center gap-1.5 font-semibold text-slate-950">
              <Bubbles className="h-4 w-4 text-cyan-700" aria-hidden="true" />
              This week’s swim rewards:
            </h2>
            <span className="font-bold tabular-nums text-cyan-800">
              {data.week_days} of {data.weekly_limit} days
            </span>
            <span className="inline-flex items-center gap-1" aria-hidden="true">
              {Array.from({ length: data.weekly_limit }, (_, idx) => (
                <span
                  key={idx}
                  className={`inline-block h-2 w-5 rounded-full ${
                    idx < data.week_days ? "bg-cyan-600" : "bg-cyan-200"
                  }`}
                />
              ))}
            </span>
            <span className="text-xs text-slate-600">
              · {number.format(allTimeSwims)} all-time {allTimeSwims === 1 ? "swim" : "swims"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((current) => !current)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-800 hover:underline"
            >
              {expanded ? (
                <>
                  Hide details <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                </>
              ) : (
                <>
                  Details <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                </>
              )}
            </button>
            <Link
              href="/account/wallet/rewards"
              className="inline-flex items-center gap-1 rounded-lg border border-cyan-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 hover:border-cyan-400 hover:text-cyan-800"
            >
              Rewards hub <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 grid gap-3 border-t border-cyan-200/80 pt-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">All-time attended swims</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-950">
                {number.format(allTimeSwims)} {allTimeSwims === 1 ? "swim" : "swims"}
              </p>
              <p className="mt-0.5 text-xs font-medium text-emerald-700">
                {nextBadge
                  ? `${swimsToBadge} more ${swimsToBadge === 1 ? "swim" : "swims"} to earn “${nextBadge.label}”`
                  : "All four swim badges earned"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">Swim Bubbles (since 22 Nov 2026)</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-950">
                {number.format(data.bubbles_earned)} 🫧{" "}
                <span className="text-xs font-normal text-slate-500">
                  (₦{number.format(data.reward_value_naira)})
                </span>
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Up to {data.weekly_limit} days each Mon–Sun in Lagos
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">How it works</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                1 Bubble (₦100) credits automatically after each eligible swim ends. Reversed if
                you’re marked absent or the session is cancelled.
              </p>
            </div>
          </div>
        )}
      </section>
    );
  }

  // ── Variant 3: Full Wallet → Rewards Hub (separating Programme Bubbles from All-Time Milestones) ──
  const badgeTarget = nextBadge?.swims ?? 100;
  const badgeProgressPct = nextBadge
    ? Math.min(100, Math.round((allTimeSwims / badgeTarget) * 100))
    : 100;

  return (
    <div id="swim-rewards" className="grid scroll-mt-20 gap-4 lg:grid-cols-12">
      {/* Left: Swim Bubbles Programme (Since 22 Nov 2026) */}
      <section
        aria-labelledby={heading}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-7"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-700">
              Swim Bubbles Programme · Since 22 Nov 2026
            </p>
            <h2 id={heading} className="mt-1 flex items-center gap-2 text-lg font-bold text-slate-950">
              <Bubbles className="h-5 w-5 text-cyan-700" aria-hidden="true" />
              Weekly Swim Bubbles
            </h2>
          </div>
          <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
            Automatic · ₦100 / 🫧
          </span>
        </div>

        <dl className="grid grid-cols-3 gap-2.5 text-center">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <dd className="text-xl font-bold tabular-nums text-slate-950">
              {data.week_days}/{data.weekly_limit}
            </dd>
            <dt className="mt-0.5 text-xs text-slate-500">Days this week</dt>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <dd className="text-xl font-bold tabular-nums text-slate-950">
              {number.format(data.bubbles_earned)} 🫧
            </dd>
            <dt className="mt-0.5 text-xs text-slate-500">Swim Bubbles</dt>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <dd className="text-xl font-bold tabular-nums text-slate-950">
              ₦{number.format(data.reward_value_naira)}
            </dd>
            <dt className="mt-0.5 text-xs text-slate-500">Wallet value</dt>
          </div>
        </dl>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800">This week (Mon–Sun Lagos)</span>
            <span className="font-semibold tabular-nums text-cyan-700">
              {data.week_days} of {data.weekly_limit} reward days
            </span>
          </div>
          <DayPills weekDays={data.week_days} weeklyLimit={data.weekly_limit} />
          <p className="flex items-start gap-2 pt-1 text-sm text-slate-700">
            <Gift className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" aria-hidden="true" />
            <span>{nextRewardMessage(data)}</span>
          </p>
        </div>

        {data.bubbles_earned === 0 && allTimeSwims > 0 && (
          <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-3.5 py-2.5 text-xs text-slate-700">
            <strong className="text-slate-900">New programme:</strong> Daily Swim Bubbles started on{" "}
            <strong>22 Nov 2026</strong>. Earlier swims count toward your all-time milestones, and
            your next eligible swim automatically starts earning Bubbles.
          </div>
        )}

        <p className="text-xs leading-relaxed text-slate-500">
          Earn 1 Bubble automatically after each eligible Club, Academy, or organised community swim
          ends (up to {data.weekly_limit} different days per Lagos week). Reversed if you’re marked
          absent or a session is cancelled.
        </p>
      </section>

      {/* Right: All-Time Swimming Milestones & Badges */}
      <section className="flex flex-col justify-between space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-5">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                All-Time Swimming
              </p>
              <h3 className="mt-1 text-lg font-bold text-slate-950">Milestones &amp; Badges</h3>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Trophy className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>

          <dl className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
              <dd className="text-lg font-bold tabular-nums text-slate-950">
                {number.format(allTimeSwims)}
              </dd>
              <dt className="text-xs text-slate-500">Attended</dt>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
              <dd className="text-lg font-bold tabular-nums text-slate-950">
                {number.format(allTimeActiveWeeks)}
              </dd>
              <dt className="text-xs text-slate-500">Active wks</dt>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
              <dd className="text-lg font-bold tabular-nums text-slate-950">
                {allTimeBestStreak}w
              </dd>
              <dt className="text-xs text-slate-500">Best streak</dt>
            </div>
          </dl>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-800">Swim Badges</p>
            <ul aria-label="Swim milestone badges" className="flex flex-wrap gap-2">
              {MILESTONES.map(({ swims, label }) => {
                const earned = allTimeSwims >= swims;
                return (
                  <li
                    key={label}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      earned
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-slate-50 text-slate-500"
                    }`}
                  >
                    {earned ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                    ) : (
                      <span aria-hidden="true">○</span>
                    )}
                    {label}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">
                {nextBadge
                  ? `${swimsToBadge} more ${swimsToBadge === 1 ? "swim" : "swims"} to earn “${nextBadge.label}”`
                  : "All four swim badges earned."}
              </span>
              {nextBadge && (
                <span className="font-semibold tabular-nums text-slate-900">
                  {number.format(allTimeSwims)}/{nextBadge.swims}
                </span>
              )}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-300"
                style={{ width: `${badgeProgressPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
          <span className="text-slate-500">Based on all recorded attended sessions</span>
          <Link
            href="/account/bookings?view=history"
            className="font-semibold text-cyan-700 hover:underline"
          >
            Swim history →
          </Link>
        </div>
      </section>
    </div>
  );
}

export function SwimRewards({
  compact = false,
  variant,
  onProgressLoaded,
}: {
  compact?: boolean;
  variant?: SwimRewardsVariant;
  onProgressLoaded?: (progress: SwimProgress) => void;
}) {
  const resolvedVariant: SwimRewardsVariant = variant ?? (compact ? "dashboard" : "hub");
  return (
    <SwimRewardSummary
      variant={resolvedVariant}
      onProgressLoaded={onProgressLoaded}
    />
  );
}

function SwimRewardSummary({
  variant,
  onProgressLoaded,
}: {
  variant: SwimRewardsVariant;
  onProgressLoaded?: (progress: SwimProgress) => void;
}) {
  const [data, setData] = useState<SwimProgress | null>(null);
  const [walletBalance, setWalletBalance] = useState<WalletBalanceSnapshot | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let request = 0;

    async function load() {
      const currentRequest = ++request;
      try {
        const walletPromise =
          variant === "dashboard"
            ? apiGet<WalletBalanceSnapshot>("/api/v1/wallet/me", { auth: true }).catch(() => null)
            : Promise.resolve(null);

        const [progressResult, walletResult] = await Promise.all([
          apiGet<SwimProgress>("/api/v1/wallet/rewards/swims", { auth: true }),
          walletPromise,
        ]);

        if (active && request === currentRequest) {
          setData(progressResult);
          setWalletBalance(walletResult);
          setFailed(false);
          onProgressLoaded?.(progressResult);
        }
      } catch {
        if (active && request === currentRequest) setFailed(true);
      }
    }

    function refresh() {
      if (document.visibilityState === "visible") void load();
    }

    void load();
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
    };
  }, [attempt, variant, onProgressLoaded]);

  if (failed) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Swim rewards couldn’t load.{" "}
        <button
          type="button"
          className="font-semibold text-cyan-700 underline"
          onClick={() => {
            setFailed(false);
            setAttempt((value) => value + 1);
          }}
        >
          Try again
        </button>
      </div>
    );
  }
  if (!data) {
    return (
      <div
        role="status"
        className={`rounded-2xl border border-slate-200 bg-white text-sm text-slate-500 ${
          variant === "strip" ? "px-4 py-3" : "p-5"
        }`}
      >
        Loading swim rewards…
      </div>
    );
  }
  return <SwimRewardCard data={data} variant={variant} walletBalance={walletBalance} />;
}
