"use client";

import { supabase } from "@/lib/auth";
import { apiGet } from "@/lib/api";
import {
  AlertTriangle,
  Award,
  BarChart3,
  Bell,
  Calendar,
  CalendarDays,
  Car,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  FileText,
  GraduationCap,
  HandHeart,
  Image,
  LayoutDashboard,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  ShoppingBag,
  Trophy,
  UserCheck,
  Users,
  Wallet,
  Waves,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type AdminLayoutProps = {
  children: ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    title: "Overview",
    items: [{ href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Core Management",
    items: [
      { href: "/admin/members", label: "Members", icon: Users },
      { href: "/admin/coaches", label: "Coaches", icon: UserCheck },
      { href: "/admin/sessions", label: "Sessions", icon: Calendar },
      { href: "/admin/discounts", label: "Discounts", icon: Trophy },
      { href: "/admin/transport", label: "Transport", icon: Car },
      { href: "/admin/attendance", label: "Attendance", icon: ClipboardCheck },
    ],
  },
  {
    title: "Wallet & Rewards",
    items: [
      { href: "/admin/wallet", label: "Wallets", icon: Wallet },
      { href: "/admin/wallet/rewards", label: "Reward Rules", icon: Award },
      { href: "/admin/wallet/referrals", label: "Referrals", icon: Users },
      {
        href: "/admin/wallet/rewards/alerts",
        label: "Alerts",
        icon: AlertTriangle,
      },
      {
        href: "/admin/wallet/rewards/analytics",
        label: "Analytics",
        icon: BarChart3,
      },
    ],
  },
  {
    title: "Academy",
    items: [
      {
        href: "/admin/academy",
        label: "Programs & Cohorts",
        icon: GraduationCap,
      },
    ],
  },
  {
    title: "Community",
    items: [
      { href: "/admin/community/events", label: "Events", icon: CalendarDays },
      {
        href: "/admin/community/volunteers",
        label: "Volunteers",
        icon: HandHeart,
      },
      {
        href: "/admin/community/content",
        label: "Tips & Content",
        icon: FileText,
      },
      {
        href: "/admin/community/challenges",
        label: "Challenges",
        icon: Trophy,
      },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/admin/store", label: "Store", icon: ShoppingBag },
      { href: "/admin/pools", label: "Pool Registry", icon: Waves },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
      { href: "/admin/homepage-media", label: "Homepage Media", icon: Image },
      { href: "/admin/gallery", label: "Gallery", icon: Image },
    ],
  },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [newOrderCount, setNewOrderCount] = useState(0);
  const prevCountRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchNewOrderCount = useCallback(async () => {
    try {
      const data = await apiGet<{ new_count: number }>(
        "/api/v1/admin/store/orders/new-count",
        { auth: true },
      );
      const count = data.new_count;

      // Play sound + browser notification if count increased (skip initial load)
      if (prevCountRef.current >= 0 && count > prevCountRef.current) {
        try {
          if (!audioRef.current) {
            audioRef.current = new Audio("/notification.wav");
            audioRef.current.volume = 0.5;
          }
          audioRef.current.play().catch(() => {});
        } catch {}

        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("New Store Order", {
            body: `You have ${count} order${count > 1 ? "s" : ""} awaiting processing`,
            icon: "/logo.png",
          });
        }
      }

      prevCountRef.current = count;
      setNewOrderCount(count);
    } catch {
      // Silently fail — admin endpoint may not be reachable
    }
  }, []);

  useEffect(() => {
    async function getUserEmail() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    }
    getUserEmail();

    // Request notification permission
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Poll for new orders every 30 seconds
  useEffect(() => {
    // -1 means "initial load" — fetchNewOrderCount skips sound when prevCountRef < 0
    prevCountRef.current = -1;
    fetchNewOrderCount();

    const interval = setInterval(fetchNewOrderCount, 30_000);
    return () => clearInterval(interval);
  }, [fetchNewOrderCount]);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Build a set of all nav hrefs so we can find the most specific match
  const allHrefs = navSections.flatMap((s) => s.items.map((i) => i.href));

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (pathname === href) return true;
    // Only highlight if this href is a prefix of the current path AND
    // no other, more specific nav href also matches
    if (!pathname.startsWith(href + "/")) return false;
    const hasMoreSpecificMatch = allHrefs.some(
      (other) =>
        other !== href &&
        other.startsWith(href + "/") &&
        (pathname === other || pathname.startsWith(other + "/"))
    );
    return !hasMoreSpecificMatch;
  };

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(title)) {
        newSet.delete(title);
      } else {
        newSet.add(title);
      }
      return newSet;
    });
  };

  // Check if any item in a section is active
  const isSectionActive = (section: NavSection) => {
    return section.items.some((item) => isActive(item.href));
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] transform bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-transform duration-300 ease-in-out lg:translate-x-0 lg:w-72 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Admin navigation"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-700 p-4 lg:p-6">
            <Link href="/admin/dashboard" className="flex items-center gap-2 lg:gap-3">
              <img src="/logo.png" alt="SwimBuddz Logo" className="h-8 lg:h-10 w-auto" />
              <div className="flex flex-col">
                <span className="text-lg lg:text-xl font-bold text-cyan-400">SwimBuddz</span>
                <span className="text-[10px] lg:text-xs font-medium text-slate-400">
                  Admin Panel
                </span>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 -mr-2 text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-700/50"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-1 lg:space-y-2">
            {navSections.map((section) => {
              const isCollapsed = collapsedSections.has(section.title);
              const hasActiveItem = isSectionActive(section);

              return (
                <div key={section.title} className="space-y-1">
                  {/* Collapsible section header for mobile */}
                  <button
                    onClick={() => toggleSection(section.title)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors lg:pointer-events-none ${
                      hasActiveItem
                        ? "text-cyan-400 bg-slate-700/30"
                        : "text-slate-500 hover:text-slate-400 hover:bg-slate-700/20"
                    }`}
                    aria-expanded={!isCollapsed}
                  >
                    <span>{section.title}</span>
                    <span className="lg:hidden">
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </span>
                  </button>

                  {/* Navigation items */}
                  <ul
                    className={`space-y-0.5 overflow-hidden transition-all duration-200 ${
                      isCollapsed ? "max-h-0 lg:max-h-none" : "max-h-[500px]"
                    }`}
                  >
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                              active
                                ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/30"
                                : "text-slate-300 hover:bg-slate-700/50 hover:text-white active:bg-slate-700"
                            }`}
                          >
                            <Icon className="h-5 w-5 shrink-0" />
                            <span className="truncate flex-1">{item.label}</span>
                            {item.href === "/admin/store" && newOrderCount > 0 && (
                              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                                {newOrderCount > 99 ? "99+" : newOrderCount}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="border-t border-slate-700 p-3 lg:p-4 space-y-2">
            {userEmail && (
              <div className="flex items-center gap-2 lg:gap-3 px-3 py-2 rounded-lg bg-slate-700/30">
                <Mail className="h-4 lg:h-5 w-4 lg:w-5 text-slate-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] lg:text-xs font-medium text-slate-400">Logged in as</p>
                  <p className="text-xs lg:text-sm font-medium text-white truncate">{userEmail}</p>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 lg:gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-slate-700/50 hover:text-white active:bg-slate-700"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 overflow-x-hidden lg:ml-72">
        {/* Mobile Header - Improved sticky behavior and touch targets */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm lg:hidden">
          <div className="flex items-center justify-between px-3 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-slate-600 hover:text-cyan-700 hover:bg-slate-100 rounded-lg transition"
              aria-label="Open navigation menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link href="/admin/dashboard" className="flex items-center gap-2">
              <img src="/logo.png" alt="SwimBuddz Logo" className="h-7 w-auto" />
              <span className="text-base font-semibold text-cyan-700">Admin</span>
            </Link>
            <Link
              href="/admin/store/orders"
              className="relative p-2 -mr-2 text-slate-600 hover:text-cyan-700 transition"
            >
              <Bell className="h-6 w-6" />
              {newOrderCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                  {newOrderCount > 9 ? "9+" : newOrderCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* Desktop Top Bar */}
        <header className="hidden lg:flex sticky top-0 z-30 items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-sm px-6 lg:px-8 py-4">
          <div>
            <p className="text-sm text-slate-500">Admin Panel</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/admin/store/orders"
              className="relative p-2 rounded-full text-slate-500 hover:text-cyan-700 hover:bg-slate-100 transition"
            >
              <Bell className="h-5 w-5" />
              {newOrderCount > 0 && (
                <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                  {newOrderCount > 9 ? "9+" : newOrderCount}
                </span>
              )}
            </Link>
            <div className="h-8 w-8 rounded-full bg-cyan-100 flex items-center justify-center">
              <span className="text-xs font-semibold text-cyan-700">
                {userEmail ? userEmail[0].toUpperCase() : "A"}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content - Improved mobile padding */}
        <main className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
