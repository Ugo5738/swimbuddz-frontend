import { Card } from "@/components/ui/Card";

type Props = {
  currentNumber: number;
  stepCount: number;
  currentStepTitle: string;
  progressPercent: number;
};

export function ProgressHeader({
  currentNumber,
  stepCount,
  currentStepTitle,
  progressPercent,
}: Props) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-slate-600">
          Step {currentNumber} of {stepCount} • {currentStepTitle} • {progressPercent}% complete
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-cyan-600"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </Card>
  );
}
