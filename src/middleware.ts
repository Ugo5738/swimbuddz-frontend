import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/config";
import {
  evaluateMemberAccess,
  type AccessDecision,
  type MiddlewareMember,
} from "@/lib/middlewareAccess";

// Routes that require an approved membership
const MEMBER_ROUTES = ["/sessions", "/account", "/attendance"];

// Routes that require admin access
const ADMIN_ROUTES = ["/admin"];

const PUBLIC_LANDING_ROUTES = new Set([
  "/community",
  "/club",
  "/academy",
  "/sessions",
]);

function redirectToLogin(request: NextRequest, errorCode: string) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", errorCode);
  const redirectPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  loginUrl.searchParams.set("redirect", redirectPath);
  return NextResponse.redirect(loginUrl);
}

/** Translate a pure AccessDecision into a NextResponse. */
function applyDecision(
  decision: AccessDecision,
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  if (decision.kind === "allow") {
    return response;
  }
  const url = new URL(decision.path, request.url);
  for (const [key, value] of Object.entries(decision.search ?? {})) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
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
    },
  );

  // Check if this is a member-only route
  const isMemberRoute = MEMBER_ROUTES.some((route) =>
    pathname.startsWith(route),
  );

  // Check if this is an admin route
  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));

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

      // Admin detection: read from the signed JWT's app_metadata.roles claim.
      // This matches the backend (`require_admin` in libs/auth/dependencies.py
      // checks `app_metadata.roles contains "admin"`) and matches the
      // established pattern for the `coach` role in MemberLayout.tsx.
      const roles = (user.app_metadata?.roles as string[] | undefined) ?? [];
      const isJwtAdmin = Array.isArray(roles) && roles.includes("admin");

      // Admin users bypass all approval checks
      if (isJwtAdmin) {
        return response;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        return redirectToLogin(request, "missing_access_token");
      }

      // Fetch member profile to check approval status
      const memberResponse = await fetch(`${API_BASE_URL}/api/v1/members/me`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (memberResponse.ok) {
        const member = (await memberResponse.json()) as MiddlewareMember;

        // All approval / paywall / tier-gate logic is a pure, unit-tested
        // function (see src/lib/middlewareAccess.ts + its test). The
        // middleware only does I/O and translation.
        const decision = evaluateMemberAccess({
          pathname,
          isJwtAdmin,
          member,
        });
        return applyDecision(decision, request, response);
      } else if (memberResponse.status === 404 && isAdminRoute) {
        // No member profile but trying to access admin - might be admin-only user
        // Allow through and let the admin page handle authorization
        return response;
      } else {
        // API error or non-200 status - fail closed for security
        console.error(
          "Middleware: Failed to fetch member profile",
          memberResponse.status,
        );
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
