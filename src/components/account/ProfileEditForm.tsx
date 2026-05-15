// Extracted from `src/app/(member)/account/profile/page.tsx` during the
// file-size sweep. Pure props-driven (profile + onSuccess + onCancel
// passed by the parent). ~665 lines of form state + render — biggest
// single component on the profile route.

"use client";

import { OptionPillGroup } from "@/components/forms/OptionPillGroup";
import { SingleSelectPills } from "@/components/forms/SingleSelectPills";
import { TimezoneCombobox } from "@/components/forms/TimezoneCombobox";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MediaInput } from "@/components/ui/MediaInput";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { apiPatch } from "@/lib/api";
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
import { Country } from "country-state-city";
import type { Country as PhoneCountry } from "react-phone-number-input";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { useMemo, useState } from "react";

import type {
  FormState,
  Profile,
  ProfileEditFormProps,
} from "@/app/(member)/account/profile/types";
import { levelLabels } from "@/app/(member)/account/profile/utils";

export function ProfileEditForm({ profile, onSuccess, onCancel }: ProfileEditFormProps) {
  const [formState, setFormState] = useState<FormState>({
    phone: profile.phone,
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
    profilePhotoUrl: profile.profilePhotoUrl || "",
    profilePhotoMediaId: profile.profilePhotoMediaId || "",

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
    paymentNotes: profile.paymentNotes,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allCountries = Country.getAllCountries();
  const phoneCountryCode = useMemo<PhoneCountry>(() => {
    const c = formState.country;
    if (!c) return "NG";
    const match =
      allCountries.find((co) => co.name === c) || allCountries.find((co) => co.isoCode === c);
    return (match?.isoCode as PhoneCountry) || "NG";
  }, [formState.country]);

  const isClub =
    profile.membershipTiers.includes("club") || profile.membershipTiers.includes("academy");
  const isAcademy = profile.membershipTiers.includes("academy");

  async function handleSave() {
    setSaving(true);
    setError(null);

    const updatedProfile: Profile = {
      ...profile,
      phone: formState.phone,
      city: formState.city,
      country: formState.country,
      timeZone: formState.timeZone,
      occupation: formState.occupation,
      areaInLagos: formState.areaInLagos,
      profilePhotoUrl: formState.profilePhotoUrl,
      profilePhotoMediaId: formState.profilePhotoMediaId || profile.profilePhotoMediaId || "",
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
      paymentNotes: formState.paymentNotes,
    };

    try {
      await apiPatch(
        "/api/v1/members/me",
        {
          profile_photo_media_id: formState.profilePhotoMediaId || null,
          profile: {
            phone: formState.phone || undefined,
            city: formState.city || undefined,
            country: formState.country || undefined,
            time_zone: formState.timeZone || undefined,
            occupation: formState.occupation || undefined,
            area_in_lagos: formState.areaInLagos || undefined,
            swim_level: formState.swimLevel || undefined,
            deep_water_comfort: formState.deepWaterComfort || undefined,
            strokes: updatedProfile.strokes,
            interests: updatedProfile.interests,
            personal_goals: formState.goalsNarrative || undefined,
            social_instagram: formState.socialInstagram || undefined,
            social_linkedin: formState.socialLinkedIn || undefined,
            social_other: formState.socialOther || undefined,
          },
          emergency_contact: {
            name: formState.emergencyContactName || undefined,
            contact_relationship: formState.emergencyContactRelationship || undefined,
            phone: formState.emergencyContactPhone || undefined,
            region: formState.emergencyContactRegion || undefined,
            medical_info: formState.medicalInfo || undefined,
            safety_notes: formState.safetyNotes || undefined,
          },
          availability: {
            available_days: updatedProfile.availabilitySlots,
            preferred_times: updatedProfile.timeOfDayAvailability,
            preferred_locations: updatedProfile.locationPreference,
            travel_flexibility: formState.travelFlexibility || undefined,
            accessible_facilities: updatedProfile.facilityAccess,
            equipment_needed: updatedProfile.equipmentNeeds,
          },
          membership: {
            academy_goals: formState.academyFocus || undefined,
            academy_focus_areas: updatedProfile.academyFocusAreas,
          },
          preferences: {
            volunteer_interest: updatedProfile.volunteerInterest,
            volunteer_roles_detail: formState.volunteerRolesDetail || undefined,
            discovery_source: formState.discoverySource || undefined,
            language_preference: formState.languagePreference || undefined,
            comms_preference: formState.commsPreference || undefined,
            payment_readiness: formState.paymentReadiness || undefined,
            currency_preference: formState.currencyPreference || undefined,
            consent_photo: formState.consentPhoto || undefined,
          },
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
        {/* Profile Photo */}
        <div className="md:col-span-2">
          <MediaInput
            label="Profile Photo"
            purpose="profile_photo"
            mode="upload-only"
            value={formState.profilePhotoMediaId || null}
            onChange={(mediaId, fileUrl) =>
              setFormState({
                ...formState,
                profilePhotoMediaId: mediaId || "",
                profilePhotoUrl: fileUrl || "",
              })
            }
          />
        </div>
        {/* Contact & Location */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="font-medium text-slate-900">Contact & Location</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
              <PhoneInput
                key={phoneCountryCode}
                placeholder="Enter phone number"
                value={formState.phone}
                onChange={(value) => setFormState({ ...formState, phone: value || "" })}
                defaultCountry={phoneCountryCode}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
              />
            </div>
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
                  setFormState({
                    ...formState,
                    timeOfDayAvailability: newTimes,
                  });
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
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    locationPreferenceOther: e.target.value,
                  })
                }
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
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    facilityAccessOther: e.target.value,
                  })
                }
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
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    equipmentNeedsOther: e.target.value,
                  })
                }
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
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    emergencyContactName: e.target.value,
                  })
                }
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="Relationship"
                value={formState.emergencyContactRelationship}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    emergencyContactRelationship: e.target.value,
                  })
                }
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="Emergency phone"
                value={formState.emergencyContactPhone}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    emergencyContactPhone: e.target.value,
                  })
                }
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="Emergency region"
                value={formState.emergencyContactRegion}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    emergencyContactRegion: e.target.value,
                  })
                }
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
              onChange={(e) =>
                setFormState({
                  ...formState,
                  volunteerRolesDetail: e.target.value,
                })
              }
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
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
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
              onChange={(e) =>
                setFormState({
                  ...formState,
                  languagePreference: e.target.value,
                })
              }
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
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
              onChange={(e) =>
                setFormState({
                  ...formState,
                  currencyPreference: e.target.value,
                })
              }
            >
              {currencyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
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
