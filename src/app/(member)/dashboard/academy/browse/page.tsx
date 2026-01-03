"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AcademyApi, Program, Cohort, Enrollment } from "@/lib/academy";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { LoadingCard } from "@/components/ui/LoadingCard";

type CohortWithProgram = Cohort & {
    program?: Program;
};

export default function AcademyBrowsePage() {
    const [programs, setPrograms] = useState<Program[]>([]);
    const [cohorts, setCohorts] = useState<CohortWithProgram[]>([]);
    const [enrolledCohortIds, setEnrolledCohortIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [levelFilter, setLevelFilter] = useState<string>("all");

    useEffect(() => {
        async function loadData() {
            try {
                const [programsData, cohortsData] = await Promise.all([
                    AcademyApi.listPrograms(),
                    AcademyApi.getOpenCohorts(),
                ]);

                setPrograms(programsData.filter(p => p.is_published));

                // Enrich cohorts with program data
                const enrichedCohorts = cohortsData.map(cohort => ({
                    ...cohort,
                    program: programsData.find(p => p.id === cohort.program_id),
                }));
                setCohorts(enrichedCohorts);

                // Check which cohorts user is enrolled in
                try {
                    const myEnrollments = await AcademyApi.getMyEnrollments();
                    const enrolledIds = new Set(myEnrollments.map((e: Enrollment) => e.cohort_id).filter(Boolean) as string[]);
                    setEnrolledCohortIds(enrolledIds);
                } catch {
                    // User may not have enrollments, which is fine
                }
            } catch (error) {
                console.error("Failed to load academy data", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    // Get unique levels for filtering
    const levels = ["all", ...new Set(programs.map(p => p.level))];

    // Filter cohorts by level
    const filteredCohorts = levelFilter === "all"
        ? cohorts
        : cohorts.filter(c => c.program?.level === levelFilter);

    if (loading) {
        return <LoadingCard text="Loading programs..." />;
    }

    return (
        <div className="space-y-8">
            {/* Header with Filter */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Academy Programs</h1>
                    <p className="text-slate-600 mt-1">
                        Explore our structured learning programs and enroll in upcoming cohorts.
                    </p>
                </div>

                {/* Level Filter Dropdown */}
                <div className="w-48">
                    <Select
                        value={levelFilter}
                        onChange={(e) => setLevelFilter(e.target.value)}
                        label="Filter by Level"
                    >
                        {levels.map(level => (
                            <option key={level} value={level}>
                                {level === "all" ? "All Levels" : level.replace("_", " ")}
                            </option>
                        ))}
                    </Select>
                </div>
            </div>

            {/* Programs Grid */}
            {programs.length > 0 && (
                <section className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-900">Programs</h2>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {programs
                            .filter(p => levelFilter === "all" || p.level === levelFilter)
                            .map(program => (
                                <Link key={program.id} href={`/dashboard/academy/programs/${program.id}`}>
                                    <Card className="h-full hover:shadow-lg transition-shadow overflow-hidden">
                                        {/* Program Image or Gradient */}
                                        <div
                                            className="h-32 relative"
                                            style={{
                                                backgroundImage: program.cover_image_url
                                                    ? `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.6)), url(${program.cover_image_url})`
                                                    : 'linear-gradient(to bottom right, rgb(51, 65, 85), rgb(15, 23, 42))',
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                            }}
                                        >
                                            <div className="absolute bottom-3 left-4 right-4 text-white">
                                                <Badge variant="default" className="mb-2 bg-white/20 backdrop-blur-sm">
                                                    {program.level.replace("_", " ")}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="p-4 space-y-2">
                                            <h3 className="font-semibold text-slate-900">{program.name}</h3>
                                            <p className="text-sm text-slate-600 line-clamp-2">
                                                {program.description || "Structured swimming program"}
                                            </p>
                                            <div className="flex items-center justify-between text-sm pt-2">
                                                <span className="text-slate-500">{program.duration_weeks} weeks</span>
                                                <span className="font-semibold text-cyan-600">
                                                    ₦{(program.price_amount || 0).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </Card>
                                </Link>
                            ))}
                    </div>
                </section>
            )}

            {/* Open Cohorts */}
            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900">Open Cohorts</h2>
                {filteredCohorts.length === 0 ? (
                    <Card className="p-6 text-center">
                        <p className="text-slate-600">
                            No open cohorts available{levelFilter !== "all" ? " for this level" : ""}. Check back soon!
                        </p>
                    </Card>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredCohorts.map(cohort => (
                            <Card key={cohort.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
                                {/* Cohort Header */}
                                <div
                                    className="p-5 text-white min-h-[120px]"
                                    style={{
                                        backgroundImage: cohort.program?.cover_image_url
                                            ? `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url(${cohort.program.cover_image_url})`
                                            : 'linear-gradient(to bottom right, rgb(51, 65, 85), rgb(15, 23, 42))',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                    }}
                                >
                                    {cohort.program && (
                                        <Badge variant="default" className="mb-2 bg-white/20 backdrop-blur-sm">
                                            {cohort.program.level.replace("_", " ")}
                                        </Badge>
                                    )}
                                    <h3 className="text-lg font-bold">{cohort.program?.name || "Program"}</h3>
                                    <p className="text-sm text-slate-200">{cohort.name}</p>
                                </div>

                                {/* Cohort Details */}
                                <div className="flex-1 p-5 space-y-3">
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Starts</span>
                                            <span className="font-medium">
                                                {new Date(cohort.start_date).toLocaleDateString(undefined, {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric"
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Duration</span>
                                            <span className="font-medium">{cohort.program?.duration_weeks || 8} weeks</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Price</span>
                                            <span className="font-semibold text-cyan-600">
                                                ₦{(cohort.price_override ?? cohort.program?.price_amount ?? 0).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500">Status</span>
                                            {enrolledCohortIds.has(cohort.id) ? (
                                                <Badge variant="success">✓ Enrolled</Badge>
                                            ) : (
                                                <Badge variant={cohort.capacity > 5 ? "success" : "warning"}>
                                                    {cohort.capacity} spots
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-3">
                                        {enrolledCohortIds.has(cohort.id) ? (
                                            <Link href={`/dashboard/academy/cohorts/${cohort.id}`}>
                                                <Button variant="outline" className="w-full">View Details</Button>
                                            </Link>
                                        ) : (
                                            <Link href={`/upgrade/academy/cohort?cohort_id=${cohort.id}`}>
                                                <Button className="w-full">Enroll Now</Button>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
