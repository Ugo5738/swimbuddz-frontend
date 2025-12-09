"use client";

import { useEffect, useState, type ReactNode, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { apiPatch, apiGet } from "@/lib/api";
import { completePendingRegistrationOnBackend } from "@/lib/registration";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { OptionPillGroup } from "@/components/forms/OptionPillGroup";
import { SingleSelectPills } from "@/components/forms/SingleSelectPills";
import { TimezoneCombobox } from "@/components/forms/TimezoneCombobox";
import { UpcomingSessions } from "@/components/profile/UpcomingSessions";
import { MembershipCard } from "@/components/profile/MembershipCard";
import {
  strokesOptions,
  interestOptions,
  membershipTierOptions,
  paymentReadinessOptions,
  volunteerInterestOptions,
  academyFocusOptions,
  facilityAccessOptions,
  equipmentNeedsOptions,
  availabilityOptions,
  timeOfDayOptions,
  locationOptions,
  currencyOptions,
  discoverySourceOptions,
  languageOptions,
  travelFlexibilityOptions
} from "@/lib/options";

const levelLabels: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced"
};

const deepWaterLabels: Record<string, string> = {
  learning: "Learning",
  comfortable: "Comfortable",
  expert: "Expert"
};

const travelFlexibilityLabels: Record<string, string> = {
  local_only: "Local sessions only",
  regional: "Regional travel is OK",
  global: "Global / relocation ready"
};

const paymentReadinessLabels: Record<string, string> = {
  ready_now: "Ready to pay now",
  need_notice: "Need advance notice",
  sponsor_support: "Looking for sponsor support"
};

const membershipTierLabels: Record<string, string> = {
  community: "Community",
  club: "Club",
  academy: "Academy"
};

const discoverySourceLabels: Record<string, string> = Object.fromEntries(discoverySourceOptions.map(opt => [opt.value, opt.label]));

const tokenOverrides: Record<string, string> = {
  cpr: "CPR",
  im: "IM"
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
  joinedAt: string;
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
  occupation?: string;
  areaInLagos?: string;

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
  membershipTier: string; // legacy
  membershipTiers: string[];
  requestedMembershipTiers: string[];
  academyFocusAreas: string[];
  academyFocus: string;
  paymentNotes: string;
};

const mockProfile: Profile = {
  id: "mock-id-123",
  name: "Ada Obi",
  joinedAt: "2024-01-01",
  email: "ada@example.com",
  phone: "+234 801 234 5678",
  city: "Lagos",
  country: "Nigeria",
  timeZone: "Africa/Lagos",
  status: "Active member",
  role: "Member",
  swimLevel: "intermediate",
  deepWaterComfort: "comfortable",
  strokes: ["freestyle", "backstroke", "open_water"],
  interests: ["fitness", "open_water", "volunteering"],
  goalsNarrative: "Build endurance for open-water races and help mentor new swimmers.",

  availabilitySlots: ["weekday_evening", "weekend_morning"],
  timeOfDayAvailability: ["early_morning", "evening"],
  locationPreference: ["yaba", "remote_global"],
  locationPreferenceOther: "Ikoyi, Lagos when in town",
  travelFlexibility: "regional",
  facilityAccess: ["city_pool", "open_water"],
  facilityAccessOther: "Access to partner hotel pool when traveling",
  equipmentNeeds: ["fins", "paddles"],
  equipmentNeedsOther: "",
  travelNotes: "Available for Lagos <-> Accra trips monthly",
  emergencyContactName: "Chinedu Obi",
  emergencyContactRelationship: "Brother",
  emergencyContactPhone: "+234 802 345 6789",
  emergencyContactRegion: "Abuja, Nigeria",
  medicalInfo: "Mild asthma, uses inhaler",
  safetyNotes: "Carry inhaler during open-water sessions",
  volunteerInterest: ["ride_share", "mentor"],
  volunteerRolesDetail: "Ride lead, WhatsApp moderator",
  discoverySource: "friend",
  socialInstagram: "@swimbuddzada",
  socialLinkedIn: "https://linkedin.com/in/adaobi",
  socialOther: "",
  languagePreference: "English",
  commsPreference: "whatsapp",
  paymentReadiness: "need_notice",
  currencyPreference: "NGN",
  consentPhoto: "yes",
  membershipTier: "club",
  membershipTiers: ["community", "club"],
  requestedMembershipTiers: [],
  academyFocusAreas: ["travel_meets"],
  academyFocus: "",
  paymentNotes: "Needs receipts for corporate reimbursements"
};

