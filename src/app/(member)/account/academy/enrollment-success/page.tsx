"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AcademyApi, OnboardingInfo } from "@/lib/academy";
import { apiPost } from "@/lib/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

function EnrollmentSuccessContent() {
  const searchParams = useSearchParams();
  const enrollmentId = searchParams.get("enrollment_id");
  // Paystack appends `reference` (and `trxref`, identical) to the callback
  // URL after the user pays. We use it to trigger server-side verification —
  // the webhook path is the canonical entitlement trigger in production, but
  // in local dev (or any time the webhook is delayed) this verify call is
  // what actually marks the enrollment paid, sends the confirmation email,
  // and activates the academy tier. Without this, the user lands on a
  // "🎉 Welcome" page while their enrollment sits at payment_status=PENDING.
  const paystackReference =
    searchParams.get("reference") || searchParams.get("trxref");

  const [onboarding, setOnboarding] = useState<OnboardingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  // React 18 StrictMode double-invokes effects in dev, which would fire the
  // /paystack/verify call twice. The backend is idempotent so this is
  // harmless for correctness, but it's avoidable noise (two verify round
  // trips, duplicate log lines). This ref ensures run() executes once per
  // mount regardless of StrictMode.
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    if (enrollmentId) {
      // Always verify first if we have a Paystack reference — even if the
      // webhook already fired, the verify endpoint is idempotent (re-marks
      // a PAID payment without re-applying entitlement). Then load
      // onboarding so the UI reflects the activated state.
      void run();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollmentId, paystackReference]);

  const run = async () => {
    if (paystackReference) {
      try {
        setVerifyMessage("Confirming your payment with Paystack…");
        await apiPost(
          `/api/v1/payments/paystack/verify/${encodeURIComponent(paystackReference)}`,
          {},
          { auth: true },
        );
        setVerifyMessage(null);
      } catch (e) {
        // Don't block onboarding rendering on verify failure — show a hint
        // so the user can manually retry from the enrollment detail page if
        // their cohort details look incomplete.
        console.warn("Paystack verify failed (will load onboarding anyway):", e);
        setVerifyMessage(
          "Couldn't auto-confirm payment. If your enrollment still shows as pending in a few minutes, open it from My Academy and tap “Verify Payment”.",
        );
      }
    }
    await loadOnboarding();
  };

  const loadOnboarding = async () => {
    try {
      const data = await AcademyApi.getEnrollmentOnboarding(enrollmentId!);
      setOnboarding(data);
    } catch (error) {
      console.error("Failed to load onboarding info:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
        <p className="text-lg font-medium text-slate-600">
          {verifyMessage || "Loading enrollment..."}
        </p>
      </div>
    );
  }

  if (!onboarding) {
    return (
      <Card className="p-12 text-center">
        <h2 className="text-xl font-semibold text-slate-900">
          Enrollment information not found
        </h2>
        <Link
          href="/account/academy"
          className="text-cyan-600 hover:text-cyan-700 mt-4 inline-block"
        >
          ← Go to My Academy
        </Link>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Success Header */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-white text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold mb-2">
            Welcome to {onboarding.program_name}!
          </h1>
          <p className="text-green-100">Your enrollment has been confirmed</p>
        </div>
      </Card>

      {/* Verify-payment fallback hint — only renders if the post-Paystack
          verify call failed. Onboarding still renders below so the user
          isn't stuck staring at a spinner; the warning just tells them how
          to recover if their cohort still looks pending later. */}
      {verifyMessage && (
        <Card className="p-4 bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800">{verifyMessage}</p>
        </Card>
      )}

      {/* Next Session */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <span className="text-2xl">📅</span>
          Your Cohort Details
        </h2>
        <div className="space-y-4">
          <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-100">
            <h3 className="font-semibold text-slate-900">
              {onboarding.cohort_name}
            </h3>
            <div className="mt-2 space-y-1 text-sm text-slate-600">
              <p>
                <span className="font-medium">Starts:</span>{" "}
                {new Date(onboarding.start_date).toLocaleDateString("en-NG", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p>
                <span className="font-medium">Ends:</span>{" "}
                {new Date(onboarding.end_date).toLocaleDateString("en-NG", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              {onboarding.location && (
                <p>
                  <span className="font-medium">Location:</span>{" "}
                  {onboarding.location}
                </p>
              )}
              {onboarding.coach_name && (
                <p>
                  <span className="font-medium">Coach:</span>{" "}
                  {onboarding.coach_name}
                </p>
              )}
              <p>
                <span className="font-medium">Total Milestones:</span>{" "}
                {onboarding.total_milestones}
              </p>
            </div>
          </div>

          {/* Next Session Info */}
          {onboarding.next_session && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <h4 className="font-semibold text-slate-900 mb-2">
                📍 First Session
              </h4>
              <div className="text-sm text-slate-600 space-y-1 mb-3">
                {onboarding.next_session.date && (
                  <p className="font-medium text-slate-800">
                    {new Date(onboarding.next_session.date).toLocaleString(
                      "en-NG",
                      {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </p>
                )}
                {onboarding.next_session.location && (
                  <p>{onboarding.next_session.location}</p>
                )}
                {onboarding.next_session.notes && (
                  <p className="italic">{onboarding.next_session.notes}</p>
                )}
              </div>
              {onboarding.next_session.date && (() => {
                const sessionDate = new Date(onboarding.next_session.date);
                const endDate = new Date(sessionDate.getTime() + 90 * 60 * 1000); // assume 90 min
                const fmt = (d: Date) =>
                  d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
                const title = encodeURIComponent(
                  `${onboarding.program_name} — First Session`,
                );
                const loc = encodeURIComponent(
                  onboarding.next_session.location || onboarding.location || "",
                );
                const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(sessionDate)}/${fmt(endDate)}&location=${loc}`;
                return (
                  <a
                    href={googleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-900 underline underline-offset-2"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Add to Google Calendar
                  </a>
                );
              })()}
            </div>
          )}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link href={onboarding.dashboard_link} className="flex-1">
          <Button className="w-full" size="lg">
            Go to My Dashboard
          </Button>
        </Link>
        <Link href={onboarding.sessions_link} className="flex-1">
          <Button variant="outline" className="w-full" size="lg">
            View Sessions
          </Button>
        </Link>
      </div>

      {/* Help Section */}
      <Card className="p-6 bg-slate-50 text-center">
        <h3 className="font-semibold text-slate-900 mb-2">Have Questions?</h3>
        <p className="text-sm text-slate-600 mb-4">
          Our team is here to help you get started.
        </p>
        <Button variant="outline">Contact Support</Button>
      </Card>
    </div>
  );
}

export default function EnrollmentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
          <p className="text-lg font-medium text-slate-600">Loading...</p>
        </div>
      }
    >
      <EnrollmentSuccessContent />
    </Suspense>
  );
}
