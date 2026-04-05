"use client";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { MembersApi, type Member } from "@/lib/members";
import Link from "next/link";
import { useEffect, useState } from "react";

const MAX_COACHES = 3;

export function CoachSpotlight() {
  const [coaches, setCoaches] = useState<Member[] | null>(null);

  useEffect(() => {
    MembersApi.listCoaches()
      .then((list) => setCoaches(list ?? []))
      .catch(() => setCoaches([]));
  }, []);

  // Skeleton
  if (coaches === null) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-0 overflow-hidden">
            <div className="aspect-[4/3] bg-slate-100 animate-pulse" />
            <div className="p-4 space-y-2">
              <div className="h-4 w-2/3 bg-slate-100 animate-pulse rounded" />
              <div className="h-3 w-1/3 bg-slate-100 animate-pulse rounded" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // Empty state (only shown if zero coaches — which should be rare in prod)
  if (coaches.length === 0) {
    return (
      <Card className="p-6 md:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="flex-shrink-0 w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white text-3xl shadow-md">
            🏊
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="text-lg font-semibold text-slate-900">
              Coach profiles launch with your cohort
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
              When you reserve a spot, you&apos;ll see your coach&apos;s profile, credentials, and a
              short welcome video — so you know exactly who you&apos;re learning from before day
              one.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const featured = coaches.slice(0, MAX_COACHES);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {featured.map((member) => {
          const coach = member.coach_profile;
          if (!coach) return null;
          const photoUrl = coach.coach_profile_photo_url || member.profile_photo_url;
          const displayName =
            coach.display_name ||
            `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim() ||
            "Coach";
          const initials = `${member.first_name?.[0] ?? ""}${member.last_name?.[0] ?? ""}` || "C";

          return (
            <Link key={member.id} href={`/coaches/${member.id}`} className="group">
              <Card className="overflow-hidden p-0 h-full bg-gradient-to-br from-slate-800 via-slate-900 to-cyan-900 transition-all hover:shadow-lg hover:-translate-y-0.5">
                <div className="aspect-[4/3] w-full relative">
                  {photoUrl ? (
                    <img src={photoUrl} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="text-5xl font-bold text-cyan-300/80">{initials}</span>
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <div>
                    <h3 className="text-base font-bold text-white leading-tight">{displayName}</h3>
                    {coach.coaching_years != null && (
                      <p className="text-xs font-medium text-cyan-400 mt-0.5">
                        {coach.coaching_years}+ years experience
                      </p>
                    )}
                  </div>
                  {coach.short_bio && (
                    <p className="line-clamp-2 text-xs text-slate-300 leading-relaxed">
                      {coach.short_bio}
                    </p>
                  )}
                  {coach.coaching_specialties && coach.coaching_specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {coach.coaching_specialties.slice(0, 2).map((spec, i) => (
                        <Badge
                          key={i}
                          className="text-[10px] bg-white/10 text-white border-white/20"
                        >
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
      {coaches.length > MAX_COACHES && (
        <div>
          <Link
            href="/coaches"
            className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-700 hover:text-cyan-800"
          >
            Browse all {coaches.length} coaches <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}
