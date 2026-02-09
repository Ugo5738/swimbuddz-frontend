"use client";

import { apiGet } from "@/lib/api";
import { supabase } from "@/lib/auth";
import {
    Bell,
    BookOpen,
    Briefcase,
    Calendar,
    CalendarDays,
    CheckCircle,
    ChevronRight,
    ClipboardCheck,
    CreditCard,
    GraduationCap,
    HandHeart,
    Home,
    LayoutDashboard,
    LogOut,
    Menu,
    ShoppingBag,
    User,
    Users,
    X
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useState } from "react";

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
    profile_photo_media_id?: string;
    email?: string;

    // Nested sub-records
    profile?: {
        gender?: string | null;
        date_of_birth?: string | null;
        city?: string | null;
        country?: string | null;
        time_zone?: string | null;
        swim_level?: string | null;
    };
    emergency_contact?: {
        name?: string | null;
        contact_relationship?: string | null;
        phone?: string | null;
    };
    availability?: {
        available_days?: string[] | null;
        preferred_times?: string[] | null;
        preferred_locations?: string[] | null;
    };
    membership?: {
        primary_tier?: string | null;
        active_tiers?: string[] | null;
        requested_tiers?: string[] | null;
        community_paid_until?: string | null;
        club_paid_until?: string | null;
        academy_paid_until?: string | null;
        academy_skill_assessment?: Record<string, boolean> | null;
        academy_goals?: string | null;
        academy_preferred_coach_gender?: string | null;
        academy_lesson_preference?: string | null;
    };
};

type AcademyEnrollment = {
    id: string;
    status: string;
    payment_status: string;
    cohort?: {
        name: string;
    };
};

const navSections: NavSection[] = [
    {
        title: "Overview",
        items: [
            { href: "/account", label: "Dashboard", icon: LayoutDashboard }
        ]
    },
    {
        title: "My Account",
        items: [
            { href: "/account/profile", label: "My Profile", icon: User },
            { href: "/account/billing", label: "Billing", icon: CreditCard },
            { href: "/account/onboarding", label: "Complete Setup", icon: CheckCircle }
        ]
    },
    {
        title: "Community",
        items: [
            { href: "/community/directory", label: "Members", icon: Users },
            { href: "/community/events", label: "Events", icon: CalendarDays },
            { href: "/community/volunteers", label: "Volunteer Hub", icon: HandHeart },
            { href: "/community/tips", label: "Tips & Articles", icon: BookOpen },
            { href: "/store", label: "Shop", icon: ShoppingBag }
        ]
    },
    {
        title: "Sessions",
        items: [
            { href: "/account/sessions", label: "Browse Sessions", icon: Calendar },
            { href: "/account/attendance/history", label: "My Attendance", icon: ClipboardCheck }
        ]
    },
    {
        title: "Academy",
        // Allow all members to view programs and enroll (even before academy is active)
        showFor: ["community", "club", "academy"],
        items: [
            { href: "/account/academy/browse", label: "Academy Programs", icon: BookOpen },
            { href: "/account/academy", label: "My Progress", icon: GraduationCap }
        ]
    }
];

