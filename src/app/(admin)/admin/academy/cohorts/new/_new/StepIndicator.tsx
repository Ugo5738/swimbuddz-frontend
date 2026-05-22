type Props = {
  stepLabels: string[];
  currentStepIndex: number;
};

export function StepIndicator({ stepLabels, currentStepIndex }: Props) {
  return (
    <div className="flex gap-2">
      {stepLabels.map((label, i) => (
        <div
          key={label}
          className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors ${
            i === currentStepIndex
              ? "bg-cyan-600 text-white"
              : i < currentStepIndex
                ? "bg-green-100 text-green-700"
                : "bg-slate-100 text-slate-500"
          }`}
        >
          {label}
        </div>
      ))}
    </div>
  );
}
