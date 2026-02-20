"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Markdown } from "@/components/ui/Markdown";
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
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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

// ─── Lesson description with truncation ──────────────────────────────────────

const LESSON_DESC_LIMIT = 120;

function LessonDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  // Determine if content is long enough to warrant collapse
  const firstPara = text.split(/\n\n+/)[0] ?? "";
  const isLong = text.split(/\n\n+/).length > 1 || firstPara.length > LESSON_DESC_LIMIT;
  // Collapsed: show only the first paragraph truncated as plain text
  const collapsedText =
    firstPara.length > LESSON_DESC_LIMIT
      ? firstPara.slice(0, LESSON_DESC_LIMIT).trimEnd() + "…"
      : firstPara;

  return (
    <div className="mt-2">
      {expanded ? (
        <Markdown size="sm">{text}</Markdown>
      ) : (
        <p className="text-sm text-slate-500 leading-relaxed">{collapsedText}</p>
      )}
      {isLong && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          className="mt-1 font-medium text-cyan-600 hover:text-cyan-700 text-xs"
        >
          {expanded ? "Show less ↑" : "Read more ↓"}
        </button>
      )}
    </div>
  );
}

// ─── Curriculum Accordion ────────────────────────────────────────────────────

function CurriculumAccordion({ curriculum }: { curriculum: ProgramCurriculum }) {
  const [openWeeks, setOpenWeeks] = useState<Set<number>>(new Set([1]));

  const toggle = (weekNumber: number) => {
    setOpenWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekNumber)) next.delete(weekNumber);
      else next.add(weekNumber);
      return next;
    });
  };

  const expandAll = () => setOpenWeeks(new Set(curriculum.weeks.map((w) => w.week_number)));
  const collapseAll = () => setOpenWeeks(new Set());
  const allOpen = openWeeks.size === curriculum.weeks.length;

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">
          Curriculum — {curriculum.weeks.length} weeks
        </h2>
        <button
          onClick={allOpen ? collapseAll : expandAll}
          className="text-xs font-medium text-cyan-600 hover:text-cyan-700"
        >
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>

      <div className="space-y-2">
        {curriculum.weeks.map((week) => {
          const isOpen = openWeeks.has(week.week_number);
          return (
            <div
              key={week.id}
              className={`rounded-lg border transition-colors ${isOpen ? "border-cyan-200 bg-cyan-50/40" : "border-slate-100 bg-white hover:border-slate-200"
                }`}
            >
              {/* Header row — always visible */}
              <button
                onClick={() => toggle(week.week_number)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                {/* Week number pill */}
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-cyan-100 text-xs font-bold text-cyan-700">
                  {week.week_number}
                </span>
                {/* Theme */}
                <span className="flex-1 font-medium text-slate-900 text-sm">
                  {week.theme || `Week ${week.week_number}`}
                </span>
                {/* Chevron */}
                <span
                  className={`flex-shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
                    }`}
                >
                  ▾
                </span>
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div className="border-t border-cyan-100 px-4 pb-4 pt-3 space-y-3">
                  {week.objectives && (
                    <p className="text-sm text-slate-600 leading-relaxed">
                      <span className="font-medium text-slate-700">Objectives: </span>
                      {week.objectives}
                    </p>
                  )}
                  {week.lessons && week.lessons.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {week.lessons.map((lesson, i) => (
                        <div key={lesson.id} className="flex items-start gap-2">
                          <span className="mt-1 flex-shrink-0 text-cyan-400 text-sm">•</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-slate-700 text-sm">{lesson.title}</span>
                              {lesson.duration_minutes && (
                                <span className="text-xs text-slate-400">({lesson.duration_minutes} min)</span>
                              )}
                            </div>
                            {lesson.description && (
                              <LessonDescription text={lesson.description} />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {!week.objectives && (!week.lessons || week.lessons.length === 0) && (
                    <p className="text-sm text-slate-400 italic">
                      Detailed breakdown available during the program.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Cohort Card ─────────────────────────────────────────────────────────────

function CohortCard({
  cohort,
  program,
  enrollment,
  coach,
  onEnroll,
  enrolling,
}: {
  cohort: Cohort;
  program: Program;
  enrollment?: Enrollment;
  coach?: Member | null;
  onEnroll: (cohort: Cohort) => void;
  enrolling: string | null;
}) {
  const now = new Date();
  const startDate = new Date(cohort.start_date);
  const endDate = new Date(cohort.end_date);
  const isEnrolled = !!enrollment;
  const isEnrolledPaid = isEnrolled && enrollment?.payment_status === PaymentStatus.PAID;
  const isOpen = cohort.status === CohortStatus.OPEN;
  const isActive = cohort.status === CohortStatus.ACTIVE;
  const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const currentWeek = Math.floor(daysSinceStart / 7) + 1;
  const midCutoff = cohort.mid_entry_cutoff_week ?? 2;
  const isMidEntryOpen = isActive && Boolean(cohort.allow_mid_entry) && currentWeek <= midCutoff;
  const isEnrollable = isOpen || isMidEntryOpen;

  const price = cohort.price_override ?? program.price_amount ?? 0;
  const priceDisplay = price > 0 ? `₦${price.toLocaleString()}` : "Free";

  // Urgency: spots left (capacity is total, not remaining — but we show it as urgency signal)
  const spotsLabel =
    cohort.capacity <= 3
      ? `⚠️ ${cohort.capacity} spots left`
      : `${cohort.capacity} spots`;
  const spotsUrgent = cohort.capacity <= 5;

  // Format date range
  const dateRange = `${startDate.toLocaleDateString("en-NG", { month: "short", day: "numeric" })} – ${endDate.toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div
      className={`rounded-xl border-2 bg-white transition-all hover:shadow-md ${isEnrolledPaid
          ? "border-green-300 bg-green-50"
          : isEnrolled
            ? "border-amber-300 bg-amber-50"
            : isEnrollable
              ? "border-slate-200 hover:border-cyan-300"
              : "border-slate-100 bg-slate-50 opacity-70"
        }`}
    >
      {/* Spot-held banner — shown when enrolled but not paid */}
      {isEnrolled && !isEnrolledPaid && (
        <div className="flex items-center gap-2 rounded-t-[10px] border-b border-amber-200 bg-amber-50 px-5 py-2">
          <span className="text-amber-500">⏳</span>
          <p className="text-xs text-amber-700">
            <span className="font-semibold">Your spot is held.</span> Complete payment to confirm your place in this cohort.
          </p>
        </div>
      )}
      {/* Confirmed enrolled banner */}
      {isEnrolledPaid && (
        <div className="flex items-center gap-2 rounded-t-[10px] border-b border-green-200 bg-green-50 px-5 py-2">
          <span className="text-green-500">✓</span>
          <p className="text-xs font-semibold text-green-700">You&apos;re enrolled in this cohort.</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start gap-4 p-5">
        {/* Left: date block */}
        <div className="flex-shrink-0 rounded-lg bg-cyan-50 px-4 py-3 text-center min-w-[80px]">
          <div className="text-xs font-medium uppercase tracking-wide text-cyan-600">
            {startDate.toLocaleDateString("en-NG", { month: "short" })}
          </div>
          <div className="text-3xl font-bold text-slate-900 leading-none mt-0.5">
            {startDate.getDate()}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {startDate.getFullYear()}
          </div>
        </div>

        {/* Middle: details */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-900 text-base">{cohort.name}</h3>
            {isMidEntryOpen && !isEnrolled && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                Mid-entry open
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            <span>📅 {dateRange}</span>
            {cohort.location_name && <span>📍 {cohort.location_name}</span>}
            <span className={spotsUrgent ? "font-medium text-orange-600" : ""}>
              👥 {spotsLabel}
            </span>
          </div>

          {/* Coach */}
          {coach && (
            <div className="mt-2 flex items-center gap-2">
              {coach.profile_photo_url ? (
                <img
                  src={coach.profile_photo_url}
                  alt={`${coach.first_name} ${coach.last_name}`}
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                  {coach.first_name?.[0]}{coach.last_name?.[0]}
                </div>
              )}
              <span className="text-sm text-slate-600">
                Coach {coach.first_name} {coach.last_name}
              </span>
            </div>
          )}
        </div>

        {/* Right: price + actions */}
        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 sm:gap-2 flex-shrink-0">
          {/* Only show price when not already enrolled */}
          {!isEnrolled && (
            <div className="text-right">
              <div className="text-xl font-bold text-slate-900">{priceDisplay}</div>
              <div className="text-xs text-slate-400">{program.duration_weeks} weeks</div>
            </div>
          )}

          {isEnrolledPaid ? (
            <Link href={`/account/academy/enrollments/${enrollment!.id}`}>
              <Button size="sm" variant="outline">
                View Enrollment
              </Button>
            </Link>
          ) : isEnrolled ? (
            <div className="flex flex-col items-end gap-1">
              <Link
                href={`/checkout?purpose=academy_cohort&cohort_id=${cohort.id}&enrollment_id=${enrollment!.id}`}
              >
                <Button size="sm" className="bg-amber-500 text-white hover:bg-amber-600">
                  Complete Payment — {priceDisplay}
                </Button>
              </Link>
            </div>
          ) : isEnrollable ? (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => onEnroll(cohort)}
                disabled={enrolling === cohort.id}
                className="bg-cyan-600 text-white hover:bg-cyan-700"
              >
                {enrolling === cohort.id ? "Enrolling..." : isActive ? "Join Now" : "Enroll Now"}
              </Button>
              <Link href={`/account/academy/cohorts/${cohort.id}`}>
                <Button size="sm" variant="outline" className="text-slate-500">
                  Details
                </Button>
              </Link>
            </div>
          ) : (
            <span className="text-xs text-slate-400 text-right">
              {cohort.status === CohortStatus.COMPLETED ? "Completed" : "Closed"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page inner ───────────────────────────────────────────────────────────────

function ProgramDetailPageInner() {
  const params = useParams();
  const router = useRouter();
  const programId = params.id as string;

  const [program, setProgram] = useState<Program | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [curriculum, setCurriculum] = useState<ProgramCurriculum | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [coaches, setCoaches] = useState<Record<string, Member>>({});
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [isInterested, setIsInterested] = useState(false);
  const [interestLoading, setInterestLoading] = useState(false);
  const [showAllMilestones, setShowAllMilestones] = useState(false);

  const cohortsRef = useRef<HTMLDivElement>(null);
  const { setSelectedCohort, setTargetTier } = useUpgrade();

  const scrollToCohorts = () => {
    cohortsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (programId) loadData();
  }, [programId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [programData, milestonesData, curriculumData, cohortsData, enrollmentsData, interestData] =
        await Promise.all([
          AcademyApi.getProgram(programId),
          AcademyApi.listMilestones(programId),
          AcademyApi.getCurriculum(programId).catch(() => null),
          AcademyApi.getEnrollableCohorts(programId),
          AcademyApi.getMyEnrollments().catch(() => []),
          AcademyApi.checkProgramInterest(programId).catch(() => ({ registered: false })),
        ]);

      setProgram(programData);
      setMilestones(milestonesData);
      setCurriculum(curriculumData);
      setCohorts(cohortsData);
      setEnrollments(enrollmentsData);
      setIsInterested(interestData.registered);

      // Fetch coaches for cohorts that have one
      const coachIds = [...new Set(cohortsData.map((c) => c.coach_id).filter(Boolean) as string[])];
      if (coachIds.length > 0) {
        const coachResults = await Promise.allSettled(coachIds.map((id) => MembersApi.getMember(id)));
        const coachMap: Record<string, Member> = {};
        coachResults.forEach((r, i) => {
          if (r.status === "fulfilled") coachMap[coachIds[i]] = r.value;
        });
        setCoaches(coachMap);
      }
    } catch (error) {
      console.error("Failed to load program:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (cohort: Cohort) => {
    if (!program) return;
    setEnrolling(cohort.id);
    try {
      const existingEnrollment = enrollments.find((e) => e.cohort_id === cohort.id);

      if (existingEnrollment?.payment_status === PaymentStatus.PAID) {
        toast.info("You're already enrolled in this cohort.");
        router.push(`/account/academy/enrollments/${existingEnrollment.id}`);
        return;
      }

      const enrollment = existingEnrollment ?? (await AcademyApi.selfEnroll({ cohort_id: cohort.id }));

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

      toast.success("Spot reserved! Taking you to payment...");
      router.push(`/checkout?purpose=academy_cohort&cohort_id=${cohort.id}&enrollment_id=${enrollment.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to enroll. Please try again.");
    } finally {
      setEnrolling(null);
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
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setInterestLoading(false);
    }
  };

  const getEnrollmentForCohort = (cohortId: string) =>
    enrollments.find((e) => e.cohort_id === cohortId);

  // Only consider paid enrollments as "enrolled" — pending payment is not confirmed
  const isEnrolledInProgram = enrollments.some(
    (e) => e.program_id === programId && e.payment_status === PaymentStatus.PAID,
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
        <h2 className="text-xl font-semibold text-slate-900">Program not found</h2>
        <Link href="/account/academy/browse" className="mt-4 inline-block text-cyan-600 hover:text-cyan-700">
          ← Browse Programs
        </Link>
      </Card>
    );
  }

  const price = program.price_amount ? `₦${program.price_amount.toLocaleString()}` : "Free";
  const MILESTONES_PREVIEW = 6;
  const visibleMilestones = showAllMilestones ? milestones : milestones.slice(0, MILESTONES_PREVIEW);

  // Cohorts: open/active first, then others
  const sortedCohorts = [...cohorts].sort((a, b) => {
    const order = { open: 0, active: 1, completed: 2, cancelled: 3 };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9);
  });

  const openCohortCount = cohorts.filter(
    (c) => c.status === CohortStatus.OPEN || c.status === CohortStatus.ACTIVE,
  ).length;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <Link
        href="/account/academy/browse"
        className="flex items-center gap-1 text-sm text-cyan-600 hover:text-cyan-700"
      >
        ← Browse Programs
      </Link>

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="relative h-52 bg-gradient-to-br from-cyan-500 to-blue-600 md:h-72">
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
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 to-transparent p-6 md:p-10">
          <div className="flex w-full flex-col gap-3 text-white sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Badge className={levelColors[program.level]}>{levelLabels[program.level]}</Badge>
                {isEnrolledInProgram && <Badge className="bg-green-500 text-white">✓ Enrolled</Badge>}
                {openCohortCount > 0 && (
                  <Badge className="bg-white/20 text-white">
                    {openCohortCount} cohort{openCohortCount > 1 ? "s" : ""} available
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold md:text-4xl">{program.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-white/80 md:text-base">
                <span>📅 {program.duration_weeks} weeks</span>
                <span className="font-bold text-white text-lg">{price}</span>
                <span>🏆 {milestones.length} milestones</span>
              </div>
            </div>
            {/* Anchor CTA — jumps straight to cohort selection */}
            {openCohortCount > 0 && !isEnrolledInProgram && (
              <button
                onClick={scrollToCohorts}
                className="flex-shrink-0 rounded-xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-cyan-400 active:scale-95 transition-all"
              >
                Enroll Now ↓
              </button>
            )}
            {openCohortCount === 0 && !isEnrolledInProgram && (
              <button
                onClick={scrollToCohorts}
                className="flex-shrink-0 rounded-xl border border-white/40 bg-white/10 px-5 py-3 text-sm font-medium text-white hover:bg-white/20 transition-all"
              >
                View Cohorts ↓
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="grid gap-8 lg:grid-cols-3">

        {/* ── Left: program content ── */}
        <div className="space-y-6 lg:col-span-2">

          {/* About */}
          <Card className="p-6">
            <h2 className="mb-3 text-xl font-semibold text-slate-900">About This Program</h2>
            <p className="leading-relaxed text-slate-600">
              {program.description || "No description available for this program."}
            </p>
          </Card>

          {/* What you'll learn */}
          {milestones.length > 0 && (
            <Card className="p-6">
              <h2 className="mb-4 text-xl font-semibold text-slate-900">What You&apos;ll Learn</h2>
              <div className="space-y-3">
                {visibleMilestones.map((milestone, index) => (
                  <div key={milestone.id} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cyan-100 text-sm font-medium text-cyan-700">
                      {index + 1}
                    </span>
                    <div>
                      <h4 className="font-medium text-slate-900">{milestone.name}</h4>
                      {milestone.criteria && (
                        <p className="mt-0.5 text-sm text-slate-500">{milestone.criteria}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {milestones.length > MILESTONES_PREVIEW && (
                <button
                  onClick={() => setShowAllMilestones((v) => !v)}
                  className="mt-4 text-sm font-medium text-cyan-600 hover:text-cyan-700"
                >
                  {showAllMilestones
                    ? "Show less"
                    : `+ ${milestones.length - MILESTONES_PREVIEW} more milestones`}
                </button>
              )}
            </Card>
          )}

          {/* Curriculum — full accordion */}
          {curriculum?.weeks && curriculum.weeks.length > 0 && (
            <CurriculumAccordion curriculum={curriculum} />
          )}
        </div>

        {/* ── Right: quick facts sidebar ── */}
        <div className="space-y-4">
          <Card className="p-5 bg-slate-50">
            <h3 className="mb-3 font-semibold text-slate-900">Program Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Level</dt>
                <dd className="font-medium text-slate-900">{levelLabels[program.level]}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Duration</dt>
                <dd className="font-medium text-slate-900">{program.duration_weeks} weeks</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Price</dt>
                <dd className="font-semibold text-cyan-600">{price}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Milestones</dt>
                <dd className="font-medium text-slate-900">{milestones.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Available cohorts</dt>
                <dd className={`font-medium ${openCohortCount > 0 ? "text-green-600" : "text-slate-400"}`}>
                  {openCohortCount > 0 ? openCohortCount : "None right now"}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Notification opt-in */}
          {openCohortCount === 0 && (
            <Card className="p-5 bg-cyan-50 border-cyan-100">
              <h3 className="mb-1 font-semibold text-slate-900">Want to join?</h3>
              <p className="mb-3 text-sm text-slate-600">
                No cohorts are open right now. Get notified when the next one launches.
              </p>
              <Button
                variant={isInterested ? "secondary" : "outline"}
                size="sm"
                className="w-full"
                onClick={handleNotifyClick}
                disabled={interestLoading}
              >
                {interestLoading ? "..." : isInterested ? "✓ Notifications On" : "🔔 Notify Me"}
              </Button>
            </Card>
          )}

          <Card className="p-5 bg-white border-slate-100">
            <h3 className="mb-2 font-semibold text-slate-900">Have questions?</h3>
            <p className="mb-3 text-sm text-slate-500">
              Not sure if this program is the right level for you?
            </p>
            <Button variant="outline" size="sm" className="w-full">
              Contact Support
            </Button>
          </Card>
        </div>
      </div>

      {/* ── Cohort Selection — full width, distinct band ── */}
      <div
        ref={cohortsRef}
        id="cohorts"
        className="-mx-4 rounded-2xl bg-gradient-to-b from-cyan-50 to-blue-50 px-4 py-8 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 scroll-mt-6"
      >
        {/* Section header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Choose a Cohort</h2>
            <p className="mt-1 text-sm text-slate-500">
              {openCohortCount > 0
                ? `${openCohortCount} cohort${openCohortCount > 1 ? "s" : ""} available — pick the start date that works best for you.`
                : "No cohorts are currently open for enrollment."}
            </p>
          </div>
          <div className="flex-shrink-0">
            {openCohortCount > 0 && isInterested && (
              <button
                onClick={handleNotifyClick}
                disabled={interestLoading}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                ✓ Notified
              </button>
            )}
            {openCohortCount === 0 && !isInterested && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleNotifyClick}
                disabled={interestLoading}
              >
                {interestLoading ? "..." : "🔔 Notify Me"}
              </Button>
            )}
          </div>
        </div>

        {sortedCohorts.length === 0 ? (
          <div className="rounded-xl border border-blue-100 bg-white py-12 text-center">
            <div className="text-4xl mb-3">📅</div>
            <p className="font-medium text-slate-700">No cohorts available right now.</p>
            <p className="mt-1 text-sm text-slate-500">
              Check back soon or enable notifications above.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedCohorts.map((cohort) => (
              <CohortCard
                key={cohort.id}
                cohort={cohort}
                program={program}
                enrollment={getEnrollmentForCohort(cohort.id)}
                coach={cohort.coach_id ? coaches[cohort.coach_id] : null}
                onEnroll={handleEnroll}
                enrolling={enrolling}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProgramDetailPage() {
  return (
    <UpgradeProvider>
      <ProgramDetailPageInner />
    </UpgradeProvider>
  );
}
