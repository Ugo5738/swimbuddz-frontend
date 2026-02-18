"use client";

import { type ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/auth";

const ADMIN_EMAILS = ["admin@admin.com"];

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

        if (!user || !user.email || !ADMIN_EMAILS.includes(user.email)) {
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
