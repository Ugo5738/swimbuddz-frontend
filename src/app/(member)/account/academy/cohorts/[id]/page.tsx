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
  const { setSelectedCohort, setTargetTier, clearState } = useUpgrade();

  useEffect(() => {
    if (cohortId) {
      loadData();
    }
  }, [cohortId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const cohortData = await AcademyApi.getCohort(cohortId);
      setCohort(cohortData);

      // Load program details
      if (cohortData.program_id) {
        const [programData, milestonesData, curriculumData, enrollmentsData] =
          await Promise.all([
            AcademyApi.getProgram(cohortData.program_id),
            AcademyApi.listMilestones(cohortData.program_id),
            AcademyApi.getCurriculum(cohortData.program_id).catch(() => null),
            AcademyApi.getMyEnrollments().catch(() => []),
          ]);

        setProgram(programData);
        setMilestones(milestonesData);
        setCurriculum(curriculumData);

        // Check if user is enrolled in this cohort
        const enrollment = enrollmentsData.find(
          (e) => e.cohort_id === cohortId,
        );
        setMyEnrollment(enrollment || null);

        // Fetch coach details if coach_id is set
        if (cohortData.coach_id) {
          try {
            const coachData = await MembersApi.getMember(cohortData.coach_id);
            setCoach(coachData);
          } catch (error) {
            console.error("Failed to load coach:", error);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load cohort:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!cohort) return;

    setEnrolling(true);
    try {
      // If an enrollment already exists, route the user appropriately instead of recreating
      if (myEnrollment) {
        if (myEnrollment.payment_status === PaymentStatus.PAID) {
          toast.info("Payment received. Awaiting approval or activation.");
          router.push(`/account/academy/enrollments/${myEnrollment.id}`);
          return;
        }

        // Pending payment: send to checkout to finish payment
        setTargetTier("academy");
        setSelectedCohort({
          id: cohort.id,
          name: cohort.name,
          program_name: program?.name,
          start_date: cohort.start_date,
          end_date: cohort.end_date,
          price_override: cohort.price_override,
          status: cohort.status,
          program: program
            ? {
                id: program.id,
                name: program.name,
                price_amount: program.price_amount || 0,
                currency: program.currency,
              }
            : undefined,
        });
        router.push(
          `/checkout?purpose=academy_cohort&cohort_id=${cohort.id}&enrollment_id=${myEnrollment.id}`,
        );
        return;
      }

      // Create enrollment
      const enrollment = await AcademyApi.selfEnroll({
        cohort_id: cohort.id,
      });

      // Persist checkout context so the checkout page can display pricing and accept discount codes
      setTargetTier("academy");
      setSelectedCohort({
        id: cohort.id,
        name: cohort.name,
        program_name: program?.name,
        start_date: cohort.start_date,
        end_date: cohort.end_date,
        price_override: cohort.price_override,
        status: cohort.status,
        program: program
          ? {
              id: program.id,
              name: program.name,
              price_amount: program.price_amount || 0,
              currency: program.currency,
            }
          : undefined,
      });

      // Redirect to checkout page where user can apply discount codes before payment
      toast.success("Enrollment created! Proceeding to checkout...");
      router.push(
        `/checkout?purpose=academy_cohort&cohort_id=${cohort.id}&enrollment_id=${enrollment.id}`,
      );
    } catch (error: any) {
      console.error("Enrollment failed:", error);
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
        <h2 className="text-xl font-semibold text-slate-900">
          Cohort not found
        </h2>
        <Link
          href="/account/academy/browse"
          className="text-cyan-600 hover:text-cyan-700 mt-4 inline-block"
        >
          ← Browse Programs
        </Link>
      </Card>
    );
  }

  const price = cohort.price_override ?? program.price_amount ?? 0;
  const priceDisplay = price > 0 ? `₦${price.toLocaleString()}` : "Free";
  const now = new Date();
  const cohortStartDate = new Date(cohort.start_date);
  const daysSinceStart = Math.floor(
    (now.getTime() - cohortStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
  );
  const currentWeek = Math.floor(daysSinceStart / 7) + 1;
  const midEntryCutoffWeek = cohort.mid_entry_cutoff_week ?? 2;
  const isMidEntryEligible =
    cohort.status === CohortStatus.ACTIVE &&
    Boolean(cohort.allow_mid_entry) &&
    currentWeek <= midEntryCutoffWeek;
  const isEnrollable =
    cohort.status === CohortStatus.OPEN || isMidEntryEligible;
  const isInProgress = cohort.status === CohortStatus.ACTIVE;
  const isEnrolled = !!myEnrollment;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <Link
        href={`/account/academy/programs/${program.id}`}
        className="text-sm text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
      >
        ← Back to {program.name}
      </Link>

      {/* Header Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-8 text-white">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-white/20">
                  {levelLabels[program.level]}
                </Badge>
                {isEnrolled && (
                  <Badge className="bg-green-500 text-white">✓ Enrolled</Badge>
                )}
                {!isEnrollable && (
                  <Badge className="bg-orange-500 text-white">
                    {cohort.status}
                  </Badge>
                )}
                {isMidEntryEligible && (
                  <Badge className="bg-emerald-500 text-white">
                    Mid-entry open
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold">{program.name}</h1>
              <p className="text-xl text-cyan-100">{cohort.name}</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{priceDisplay}</div>
              <div className="text-cyan-100">
                {program.duration_weeks} weeks
              </div>
            </div>
          </div>
        </div>

        {/* Quick Info */}
        <div className="p-6 grid gap-4 md:grid-cols-4 border-b">
          <div className="text-center">
            <div className="text-2xl mb-1">📅</div>
            <div className="text-sm text-slate-500">Start Date</div>
            <div className="font-medium">
              {new Date(cohort.start_date).toLocaleDateString("en-NG", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">🏁</div>
            <div className="text-sm text-slate-500">End Date</div>
            <div className="font-medium">
              {new Date(cohort.end_date).toLocaleDateString("en-NG", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">📍</div>
            <div className="text-sm text-slate-500">Location</div>
            <div className="font-medium">{cohort.location_name || "TBA"}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">👥</div>
            <div className="text-sm text-slate-500">Capacity</div>
            <div className="font-medium">{cohort.capacity} students</div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="p-6 bg-slate-50">
          {isEnrolled ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="font-medium text-slate-900">
                  You&apos;re enrolled in this cohort!
                </p>
                <p className="text-sm text-slate-600">
                  View your progress and upcoming sessions in your dashboard.
                </p>
              </div>
              <Link href={`/account/academy/enrollments/${myEnrollment.id}`}>
                <Button>View My Enrollment</Button>
              </Link>
            </div>
          ) : isEnrollable ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="font-medium text-slate-900">
                  {isInProgress
                    ? "This cohort is already in progress."
                    : "Ready to start your journey?"}
                </p>
                <p className="text-sm text-slate-600">
                  {isInProgress
                    ? `Mid-entry is open through week ${midEntryCutoffWeek}.`
                    : "Secure your spot in this cohort today."}
                </p>
              </div>
              <Button size="lg" onClick={handleEnroll} disabled={enrolling}>
                {enrolling
                  ? "Processing..."
                  : isInProgress
                    ? "Join In-Progress Cohort"
                    : "Enroll Now"}
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-slate-600">
                This cohort is no longer accepting enrollments.
              </p>
              <Link
                href={`/account/academy/programs/${program.id}`}
                className="text-cyan-600 hover:text-cyan-700 text-sm mt-2 inline-block"
              >
                View other available cohorts →
              </Link>
            </div>
          )}
        </div>
      </Card>

      {/* Content Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Program Description */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              About This Program
            </h2>
            <p className="text-slate-600 leading-relaxed">
              {program.description ||
                "No description available for this program."}
            </p>
          </Card>

          {/* Curriculum Preview */}
          {curriculum?.weeks && curriculum.weeks.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Curriculum Overview
              </h2>
              <div className="space-y-4">
                {curriculum.weeks.slice(0, 4).map((week) => (
                  <div
                    key={week.id}
                    className="border-l-4 border-cyan-500 pl-4"
                  >
                    <h4 className="font-medium text-slate-900">
                      Week {week.week_number}: {week.theme}
                    </h4>
                    {week.objectives && (
                      <p className="text-sm text-slate-600">
                        {week.objectives}
                      </p>
                    )}
                  </div>
                ))}
                {curriculum.weeks.length > 4 && (
                  <p className="text-sm text-slate-500 italic">
                    + {curriculum.weeks.length - 4} more weeks...
                  </p>
                )}
              </div>
            </Card>
          )}

          {/* Milestones */}
          {milestones.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                What You&apos;ll Achieve
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg"
                  >
                    <span className="text-cyan-600 mt-0.5">✓</span>
                    <span className="text-slate-700">{milestone.name}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Coach Info */}
          {coach && (
            <Link href={`/coaches/${coach.id}`}>
              <Card className="p-6 border-2 border-cyan-100 hover:shadow-md hover:border-cyan-300 transition-all cursor-pointer">
                <h3 className="font-semibold text-slate-900 mb-3">
                  👤 Your Coach
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {coach.profile_photo_url ? (
                        <img
                          src={coach.profile_photo_url}
                          alt={`${coach.first_name} ${coach.last_name}`}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 text-xl font-bold">
                          {coach.first_name?.[0]}
                          {coach.last_name?.[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900">
                        {coach.first_name} {coach.last_name}
                      </h4>
                      {(coach.coach_profile?.short_bio ||
                        coach.coach_profile?.full_bio) && (
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                          {coach.coach_profile.short_bio ||
                            coach.coach_profile.full_bio}
                        </p>
                      )}
                      {coach.coach_profile?.certifications &&
                        coach.coach_profile.certifications.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-slate-500 font-medium mb-1">
                              Certifications:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {coach.coach_profile.certifications.map(
                                (cert, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="info"
                                    className="text-xs"
                                  >
                                    {cert}
                                  </Badge>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                  <p className="text-xs text-cyan-600 text-center mt-2">
                    View full profile →
                  </p>
                </div>
              </Card>
            </Link>
          )}

          {/* Location Details */}
          {cohort.location_name && (
            <Card className="p-6">
              <h3 className="font-semibold text-slate-900 mb-3">📍 Location</h3>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-slate-900">
                  {cohort.location_name}
                </p>
                {cohort.location_address && (
                  <p className="text-slate-600">{cohort.location_address}</p>
                )}
                {cohort.location_type && (
                  <Badge variant="info">{cohort.location_type}</Badge>
                )}
              </div>
            </Card>
          )}

          {/* Program Info */}
          <Card className="p-6 bg-slate-50">
            <h3 className="font-semibold text-slate-900 mb-3">
              Program Details
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Level</dt>
                <dd className="font-medium text-slate-900">
                  {levelLabels[program.level]}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Duration</dt>
                <dd className="font-medium text-slate-900">
                  {program.duration_weeks} weeks
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Milestones</dt>
                <dd className="font-medium text-slate-900">
                  {milestones.length}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Timezone</dt>
                <dd className="font-medium text-slate-900">
                  {cohort.timezone || "Africa/Lagos"}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Questions */}
          <Card className="p-6 bg-cyan-50 border-cyan-100">
            <h3 className="font-semibold text-slate-900 mb-2">
              Have Questions?
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Contact us to learn more about this program or get help choosing
              the right level.
            </p>
            <Button variant="outline" className="w-full">
              Contact Support
            </Button>
          </Card>
        </div>
      </div>
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
