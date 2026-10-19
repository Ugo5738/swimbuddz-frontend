"use client";

import { useApi } from "@/hooks/useApi";

export type ClubSessionScope = {
  id: string;
  starts_at: string;
  session_type: string | null;
  club_id?: string | null;
  pool_id?: string | null;
  pod_id?: string | null;
  club_access_mode?: "plan_included" | "active_club" | "paid_addon";
  allows_visiting_club_members?: boolean;
};

type ClubRosterMember = {
  member_id: string;
  name: string;
  email: string;
  access_source: string;
};

type ClubSessionRoster = { session_id: string; members: ClubRosterMember[] };

export function useClubSessionRoster(session: ClubSessionScope | null) {
  const isClub = session?.session_type?.toLowerCase() === "club";
  let path: string | null = null;
  if (session && isClub) {
    const query = new URLSearchParams({
      session_id: session.id,
      at: session.starts_at,
      club_access_mode: session.club_access_mode ?? "plan_included",
      allows_visiting_club_members: String(session.allows_visiting_club_members ?? false),
    });
    for (const key of ["club_id", "pool_id", "pod_id"] as const) {
      const value = session[key];
      if (value) query.set(key, value);
    }
    path = `/api/v1/members/club-session-roster?${query}`;
  }
  const roster = useApi<ClubSessionRoster>(path);
  return {
    ...roster,
    // Never show the previous session's expected members while switching.
    members: isClub && roster.data?.session_id === session?.id ? roster.data.members : [],
  };
}
