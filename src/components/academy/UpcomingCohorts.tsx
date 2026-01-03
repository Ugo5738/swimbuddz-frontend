"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AcademyApi, Cohort, Program } from "@/lib/academy";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

type CohortWithProgram = Cohort & {
    program?: Program;
};

export function UpcomingCohorts() {
    const [cohorts, setCohorts] = useState<CohortWithProgram[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadCohorts = async () => {
            try {
                const openCohorts = await AcademyApi.getOpenCohorts();

                // Fetch program details for each cohort
                const cohortsWithDetails = await Promise.all(
                    openCohorts.map(async (cohort) => {
                        try {
                            const program = await AcademyApi.getProgram(cohort.program_id);
                            return { ...cohort, program };
                        } catch (err) {
                            console.error(`Failed to load program for cohort ${cohort.id}`, err);
                            return cohort;
                        }
                    })
                );

                setCohorts(cohortsWithDetails);
            } catch (error) {
                console.error("Failed to load upcoming cohorts", error);
            } finally {
                setLoading(false);
            }
        };

        loadCohorts();
    }, []);

    if (loading) {
        return (
            <div className="py-8 text-center text-slate-500">
                Loading upcoming cohorts...
            </div>
        );
    }

    if (cohorts.length === 0) {
        return (
            <Card className="p-8 text-center">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Upcoming Cohorts</h3>
                <p className="text-slate-600 mb-6">
                    We don't have any open cohorts scheduled right now. Check back soon or join our waitlist!
                </p>
                <Link
                    href="/register"
                    className="inline-block rounded-full bg-cyan-600 px-6 py-2 font-semibold text-white hover:bg-cyan-500 transition"
                >
                    Join Academy Waitlist
                </Link>
            </Card>
        );
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {cohorts.map((cohort) => (
                <Card key={cohort.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Card Header - Image or Gradient */}
                    <div
                        className="relative p-5 text-white min-h-[140px]"
                        style={{
                            backgroundImage: cohort.program?.cover_image_url
                                ? `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url(${cohort.program.cover_image_url})`
                                : 'linear-gradient(to bottom right, rgb(51, 65, 85), rgb(15, 23, 42))',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                    >
                        {cohort.program && (
                            <div className="mb-2">
                                <span className="inline-flex items-center rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-xs font-semibold capitalize">
                                    {cohort.program.level.replace("_", " ")}
                                </span>
                            </div>
                        )}
                        <h3 className="text-xl font-bold mb-1">{cohort.program?.name || "Academy Program"}</h3>
                        <p className="text-sm text-slate-200">{cohort.name}</p>
                    </div>

                    <div className="flex-1 p-5 space-y-4">
                        {cohort.program?.description && (
                            <p className="text-sm text-slate-600 line-clamp-3">
                                {cohort.program.description}
                            </p>
                        )}

                        <div className="space-y-2 text-sm border-t border-slate-100 pt-4">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500">Duration</span>
                                <span className="font-medium text-slate-900">
                                    {cohort.program?.duration_weeks || 8} weeks
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500">Starts</span>
                                <span className="font-medium text-slate-900">
                                    {new Date(cohort.start_date).toLocaleDateString(undefined, {
                                        month: "short",
                                        day: "numeric"
                                    })}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500">Schedule</span>
                                <span className="font-medium text-slate-900">
                                    {/* Mock schedule for now as it's not in cohort model yet */}
                                    Sat, 8:00 AM
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500">Availability</span>
                                <Badge variant={cohort.capacity > 5 ? "success" : "warning"}>
                                    {cohort.capacity} spots left
                                </Badge>
                            </div>
                        </div>

                        <div className="mt-auto pt-4">
                            <Link href="/dashboard/academy/browse" className="block w-full">
                                <Button className="w-full">Enroll Now</Button>
                            </Link>
                            <p className="mt-2 text-center text-xs text-slate-500">
                                Requires Academy Membership
                            </p>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
}
