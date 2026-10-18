"use client";

import { hasAcademyReadiness as isAcademyReadinessComplete } from "@/lib/academy-readiness";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useApi } from "@/hooks/useApi";
import { supabase } from "@/lib/auth";
import { listPodsILead } from "@/lib/pods";
import {
  getMembershipDetail,
  getMembershipLabel,
  getPaidMembershipTiers,
  getRequestedTiers,
  hasTierContext,
  type MembershipTierStatus,
} from "@/lib/tiers";
import {
  Activity,
  BookOpen,
  Briefcase,
  Calendar,
  CalendarDays,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ClipboardCheck,
  CloudUpload,
  CreditCard,
  GraduationCap,
  HandHeart,
  Home,
  Waves,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShoppingBag,
  Trophy,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  icon?: React.ComponentType<{ className?: string }>;
};

const MEMBER_SIDEBAR_COLLAPSED_KEY = "swimbuddz-member-sidebar-collapsed";

type MemberInfo = {
  id?: string;
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
    paid_tier?: string | null;
    paid_tiers?: string[] | null;
    display_label?: string | null;
    display_detail?: string | null;
    tier_statuses?: Partial<Record<"community" | "club" | "academy", MembershipTierStatus>> | null;
    academy_skill_assessment?: Record<string, boolean> | null;
    academy_goals?: string | null;
    academy_preferred_coach_gender?: string | null;
    academy_lesson_preference?: string | null;
  };
};

const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
const leaderboardHref = `/account/reports/q${currentQuarter}-${new Date().getFullYear()}/leaderboard`;

/** Organize navigation by the task a member is trying to complete, not the backend feature. */
const navSections: NavSection[] = [
  {
    title: "",
    items: [
      { href: "/account", label: "Dashboard", icon: LayoutDashboard },
      { href: "/find-a-swim", label: "Find a Swim", icon: Waves },
      { href: "/account/onboarding", label: "Complete Setup", icon: CheckCircle },
    ],
  },
  {
    title: "My Swims",
    icon: CalendarDays,
    items: [
      { href: "/account/bookings", label: "Upcoming, Calendar & History", icon: CalendarDays },
    ],
  },
  {
    title: "My Academy",
    icon: GraduationCap,
    items: [
      { href: "/account/academy", label: "Learning Progress", icon: GraduationCap },
      { href: "/account/academy/manage", label: "My Enrollments", icon: BookOpen },
      { href: "/account/makeups", label: "Make-up Classes", icon: Calendar },
      { href: "/account/academy/browse", label: "Explore Programs", icon: BookOpen },
    ],
  },
  {
    title: "Community",
    icon: Users,
    items: [
      { href: "/community/events", label: "Events & Experiences", icon: CalendarDays },
      { href: leaderboardHref, label: "Leaderboard", icon: Trophy },
      { href: "/community/challenges", label: "Challenges", icon: Trophy },
      { href: "/community/directory", label: "Members", icon: Users },
      { href: "/account/chat", label: "Chat", icon: MessageCircle },
      { href: "/community/volunteers", label: "Volunteer Hub", icon: HandHeart },
      { href: "/community/tips", label: "Tips & Articles", icon: BookOpen },
    ],
  },
  {
    title: "Progress & Media",
    icon: Activity,
    items: [
      { href: "/account/media-vault", label: "My Swim Videos", icon: CloudUpload },
      { href: "/account/reports", label: "Swim Reports", icon: Activity },
      { href: "https://analyzer.swimbuddz.com", label: "Stroke Lab", icon: Activity },
    ],
  },
  {
    title: "Payments",
    icon: CreditCard,
    items: [
      { href: "/account/billing", label: "Payments & Credits", icon: CreditCard },
      { href: "/account/wallet", label: "My Wallet", icon: Wallet },
    ],
  },
  {
    title: "Shop",
    icon: ShoppingBag,
    items: [
      { href: "/store", label: "Swim Store", icon: ShoppingBag },
      { href: "/account/orders", label: "My Orders", icon: Package },
    ],
  },
  {
    title: "Pod Lead Tools",
    icon: ClipboardCheck,
    items: [
      { href: "/account/pod-lead/sessions", label: "Practice Scheduling", icon: Calendar },
      { href: "/account/pod-lead/review", label: "Submission Review", icon: ClipboardCheck },
    ],
  },
];

