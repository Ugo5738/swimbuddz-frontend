import { CalendarCheck2, GraduationCap, TimerReset, UsersRound } from "lucide-react";
import { useMemo } from "react";

import type { Session } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const WAT_OFFSET_MS = 60 * 60 * 1000;

type Props = {
  sessions: Session[];
};

function nextMondayWindow(now: Date) {
  const wat = new Date(now.getTime() + WAT_OFFSET_MS);
  const day = wat.getUTCDay();
  const daysAhead = day === 1 ? 7 : (8 - day) % 7;
  const mondayWatAsUtc = Date.UTC(
    wat.getUTCFullYear(),
    wat.getUTCMonth(),
    wat.getUTCDate() + daysAhead,
  );
  const start = new Date(mondayWatAsUtc - WAT_OFFSET_MS);
  return { start, end: new Date(start.getTime() + 7 * DAY_MS) };
}

function nextDigest(now: Date) {
  const wat = new Date(now.getTime() + WAT_OFFSET_MS);
  const day = wat.getUTCDay();
  let daysAhead = (7 - day) % 7;
  if (daysAhead === 0 && wat.getUTCHours() >= 8) daysAhead = 7;
  const digestWatAsUtc = Date.UTC(
    wat.getUTCFullYear(),
    wat.getUTCMonth(),
    wat.getUTCDate() + daysAhead,
    8,
  );
  return new Date(digestWatAsUtc - WAT_OFFSET_MS);
}

function formatWat(value: Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    month: "short",
    day: "numeric",
    ...options,
  }).format(value);
}

export function SessionCadencePanel({ sessions }: Props) {
  const cadence = useMemo(() => {
    const now = new Date();
    const nextWeek = nextMondayWindow(now);
    const clubHorizon = new Date(now.getTime() + 28 * DAY_MS);
    const inRange = (session: Session, start: Date, end: Date) => {
      const startsAt = new Date(session.starts_at);
      return startsAt >= start && startsAt < end;
    };
    const isPublished = (session: Session) => session.status === "scheduled";
    const isDraft = (session: Session) => session.status === "draft";

    const nextWeekCommunity = sessions.filter(
      (session) =>
        session.session_type === "community" && inRange(session, nextWeek.start, nextWeek.end),
    );
    const clubCoverage = sessions.filter(
      (session) =>
        session.session_type === "club" &&
        inRange(session, now, clubHorizon) &&
        isPublished(session),
    );
    const academyCoverage = sessions.filter(
      (session) =>
        session.session_type === "cohort_class" &&
        new Date(session.starts_at) >= now &&
        isPublished(session),
    );
    const nextWeekDeadline = new Date(nextWeek.start.getTime() - 4 * DAY_MS + 9 * 60 * 60 * 1000);

    return {
      nextWeek,
      nextWeekDeadline,
      digest: nextDigest(now),
      communityPublished: nextWeekCommunity.filter(isPublished).length,
      communityDrafts: nextWeekCommunity.filter(isDraft).length,
      clubPublished: clubCoverage.length,
      clubLatest: clubCoverage
        .map((session) => new Date(session.starts_at))
        .sort((a, b) => b.getTime() - a.getTime())[0],
      academyPublished: academyCoverage.length,
      academyCohorts: new Set(
        academyCoverage.map((session) => session.cohort_id).filter(Boolean),
      ).size,
      allDrafts: sessions.filter(
        (session) => isDraft(session) && new Date(session.starts_at) >= now,
      ).length,
    };
  }, [sessions]);

  const rows = [
    {
      label: "Community next week",
      value: `${cadence.communityPublished} published`,
      detail: `${cadence.communityDrafts} drafts · target ${formatWat(cadence.nextWeekDeadline, {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
      })} WAT`,
      icon: CalendarCheck2,
    },
    {
      label: "Club rolling coverage",
      value: `${cadence.clubPublished} in 28 days`,
      detail: cadence.clubLatest
        ? `Latest published ${formatWat(cadence.clubLatest)}`
        : "No published Club sessions in the horizon",
      icon: UsersRound,
    },
    {
      label: "Academy schedule",
      value: `${cadence.academyPublished} upcoming`,
      detail: `${cadence.academyCohorts} active cohort schedule${cadence.academyCohorts === 1 ? "" : "s"}`,
      icon: GraduationCap,
    },
    {
      label: "Next digest",
      value: formatWat(cadence.digest, { weekday: "short" }),
      detail: `${formatWat(cadence.digest, {
        hour: "numeric",
        minute: "2-digit",
      })} WAT · ${cadence.allDrafts} upcoming drafts`,
      icon: TimerReset,
    },
  ];

  return (
    <section className="border-y border-slate-200 bg-white py-4">
      <div className="grid gap-4 px-1 md:grid-cols-2 xl:grid-cols-4">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.label} className="min-w-0 border-l-2 border-slate-200 pl-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                <Icon className="h-4 w-4 shrink-0 text-cyan-600" />
                <span>{row.label}</span>
              </div>
              <p className="mt-1 text-lg font-semibold text-slate-900">{row.value}</p>
              <p className="mt-0.5 text-xs text-slate-500">{row.detail}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