export function MemberLayout({ children }: MemberLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [member, setMember] = useState<MemberInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [academyEnrollments, setAcademyEnrollments] = useState<AcademyEnrollment[]>([]);
    const [isCoach, setIsCoach] = useState(false);

    const refreshMember = useCallback(async () => {
        try {
            const data = await apiGet<MemberInfo>("/api/v1/members/me", { auth: true });
            setMember(data);
        } catch (err) {
            console.error("Failed to load member info", err);
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            refreshMember(),
            apiGet<AcademyEnrollment[]>("/api/v1/academy/my-enrollments", { auth: true })
                .then(setAcademyEnrollments)
                .catch(() => setAcademyEnrollments([])),
            // Check if user has coach role
            supabase.auth.getUser().then(({ data }) => {
                const roles = data.user?.app_metadata?.roles || [];
                setIsCoach(Array.isArray(roles) && roles.includes("coach"));
            }).catch(() => setIsCoach(false))
        ]).finally(() => setLoading(false));
    }, [refreshMember]);

    useEffect(() => {
        const reference = searchParams.get("reference") || searchParams.get("trxref");
        if (!reference) return;

        // Poll for member updates after payment callback (reference indicates Paystack return)
        let cancelled = false;
        let attempts = 0;
        const maxAttempts = 8;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        const tick = async () => {
            if (cancelled) return;
            attempts += 1;
            await refreshMember();
            if (attempts >= maxAttempts) return;
            timeoutId = setTimeout(tick, 2000);
        };

        // Start polling after a brief delay
        timeoutId = setTimeout(tick, 1000);
        return () => {
            cancelled = true;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [refreshMember, searchParams]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const isActive = (href: string) => {
        if (href === "/account") {
            return pathname === href;
        }

        // Avoid overlapping matches between academy browse vs. progress
        if (href === "/account/academy") {
            return (
                pathname === href ||
                (pathname?.startsWith("/account/academy/") &&
                    !pathname?.startsWith("/account/academy/browse"))
            );
        }
        if (href === "/account/academy/browse") {
            return pathname === href || pathname?.startsWith("/account/academy/browse");
        }

        return pathname?.startsWith(href);
    };

    const rawTiers = member?.membership?.active_tiers?.map(t => t.toLowerCase()) ||
        (member?.membership?.primary_tier ? [member.membership.primary_tier.toLowerCase()] : ["community"]);

    const now = Date.now();
    const clubActive = Boolean(member?.membership?.club_paid_until && Date.parse(String(member.membership.club_paid_until)) > now);
    const academyActive = Boolean(member?.membership?.academy_paid_until && Date.parse(String(member.membership.academy_paid_until)) > now);
    const communityActive = Boolean(member?.membership?.community_paid_until && Date.parse(String(member.membership.community_paid_until)) > now);

    const tierSet = new Set(rawTiers);
    if (clubActive) {
        tierSet.add("club");
        tierSet.add("community");
    }
    if (academyActive) {
        tierSet.add("academy");
        tierSet.add("club");
        tierSet.add("community");
    }
    if (communityActive) {
        tierSet.add("community");
    }

    // Also add academy tier if user has paid academy enrollment
    // (This handles cases where academy_paid_until isn't set but enrollment exists)
    const hasPaidEnrollment = academyEnrollments.some(
        e => e.payment_status === "paid" || e.status === "enrolled"
    );
    if (hasPaidEnrollment) {
        tierSet.add("academy");
        tierSet.add("club");
        tierSet.add("community");
    }

    const memberTiers = Array.from(tierSet);

    const requestedTiers = (member?.membership?.requested_tiers || []).map((t) => String(t).toLowerCase());
    const filteredRequests = requestedTiers.filter(
        (tier) => !(memberTiers.includes(tier) || (tier === "club" && clubActive) || (tier === "academy" && academyActive))
    );
    const wantsAcademy = filteredRequests.includes("academy");
    const wantsClub = filteredRequests.includes("club") || wantsAcademy;
    const clubEntitled = clubActive || memberTiers.includes("club");
    const academyEntitled = academyActive || memberTiers.includes("academy");

    // Check if user has a paid academy enrollment (more reliable than academy_paid_until)
    const hasPaidAcademyEnrollment = academyEnrollments.some(
        e => e.payment_status === "paid" || e.status === "enrolled"
    );

    // Determine membership label - prioritize active status over pending
    const membershipLabel = hasPaidAcademyEnrollment || academyActive || academyEntitled
        ? "Academy Member"
        : clubActive || clubEntitled
            ? "Club Member"
            : wantsAcademy
                ? "Academy (Pending)"
                : wantsClub
                    ? "Club (Pending)"
                    : "Community Member";

    // Check profile_photo_media_id (source of truth) for validation, URL is just for display
    const needsProfileBasics = !member?.profile_photo_media_id || !member?.profile?.gender || !member?.profile?.date_of_birth;
    const needsProfileCore =
        needsProfileBasics ||
        !member?.profile?.country ||
        !member?.profile?.city ||
        !member?.profile?.time_zone ||
        !member?.profile?.swim_level;

    const needsClubReadiness =
        (wantsClub || memberTiers.includes("club") || memberTiers.includes("academy")) &&
        (!member?.emergency_contact?.name ||
            !member?.emergency_contact?.contact_relationship ||
            !member?.emergency_contact?.phone ||
            !(member?.availability?.preferred_locations && member.availability.preferred_locations.length > 0) ||
            !(member?.availability?.preferred_times && member.availability.preferred_times.length > 0));

    const assessment = member?.membership?.academy_skill_assessment;
    const hasAssessment =
        assessment &&
        ["canFloat", "headUnderwater", "deepWaterComfort", "canSwim25m"].some(
            (k) => Object.prototype.hasOwnProperty.call(assessment, k)
        );
    const needsAcademyReadiness =
        (wantsAcademy || memberTiers.includes("academy")) &&
        (!hasAssessment ||
            !member?.membership?.academy_goals ||
            !member?.membership?.academy_preferred_coach_gender ||
            !member?.membership?.academy_lesson_preference);

    const needsOnboarding = !member || needsProfileCore || needsClubReadiness || needsAcademyReadiness;

    const filteredSections = navSections.map((section) => {
        if (section.title !== "My Account") return section;
        const items = needsOnboarding
            ? section.items
            : section.items.filter((item) => item.href !== "/account/onboarding");
        return { ...section, items };
    }).filter((section) => section.items.length > 0);

    const visibleSections = filteredSections
        .map((section) => {
            if (section.title === "Academy") {
                const items = section.items.filter((item) => {
                    if (item.href === "/account/academy") {
                        return hasPaidAcademyEnrollment;
                    }
                    return true; // Keep browse visible for all eligible members
                });
                return { ...section, items };
            }
            return section;
        })
        .filter(section => {
            if (!section.showFor) return true;
            return section.showFor.some(tier => memberTiers.includes(tier));
        })
        .filter(section => section.items.length > 0);

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
                    className="fixed inset-0 z-40 bg-slate-900/50 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-72 md:w-64 lg:w-72 transform bg-gradient-to-b from-cyan-700 via-cyan-600 to-blue-600 text-white transition-transform duration-300 ease-in-out md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <div className="flex h-full flex-col">
                    {/* Header with Logo */}
                    <div className="flex items-center justify-between border-b border-white/10 p-6">
                        <Link href="/account" className="flex items-center gap-3">
                            <img src="/logo.png" alt="SwimBuddz Logo" className="h-10 w-auto" />
                            <div className="flex flex-col">
                                <span className="text-xl font-bold text-white">SwimBuddz</span>
                                <span className="text-xs font-medium text-cyan-100">Member Portal</span>
                            </div>
                        </Link>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="md:hidden text-white/70 hover:text-white transition min-w-[44px] min-h-[44px] flex items-center justify-center -m-2"
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
                                    {membershipLabel}
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
                        {isCoach && (
                            <Link
                                href="/coach/dashboard"
                                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white bg-emerald-600/30"
                            >
                                <Briefcase className="h-5 w-5 shrink-0" />
                                <span>Coach Portal</span>
                            </Link>
                        )}
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
            <div className="flex-1 md:ml-64 lg:ml-72">
                {/* Mobile Header */}
                <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm md:hidden">
                    <div className="flex items-center justify-between px-4 py-3">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="text-slate-600 hover:text-cyan-700 transition min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2"
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                        <div className="flex items-center gap-2">
                            <img src="/logo.png" alt="SwimBuddz Logo" className="h-8 w-auto" />
                            <span className="text-lg font-semibold text-cyan-700">SwimBuddz</span>
                        </div>
                        <Link href="/announcements" className="text-slate-600 hover:text-cyan-700 transition min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2">
                            <Bell className="h-6 w-6" />
                        </Link>
                    </div>
                </header>

                {/* Desktop Top Bar (optional - for notifications/search) */}
                <header className="hidden md:flex sticky top-0 z-30 items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-sm px-6 lg:px-8 py-4">
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
                        <Link href="/account/profile" className="flex items-center gap-2">
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
