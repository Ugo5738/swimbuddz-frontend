"use client";

import { Calendar, GraduationCap, ShoppingBag, Trophy, Wallet } from "lucide-react";
import Link from "next/link";

type QuickActionsProps = {
  /** Current year + quarter for leaderboard link */
  leaderboardSlug: string;
  /** Show academy action (only for academy tier) */
  showAcademy?: boolean;
};

type Action = {
  key: string;
  label: string;
  icon: typeof Calendar;
  href: string;
  color: string;
  show?: boolean;
};

export function QuickActions({ leaderboardSlug, showAcademy }: QuickActionsProps) {
  const actions: Action[] = [
    {
      key: "book",
      label: "Book",
      icon: Calendar,
      href: "/sessions",
      color: "bg-cyan-100 text-cyan-600",
    },
    {
      key: "wallet",
      label: "Wallet",
      icon: Wallet,
      href: "/account/wallet",
      color: "bg-purple-100 text-purple-600",
    },
    {
      key: "store",
      label: "Store",
      icon: ShoppingBag,
      href: "/store",
      color: "bg-amber-100 text-amber-600",
    },
    {
      key: "leaderboard",
      label: "Rankings",
      icon: Trophy,
      href: `/account/reports/${leaderboardSlug}/leaderboard`,
      color: "bg-orange-100 text-orange-600",
    },
    {
      key: "academy",
      label: "Academy",
      icon: GraduationCap,
      href: "/account/academy",
      color: "bg-indigo-100 text-indigo-600",
      show: showAcademy,
    },
  ];

  const visible = actions.filter((a) => a.show !== false);

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory md:justify-start">
      {visible.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.key}
            href={action.href}
            className="flex flex-col items-center gap-1.5 snap-start flex-shrink-0"
          >
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl ${action.color} hover:scale-105 transition-transform`}
            >
              <Icon className="h-6 w-6" />
            </div>
            <span className="text-[11px] font-medium text-slate-600">{action.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
