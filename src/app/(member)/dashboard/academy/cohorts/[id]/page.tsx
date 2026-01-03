"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AcademyApi, Program, Cohort, Enrollment } from "@/lib/academy";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { ArrowLeft, Calendar, MapPin, Users, Clock } from "lucide-react";

export default function CohortDetailPage() {
    const params = useParams();
    const router = useRouter();
    const cohortId = params.id as string;

    const [cohort, setCohort] = useState<Cohort | null>(null);
    const [program, setProgram] = useState<Program | null>(null);
    const [myEnrollment, setMyEnrollment] = useState<Enrollment | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                // Fetch cohort details - we need a getCohort endpoint
                // For now, get all open cohorts and find the one
                const cohorts = await AcademyApi.getOpenCohorts();
                const foundCohort = cohorts.find(c => c.id === cohortId);

                if (!foundCohort) {
                    router.push("/dashboard/academy/browse");
                    return;
                }

                setCohort(foundCohort);

                // Fetch program
                const programData = await AcademyApi.getProgram(foundCohort.program_id);
                setProgram(programData);

                // Check if user is enrolled
                try {
                    const enrollments = await AcademyApi.getMyEnrollments();
                    const enrolled = enrollments.find(e => e.cohort_id === cohortId);
                    if (enrolled) {
                        setMyEnrollment(enrolled);
                    }
                } catch {
                    // User may not be enrolled, which is fine
                }
            } catch (error) {
                console.error("Failed to load cohort", error);
                router.push("/dashboard/academy/browse");
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [cohortId, router]);

    if (loading || !cohort || !program) {
        return <LoadingCard text="Loading cohort..." />;
    }

    const isEnrolled = !!myEnrollment;
    const price = cohort.price_override ?? program.price_amount ?? 0;

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

            {/* Cohort Header */}
            <div
                className="relative rounded-xl overflow-hidden text-white p-8 min-h-[180px] flex flex-col justify-end"
                style={{
                    backgroundImage: program.cover_image_url
                        ? `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.8)), url(${program.cover_image_url})`
                        : 'linear-gradient(to bottom right, rgb(51, 65, 85), rgb(15, 23, 42))',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                <Badge variant="default" className="w-fit mb-2 bg-white/20 backdrop-blur-sm">
                    {program.level.replace("_", " ")}
                </Badge>
                <h1 className="text-2xl font-bold">{cohort.name}</h1>
                <Link href={`/dashboard/academy/programs/${program.id}`} className="text-slate-200 hover:text-white mt-1">
                    {program.name} →
                </Link>
            </div>

            {/* Enrollment Status */}
            {isEnrolled && (
                <Card className="p-4 bg-green-50 border-green-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <span className="text-green-600 text-lg">✓</span>
                        </div>
                        <div>
                            <p className="font-medium text-green-800">You're enrolled in this cohort!</p>
                            <p className="text-sm text-green-600">
                                Status: {myEnrollment?.status.replace("_", " ")} | Payment: {myEnrollment?.payment_status.replace("_", " ")}
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Quick Info Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-cyan-600" />
                        <div>
                            <div className="text-sm text-slate-500">Starts</div>
                            <div className="font-semibold text-slate-900">
                                {new Date(cohort.start_date).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric"
                                })}
                            </div>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-cyan-600" />
                        <div>
                            <div className="text-sm text-slate-500">Duration</div>
                            <div className="font-semibold text-slate-900">{program.duration_weeks} weeks</div>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-cyan-600" />
                        <div>
                            <div className="text-sm text-slate-500">Capacity</div>
                            <div className="font-semibold text-slate-900">{cohort.capacity} spots</div>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-cyan-600" />
                        <div>
                            <div className="text-sm text-slate-500">Location</div>
                            <div className="font-semibold text-slate-900">
                                {cohort.location_name || cohort.location_type || "TBD"}
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Price & Enroll */}
            {!isEnrolled && (
                <Card className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <div className="text-sm text-slate-500">Cohort Price</div>
                        <div className="text-3xl font-bold text-slate-900">₦{price.toLocaleString()}</div>
                        <div className="text-sm text-slate-500">One-time payment</div>
                    </div>
                    <Link href={`/upgrade/academy/cohort?cohort_id=${cohort.id}`}>
                        <Button size="lg">Enroll Now</Button>
                    </Link>
                </Card>
            )}

            {/* Program Info */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-900">About This Program</h2>
                <Card className="p-5">
                    <p className="text-slate-600">{program.description}</p>
                    <div className="mt-4">
                        <Link
                            href={`/dashboard/academy/programs/${program.id}`}
                            className="text-cyan-600 font-medium hover:text-cyan-700"
                        >
                            View full program details →
                        </Link>
                    </div>
                </Card>
            </section>

            {/* Schedule Info */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-900">Schedule</h2>
                <Card className="p-5">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <div className="text-sm text-slate-500">Start Date</div>
                            <div className="font-medium text-slate-900">
                                {new Date(cohort.start_date).toLocaleDateString(undefined, {
                                    weekday: "long",
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric"
                                })}
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-slate-500">End Date</div>
                            <div className="font-medium text-slate-900">
                                {new Date(cohort.end_date).toLocaleDateString(undefined, {
                                    weekday: "long",
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric"
                                })}
                            </div>
                        </div>
                    </div>
                    {cohort.location_address && (
                        <div className="mt-4 pt-4 border-t">
                            <div className="text-sm text-slate-500">Location</div>
                            <div className="font-medium text-slate-900">{cohort.location_name}</div>
                            <div className="text-sm text-slate-600">{cohort.location_address}</div>
                        </div>
                    )}
                </Card>
            </section>
        </div>
    );
}
