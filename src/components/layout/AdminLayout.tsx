"use client";

import { supabase } from "@/lib/auth";
import {
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
  Trophy,
  UserCheck,
  Users,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

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
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard }
    ]
  },
  {
    title: "Core Management",
    items: [
      { href: "/admin/members", label: "Members", icon: Users },
      { href: "/admin/coaches", label: "Coaches", icon: UserCheck },
      { href: "/admin/sessions", label: "Sessions", icon: Calendar },
      { href: "/admin/discounts", label: "Discounts", icon: Trophy },
      { href: "/admin/transport", label: "Transport", icon: Car },
      { href: "/admin/attendance", label: "Attendance", icon: ClipboardCheck }
    ]
  },
  {
    title: "Academy",
    items: [
      { href: "/admin/academy", label: "Programs & Cohorts", icon: GraduationCap }
    ]
  },
  {
    title: "Community",
    items: [
      { href: "/admin/community/events", label: "Events", icon: CalendarDays },
      { href: "/admin/community/volunteers", label: "Volunteers", icon: HandHeart },
      { href: "/admin/community/content", label: "Tips & Content", icon: FileText },
      { href: "/admin/community/challenges", label: "Challenges", icon: Trophy }
    ]
  },
  {
    title: "Content",
    items: [
      { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
      { href: "/admin/homepage-media", label: "Homepage Media", icon: Image },
      { href: "/admin/gallery", label: "Gallery", icon: Image }
    ]
  }
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function getUserEmail() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    }
    getUserEmail();
  }, []);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isActive = (href: string) => {
    if (href === "/admin/dashboard") {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  const toggleSection = (title: string) => {
    setCollapsedSections(prev => {
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
    return section.items.some(item => isActive(item.href));
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
        className={`fixed inset-y-0 left-0 z-50 w-[280px] transform bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-transform duration-300 ease-in-out lg:translate-x-0 lg:w-72 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
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
                <span className="text-[10px] lg:text-xs font-medium text-slate-400">Admin Panel</span>
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
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors lg:pointer-events-none ${hasActiveItem
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
                    className={`space-y-0.5 overflow-hidden transition-all duration-200 ${isCollapsed ? "max-h-0 lg:max-h-none" : "max-h-[500px]"
                      }`}
                  >
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${active
                              ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/30"
                              : "text-slate-300 hover:bg-slate-700/50 hover:text-white active:bg-slate-700"
                              }`}
                          >
                            <Icon className="h-5 w-5 shrink-0" />
                            <span className="truncate">{item.label}</span>
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
      <div className="flex-1 lg:ml-72">
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
            {/* User avatar or placeholder for balance */}
            <div className="p-2 -mr-2">
              <div className="h-6 w-6 rounded-full bg-cyan-100 flex items-center justify-center">
                <span className="text-xs font-semibold text-cyan-700">
                  {userEmail ? userEmail[0].toUpperCase() : "A"}
                </span>
              </div>
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
