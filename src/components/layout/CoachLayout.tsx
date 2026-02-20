"use client";

import { supabase } from "@/lib/auth";
import { getCoachApplicationStatus, type AgreementStatus } from "@/lib/coach";
import { AgreementApi } from "@/lib/coaches";
import { MembersApi } from "@/lib/members";
import {
  Bell,
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronRight,
  CreditCard,
  FileSignature,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

type CoachLayoutProps = {
  children: ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const baseNavSections: NavSection[] = [
  {
    title: "Overview",
    items: [
      { href: "/coach/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/coach/onboarding", label: "Complete Setup", icon: CheckCircle },
    ],
  },
  {
    title: "Academy",
    items: [
      { href: "/coach/cohorts", label: "My Cohorts", icon: GraduationCap },
      { href: "/coach/students", label: "Students", icon: Users },
      { href: "/coach/schedule", label: "Schedule", icon: Calendar },
    ],
  },
  {
    title: "Resources",
    items: [
      { href: "/coach/resources", label: "Teaching Materials", icon: BookOpen },
      { href: "/coach/handbook", label: "Coach Handbook", icon: FileSignature },
    ],
  },
  {
    title: "Payments",
    items: [
      { href: "/coach/wallet", label: "Bubble Wallet", icon: Wallet },
      { href: "/coach/payouts", label: "Payout History", icon: CreditCard },
      { href: "/coach/bank-account", label: "Bank Account", icon: CreditCard },
    ],
  },
  {
    title: "Settings",
    items: [
      { href: "/coach/profile", label: "My Profile", icon: User },
      { href: "/coach/preferences", label: "Preferences", icon: Settings },
      {
        href: "/coach/agreement",
        label: "Coach Agreement",
        icon: FileSignature,
      },
    ],
  },
];

export function CoachLayout({ children }: CoachLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [coachName, setCoachName] = useState("Coach");
  const [loading, setLoading] = useState(true);
  const [coachStatus, setCoachStatus] = useState<string | null>(null);
  const [agreementStatus, setAgreementStatus] =
    useState<AgreementStatus | null>(null);

  // Pages exempt from gating redirects (to prevent infinite loops)
  const ONBOARDING_EXEMPT_PATHS = [
    "/coach/onboarding",
    "/coach/agreement",
    "/coach/handbook",
  ];
  const AGREEMENT_EXEMPT_PATHS = ["/coach/agreement", "/coach/handbook"];

  useEffect(() => {
    async function loadCoachData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        // Fetch member profile for real name
        try {
          const member = await MembersApi.getMe();
          if (member?.first_name) {
            setCoachName(
              `${member.first_name}${member.last_name ? ` ${member.last_name}` : ""}`,
            );
          } else if (user?.email) {
            setCoachName(user.email.split("@")[0]);
          }
        } catch {
          // Fallback to email prefix if member fetch fails
          if (user?.email) {
            setCoachName(user.email.split("@")[0]);
          }
        }

        // Check if user has coach access
        const status = await getCoachApplicationStatus();
        setCoachStatus(status.status);
        if (!status.can_access_dashboard) {
          // Redirect to apply page if not approved
          router.push("/coach/apply");
          return;
        }

        // HARD REDIRECT: "approved" coaches must complete onboarding first
        if (status.status === "approved") {
          const isExempt = ONBOARDING_EXEMPT_PATHS.some((p) =>
            pathname?.startsWith(p),
          );
          if (!isExempt) {
            router.push("/coach/onboarding");
            return;
          }
        }

        // Check agreement status for active coaches
        if (status.status === "active") {
          try {
            const agreement = await AgreementApi.getAgreementStatus();
            setAgreementStatus(agreement);

            // HARD REDIRECT: active coaches must sign current agreement
            if (!agreement.has_signed_current_version) {
              const isExempt = AGREEMENT_EXEMPT_PATHS.some((p) =>
                pathname?.startsWith(p),
              );
              if (!isExempt) {
                router.push("/coach/agreement");
                return;
              }
            }
          } catch {
            // Agreement check failed — allow access but log warning
            console.warn("Agreement status check failed");
          }
        }
      } catch (err) {
        console.error("Failed to load coach data", err);
      } finally {
        setLoading(false);
      }
    }

    loadCoachData();
  }, [router, pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isActive = (href: string) => {
    if (href === "/coach/dashboard") {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  // Coach needs onboarding if status is "approved" (not yet "active")
  const needsCoachOnboarding = coachStatus === "approved";

  // Filter nav sections to show/hide "Complete Setup" based on coach onboarding status
  const navSections = baseNavSections.map((section) => {
    if (section.title !== "Overview") return section;
    const items = needsCoachOnboarding
      ? section.items
      : section.items.filter((item) => item.href !== "/coach/onboarding");
    return { ...section, items };
  });

  const initials = coachName.slice(0, 2).toUpperCase();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
          <p className="text-lg font-medium text-slate-600">
            Loading coach dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-gradient-to-b from-emerald-700 via-emerald-600 to-teal-600 text-white transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header with Logo */}
          <div className="flex items-center justify-between border-b border-white/10 p-6">
            <Link href="/coach/dashboard" className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="SwimBuddz Logo"
                className="h-10 w-auto"
              />
              <div className="flex flex-col">
                <span className="text-xl font-bold text-white">SwimBuddz</span>
                <span className="text-xs font-medium text-emerald-100">
                  Coach Portal
                </span>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white/70 hover:text-white transition"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* User Profile Card */}
          <div className="p-4">
            <div className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-sm p-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-lg font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">
                  {coachName}
                </p>
                <p className="text-xs text-emerald-100">Coach</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 pb-4 space-y-6">
            {navSections.map((section) => (
              <div key={section.title}>
                <h3 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-emerald-200/70">
                  {section.title}
                </h3>
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                            active
                              ? "bg-white text-emerald-700 shadow-lg"
                              : "text-white/90 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <Icon className="h-5 w-5 shrink-0" />
                          <span className="flex-1">{item.label}</span>
                          {item.badge && (
                            <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-amber-900">
                              {item.badge}
                            </span>
                          )}
                          {active && <ChevronRight className="h-4 w-4" />}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* Footer Actions */}
          <div className="border-t border-white/10 p-4 space-y-2">
            <Link
              href="/account"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white"
            >
              <Home className="h-5 w-5 shrink-0" />
              <span>Member Dashboard</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-72">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm lg:hidden">
          <div className="flex items-center justify-between px-4 py-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-slate-600 hover:text-emerald-700 transition"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="SwimBuddz Logo"
                className="h-8 w-auto"
              />
              <span className="text-lg font-semibold text-emerald-700">
                SwimBuddz
              </span>
            </div>
            <Link
              href="/announcements"
              className="text-slate-600 hover:text-emerald-700 transition"
            >
              <Bell className="h-6 w-6" />
            </Link>
          </div>
        </header>

        {/* Desktop Top Bar */}
        <header className="hidden lg:flex sticky top-0 z-30 items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-sm px-8 py-4">
          <div>
            <p className="text-sm text-slate-500">Coach Dashboard</p>
            <h1 className="text-lg font-semibold text-slate-900">
              Welcome back, {coachName}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/announcements"
              className="relative p-2 rounded-full text-slate-500 hover:text-emerald-700 hover:bg-slate-100 transition"
            >
              <Bell className="h-5 w-5" />
            </Link>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
              {initials}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
