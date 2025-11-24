"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";

export default function MemberDashboardPage() {
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
