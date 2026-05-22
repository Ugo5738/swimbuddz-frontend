"use client";

import type { Tab } from "../types";

type TabSpec = { key: Tab; label: string; count?: number };

type Props = {
  tab: Tab;
  setTab: (tab: Tab) => void;
  opportunitiesCount: number;
  volunteersCount: number;
  rolesCount: number;
};

export function TabsNav({
  tab,
  setTab,
  opportunitiesCount,
  volunteersCount,
  rolesCount,
}: Props) {
  const tabs: TabSpec[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "opportunities", label: "Opportunities", count: opportunitiesCount },
    { key: "volunteers", label: "Volunteers", count: volunteersCount },
    { key: "roles", label: "Roles", count: rolesCount },
    { key: "templates", label: "Templates" },
  ];

  return (
    <div className="relative -mx-3 sm:mx-0">
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto px-3 sm:px-0 scrollbar-hide">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-cyan-600 text-cyan-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                  tab === t.key ? "bg-cyan-100 text-cyan-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
