"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/auth";

const ADMIN_EMAILS = ["admin@admin.com"];

export default function MemberDashboardPage() {
    const [isAdmin, setIsAdmin] = useState(false);
    const router = useRouter();

    useEffect(() => {
        async function checkAdmin() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && user.email && ADMIN_EMAILS.includes(user.email)) {
                setIsAdmin(true);
                router.push("/admin/dashboard"); // Redirect to Admin Dashboard
            }
        }
        checkAdmin();
    }, [router]);

    // If redirecting, we can show a loading state or just the member view briefly
    if (isAdmin) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-lg font-medium text-slate-600">Redirecting to Admin Dashboard...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
                <p className="text-slate-600">Welcome to your SwimBuddz dashboard.</p>
            </header>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Link href="/profile" className="block">
                    <Card className="h-full transition-shadow hover:shadow-md">
                        <h2 className="mb-2 text-xl font-semibold text-slate-900">My Profile</h2>
                        <p className="text-slate-600">Manage your personal information, preferences, and swim profile.</p>
                    </Card>
                </Link>

                <Link href="/dashboard/academy" className="block">
                    <Card className="h-full transition-shadow hover:shadow-md">
                        <h2 className="mb-2 text-xl font-semibold text-slate-900">Academy</h2>
                        <p className="text-slate-600">View your enrollments, progress, and milestones.</p>
                    </Card>
                </Link>

                <Link href="/announcements" className="block">
                    <Card className="h-full transition-shadow hover:shadow-md">
                        <h2 className="mb-2 text-xl font-semibold text-slate-900">Announcements</h2>
                        <p className="text-slate-600">Stay updated with the latest news and events.</p>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
