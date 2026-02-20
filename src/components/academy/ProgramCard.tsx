"use client";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Cohort, CohortStatus, Program, ProgramLevel } from "@/lib/academy";
import Image from "next/image";
import Link from "next/link";

interface ProgramCardProps {
  program: Program;
  enrolledProgramIds?: string[];
  /** Open/active cohorts for this program — pass from parent to avoid N+1 */
  cohorts?: Cohort[];
}

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

export function ProgramCard({
  program,
  enrolledProgramIds = [],
  cohorts = [],
}: ProgramCardProps) {
  const isEnrolled = enrolledProgramIds.includes(program.id);
  const price = program.price_amount
    ? `₦${program.price_amount.toLocaleString()}`
    : "Free";

  const openCohorts = cohorts.filter(
    (c) => c.status === CohortStatus.OPEN || c.status === CohortStatus.ACTIVE,
  );
  const nextCohort = openCohorts.sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
  )[0];

  const hasSpots = openCohorts.length > 0;
  const totalSpots = openCohorts.reduce((s, c) => s + c.capacity, 0);
  const urgency = totalSpots > 0 && totalSpots <= 5;

  return (
    <Link href={`/account/academy/programs/${program.id}`}>
      <Card className="group flex h-full flex-col overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer">
        {/* Cover Image */}
        <div className="relative h-44 flex-shrink-0 bg-gradient-to-br from-cyan-500 to-blue-600">
          {program.cover_image_url ? (
            <Image
              src={program.cover_image_url}
              alt={program.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl opacity-30">🏊</span>
            </div>
          )}
          {/* Level badge */}
          <div className="absolute left-3 top-3">
            <Badge className={levelColors[program.level]}>
              {levelLabels[program.level]}
            </Badge>
          </div>
          {/* Enrolled badge */}
          {isEnrolled && (
            <div className="absolute right-3 top-3">
              <Badge className="bg-green-500 text-white">✓ Enrolled</Badge>
            </div>
          )}
          {/* Availability pill — bottom of image */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            {hasSpots ? (
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm ${
                  urgency
                    ? "bg-orange-500/90 text-white"
                    : "bg-black/40 text-white"
                }`}
              >
                {urgency ? `⚠️ Only ${totalSpots} spots left` : `${openCohorts.length} cohort${openCohorts.length > 1 ? "s" : ""} open`}
              </span>
            ) : (
              <span className="rounded-full bg-black/40 px-2.5 py-1 text-xs font-medium text-white/70 backdrop-blur-sm">
                No cohorts open
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-5">
          <h3 className="text-base font-bold text-slate-900 line-clamp-2 transition-colors group-hover:text-cyan-600">
            {program.name}
          </h3>

          {program.description && (
            <p className="mt-1.5 flex-1 text-sm text-slate-500 line-clamp-2">
              {program.description}
            </p>
          )}

          {/* Next cohort start */}
          {nextCohort && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="text-cyan-500">📅</span>
              <span>
                Next starts{" "}
                <strong className="text-slate-700">
                  {new Date(nextCohort.start_date).toLocaleDateString("en-NG", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </strong>
              </span>
              {nextCohort.location_name && (
                <>
                  <span className="text-slate-300">·</span>
                  <span>📍 {nextCohort.location_name}</span>
                </>
              )}
            </div>
          )}

          {/* Footer: duration + price */}
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-sm text-slate-500">
              {program.duration_weeks} weeks
            </span>
            <span className="font-bold text-cyan-600">{price}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
