"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { AcademyApi, Cohort, CohortStatus } from "@/lib/academy";
import { Member, MembersApi } from "@/lib/members";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CoachProfilePage() {
    const params = useParams();
    const router = useRouter();
    const coachId = params.id as string;

    const [coach, setCoach] = useState<Member | null>(null);
    const [cohorts, setCohorts] = useState<Cohort[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (coachId) {
            loadCoachData();
        }
    }, [coachId]);

    const loadCoachData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [coachData, cohortsData] = await Promise.all([
                MembersApi.getCoach(coachId),
                AcademyApi.listCohortsByCoach(coachId),
            ]);

            setCoach(coachData);
            setCohorts(cohortsData);
        } catch (err: any) {
            console.error("Failed to load coach profile:", err);
            setError(err.message || "Coach not found");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <LoadingPage text="Loading coach profile..." />;
    }

    if (error || !coach) {
        return (
            <div className="max-w-4xl mx-auto">
                <Card className="p-12 text-center">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Coach Not Found</h2>
                    <p className="text-slate-600 mb-4">
                        {error || "The coach you're looking for doesn't exist or is not currently active."}
                    </p>
                    <Button variant="outline" onClick={() => router.back()}>
                        ← Back to Coaches
                    </Button>
                </Card>
            </div>
        );
    }

    const coachProfile = coach.coach_profile;
    const displayName = coachProfile?.display_name || `${coach.first_name} ${coach.last_name}`;
    const photoUrl = coachProfile?.coach_profile_photo_url || coach.profile_photo_url;

    // Separate current and past cohorts
    const currentCohorts = cohorts.filter(c =>
        c.status === CohortStatus.OPEN || c.status === CohortStatus.ACTIVE
    );
    const pastCohorts = cohorts.filter(c =>
        c.status === CohortStatus.COMPLETED
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Back Link */}
            <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-1 text-sm text-cyan-600 hover:text-cyan-700"
            >
                ← Back to Coaches
            </button>

            {/* Hero Section */}
            <Card className="overflow-hidden">
                <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-cyan-900 p-6 md:p-8">
                    <div className="flex flex-col items-center text-center">
                        {/* Photo */}
                        <div className="mb-4">
                            {photoUrl ? (
                                <img
                                    src={photoUrl}
                                    alt={displayName}
                                    className="w-28 h-28 md:w-32 md:h-32 rounded-full object-cover border-4 border-cyan-400/30 shadow-xl"
                                />
                            ) : (
                                <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-3xl md:text-4xl font-bold shadow-xl">
                                    {coach.first_name?.[0]}{coach.last_name?.[0]}
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">{displayName}</h1>
                        {coachProfile?.coaching_years && (
                            <p className="text-cyan-300 text-base md:text-lg mb-4">
                                {coachProfile.coaching_years}+ Years of Coaching Experience
                            </p>
                        )}

                        {/* Specialties */}
                        {coachProfile?.coaching_specialties && coachProfile.coaching_specialties.length > 0 && (
                            <div className="flex flex-wrap gap-2 justify-center max-w-md">
                                {coachProfile.coaching_specialties.map((spec, i) => (
                                    <Badge
                                        key={i}
                                        className="bg-white/10 text-white border-white/20 text-xs"
                                    >
                                        {spec}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Bio */}
                    {(coachProfile?.full_bio || coachProfile?.short_bio) && (
                        <Card className="p-6">
                            <h2 className="text-xl font-semibold text-slate-900 mb-4">About</h2>
                            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                                {coachProfile.full_bio || coachProfile.short_bio}
                            </p>
                        </Card>
                    )}

                    {/* Current Cohorts */}
                    {currentCohorts.length > 0 && (
                        <Card className="p-6">
                            <h2 className="text-xl font-semibold text-slate-900 mb-4">
                                Currently Teaching
                            </h2>
                            <div className="space-y-4">
                                {currentCohorts.map((cohort) => (
                                    <Link
                                        key={cohort.id}
                                        href={`/account/academy/cohorts/${cohort.id}`}
                                        className="block"
                                    >
                                        <div className="border rounded-lg p-4 hover:border-cyan-300 hover:bg-cyan-50/50 transition-colors">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="font-medium text-slate-900">
                                                        {cohort.program?.name || cohort.name}
                                                    </h3>
                                                    <p className="text-sm text-slate-500">
                                                        {cohort.name}
                                                    </p>
                                                </div>
                                                <Badge
                                                    variant={cohort.status === CohortStatus.OPEN ? "success" : "info"}
                                                >
                                                    {cohort.status === CohortStatus.OPEN ? "Enrolling" : "Active"}
                                                </Badge>
                                            </div>
                                            <div className="mt-2 text-sm text-slate-500">
                                                {new Date(cohort.start_date).toLocaleDateString("en-NG", {
                                                    month: "short",
                                                    day: "numeric",
                                                })} - {new Date(cohort.end_date).toLocaleDateString("en-NG", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                })}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Past Cohorts */}
                    {pastCohorts.length > 0 && (
                        <Card className="p-6">
                            <h2 className="text-xl font-semibold text-slate-900 mb-4">
                                Past Cohorts
                            </h2>
                            <div className="space-y-3">
                                {pastCohorts.slice(0, 5).map((cohort) => (
                                    <div
                                        key={cohort.id}
                                        className="border-l-4 border-slate-200 pl-4 py-2"
                                    >
                                        <h3 className="font-medium text-slate-900">
                                            {cohort.program?.name || cohort.name}
                                        </h3>
                                        <p className="text-sm text-slate-500">
                                            {new Date(cohort.start_date).toLocaleDateString("en-NG", {
                                                month: "short",
                                                year: "numeric",
                                            })} - {new Date(cohort.end_date).toLocaleDateString("en-NG", {
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </p>
                                    </div>
                                ))}
                                {pastCohorts.length > 5 && (
                                    <p className="text-sm text-slate-500 italic">
                                        + {pastCohorts.length - 5} more cohorts
                                    </p>
                                )}
                            </div>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Credentials */}
                    <Card className="p-6">
                        <h3 className="font-semibold text-slate-900 mb-4">Credentials</h3>

                        {/* Certifications */}
                        {coachProfile?.certifications && coachProfile.certifications.length > 0 && (
                            <div className="mb-4">
                                <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wide">
                                    Certifications
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {coachProfile.certifications.map((cert, i) => (
                                        <Badge key={i} variant="info" className="text-xs">
                                            {cert}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* CPR Training */}
                        {coachProfile?.has_cpr_training && (
                            <div className="mb-4">
                                <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wide">
                                    Safety Training
                                </p>
                                <Badge variant="success" className="text-xs">
                                    ✓ CPR Certified
                                </Badge>
                            </div>
                        )}

                        {/* Age Groups */}
                        {coachProfile?.age_groups_taught && coachProfile.age_groups_taught.length > 0 && (
                            <div className="mb-4">
                                <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wide">
                                    Age Groups
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {coachProfile.age_groups_taught.map((age, i) => (
                                        <Badge key={i} variant="outline" className="text-xs">
                                            {age}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Languages */}
                        {coachProfile?.languages_spoken && coachProfile.languages_spoken.length > 0 && (
                            <div>
                                <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wide">
                                    Languages
                                </p>
                                <p className="text-sm text-slate-700">
                                    {coachProfile.languages_spoken.join(", ")}
                                </p>
                            </div>
                        )}
                    </Card>

                    {/* Stats */}
                    <Card className="p-6 bg-cyan-50 border-cyan-100">
                        <h3 className="font-semibold text-slate-900 mb-4">Experience</h3>
                        <dl className="space-y-3">
                            {coachProfile?.coaching_years && (
                                <div className="flex justify-between">
                                    <dt className="text-sm text-slate-600">Years Coaching</dt>
                                    <dd className="font-semibold text-cyan-700">
                                        {coachProfile.coaching_years}+
                                    </dd>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <dt className="text-sm text-slate-600">Total Cohorts</dt>
                                <dd className="font-semibold text-cyan-700">
                                    {cohorts.length}
                                </dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-sm text-slate-600">Completed</dt>
                                <dd className="font-semibold text-cyan-700">
                                    {pastCohorts.length}
                                </dd>
                            </div>
                        </dl>
                    </Card>
                </div>
            </div>
        </div>
    );
}
