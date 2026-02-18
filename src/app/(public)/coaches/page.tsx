"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { Member, MembersApi } from "@/lib/members";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function PublicCoachesPage() {
  const router = useRouter();
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
    return <LoadingPage text="Loading coaches..." />;
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <header className="space-y-1">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-sm text-cyan-600 hover:text-cyan-700 mb-2"
        >
          ← Back
        </button>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
          Meet Our Coaches
        </h1>
        <p className="text-sm md:text-base text-slate-600">
          Expert guidance from certified professionals to help you reach your
          swimming goals.
        </p>
      </header>

      {coaches.length === 0 ? (
        <Card className="p-8 md:p-12 text-center text-slate-500">
          <p className="text-lg md:text-xl mb-2">
            No active coaches found at the moment.
          </p>
          <p>Check back soon!</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {coaches.map((member) => {
            const coach = member.coach_profile!;
            const photoUrl =
              coach.coach_profile_photo_url || member.profile_photo_url;
            const displayName =
              coach.display_name || `${member.first_name} ${member.last_name}`;

            return (
              <Link key={member.id} href={`/coaches/${member.id}`}>
                <Card className="overflow-hidden transition-all hover:shadow-lg hover:border-cyan-200 cursor-pointer h-full bg-gradient-to-br from-slate-800 via-slate-900 to-cyan-900">
                  {/* Coach Photo - Smaller on mobile */}
                  <div className="aspect-square sm:aspect-[4/3] w-full relative">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={displayName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-500/20 to-blue-600/20">
                        <span className="text-6xl sm:text-5xl font-bold text-cyan-300/80">
                          {member.first_name?.[0]}
                          {member.last_name?.[0]}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 md:p-5 space-y-3">
                    <div>
                      <h3 className="text-lg md:text-xl font-bold text-white">
                        {displayName}
                      </h3>
                      {coach.coaching_years && (
                        <p className="text-sm font-medium text-cyan-400">
                          {coach.coaching_years}+ Years Experience
                        </p>
                      )}
                    </div>

                    <p className="line-clamp-2 text-sm text-slate-300">
                      {coach.short_bio ||
                        (coach.full_bio
                          ? coach.full_bio.substring(0, 100) + "..."
                          : "Certified swimming coach ready to help you achieve your goals.")}
                    </p>

                    {/* Specialties */}
                    {coach.coaching_specialties &&
                      coach.coaching_specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {coach.coaching_specialties
                            .slice(0, 3)
                            .map((spec, i) => (
                              <Badge
                                key={i}
                                className="text-xs bg-white/10 text-white border-white/20"
                              >
                                {spec}
                              </Badge>
                            ))}
                          {coach.coaching_specialties.length > 3 && (
                            <Badge className="text-xs bg-white/10 text-white border-white/20">
                              +{coach.coaching_specialties.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                    <div className="pt-2 border-t border-white/10">
                      <span className="text-sm font-medium text-cyan-400 flex items-center justify-center gap-1">
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
      <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 p-6 md:p-8 text-center text-white">
        <h2 className="text-xl md:text-2xl font-bold mb-2 md:mb-3">
          Want to Join Our Coaching Team?
        </h2>
        <p className="text-emerald-50 mb-4 md:mb-6 max-w-xl mx-auto text-sm md:text-base">
          Share your expertise and help others learn to swim. Apply to become a
          SwimBuddz coach today.
        </p>
        <Link href="/coach/apply">
          <Button
            variant="secondary"
            className="!bg-white !text-emerald-700 hover:!bg-emerald-50 font-semibold"
          >
            Apply to Coach
          </Button>
        </Link>
      </div>
    </div>
  );
}
