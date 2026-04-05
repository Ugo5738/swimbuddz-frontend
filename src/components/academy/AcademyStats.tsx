"use client";

import { AcademyApi, type PublicAcademyStats } from "@/lib/academy";
import { useEffect, useState } from "react";

type Stat = {
  key: string;
  label: string;
  icon: string;
  tone: string;
};

export function AcademyStats() {
  const [stats, setStats] = useState<PublicAcademyStats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    AcademyApi.getPublicStats()
      .then(setStats)
      .catch(() => setFailed(true));
  }, []);

  if (!stats && !failed) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-shrink-0 h-9 w-36 rounded-full bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  const chips: Stat[] = [];

  if (stats && stats.cohorts_enrolling > 0) {
    chips.push({
      key: "enrolling",
      label: `${stats.cohorts_enrolling} cohort${
        stats.cohorts_enrolling !== 1 ? "s" : ""
      } enrolling`,
      icon: "🎓",
      tone: "bg-cyan-50 border-cyan-200 text-cyan-700",
    });
  }

  if (stats && stats.total_seats_open > 0) {
    chips.push({
      key: "seats",
      label: `${stats.total_seats_open} seats available`,
      icon: "💺",
      tone: "bg-amber-50 border-amber-200 text-amber-700",
    });
  }

  if (stats && stats.graduates_all_time > 0) {
    chips.push({
      key: "graduates",
      label: `${stats.graduates_all_time} graduate${stats.graduates_all_time !== 1 ? "s" : ""}`,
      icon: "🏅",
      tone: "bg-emerald-50 border-emerald-200 text-emerald-700",
    });
  }

  if (stats && stats.completion_rate != null) {
    chips.push({
      key: "completion",
      label: `${Math.round(stats.completion_rate * 100)}% completion rate`,
      icon: "✅",
      tone: "bg-indigo-50 border-indigo-200 text-indigo-700",
    });
  }

  // Always-true trust anchors
  chips.push({
    key: "coaches",
    label: "Certified coaches",
    icon: "🏊",
    tone: "bg-purple-50 border-purple-200 text-purple-700",
  });
  chips.push({
    key: "locations",
    label: "Starting in Lagos, scaling globally",
    icon: "🌍",
    tone: "bg-slate-50 border-slate-200 text-slate-700",
  });

  if (chips.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
      {chips.map((stat) => (
        <div
          key={stat.key}
          className={`flex-shrink-0 inline-flex items-center gap-2 rounded-full border px-4 py-2 ${stat.tone}`}
        >
          <span className="text-lg">{stat.icon}</span>
          <span className="text-sm font-semibold">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}
