"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { apiPatch } from "@/lib/api";
import { LoadingCard } from "@/components/ui/LoadingCard";

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

const discoverySourceLabels: Record<string, string> = {
  friend: "Friend / referral",
  instagram: "Instagram",
  event: "Event or meet-up",
  search: "Search",
  other: "Other"
};

const tokenOverrides: Record<string, string> = {
  cpr: "CPR",
  im: "IM"
};

function formatToken(value: string) {
  const override = tokenOverrides[value];
  if (override) return override;
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

type Profile = {
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
  certifications: string[];
  coachingExperience: string;
  availability: string;
  timeOfDayAvailability: string;
  locationPreference: string;
  travelFlexibility: string;
  facilityAccess: string;
  equipmentNeeds: string;
  travelNotes: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  emergencyContactRegion: string;
  medicalInfo: string;
  safetyNotes: string;
  volunteerInterest: string;
  volunteerRoles: string;
  discoverySource: string;
  socialHandles: string;
  languagePreference: string;
  commsPreference: string;
  paymentReadiness: string;
  currencyPreference: string;
  consentPhoto: string;
  membershipTiers: string[];
  academyFocus: string;
  paymentNotes: string;
};

const mockProfile: Profile = {
  name: "Ada Obi",
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
  certifications: ["cpr"],
  coachingExperience: "Volunteer mentor for beginner clinics.",
  availability: "Weekday evenings and Saturday mornings",
  timeOfDayAvailability: "6am – 9am, 5pm – 8pm",
  locationPreference: "Yaba, Ikoyi, remote when travelling",
  travelFlexibility: "regional",
  facilityAccess: "Yaba tech pool, Landmark beach",
  equipmentNeeds: "Needs fins and paddles",
  travelNotes: "Available for Lagos <-> Accra trips monthly",
  emergencyContactName: "Chinedu Obi",
  emergencyContactRelationship: "Brother",
  emergencyContactPhone: "+234 802 345 6789",
  emergencyContactRegion: "Abuja, Nigeria",
  medicalInfo: "Mild asthma, uses inhaler",
  safetyNotes: "Carry inhaler during open-water sessions",
  volunteerInterest: "Ride share coordination and mentoring",
  volunteerRoles: "Ride lead, WhatsApp moderator",
  discoverySource: "friend",
  socialHandles: "@swimbuddzada on Instagram",
  languagePreference: "English",
  commsPreference: "whatsapp",
  paymentReadiness: "need_notice",
  currencyPreference: "NGN",
  consentPhoto: "yes",
  membershipTiers: ["community", "club"],
  academyFocus: "",
  paymentNotes: "Needs receipts for corporate reimbursements"
};

export default function MemberProfilePage() {
  // TODO: Replace mock with apiGet("/api/v1/members/me", { auth: true }) once backend ready.
  const [profile, setProfile] = useState<Profile>(mockProfile);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      if (!mockProfile) setError("Unable to load profile");
      setLoading(false);
    }, 400);
    return () => clearTimeout(id);
  }, []);

  const headerMarkup = (
    <header className="space-y-2">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">My profile</p>
      <h1 className="text-4xl font-bold text-slate-900">Welcome back, {profile.name.split(" ")[0]}</h1>
      <p className="text-sm text-slate-600">
        This page will fetch real member data and persist changes via the backend once APIs are available.
      </p>
    </header>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        {headerMarkup}
        <LoadingCard text="Loading profile..." />
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

  return (
    <div className="space-y-6">
      {headerMarkup}

      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => setEditing((prev) => !prev)}>
          {editing ? "Cancel editing" : "Edit profile"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Contact & location</h2>
          <p className="text-sm text-slate-600">{profile.email}</p>
          <p className="text-sm text-slate-600">{profile.phone}</p>
          <p className="text-sm text-slate-600">
            {profile.city}, {profile.country}
          </p>
          <p className="text-sm text-slate-600">Time zone: {profile.timeZone}</p>
        </Card>
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Status</h2>
          <Badge variant="info">{profile.status}</Badge>
          <p className="text-sm text-slate-600">Role: {profile.role}</p>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Membership tiers</p>
            {profile.membershipTiers.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.membershipTiers.map((tier) => (
                  <Badge key={tier}>{membershipTierLabels[tier] ?? formatToken(tier)}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600">No tier selected yet.</p>
            )}
          </div>
        </Card>
      </div>

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
          <div className="grid gap-4 md:grid-cols-2">
            <Detail label="Level" value={levelLabels[profile.swimLevel] ?? profile.swimLevel} />
            <Detail label="Deep-water comfort" value={deepWaterLabels[profile.deepWaterComfort] ?? profile.deepWaterComfort} />
            <Detail label="Goals" value={profile.goalsNarrative} fullSpan />
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
            <Detail label="Certifications" fullSpan>
              {profile.certifications.length ? (
                <div className="flex flex-wrap gap-2">
                  {profile.certifications.map((cert) => (
                    <Badge key={cert}>{formatToken(cert)}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600">None added yet</p>
              )}
            </Detail>
            {profile.coachingExperience ? (
              <Detail label="Coaching experience" value={profile.coachingExperience} fullSpan />
            ) : null}
          </div>
        )}
      </Card>

      {!editing ? (
        <>
          <Card className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Logistics & availability</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Detail label="Weekly availability" value={profile.availability} fullSpan />
              <Detail label="Time of day" value={profile.timeOfDayAvailability} />
              <Detail label="Preferred locations" value={profile.locationPreference} />
              <Detail
                label="Travel readiness"
                value={travelFlexibilityLabels[profile.travelFlexibility] ?? formatToken(profile.travelFlexibility)}
              />
              <Detail label="Facility access" value={profile.facilityAccess} />
              <Detail label="Equipment needs" value={profile.equipmentNeeds} />
              <Detail label="Travel notes" value={profile.travelNotes || "--"} fullSpan />
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Community & preferences</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Detail
                label="Discovery source"
                value={discoverySourceLabels[profile.discoverySource] ?? formatToken(profile.discoverySource)}
              />
              <Detail label="Social handles" value={profile.socialHandles || "--"} />
              <Detail label="Volunteer interest" value={profile.volunteerInterest} />
              <Detail label="Volunteer roles" value={profile.volunteerRoles || "--"} />
              <Detail label="Language" value={profile.languagePreference} />
              <Detail label="Comms preference" value={formatToken(profile.commsPreference)} />
              <Detail
                label="Payment readiness"
                value={paymentReadinessLabels[profile.paymentReadiness] ?? formatToken(profile.paymentReadiness)}
              />
              <Detail label="Currency" value={profile.currencyPreference.toUpperCase()} />
              <Detail label="Photo consent" value={profile.consentPhoto === "yes" ? "Consented" : "No media"} />
              <Detail label="Payment notes" value={profile.paymentNotes || "--"} fullSpan />
              {profile.academyFocus ? <Detail label="Academy focus" value={profile.academyFocus} fullSpan /> : null}
            </div>
          </Card>

          <Alert variant="info" title="Emergency & safety">
            <p>
              Emergency contact: {profile.emergencyContactName} ({profile.emergencyContactRelationship}) – {profile.emergencyContactPhone}
            </p>
            <p>Region: {profile.emergencyContactRegion}</p>
            <p>Medical info: {profile.medicalInfo || "--"}</p>
            <p>Safety notes: {profile.safetyNotes || "--"}</p>
          </Alert>
        </>
      ) : null}
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
  swimLevel: string;
  deepWaterComfort: string;
  strokesText: string;
  interestsText: string;
  goalsNarrative: string;
  certificationsText: string;
  coachingExperience: string;
  availability: string;
  timeOfDayAvailability: string;
  locationPreference: string;
  travelFlexibility: string;
  facilityAccess: string;
  equipmentNeeds: string;
  travelNotes: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  emergencyContactRegion: string;
  medicalInfo: string;
  safetyNotes: string;
  volunteerInterest: string;
  volunteerRoles: string;
  discoverySource: string;
  socialHandles: string;
  languagePreference: string;
  commsPreference: string;
  paymentReadiness: string;
  currencyPreference: string;
  consentPhoto: string;
  membershipTiersText: string;
  academyFocus: string;
  paymentNotes: string;
};

function ProfileEditForm({ profile, onSuccess, onCancel }: ProfileEditFormProps) {
  const [formState, setFormState] = useState<FormState>({
    city: profile.city,
    country: profile.country,
    timeZone: profile.timeZone,
    swimLevel: profile.swimLevel,
    deepWaterComfort: profile.deepWaterComfort,
    strokesText: profile.strokes.join(", "),
    interestsText: profile.interests.join(", "),
    goalsNarrative: profile.goalsNarrative,
    certificationsText: profile.certifications.join(", "),
    coachingExperience: profile.coachingExperience,
    availability: profile.availability,
    timeOfDayAvailability: profile.timeOfDayAvailability,
    locationPreference: profile.locationPreference,
    travelFlexibility: profile.travelFlexibility,
    facilityAccess: profile.facilityAccess,
    equipmentNeeds: profile.equipmentNeeds,
    travelNotes: profile.travelNotes,
    emergencyContactName: profile.emergencyContactName,
    emergencyContactRelationship: profile.emergencyContactRelationship,
    emergencyContactPhone: profile.emergencyContactPhone,
    emergencyContactRegion: profile.emergencyContactRegion,
    medicalInfo: profile.medicalInfo,
    safetyNotes: profile.safetyNotes,
    volunteerInterest: profile.volunteerInterest,
    volunteerRoles: profile.volunteerRoles,
    discoverySource: profile.discoverySource,
    socialHandles: profile.socialHandles,
    languagePreference: profile.languagePreference,
    commsPreference: profile.commsPreference,
    paymentReadiness: profile.paymentReadiness,
    currencyPreference: profile.currencyPreference,
    consentPhoto: profile.consentPhoto,
    membershipTiersText: profile.membershipTiers.join(", "),
    academyFocus: profile.academyFocus,
    paymentNotes: profile.paymentNotes
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }

  const parseList = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  async function handleSave() {
    setSaving(true);
    setError(null);

    const updatedProfile: Profile = {
      ...profile,
      city: formState.city,
      country: formState.country,
      timeZone: formState.timeZone,
      swimLevel: formState.swimLevel,
      deepWaterComfort: formState.deepWaterComfort,
      strokes: parseList(formState.strokesText),
      interests: parseList(formState.interestsText),
      goalsNarrative: formState.goalsNarrative,
      certifications: parseList(formState.certificationsText),
      coachingExperience: formState.coachingExperience,
      availability: formState.availability,
      timeOfDayAvailability: formState.timeOfDayAvailability,
      locationPreference: formState.locationPreference,
      travelFlexibility: formState.travelFlexibility,
      facilityAccess: formState.facilityAccess,
      equipmentNeeds: formState.equipmentNeeds,
      travelNotes: formState.travelNotes,
      emergencyContactName: formState.emergencyContactName,
      emergencyContactRelationship: formState.emergencyContactRelationship,
      emergencyContactPhone: formState.emergencyContactPhone,
      emergencyContactRegion: formState.emergencyContactRegion,
      medicalInfo: formState.medicalInfo,
      safetyNotes: formState.safetyNotes,
      volunteerInterest: formState.volunteerInterest,
      volunteerRoles: formState.volunteerRoles,
      discoverySource: formState.discoverySource,
      socialHandles: formState.socialHandles,
      languagePreference: formState.languagePreference,
      commsPreference: formState.commsPreference,
      paymentReadiness: formState.paymentReadiness,
      currencyPreference: formState.currencyPreference,
      consentPhoto: formState.consentPhoto,
      membershipTiers: parseList(formState.membershipTiersText),
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
          swim_level: formState.swimLevel,
          deep_water_comfort: formState.deepWaterComfort,
          strokes: updatedProfile.strokes,
          interests: updatedProfile.interests,
          goals: formState.goalsNarrative,
          certifications: updatedProfile.certifications,
          coaching_experience: formState.coachingExperience,
          availability: formState.availability,
          time_of_day_availability: formState.timeOfDayAvailability,
          location_preference: formState.locationPreference,
          travel_flexibility: formState.travelFlexibility,
          facility_access: formState.facilityAccess,
          equipment_needs: formState.equipmentNeeds,
          travel_notes: formState.travelNotes,
          emergency_contact_name: formState.emergencyContactName,
          emergency_contact_relationship: formState.emergencyContactRelationship,
          emergency_contact_phone: formState.emergencyContactPhone,
          emergency_contact_region: formState.emergencyContactRegion,
          medical_info: formState.medicalInfo,
          safety_notes: formState.safetyNotes,
          volunteer_interest: formState.volunteerInterest,
          volunteer_roles: formState.volunteerRoles,
          discovery_source: formState.discoverySource,
          social_handles: formState.socialHandles,
          language_preference: formState.languagePreference,
          comms_preference: formState.commsPreference,
          payment_readiness: formState.paymentReadiness,
          currency_preference: formState.currencyPreference,
          consent_photo: formState.consentPhoto,
          // TODO: align membership tier updates with backend enum expectation.
          membership_tiers: updatedProfile.membershipTiers,
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
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="City" value={formState.city} onChange={(event) => updateField("city", event.target.value)} />
        <Input
          label="Country"
          value={formState.country}
          onChange={(event) => updateField("country", event.target.value)}
        />
        <Input
          label="Time zone"
          value={formState.timeZone}
          onChange={(event) => updateField("timeZone", event.target.value)}
        />
        <Select
          label="Swimming level"
          value={formState.swimLevel}
          onChange={(event) => updateField("swimLevel", event.target.value)}
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </Select>
        <Select
          label="Deep-water comfort"
          value={formState.deepWaterComfort}
          onChange={(event) => updateField("deepWaterComfort", event.target.value)}
        >
          <option value="learning">Learning</option>
          <option value="comfortable">Comfortable</option>
          <option value="expert">Expert</option>
        </Select>
        <Textarea
          label="Preferred strokes"
          hint="Comma-separated"
          rows={2}
          value={formState.strokesText}
          onChange={(event) => updateField("strokesText", event.target.value)}
        />
        <Textarea
          label="Interests"
          hint="Comma-separated"
          rows={2}
          value={formState.interestsText}
          onChange={(event) => updateField("interestsText", event.target.value)}
        />
        <Textarea
          label="Narrative goals"
          rows={3}
          value={formState.goalsNarrative}
          onChange={(event) => updateField("goalsNarrative", event.target.value)}
        />
        <Textarea
          label="Certifications"
          hint="Comma-separated"
          rows={2}
          value={formState.certificationsText}
          onChange={(event) => updateField("certificationsText", event.target.value)}
        />
        <Textarea
          label="Coaching experience"
          rows={2}
          value={formState.coachingExperience}
          onChange={(event) => updateField("coachingExperience", event.target.value)}
        />
        <Textarea
          label="Weekly availability"
          rows={2}
          value={formState.availability}
          onChange={(event) => updateField("availability", event.target.value)}
        />
        <Input
          label="Time-of-day availability"
          value={formState.timeOfDayAvailability}
          onChange={(event) => updateField("timeOfDayAvailability", event.target.value)}
        />
        <Textarea
          label="Preferred locations"
          rows={2}
          value={formState.locationPreference}
          onChange={(event) => updateField("locationPreference", event.target.value)}
        />
        <Select
          label="Travel readiness"
          value={formState.travelFlexibility}
          onChange={(event) => updateField("travelFlexibility", event.target.value)}
        >
          <option value="local_only">Local sessions only</option>
          <option value="regional">Regional travel is OK</option>
          <option value="global">Global / relocation ready</option>
        </Select>
        <Textarea
          label="Facility access"
          rows={2}
          value={formState.facilityAccess}
          onChange={(event) => updateField("facilityAccess", event.target.value)}
        />
        <Textarea
          label="Equipment needs"
          rows={2}
          value={formState.equipmentNeeds}
          onChange={(event) => updateField("equipmentNeeds", event.target.value)}
        />
        <Textarea
          label="Travel notes"
          rows={2}
          value={formState.travelNotes}
          onChange={(event) => updateField("travelNotes", event.target.value)}
        />
        <Input
          label="Emergency contact name"
          value={formState.emergencyContactName}
          onChange={(event) => updateField("emergencyContactName", event.target.value)}
        />
        <Input
          label="Relationship"
          value={formState.emergencyContactRelationship}
          onChange={(event) => updateField("emergencyContactRelationship", event.target.value)}
        />
        <Input
          label="Emergency phone"
          value={formState.emergencyContactPhone}
          onChange={(event) => updateField("emergencyContactPhone", event.target.value)}
        />
        <Input
          label="Emergency region"
          value={formState.emergencyContactRegion}
          onChange={(event) => updateField("emergencyContactRegion", event.target.value)}
        />
        <Textarea
          label="Medical info"
          rows={2}
          value={formState.medicalInfo}
          onChange={(event) => updateField("medicalInfo", event.target.value)}
        />
        <Textarea
          label="Safety notes"
          rows={2}
          value={formState.safetyNotes}
          onChange={(event) => updateField("safetyNotes", event.target.value)}
        />
        <Textarea
          label="Volunteer interest"
          rows={2}
          value={formState.volunteerInterest}
          onChange={(event) => updateField("volunteerInterest", event.target.value)}
        />
        <Textarea
          label="Volunteer roles"
          rows={2}
          value={formState.volunteerRoles}
          onChange={(event) => updateField("volunteerRoles", event.target.value)}
        />
        <Input
          label="Discovery source"
          value={formState.discoverySource}
          onChange={(event) => updateField("discoverySource", event.target.value)}
        />
        <Input
          label="Social handles"
          value={formState.socialHandles}
          onChange={(event) => updateField("socialHandles", event.target.value)}
        />
        <Input
          label="Language preference"
          value={formState.languagePreference}
          onChange={(event) => updateField("languagePreference", event.target.value)}
        />
        <Select
          label="Comms preference"
          value={formState.commsPreference}
          onChange={(event) => updateField("commsPreference", event.target.value)}
        >
          <option value="sms">SMS</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">Email</option>
        </Select>
        <Select
          label="Payment readiness"
          value={formState.paymentReadiness}
          onChange={(event) => updateField("paymentReadiness", event.target.value)}
        >
          <option value="ready_now">Ready to pay now</option>
          <option value="need_notice">Need advance notice</option>
          <option value="sponsor_support">Looking for sponsor support</option>
        </Select>
        <Input
          label="Preferred currency"
          value={formState.currencyPreference}
          onChange={(event) => updateField("currencyPreference", event.target.value)}
        />
        <Select
          label="Photo consent"
          value={formState.consentPhoto}
          onChange={(event) => updateField("consentPhoto", event.target.value)}
        >
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </Select>
        <Textarea
          label="Membership tiers"
          hint="Comma-separated"
          rows={2}
          value={formState.membershipTiersText}
          onChange={(event) => updateField("membershipTiersText", event.target.value)}
        />
        <Textarea
          label="Academy focus"
          rows={2}
          value={formState.academyFocus}
          onChange={(event) => updateField("academyFocus", event.target.value)}
        />
        <Textarea
          label="Payment notes"
          rows={2}
          value={formState.paymentNotes}
          onChange={(event) => updateField("paymentNotes", event.target.value)}
        />
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
