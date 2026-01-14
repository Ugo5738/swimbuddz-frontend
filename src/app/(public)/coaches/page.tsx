"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { Member, MembersApi } from "@/lib/members";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function PublicCoachesPage() {
    const [coaches, setCoaches] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCoaches = async () => {
            try {
                // Use the public endpoint (no auth required)
                const data = await MembersApi.listCoaches();
                setCoaches(data);
            } catch (error) {
                console.error("Failed to load coaches", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCoaches();
    }, []);

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <LoadingCard text="Loading coaches..." />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* Header */}
            <div className="space-y-4 mb-8">
                <Link
                    href="/community"
                    className="inline-flex items-center gap-1 text-sm text-cyan-600 hover:text-cyan-700"
                >
                    ← Back to Community
                </Link>
                <h1 className="text-4xl font-bold tracking-tight text-slate-900">
                    Meet Our Coaches
                </h1>
                <p className="text-lg text-slate-600 max-w-3xl">
                    Expert guidance from certified professionals to help you reach your swimming goals.
                </p>
            </div>

            {coaches.length === 0 ? (
                <Card className="p-12 text-center text-slate-500">
                    <p className="text-xl mb-2">No active coaches found at the moment.</p>
                    <p>Check back soon!</p>
                </Card>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {coaches.map((member) => {
                        const coach = member.coach_profile!;
                        const photoUrl = coach.coach_profile_photo_url || member.profile_photo_url;
                        const displayName = coach.display_name || `${member.first_name} ${member.last_name}`;

                        return (
                            <Link key={member.id} href={`/coaches/${member.id}`}>
                                <Card className="flex flex-col overflow-hidden transition-all hover:shadow-lg hover:border-cyan-200 cursor-pointer h-full">
                                    {/* Coach Photo */}
                                    <div className="aspect-[4/3] w-full bg-slate-100 relative">
                                        {photoUrl ? (
                                            <img
                                                src={photoUrl}
                                                alt={displayName}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-100 to-blue-100 text-cyan-600">
                                                <span className="text-5xl font-bold">
                                                    {member.first_name?.[0]}{member.last_name?.[0]}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-1 flex-col p-6">
                                        <div className="mb-4">
                                            <h3 className="text-xl font-bold text-slate-900">
                                                {displayName}
                                            </h3>
                                            {coach.coaching_years && (
                                                <p className="text-sm font-medium text-cyan-600">
                                                    {coach.coaching_years}+ Years Experience
                                                </p>
                                            )}
                                        </div>

                                        <div className="mb-4 flex-1 space-y-2">
                                            <p className="line-clamp-3 text-sm text-slate-600">
                                                {coach.short_bio || (coach.full_bio ? coach.full_bio.substring(0, 120) + "..." : "Certified swimming coach ready to help you achieve your goals.")}
                                            </p>

                                            {/* Specialties */}
                                            {coach.coaching_specialties && coach.coaching_specialties.length > 0 && (
                                                <div className="flex flex-wrap gap-2 pt-2">
                                                    {coach.coaching_specialties.slice(0, 3).map((spec, i) => (
                                                        <Badge key={i} variant="info" className="text-xs">
                                                            {spec}
                                                        </Badge>
                                                    ))}
                                                    {coach.coaching_specialties.length > 3 && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            +{coach.coaching_specialties.length - 3}
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-auto pt-4 border-t border-slate-100">
                                            <span className="text-sm font-medium text-cyan-600 flex items-center justify-center gap-1">
                                                View Profile →
                                            </span>
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* CTA Section */}
            <div className="mt-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 p-8 text-center text-white">
                <h2 className="text-2xl font-bold mb-3">Want to Join Our Coaching Team?</h2>
                <p className="text-emerald-50 mb-6 max-w-xl mx-auto">
                    Share your expertise and help others learn to swim. Apply to become a SwimBuddz coach today.
                </p>
                <Link href="/coach/apply">
                    <Button className="bg-white text-emerald-700 hover:bg-emerald-50">
                        Apply to Coach
                    </Button>
                </Link>
            </div>
        </div>
    );
}
