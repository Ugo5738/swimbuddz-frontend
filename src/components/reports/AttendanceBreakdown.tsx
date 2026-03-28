import { Card } from "@/components/ui/Card";
import { CalendarDays, Clock, MapPin } from "lucide-react";

type AttendanceBreakdownProps = {
  sessionsByType: Record<string, number>;
  favoriteDay: string | null;
  favoriteLocation: string | null;
  punctualityRate: number;
};

const typeColors: Record<string, string> = {
  club: "bg-cyan-500",
  community: "bg-blue-500",
  cohort_class: "bg-purple-500",
  event: "bg-amber-500",
};

const typeLabels: Record<string, string> = {
  club: "Club",
  community: "Community",
  cohort_class: "Academy",
  event: "Events",
};

export function AttendanceBreakdown({
  sessionsByType,
  favoriteDay,
  favoriteLocation,
  punctualityRate,
}: AttendanceBreakdownProps) {
  const total = Object.values(sessionsByType).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  return (
    <Card className="p-4 space-y-4">
      <h3 className="font-semibold text-slate-900">Attendance Breakdown</h3>

      {/* Session type bars */}
      <div className="space-y-2">
        {Object.entries(sessionsByType)
          .sort(([, a], [, b]) => b - a)
          .map(([type, count]) => {
            const pct = (count / total) * 100;
            return (
              <div key={type} className="flex items-center gap-3">
                <span className="text-sm text-slate-600 w-24">{typeLabels[type] || type}</span>
                <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${typeColors[type] || "bg-slate-400"}`}
                    style={{ width: `${Math.max(pct, 4)}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-700 w-8 text-right">{count}</span>
              </div>
            );
          })}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
        {favoriteDay && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <CalendarDays className="h-4 w-4 text-cyan-500" />
            <span>
              Favorite day: <strong>{favoriteDay}</strong>
            </span>
          </div>
        )}
        {favoriteLocation && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="h-4 w-4 text-cyan-500" />
            <span>
              Top spot: <strong>{favoriteLocation}</strong>
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Clock className="h-4 w-4 text-green-500" />
          <span>
            On-time rate: <strong>{(punctualityRate * 100).toFixed(0)}%</strong>
          </span>
        </div>
      </div>
    </Card>
  );
}
