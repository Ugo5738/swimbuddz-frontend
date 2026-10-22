"use client";

import { createContext, useContext } from "react";
import type { MembershipTierStatus } from "@/lib/tiers";

export type MemberInfo = {
  id?: string;
  first_name?: string;
  last_name?: string;
  profile_photo_url?: string;
  profile_photo_media_id?: string;
  email?: string;

  coach_profile?: { id?: string } | null;

  // Nested sub-records
  profile?: {
    phone?: string | null;
    deep_water_comfort?: string | null;
    personal_goals?: string | null;
    gender?: string | null;
    date_of_birth?: string | null;
    city?: string | null;
    country?: string | null;
    time_zone?: string | null;
    swim_level?: string | null;
  };
  emergency_contact?: {
    name?: string | null;
    contact_relationship?: string | null;
    phone?: string | null;
  };
  availability?: {
    available_days?: string[] | null;
    preferred_times?: string[] | null;
    preferred_locations?: string[] | null;
  };
  membership?: {
    primary_tier?: string | null;
    active_tiers?: string[] | null;
    requested_tiers?: string[] | null;
    community_paid_until?: string | null;
    club_paid_until?: string | null;
    academy_paid_until?: string | null;
    paid_tier?: string | null;
    paid_tiers?: string[] | null;
    display_label?: string | null;
    display_detail?: string | null;
    tier_statuses?: Partial<Record<"community" | "club" | "academy", MembershipTierStatus>> | null;
    academy_skill_assessment?: Record<string, boolean> | null;
    academy_goals?: string | null;
    academy_preferred_coach_gender?: string | null;
    academy_lesson_preference?: string | null;
  };
};

export type MemberProfileState = {
  data: MemberInfo | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

// Scoped to the mounted member shell: no global or persistent profile cache.
export const MemberProfileContext = createContext<MemberProfileState | null>(null);

export function useMemberProfile(): MemberProfileState {
  const profile = useContext(MemberProfileContext);
  if (!profile) throw new Error("useMemberProfile requires MemberLayout");
  return profile;
}
