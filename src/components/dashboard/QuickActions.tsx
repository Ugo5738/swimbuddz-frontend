import { Award, CalendarDays, GraduationCap, ShoppingBag, Wallet, Waves } from "lucide-react";
import Link from "next/link";

type QuickActionsProps = {
  /** Kept optional for callers passing the current quarter slug */
  leaderboardSlug?: string;
  /** Show academy action (for Academy members or applicants) */
  showAcademy?: boolean;
};

type Action = {
  key: string;
  label: string;
  subtitle: string;
  icon: typeof Waves;
  href: string;
  color: string;
  show?: boolean;
};

export function QuickActions({ showAcademy }: QuickActionsProps) {
  const actions: Action[] = [
    {
      key: "find-swim",
      label: "Find a Swim",
      subtitle: "Browse sessions",
      icon: Waves,
      href: "/account/find-a-swim",
      color: "bg-cyan-100 text-cyan-700",
    },
    {
      key: "my-swims",
      label: "My Swims",
      subtitle: "Schedule & history",
      icon: CalendarDays,
      href: "/account/bookings",
      color: "bg-sky-100 text-sky-700",
    },
    {
      key: "rewards",
      label: "Rewards",
      subtitle: "Badges & Bubbles",
      icon: Award,
      href: "/account/wallet/rewards",
      color: "bg-emerald-100 text-emerald-700",
    },
    {
      key: "store",
      label: "Swim Store",
      subtitle: "Gear & swimwear",
      icon: ShoppingBag,
      href: "/store",
      color: "bg-amber-100 text-amber-700",
    },
    showAcademy
      ? {
          key: "academy",
          label: "My Academy",
          subtitle: "Classes & progress",
          icon: GraduationCap,
          href: "/account/academy",
          color: "bg-indigo-100 text-indigo-700",
        }
      : {
          key: "wallet",
          label: "My Wallet",
          subtitle: "Top up & history",
          icon: Wallet,
          href: "/account/wallet",
          color: "bg-purple-100 text-purple-700",
        },
  ];

  return (
    <div
      aria-label="Quick actions"
      className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5"
    >
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.key}
            href={action.href}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-cyan-300 hover:shadow-sm"
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${action.color}`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-900">
                {action.label}
              </span>
              <span className="block truncate text-xs text-slate-500">{action.subtitle}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
