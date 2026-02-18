"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { apiGet } from "@/lib/api";
import { LoadingCard } from "@/components/ui/LoadingCard";
import {
  discoverySourceOptions,
  languageOptions,
  travelFlexibilityOptions,
} from "@/lib/options";

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

const travelFlexibilityLabels: Record<string, string> = {
  local_only: "Local sessions only",
  regional: "Regional travel is OK",
  global: "Global / relocation ready",
};

const paymentReadinessLabels: Record<string, string> = {
  ready_now: "Ready to pay now",
  need_notice: "Need advance notice",
  sponsor_support: "Looking for sponsor support",
};

const membershipTierLabels: Record<string, string> = {
  community: "Community",
  club: "Club",
  academy: "Academy",
};

const discoverySourceLabels: Record<string, string> = Object.fromEntries(
  discoverySourceOptions.map((opt) => [opt.value, opt.label]),
);

const tokenOverrides: Record<string, string> = {
  cpr: "CPR",
  im: "IM",
};

function formatToken(value: string | null | undefined) {
  if (!value) return "";
  const override = tokenOverrides[value];
  if (override) return override;
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  timeZone: string;
  status: string;
  role: string;
  swimLevel: string;
  deepWaterComfort: string;
  strokes: string[];
  interests: string[];
  goalsNarrative: string;

  availabilitySlots: string[];
  timeOfDayAvailability: string[];
  locationPreference: string[];
  locationPreferenceOther: string;
  travelFlexibility: string;
  facilityAccess: string[];
  facilityAccessOther: string;
  equipmentNeeds: string[];
  equipmentNeedsOther: string;
  travelNotes: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  emergencyContactRegion: string;
  medicalInfo: string;
  safetyNotes: string;
  volunteerInterest: string[];
  volunteerRolesDetail: string;
  discoverySource: string;
  socialInstagram: string;
  socialLinkedIn: string;
  socialOther: string;
  languagePreference: string;
  commsPreference: string;
  paymentReadiness: string;
  currencyPreference: string;
  consentPhoto: string;
  membershipTiers: string[];
  academyFocusAreas: string[];
  academyFocus: string;
  paymentNotes: string;
};

type MemberResponse = {
  id: string;
  auth_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  country: string;
  time_zone: string;
  is_active: boolean;
  registration_complete: boolean;
  swim_level: string;
  deep_water_comfort: string;
  strokes: string[];
  interests: string[];
  goals_narrative: string;
  goals_other: string;

  availability_slots: string[];
  time_of_day_availability: string[];
  location_preference: string[];
  location_preference_other: string;
  travel_flexibility: string;
  facility_access: string[];
  facility_access_other: string;
  equipment_needs: string[];
  equipment_needs_other: string;
  travel_notes: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_phone: string;
  emergency_contact_region: string;
  medical_info: string;
  safety_notes: string;
  volunteer_interest: string[];
  volunteer_roles_detail: string;
  discovery_source: string;
  social_instagram: string;
  social_linkedin: string;
  social_other: string;
  language_preference: string;
  comms_preference: string;
  payment_readiness: string;
  currency_preference: string;
  consent_photo: string;
  membership_tier: string;
  membership_tiers: string[];
  academy_focus_areas: string[];
  academy_focus: string;
  payment_notes: string;
};

function mapMemberResponseToProfile(data: MemberResponse): Profile {
  return {
    id: data.id,
    name: `${data.first_name} ${data.last_name}`,
    email: data.email,
    phone: data.phone || "",
    city: data.city || "",
    country: data.country || "",
    timeZone: data.time_zone || "",
    status: data.is_active ? "Active member" : "Inactive",
    role: "Member",
    swimLevel: data.swim_level || "",
    deepWaterComfort: data.deep_water_comfort || "",
    strokes: data.strokes || [],
    interests: data.interests || [],
    goalsNarrative: data.goals_narrative || "",

    availabilitySlots: data.availability_slots || [],
    timeOfDayAvailability: data.time_of_day_availability || [],
    locationPreference: data.location_preference || [],
    locationPreferenceOther: data.location_preference_other || "",
    travelFlexibility: data.travel_flexibility || "",
    facilityAccess: data.facility_access || [],
    facilityAccessOther: data.facility_access_other || "",
    equipmentNeeds: data.equipment_needs || [],
    equipmentNeedsOther: data.equipment_needs_other || "",
    travelNotes: data.travel_notes || "",
    emergencyContactName: data.emergency_contact_name || "",
    emergencyContactRelationship: data.emergency_contact_relationship || "",
    emergencyContactPhone: data.emergency_contact_phone || "",
    emergencyContactRegion: data.emergency_contact_region || "",
    medicalInfo: data.medical_info || "",
    safetyNotes: data.safety_notes || "",
    volunteerInterest: data.volunteer_interest || [],
    volunteerRolesDetail: data.volunteer_roles_detail || "",
    discoverySource: data.discovery_source || "other",
    socialInstagram: data.social_instagram || "",
    socialLinkedIn: data.social_linkedin || "",
    socialOther: data.social_other || "",
    languagePreference: data.language_preference || "english",
    commsPreference: data.comms_preference || "whatsapp",
    paymentReadiness: data.payment_readiness || "",
    currencyPreference: data.currency_preference || "NGN",
    consentPhoto: data.consent_photo || "",
    membershipTiers:
      data.membership_tiers && data.membership_tiers.length > 0
        ? data.membership_tiers.map((t) => t.toLowerCase())
        : data.membership_tier
          ? [data.membership_tier.toLowerCase()]
          : [],
    academyFocusAreas: data.academy_focus_areas || [],
    academyFocus: data.academy_focus || "",
    paymentNotes: data.payment_notes || "",
  };
}