type MemberResponse = {
  id: string;
  auth_id: string;
  created_at: string;
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
  membership_tier?: string; // legacy/single
  membership_tiers: string[];
  requested_membership_tiers?: string[];
  academy_focus_areas?: string[];
  academy_focus?: string;
  payment_notes?: string;
  occupation?: string;
  area_in_lagos?: string;
};

function mapMemberResponseToProfile(data: MemberResponse): Profile {
  return {
    id: data.id,
    name: `${data.first_name} ${data.last_name}`,
    joinedAt: data.created_at,
    email: data.email,
    phone: data.phone || "",
    city: data.city || "",
    country: data.country || "",
    timeZone: data.time_zone || "",
    status: data.is_active ? "Active member" : "Inactive",
    role: "Member", // Default role
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
    membershipTier: data.membership_tier || "community",
    membershipTiers: data.membership_tiers && data.membership_tiers.length > 0
      ? data.membership_tiers.map(t => t.toLowerCase())
      : (data.membership_tier ? [data.membership_tier.toLowerCase()] : []),
    requestedMembershipTiers: data.requested_membership_tiers || [],
    academyFocusAreas: data.academy_focus_areas || [],
    academyFocus: data.academy_focus || "",
    paymentNotes: data.payment_notes || "",
    occupation: data.occupation || "",
    areaInLagos: data.area_in_lagos || ""
  };
}



