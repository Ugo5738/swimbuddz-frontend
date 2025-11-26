import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

    // Check if the route requires tier-based access
    const protectedRoute = Object.keys(TIER_ROUTES).find((route) =>
        pathname.startsWith(route)
    );

    if (protectedRoute) {
        // TODO: Get user's membership tier from session or API
        // For now, allow all authenticated users
        // This will be fully implemented when auth context is integrated

        const response = NextResponse.next();

        // In production, uncomment and implement tier checking:
        /*
        const userTier = await getUserTier(request);
        const allowedTiers = TIER_ROUTES[protectedRoute];
        
        if (!userTier || !allowedTiers.includes(userTier)) {
          // Redirect to upgrade page or show access denied
          return NextResponse.redirect(new URL("/upgrade", request.url));
        }
        */

        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/community/:path*",
        "/club/:path*",
        "/academy/:path*",
        "/sessions/:path*",
    ],
};
