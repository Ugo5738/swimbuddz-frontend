import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Routes that require an approved membership
const MEMBER_ROUTES = [
    "/community",
    "/club",
    "/academy",
    "/sessions",
    "/profile",
    "/dashboard",
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
    "/sessions": ["club", "academy"],

    // Academy tier - requires academy only
    "/academy": ["academy"],
};

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

    // For member routes, check approval status
    if (isMemberRoute || isAdminRoute) {
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session) {
                // Not logged in, redirect to login
                return NextResponse.redirect(new URL("/login", request.url));
            }

            // Check if user is admin (by email)
            const userEmail = session.user?.email;
            const adminEmail = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL;
            const isAdmin = userEmail && adminEmail && userEmail.toLowerCase() === adminEmail.toLowerCase();

            // Admin users bypass all approval checks
            if (isAdmin) {
                return response;
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

                // For tier-based access control
                const protectedRoute = Object.keys(TIER_ROUTES).find((route) =>
                    pathname.startsWith(route)
                );

                if (protectedRoute) {
                    const userTier = member.membership_tier || "community";
                    const allowedTiers = TIER_ROUTES[protectedRoute];

                    if (!allowedTiers.includes(userTier)) {
                        // Redirect to upgrade page
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
                return NextResponse.redirect(new URL("/login?error=auth_check_failed", request.url));
            }
        } catch (error) {
            console.error("Middleware error:", error);
            // Fail closed: Redirect to login if we can't verify status
            return NextResponse.redirect(new URL("/login?error=auth_check_error", request.url));
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
        "/profile/:path*",
        "/dashboard/:path*",
        "/attendance/:path*",
        "/admin/:path*",
    ],
};

