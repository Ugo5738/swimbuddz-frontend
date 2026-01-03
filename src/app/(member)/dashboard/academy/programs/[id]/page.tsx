"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AcademyApi, Program, Cohort, Milestone, Enrollment } from "@/lib/academy";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { ArrowLeft, Clock, Users, BookOpen, CheckCircle } from "lucide-react";

type CohortWithEnrollment = Cohort & {
    enrolledCount?: number;
};

export default function ProgramDetailPage() {
    const params = useParams();
    const router = useRouter();
    const programId = params.id as string;

    const [program, setProgram] = useState<Program | null>(null);
    const [cohorts, setCohorts] = useState<CohortWithEnrollment[]>([]);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [enrolledCohortIds, setEnrolledCohortIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const [programData, cohortsData, milestonesData] = await Promise.all([
                    AcademyApi.getProgram(programId),
                    AcademyApi.getOpenCohorts().then(c => c.filter(cohort => cohort.program_id === programId)),
                    AcademyApi.listMilestones(programId),
                ]);

                setProgram(programData);
                setCohorts(cohortsData);
                setMilestones(milestonesData);

                // Check which cohorts user is enrolled in
                try {
                    const myEnrollments = await AcademyApi.getMyEnrollments();
                    const enrolledIds = new Set(myEnrollments.map((e: Enrollment) => e.cohort_id).filter(Boolean) as string[]);
                    setEnrolledCohortIds(enrolledIds);
                } catch {
                    // User may not have enrollments, which is fine
                }
            } catch (error) {
                console.error("Failed to load program", error);
                router.push("/dashboard/academy/browse");
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [programId, router]);

    if (loading || !program) {
        return <LoadingCard text="Loading program..." />;
    }

    // Parse curriculum_json
    const curriculum = program.curriculum_json?.weeks || [];

    return (
        <div className="space-y-8">
            {/* Back Link */}
            <Link
                href="/dashboard/academy/browse"
                className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700"
            >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Programs
            </Link>

            {/* Program Header */}
            <div
                className="relative rounded-xl overflow-hidden text-white p-8 min-h-[200px] flex flex-col justify-end"
                style={{
                    backgroundImage: program.cover_image_url
                        ? `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.8)), url(${program.cover_image_url})`
                        : 'linear-gradient(to bottom right, rgb(51, 65, 85), rgb(15, 23, 42))',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                <Badge variant="default" className="w-fit mb-3 bg-white/20 backdrop-blur-sm">
                    {program.level.replace("_", " ")}
                </Badge>
                <h1 className="text-3xl font-bold">{program.name}</h1>
                <p className="text-slate-200 mt-2 max-w-2xl">{program.description}</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 text-center">
                    <Clock className="w-6 h-6 mx-auto text-cyan-600 mb-2" />
                    <div className="text-2xl font-bold text-slate-900">{program.duration_weeks}</div>
                    <div className="text-sm text-slate-500">Weeks</div>
                </Card>
                <Card className="p-4 text-center">
                    <Users className="w-6 h-6 mx-auto text-cyan-600 mb-2" />
                    <div className="text-2xl font-bold text-slate-900">{program.default_capacity}</div>
                    <div className="text-sm text-slate-500">Max Students</div>
                </Card>
                <Card className="p-4 text-center">
                    <BookOpen className="w-6 h-6 mx-auto text-cyan-600 mb-2" />
                    <div className="text-2xl font-bold text-slate-900">{curriculum.length || "—"}</div>
                    <div className="text-sm text-slate-500">Curriculum Weeks</div>
                </Card>
                <Card className="p-4 text-center">
                    <CheckCircle className="w-6 h-6 mx-auto text-cyan-600 mb-2" />
                    <div className="text-2xl font-bold text-slate-900">{milestones.length}</div>
                    <div className="text-sm text-slate-500">Milestones</div>
                </Card>
            </div>

            {/* Price & Enroll CTA */}
            <Card className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <div className="text-sm text-slate-500">Program Price</div>
                    <div className="text-3xl font-bold text-slate-900">
                        ₦{(program.price_amount || 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-slate-500">{program.billing_type?.replace("_", " ") || "One-time"}</div>
                </div>
                {cohorts.length > 0 ? (
                    <div className="flex flex-col items-end gap-2">
                        <span className="text-sm text-green-600 font-medium">
                            {cohorts.length} cohort{cohorts.length > 1 ? "s" : ""} available
                        </span>
                        <Link href="#cohorts">
                            <Button size="lg">View Available Cohorts</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="text-sm text-slate-500">No open cohorts currently</div>
                )}
            </Card>

            {/* Curriculum */}
            {curriculum.length > 0 && (
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-slate-900">Curriculum</h2>
                    <div className="space-y-3">
                        {curriculum.map((week: { week: number; theme?: string; objectives?: string; lessons?: { title: string }[] }) => (
                            <Card key={week.week} className="p-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0">
                                        <span className="text-cyan-700 font-bold">{week.week}</span>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-slate-900">
                                            Week {week.week}: {week.theme || "Training"}
                                        </h3>
                                        {week.objectives && (
                                            <p className="text-sm text-slate-600 mt-1">{week.objectives}</p>
                                        )}
                                        {week.lessons && week.lessons.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {week.lessons.map((lesson, idx) => (
                                                    <span key={idx} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                                        {lesson.title}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </section>
            )}

            {/* Milestones */}
            {milestones.length > 0 && (
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-slate-900">Milestones</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        {milestones.map((milestone, index) => (
                            <Card key={milestone.id} className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-cyan-600 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-slate-900">{milestone.name}</h3>
                                        {milestone.criteria && (
                                            <p className="text-sm text-slate-600 mt-1">{milestone.criteria}</p>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </section>
            )}

            {/* Available Cohorts */}
            <section id="cohorts" className="space-y-4 scroll-mt-8">
                <h2 className="text-xl font-semibold text-slate-900">Available Cohorts</h2>
                {cohorts.length === 0 ? (
                    <Card className="p-6 text-center">
                        <p className="text-slate-600">No open cohorts for this program right now.</p>
                        <p className="text-sm text-slate-500 mt-2">Check back soon for new enrollment opportunities!</p>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {cohorts.map(cohort => (
                            <Card key={cohort.id} className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-semibold text-slate-900">{cohort.name}</h3>
                                        <p className="text-sm text-slate-500">
                                            Starts {new Date(cohort.start_date).toLocaleDateString(undefined, {
                                                month: "long",
                                                day: "numeric",
                                                year: "numeric"
                                            })}
                                        </p>
                                    </div>
                                    {enrolledCohortIds.has(cohort.id) ? (
                                        <Badge variant="success">✓ Enrolled</Badge>
                                    ) : (
                                        <Badge variant={cohort.capacity > 5 ? "success" : "warning"}>
                                            {cohort.capacity} spots
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="text-lg font-bold text-cyan-600">
                                        ₦{(cohort.price_override ?? program.price_amount ?? 0).toLocaleString()}
                                    </div>
                                    {enrolledCohortIds.has(cohort.id) ? (
                                        <Link href={`/dashboard/academy/cohorts/${cohort.id}`}>
                                            <Button variant="outline">View Details</Button>
                                        </Link>
                                    ) : (
                                        <Link href={`/upgrade/academy/cohort?cohort_id=${cohort.id}`}>
                                            <Button>Enroll</Button>
                                        </Link>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