type DetailProps = {
  label: string;
  value?: string;
  children?: ReactNode;
  fullSpan?: boolean;
};

function Detail({ label, value, children, fullSpan }: DetailProps) {
  const displayValue = value && value.length > 0 ? value : "--";

  return (
    <div className={fullSpan ? "md:col-span-2" : undefined}>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      {children ? (
        <div className="text-sm text-slate-700">{children}</div>
      ) : (
        <p className="text-sm text-slate-700">{displayValue}</p>
      )}
    </div>
  );
}

interface PageProps {
  params: { id: string };
}

export default function AdminMemberDetailPage({ params }: PageProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiGet<MemberResponse>(`/api/v1/members/${params.id}`, { auth: true })
      .then((data: MemberResponse) => {
        setProfile(mapMemberResponseToProfile(data));
        setError(null);
      })
      .catch((err: Error) => {
        console.error("Failed to fetch member:", err);
        setError("Unable to load member profile. Please try again.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [params.id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            &larr; Back
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Member Details</h1>
        </div>
        <LoadingCard text="Loading member profile..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            &larr; Back
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Member Details</h1>
        </div>
        <Alert variant="error" title="Error loading profile">
          {error}
        </Alert>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            &larr; Back
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">{profile.name}</h1>
          <Badge
            variant={profile.status === "Active member" ? "success" : "default"}
          >
            {profile.status}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Status & Tiers */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Membership</h2>
            <div className="flex flex-wrap gap-2">
              {profile.membershipTiers.length ? (
                profile.membershipTiers.map((tier) => (
                  <Badge
                    key={tier}
                    variant={
                      tier === "academy"
                        ? "success"
                        : tier === "club"
                          ? "info"
                          : "default"
                    }
                  >
                    {membershipTierLabels[tier] ?? formatToken(tier)}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-slate-600">No tier selected.</p>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Profile Details */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              Contact & Location
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Detail label="Email" value={profile.email} />
              <Detail label="Phone" value={profile.phone} />
              <Detail
                label="Location"
                value={`${profile.city}, ${profile.country}`}
              />
              <Detail label="Time zone" value={profile.timeZone} />
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Swim profile
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Detail
                label="Level"
                value={levelLabels[profile.swimLevel] ?? profile.swimLevel}
              />
              <Detail
                label="Deep-water comfort"
                value={
                  deepWaterLabels[profile.deepWaterComfort] ??
                  profile.deepWaterComfort
                }
              />
              <Detail label="Goals" value={profile.goalsNarrative} fullSpan />
              <Detail
                label="Interests"
                value={
                  profile.interests.length
                    ? profile.interests.map(formatToken).join(", ")
                    : "--"
                }
                fullSpan
              />
              <Detail label="Strokes" fullSpan>
                {profile.strokes.length ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.strokes.map((stroke) => (
                      <Badge key={stroke}>{formatToken(stroke)}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">
                    No strokes shared yet
                  </p>
                )}
              </Detail>
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Logistics & availability
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Detail label="Weekly availability" fullSpan>
                {profile.availabilitySlots.length
                  ? profile.availabilitySlots.map(formatToken).join(", ")
                  : "--"}
              </Detail>
              <Detail label="Time of day">
                {profile.timeOfDayAvailability.length
                  ? profile.timeOfDayAvailability.map(formatToken).join(", ")
                  : "--"}
              </Detail>
              <Detail label="Preferred locations" fullSpan>
                {profile.locationPreference.length ? (
                  <span>
                    {profile.locationPreference.map(formatToken).join(", ")}
                    {profile.locationPreferenceOther
                      ? ` • ${profile.locationPreferenceOther}`
                      : ""}
                  </span>
                ) : (
                  profile.locationPreferenceOther || "--"
                )}
              </Detail>
              <Detail
                label="Travel readiness"
                value={
                  travelFlexibilityLabels[profile.travelFlexibility] ??
                  formatToken(profile.travelFlexibility)
                }
              />
              <Detail label="Facility access">
                {profile.facilityAccess.length
                  ? `${profile.facilityAccess.map(formatToken).join(", ")}${
                      profile.facilityAccessOther
                        ? ` • ${profile.facilityAccessOther}`
                        : ""
                    }`
                  : profile.facilityAccessOther || "--"}
              </Detail>
              <Detail label="Equipment needs">
                {profile.equipmentNeeds.length
                  ? `${profile.equipmentNeeds.map(formatToken).join(", ")}${
                      profile.equipmentNeedsOther
                        ? ` • ${profile.equipmentNeedsOther}`
                        : ""
                    }`
                  : profile.equipmentNeedsOther || "--"}
              </Detail>
              <Detail
                label="Travel notes"
                value={profile.travelNotes || "--"}
                fullSpan
              />
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Community & preferences
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Detail
                label="Discovery source"
                value={
                  discoverySourceLabels[profile.discoverySource] ??
                  formatToken(profile.discoverySource)
                }
              />
              <Detail label="Social links" fullSpan>
                <div className="flex flex-col gap-1 text-sm text-slate-700">
                  {profile.socialInstagram ? (
                    <span>Instagram: {profile.socialInstagram}</span>
                  ) : null}
                  {profile.socialLinkedIn ? (
                    <a
                      href={profile.socialLinkedIn}
                      className="text-cyan-700 underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      LinkedIn profile
                    </a>
                  ) : null}
                  {profile.socialOther ? (
                    <a
                      href={profile.socialOther}
                      className="text-cyan-700 underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Other: {profile.socialOther}
                    </a>
                  ) : null}
                  {!profile.socialInstagram &&
                  !profile.socialLinkedIn &&
                  !profile.socialOther ? (
                    <span>--</span>
                  ) : null}
                </div>
              </Detail>
              <Detail label="Volunteer interest" fullSpan>
                {profile.volunteerInterest.length ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.volunteerInterest.map((item) => (
                      <Badge key={item}>{formatToken(item)}</Badge>
                    ))}
                  </div>
                ) : (
                  "--"
                )}
              </Detail>
              <Detail
                label="Volunteer roles"
                value={profile.volunteerRolesDetail || "--"}
              />
              <Detail
                label="Language"
                value={profile.languagePreference || "english"}
              />
              <Detail
                label="Comms preference"
                value={formatToken(profile.commsPreference || "whatsapp")}
              />
              <Detail
                label="Payment readiness"
                value={
                  paymentReadinessLabels[profile.paymentReadiness] ??
                  formatToken(profile.paymentReadiness)
                }
              />
              <Detail
                label="Currency"
                value={(profile.currencyPreference || "NGN").toUpperCase()}
              />
              <Detail
                label="Photo consent"
                value={
                  profile.consentPhoto === "yes" ? "Consented" : "No media"
                }
              />
              <Detail
                label="Payment notes"
                value={profile.paymentNotes || "--"}
                fullSpan
              />
              {profile.membershipTiers.includes("academy") && (
                <>
                  {profile.academyFocusAreas.length ? (
                    <Detail label="Academy focus areas" fullSpan>
                      <div className="flex flex-wrap gap-2">
                        {profile.academyFocusAreas.map((area) => (
                          <Badge key={area}>{formatToken(area)}</Badge>
                        ))}
                      </div>
                    </Detail>
                  ) : null}
                  {profile.academyFocus ? (
                    <Detail
                      label="Academy notes"
                      value={profile.academyFocus}
                      fullSpan
                    />
                  ) : null}
                </>
              )}
            </div>
          </Card>

          <Alert variant="info" title="Emergency & safety">
            <p>
              Emergency contact: {profile.emergencyContactName} (
              {profile.emergencyContactRelationship}) –{" "}
              {profile.emergencyContactPhone}
            </p>
            <p>Region: {profile.emergencyContactRegion}</p>
            <p>Medical info: {profile.medicalInfo || "--"}</p>
            <p>Safety notes: {profile.safetyNotes || "--"}</p>
          </Alert>
        </div>
      </div>
    </div>
  );
}
