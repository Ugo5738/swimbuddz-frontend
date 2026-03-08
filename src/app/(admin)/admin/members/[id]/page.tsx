"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { TagList } from "@/components/ui/TagList";
import { apiGet } from "@/lib/api";
import {
  academyFocusOptions,
  availabilityOptions,
  currencyOptions,
  discoverySourceOptions,
  equipmentNeedsOptions,
  facilityAccessOptions,
  interestOptions,
  languageOptions,
  locationOptions,
  paymentReadinessOptions,
  strokesOptions,
  timeOfDayOptions,
  travelFlexibilityOptions,
  volunteerInterestOptions,
} from "@/lib/options";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Clock,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  Shield,
  Trophy,
  Users,
  Waves,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// ============================================================================
// TYPES — matches the backend's nested MemberResponse structure
// ============================================================================

type MemberProfileData = {
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  time_zone?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  occupation?: string | null;
  area_in_lagos?: string | null;
  swim_level?: string | null;
  deep_water_comfort?: string | null;
  strokes?: string[] | null;
  interests?: string[] | null;
  personal_goals?: string | null;
  how_found_us?: string | null;
  previous_communities?: string | null;
  hopes_from_swimbuddz?: string | null;
  social_instagram?: string | null;
  social_linkedin?: string | null;
  social_other?: string | null;
  show_in_directory?: boolean;
  interest_tags?: string[] | null;
};

type MemberEmergencyData = {
  name?: string | null;
  contact_relationship?: string | null;
  phone?: string | null;
  region?: string | null;
  medical_info?: string | null;
  safety_notes?: string | null;
};

type MemberAvailabilityData = {
  available_days?: string[] | null;
  preferred_times?: string[] | null;
  preferred_locations?: string[] | null;
  accessible_facilities?: string[] | null;
  travel_flexibility?: string | null;
  equipment_needed?: string[] | null;
};

type MemberMembershipData = {
  primary_tier?: string;
  active_tiers?: string[] | null;
  requested_tiers?: string[] | null;
  community_paid_until?: string | null;
  club_paid_until?: string | null;
  academy_paid_until?: string | null;
  club_badges_earned?: string[] | null;
  punctuality_score?: number;
  commitment_score?: number;
  club_notes?: string | null;
  academy_focus_areas?: string[] | null;
  academy_goals?: string | null;
  academy_preferred_coach_gender?: string | null;
  academy_lesson_preference?: string | null;
};

type MemberPreferencesData = {
  language_preference?: string | null;
  comms_preference?: string | null;
  payment_readiness?: string | null;
  currency_preference?: string | null;
  consent_photo?: string | null;
  community_rules_accepted?: boolean;
  volunteer_interest?: string[] | null;
  volunteer_roles_detail?: string | null;
  discovery_source?: string | null;
};

type MemberResponse = {
  id: string;
  auth_id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  registration_complete: boolean;
  roles?: string[] | null;
  approval_status: string;
  approval_notes?: string | null;
  approved_at?: string | null;
  profile_photo_media_id?: string | null;
  profile_photo_url?: string | null;
  created_at: string;
  updated_at: string;
  profile?: MemberProfileData | null;
  emergency_contact?: MemberEmergencyData | null;
  availability?: MemberAvailabilityData | null;
  membership?: MemberMembershipData | null;
  preferences?: MemberPreferencesData | null;
};

// ============================================================================
// HELPERS
// ============================================================================

function getLabel(
  options: { value: string; label: string }[],
  value: string | null | undefined
): string {
  if (!value) return "";
  return options.find((o) => o.value === value)?.label || formatToken(value);
}