const MEMBER_NAV_EXPANDED_KEY = "swimbuddz-member-nav-expanded";

export function MemberLayout({ children }: MemberLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => {
    if (!sidebarOpen) return;
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setSidebarOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    closeOnDesktop();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [sidebarOpen]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "My Swims": true,
    Community: true,
  });
  const { data: member, refetch: refreshMember } = useApi<MemberInfo>("/api/v1/members/me");
  const [isCoach, setIsCoach] = useState(false);
  // True when this user is the lead or assistant lead of at least one pod.
  // Drives the conditional "Pod Lead Tools" sidebar section. Default false
  // means the section is hidden during the initial load — a brief flash of
  // a navigation entry that promptly disappears would feel worse than a
  // half-second delay before it appears.
  const [leadsAnyPod, setLeadsAnyPod] = useState(false);

  useEffect(() => {
    setSidebarCollapsed(localStorage.getItem(MEMBER_SIDEBAR_COLLAPSED_KEY) === "true");
    try {
      const saved = localStorage.getItem(MEMBER_NAV_EXPANDED_KEY);
      if (saved) setExpandedSections(JSON.parse(saved) as Record<string, boolean>);
    } catch {
      // Ignore outdated or invalid local preferences.
    }
  }, []);

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      localStorage.setItem(MEMBER_SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  };

  useEffect(() => {
    Promise.all([
      // Check if user has coach role
      supabase.auth
        .getUser()
        .then(({ data }) => {
          const roles = data.user?.app_metadata?.roles || [];
          setIsCoach(Array.isArray(roles) && roles.includes("coach"));
        })
        .catch(() => setIsCoach(false)),
      // Pod-lead status — drives the conditional "Pod Lead Tools" section.
      // Best-effort; failures collapse to "not a pod lead" so the sidebar
      // never crashes for unauthenticated callers.
      listPodsILead()
        .then((pods) => setLeadsAnyPod(pods.some((pod) => pod.status === "active")))
        .catch(() => setLeadsAnyPod(false)),
    ]);
  }, []);

  // Keep sidebar membership/status in sync after in-app navigation
  // (e.g., checkout -> billing without a Paystack reference query param).
  useEffect(() => {
    refreshMember();
  }, [pathname, refreshMember]);

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

  const toggleSection = (title: string) => {
    setExpandedSections((current) => {
      const next = { ...current, [title]: !current[title] };
      localStorage.setItem(MEMBER_NAV_EXPANDED_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Build a set of all nav hrefs so we can find the most specific match
  const allHrefs = navSections.flatMap((s) => s.items.map((i) => i.href));

  const isActive = (href: string) => {
    if (!pathname) return false;

    // Handle hrefs with query params (e.g. /sessions?view=my)
    const [hrefPath, hrefQuery] = href.split("?");
    if (hrefQuery) {
      if (pathname !== hrefPath) return false;
      const hrefParams = new URLSearchParams(hrefQuery);
      for (const [key, value] of hrefParams.entries()) {
        if (searchParams.get(key) !== value) return false;
      }
      return true;
    }

    // For plain path hrefs, also check that no query-param variant is a better match
    if (pathname === hrefPath) {
      // If the current URL has a ?view param and there's a nav item for that specific view, don't highlight the base path
      const hasQueryVariant = allHrefs.some((other) => {
        const [otherPath, otherQuery] = other.split("?");
        if (otherPath !== hrefPath || !otherQuery) return false;
        const otherParams = new URLSearchParams(otherQuery);
        for (const [key, value] of otherParams.entries()) {
          if (searchParams.get(key) !== value) return false;
        }
        return true;
      });
      if (hasQueryVariant) return false;
      return true;
    }

    // Only highlight if this href is a prefix of the current path AND
    // no other, more specific nav href also matches
    if (!pathname.startsWith(hrefPath + "/")) return false;
    const hasMoreSpecificMatch = allHrefs.some(
      (other) =>
        other !== href &&
        other.startsWith(hrefPath + "/") &&
        (pathname === other.split("?")[0] || pathname.startsWith(other.split("?")[0] + "/"))
    );
    return !hasMoreSpecificMatch;
  };

  const paidTiers = getPaidMembershipTiers(member);
  const clubActive = paidTiers.includes("club");
  const academyActive = paidTiers.includes("academy");
  const communityActive = paidTiers.includes("community");
  const memberTiers = paidTiers;

  const requestedTiers = getRequestedTiers(member);
  const filteredRequests = requestedTiers.filter(
    (tier) =>
      !(
        (tier === "community" && communityActive) ||
        (tier === "club" && clubActive) ||
        (tier === "academy" && academyActive)
      )
  );
  const wantsAcademy = filteredRequests.includes("academy");
  const wantsClub = filteredRequests.includes("club");
  const clubEntitled = hasTierContext(member, "club");
  const academyEntitled = hasTierContext(member, "academy");
  const membershipLabel = getMembershipLabel(member);
  const membershipDetail = getMembershipDetail(member);

  // Check profile_photo_media_id (source of truth) for validation, URL is just for display
  const needsProfileBasics =
    !member?.profile_photo_media_id || !member?.profile?.gender || !member?.profile?.date_of_birth;
  const needsProfileCore =
    needsProfileBasics ||
    !member?.profile?.country ||
    !member?.profile?.city ||
    !member?.profile?.time_zone ||
    !member?.profile?.swim_level;

  const needsClubReadiness =
    (wantsClub || clubEntitled) &&
    (!member?.emergency_contact?.name ||
      !member?.emergency_contact?.contact_relationship ||
      !member?.emergency_contact?.phone ||
      !(
        member?.availability?.preferred_locations &&
        member.availability.preferred_locations.length > 0
      ) ||
      !(member?.availability?.preferred_times && member.availability.preferred_times.length > 0));

  const needsAcademyReadiness =
    (wantsAcademy || academyEntitled) && !isAcademyReadinessComplete(member?.membership);

  const needsOnboarding =
    !member || needsProfileCore || needsClubReadiness || needsAcademyReadiness;

  const visibleSections = navSections
    .map((section) => {
      if (!section.title) {
        return {
          ...section,
          items: needsOnboarding
            ? section.items
            : section.items.filter((item) => item.href !== "/account/onboarding"),
        };
      }
      if (section.title === "My Swims") {
        return {
          ...section,
          items: section.items.filter(
            (item) => item.href !== "/account/club" || clubEntitled
          ),
        };
      }
      if (section.title === "My Academy") {
        return {
          ...section,
          items: section.items.filter((item) => {
            if (item.href === "/account/academy/browse") return true;
            if (item.href === "/account/makeups") return academyEntitled || academyActive || Boolean(member?.membership?.academy_paid_until);
            return academyEntitled || wantsAcademy;
          }),
        };
      }
      return section;
    })
    .filter((section) => section.title !== "Pod Lead Tools" || (leadsAnyPod && clubActive))
    .filter((section) => section.items.length > 0);

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
        id="member-navigation"
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-gradient-to-b from-cyan-700 via-cyan-600 to-blue-600 text-white transition-[width,transform] duration-300 ease-in-out md:translate-x-0 ${
          sidebarCollapsed ? "md:w-20" : "md:w-64 lg:w-72"
        } ${sidebarOpen ? "visible translate-x-0" : "invisible -translate-x-full md:visible"}`}
      >
        <div className="flex h-full flex-col">
          {/* Header with Logo */}
          <div
            className={`relative flex items-center justify-between border-b border-white/10 p-6 ${
              sidebarCollapsed ? "md:px-3" : ""
            }`}
          >
            <Link
              href="/account"
              className={`flex items-center gap-3 ${sidebarCollapsed ? "md:w-full md:justify-center" : ""}`}
              aria-label="SwimBuddz member dashboard"
            >
              <Image
                src="/logo.png"
                alt="SwimBuddz Logo"
                width={500}
                height={500}
                className="h-10 w-auto"
                priority
              />
              <div className={`flex flex-col ${sidebarCollapsed ? "md:hidden" : ""}`}>
                <span className="text-xl font-bold text-white">SwimBuddz</span>
                <span className="text-xs font-medium text-cyan-100">Member Portal</span>
              </div>
            </Link>
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              className="absolute -right-4 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-cyan-700 shadow-md transition hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 md:flex"
              aria-label={
                sidebarCollapsed ? "Expand member navigation" : "Collapse member navigation"
              }
              title={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
              ) : (
                <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-white/70 hover:text-white transition min-w-[44px] min-h-[44px] flex items-center justify-center -m-2"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Primary navigation stays compact; groups expose related pages only when needed. */}
          <nav
            aria-label="Member navigation"
            className={`flex-1 space-y-2 overflow-y-auto px-3 pb-4 ${sidebarCollapsed ? "md:px-2" : ""}`}
          >
            {visibleSections.map((section) => {
              const expanded = Boolean(expandedSections[section.title]);
              const sectionActive = section.items.some((item) => isActive(item.href));
              const showItems = !section.title || expanded || sectionActive;
              const GroupIcon = section.icon;
              return (
                <div key={section.title || "_main"} className="space-y-1">
                  {section.title && GroupIcon && (
                    <button
                      type="button"
                      onClick={() => toggleSection(section.title)}
                      aria-expanded={showItems}
                      aria-controls={`member-group-${section.title.replace(/\\W+/g, "-").toLowerCase()}`}
                      title={section.title}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${sidebarCollapsed ? "md:justify-center md:px-2" : ""} ${sectionActive ? "bg-white/15 text-white" : "text-cyan-50 hover:bg-white/10"}`}
                    >
                      <GroupIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                      <span className={`flex-1 ${sidebarCollapsed ? "md:hidden" : ""}`}>{section.title}</span>
                      {showItems ? (
                        <ChevronDown className={`h-4 w-4 ${sidebarCollapsed ? "md:hidden" : ""}`} aria-hidden="true" />
                      ) : (
                        <ChevronRight className={`h-4 w-4 ${sidebarCollapsed ? "md:hidden" : ""}`} aria-hidden="true" />
                      )}
                    </button>
                  )}
                  <ul
                    id={section.title ? `member-group-${section.title.replace(/\\W+/g, "-").toLowerCase()}` : undefined}
                    className={`space-y-1 ${section.title ? "ml-2 border-l border-white/15 pl-2 md:ml-0 md:pl-2" : ""} ${showItems ? "" : "hidden"}`}
                  >
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      const external = item.href.startsWith("https://");
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setSidebarOpen(false)}
                            aria-current={active ? "page" : undefined}
                            title={item.label}
                            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                            className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${sidebarCollapsed ? "md:justify-center md:px-2" : ""} ${active ? "bg-white text-cyan-800 shadow-sm" : "text-white/90 hover:bg-white/10 hover:text-white"}`}
                          >
                            <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                            <span className={`flex-1 ${sidebarCollapsed ? "md:hidden" : ""}`}>{item.label}</span>
                            {external && <ExternalLink className={`h-3.5 w-3.5 ${sidebarCollapsed ? "md:hidden" : ""}`} aria-hidden="true" />}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </nav>

          {/* One account control replaces repeated profile and settings links. */}
          <div className={`border-t border-white/15 p-3 ${sidebarCollapsed ? "md:px-2" : ""}`}>
            <button
              type="button"
              onClick={() => setAccountOpen((current) => !current)}
              aria-expanded={accountOpen}
              aria-controls="member-account-actions"
              title={`My Account — ${memberName}`}
              aria-label={`My Account — ${memberName}`}
              className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${sidebarCollapsed ? "md:justify-center" : ""}`}
            >
              {member?.profile_photo_url ? (
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-white/30">
                  <Image src={member.profile_photo_url} alt="" fill sizes="40px" className="object-cover" />
                </div>
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 font-semibold text-white">
                  {initials}
                </div>
              )}
              <div className={`min-w-0 flex-1 ${sidebarCollapsed ? "md:hidden" : ""}`}>
                <p className="truncate text-sm font-semibold">{memberName}</p>
                <p className="truncate text-xs text-cyan-100">{membershipLabel}</p>
                {membershipDetail && <p className="truncate text-xs text-cyan-100/70">{membershipDetail}</p>}
              </div>
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${accountOpen ? "rotate-180" : ""} ${sidebarCollapsed ? "md:hidden" : ""}`} />
            </button>
            {accountOpen && (
              <div id="member-account-actions" className="mt-2 space-y-1 rounded-xl bg-white/10 p-1">
                {isCoach && (
                  <Link href="/coach/dashboard" onClick={() => setSidebarOpen(false)} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm hover:bg-white/10">
                    <Briefcase className="h-4 w-4" /> <span className={sidebarCollapsed ? "md:hidden" : ""}>Coach Portal</span>
                  </Link>
                )}
                <Link href="/account/profile" onClick={() => setSidebarOpen(false)} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm hover:bg-white/10">
                  <User className="h-4 w-4" /> <span className={sidebarCollapsed ? "md:hidden" : ""}>My Profile</span>
                </Link>
                <Link href="/account/settings" onClick={() => setSidebarOpen(false)} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm hover:bg-white/10">
                  <Settings className="h-4 w-4" /> <span className={sidebarCollapsed ? "md:hidden" : ""}>Notification Preferences</span>
                </Link>
                <Link href="/" onClick={() => setSidebarOpen(false)} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm hover:bg-white/10">
                  <Home className="h-4 w-4" /> <span className={sidebarCollapsed ? "md:hidden" : ""}>Main Website</span>
                </Link>
                <button type="button" onClick={handleLogout} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-white/10">
                  <LogOut className="h-4 w-4" /> <span className={sidebarCollapsed ? "md:hidden" : ""}>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={`min-w-0 flex-1 transition-[margin] duration-300 ${
          sidebarCollapsed ? "md:ml-20" : "md:ml-64 lg:ml-72"
        }`}
      >
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              aria-label="Open navigation"
              aria-expanded={sidebarOpen}
              aria-controls="member-navigation"
              onClick={() => setSidebarOpen(true)}
              className="text-slate-600 hover:text-cyan-700 transition min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="SwimBuddz Logo"
                width={500}
                height={500}
                className="h-8 w-auto"
                priority
              />
              <span className="text-lg font-semibold text-cyan-700">SwimBuddz</span>
            </div>
            <NotificationBell
              memberId={member?.id}
              iconSize="h-6 w-6"
              hoverColor="hover:text-cyan-700"
            />
          </div>
        </header>

        {/* Desktop Top Bar (optional - for notifications/search) */}
        <header className="hidden md:flex sticky top-0 z-30 items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-sm px-6 lg:px-8 py-4">
          <div>
            <p className="text-sm text-slate-500">Welcome back,</p>
            <h1 className="text-lg font-semibold text-slate-900">{memberName}</h1>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell memberId={member?.id} hoverColor="hover:text-cyan-700" />
            <Link href="/account/profile" className="flex items-center gap-2">
              {member?.profile_photo_url ? (
                <div className="relative h-9 w-9 overflow-hidden rounded-full ring-2 ring-cyan-100">
                  <Image
                    src={member.profile_photo_url}
                    alt={memberName}
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-100 text-sm font-bold text-cyan-700">
                  {initials}
                </div>
              )}
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
