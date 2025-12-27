"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import {
    AdminCoachApplicationListItem,
    CoachesApi,
    getStatusColor,
    getStatusLabel,
} from "@/lib/coaches";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminCoachesPage() {
    const [applications, setApplications] = useState<AdminCoachApplicationListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("pending_review");

    useEffect(() => {
        loadApplications();
    }, [statusFilter]);

    const loadApplications = async () => {
        setLoading(true);
        try {
            const status = statusFilter === "all" ? undefined : statusFilter;
            const data = await CoachesApi.listApplications(status);
            setApplications(data);
        } catch (error) {
            console.error("Failed to load applications:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickApprove = async (id: string) => {
        try {
            await CoachesApi.approve(id);
            loadApplications();
        } catch (error) {
            console.error("Failed to approve:", error);
        }
    };

    const statusFilters = [
        { value: "pending_review", label: "Pending Review" },
        { value: "more_info_needed", label: "More Info Needed" },
        { value: "approved", label: "Approved" },
        { value: "active", label: "Active" },
        { value: "rejected", label: "Rejected" },
        { value: "all", label: "All" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Coach Applications</h1>
                    <p className="text-slate-600 mt-1">Review and manage coach applications</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                {statusFilters.map((filter) => (
                    <button
                        key={filter.value}
                        onClick={() => setStatusFilter(filter.value)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === filter.value
                            ? "bg-cyan-100 text-cyan-700 border border-cyan-300"
                            : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                            }`}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            {/* Applications List */}
            {loading ? (
                <LoadingCard text="Loading applications..." />
            ) : applications.length === 0 ? (
                <Card className="p-8 text-center">
                    <div className="text-4xl mb-2">📋</div>
                    <p className="text-slate-500">No applications found for this filter.</p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {applications.map((app) => (
                        <Card key={app.id} className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-semibold text-slate-900">
                                            {app.display_name || `${app.first_name} ${app.last_name}`}
                                        </h3>
                                        <span
                                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                                app.status
                                            )} bg-opacity-10`}
                                            style={{
                                                backgroundColor:
                                                    app.status === "pending_review"
                                                        ? "#fef3c7"
                                                        : app.status === "approved" || app.status === "active"
                                                            ? "#d1fae5"
                                                            : app.status === "rejected"
                                                                ? "#fee2e2"
                                                                : "#f1f5f9",
                                            }}
                                        >
                                            {getStatusLabel(app.status)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1">{app.email}</p>

                                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
                                        <div>
                                            <span className="text-slate-400">Experience:</span>{" "}
                                            <span className="font-medium">{app.coaching_years} years</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400">Applied:</span>{" "}
                                            <span className="font-medium">
                                                {app.application_submitted_at
                                                    ? new Date(app.application_submitted_at).toLocaleDateString()
                                                    : "Not submitted"}
                                            </span>
                                        </div>
                                    </div>

                                    {app.coaching_specialties.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-1">
                                            {app.coaching_specialties.slice(0, 5).map((s) => (
                                                <span
                                                    key={s}
                                                    className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs"
                                                >
                                                    {s}
                                                </span>
                                            ))}
                                            {app.coaching_specialties.length > 5 && (
                                                <span className="px-2 py-0.5 text-slate-400 text-xs">
                                                    +{app.coaching_specialties.length - 5} more
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {app.certifications.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {app.certifications.slice(0, 4).map((c) => (
                                                <span
                                                    key={c}
                                                    className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs"
                                                >
                                                    {c}
                                                </span>
                                            ))}
                                            {app.certifications.length > 4 && (
                                                <span className="px-2 py-0.5 text-slate-400 text-xs">
                                                    +{app.certifications.length - 4} more
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 ml-4">
                                    <Link href={`/admin/coaches/${app.id}`}>
                                        <Button variant="outline" size="sm">
                                            Review
                                        </Button>
                                    </Link>
                                    {(app.status === "pending_review" || app.status === "more_info_needed") && (
                                        <Button size="sm" onClick={() => handleQuickApprove(app.id)}>
                                            Approve
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
