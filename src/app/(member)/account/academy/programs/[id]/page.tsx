"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
    AcademyApi,
    Cohort,
    Enrollment,
    Milestone,
    Program,
    ProgramLevel,
} from "@/lib/academy";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
    const [isInterested, setIsInterested] = useState(false);
    const [interestLoading, setInterestLoading] = useState(false);

    useEffect(() => {
        if (programId) {
            loadData();
        }
    }, [programId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [programData, milestonesData, cohortsData, enrollmentsData, interestData] =
                await Promise.all([
                    AcademyApi.getProgram(programId),
                    AcademyApi.listMilestones(programId),
                    AcademyApi.getEnrollableCohorts(programId),
                    AcademyApi.getMyEnrollments().catch(() => []),
                    AcademyApi.checkProgramInterest(programId).catch(() => ({ registered: false })),
                ]);

            setProgram(programData);
            setMilestones(milestonesData);
            setCohorts(cohortsData);
            setEnrollments(enrollmentsData);
            setIsInterested(interestData.registered);
        } catch (error) {
            console.error("Failed to load program:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleNotifyClick = async () => {
        setInterestLoading(true);
        try {
            if (isInterested) {
                const result = await AcademyApi.removeProgramInterest(programId);
                setIsInterested(false);
                toast.success(result.message);
            } else {
                const result = await AcademyApi.registerProgramInterest(programId);
                setIsInterested(true);
                toast.success(result.message);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Something went wrong";
            toast.error(message);
        } finally {
            setInterestLoading(false);
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
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
                <p className="text-lg font-medium text-slate-600">Loading program...</p>
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
        <div className="space-y-4 md:space-y-8">
            {/* Breadcrumb */}
            <Link
                href="/account/academy/browse"
                className="text-sm text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
            >
                ← Browse Programs
            </Link>

            {/* Hero Section */}
            <div className="relative rounded-xl md:rounded-2xl overflow-hidden">
                <div className="relative h-40 md:h-64 bg-gradient-to-br from-cyan-500 to-blue-600">
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
                <div className="absolute inset-0 flex items-end p-4 md:p-8 bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
                    <div className="text-white space-y-1 md:space-y-2">
                        <div className="flex flex-wrap gap-2">
                            <Badge className={levelColors[program.level]}>
                                {levelLabels[program.level]}
                            </Badge>
                            {isEnrolledInProgram && (
                                <Badge className="bg-green-500 text-white">
                                    ✓ Enrolled
                                </Badge>
                            )}
                        </div>
                        <h1 className="text-2xl md:text-4xl font-bold">{program.name}</h1>
                        <div className="flex items-center gap-4 md:gap-6 text-sm md:text-lg text-white/80">
                            <span>📅 {program.duration_weeks} weeks</span>
                            <span className="font-bold text-white">{price}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid gap-4 md:gap-8 lg:grid-cols-3">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-4 md:space-y-8">
                    {/* Description */}
                    <Card className="p-4 md:p-6">
                        <h2 className="text-lg md:text-xl font-semibold text-slate-900 mb-3 md:mb-4">
                            About This Program
                        </h2>
                        <p className="text-sm md:text-base text-slate-600 leading-relaxed">
                            {program.description ||
                                "No description available for this program."}
                        </p>
                    </Card>

                    {/* Milestones */}
                    {milestones.length > 0 && (
                        <Card className="p-4 md:p-6">
                            <h2 className="text-lg md:text-xl font-semibold text-slate-900 mb-3 md:mb-4">
                                What You&apos;ll Learn
                            </h2>
                            <div className="space-y-3">
                                {milestones.map((milestone, index) => (
                                    <div
                                        key={milestone.id}
                                        className="flex items-start gap-3"
                                    >
                                        <span className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs md:text-sm font-medium">
                                            {index + 1}
                                        </span>
                                        <div>
                                            <h4 className="font-medium text-slate-900 text-sm md:text-base">
                                                {milestone.name}
                                            </h4>
                                            {milestone.criteria && (
                                                <p className="text-xs md:text-sm text-slate-600">
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
                <div className="space-y-4 md:space-y-6">
                    <Card className="p-4 md:p-6">
                        <h2 className="text-lg md:text-xl font-semibold text-slate-900 mb-3 md:mb-4">
                            Available Cohorts
                        </h2>
                        {cohorts.length === 0 ? (
                            <div className="text-center py-4 md:py-6 space-y-3">
                                <span className="text-3xl md:text-4xl">📅</span>
                                <p className="text-sm md:text-base text-slate-600">
                                    No cohorts available to join right now.
                                </p>
                                <p className="text-xs md:text-sm text-slate-500">
                                    {isInterested
                                        ? "You'll be notified when new cohorts open!"
                                        : "Want to be notified when new cohorts open?"}
                                </p>
                                <Button
                                    variant={isInterested ? "secondary" : "outline"}
                                    size="sm"
                                    onClick={handleNotifyClick}
                                    disabled={interestLoading}
                                >
                                    {interestLoading
                                        ? "..."
                                        : isInterested
                                            ? "✓ Notifications On"
                                            : "Get Notified"}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3 md:space-y-4">
                                {cohorts.map((cohort) => {
                                    const enrollment = getEnrollmentForCohort(
                                        cohort.id
                                    );
                                    const isEnrolled = !!enrollment;

                                    return (
                                        <div
                                            key={cohort.id}
                                            className="border rounded-lg p-3 md:p-4 hover:border-cyan-300 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <h4 className="font-semibold text-slate-900 text-sm md:text-base">
                                                    {cohort.name}
                                                </h4>
                                                {isEnrolled && (
                                                    <Badge className="bg-green-100 text-green-700 text-xs">
                                                        Enrolled
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-xs md:text-sm text-slate-600 space-y-1">
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
                                                    size="sm"
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
                    <Card className="p-4 md:p-6 bg-slate-50">
                        <h3 className="font-semibold text-slate-900 mb-3 text-sm md:text-base">
                            Program Details
                        </h3>
                        <dl className="space-y-2 text-xs md:text-sm">
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
