"use client";

import { Badge } from "@/components/ui/Badge";
import { useMediaUrl } from "@/hooks/useMediaUrl";
import { LOCATION_LABELS } from "@/lib/sessions";

type GreetingHeroProps = {
  firstName: string;
  profilePhotoMediaId?: string | null;
  tierLabel: string;
  tierVariant?: "info" | "success" | "warning" | "default";
  nextSession?: {
    title: string;
    starts_at: string;
    location?: string;
  } | null;
  streakCurrent?: number;
  streakLongest?: number;
};

const MOTIVATIONAL = [
  "Every lap counts. Let's make today great.",
  "The water is waiting for you.",
  "Consistency beats intensity. Keep showing up.",
  "Your swim community is cheering you on.",
];

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const target = new Date(dateStr);
  const diffMs = target.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "very soon";
  if (diffHours < 24) return `in ${diffHours} hour${diffHours === 1 ? "" : "s"}`;
  if (diffDays === 1) return "tomorrow";
  return `in ${diffDays} days`;
}

function getSubtitle(props: GreetingHeroProps): string {
  const { nextSession, streakCurrent, streakLongest } = props;

  if (nextSession) {
    const sessionDate = new Date(nextSession.starts_at);
    const now = new Date();
    const isToday = sessionDate.toDateString() === now.toDateString();
    if (isToday) {
      const location = nextSession.location
        ? LOCATION_LABELS[nextSession.location] || nextSession.location
        : "";
      const time = sessionDate.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
      return `You have a session${location ? ` at ${location}` : ""} at ${time}`;
    }
    return `Next swim ${getRelativeTime(nextSession.starts_at)} — ${nextSession.title}`;
  }

  const streak = streakCurrent || streakLongest || 0;
  if (streak > 0) {
    return streakCurrent && streakCurrent > 0
      ? `You're on a ${streakCurrent}-week streak — keep it up! 🔥`
      : `Your best streak this year: ${streakLongest} weeks 🔥`;
  }

  return MOTIVATIONAL[Math.floor(Date.now() / 86400000) % MOTIVATIONAL.length];
}

export function GreetingHero(props: GreetingHeroProps) {
  const { firstName, profilePhotoMediaId, tierLabel, tierVariant = "info" } = props;
  const [photoUrl] = useMediaUrl(profilePhotoMediaId);
  const subtitle = getSubtitle(props);

  return (
    <div className="flex items-center gap-4">
      {/* Avatar */}
      <div className="flex-shrink-0">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={firstName}
            className="h-14 w-14 rounded-full object-cover ring-2 ring-cyan-200"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-xl font-bold text-white ring-2 ring-cyan-200">
            {firstName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-bold text-slate-900 md:text-2xl">
            {getTimeGreeting()}, {firstName}
          </h1>
          <Badge variant={tierVariant} className="text-[10px]">
            {tierLabel}
          </Badge>
        </div>
        <p className="mt-0.5 text-sm text-slate-500 truncate">{subtitle}</p>
      </div>
    </div>
  );
}
