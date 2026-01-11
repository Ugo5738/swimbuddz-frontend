"use client";

import { CoachStatus, CoachStatusBadge } from "@/components/coaches/CoachStatusBadge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { TagList } from "@/components/ui/TagList";
import { AdminCoachApplicationListItem, CoachesApi } from "@/lib/coaches";
import Link from "next/link";
import { useEffect, useState } from "react";

type StatusFilter = CoachStatus | "all";

const statusFilters: { value: StatusFilter; label: string }[] = [
    { value: "pending_review", label: "Pending Review" },
    { value: "more_info_needed", label: "More Info Needed" },
    { value: "approved", label: "Approved" },
    { value: "active", label: "Active" },
    { value: "rejected", label: "Rejected" },
    { value: "all", label: "All" },
];

export default function AdminCoachesPage() {
    const [applications, setApplications] = useState<AdminCoachApplicationListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending_review");

    useEffect(() => {
        loadApplications();
    }, [statusFilter]);

    const loadApplications = async () => {
        setLoading(true);
        try {
            const data = await CoachesApi.listApplications(statusFilter);
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Coach Applications</h1>
                    <p className="text-slate-600 mt-1">Review and manage coach applications</p>
                </div>
            </div>

            <FilterTabs
                options={statusFilters}
                value={statusFilter}
                onChange={setStatusFilter}
            />

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
                                        <CoachStatusBadge status={app.status} />
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
                                        <div className="mt-3">
                                            <TagList
                                                items={app.coaching_specialties}
                                                maxItems={5}
                                                variant="slate"
                                            />
                                        </div>
                                    )}

                                    {app.certifications.length > 0 && (
                                        <div className="mt-2">
                                            <TagList
                                                items={app.certifications}
                                                maxItems={4}
                                                variant="emerald"
                                            />
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
