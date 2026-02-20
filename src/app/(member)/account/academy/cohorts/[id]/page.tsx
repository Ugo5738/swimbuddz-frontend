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
  PaymentStatus,
  Program,
  ProgramCurriculum,
  ProgramLevel,
} from "@/lib/academy";
import { Member, MembersApi } from "@/lib/members";
import { UpgradeProvider, useUpgrade } from "@/lib/upgradeContext";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const levelLabels: Record<ProgramLevel, string> = {
  [ProgramLevel.BEGINNER_1]: "Beginner 1",
  [ProgramLevel.BEGINNER_2]: "Beginner 2",
  [ProgramLevel.INTERMEDIATE]: "Intermediate",
  [ProgramLevel.ADVANCED]: "Advanced",
  [ProgramLevel.SPECIALTY]: "Specialty",
};

function CohortDetailPageInner() {
  const params = useParams();
  const router = useRouter();
  const cohortId = params.id as string;

  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [curriculum, setCurriculum] = useState<ProgramCurriculum | null>(null);
  const [myEnrollment, setMyEnrollment] = useState<Enrollment | null>(null);
  const [coach, setCoach] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const { setSelectedCohort, setTargetTier } = useUpgrade();

  useEffect(() => {
    if (cohortId) loadData();
  }, [cohortId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const cohortData = await AcademyApi.getCohort(cohortId);
      setCohort(cohortData);

      if (cohortData.program_id) {
        const [programData, milestonesData, curriculumData, enrollmentsData] = await Promise.all([
          AcademyApi.getProgram(cohortData.program_id),
          AcademyApi.listMilestones(cohortData.program_id),
          AcademyApi.getCurriculum(cohortData.program_id).catch(() => null),
          AcademyApi.getMyEnrollments().catch(() => []),
        ]);

        setProgram(programData);
        setMilestones(milestonesData);
        setCurriculum(curriculumData);
        setMyEnrollment(enrollmentsData.find((e) => e.cohort_id === cohortId) || null);

        if (cohortData.coach_id) {
          MembersApi.getMember(cohortData.coach_id)
            .then(setCoach)
            .catch(() => null);
        }
      }
    } catch (error) {
      console.error("Failed to load cohort:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!cohort || !program) return;
    setEnrolling(true);
    try {
      if (myEnrollment?.payment_status === PaymentStatus.PAID) {
        toast.info("Payment received. Awaiting approval or activation.");
        router.push(`/account/academy/enrollments/${myEnrollment.id}`);
        return;
      }

      const enrollment =
        myEnrollment ?? (await AcademyApi.selfEnroll({ cohort_id: cohort.id }));

      setTargetTier("academy");
      setSelectedCohort({
        id: cohort.id,
        name: cohort.name,
        program_name: program.name,
        start_date: cohort.start_date,
        end_date: cohort.end_date,
        price_override: cohort.price_override,
        status: cohort.status,
        // Installment billing fields
        installment_plan_enabled: cohort.installment_plan_enabled,
        installment_count: cohort.installment_count,
        installment_deposit_amount: cohort.installment_deposit_amount,
        program: {
          id: program.id,
          name: program.name,
          price_amount: program.price_amount || 0,
          duration_weeks: program.duration_weeks,
          currency: program.currency,
        },
      });

      toast.success("Enrollment created! Proceeding to checkout...");
      router.push(`/checkout?purpose=academy_cohort&cohort_id=${cohort.id}&enrollment_id=${enrollment.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to enroll. Please try again.");
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
        <p className="text-lg font-medium text-slate-600">Loading cohort...</p>
      </div>
    );
  }

  if (!cohort || !program) {
    return (
      <Card className="p-12 text-center">
        <h2 className="text-xl font-semibold text-slate-900">Cohort not found</h2>
        <Link href="/account/academy/browse" className="mt-4 inline-block text-cyan-600 hover:text-cyan-700">
          ← Browse Programs
        </Link>
      </Card>
    );
  }

  const price = cohort.price_override ?? program.price_amount ?? 0;
  const priceDisplay = price > 0 ? `₦${price.toLocaleString()}` : "Free";
  const now = new Date();
  const startDate = new Date(cohort.start_date);
  const endDate = new Date(cohort.end_date);
  const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const currentWeek = Math.floor(daysSinceStart / 7) + 1;
  const midCutoff = cohort.mid_entry_cutoff_week ?? 2;
  const isMidEntryOpen =
    cohort.status === CohortStatus.ACTIVE &&
    Boolean(cohort.allow_mid_entry) &&
    currentWeek <= midCutoff;
  const isEnrollable = cohort.status === CohortStatus.OPEN || isMidEntryOpen;
  const isEnrolled = !!myEnrollment;
  const isEnrolledPaid = isEnrolled && myEnrollment?.payment_status === PaymentStatus.PAID;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <Link
        href={`/account/academy/programs/${program.id}`}
        className="flex items-center gap-1 text-sm text-cyan-600 hover:text-cyan-700"
      >
        ← Back to {program.name}
      </Link>

      {/* ── Enrollment Decision Card — the whole point of this page ── */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-6 text-white md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-white/20 text-white">{levelLabels[program.level]}</Badge>
                {isEnrolledPaid && <Badge className="bg-green-500 text-white">✓ Enrolled</Badge>}
                {isMidEntryOpen && <Badge className="bg-emerald-500 text-white">Mid-entry open</Badge>}
                {!isEnrollable && cohort.status !== CohortStatus.COMPLETED && (
                  <Badge className="bg-orange-400 text-white">Closed</Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold md:text-3xl">{program.name}</h1>
              <p className="text-lg text-cyan-100">{cohort.name}</p>
            </div>
            <div className="rounded-xl bg-white/10 px-6 py-4 text-center backdrop-blur-sm">
              <div className="text-3xl font-bold">{priceDisplay}</div>
              <div className="mt-1 text-sm text-cyan-100">{program.duration_weeks} weeks</div>
            </div>
          </div>
        </div>

        {/* ── Key facts grid ── */}
        <div className="grid grid-cols-2 divide-x divide-y border-b md:grid-cols-4 md:divide-y-0">
          {[
            {
              icon: "📅",
              label: "Start Date",
              value: startDate.toLocaleDateString("en-NG", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
            },
            {
              icon: "🏁",
              label: "End Date",
              value: endDate.toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" }),
            },
            {
              icon: "📍",
              label: "Location",
              value: cohort.location_name || "TBA",
            },
            {
              icon: "👥",
              label: "Spots",
              value: `${cohort.capacity} available`,
              urgent: cohort.capacity <= 5,
            },
          ].map((item) => (
            <div key={item.label} className="px-5 py-4 text-center">
              <div className="text-xl">{item.icon}</div>
              <div className="mt-1 text-xs text-slate-400">{item.label}</div>
              <div className={`mt-0.5 text-sm font-semibold ${item.urgent ? "text-orange-600" : "text-slate-900"}`}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* ── Coach strip ── */}
        {coach && (
          <div className="flex items-center gap-4 border-b bg-slate-50 px-6 py-4">
            {coach.profile_photo_url ? (
              <img
                src={coach.profile_photo_url}
                alt={`${coach.first_name} ${coach.last_name}`}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100 text-lg font-bold text-cyan-600">
                {coach.first_name?.[0]}{coach.last_name?.[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400">Your Coach</p>
              <p className="font-semibold text-slate-900">
                {coach.first_name} {coach.last_name}
              </p>
              {(coach.coach_profile?.short_bio || coach.coach_profile?.full_bio) && (
                <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">
                  {coach.coach_profile.short_bio || coach.coach_profile.full_bio}
                </p>
              )}
            </div>
            {coach.coach_profile?.certifications && coach.coach_profile.certifications.length > 0 && (
              <div className="hidden sm:flex flex-wrap gap-1">
                {coach.coach_profile.certifications.slice(0, 2).map((cert, i) => (
                  <Badge key={i} variant="info" className="text-xs">{cert}</Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CTA ── */}
        <div className="bg-white p-6">
          {isEnrolledPaid ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-green-700">✓ You&apos;re enrolled in this cohort</p>
                <p className="text-sm text-slate-500">View your progress, milestones, and upcoming sessions.</p>
              </div>
              <Link href={`/account/academy/enrollments/${myEnrollment!.id}`}>
                <Button className="bg-green-600 text-white hover:bg-green-700">View My Enrollment</Button>
              </Link>
            </div>
          ) : isEnrolled ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-amber-700">Enrollment pending payment</p>
                <p className="text-sm text-slate-500">Complete your payment to activate your enrollment.</p>
              </div>
              <Link href={`/checkout?purpose=academy_cohort&cohort_id=${cohort.id}&enrollment_id=${myEnrollment!.id}`}>
                <Button className="bg-amber-500 text-white hover:bg-amber-600">Complete Payment</Button>
              </Link>
            </div>
          ) : isEnrollable ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-900">
                  {isMidEntryOpen ? "Join this in-progress cohort" : "Ready to secure your spot?"}
                </p>
                <p className="text-sm text-slate-500">
                  {isMidEntryOpen
                    ? `Mid-entry is open through week ${midCutoff}. You can still catch up.`
                    : `Starts ${startDate.toLocaleDateString("en-NG", { month: "long", day: "numeric" })} · ${cohort.capacity} spots remaining`}
                </p>
              </div>
              <Button
                size="lg"
                onClick={handleEnroll}
                disabled={enrolling}
                className="bg-cyan-600 text-white hover:bg-cyan-700 px-8"
              >
                {enrolling ? "Enrolling..." : "Enroll Now — " + priceDisplay}
              </Button>
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-slate-500">This cohort is no longer accepting enrollments.</p>
              <Link
                href={`/account/academy/programs/${program.id}#cohorts`}
                className="mt-2 inline-block text-sm text-cyan-600 hover:text-cyan-700"
              >
                See other available cohorts →
              </Link>
            </div>
          )}
        </div>
      </Card>

      {/* ── What you'll achieve ── */}
      {milestones.length > 0 && (
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">What You&apos;ll Achieve</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {milestones.map((m) => (
              <div key={m.id} className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
                <span className="mt-0.5 text-cyan-600">✓</span>
                <div>
                  <span className="text-sm font-medium text-slate-900">{m.name}</span>
                  {m.criteria && (
                    <p className="mt-0.5 text-xs text-slate-500">{m.criteria}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Curriculum preview ── */}
      {curriculum?.weeks && curriculum.weeks.length > 0 && (
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Curriculum Overview</h2>
          <div className="space-y-3">
            {curriculum.weeks.slice(0, 4).map((week) => (
              <div key={week.id} className="border-l-4 border-cyan-400 pl-4">
                <h4 className="font-medium text-slate-900">
                  Week {week.week_number}: {week.theme}
                </h4>
                {week.objectives && (
                  <p className="mt-0.5 text-sm text-slate-500">{week.objectives}</p>
                )}
              </div>
            ))}
            {curriculum.weeks.length > 4 && (
              <p className="pl-4 text-sm italic text-slate-400">
                + {curriculum.weeks.length - 4} more weeks in the full program
              </p>
            )}
          </div>
        </Card>
      )}

      {/* ── About the program ── */}
      <Card className="p-6">
        <h2 className="mb-3 text-xl font-semibold text-slate-900">About This Program</h2>
        <p className="leading-relaxed text-slate-600">
          {program.description || "No description available."}
        </p>
        <Link
          href={`/account/academy/programs/${program.id}`}
          className="mt-3 inline-block text-sm text-cyan-600 hover:text-cyan-700"
        >
          View full program details →
        </Link>
      </Card>

      {/* ── Bottom CTA repeat (for mobile after scrolling) ── */}
      {isEnrollable && !isEnrolled && (
        <div className="sticky bottom-4 z-10 px-4 md:hidden">
          <Button
            size="lg"
            onClick={handleEnroll}
            disabled={enrolling}
            className="w-full bg-cyan-600 text-white hover:bg-cyan-700 shadow-lg"
          >
            {enrolling ? "Enrolling..." : `Enroll Now — ${priceDisplay}`}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function CohortDetailPage() {
  return (
    <UpgradeProvider>
      <CohortDetailPageInner />
    </UpgradeProvider>
  );
}
