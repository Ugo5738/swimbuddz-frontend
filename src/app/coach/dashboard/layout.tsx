"use client";

import { CoachLayout } from "@/components/layout/CoachLayout";
import { supabase } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

export default function CoachDashboardLayoutWrapper({
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
    }, [router]);

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

    return <CoachLayout>{children}</CoachLayout>;
}
