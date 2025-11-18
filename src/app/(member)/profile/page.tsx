"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { apiPatch } from "@/lib/api";
import { LoadingCard } from "@/components/ui/LoadingCard";

const mockProfile = {
  name: "Ada Obi",
  email: "ada@example.com",
  phone: "0801 234 5678",
  level: "Intermediate",
  deepWaterComfort: "Comfortable",
  interests: ["Triathlon", "Freestyle", "Open water"],
  locationPreference: "Yaba, Ikoyi",
  emergencyContact: "Chinedu Obi – Brother – 0802 345 6789",
  medicalInfo: "Mild asthma, uses inhaler",
  status: "Active member",
  role: "Member"
};

type Profile = typeof mockProfile;

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
          <h2 className="text-lg font-semibold text-slate-900">Contact</h2>
          <p className="text-sm text-slate-600">{profile.email}</p>
          <p className="text-sm text-slate-600">{profile.phone}</p>
        </Card>
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Status</h2>
          <Badge variant="info">{profile.status}</Badge>
          <p className="text-sm text-slate-600">Role: {profile.role}</p>
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
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Level</p>
              <p className="text-base font-semibold text-slate-900">{profile.level}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Deep-water comfort</p>
              <p className="text-base font-semibold text-slate-900">{profile.deepWaterComfort}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Interests</p>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <Badge key={interest}>{interest}</Badge>
                ))}
              </div>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Preferred locations</p>
              <p className="text-base text-slate-700">{profile.locationPreference}</p>
            </div>
          </div>
        )}
      </Card>

      <Alert variant="info" title="Emergency details">
        <p>Emergency contact: {profile.emergencyContact}</p>
        <p>Medical info (confidential): {profile.medicalInfo}</p>
      </Alert>
    </div>
  );
}

type ProfileEditFormProps = {
  profile: Profile;
  onSuccess: (profile: Profile) => void;
  onCancel: () => void;
};

function ProfileEditForm({ profile, onSuccess, onCancel }: ProfileEditFormProps) {
  const [formState, setFormState] = useState({
    level: profile.level,
    deepWaterComfort: profile.deepWaterComfort,
    interestsText: profile.interests.join(", "),
    locationPreference: profile.locationPreference,
    emergencyContact: profile.emergencyContact,
    medicalInfo: profile.medicalInfo
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof typeof formState>(field: K, value: (typeof formState)[K]) {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    const updatedProfile: Profile = {
      ...profile,
      level: formState.level,
      deepWaterComfort: formState.deepWaterComfort,
      interests: formState.interestsText
        .split(",")
        .map((interest) => interest.trim())
        .filter(Boolean),
      locationPreference: formState.locationPreference,
      emergencyContact: formState.emergencyContact,
      medicalInfo: formState.medicalInfo
    };

    try {
      await apiPatch(
        "/api/v1/members/me",
        {
          swim_level: formState.level,
          deep_water_comfort: formState.deepWaterComfort,
          interests: updatedProfile.interests,
          location_preference: formState.locationPreference,
          emergency_contact: formState.emergencyContact,
          medical_info: formState.medicalInfo
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
      <Select
        label="Swimming level"
        value={formState.level}
        onChange={(event) => updateField("level", event.target.value)}
      >
        <option value="Beginner">Beginner</option>
        <option value="Intermediate">Intermediate</option>
        <option value="Advanced">Advanced</option>
      </Select>
      <Select
        label="Deep-water comfort"
        value={formState.deepWaterComfort}
        onChange={(event) => updateField("deepWaterComfort", event.target.value)}
      >
        <option value="Learning">Learning</option>
        <option value="Comfortable">Comfortable</option>
        <option value="Expert">Expert</option>
      </Select>
      <Textarea
        label="Interests"
        hint="Comma-separated list (e.g., Triathlon, Deep water, Ride-share)"
        rows={3}
        value={formState.interestsText}
        onChange={(event) => updateField("interestsText", event.target.value)}
      />
      <Input
        label="Preferred locations"
        value={formState.locationPreference}
        onChange={(event) => updateField("locationPreference", event.target.value)}
      />
      <Textarea
        label="Emergency contact"
        rows={3}
        value={formState.emergencyContact}
        onChange={(event) => updateField("emergencyContact", event.target.value)}
      />
      <Textarea
        label="Medical info"
        rows={3}
        value={formState.medicalInfo}
        onChange={(event) => updateField("medicalInfo", event.target.value)}
      />
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
