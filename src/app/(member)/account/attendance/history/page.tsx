"use client";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import { apiGet } from "@/lib/api";
import Link from "next/link";
import { useEffect, useState } from "react";

type AttendanceRecord = {
    id: string;
    session_id: string;
    status: string;
    check_in_time?: string | null;
    session?: {
        id: string;
        title: string;
        session_type: string;
        start_time: string;
        location_name?: string;
    };
};

function formatDate(value: string) {
    return new Date(value).toLocaleDateString("en-NG", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

const statusMap: Record<string, { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }> = {
    confirmed: { label: "Confirmed", variant: "success" },
    checked_in: { label: "Attended", variant: "success" },
    registered: { label: "Registered", variant: "info" },
    pending: { label: "Pending", variant: "info" },
    no_show: { label: "No-show", variant: "warning" },
    cancelled: { label: "Cancelled", variant: "default" }
};

export default function AttendanceHistoryPage() {
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadAttendance() {
            try {
                const data = await apiGet<AttendanceRecord[]>("/api/v1/attendance/me", { auth: true });
                setAttendance(data);
            } catch (e) {
                console.error("Failed to load attendance:", e);
                setError(e instanceof Error ? e.message : "Failed to load attendance history");
            } finally {
                setLoading(false);
            }
        }
        loadAttendance();
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-[300px] items-center justify-center">
                <LoadingSpinner size="lg" text="Loading attendance history..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <header className="space-y-1">
                    <h1 className="text-2xl font-bold text-slate-900">Session History</h1>
                    <p className="text-sm text-slate-600">Track your past sessions and attendance.</p>
                </header>
                <Card className="p-6 text-center">
                    <p className="text-red-600">{error}</p>
                </Card>
            </div>
        );
    }

    const confirmedCount = attendance.filter(a =>
        a.status === "confirmed" || a.status === "checked_in"
    ).length;

    return (
        <div className="space-y-4 md:space-y-6">
            <header className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Session History</h1>
                <p className="text-sm text-slate-600">Track your past sessions and attendance.</p>
            </header>

            {attendance.length === 0 ? (
                <Card className="p-6 md:p-8 text-center space-y-4">
                    <div className="text-5xl">📋</div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">No attendance history yet</h2>
                        <p className="text-sm text-slate-600 mt-1">
                            Your session attendance will appear here once you start attending sessions.
                        </p>
                    </div>
                    <Link
                        href="/sessions"
                        className="inline-block px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm font-medium"
                    >
                        Browse Sessions
                    </Link>
                </Card>
            ) : (
                <>
                    {/* Summary Card */}
                    <Card className="p-4">
                        <p className="text-base md:text-lg font-semibold text-slate-900">
                            You&apos;ve attended {confirmedCount} session{confirmedCount !== 1 ? "s" : ""}.
                        </p>
                    </Card>

                    {/* Mobile Card View */}
                    <div className="sm:hidden space-y-3">
                        {attendance.map((record) => {
                            const status = statusMap[record.status] ?? statusMap.registered;
                            const session = record.session;
                            return (
                                <Card key={record.id} className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-slate-900 text-sm">
                                                {session?.title || "Session"}
                                            </p>
                                            <p className="text-xs text-slate-600 mt-1">
                                                {session?.start_time ? formatDate(session.start_time) : "—"}
                                            </p>
                                            <p className="text-xs text-slate-500 capitalize">
                                                {session?.session_type?.replace("_", " ") || "Session"}
                                            </p>
                                        </div>
                                        <Badge variant={status.variant}>{status.label}</Badge>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden sm:block">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeaderCell>Date</TableHeaderCell>
                                    <TableHeaderCell>Session</TableHeaderCell>
                                    <TableHeaderCell className="hidden md:table-cell">Type</TableHeaderCell>
                                    <TableHeaderCell>Status</TableHeaderCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {attendance.map((record) => {
                                    const status = statusMap[record.status] ?? statusMap.registered;
                                    const session = record.session;
                                    return (
                                        <TableRow key={record.id}>
                                            <TableCell>
                                                {session?.start_time ? formatDate(session.start_time) : "—"}
                                            </TableCell>
                                            <TableCell>{session?.title || "Session"}</TableCell>
                                            <TableCell className="hidden md:table-cell capitalize">
                                                {session?.session_type?.replace("_", " ") || "—"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={status.variant}>{status.label}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </>
            )}
        </div>
    );
}
