import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Routes that require an approved membership
const MEMBER_ROUTES = [
    "/sessions",
    "/account",
    "/attendance",
];

// Routes that require admin access
const ADMIN_ROUTES = ["/admin"];

// Define tier access requirements for protected routes
const TIER_ROUTES: Record<string, string[]> = {
    // Community tier - available to all members
    "/community": ["community", "club", "academy"],

    // Club tier - requires club or academy
    "/club": ["club", "academy"],
    // Sessions include Community sessions, so Community members must be able to access `/sessions/*`.
    // Per-session tier restrictions should be enforced by the sessions API / UI, not a blanket route rule.
    "/sessions": ["community", "club", "academy"],

    // Academy tier - requires academy only
    "/academy": ["academy"],
};

const PUBLIC_LANDING_ROUTES = new Set(["/community", "/club", "/academy", "/sessions"]);

function parseDateMs(value: any): number | null {
    if (!value) return null;
    const ms = Date.parse(String(value));
    return Number.isFinite(ms) ? ms : null;
}

function redirectToLogin(request: NextRequest, errorCode: string) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", errorCode);
    const redirectPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    loginUrl.searchParams.set("redirect", redirectPath);
    return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const response = NextResponse.next();

    // Create Supabase client for server-side
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    // Check if this is a member-only route
    const isMemberRoute = MEMBER_ROUTES.some((route) =>
        pathname.startsWith(route)
    );

    // Check if this is an admin route
    const isAdminRoute = ADMIN_ROUTES.some((route) =>
        pathname.startsWith(route)
    );

    // Allow public marketing landing pages even though they share paths with member routes.
    if (PUBLIC_LANDING_ROUTES.has(pathname)) {
        return response;
    }

    // For member routes, check approval status
    if (isMemberRoute || isAdminRoute) {
        try {
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError || !user) {
                // Not logged in, redirect to login and preserve return path.
                return redirectToLogin(request, "not_logged_in");
            }

            // Check if user is admin (by email)
            const userEmail = user.email;
            const adminEmail = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL;
            const isAdmin = userEmail && adminEmail && userEmail.toLowerCase() === adminEmail.toLowerCase();

            // Admin users bypass all approval checks
            if (isAdmin) {
                return response;
            }

            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session?.access_token) {
                return redirectToLogin(request, "missing_access_token");
            }

            // Fetch member profile to check approval status
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
            const memberResponse = await fetch(
                `${apiBaseUrl}/api/v1/members/me`,
                {
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                    },
                }
            );

            if (memberResponse.ok) {
                const member = await memberResponse.json();

                // Check if member has admin role (legacy check)
                if (member.role === "admin" || member.is_admin) {
                    return response;
                }

                // Check approval status for non-admin members
                if (member.approval_status === "pending") {
                    // Redirect pending members to the waiting page
                    if (pathname !== "/register/pending") {
                        return NextResponse.redirect(
                            new URL("/register/pending", request.url)
                        );
                    }
                } else if (member.approval_status === "rejected") {
                    // Rejected members get redirected to a rejection page
                    if (pathname !== "/register/pending") {
                        return NextResponse.redirect(
                            new URL("/register/pending", request.url)
                        );
                    }
                }

                const now = Date.now();
                const communityPaidUntilMs = parseDateMs(member.membership?.community_paid_until);
                const communityActive = communityPaidUntilMs !== null && communityPaidUntilMs > now;

                // Community activation paywall: allow account/profile, block other member routes.
                const paywallAllowed =
                    pathname.startsWith("/account") ||
                    pathname.startsWith("/account/profile");

                if (!communityActive && !paywallAllowed) {
                    const url = new URL("/account/billing", request.url);
                    url.searchParams.set("required", "community");
                    return NextResponse.redirect(url);
                }

                // For tier-based access control
                const protectedRoute = Object.keys(TIER_ROUTES).find((route) =>
                    pathname.startsWith(route)
                );

                if (protectedRoute) {
                    // Determine effective tier based on active payments using nested membership structure.
                    const academyUntilMs = parseDateMs(member.membership?.academy_paid_until);
                    const clubUntilMs = parseDateMs(member.membership?.club_paid_until);

                    const approvedTiers: string[] = (member.membership?.active_tiers && member.membership.active_tiers.length > 0)
                        ? member.membership.active_tiers.map((t: string) => String(t).toLowerCase())
                        : (member.membership?.primary_tier ? [String(member.membership.primary_tier).toLowerCase()] : ["community"]);

                    const academyApproved = approvedTiers.includes("academy");
                    const clubApproved = approvedTiers.includes("club");

                    const academyActive = academyApproved && (academyUntilMs === null || academyUntilMs > now);
                    const clubActive = clubApproved && clubUntilMs !== null && clubUntilMs > now;

                    const effectiveTier = academyActive ? "academy" : clubActive ? "club" : "community";
                    const allowedTiers = TIER_ROUTES[protectedRoute];

                    if (!allowedTiers.includes(effectiveTier)) {
                        // If an upgrade is already requested, avoid looping users back into upgrade flow.
                        const requestedTiers: string[] = member.membership?.requested_tiers || [];
                        const requiredTier = allowedTiers.includes("academy") ? "academy" : "club";
                        if (requestedTiers.includes(requiredTier)) {
                            return NextResponse.redirect(
                                new URL("/account/profile?upgrade=pending", request.url)
                            );
                        }

                        // If the user is approved for the tier but inactive (e.g. Club unpaid), send to billing.
                        if (requiredTier === "club" && approvedTiers.includes("club") && !clubActive) {
                            const url = new URL("/account/billing", request.url);
                            url.searchParams.set("required", "club");
                            return NextResponse.redirect(url);
                        }

                        return NextResponse.redirect(
                            new URL("/register?upgrade=true", request.url)
                        );
                    }
                }
            } else if (memberResponse.status === 404 && isAdminRoute) {
                // No member profile but trying to access admin - might be admin-only user
                // Allow through and let the admin page handle authorization
                return response;
            } else {
                // API error or non-200 status - fail closed for security
                console.error("Middleware: Failed to fetch member profile", memberResponse.status);
                // If we can't verify the user, redirect to login or error
                // But if it's a 500, maybe we should let them see a generic error?
                // For now, redirecting to login is safer than letting them in.
                return redirectToLogin(request, "auth_check_failed");
            }
        } catch (error) {
            console.error("Middleware error:", error);
            // Fail closed: Redirect to login if we can't verify status
            return redirectToLogin(request, "auth_check_error");
        }
    }

    return response;
}

export const config = {
    matcher: [
        "/community/:path*",
        "/club/:path*",
        "/academy/:path*",
        "/sessions/:path*",
        "/account/:path*",
        "/attendance/:path*",
        "/admin/:path*",
    ],
};
