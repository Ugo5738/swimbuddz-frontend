"use client";

import { Button } from "@/components/ui/Button";
import { LOCATION_LABELS, signInToSession } from "@/lib/sessions";
import { ArrowRight, Calendar, MapPin } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

// Match the SessionCard component's sign-in window so the two surfaces
// behave consistently.
const SIGN_IN_WINDOW_BEFORE_MS = 30 * 60 * 1000;
const SIGN_IN_WINDOW_AFTER_MS = 60 * 60 * 1000;
// If no ends_at is available (AttendanceRecord path), assume a 2-hour
// session for the sign-in window cut-off. The cost of getting this wrong
// is showing the button slightly too long, which is harmless.
const DEFAULT_SESSION_DURATION_MS = 2 * 60 * 60 * 1000;

type NextSessionCardProps = {
  session?: {
    session_id?: string | number;
    session_title: string;
    session_starts_at: string;
    session_ends_at?: string;
    session_location?: string;
  } | null;
  /** Whether this session is already booked by the member */
  isBooked?: boolean;
  /** Existing attendance status if any (e.g. "present", "absent"). */
  attendanceStatus?: string | null;
  /** Backend-owned attendance eligibility for the confirmed booking. */
  signInEligible?: boolean;
};

function formatSessionDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  if (isToday) return `Today at ${time}`;
  if (isTomorrow) return `Tomorrow at ${time}`;

  return `${date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} at ${time}`;
}

function getCountdown(dateStr: string): string {
  const diffMs = new Date(dateStr).getTime() - Date.now();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "Starting soon";
  if (diffHours < 24) return `in ${diffHours}h`;
  if (diffDays === 1) return "in 1 day";
  return `in ${diffDays} days`;
}

export function NextSessionCard({
  session,
  isBooked,
  attendanceStatus,
  signInEligible,
}: NextSessionCardProps) {
  const [signingIn, setSigningIn] = useState(false);
  const [signedInLocal, setSignedInLocal] = useState(false);

  if (!session) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100">
          <Calendar className="h-6 w-6 text-cyan-600" />
        </div>
        <p className="font-semibold text-slate-900">Ready for your next swim?</p>
        <p className="mt-1 text-sm text-slate-500">Browse sessions and book your spot</p>
        <Link href="/sessions" className="mt-4 inline-block">
          <Button size="sm">
            Find a session
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  const locationLabel = session.session_location
    ? LOCATION_LABELS[session.session_location] || session.session_location
    : null;

  // Sign-in window. If the parent didn't pass ends_at (e.g. coming from
  // an AttendanceRecord whose summary omits it), fall back to a 2-hour
  // assumption — overshooting the button's visibility by a bit is fine.
  const now = Date.now();
  const sessionStart = new Date(session.session_starts_at).getTime();
  const sessionEnd = session.session_ends_at
    ? new Date(session.session_ends_at).getTime()
    : sessionStart + DEFAULT_SESSION_DURATION_MS;
  const inSignInWindow =
    now >= sessionStart - SIGN_IN_WINDOW_BEFORE_MS && now <= sessionEnd + SIGN_IN_WINDOW_AFTER_MS;
  const lowerStatus = attendanceStatus?.toLowerCase() ?? "";
  const alreadySignedIn = lowerStatus === "present" || lowerStatus === "late";
  const canSelfSignIn =
    Boolean(isBooked) &&
    signInEligible === true &&
    Boolean(session.session_id) &&
    inSignInWindow &&
    !alreadySignedIn &&
    !signedInLocal;

  const handleSelfSignIn = async () => {
    if (!session.session_id) return;
    setSigningIn(true);
    try {
      await signInToSession({
        sessionId: String(session.session_id),
        status: "present",
      });
      setSignedInLocal(true);
      toast.success("Signed in — see you at the pool!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't sign in.");
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-50 via-blue-50 to-indigo-50 border border-cyan-100 p-5">
      {/* Countdown badge */}
      <div className="absolute top-4 right-4">
        <span className="inline-flex items-center rounded-full bg-cyan-600 px-3 py-1 text-xs font-bold text-white">
          {getCountdown(session.session_starts_at)}
        </span>
      </div>

      <p className="text-xs font-semibold text-cyan-600 uppercase tracking-wider mb-1">
        Next Session
      </p>
      <h3 className="text-lg font-bold text-slate-900 pr-20">{session.session_title}</h3>

      <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span>{formatSessionDate(session.session_starts_at)}</span>
        </div>
        {locationLabel && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-slate-400" />
            <span>{locationLabel}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {canSelfSignIn ? (
            <Button size="sm" onClick={handleSelfSignIn} disabled={signingIn}>
              {signingIn ? "Signing in…" : "I'm here — sign me in"}
            </Button>
          ) : null}
          {isBooked ? (
            <Link
              href={
                session.session_id
                  ? `/sessions/${session.session_id}/book`
                  : "/sessions?view=booked"
              }
            >
              <Button size="sm" variant="outline">
                {signedInLocal || alreadySignedIn ? "Signed in" : "View booking"}
              </Button>
            </Link>
          ) : (
            <Link href={session.session_id ? `/sessions/${session.session_id}/book` : "/sessions"}>
              <Button size="sm">
                Book now
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
        <Link
          href="/sessions"
          className="text-xs font-medium text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
        >
          See all sessions <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
