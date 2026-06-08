"use client";

import { SessionWeatherChip } from "@/components/sessions/SessionWeatherChip";
import { Badge } from "@/components/ui/Badge";
import { hasTierAccess, requiredTierForSessionType, tierDisplayLabel } from "@/lib/sessionAccess";
import {
  type CohortInfo,
  excuseBooking,
  getCohortColor,
  getSessionTypeColor,
  getSessionTypeLabel,
  isRunningLate,
  isSelfExcused,
  Session,
  SessionType,
  setRunningLate,
  signInToSession,
} from "@/lib/sessions";
import type { MembershipTier } from "@/lib/tiers";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Clock3,
  Lock,
  MapPin,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

// Booking shape needed by self-report controls. Mirrors the relevant
// subset of MyBooking — kept inline so this shared component doesn't take
// a hard dependency on the member-app type file.
type MemberBookingMinimal = {
  id?: string;
  status?: string;
  notes?: string | null;
};

// Members can self sign-in starting 30 min before session start and up
// to 60 min after session end. Window is intentionally generous so a
// late member can still confirm they came; admins can override later.
const SIGN_IN_WINDOW_BEFORE_MS = 30 * 60 * 1000;
const SIGN_IN_WINDOW_AFTER_MS = 60 * 60 * 1000;

// ── Helpers ──────────────────────────────────────────────────────────────

