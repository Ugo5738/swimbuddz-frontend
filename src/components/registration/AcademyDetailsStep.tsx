import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Info } from "lucide-react";

interface AcademyDetailsStepProps {
  formData: {
    academySkillAssessment: {
      canFloat: boolean;
      headUnderwater: boolean;
      deepWaterComfort: boolean;
      canSwim25m: boolean;
    };
    academyGoals: string;
    academyPreferredCoachGender: string;
    academyLessonPreference: string;
  };
  onUpdate: (field: string, value: string | Record<string, boolean>) => void;
}

export function AcademyDetailsStep({
  formData,
  onUpdate,
}: AcademyDetailsStepProps) {
  const handleSkillToggle = (skill: string, value: boolean) => {
    onUpdate("academySkillAssessment", {
      ...formData.academySkillAssessment,
      [skill]: value,
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-slate-900">
          Academy readiness & goals
        </h3>
        <p className="text-sm text-slate-600">
          Help us understand your current level and what you want to achieve so
          we can recommend the right Academy cohorts when you're ready.
        </p>
      </div>

      {/* Skill Assessment */}
      <div className="space-y-4 rounded-lg border border-cyan-200 bg-cyan-50 p-4">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-cyan-600" />
          <div>
            <h4 className="font-medium text-cyan-900">
              Current Skill Assessment
            </h4>
            <p className="text-sm text-cyan-700">
              Be honest about your current abilities - this helps us offer you
              the right programs.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {[
            { key: "canFloat", label: "I can float comfortably on my back" },
            {
              key: "headUnderwater",
              label: "I'm comfortable putting my head underwater",
            },
            { key: "deepWaterComfort", label: "I'm comfortable in deep water" },
            {
              key: "canSwim25m",
              label: "I can swim 25 meters without stopping",
            },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={
                  formData.academySkillAssessment[
                    key as keyof typeof formData.academySkillAssessment
                  ]
                }
                onChange={(e) => handleSkillToggle(key, e.target.checked)}
                className="h-5 w-5 rounded border-cyan-300 text-cyan-600 focus:ring-cyan-500"
              />
              <span className="text-sm text-slate-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Learning Goals */}
      <Textarea
        label="What are your learning goals?"
        name="academyGoals"
        value={formData.academyGoals}
        onChange={(e) => onUpdate("academyGoals", e.target.value)}
        placeholder="E.g., Learn to swim confidently, improve technique, prepare for triathlon, overcome fear of water..."
        rows={4}
        required
        hint="Tell us what you want to achieve through the Academy program"
      />

      {/* Coach Preferences */}
      <Select
        label="Coach Gender Preference"
        name="academyPreferredCoachGender"
        value={formData.academyPreferredCoachGender}
        onChange={(e) =>
          onUpdate("academyPreferredCoachGender", e.target.value)
        }
        required
      >
        <option value="">Select preference</option>
        <option value="male">Male coach</option>
        <option value="female">Female coach</option>
        <option value="no_preference">No preference</option>
      </Select>

      {/* Format Callout & Preference */}
      <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-4 text-xs text-purple-900 space-y-1.5">
        <p className="font-semibold text-purple-950">About Academy Classes & Structure</p>
        <p>
          SwimBuddz Academy programmes are structured <strong>small-group cohorts</strong> (typically 4–6 learners per coach).
          Your lesson preference below is an indicator for personalized recommendations and helps us gauge demand for future 1-on-1 private lesson offerings.
        </p>
      </div>

      <Select
        label="Lesson Format Preference (for future recommendations)"
        name="academyLessonPreference"
        value={formData.academyLessonPreference}
        onChange={(e) => onUpdate("academyLessonPreference", e.target.value)}
        hint="All scheduled Academy cohorts are small groups. Tell us your preference for recommendations or future private offerings."
        required
      >
        <option value="">Select preference</option>
        <option value="group">Group cohort (standard SwimBuddz Academy classes)</option>
        <option value="one_on_one">1-on-1 private lessons (interest indicator for future private coaching)</option>
        <option value="flexible">Flexible — open to either</option>
      </Select>

      <div className="rounded-lg bg-slate-100 p-4">
        <p className="text-sm text-slate-700">
          <strong>Next steps:</strong> After onboarding, you will choose an upcoming <strong>small-group Academy cohort</strong> that matches your level and schedule. You can review details, schedules, and pricing before enrolling.
        </p>
      </div>
    </div>
  );
}
