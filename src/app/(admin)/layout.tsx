"use client";

import { type ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { apiGet } from "@/lib/api";
import { supabase } from "@/lib/auth";

export default function AdminLayoutWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        // Admin status comes from the signed JWT's `app_metadata.roles` claim —
        // same source the backend `require_admin` dependency reads. The
        // server-side middleware also gates /admin/* before this component
        // ever renders, so this is a UX guard, not the security boundary.
        const roles = (user.app_metadata?.roles as string[] | undefined) ?? [];
        const isAdmin = Array.isArray(roles) && roles.includes("admin");

        // Global admins keep full access to all of /admin (unchanged).
        if (isAdmin) {
          setIsAuthorized(true);
          return;
        }

        // Finance-only lane: a non-admin may use /admin/finance/* if they are a
        // finance-team member. The `/me` probe returns 200 for any ledger role
        // (viewer and up) and 403 otherwise; the ledger API enforces the same
        // boundary server-side, so this only matches the UX to it.
        if (pathname?.startsWith("/admin/finance")) {
          try {
            await apiGet("/api/v1/admin/finance/users/me", { auth: true });
            setIsAuthorized(true);
            return;
          } catch {
            // Not a finance-team member — fall through to redirect.
          }
        }

        console.warn("Unauthorized admin access attempt", user.email);
        router.push("/login");
      } catch (error) {
        console.error("Auth check failed", error);
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [router, pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg font-medium text-slate-600">
          Verifying Admin Access...
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // Will redirect
  }

  return <AdminLayout>{children}</AdminLayout>;
}