function formatToken(value: string | null | undefined): string {
  if (!value) return "";
  const overrides: Record<string, string> = {
    cpr: "CPR",
    im: "IM",
    ngn: "NGN",
    usd: "USD",
    gbp: "GBP",
    eur: "EUR",
  };
  const lower = value.toLowerCase();
  if (overrides[lower]) return overrides[lower];
  return value
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function calculateCompleteness(m: MemberResponse): number {
  const checks = [
    !!m.profile?.phone,
    !!m.profile?.city,
    !!m.profile?.swim_level,
    !!m.profile?.deep_water_comfort,
    (m.profile?.strokes?.length ?? 0) > 0,
    !!m.profile?.personal_goals,
    !!m.emergency_contact?.name,
    !!m.emergency_contact?.phone,
    (m.availability?.available_days?.length ?? 0) > 0,
    !!m.preferences?.language_preference,
    !!m.preferences?.comms_preference,
    (m.membership?.active_tiers?.length ?? 0) > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function tierExpiry(
  tier: string,
  membership: MemberMembershipData | null | undefined
): string | null {
  if (!membership) return null;
  const map: Record<string, string | null | undefined> = {
    community: membership.community_paid_until,
    club: membership.club_paid_until,
    academy: membership.academy_paid_until,
  };
  return map[tier] ? formatDate(map[tier]) : null;
}

const levelLabels: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const deepWaterLabels: Record<string, string> = {
  learning: "Learning",
  comfortable: "Comfortable",
  expert: "Expert",
};

// ============================================================================
// FIELD — reusable label + value display
// ============================================================================

function Field({
  label,
  value,
  children,
}: {
  label: string;
  value?: string | null;
  children?: React.ReactNode;
}) {
  const display = value && value.length > 0 ? value : null;

  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
      {children ? (
        <div className="mt-0.5 text-sm text-slate-700">{children}</div>
      ) : (
        <p className={`mt-0.5 text-sm ${display ? "text-slate-700" : "text-slate-300"}`}>
          {display || "—"}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// SECTION: PROFILE HEADER
// ============================================================================

function ProfileHeader({ member }: { member: MemberResponse }) {
  const completeness = calculateCompleteness(member);
  const p = member.profile;
  const m = member.membership;

  const locationParts = [p?.city, p?.country].filter(Boolean);
  const location = locationParts.length > 0 ? locationParts.join(", ") : null;

  const allTiers = ["community", "club", "academy"];
  const activeTiers = m?.active_tiers ?? [];

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500" />

      <div className="flex flex-col gap-6 pt-2 sm:flex-row sm:items-start">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {member.profile_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.profile_photo_url}
              alt={`${member.first_name} ${member.last_name}`}
              className="h-20 w-20 rounded-full object-cover ring-2 ring-slate-100"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 text-2xl font-bold text-cyan-700 ring-2 ring-slate-100">
              {getInitials(member.first_name, member.last_name)}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {member.first_name} {member.last_name}
            </h1>
            <Badge variant={member.is_active ? "success" : "danger"}>
              {member.is_active ? "Active" : "Inactive"}
            </Badge>
            {!member.registration_complete && (
              <Badge variant="warning">Registration incomplete</Badge>
            )}
            {member.approval_status === "pending" && (
              <Badge variant="warning">Pending approval</Badge>
            )}
          </div>

          {/* Contact line */}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {member.email}
            </span>
            {p?.phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                {p.phone}
              </span>
            )}
            {location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {location}
              </span>
            )}
            {p?.time_zone && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {p.time_zone}
              </span>
            )}
          </div>

          {/* Tier badges with expiry dates */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {allTiers.map((tier) => {
              const active = activeTiers.includes(tier);
              const expiry = tierExpiry(tier, m);
              return (
                <div key={tier} className="flex items-center gap-1">
                  <Badge
                    variant={
                      active
                        ? tier === "academy"
                          ? "success"
                          : tier === "club"
                            ? "info"
                            : "default"
                        : "outline"
                    }
                  >
                    {active && <CheckCircle2 className="mr-1 inline h-3 w-3" />}
                    {formatToken(tier)}
                  </Badge>
                  {active && expiry && (
                    <span className="text-[11px] text-slate-400">until {expiry}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Member since + profile completeness */}
          <div className="mt-4 flex flex-wrap items-center gap-6">
            <span className="text-xs text-slate-400">
              Member since {formatDate(member.created_at)}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Profile {completeness}%</span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${
                    completeness >= 80
                      ? "bg-emerald-500"
                      : completeness >= 50
                        ? "bg-amber-400"
                        : "bg-rose-400"
                  }`}
                  style={{ width: `${completeness}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// SECTION: EMERGENCY & SAFETY — elevated priority for a swimming platform
// ============================================================================

function EmergencySection({ emergency }: { emergency: MemberEmergencyData | null | undefined }) {
  const hasData = emergency && (emergency.name || emergency.phone);

  if (!hasData) {
    return (
      <Alert variant="error" title="No emergency contact on file">
        This member has not provided emergency contact information. This is critical for pool
        safety.
      </Alert>
    );
  }

  return (
    <Card className="border-l-4 border-l-rose-400">
      <div className="mb-4 flex items-center gap-2">
        <Shield className="h-5 w-5 text-rose-500" />
        <h2 className="text-lg font-semibold text-slate-900">Emergency & Safety</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Contact name" value={emergency.name} />
        <Field label="Relationship" value={formatToken(emergency.contact_relationship)} />
        <Field label="Phone" value={emergency.phone} />
        <Field label="Region" value={emergency.region} />
        <Field label="Medical info" value={emergency.medical_info || "None disclosed"} />
        <Field label="Safety notes" value={emergency.safety_notes || "None"} />
      </div>
    </Card>
  );
}

// ============================================================================
// SECTION: SWIM PROFILE
// ============================================================================

function SwimProfileSection({ profile }: { profile: MemberProfileData | null | undefined }) {
  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <Waves className="h-5 w-5 text-cyan-500" />
        <h2 className="text-lg font-semibold text-slate-900">Swim Profile</h2>
      </div>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Level"
            value={
              profile?.swim_level
                ? (levelLabels[profile.swim_level] ?? formatToken(profile.swim_level))
                : null
            }
          />
          <Field
            label="Deep-water comfort"
            value={
              profile?.deep_water_comfort
                ? (deepWaterLabels[profile.deep_water_comfort] ??
                  formatToken(profile.deep_water_comfort))
                : null
            }
          />
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
            Strokes
          </p>
          <TagList
            items={profile?.strokes ?? []}
            variant="cyan"
            getLabel={(s) => getLabel(strokesOptions, s)}
            emptyText="No strokes shared yet"
          />
        </div>

        <Field label="Goals" value={profile?.personal_goals} />

        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
            Interests
          </p>
          <TagList
            items={profile?.interests ?? []}
            variant="emerald"
            getLabel={(s) => getLabel(interestOptions, s)}
            emptyText="No interests selected"
          />
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// SECTION: MEMBERSHIP
// ============================================================================

function MembershipSection({
  membership,
}: {
  membership: MemberMembershipData | null | undefined;
}) {
  const tiers = [
    {
      key: "community",
      label: "Community",
      until: membership?.community_paid_until,
    },
    {
      key: "club",
      label: "Club",
      until: membership?.club_paid_until,
    },
    {
      key: "academy",
      label: "Academy",
      until: membership?.academy_paid_until,
    },
  ];

  const activeTiers = membership?.active_tiers ?? [];

  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-blue-500" />
        <h2 className="text-lg font-semibold text-slate-900">Membership</h2>
      </div>

      <div className="space-y-2">
        {tiers.map((tier) => {
          const active = activeTiers.includes(tier.key);
          const expired = tier.until && new Date(tier.until) < new Date();
          return (
            <div
              key={tier.key}
              className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
                {active ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-slate-300" />
                )}
                <span
                  className={`text-sm font-medium ${active ? "text-slate-700" : "text-slate-400"}`}
                >
                  {tier.label}
                </span>
              </div>
              <span className="text-xs text-slate-400">
                {active && tier.until
                  ? expired
                    ? `Expired ${formatDate(tier.until)}`
                    : `Until ${formatDate(tier.until)}`
                  : active
                    ? "Active"
                    : "—"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Gamification scores */}
      {(membership?.punctuality_score || membership?.commitment_score) && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Club Scores
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400">Punctuality</p>
              <p className="text-lg font-bold text-slate-700">
                {membership?.punctuality_score ?? 0}
                <span className="text-xs font-normal text-slate-400">/10</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Commitment</p>
              <p className="text-lg font-bold text-slate-700">
                {membership?.commitment_score ?? 0}
                <span className="text-xs font-normal text-slate-400">/10</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Academy focus areas */}
      {(membership?.academy_focus_areas?.length ?? 0) > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
            Academy Focus Areas
          </p>
          <TagList
            items={membership!.academy_focus_areas!}
            variant="emerald"
            getLabel={(s) => getLabel(academyFocusOptions, s)}
          />
        </div>
      )}

      {membership?.academy_goals && (
        <div className="mt-3">
          <Field label="Academy goals" value={membership.academy_goals} />
        </div>
      )}
    </Card>
  );
}

// ============================================================================
// SECTION: AVAILABILITY & LOGISTICS
// ============================================================================

function AvailabilitySection({
  availability,
}: {
  availability: MemberAvailabilityData | null | undefined;
}) {
  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-purple-500" />
        <h2 className="text-lg font-semibold text-slate-900">Availability & Logistics</h2>
      </div>

      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
            Available Days
          </p>
          <TagList
            items={availability?.available_days ?? []}
            getLabel={(s) => getLabel(availabilityOptions, s)}
            emptyText="Not specified"
          />
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
            Preferred Times
          </p>
          <TagList
            items={availability?.preferred_times ?? []}
            getLabel={(s) => getLabel(timeOfDayOptions, s)}
            emptyText="Not specified"
          />
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
            Preferred Locations
          </p>
          <TagList
            items={availability?.preferred_locations ?? []}
            variant="cyan"
            getLabel={(s) => getLabel(locationOptions, s)}
            emptyText="Not specified"
          />
        </div>

        <Field
          label="Travel flexibility"
          value={getLabel(travelFlexibilityOptions, availability?.travel_flexibility)}
        />

        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
            Facility Access
          </p>
          <TagList
            items={availability?.accessible_facilities ?? []}
            getLabel={(s) => getLabel(facilityAccessOptions, s)}
            emptyText="Not specified"
          />
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
            Equipment Needs
          </p>
          <TagList
            items={availability?.equipment_needed ?? []}
            variant="amber"
            getLabel={(s) => getLabel(equipmentNeedsOptions, s)}
            emptyText="None"
          />
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// SECTION: COMMUNITY & PREFERENCES
// ============================================================================

function CommunitySection({
  preferences,
  profile,
}: {
  preferences: MemberPreferencesData | null | undefined;
  profile: MemberProfileData | null | undefined;
}) {
  const hasSocials = profile?.social_instagram || profile?.social_linkedin || profile?.social_other;

  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-emerald-500" />
        <h2 className="text-lg font-semibold text-slate-900">Community & Preferences</h2>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="How they found us"
            value={getLabel(
              discoverySourceOptions,
              preferences?.discovery_source ?? profile?.how_found_us
            )}
          />
          <Field
            label="Language"
            value={getLabel(languageOptions, preferences?.language_preference)}
          />
          <Field label="Comms preference" value={formatToken(preferences?.comms_preference)} />
          <Field
            label="Currency"
            value={getLabel(currencyOptions, preferences?.currency_preference)}
          />
          <Field
            label="Payment readiness"
            value={getLabel(paymentReadinessOptions, preferences?.payment_readiness)}
          />
          <Field
            label="Photo consent"
            value={
              preferences?.consent_photo === "yes"
                ? "Consented"
                : preferences?.consent_photo === "no"
                  ? "Declined"
                  : null
            }
          />
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
            Volunteer Interest
          </p>
          <TagList
            items={preferences?.volunteer_interest ?? []}
            variant="emerald"
            getLabel={(s) => getLabel(volunteerInterestOptions, s)}
            emptyText="None"
          />
        </div>

        {preferences?.volunteer_roles_detail && (
          <Field label="Volunteer notes" value={preferences.volunteer_roles_detail} />
        )}

        {hasSocials && (
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
              Social Links
            </p>
            <div className="flex flex-col gap-1 text-sm">
              {profile?.social_instagram && (
                <span className="text-slate-600">
                  Instagram: @{profile.social_instagram.replace(/^@/, "")}
                </span>
              )}
              {profile?.social_linkedin && (
                <a
                  href={profile.social_linkedin}
                  className="text-cyan-600 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  LinkedIn profile
                </a>
              )}
              {profile?.social_other && (
                <span className="text-slate-600">{profile.social_other}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

interface PageProps {
  params: { id: string };
}

export default function AdminMemberDetailPage({ params }: PageProps) {
  const router = useRouter();
  const [member, setMember] = useState<MemberResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiGet<MemberResponse>(`/api/v1/members/${params.id}`, { auth: true })
      .then((data) => {
        setMember(data);
        setError(null);
      })
      .catch((err: Error) => {
        console.error("Failed to fetch member:", err);
        setError("Unable to load member profile. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <LoadingCard text="Loading member profile..." />
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <Alert variant="error" title="Error loading profile">
          {error || "Member not found."}
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ChevronLeft className="mr-1 h-4 w-4" />
        Back
      </Button>

      <ProfileHeader member={member} />

      {/* Emergency — elevated priority for a swimming platform */}
      <EmergencySection emergency={member.emergency_contact} />

      <div className="grid gap-6 lg:grid-cols-2">
        <SwimProfileSection profile={member.profile} />
        <MembershipSection membership={member.membership} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AvailabilitySection availability={member.availability} />
        <CommunitySection preferences={member.preferences} profile={member.profile} />
      </div>
    </div>
  );
}
