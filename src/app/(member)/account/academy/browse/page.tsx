"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ProgramCard } from "@/components/academy/ProgramCard";
import { AcademyApi, Enrollment, Program, ProgramLevel } from "@/lib/academy";
import Link from "next/link";
import { useEffect, useState } from "react";

const levels = [
    { value: "all", label: "All Levels" },
    { value: ProgramLevel.BEGINNER_1, label: "Beginner 1" },
    { value: ProgramLevel.BEGINNER_2, label: "Beginner 2" },
    { value: ProgramLevel.INTERMEDIATE, label: "Intermediate" },
    { value: ProgramLevel.ADVANCED, label: "Advanced" },
    { value: ProgramLevel.SPECIALTY, label: "Specialty" },
];

export default function AcademyBrowsePage() {
    const [programs, setPrograms] = useState<Program[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLevel, setSelectedLevel] = useState<string>("all");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            // Fetch published programs and user's enrollments
            const [programsData, enrollmentsData] = await Promise.all([
                AcademyApi.listPrograms(),
                AcademyApi.getMyEnrollments().catch(() => []), // May fail if not logged in
            ]);

            // Filter to only published programs
            const publishedPrograms = programsData.filter((p) => p.is_published);
            setPrograms(publishedPrograms);
            setEnrollments(enrollmentsData);
        } catch (error) {
            console.error("Failed to load programs:", error);
        } finally {
            setLoading(false);
        }
    };

    // Filter programs by level
    const filteredPrograms =
        selectedLevel === "all"
            ? programs
            : programs.filter((p) => p.level === selectedLevel);

    // Get enrolled program IDs
    const enrolledProgramIds = enrollments
        .filter((e) => e.program_id)
        .map((e) => e.program_id!);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner text="Loading programs..." />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <header className="space-y-2">
                <Link
                    href="/account/academy"
                    className="text-sm text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
                >
                    ← Back to My Academy
                </Link>
                <h1 className="text-3xl font-bold text-slate-900">
                    Browse Programs
                </h1>
                <p className="text-slate-600">
                    Explore our structured swimming programs and find the right
                    fit for your skill level.
                </p>
            </header>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <span className="text-sm font-medium text-slate-700">
                        Filter by Level:
                    </span>
                    <select
                        value={selectedLevel}
                        onChange={(e) => setSelectedLevel(e.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:ring-cyan-500"
                    >
                        {levels.map((level) => (
                            <option key={level.value} value={level.value}>
                                {level.label}
                            </option>
                        ))}
                    </select>
                    <span className="text-sm text-slate-500 ml-auto">
                        {filteredPrograms.length} program
                        {filteredPrograms.length !== 1 ? "s" : ""} found
                    </span>
                </div>
            </Card>

            {/* Programs Grid */}
            {filteredPrograms.length === 0 ? (
                <Card className="p-12 text-center">
                    <div className="space-y-4">
                        <span className="text-5xl">🔍</span>
                        <h3 className="text-lg font-semibold text-slate-900">
                            No programs found
                        </h3>
                        <p className="text-slate-600">
                            {selectedLevel !== "all"
                                ? "Try selecting a different level or browse all programs."
                                : "New programs are coming soon! Check back later."}
                        </p>
                        {selectedLevel !== "all" && (
                            <Button
                                variant="outline"
                                onClick={() => setSelectedLevel("all")}
                            >
                                View All Programs
                            </Button>
                        )}
                    </div>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredPrograms.map((program) => (
                        <ProgramCard
                            key={program.id}
                            program={program}
                            enrolledProgramIds={enrolledProgramIds}
                        />
                    ))}
                </div>
            )}

            {/* Quick Stats */}
            <Card className="p-6 bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-100">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h3 className="font-semibold text-slate-900">
                            Not sure where to start?
                        </h3>
                        <p className="text-sm text-slate-600">
                            Our Beginner 1 program is perfect for adults learning
                            to swim from scratch.
                        </p>
                    </div>
                    <Button
                        onClick={() => setSelectedLevel(ProgramLevel.BEGINNER_1)}
                    >
                        View Beginner Programs
                    </Button>
                </div>
            </Card>
        </div>
    );
}
