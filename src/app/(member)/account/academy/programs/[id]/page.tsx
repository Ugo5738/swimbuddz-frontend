"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
    AcademyApi,
    Cohort,
    CohortStatus,
    Enrollment,
    Milestone,
    Program,
    ProgramLevel,
} from "@/lib/academy";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const levelLabels: Record<ProgramLevel, string> = {
    [ProgramLevel.BEGINNER_1]: "Beginner 1",
    [ProgramLevel.BEGINNER_2]: "Beginner 2",
    [ProgramLevel.INTERMEDIATE]: "Intermediate",
    [ProgramLevel.ADVANCED]: "Advanced",
    [ProgramLevel.SPECIALTY]: "Specialty",
};

const levelColors: Record<ProgramLevel, string> = {
    [ProgramLevel.BEGINNER_1]: "bg-green-100 text-green-700",
    [ProgramLevel.BEGINNER_2]: "bg-blue-100 text-blue-700",
    [ProgramLevel.INTERMEDIATE]: "bg-purple-100 text-purple-700",
    [ProgramLevel.ADVANCED]: "bg-orange-100 text-orange-700",
    [ProgramLevel.SPECIALTY]: "bg-pink-100 text-pink-700",
};

export default function ProgramDetailPage() {
    const params = useParams();
    const programId = params.id as string;

    const [program, setProgram] = useState<Program | null>(null);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [cohorts, setCohorts] = useState<Cohort[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (programId) {
            loadData();
        }
    }, [programId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [programData, milestonesData, cohortsData, enrollmentsData] =
                await Promise.all([
                    AcademyApi.getProgram(programId),
                    AcademyApi.listMilestones(programId),
                    AcademyApi.listCohorts(programId),
                    AcademyApi.getMyEnrollments().catch(() => []),
                ]);

            setProgram(programData);
            setMilestones(milestonesData);
            // Only show open cohorts
            setCohorts(cohortsData.filter((c) => c.status === CohortStatus.OPEN));
            setEnrollments(enrollmentsData);
        } catch (error) {
            console.error("Failed to load program:", error);
        } finally {
            setLoading(false);
        }
    };

    // Check enrollment status
    const getEnrollmentForCohort = (cohortId: string) =>
        enrollments.find((e) => e.cohort_id === cohortId);

    const isEnrolledInProgram = enrollments.some(
        (e) => e.program_id === programId
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600" />
            </div>
        );
    }

    if (!program) {
        return (
            <Card className="p-12 text-center">
                <h2 className="text-xl font-semibold text-slate-900">
                    Program not found
                </h2>
                <Link
                    href="/account/academy/browse"
                    className="text-cyan-600 hover:text-cyan-700 mt-4 inline-block"
                >
                    ← Browse Programs
                </Link>
            </Card>
        );
    }

    const price = program.price_amount
        ? `₦${program.price_amount.toLocaleString()}`
        : "Free";

    return (
        <div className="space-y-8">
            {/* Breadcrumb */}
            <Link
                href="/account/academy/browse"
                className="text-sm text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
            >
                ← Browse Programs
            </Link>

            {/* Hero Section */}
            <div className="relative rounded-2xl overflow-hidden">
                <div className="relative h-64 bg-gradient-to-br from-cyan-500 to-blue-600">
                    {program.cover_image_url && (
                        <Image
                            src={program.cover_image_url}
                            alt={program.name}
                            fill
                            sizes="100vw"
                            className="object-cover opacity-40"
                            priority
                        />
                    )}
                </div>
                <div className="absolute inset-0 flex items-end p-8 bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
                    <div className="text-white space-y-2">
                        <Badge className={levelColors[program.level]}>
                            {levelLabels[program.level]}
                        </Badge>
                        {isEnrolledInProgram && (
                            <Badge className="bg-green-500 text-white ml-2">
                                ✓ Enrolled
                            </Badge>
                        )}
                        <h1 className="text-4xl font-bold">{program.name}</h1>
                        <div className="flex items-center gap-6 text-lg text-white/80">
                            <span>📅 {program.duration_weeks} weeks</span>
                            <span className="font-bold text-white">{price}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid gap-8 lg:grid-cols-3">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Description */}
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">
                            About This Program
                        </h2>
                        <p className="text-slate-600 leading-relaxed">
                            {program.description ||
                                "No description available for this program."}
                        </p>
                    </Card>

                    {/* Milestones */}
                    {milestones.length > 0 && (
                        <Card className="p-6">
                            <h2 className="text-xl font-semibold text-slate-900 mb-4">
                                What You&apos;ll Learn
                            </h2>
                            <div className="space-y-3">
                                {milestones.map((milestone, index) => (
                                    <div
                                        key={milestone.id}
                                        className="flex items-start gap-3"
                                    >
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-sm font-medium">
                                            {index + 1}
                                        </span>
                                        <div>
                                            <h4 className="font-medium text-slate-900">
                                                {milestone.name}
                                            </h4>
                                            {milestone.criteria && (
                                                <p className="text-sm text-slate-600">
                                                    {milestone.criteria}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>

                {/* Sidebar - Available Cohorts */}
                <div className="space-y-6">
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">
                            Available Cohorts
                        </h2>
                        {cohorts.length === 0 ? (
                            <div className="text-center py-6 space-y-3">
                                <span className="text-4xl">📅</span>
                                <p className="text-slate-600">
                                    No open cohorts at the moment.
                                </p>
                                <p className="text-sm text-slate-500">
                                    Want to be notified when new cohorts open?
                                </p>
                                <Button variant="outline" size="sm">
                                    Get Notified
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {cohorts.map((cohort) => {
                                    const enrollment = getEnrollmentForCohort(
                                        cohort.id
                                    );
                                    const isEnrolled = !!enrollment;

                                    return (
                                        <div
                                            key={cohort.id}
                                            className="border rounded-lg p-4 hover:border-cyan-300 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <h4 className="font-semibold text-slate-900">
                                                    {cohort.name}
                                                </h4>
                                                {isEnrolled && (
                                                    <Badge className="bg-green-100 text-green-700">
                                                        Enrolled
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-sm text-slate-600 space-y-1">
                                                <p>
                                                    📅{" "}
                                                    {new Date(
                                                        cohort.start_date
                                                    ).toLocaleDateString()}{" "}
                                                    -{" "}
                                                    {new Date(
                                                        cohort.end_date
                                                    ).toLocaleDateString()}
                                                </p>
                                                {cohort.location_name && (
                                                    <p>📍 {cohort.location_name}</p>
                                                )}
                                                <p>👥 {cohort.capacity} spots</p>
                                            </div>
                                            <Link
                                                href={
                                                    isEnrolled
                                                        ? `/account/academy/enrollments/${enrollment?.id}`
                                                        : `/account/academy/cohorts/${cohort.id}`
                                                }
                                                className="block mt-3"
                                            >
                                                <Button
                                                    variant={
                                                        isEnrolled
                                                            ? "outline"
                                                            : undefined
                                                    }
                                                    className="w-full"
                                                >
                                                    {isEnrolled
                                                        ? "View Enrollment"
                                                        : "View Details"}
                                                </Button>
                                            </Link>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>

                    {/* Program Info */}
                    <Card className="p-6 bg-slate-50">
                        <h3 className="font-semibold text-slate-900 mb-3">
                            Program Details
                        </h3>
                        <dl className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-slate-500">Duration</dt>
                                <dd className="font-medium text-slate-900">
                                    {program.duration_weeks} weeks
                                </dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-slate-500">Level</dt>
                                <dd className="font-medium text-slate-900">
                                    {levelLabels[program.level]}
                                </dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-slate-500">Price</dt>
                                <dd className="font-medium text-cyan-600">{price}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-slate-500">Milestones</dt>
                                <dd className="font-medium text-slate-900">
                                    {milestones.length}
                                </dd>
                            </div>
                        </dl>
                    </Card>
                </div>
            </div>
        </div>
    );
}