function formatDate(start: string) {
  return new Date(start).toLocaleDateString("en-NG", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTimeRange(start: string, end: string) {
  const fmt = (d: string) =>
    new Date(d).toLocaleTimeString("en-NG", {
      hour: "2-digit",
      minute: "2-digit",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(value);
}

function getUpgradeHref(requiredTier: MembershipTier): string {
  if (requiredTier === "academy") return "/account/academy/browse";
  if (requiredTier === "club") return "/club";
  return "/community";
}

// ── Types ────────────────────────────────────────────────────────────────

type RideConfig = {
  id: string;
  ride_area_name: string;
  cost: number;
  capacity: number;
  pickup_locations?: Array<{ id: string; name: string }>;
};

export type SessionWithRides = Session & {
  ride_configs?: RideConfig[];
};

type SessionCardProps = {
  session: SessionWithRides;
  isBooked: boolean;
  /** The member's active booking for this session, when known. Powers
   *  the per-row self-report actions ("I can't make it" / "I'll be
   *  late"). Optional — callers that don't have this (e.g. coach
   *  views) won't render those controls. */
  myBooking?: MemberBookingMinimal;
  membership: MembershipTier;
  isPast?: boolean;
  attendanceStatus?: string;
  /** Cohort identity info for academy sessions. */
  cohortInfo?: CohortInfo;
  /** Whether the session is selectable in multi-select mode. */
  selectable?: boolean;
  /** Whether the session is currently selected for bundle booking. */
  selected?: boolean;
  /** Called when the select checkbox is toggled. */
  onToggleSelect?: () => void;
};

// ── Component ────────────────────────────────────────────────────────────

export function SessionCard({
  session,
  isBooked,
  myBooking,
  membership,
  isPast = false,
  attendanceStatus,
  cohortInfo,
  selectable = false,
  selected = false,
  onToggleSelect,
}: SessionCardProps) {
  const requiredTier = requiredTierForSessionType(session.session_type);
  const canBook = hasTierAccess(membership, requiredTier);
  const typeColor = getSessionTypeColor(session.session_type);
  // A session is "ended" if its end time has passed, regardless of which tab we're on.
  // This prevents users from trying to book past sessions via the All tab.
  const sessionEnded = new Date(session.ends_at).getTime() < Date.now();
  const effectivelyPast = isPast || sessionEnded;
  const canSelect = selectable && !isBooked && !effectivelyPast && canBook;

  // Sign-in window for a booked, paid-up member to confirm they showed
  // up. Only renders the button when we're inside the window AND the
  // member hasn't already been marked PRESENT/LATE. ABSENT/EXCUSED do
  // NOT re-open the window — those are admin-set states.
  const now = Date.now();
  const sessionStart = new Date(session.starts_at).getTime();
  const sessionEnd = new Date(session.ends_at).getTime();
  const inSignInWindow =
    now >= sessionStart - SIGN_IN_WINDOW_BEFORE_MS && now <= sessionEnd + SIGN_IN_WINDOW_AFTER_MS;
  const lowerStatus = attendanceStatus?.toLowerCase() ?? "";
  const alreadySignedIn = lowerStatus === "present" || lowerStatus === "late";
  const canSelfSignIn = isBooked && inSignInWindow && !alreadySignedIn;

  const [signingIn, setSigningIn] = useState(false);
  const [signedInLocal, setSignedInLocal] = useState(false);
  const handleSelfSignIn = async () => {
    setSigningIn(true);
    try {
      await signInToSession({ sessionId: session.id, status: "present" });
      setSignedInLocal(true);
      toast.success("Signed in — see you at the pool!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't sign in.");
    } finally {
      setSigningIn(false);
    }
  };

  // ── Self-report controls ("I can't make it" / "I'll be late") ─────────
  // Only render when we have a confirmed booking AND the session hasn't
  // started yet (running-late is allowed up to session start; excuse is
  // server-gated by a 24h cutoff). Local optimistic state mirrors the
  // server response so the buttons reflect intent immediately.
  const bookingId = myBooking?.id ?? null;
  const bookingStatus = (myBooking?.status ?? "").toLowerCase();
  const [bookingNotes, setBookingNotes] = useState<string | null | undefined>(
    myBooking?.notes
  );
  const [excusing, setExcusing] = useState(false);
  const [excusedLocal, setExcusedLocal] = useState(false);
  const [flaggingLate, setFlaggingLate] = useState(false);

  const sessionUpcoming = sessionStart > now;
  const canSelfReport =
    !!bookingId &&
    bookingStatus === "confirmed" &&
    sessionUpcoming &&
    !alreadySignedIn &&
    !signedInLocal &&
    !excusedLocal;
  const memberHasLateFlag = isRunningLate(bookingNotes) || flaggingLate;
  const memberHasExcused = isSelfExcused(bookingNotes) || excusedLocal;

  const handleSelfExcuse = async () => {
    if (!bookingId) return;
    if (
      !window.confirm(
        "Let us know you can't make it — we'll schedule a make-up. " +
          "Continue?"
      )
    ) {
      return;
    }
    setExcusing(true);
    try {
      const updated = await excuseBooking(bookingId);
      setBookingNotes(updated.notes ?? null);
      setExcusedLocal(true);
      toast.success("Got it — coach has been notified, make-up will be scheduled.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't record excuse.");
    } finally {
      setExcusing(false);
    }
  };

  const handleToggleLate = async () => {
    if (!bookingId) return;
    const next = !memberHasLateFlag;
    setFlaggingLate(next);
    try {
      const updated = await setRunningLate(bookingId, next);
      setBookingNotes(updated.notes ?? null);
      toast.success(next ? "Coach knows you're running late." : "Late flag cleared.");
    } catch (e) {
      // Roll the optimistic flag back on failure.
      setFlaggingLate(!next);
      toast.error(e instanceof Error ? e.message : "Couldn't update flag.");
    }
  };

  const isAcademy = session.session_type === SessionType.COHORT_CLASS;
  const cohortColor = isAcademy && session.cohort_id ? getCohortColor(session.cohort_id) : null;
  // De-emphasise academy sessions that don't belong to the member's enrolled cohort
  const dimmed = isAcademy && cohortInfo && !cohortInfo.isEnrolled && !isBooked && !effectivelyPast;

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md ${
        selected
          ? "border-cyan-500 ring-2 ring-cyan-500/20"
          : isBooked
            ? "border-emerald-200"
            : !canBook
              ? "border-slate-100 opacity-75"
              : effectivelyPast
                ? "border-slate-100 opacity-80"
                : dimmed
                  ? "border-slate-100 opacity-60"
                  : "border-slate-100 hover:border-cyan-200"
      }`}
    >
      {/* Select checkbox overlay */}
      {selectable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (canSelect && onToggleSelect) onToggleSelect();
          }}
          disabled={!canSelect}
          aria-label={selected ? "Deselect session" : "Select session"}
          className={`absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-md border-2 transition-colors ${
            selected
              ? "border-cyan-600 bg-cyan-600 text-white"
              : canSelect
                ? "border-slate-300 bg-white hover:border-cyan-500"
                : "border-slate-200 bg-slate-50 cursor-not-allowed"
          }`}
        >
          {selected && (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </button>
      )}

      {/* Accent bar — cohort color for academy, else booked/past defaults */}
      {isAcademy && cohortColor ? (
        <div className="h-1.5" style={{ backgroundColor: cohortColor }} />
      ) : isBooked ? (
        <div className="h-1.5 bg-emerald-500" />
      ) : effectivelyPast ? (
        <div className="h-1.5 bg-slate-300" />
      ) : null}

      <div className="flex flex-1 flex-col p-5">
        {/* Badges row */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${typeColor}`}
          >
            {getSessionTypeLabel(session.session_type)}
          </span>

          {isBooked ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              Booked
            </span>
          ) : effectivelyPast ? (
            attendanceStatus ? (
              <Badge variant="default" className="capitalize">
                {attendanceStatus.replace("_", " ")}
              </Badge>
            ) : (
              <Badge variant="default">Completed</Badge>
            )
          ) : !canBook ? (
            <Badge variant="warning" className="capitalize">
              Requires {tierDisplayLabel(requiredTier)}
            </Badge>
          ) : (
            <Badge variant="success">Available</Badge>
          )}

          {/* "Your Cohort" badge for enrolled academy sessions */}
          {cohortInfo?.isEnrolled && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">
              <Users className="h-3 w-3" />
              Your Cohort
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-slate-900">{session.title}</h3>

        {/* Cohort identifier for academy sessions */}
        {cohortInfo && (
          <p className="mt-0.5 text-sm font-medium text-slate-500">
            <span
              className="mr-1.5 inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: cohortColor ?? undefined }}
            />
            {cohortInfo.cohortName} Cohort
          </p>
        )}

        {session.description && (
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{session.description}</p>
        )}

        {/* Details */}
        <div className="mt-4 space-y-1.5 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
            <span>{formatDate(session.starts_at)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-slate-400" />
            <span>{formatTimeRange(session.starts_at, session.ends_at)}</span>
          </div>
          {(session.location_name || session.location) && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
              <span>{session.location_name || session.location || "Location TBA"}</span>
            </div>
          )}
          {session.pool_id && (
            <SessionWeatherChip
              poolId={session.pool_id}
              startsAt={session.starts_at}
              isPast={effectivelyPast}
            />
          )}
        </div>

        {/* Fees (upcoming only) */}
        {!effectivelyPast && (
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Pool fee</p>
              <p className="font-semibold text-slate-900">{formatCurrency(session.pool_fee)}</p>
            </div>
            {session.ride_configs && session.ride_configs.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Ride-share</p>
                <p className="font-semibold text-slate-900">
                  From {formatCurrency(Math.min(...session.ride_configs.map((c) => c.cost)))}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Ride-share areas (upcoming + available only) */}
        {!effectivelyPast && canBook && session.ride_configs && session.ride_configs.length > 0 && (
          <div className="mt-3 rounded bg-emerald-50 px-3 py-2 space-y-1">
            <p className="text-xs font-semibold text-emerald-900">Ride-share available:</p>
            {session.ride_configs.map((config, idx) => (
              <div key={idx} className="text-xs text-emerald-800">
                &bull; {config.ride_area_name} – {formatCurrency(config.cost)} (
                {config.pickup_locations?.length || 0} pickup points)
              </div>
            ))}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* CTA */}
        <div className="mt-4">
          {isBooked ? (
            <div className="space-y-2">
              {memberHasExcused ? (
                <div className="flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-800">
                  <XCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    You've let us know you can't make it. A make-up will
                    be scheduled.
                  </span>
                </div>
              ) : memberHasLateFlag ? (
                <div className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                  <Clock3 className="h-3.5 w-3.5 shrink-0" />
                  <span>Coach knows you're running late.</span>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                {canSelfSignIn && !signedInLocal ? (
                  <button
                    type="button"
                    onClick={handleSelfSignIn}
                    disabled={signingIn}
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700 disabled:opacity-60 transition-colors"
                  >
                    {signingIn ? "Signing in…" : "I'm here — sign me in"}
                  </button>
                ) : null}
                <Link
                  href={`/sessions/${session.id}/book`}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {signedInLocal || alreadySignedIn ? "Signed in" : "View my booking"}
                </Link>
              </div>

              {canSelfReport && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleToggleLate}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      memberHasLateFlag
                        ? "border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200"
                        : "border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50"
                    }`}
                  >
                    <Clock3 className="h-3.5 w-3.5" />
                    {memberHasLateFlag ? "I'm on time" : "I'll be late"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSelfExcuse}
                    disabled={excusing}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60 transition-colors"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    {excusing ? "Recording…" : "I can't make it"}
                  </button>
                </div>
              )}
            </div>
          ) : effectivelyPast ? null : !canBook ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-1.5 text-amber-700">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                <p>Available to {tierDisplayLabel(requiredTier)} members</p>
              </div>
              <Link
                href={getUpgradeHref(requiredTier)}
                className="inline-flex font-semibold text-cyan-700 hover:underline"
              >
                Upgrade to {tierDisplayLabel(requiredTier)} &rarr;
              </Link>
            </div>
          ) : (
            <Link
              href={`/sessions/${session.id}/book`}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700 transition-colors"
            >
              Book spot
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
