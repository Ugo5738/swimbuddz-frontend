import { Card } from "@/components/ui/Card";
import { Award, BookOpen, GraduationCap, Target } from "lucide-react";

type AchievementsListProps = {
  milestonesAchieved: number;
  milestonesInProgress: number;
  certificatesEarned: number;
  programsEnrolled: number;
  academySkills?: string[] | null;
};

export function AchievementsList({
  milestonesAchieved,
  milestonesInProgress,
  certificatesEarned,
  programsEnrolled,
  academySkills,
}: AchievementsListProps) {
  const skills = academySkills?.length ? academySkills : [];
  const hasAcademy =
    milestonesAchieved > 0 ||
    milestonesInProgress > 0 ||
    certificatesEarned > 0 ||
    programsEnrolled > 0 ||
    skills.length > 0;

  if (!hasAcademy) return null;

  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-semibold text-slate-900">Academy Achievements</h3>

      <div className="grid grid-cols-2 gap-3">
        {milestonesAchieved > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50">
            <Award className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-lg font-bold text-green-700">{milestonesAchieved}</p>
              <p className="text-xs text-green-600">Milestones achieved</p>
            </div>
          </div>
        )}

        {milestonesInProgress > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50">
            <Target className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-lg font-bold text-amber-700">{milestonesInProgress}</p>
              <p className="text-xs text-amber-600">In progress</p>
            </div>
          </div>
        )}

        {certificatesEarned > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-50">
            <GraduationCap className="h-5 w-5 text-purple-600" />
            <div>
              <p className="text-lg font-bold text-purple-700">{certificatesEarned}</p>
              <p className="text-xs text-purple-600">Certificates earned</p>
            </div>
          </div>
        )}

        {programsEnrolled > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-lg font-bold text-blue-700">{programsEnrolled}</p>
              <p className="text-xs text-blue-600">Programs enrolled</p>
            </div>
          </div>
        )}
      </div>

      {skills.length > 0 && (
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Skills Learned</p>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center rounded-full bg-cyan-100 px-3 py-1 text-xs font-medium text-cyan-800"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
