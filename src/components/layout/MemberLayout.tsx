"use client";

import { apiGet } from "@/lib/api";
import { supabase } from "@/lib/auth";
import {
    Bell,
    BookOpen,
    Calendar,
    CalendarDays,
    CheckCircle,
    ChevronRight,
    ClipboardCheck,
    CreditCard,
    GraduationCap,
    Home,
    LayoutDashboard,
    LogOut,
    Menu,
    User,
    Users,
    X
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

type MemberLayoutProps = {
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
    showFor?: ("community" | "club" | "academy")[];
};

type MemberInfo = {
    first_name?: string;
    last_name?: string;
    profile_photo_url?: string;
    membership_tiers?: string[];
    membership_tier?: string;
    email?: string;
};

const navSections: NavSection[] = [
    {
        title: "Overview",
        items: [
            { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }
        ]
    },
    {
        title: "My Account",
        items: [
            { href: "/profile", label: "My Profile", icon: User },
            { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
            { href: "/dashboard/onboarding", label: "Complete Setup", icon: CheckCircle }
        ]
    },
    {
        title: "Community",
        items: [
            { href: "/community/directory", label: "Members", icon: Users },
            { href: "/community/events", label: "Events", icon: CalendarDays },
            { href: "/community/tips", label: "Tips & Articles", icon: BookOpen }
        ]
    },
    {
        title: "Sessions",
        showFor: ["club", "academy"],
        items: [
            { href: "/sessions-and-events", label: "Browse Sessions", icon: Calendar },
            { href: "/attendance", label: "My Attendance", icon: ClipboardCheck }
        ]
    },
    {
        title: "Academy",
        showFor: ["academy"],
        items: [
            { href: "/dashboard/academy", label: "My Progress", icon: GraduationCap }
        ]
    }
];

export function MemberLayout({ children }: MemberLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [member, setMember] = useState<MemberInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadMember() {
            try {
                const data = await apiGet<MemberInfo>("/api/v1/members/me", { auth: true });
                setMember(data);
            } catch (err) {
                console.error("Failed to load member info", err);
            } finally {
                setLoading(false);
            }
        }
        loadMember();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const isActive = (href: string) => {
        if (href === "/dashboard") {
            return pathname === href;
        }
        return pathname?.startsWith(href);
    };

    const memberTiers = member?.membership_tiers?.map(t => t.toLowerCase()) ||
        (member?.membership_tier ? [member.membership_tier.toLowerCase()] : ["community"]);

    const visibleSections = navSections.filter(section => {
        if (!section.showFor) return true;
        return section.showFor.some(tier => memberTiers.includes(tier));
    });

    const memberName = member?.first_name
        ? `${member.first_name}${member.last_name ? ` ${member.last_name}` : ""}`
        : "Member";

    const initials = member?.first_name
        ? `${member.first_name.charAt(0)}${member.last_name?.charAt(0) || ""}`
        : "M";

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
                className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-gradient-to-b from-cyan-700 via-cyan-600 to-blue-600 text-white transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <div className="flex h-full flex-col">
                    {/* Header with Logo */}
                    <div className="flex items-center justify-between border-b border-white/10 p-6">
                        <Link href="/dashboard" className="flex items-center gap-3">
                            <img src="/logo.png" alt="SwimBuddz Logo" className="h-10 w-auto" />
                            <div className="flex flex-col">
                                <span className="text-xl font-bold text-white">SwimBuddz</span>
                                <span className="text-xs font-medium text-cyan-100">Member Portal</span>
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
                            {member?.profile_photo_url ? (
                                <img
                                    src={member.profile_photo_url}
                                    alt={memberName}
                                    className="h-12 w-12 rounded-full object-cover ring-2 ring-white/30"
                                />
                            ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-lg font-bold text-white">
                                    {initials}
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-white truncate">{memberName}</p>
                                <p className="text-xs text-cyan-100 capitalize">
                                    {memberTiers.includes("academy") ? "Academy" :
                                        memberTiers.includes("club") ? "Club" : "Community"} Member
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto px-4 pb-4 space-y-6">
                        {visibleSections.map((section) => (
                            <div key={section.title}>
                                <h3 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-cyan-200/70">
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
                                                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${active
                                                        ? "bg-white text-cyan-700 shadow-lg"
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
                            href="/"
                            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white"
                        >
                            <Home className="h-5 w-5 shrink-0" />
                            <span>Back to Website</span>
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
                            className="text-slate-600 hover:text-cyan-700 transition"
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                        <div className="flex items-center gap-2">
                            <img src="/logo.png" alt="SwimBuddz Logo" className="h-8 w-auto" />
                            <span className="text-lg font-semibold text-cyan-700">SwimBuddz</span>
                        </div>
                        <Link href="/announcements" className="text-slate-600 hover:text-cyan-700 transition">
                            <Bell className="h-6 w-6" />
                        </Link>
                    </div>
                </header>

                {/* Desktop Top Bar (optional - for notifications/search) */}
                <header className="hidden lg:flex sticky top-0 z-30 items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-sm px-8 py-4">
                    <div>
                        <p className="text-sm text-slate-500">Welcome back,</p>
                        <h1 className="text-lg font-semibold text-slate-900">{memberName}</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link
                            href="/announcements"
                            className="relative p-2 rounded-full text-slate-500 hover:text-cyan-700 hover:bg-slate-100 transition"
                        >
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500" />
                        </Link>
                        <Link href="/profile" className="flex items-center gap-2">
                            {member?.profile_photo_url ? (
                                <img
                                    src={member.profile_photo_url}
                                    alt={memberName}
                                    className="h-9 w-9 rounded-full object-cover ring-2 ring-cyan-100"
                                />
                            ) : (
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-100 text-sm font-bold text-cyan-700">
                                    {initials}
                                </div>
                            )}
                        </Link>
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
