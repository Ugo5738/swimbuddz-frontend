"use client";

import { apiGet } from "@/lib/api";
import { ArrowRight, Bubbles, Gift, Trophy, Waves } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState } from "react";

export type SwimProgress = {
  total_swims: number;
  active_weeks: number;
  streak_weeks: number;
  week_days: number;
  weekly_limit: number;
  today_counted: boolean;
  bubbles_earned: number;
  bubbles_credited: number;
  reward_value_naira: number;
};

const number = new Intl.NumberFormat("en-NG");
const milestones = [
  { swims: 1, label: "First swim" },
  { swims: 10, label: "10 swims" },
  { swims: 50, label: "50 swims" },
  { swims: 100, label: "100 swims" },
];

function nextReward(data: SwimProgress) {
  if (data.week_days >= data.weekly_limit) {
    return "You’ve reached this week’s limit. You can earn again on Monday.";
  }
  if (data.today_counted) {
    return "Today’s swim counts. Swim on another day to earn again.";
  }
  if (data.bubbles_credited > data.bubbles_earned) {
    return "Your next qualifying swim counts toward a Bubble already credited before an attendance correction.";
  }
  return "Your next confirmed swim earns 1 Bubble.";
}

export function SwimRewardCard({
  data,
  compact = false,
}: {
  data: SwimProgress;
  compact?: boolean;
}) {
  const heading = useId();
  const nextBadge = milestones.find(({ swims }) => swims > data.total_swims);
  const earnedBadges = milestones.filter(({ swims }) => swims <= data.total_swims);
  const swimsToBadge = nextBadge ? nextBadge.swims - data.total_swims : 0;
  const metrics = [
    { value: number.format(data.total_swims), label: "Confirmed swims" },
    { value: number.format(data.bubbles_earned), label: "Swim Bubbles earned" },
    { value: `₦${number.format(data.reward_value_naira)}`, label: "Reward value" },
  ];

  return (
    <section
      aria-labelledby={heading}
      className={
        compact
          ? "rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-slate-900"
          : "scroll-mt-20 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white"
      }
    >
      <div className={compact ? "space-y-2" : "space-y-5 p-5 sm:p-6"}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id={heading} className="flex items-center gap-2 text-lg font-semibold">
            <Bubbles aria-hidden="true" size={20} className={compact ? "text-cyan-700" : "text-cyan-300"} />
            {compact ? "This week’s swim rewards" : "Your swim rewards"}
          </h2>
          {compact ? (
            <Link href="/account/bookings#swim-rewards"
              className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-800 underline-offset-4 hover:underline"
            >
              My Swims <ArrowRight aria-hidden="true" size={15} />
            </Link>
          ) : data.streak_weeks > 0 && (
            <span className="rounded-full bg-emerald-950 px-3 py-1 text-xs font-semibold text-emerald-300">
              {data.streak_weeks}-week streak
            </span>
          )}
        </div>

        {!compact && (
          <dl className="grid grid-cols-3 gap-2 text-center">
            {metrics.map(({ value, label }) => (
              <div key={label} className="flex min-w-0 flex-col-reverse gap-1">
                <dt className="text-xs leading-4 text-slate-300 sm:text-sm">{label}</dt>
                <dd className="break-words text-xl font-semibold tabular-nums sm:text-3xl">{value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between gap-2 text-sm">
            <span>Reward days this week</span>
            <span className="tabular-nums">{data.week_days} of {data.weekly_limit} days</span>
          </div>
          <progress
            aria-label="Reward days this week"
            value={data.week_days}
            max={data.weekly_limit}
            className="block h-2 w-full overflow-hidden rounded-full bg-slate-200 accent-cyan-500 [&::-moz-progress-bar]:bg-cyan-500 [&::-webkit-progress-bar]:bg-slate-500/30 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-cyan-500"
          />
        </div>
        <p className="flex items-start gap-2 text-sm">
          <Gift size={17} aria-hidden="true" className="mt-0.5 shrink-0" />
          {nextReward(data)}
        </p>
      </div>

      {!compact && (
        <div className="divide-y divide-slate-800 border-t border-slate-800 px-5 sm:px-6">
          <div className="flex gap-3 py-4">
            <Waves aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-cyan-300" />
            <div>
              <h3 className="font-medium">Swim activity</h3>
              <p className="text-sm text-slate-300">
                {data.active_weeks} active {data.active_weeks === 1 ? "week" : "weeks"} since swim rewards began.
              </p>
            </div>
          </div>
          <div className="flex gap-3 py-4">
            <Trophy aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-amber-300" />
            <div>
              <h3 className="font-medium">Achievements</h3>
              {earnedBadges.length > 0 && (
                <ul aria-label="Earned swim badges" className="my-2 flex flex-wrap gap-2">
                  {earnedBadges.map(({ label }) => (
                    <li key={label} className="rounded-full bg-amber-950 px-2.5 py-1 text-xs font-medium text-amber-200">
                      {label}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-sm text-slate-300">
                {nextBadge
                  ? `${swimsToBadge} more ${swimsToBadge === 1 ? "swim" : "swims"} to earn the “${nextBadge.label}” badge.`
                  : "All four swim badges earned."}
              </p>
            </div>
          </div>
          <div className="flex gap-3 py-4">
            <Bubbles aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-cyan-300" />
            <div>
              <h3 className="font-medium">Bubbles rewards</h3>
              <p className="text-sm text-slate-300">
                Earn 1 Bubble per confirmed swim day, up to {data.weekly_limit} days each Monday–Sunday in Lagos.
                Each Bubble is worth ₦100 in your wallet.
              </p>
              <Link href="/account/wallet/rewards/history"
                className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-cyan-300 hover:underline"
              >
                View reward history <ArrowRight aria-hidden="true" size={15} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export function SwimRewards({ compact = false }: { compact?: boolean }) {
  return (
    <div id={compact ? undefined : "swim-rewards"} className="scroll-mt-20">
      <SwimRewardSummary compact={compact} />
    </div>
  );
}

function SwimRewardSummary({ compact }: { compact: boolean }) {
  const [data, setData] = useState<SwimProgress | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let request = 0;
    async function load() {
      const currentRequest = ++request;
      try {
        const result = await apiGet<SwimProgress>("/api/v1/wallet/rewards/swims", { auth: true });
        if (active && request === currentRequest) {
          setData(result);
          setFailed(false);
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
  }, [attempt]);

  if (failed) {
    return (
      <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600">
        Swim rewards couldn’t load.{" "}
        <button type="button" className="font-semibold text-cyan-700 underline"
          onClick={() => { setFailed(false); setAttempt((value) => value + 1); }}
        >
          Try again
        </button>
      </div>
    );
  }
  if (!data) {
    return (
      <div role="status" className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600">
        Loading swim rewards…
      </div>
    );
  }
  return <SwimRewardCard data={data} compact={compact} />;
}
