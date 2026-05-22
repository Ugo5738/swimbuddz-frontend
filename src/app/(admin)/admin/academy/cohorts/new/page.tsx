"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AcademyApi, CohortStatus, LocationType, type Program } from "@/lib/academy";
import { apiGet } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BasicsStep } from "./_new/BasicsStep";
import { ReviewStep } from "./_new/ReviewStep";
import { ScheduleStep } from "./_new/ScheduleStep";
import { SelectProgramStep } from "./_new/SelectProgramStep";
import { SessionsStep } from "./_new/SessionsStep";
import { StepIndicator } from "./_new/StepIndicator";
import { useCreateCohort } from "./_new/useCreateCohort";
import type { CohortFormData, RideArea, ScheduleItem } from "./types";

const STEPS = ["select-program", "basics", "schedule", "sessions", "review"] as const;
const STEP_LABELS = ["Select Program", "Details", "Schedule", "Sessions", "Review"];
type Step = (typeof STEPS)[number];

export default function NewCohortPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("select-program");
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [rideAreas, setRideAreas] = useState<RideArea[]>([]);

  const [formData, setFormData] = useState<CohortFormData>({
    name: "",
    start_date: "",
    end_date: "",
    capacity: 10,
    status: CohortStatus.OPEN,
    allow_mid_entry: false,
    require_approval: false,
    admin_dropout_approval: false,
    lead_coach_id: null,
    assistant_coach_id: null,
    timezone: "Africa/Lagos",
    location_type: LocationType.POOL,
    pool_id: null,
    location_name: "",
    location_address: "",
    notes_internal: "",
    price_override: null,
    default_pool_fee: null,
    default_ride_configs: [],
    installment_plan_enabled: false,
    installment_count: null,
    installment_deposit_amount: null,
  });

  // Schedule state (for generating sessions later)
  const [schedule, setSchedule] = useState<ScheduleItem[]>([
    { day: "saturday", startTime: "09:00", endTime: "10:00" },
  ]);

  // Load programs on mount
  useEffect(() => {
    AcademyApi.listPrograms()
      .then(setPrograms)
      .catch(() => toast.error("Failed to load programs"))
      .finally(() => setLoadingPrograms(false));
  }, []);

  // Load ride areas for the ride-config picker in session defaults
  useEffect(() => {
    apiGet<RideArea[]>("/api/v1/transport/areas", { auth: true })
      .then(setRideAreas)
      .catch(() => setRideAreas([]));
  }, []);

  const selectedProgram = programs.find((p) => p.id === selectedProgramId);

  // Auto-fill name and calculate end date when program is selected
  useEffect(() => {
    if (selectedProgram && formData.start_date) {
      // Auto-generate name
      const startDate = new Date(formData.start_date);
      const monthYear = startDate.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      setFormData((prev) => ({
        ...prev,
        name: prev.name || `${selectedProgram.name} - ${monthYear}`,
      }));

      // Auto-calculate end date based on program duration
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + selectedProgram.duration_weeks * 7);
      setFormData((prev) => ({
        ...prev,
        end_date: endDate.toISOString().split("T")[0],
      }));
    }
  }, [selectedProgramId, formData.start_date, selectedProgram]);

  // --- Schedule Helpers ---
  const addScheduleItem = () => {
    setSchedule([
      ...schedule,
      { day: "saturday", startTime: "09:00", endTime: "10:00" },
    ]);
  };

  const updateScheduleItem = (index: number, field: keyof ScheduleItem, value: string) => {
    const updated = [...schedule];
    updated[index][field] = value;
    setSchedule(updated);
  };

  const removeScheduleItem = (index: number) => {
    if (schedule.length > 1) {
      setSchedule(schedule.filter((_, i) => i !== index));
    }
  };

  // Calculate how many sessions will be generated
  const calculateSessionCount = () => {
    if (!formData.start_date || !formData.end_date) return 0;
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    const weeks = Math.ceil(
      (end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );
    return weeks * schedule.length;
  };

  const { saving, submit } = useCreateCohort({
    selectedProgramId,
    selectedProgram,
    formData,
    schedule,
  });

  const currentStepIndex = STEPS.indexOf(step);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push("/admin/academy")}
            className="text-sm text-slate-500 hover:text-slate-900 mb-2"
          >
            ← Back to Academy
          </button>
          <h1 className="text-3xl font-bold text-slate-900">Create New Cohort</h1>
        </div>
      </header>

      <StepIndicator stepLabels={STEP_LABELS} currentStepIndex={currentStepIndex} />

      {/* Step Content */}
      <Card className="p-6">
        {step === "select-program" && (
          <SelectProgramStep
            programs={programs}
            loadingPrograms={loadingPrograms}
            selectedProgramId={selectedProgramId}
            onSelect={setSelectedProgramId}
          />
        )}

        {step === "basics" && (
          <BasicsStep
            selectedProgram={selectedProgram}
            formData={formData}
            rideAreas={rideAreas}
            onChange={setFormData}
          />
        )}

        {step === "schedule" && (
          <ScheduleStep
            schedule={schedule}
            onAdd={addScheduleItem}
            onUpdate={updateScheduleItem}
            onRemove={removeScheduleItem}
          />
        )}

        {step === "sessions" && (
          <SessionsStep
            sessionCount={calculateSessionCount()}
            schedule={schedule}
            notesInternal={formData.notes_internal}
            onNotesChange={(notes_internal) =>
              setFormData({ ...formData, notes_internal })
            }
          />
        )}

        {step === "review" && (
          <ReviewStep
            selectedProgram={selectedProgram}
            formData={formData}
            schedule={schedule}
            sessionCount={calculateSessionCount()}
          />
        )}
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="ghost"
          onClick={() => {
            const prevIndex = currentStepIndex - 1;
            if (prevIndex >= 0) setStep(STEPS[prevIndex]);
          }}
          disabled={step === "select-program"}
        >
          ← Previous
        </Button>

        {step === "review" ? (
          <Button onClick={submit} disabled={saving}>
            {saving ? "Creating..." : "Create Cohort"}
          </Button>
        ) : (
          <Button
            onClick={() => {
              // Validate before proceeding
              if (step === "select-program" && !selectedProgramId) {
                toast.error("Please select a program");
                return;
              }
              if (step === "basics" && (!formData.name || !formData.start_date)) {
                toast.error("Please fill in cohort name and start date");
                return;
              }
              const nextIndex = currentStepIndex + 1;
              if (nextIndex < STEPS.length) setStep(STEPS[nextIndex]);
            }}
          >
            Next →
          </Button>
        )}
      </div>
    </div>
  );
}