function ProfileContent() {
  // TODO: Replace mock with apiGet("/api/v1/members/me", { auth: true }) once backend ready.
  const searchParams = useSearchParams();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [completingRegistration, setCompletingRegistration] = useState(false);

  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "complete_registration") {
      setCompletingRegistration(true);
      completePendingRegistrationOnBackend()
        .then((result) => {
          if (result.status === "error") {
            setError(`Registration completion failed: ${result.message}`);
          } else {
            // Refresh profile or show success
            // For now, just remove the query param
            router.replace("/profile");
          }
        })
        .finally(() => {
          setCompletingRegistration(false);
        });
    }

    // Fetch real profile data
    setLoading(true);
    apiGet<MemberResponse>("/api/v1/members/me", { auth: true })
      .then((data: MemberResponse) => {
        setProfile(mapMemberResponseToProfile(data));
        setError(null);
      })
      .catch((err: Error) => {
        console.error("Failed to fetch profile:", err);
        setError("Unable to load profile. Please try again.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [searchParams, router]);

  const headerMarkup = (
    <header className="space-y-2">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">My profile</p>
      <h1 className="text-4xl font-bold text-slate-900">Welcome back, {profile?.name?.split(" ")[0] ?? "Member"}</h1>
      <p className="text-sm text-slate-600">
        This page will fetch real member data and persist changes via the backend once APIs are available.
      </p>
    </header>
  );

  if (loading || completingRegistration) {
    return (
      <div className="space-y-6">
        {headerMarkup}
        <LoadingCard text={completingRegistration ? "Finalizing your registration..." : "Loading profile..."} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        {headerMarkup}
        <Alert variant="error" title="Error loading profile">
          {error}
        </Alert>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-6">
      {headerMarkup}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Status & Sessions */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Membership</h2>

            {/* Membership Card */}
            {(profile.membershipTiers.includes("club") || profile.membershipTiers.includes("academy")) && (
              <div className="mb-4">
                <MembershipCard
                  name={profile.name}
                  tier={profile.membershipTiers.includes("academy") ? "academy" : "club"}
                  memberId={profile.id}
                  joinedAt={profile.joinedAt}
                />
              </div>
            )}

            {/* Pending Upgrade Alert */}
            {profile.requestedMembershipTiers && profile.requestedMembershipTiers.length > 0 && (
              <Alert variant="info" title="Upgrade Request Pending">
                <p>
                  You have requested an upgrade to <strong>{profile.requestedMembershipTiers.join(", ")}</strong>.
                  This request is pending admin approval. You will retain your current access until then.
                </p>
              </Alert>
            )}

            <div className="flex flex-wrap gap-2">
              {profile.membershipTiers.length ? (
                profile.membershipTiers.map((tier) => (
                  <Badge key={tier} variant={tier === "academy" ? "success" : tier === "club" ? "info" : "default"}>
                    {membershipTierLabels[tier] ?? formatToken(tier)}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-slate-600">No tier selected.</p>
              )}
            </div>
            <div className="pt-2">
              <Button variant="outline" className="w-full" onClick={() => router.push("/register?upgrade=true")}>
                Upgrade / Change Tier
              </Button>
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Upcoming Sessions</h2>
            <UpcomingSessions />
          </Card>
        </div>

        {/* Right Column: Profile Details */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Contact & Location</h2>
              <Button variant="ghost" size="sm" onClick={() => setEditing((prev) => !prev)}>
                {editing ? "Cancel" : "Edit"}
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Detail label="Email" value={profile.email} />
              <Detail label="Phone" value={profile.phone} />
              <Detail label="Location" value={`${profile.city}, ${profile.country}`} />
              <Detail label="Time zone" value={profile.timeZone} />
              <Detail label="Occupation" value={profile.occupation || "--"} />
              <Detail label="Area in Lagos" value={profile.areaInLagos || "--"} />
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Swim profile</h2>
            {editing ? (
              <ProfileEditForm
                profile={profile}
                onSuccess={(updated) => {
                  setProfile(updated);
                  setEditing(false);
                }}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Detail label="Level" value={levelLabels[profile.swimLevel] ?? profile.swimLevel} />
                  <Detail label="Deep-water comfort" value={deepWaterLabels[profile.deepWaterComfort] ?? profile.deepWaterComfort} />
                  <Detail label="Goals" value={profile.goalsNarrative} fullSpan />
                </div>
                <Detail
                  label="Interests"
                  value={profile.interests.length ? profile.interests.map(formatToken).join(", ") : "--"}
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
                    <p className="text-sm text-slate-600">No strokes shared yet</p>
                  )}
                </Detail>
              </>
            )}
          </Card>

          {!editing ? (
            <>
              {(profile.membershipTiers.includes("club") || profile.membershipTiers.includes("academy")) && (
                <Card className="space-y-4">
                  <h2 className="text-lg font-semibold text-slate-900">Logistics & availability</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Detail label="Weekly availability" fullSpan>
                      {profile.availabilitySlots.length ? profile.availabilitySlots.map(formatToken).join(", ") : "--"}
                    </Detail>
                    <Detail label="Time of day">
                      {profile.timeOfDayAvailability.length ? profile.timeOfDayAvailability.map(formatToken).join(", ") : "--"}
                    </Detail>
                    <Detail label="Preferred locations" fullSpan>
                      {profile.locationPreference.length ? (
                        <span>
                          {profile.locationPreference.map(formatToken).join(", ")}
                          {profile.locationPreferenceOther ? ` • ${profile.locationPreferenceOther}` : ""}
                        </span>
                      ) : (
                        profile.locationPreferenceOther || "--"
                      )}
                    </Detail>
                    <Detail
                      label="Travel readiness"
                      value={travelFlexibilityLabels[profile.travelFlexibility] ?? formatToken(profile.travelFlexibility)}
                    />
                    <Detail label="Facility access">
                      {profile.facilityAccess.length
                        ? `${profile.facilityAccess.map(formatToken).join(", ")}${profile.facilityAccessOther ? ` • ${profile.facilityAccessOther}` : ""
                        }`
                        : profile.facilityAccessOther || "--"}
                    </Detail>
                    <Detail label="Equipment needs">
                      {profile.equipmentNeeds.length
                        ? `${profile.equipmentNeeds.map(formatToken).join(", ")}${profile.equipmentNeedsOther ? ` • ${profile.equipmentNeedsOther}` : ""
                        }`
                        : profile.equipmentNeedsOther || "--"}
                    </Detail>
                    <Detail label="Travel notes" value={profile.travelNotes || "--"} fullSpan />
                  </div>
                </Card>
              )}

              <Card className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900">Community & preferences</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <Detail
                    label="Discovery source"
                    value={discoverySourceLabels[profile.discoverySource] ?? formatToken(profile.discoverySource)}
                  />
                  <Detail label="Social links" fullSpan>
                    <div className="flex flex-col gap-1 text-sm text-slate-700">
                      {profile.socialInstagram ? (
                        <span>Instagram: {profile.socialInstagram}</span>
                      ) : null}
                      {profile.socialLinkedIn ? (
                        <a href={profile.socialLinkedIn} className="text-cyan-700 underline" target="_blank" rel="noreferrer">
                          LinkedIn profile
                        </a>
                      ) : null}
                      {profile.socialOther ? (
                        <a href={profile.socialOther} className="text-cyan-700 underline" target="_blank" rel="noreferrer">
                          Other: {profile.socialOther}
                        </a>
                      ) : null}
                      {!profile.socialInstagram && !profile.socialLinkedIn && !profile.socialOther ? <span>--</span> : null}
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
                  <Detail label="Volunteer roles" value={profile.volunteerRolesDetail || "--"} />
                  <Detail label="Language" value={profile.languagePreference || "english"} />
                  <Detail label="Comms preference" value={formatToken(profile.commsPreference || "whatsapp")} />
                  <Detail
                    label="Payment readiness"
                    value={paymentReadinessLabels[profile.paymentReadiness] ?? formatToken(profile.paymentReadiness)}
                  />
                  <Detail label="Currency" value={(profile.currencyPreference || "NGN").toUpperCase()} />
                  <Detail label="Photo consent" value={profile.consentPhoto === "yes" ? "Consented" : "No media"} />
                  <Detail label="Payment notes" value={profile.paymentNotes || "--"} fullSpan />
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
                      {profile.academyFocus ? <Detail label="Academy notes" value={profile.academyFocus} fullSpan /> : null}
                    </>
                  )}
                </div>
              </Card>

              {(profile.membershipTiers.includes("club") || profile.membershipTiers.includes("academy")) && (
                <Alert variant="info" title="Emergency & safety">
                  <p>
                    Emergency contact: {profile.emergencyContactName} ({profile.emergencyContactRelationship}) – {profile.emergencyContactPhone}
                  </p>
                  <p>Region: {profile.emergencyContactRegion}</p>
                  <p>Medical info: {profile.medicalInfo || "--"}</p>
                  <p>Safety notes: {profile.safetyNotes || "--"}</p>
                </Alert>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type ProfileEditFormProps = {
  profile: Profile;
  onSuccess: (profile: Profile) => void;
  onCancel: () => void;
};

type FormState = {
  city: string;
  country: string;
  timeZone: string;
  occupation: string;
  areaInLagos: string;
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

function ProfileEditForm({ profile, onSuccess, onCancel }: ProfileEditFormProps) {
  const [formState, setFormState] = useState<FormState>({
    city: profile.city,
    country: profile.country,
    timeZone: profile.timeZone,
    swimLevel: profile.swimLevel || "",
    deepWaterComfort: profile.deepWaterComfort,
    strokes: profile.strokes,
    interests: profile.interests,
    goalsNarrative: profile.goalsNarrative,
    occupation: profile.occupation || "",
    areaInLagos: profile.areaInLagos || "",

    availabilitySlots: profile.availabilitySlots,
    timeOfDayAvailability: profile.timeOfDayAvailability,
    locationPreference: profile.locationPreference,
    locationPreferenceOther: profile.locationPreferenceOther,
    travelFlexibility: profile.travelFlexibility,
    facilityAccess: profile.facilityAccess,
    facilityAccessOther: profile.facilityAccessOther,
    equipmentNeeds: profile.equipmentNeeds,
    equipmentNeedsOther: profile.equipmentNeedsOther,
    travelNotes: profile.travelNotes,
    emergencyContactName: profile.emergencyContactName,
    emergencyContactRelationship: profile.emergencyContactRelationship,
    emergencyContactPhone: profile.emergencyContactPhone,
    emergencyContactRegion: profile.emergencyContactRegion,
    medicalInfo: profile.medicalInfo,
    safetyNotes: profile.safetyNotes,
    volunteerInterest: profile.volunteerInterest,
    volunteerRolesDetail: profile.volunteerRolesDetail,
    discoverySource: profile.discoverySource || "other",
    socialInstagram: profile.socialInstagram,
    socialLinkedIn: profile.socialLinkedIn,
    socialOther: profile.socialOther,
    languagePreference: profile.languagePreference || "english",
    commsPreference: profile.commsPreference || "whatsapp",
    paymentReadiness: profile.paymentReadiness,
    currencyPreference: profile.currencyPreference,
    consentPhoto: profile.consentPhoto,
    membershipTiers: profile.membershipTiers,
    academyFocusAreas: profile.academyFocusAreas,
    academyFocus: profile.academyFocus,
    paymentNotes: profile.paymentNotes
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isClub = profile.membershipTiers.includes("club") || profile.membershipTiers.includes("academy");
  const isAcademy = profile.membershipTiers.includes("academy");

  async function handleSave() {
    setSaving(true);
    setError(null);

    const updatedProfile: Profile = {
      ...profile,
      city: formState.city,
      country: formState.country,
      timeZone: formState.timeZone,
      occupation: formState.occupation,
      areaInLagos: formState.areaInLagos,
      swimLevel: formState.swimLevel,
      deepWaterComfort: formState.deepWaterComfort,
      strokes: formState.strokes,
      interests: formState.interests,
      goalsNarrative: formState.goalsNarrative,

      availabilitySlots: formState.availabilitySlots,
      timeOfDayAvailability: formState.timeOfDayAvailability,
      locationPreference: formState.locationPreference,
      locationPreferenceOther: formState.locationPreferenceOther,
      travelFlexibility: formState.travelFlexibility,
      facilityAccess: formState.facilityAccess,
      facilityAccessOther: formState.facilityAccessOther,
      equipmentNeeds: formState.equipmentNeeds,
      equipmentNeedsOther: formState.equipmentNeedsOther,
      travelNotes: formState.travelNotes,
      emergencyContactName: formState.emergencyContactName,
      emergencyContactRelationship: formState.emergencyContactRelationship,
      emergencyContactPhone: formState.emergencyContactPhone,
      emergencyContactRegion: formState.emergencyContactRegion,
      medicalInfo: formState.medicalInfo,
      safetyNotes: formState.safetyNotes,
      volunteerInterest: formState.volunteerInterest,
      volunteerRolesDetail: formState.volunteerRolesDetail,
      discoverySource: formState.discoverySource,
      socialInstagram: formState.socialInstagram,
      socialLinkedIn: formState.socialLinkedIn,
      socialOther: formState.socialOther,
      languagePreference: formState.languagePreference,
      commsPreference: formState.commsPreference,
      paymentReadiness: formState.paymentReadiness,
      currencyPreference: formState.currencyPreference,
      consentPhoto: formState.consentPhoto,
      membershipTiers: formState.membershipTiers,
      academyFocusAreas: formState.academyFocusAreas,
      academyFocus: formState.academyFocus,
      paymentNotes: formState.paymentNotes
    };

    try {
      await apiPatch(
        "/api/v1/members/me",
        {
          city: formState.city,
          country: formState.country,
          time_zone: formState.timeZone,
          occupation: formState.occupation,
          area_in_lagos: formState.areaInLagos,
          swim_level: formState.swimLevel,
          deep_water_comfort: formState.deepWaterComfort,
          strokes: updatedProfile.strokes,
          interests: updatedProfile.interests,
          goals: formState.goalsNarrative,

          availability_slots: updatedProfile.availabilitySlots,
          time_of_day_availability: updatedProfile.timeOfDayAvailability,
          location_preference: updatedProfile.locationPreference,
          location_preference_other: formState.locationPreferenceOther,
          travel_flexibility: formState.travelFlexibility,
          facility_access: updatedProfile.facilityAccess,
          facility_access_other: formState.facilityAccessOther,
          equipment_needs: updatedProfile.equipmentNeeds,
          equipment_needs_other: formState.equipmentNeedsOther,
          travel_notes: formState.travelNotes,
          emergency_contact_name: formState.emergencyContactName,
          emergency_contact_relationship: formState.emergencyContactRelationship,
          emergency_contact_phone: formState.emergencyContactPhone,
          emergency_contact_region: formState.emergencyContactRegion,
          medical_info: formState.medicalInfo,
          safety_notes: formState.safetyNotes,
          volunteer_interest: updatedProfile.volunteerInterest,
          volunteer_roles_detail: formState.volunteerRolesDetail,
          discovery_source: formState.discoverySource,
          social_instagram: formState.socialInstagram,
          social_linkedin: formState.socialLinkedIn,
          social_other: formState.socialOther,
          language_preference: formState.languagePreference,
          comms_preference: formState.commsPreference,
          payment_readiness: formState.paymentReadiness,
          currency_preference: formState.currencyPreference,
          consent_photo: formState.consentPhoto,
          membership_tiers: updatedProfile.membershipTiers,
          academy_focus_areas: updatedProfile.academyFocusAreas,
          academy_focus: formState.academyFocus,
          payment_notes: formState.paymentNotes
        },
        { auth: true }
      );
      onSuccess(updatedProfile);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save profile.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <Alert variant="error" title="Update failed">
          {error}
        </Alert>
      ) : null}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact & Location */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="font-medium text-slate-900">Contact & Location</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="City"
              value={formState.city}
              onChange={(e) => setFormState({ ...formState, city: e.target.value })}
            />
            <Input
              label="Country"
              value={formState.country}
              onChange={(e) => setFormState({ ...formState, country: e.target.value })}
            />
            <TimezoneCombobox
              label="Time zone"
              value={formState.timeZone}
              onChange={(value) => setFormState({ ...formState, timeZone: value })}
            />
            <Input
              label="Occupation"
              value={formState.occupation}
              onChange={(e) => setFormState({ ...formState, occupation: e.target.value })}
            />
            <Input
              label="Area in Lagos"
              value={formState.areaInLagos}
              onChange={(e) => setFormState({ ...formState, areaInLagos: e.target.value })}
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <Select
            label="Swimming level"
            value={formState.swimLevel}
            onChange={(e) => setFormState({ ...formState, swimLevel: e.target.value })}
          >
            <option value="">Select level</option>
            {Object.entries(levelLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="md:col-span-2">
          <Select
            label="Deep-water comfort"
            value={formState.deepWaterComfort}
            onChange={(e) => setFormState({ ...formState, deepWaterComfort: e.target.value })}
          >
            <option value="">Select comfort level</option>
            <option value="Comfortable">Comfortable</option>
            <option value="Not comfortable">Not comfortable</option>
          </Select>
        </div>
        <div className="md:col-span-2">
          <OptionPillGroup
            label="Preferred strokes"
            options={strokesOptions}
            selected={formState.strokes}
            onToggle={(value) => {
              const newStrokes = formState.strokes.includes(value)
                ? formState.strokes.filter((s) => s !== value)
                : [...formState.strokes, value];
              setFormState({ ...formState, strokes: newStrokes });
            }}
          />
        </div>
        <div className="md:col-span-2">
          <OptionPillGroup
            label="Interests"
            options={interestOptions}
            selected={formState.interests}
            onToggle={(value) => {
              const newInterests = formState.interests.includes(value)
                ? formState.interests.filter((i) => i !== value)
                : [...formState.interests, value];
              setFormState({ ...formState, interests: newInterests });
            }}
          />
        </div>
        <div className="md:col-span-2">
          <Textarea
            label="Narrative goals"
            value={formState.goalsNarrative}
            onChange={(e) => setFormState({ ...formState, goalsNarrative: e.target.value })}
          />
        </div>


        {isClub && (
          <>
            <div className="md:col-span-2">
              <OptionPillGroup
                label="Weekly availability slots"
                options={availabilityOptions}
                selected={formState.availabilitySlots}
                onToggle={(value) => {
                  const newSlots = formState.availabilitySlots.includes(value)
                    ? formState.availabilitySlots.filter((s) => s !== value)
                    : [...formState.availabilitySlots, value];
                  setFormState({ ...formState, availabilitySlots: newSlots });
                }}
              />
            </div>
            <div className="md:col-span-2">
              <OptionPillGroup
                label="Time-of-day availability"
                options={timeOfDayOptions}
                selected={formState.timeOfDayAvailability}
                onToggle={(value) => {
                  const newTimes = formState.timeOfDayAvailability.includes(value)
                    ? formState.timeOfDayAvailability.filter((t) => t !== value)
                    : [...formState.timeOfDayAvailability, value];
                  setFormState({ ...formState, timeOfDayAvailability: newTimes });
                }}
              />
            </div>
            <div className="md:col-span-2">
              <OptionPillGroup
                label="Preferred locations"
                options={locationOptions}
                selected={formState.locationPreference}
                onToggle={(value) => {
                  const newLocs = formState.locationPreference.includes(value)
                    ? formState.locationPreference.filter((l) => l !== value)
                    : [...formState.locationPreference, value];
                  setFormState({ ...formState, locationPreference: newLocs });
                }}
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="Other location"
                value={formState.locationPreferenceOther}
                onChange={(e) => setFormState({ ...formState, locationPreferenceOther: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <SingleSelectPills
                label="Travel readiness"
                options={travelFlexibilityOptions}
                value={formState.travelFlexibility}
                onChange={(value) => setFormState({ ...formState, travelFlexibility: value })}
              />
            </div>
            <div className="md:col-span-2">
              <OptionPillGroup
                label="Facility access"
                options={facilityAccessOptions}
                selected={formState.facilityAccess}
                onToggle={(value) => {
                  const newAccess = formState.facilityAccess.includes(value)
                    ? formState.facilityAccess.filter((a) => a !== value)
                    : [...formState.facilityAccess, value];
                  setFormState({ ...formState, facilityAccess: newAccess });
                }}
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="Facility access (other)"
                value={formState.facilityAccessOther}
                onChange={(e) => setFormState({ ...formState, facilityAccessOther: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <OptionPillGroup
                label="Equipment needs"
                options={equipmentNeedsOptions}
                selected={formState.equipmentNeeds}
                onToggle={(value) => {
                  const newNeeds = formState.equipmentNeeds.includes(value)
                    ? formState.equipmentNeeds.filter((n) => n !== value)
                    : [...formState.equipmentNeeds, value];
                  setFormState({ ...formState, equipmentNeeds: newNeeds });
                }}
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="Equipment needs (other)"
                value={formState.equipmentNeedsOther}
                onChange={(e) => setFormState({ ...formState, equipmentNeedsOther: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Textarea
                label="Travel notes"
                value={formState.travelNotes}
                onChange={(e) => setFormState({ ...formState, travelNotes: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="Emergency contact name"
                value={formState.emergencyContactName}
                onChange={(e) => setFormState({ ...formState, emergencyContactName: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="Relationship"
                value={formState.emergencyContactRelationship}
                onChange={(e) => setFormState({ ...formState, emergencyContactRelationship: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="Emergency phone"
                value={formState.emergencyContactPhone}
                onChange={(e) => setFormState({ ...formState, emergencyContactPhone: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="Emergency region"
                value={formState.emergencyContactRegion}
                onChange={(e) => setFormState({ ...formState, emergencyContactRegion: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Textarea
                label="Medical info"
                value={formState.medicalInfo}
                onChange={(e) => setFormState({ ...formState, medicalInfo: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Textarea
                label="Safety notes"
                value={formState.safetyNotes}
                onChange={(e) => setFormState({ ...formState, safetyNotes: e.target.value })}
              />
            </div>
          </>
        )}
        <>
          <div className="md:col-span-2">
            <OptionPillGroup
              label="Volunteer interest"
              options={volunteerInterestOptions}
              selected={formState.volunteerInterest}
              onToggle={(value) => {
                const newInterests = formState.volunteerInterest.includes(value)
                  ? formState.volunteerInterest.filter((i) => i !== value)
                  : [...formState.volunteerInterest, value];
                setFormState({ ...formState, volunteerInterest: newInterests });
              }}
            />
          </div>
          <div className="md:col-span-2">
            <Textarea
              label="Volunteer roles detail"
              value={formState.volunteerRolesDetail}
              onChange={(e) => setFormState({ ...formState, volunteerRolesDetail: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <Select
              label="Discovery source"
              value={formState.discoverySource || "other"}
              onChange={(e) => setFormState({ ...formState, discoverySource: e.target.value })}
            >
              <option value="">Select an option</option>
              {discoverySourceOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <Input
              label="Instagram handle"
              value={formState.socialInstagram}
              onChange={(e) => setFormState({ ...formState, socialInstagram: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="LinkedIn / professional link"
              value={formState.socialLinkedIn}
              onChange={(e) => setFormState({ ...formState, socialLinkedIn: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="Other social link"
              value={formState.socialOther}
              onChange={(e) => setFormState({ ...formState, socialOther: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <Select
              label="Language preference"
              value={formState.languagePreference}
              onChange={(e) => setFormState({ ...formState, languagePreference: e.target.value })}
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <Select
              label="Comms preference"
              value={formState.commsPreference}
              onChange={(e) => setFormState({ ...formState, commsPreference: e.target.value })}
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </Select>
          </div>
          <div className="md:col-span-2">
            <SingleSelectPills
              label="Payment readiness"
              options={paymentReadinessOptions}
              value={formState.paymentReadiness}
              onChange={(value) => setFormState({ ...formState, paymentReadiness: value })}
            />
            <p className="mt-1 text-xs text-slate-500">
              Helps admins plan billing (ready now, need notice, or sponsor support).
            </p>
          </div>
          <div className="md:col-span-2">
            <Select
              label="Preferred currency"
              value={formState.currencyPreference}
              onChange={(e) => setFormState({ ...formState, currencyPreference: e.target.value })}
            >
              {currencyOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <Select
              label="Photo consent"
              value={formState.consentPhoto}
              onChange={(e) => setFormState({ ...formState, consentPhoto: e.target.value })}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Textarea
              label="Payment notes"
              value={formState.paymentNotes}
              onChange={(e) => setFormState({ ...formState, paymentNotes: e.target.value })}
              hint="Add billing preferences (e.g., needs invoice/receipt, company reimburses)."
            />
          </div>
        </>

        {isAcademy && (
          <>
            <div className="md:col-span-2">
              <OptionPillGroup
                label="Academy focus areas"
                options={academyFocusOptions}
                selected={formState.academyFocusAreas}
                onToggle={(value) => {
                  const newAreas = formState.academyFocusAreas.includes(value)
                    ? formState.academyFocusAreas.filter((a) => a !== value)
                    : [...formState.academyFocusAreas, value];
                  setFormState({ ...formState, academyFocusAreas: newAreas });
                }}
              />
            </div>
            <div className="md:col-span-2">
              <Textarea
                label="Academy focus"
                value={formState.academyFocus}
                onChange={(e) => setFormState({ ...formState, academyFocus: e.target.value })}
              />
            </div>
          </>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

export default function MemberProfilePage() {
  return (
    <Suspense fallback={<LoadingCard text="Loading profile..." />}>
      <ProfileContent />
    </Suspense>
  );
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
