"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { Member, MembersApi } from "@/lib/members";
import { useEffect, useState } from "react";
// import { Badge } from "@/components/ui/Badge";
// import { Avatar } from "@/components/ui/Avatar";


// Assuming we have these components. If Badge/Avatar are missing, I'll use basic HTML.
// I'll check imports later or implement simple versions.
// Avatar usually exists in UI lib.
// Badge might need to be imported from ui/Badge or similar.

export default function CoachDirectoryPage() {
    const [coaches, setCoaches] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCoaches = async () => {
            try {
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

    if (loading) return <LoadingCard text="Loading coaches..." />;

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                    Meet Our Coaches
                </h1>
                <p className="text-slate-600">
                    Expert guidance from certified professionals to help you reach your goals.
                </p>
            </div>

            {coaches.length === 0 ? (
                <Card className="p-8 text-center text-slate-500">
                    <p>No active coaches found at the moment.</p>
                </Card>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {coaches.map((member) => {
                        const coach = member.coach_profile!;
                        return (
                            <Card key={member.id} className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
                                <div className="aspect-[4/3] w-full bg-slate-100 relative">
                                    {/* Coach Photo */}
                                    {coach.coach_profile_photo_url ? (
                                        <img
                                            src={coach.coach_profile_photo_url}
                                            alt={coach.display_name || member.first_name}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center bg-cyan-100 text-cyan-600">
                                            <span className="text-4xl">🏊</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-1 flex-col p-6">
                                    <div className="mb-4">
                                        <h3 className="text-xl font-bold text-slate-900">
                                            {coach.display_name || `${member.first_name} ${member.last_name}`}
                                        </h3>
                                        <p className="text-sm font-medium text-cyan-600">
                                            {coach.coaching_years}+ Years Experience
                                        </p>
                                    </div>

                                    <div className="mb-4 flex-1 space-y-2">
                                        <p className="line-clamp-3 text-sm text-slate-600">
                                            {coach.short_bio || (coach.full_bio ? coach.full_bio.substring(0, 100) + "..." : "No bio available.")}
                                        </p>

                                        {/* Specialties */}
                                        {coach.coaching_specialties && coach.coaching_specialties.length > 0 && (
                                            <div className="flex flex-wrap gap-2 pt-2">
                                                {coach.coaching_specialties.slice(0, 3).map((spec, i) => (
                                                    <span key={i} className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                                                        {spec}
                                                    </span>
                                                ))}
                                                {coach.coaching_specialties.length > 3 && (
                                                    <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-xs text-slate-500">
                                                        +{coach.coaching_specialties.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-auto pt-4">
                                        {/* Actions? View Profile? */}
                                        <Button variant="outline" className="w-full">
                                            View Profile
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
