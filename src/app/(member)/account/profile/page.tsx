"use client";

import { ProfileEditForm } from "@/components/account/ProfileEditForm";
import { BadgesCard } from "@/components/profile/BadgesCard";
import { LaddersProgressCard } from "@/components/profile/LaddersProgressCard";
import { MembershipCard } from "@/components/profile/MembershipCard";
import { UpcomingSessions } from "@/components/profile/UpcomingSessions";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet } from "@/lib/api";
import { WHATSAPP_GROUP_URL } from "@/lib/config";
import { completePendingRegistrationOnBackend } from "@/lib/registration";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Detail } from "./components";
import type { MemberResponse, Profile } from "./types";
import {
  deepWaterLabels,
  discoverySourceLabels,
  formatToken,
  levelLabels,
  mapMemberResponseToProfile,
  membershipTierLabels,
  paymentReadinessLabels,
  travelFlexibilityLabels,
} from "./utils";

const mockProfile: Profile = {
  id: "mock-id-123",
  name: "Ada Obi",
  joinedAt: "2024-01-01",
  email: "ada@example.com",
  phone: "+234 801 234 5678",
  profilePhotoUrl: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&q=80",
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
  paymentNotes: "Needs receipts for corporate reimbursements",
  communityActive: true,
};
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
            router.replace("/account/profile");
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
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-500 p-6 text-white shadow-lg mb-6">
      <div className="absolute top-0 right-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute bottom-0 left-0 -mb-8 -ml-8 h-32 w-32 rounded-full bg-blue-400/20 blur-3xl" />

      <div className="relative flex flex-col md:flex-row md:items-center gap-6">
        {/* Profile Photo */}
        <div className="flex-shrink-0">
          {profile?.profilePhotoUrl && profile.profilePhotoUrl.trim() !== "" ? (
            <img
              src={profile.profilePhotoUrl}
              alt={profile?.name || "Profile"}
              className="h-24 w-24 rounded-full object-cover ring-4 ring-white/30"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/20 text-3xl font-bold text-white ring-4 ring-white/30">
              {profile?.name
                ?.split(" ")
                .map((n) => n[0])
                .join("") || "M"}
            </div>
          )}
        </div>

        {/* Name and Status */}
        <div className="flex-1">
          <p className="text-sm font-medium text-cyan-100 uppercase tracking-wider mb-1">
            My Profile
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-white">{profile?.name ?? "Member"}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {profile?.membershipTiers.map((tier: string) => (
              <span
                key={tier}
                className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-sm font-medium text-white capitalize"
              >
                {tier} Member
              </span>
            ))}
            <span
              className={`text-sm ${profile?.status === "Active member" ? "text-emerald-200" : "text-white/70"}`}
            >
              {profile?.status}
            </span>
          </div>
        </div>

        {/* View Card Button (only for Club/Academy) */}
        {(profile?.membershipTiers.includes("club") ||
          profile?.membershipTiers.includes("academy")) && (
          <div className="flex-shrink-0">
            <a
              href="#membership-card"
              className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30 transition"
            >
              View Member Card
            </a>
          </div>
        )}
      </div>
    </div>
  );

  if (loading || completingRegistration) {
    return (
      <div className="space-y-6">
        {headerMarkup}
        <LoadingCard
          text={completingRegistration ? "Finalizing your registration..." : "Loading profile..."}
        />
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
            {(profile.membershipTiers.includes("club") ||
              profile.membershipTiers.includes("academy")) && (
              <div className="mb-4" id="membership-card">
                <MembershipCard
                  name={profile.name}
                  tier={profile.membershipTiers.includes("academy") ? "academy" : "club"}
                  memberId={profile.id}
                  joinedAt={profile.joinedAt}
                  photoUrl={profile.profilePhotoUrl}
                  validUntil={
                    profile.membershipTiers.includes("academy")
                      ? (profile.academyPaidUntil ?? undefined)
                      : (profile.clubPaidUntil ?? undefined)
                  }
                />
              </div>
            )}

            {/* Pending Upgrade Alert */}
            {profile.requestedMembershipTiers && profile.requestedMembershipTiers.length > 0 && (
              <Alert variant="info" title="Upgrade Request Pending">
                <p>
                  You have requested an upgrade to{" "}
                  <strong>{profile.requestedMembershipTiers.join(", ")}</strong>. Complete readiness
                  and pay to activate the new tier. You will retain your current access until then.
                </p>
              </Alert>
            )}

            <div className="flex flex-wrap gap-2">
              {profile.membershipTiers.length ? (
                profile.membershipTiers.map((tier) => (
                  <Badge
                    key={tier}
                    variant={tier === "academy" ? "success" : tier === "club" ? "info" : "default"}
                  >
                    {membershipTierLabels[tier] ?? formatToken(tier)}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-slate-600">No tier selected.</p>
              )}
            </div>
            {profile.communityActive && (
              <div className="mt-4 rounded-lg border border-cyan-100 bg-cyan-50 p-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-cyan-900">
                    <span role="img" aria-label="chat">
                      💬
                    </span>
                    Community WhatsApp Access
                  </div>
                  <p className="text-sm text-cyan-900/80">
                    Thanks for activating your membership. Join the members-only WhatsApp group to
                    stay updated.
                  </p>
                  <a
                    href={WHATSAPP_GROUP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full sm:w-auto items-center justify-center rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
                  >
                    Open WhatsApp Group
                  </a>
                </div>
              </div>
            )}
            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/register?upgrade=true")}
              >
                Upgrade / Change Tier
              </Button>
            </div>
          </Card>

          <BadgesCard />

          {/* Skill-ladder progression. Auto-hides when no series are
              seeded so members without ladders just see badges. */}
          <LaddersProgressCard />

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
                  <Detail
                    label="Level"
                    value={levelLabels[profile.swimLevel] ?? profile.swimLevel}
                  />
                  <Detail
                    label="Deep-water comfort"
                    value={deepWaterLabels[profile.deepWaterComfort] ?? profile.deepWaterComfort}
                  />
                  <Detail label="Goals" value={profile.goalsNarrative} fullSpan />
                </div>
                <Detail
                  label="Interests"
                  value={
                    profile.interests.length ? profile.interests.map(formatToken).join(", ") : "--"
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
                    <p className="text-sm text-slate-600">No strokes shared yet</p>
                  )}
                </Detail>
              </>
            )}
          </Card>

          {!editing ? (
            <>
              {(profile.membershipTiers.includes("club") ||
                profile.membershipTiers.includes("academy")) && (
                <Card className="space-y-4">
                  <h2 className="text-lg font-semibold text-slate-900">Logistics & availability</h2>
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
                            profile.facilityAccessOther ? ` • ${profile.facilityAccessOther}` : ""
                          }`
                        : profile.facilityAccessOther || "--"}
                    </Detail>
                    <Detail label="Equipment needs">
                      {profile.equipmentNeeds.length
                        ? `${profile.equipmentNeeds.map(formatToken).join(", ")}${
                            profile.equipmentNeedsOther ? ` • ${profile.equipmentNeedsOther}` : ""
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
                  <Detail label="Volunteer roles" value={profile.volunteerRolesDetail || "--"} />
                  <Detail label="Language" value={profile.languagePreference || "english"} />
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
                    value={profile.consentPhoto === "yes" ? "Consented" : "No media"}
                  />
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
                      {profile.academyFocus ? (
                        <Detail label="Academy notes" value={profile.academyFocus} fullSpan />
                      ) : null}
                    </>
                  )}
                </div>
              </Card>

              {(profile.membershipTiers.includes("club") ||
                profile.membershipTiers.includes("academy")) && (
                <Alert variant="info" title="Emergency & safety">
                  <p>
                    Emergency contact: {profile.emergencyContactName} (
                    {profile.emergencyContactRelationship}) – {profile.emergencyContactPhone}
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
export default function MemberProfilePage() {
  return (
    <Suspense fallback={<LoadingCard text="Loading profile..." />}>
      <ProfileContent />
    </Suspense>
  );
}
