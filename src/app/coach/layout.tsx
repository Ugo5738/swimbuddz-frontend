"use client";

import { CoachLayout } from "@/components/layout/CoachLayout";
import { supabase } from "@/lib/auth";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

// Pages that should NOT use the coach layout (have special flows)
const EXCLUDED_PATHS = ["/coach/apply"];

export default function CoachRouteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isExcludedPath = EXCLUDED_PATHS.some((path) =>
    pathname?.startsWith(path),
  );
  const shouldUseLayout = !isExcludedPath;
  const requiresAuth = !pathname?.startsWith("/coach/apply");

  const [isAuthorized, setIsAuthorized] = useState(!requiresAuth);
  const [isLoading, setIsLoading] = useState(requiresAuth);

  useEffect(() => {
    if (!requiresAuth) {
      setIsAuthorized(true);
      setIsLoading(false);
      return;
    }

    setIsAuthorized(false);
    setIsLoading(true);

    async function checkAuth() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          console.log("No authenticated user, redirecting to login");
          router.push("/login");
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error("Auth check failed", error);
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [requiresAuth, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="text-lg font-medium text-slate-600">
            Loading coach portal...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // Will redirect
  }

  // For excluded paths (apply, onboarding), render without CoachLayout
  if (!shouldUseLayout) {
    return <>{children}</>;
  }

  // For all other coach pages, use CoachLayout with sidebar
  return <CoachLayout>{children}</CoachLayout>;
}
