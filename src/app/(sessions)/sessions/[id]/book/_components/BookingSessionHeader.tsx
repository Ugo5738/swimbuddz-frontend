import { Card } from "@/components/ui/Card";
import {
  getLocationDisplayName,
  getSessionTypeColor,
  getSessionTypeLabel,
  type Session,
} from "@/lib/sessions";
import { Calendar, MapPin, Users } from "lucide-react";

type MemberProfile = {
  first_name?: string;
  last_name?: string;
  email: string;
};

type BookingSessionHeaderProps = {
  session: Session;
  member: MemberProfile | null;
  isRideOnlyFlow: boolean;
};

export function BookingSessionHeader({
  session,
  member,
  isRideOnlyFlow,
}: BookingSessionHeaderProps) {
  const startsAt = new Date(session.starts_at);
  const endsAt = new Date(session.ends_at);

  const dateStr = startsAt.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const startTime = startsAt.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = endsAt.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const locationName = getLocationDisplayName(session.location, session.location_name);
  const typeLabel = getSessionTypeLabel(session.session_type);
  const typeColor = getSessionTypeColor(session.session_type);

  return (
    <div className="space-y-4">
      {/* Ride-only banner */}
      {isRideOnlyFlow && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚗</span>
            <div>
              <p className="font-semibold text-amber-900">Add Ride Share</p>
              <p className="text-sm text-amber-700">
                You&apos;re already booked for this session. Select a ride below to get to the pool.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Session details */}
      <Card className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${typeColor}`}
              >
                {typeLabel}
              </span>
              {!isRideOnlyFlow && (
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Book Session
                </span>
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">{session.title}</h1>
          </div>
        </div>

        {/* Compact info row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-600">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            {dateStr} · {startTime}–{endTime}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-slate-400" />
            {locationName}
          </span>
          {session.capacity > 0 && (
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-400" />
              {session.capacity} spots
            </span>
          )}
        </div>

        {session.description && (
          <p className="text-sm text-slate-500 border-t border-slate-100 pt-3">
            {session.description}
          </p>
        )}

        {/* Booking as ... */}
        {member && (
          <p className="text-xs text-slate-400 border-t border-slate-100 pt-3">
            Booking as{" "}
            <span className="font-medium text-slate-500">
              {member.first_name} {member.last_name}
            </span>{" "}
            · {member.email}
          </p>
        )}
      </Card>
    </div>
  );
}
