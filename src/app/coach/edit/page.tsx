"use client";

import { OptionPillGroup } from "@/components/forms/OptionPillGroup";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiPatch } from "@/lib/api";
import { getMyCoachProfile, type CoachProfile } from "@/lib/coach";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const certificationOptions = [
  { value: "cpr", label: "CPR" },
  { value: "first_aid", label: "First Aid" },
  { value: "lifeguard", label: "Lifeguard" },
  { value: "asca_1", label: "ASCA Level 1" },
  { value: "asca_2", label: "ASCA Level 2" },
  { value: "asca_3", label: "ASCA Level 3" },
  { value: "fina", label: "FINA" },
  { value: "nsf", label: "NSF" },
  { value: "usa_swimming", label: "USA Swimming" },
  { value: "swim_england", label: "Swim England" },
];

const specialtyOptions = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "competitive", label: "Competitive" },
  { value: "triathlon", label: "Triathlon" },
  { value: "water_safety", label: "Water Safety" },
  { value: "technique", label: "Technique" },
  { value: "stroke_correction", label: "Stroke Correction" },
  { value: "children", label: "Children" },
  { value: "adults", label: "Adults" },
  { value: "special_needs", label: "Special Needs" },
];

export default function CoachEditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [shortBio, setShortBio] = useState("");
  const [coachingYears, setCoachingYears] = useState(0);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);

  useEffect(() => {
    async function loadProfile() {
      try {
        const profile = await getMyCoachProfile();
        setDisplayName(profile.display_name || "");
        setShortBio(profile.short_bio || "");
        setCoachingYears(profile.coaching_years || 0);
        setCertifications(profile.certifications || []);
        setSpecialties(profile.coaching_specialties || []);
      } catch (err) {
        console.error("Failed to load profile", err);
        setError("Failed to load your profile");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      await apiPatch<CoachProfile>(
        "/api/v1/coaches/me",
        {
          display_name: displayName || undefined,
          short_bio: shortBio || undefined,
          coaching_years: coachingYears,
          certifications,
          coaching_specialties: specialties,
        },
        { auth: true },
      );

      toast.success("Profile updated successfully!");
      router.push("/coach/profile");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update profile";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingCard text="Loading profile..." />;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/coach/profile"
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Profile
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Edit Profile</h1>
          <p className="text-slate-600 mt-1">
            Update your coach profile information.
          </p>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Card className="p-6 space-y-6">
        {/* Display Name */}
        <Input
          label="Display Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Coach John"
        />

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Short Bio
          </label>
          <textarea
            value={shortBio}
            onChange={(e) => setShortBio(e.target.value)}
            placeholder="Tell students about yourself and your coaching style..."
            rows={4}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        {/* Years Experience */}
        <Input
          label="Years of Coaching Experience"
          type="number"
          min={0}
          max={50}
          value={coachingYears}
          onChange={(e) => setCoachingYears(parseInt(e.target.value) || 0)}
        />

        {/* Certifications */}
        <OptionPillGroup
          label="Certifications"
          options={certificationOptions}
          selected={certifications}
          onToggle={(value) =>
            setCertifications((prev) =>
              prev.includes(value)
                ? prev.filter((v) => v !== value)
                : [...prev, value],
            )
          }
        />

        {/* Specialties */}
        <OptionPillGroup
          label="Coaching Specialties"
          options={specialtyOptions}
          selected={specialties}
          onToggle={(value) =>
            setSpecialties((prev) =>
              prev.includes(value)
                ? prev.filter((v) => v !== value)
                : [...prev, value],
            )
          }
        />

        {/* Save */}
        <div className="pt-4 border-t">
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
