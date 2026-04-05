import { Badge } from "@/components/ui/Badge";
import { hasTierAccess, requiredTierForSessionType, tierDisplayLabel } from "@/lib/sessionAccess";
import { getSessionTypeColor, getSessionTypeLabel, Session } from "@/lib/sessions";
import type { MembershipTier } from "@/lib/tiers";
import { Calendar, CheckCircle2, Clock, Lock, MapPin } from "lucide-react";
import Link from "next/link";

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
  membership: MembershipTier;
  isPast?: boolean;
  attendanceStatus?: string;
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
  membership,
  isPast = false,
  attendanceStatus,
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
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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

      {/* Accent bar */}
      {isBooked && <div className="h-1.5 bg-emerald-500" />}
      {effectivelyPast && !isBooked && <div className="h-1.5 bg-slate-300" />}

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
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-slate-900">{session.title}</h3>
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
            <Link
              href={`/sessions/${session.id}/book`}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" />
              View my booking
            </Link>
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
