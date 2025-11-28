import { type ReactNode } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/auth";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Megaphone,
  ClipboardCheck,
  GraduationCap,
  CalendarDays,
  HandHeart,
  FileText,
  Trophy,
  Image,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Mail
} from "lucide-react";

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
      { href: "/admin/sessions", label: "Sessions", icon: Calendar },
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
      { href: "/admin/gallery", label: "Gallery", icon: Image }
    ]
  }
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    async function getUserEmail() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    }
    getUserEmail();
  }, []);

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
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-700 p-6">
            <Link href="/admin/dashboard" className="flex items-center gap-3">
              <img src="/logo.png" alt="SwimBuddz Logo" className="h-10 w-auto" />
              <div className="flex flex-col">
                <span className="text-xl font-bold text-cyan-400">SwimBuddz</span>
                <span className="text-xs font-medium text-slate-400">Admin Panel</span>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white transition"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            {navSections.map((section) => (
              <div key={section.title}>
                <h3 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
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
                          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${active
                              ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/50"
                              : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                            }`}
                        >
                          <Icon className="h-5 w-5 shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* User Info & Logout */}
          <div className="border-t border-slate-700 p-4 space-y-2">
            {userEmail && (
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-700/30">
                <Mail className="h-5 w-5 text-slate-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-400">Logged in as</p>
                  <p className="text-sm font-medium text-white truncate">{userEmail}</p>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-slate-700/50 hover:text-white"
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
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white lg:hidden">
          <div className="flex items-center justify-between px-4 py-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-slate-600 hover:text-cyan-700 transition"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="SwimBuddz Logo" className="h-8 w-auto" />
              <span className="text-lg font-semibold text-cyan-700">SwimBuddz Admin</span>
            </div>
            <div className="w-6" /> {/* Spacer for alignment */}
          </div>
        </header>

        {/* Page Content */}
        <main className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
