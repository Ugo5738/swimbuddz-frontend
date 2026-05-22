"use client";

import { Button } from "@/components/ui/Button";
import type { Program } from "@/lib/academy";
import { useRouter } from "next/navigation";

type Props = {
  programs: Program[];
  loadingPrograms: boolean;
  selectedProgramId: string;
  onSelect: (id: string) => void;
};

export function SelectProgramStep({
  programs,
  loadingPrograms,
  selectedProgramId,
  onSelect,
}: Props) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">Select a Program</h2>
      <p className="text-sm text-slate-600">Choose which program this cohort will follow.</p>

      {loadingPrograms ? (
        <p className="text-slate-500">Loading programs...</p>
      ) : programs.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-slate-500 mb-4">No programs found. Create a program first.</p>
          <Button onClick={() => router.push("/admin/academy/programs/new")}>
            Create Program
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {programs.map((program) => (
            <div
              key={program.id}
              onClick={() => onSelect(program.id)}
              className={`cursor-pointer rounded-lg border-2 p-4 transition ${
                selectedProgramId === program.id
                  ? "border-cyan-600 bg-cyan-50"
                  : "border-slate-200 hover:border-cyan-300"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-slate-900">{program.name}</h3>
                  <p className="text-sm text-slate-600">
                    {program.description || "No description"}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium text-slate-700">
                    {program.duration_weeks} weeks
                  </div>
                  <div className="text-slate-500">{program.level}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
