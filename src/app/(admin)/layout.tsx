"use client";

import { type ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/auth";

export default function AdminLayoutWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        // Admin status comes from the signed JWT's `app_metadata.roles` claim —
        // same source the backend `require_admin` dependency reads. The
        // server-side middleware also gates /admin/* before this component
        // ever renders, so this is a UX guard, not the security boundary.
        const roles = (user?.app_metadata?.roles as string[] | undefined) ?? [];
        const isAdmin = Array.isArray(roles) && roles.includes("admin");

        if (!user || !isAdmin) {
          console.warn("Unauthorized admin access attempt", user?.email);
          router.push("/login"); // Redirect to login
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
  }, [router]);

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
