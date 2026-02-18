"use client";

import { CoachPicker } from "@/components/admin/CoachPicker";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  AcademyApi,
  CohortStatus,
  LocationType,
  type CoachAssignmentInput,
  type Program,
} from "@/lib/academy";
import { SessionLocation, SessionsApi, SessionType } from "@/lib/sessions";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Day/time schedule item
interface ScheduleItem {
  day: string;
  startTime: string;
  endTime: string;
}

export default function NewCohortPage() {
  const router = useRouter();
  const [step, setStep] = useState<
    "select-program" | "basics" | "schedule" | "sessions" | "review"
  >("select-program");
  const [saving, setSaving] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);

  // Form state
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
    capacity: 10,
    status: CohortStatus.OPEN,
    allow_mid_entry: false,
    require_approval: false, // If true, enrollment needs admin approval even after payment
    // Coach assignments
    lead_coach_id: null as string | null,
    assistant_coach_id: null as string | null,
    // Location
    timezone: "Africa/Lagos",
    location_type: LocationType.POOL,
    location_name: "",
    location_address: "",
    // Notes & Pricing
    notes_internal: "",
    price_override: null as number | null, // Override program price for this cohort
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

  const updateScheduleItem = (
    index: number,
    field: keyof ScheduleItem,
    value: string,
  ) => {
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

  // --- Submit ---
  const handleSubmit = async () => {
    if (!selectedProgramId) {
      toast.error("Please select a program");
      return;
    }
    if (!formData.name.trim() || !formData.start_date || !formData.end_date) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (
      formData.lead_coach_id &&
      formData.assistant_coach_id &&
      formData.lead_coach_id === formData.assistant_coach_id
    ) {
      toast.error("Lead and assistant coach cannot be the same person");
      return;
    }

    setSaving(true);
    try {
      // Build coach_assignments array from lead + assistant selections
      const coachAssignments: CoachAssignmentInput[] = [];
      if (formData.lead_coach_id) {
        coachAssignments.push({
          coach_id: formData.lead_coach_id,
          role: "lead",
        });
      }
      if (formData.assistant_coach_id) {
        coachAssignments.push({
          coach_id: formData.assistant_coach_id,
          role: "assistant",
        });
      }

      const cohort = await AcademyApi.createCohort({
        program_id: selectedProgramId,
        name: formData.name,
        start_date: formData.start_date,
        end_date: formData.end_date,
        capacity: formData.capacity,
        status: formData.status,
        allow_mid_entry: formData.allow_mid_entry,
        // Send lead coach_id for backward compat + coach_assignments for new system
        coach_id: formData.lead_coach_id || undefined,
        coach_assignments:
          coachAssignments.length > 0 ? coachAssignments : undefined,
        timezone: formData.timezone,
        location_type: formData.location_type,
        location_name: formData.location_name || undefined,
        location_address: formData.location_address || undefined,
        notes_internal: formData.notes_internal || undefined,
        require_approval: formData.require_approval,
      });

      // Generate sessions based on schedule
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      const dayMap: Record<string, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };

      let weekNumber = 1;
      let sessionCount = 0;
      let failedSessionCount = 0;
      const currentDate = new Date(startDate);

      // Loop through each week of the cohort
      while (currentDate <= endDate) {
        // For each schedule item, create a session on the correct day this week
        for (const item of schedule) {
          const targetDay = dayMap[item.day.toLowerCase()];
          const sessionDate = new Date(currentDate);

          // Find the next occurrence of the target day in this week
          const currentDay = sessionDate.getDay();
          const daysUntilTarget = (targetDay - currentDay + 7) % 7;
          sessionDate.setDate(sessionDate.getDate() + daysUntilTarget);

          // Only create if this date is within cohort range
          if (sessionDate >= startDate && sessionDate <= endDate) {
            // Parse times
            const [startHour, startMin] = item.startTime.split(":").map(Number);
            const [endHour, endMin] = item.endTime.split(":").map(Number);

            const sessionStart = new Date(sessionDate);
            sessionStart.setHours(startHour, startMin, 0, 0);

            const sessionEnd = new Date(sessionDate);
            sessionEnd.setHours(endHour, endMin, 0, 0);

            try {
              await SessionsApi.createSession({
                title: `Week ${weekNumber} - ${selectedProgram?.name || "Session"}`,
                session_type: SessionType.COHORT_CLASS,
                cohort_id: cohort.id,
                week_number: weekNumber,
                starts_at: sessionStart.toISOString(),
                ends_at: sessionEnd.toISOString(),
                timezone: formData.timezone,
                capacity: formData.capacity,
                location:
                  formData.location_type === LocationType.OPEN_WATER
                    ? SessionLocation.OPEN_WATER
                    : SessionLocation.OTHER,
                location_name: formData.location_name || undefined,
                location_address: formData.location_address || undefined,
              });
              sessionCount++;
            } catch (sessionErr) {
              failedSessionCount++;
              console.error("Failed to create session:", sessionErr);
            }
          }
        }

        // Move to next week
        currentDate.setDate(currentDate.getDate() + 7);
        weekNumber++;
      }

      if (sessionCount === 0) {
        toast.error(
          "Cohort created, but no sessions were generated. Double-check the cohort dates and schedule.",
        );
      } else if (failedSessionCount > 0) {
        toast.success(
          `Cohort created with ${sessionCount} sessions (${failedSessionCount} failed).`,
        );
      } else {
        toast.success(`Cohort created with ${sessionCount} sessions!`);
      }
      router.push(`/admin/academy/cohorts/${cohort.id}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create cohort");
    } finally {
      setSaving(false);
    }
  };

  const stepLabels = [
    "Select Program",
    "Details",
    "Schedule",
    "Sessions",
    "Review",
  ];
  const steps = ["select-program", "basics", "schedule", "sessions", "review"];
  const currentStepIndex = steps.indexOf(step);

  const daysOfWeek = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

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
          <h1 className="text-3xl font-bold text-slate-900">
            Create New Cohort
          </h1>
        </div>
      </header>

      {/* Step Indicator */}
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

      {/* Step Content */}
      <Card className="p-6">
        {step === "select-program" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">
              Select a Program
            </h2>
            <p className="text-sm text-slate-600">
              Choose which program this cohort will follow.
            </p>

            {loadingPrograms ? (
              <p className="text-slate-500">Loading programs...</p>
            ) : programs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500 mb-4">
                  No programs found. Create a program first.
                </p>
                <Button
                  onClick={() => router.push("/admin/academy/programs/new")}
                >
                  Create Program
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {programs.map((program) => (
                  <div
                    key={program.id}
                    onClick={() => setSelectedProgramId(program.id)}
                    className={`cursor-pointer rounded-lg border-2 p-4 transition ${
                      selectedProgramId === program.id
                        ? "border-cyan-600 bg-cyan-50"
                        : "border-slate-200 hover:border-cyan-300"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {program.name}
                        </h3>
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
        )}

        {step === "basics" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">
              Cohort Details
            </h2>

            {selectedProgram && (
              <div className="rounded-lg bg-cyan-50 border border-cyan-200 p-3 text-sm">
                <span className="font-medium text-cyan-900">Program:</span>{" "}
                <span className="text-cyan-700">{selectedProgram.name}</span>
                <span className="text-cyan-600 ml-2">
                  ({selectedProgram.duration_weeks} weeks)
                </span>
              </div>
            )}

            <Input
              label="Cohort Name *"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Auto-generated from program and start date"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Date *"
                type="date"
                value={formData.start_date}
                onChange={(e) =>
                  setFormData({ ...formData, start_date: e.target.value })
                }
              />
              <Input
                label="End Date"
                type="date"
                value={formData.end_date}
                onChange={(e) =>
                  setFormData({ ...formData, end_date: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Capacity"
                type="number"
                min={1}
                value={formData.capacity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    capacity: parseInt(e.target.value) || 10,
                  })
                }
              />
              <Select
                label="Status"
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as CohortStatus,
                  })
                }
              >
                <option value={CohortStatus.OPEN}>Open for Enrollment</option>
                <option value={CohortStatus.ACTIVE}>
                  Active (In Progress)
                </option>
              </Select>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold text-slate-900 mb-3">
                Coach Assignment
              </h3>
              <div className="space-y-4">
                <CoachPicker
                  value={formData.lead_coach_id}
                  onChange={(memberId) =>
                    setFormData({ ...formData, lead_coach_id: memberId })
                  }
                  label="Lead Coach"
                  hint="Primary coach responsible for this cohort"
                />
                <CoachPicker
                  value={formData.assistant_coach_id}
                  onChange={(memberId) =>
                    setFormData({ ...formData, assistant_coach_id: memberId })
                  }
                  label="Assistant Coach (optional)"
                  hint="Supporting coach for the cohort"
                />
                {formData.lead_coach_id &&
                  formData.assistant_coach_id &&
                  formData.lead_coach_id === formData.assistant_coach_id && (
                    <p className="text-sm text-amber-600">
                      ⚠ Lead and assistant coach cannot be the same person
                    </p>
                  )}
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold text-slate-900 mb-3">Location</h3>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Location Type"
                  value={formData.location_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      location_type: e.target.value as LocationType,
                    })
                  }
                >
                  <option value={LocationType.POOL}>Pool</option>
                  <option value={LocationType.OPEN_WATER}>Open Water</option>
                  <option value={LocationType.REMOTE}>Remote/Online</option>
                </Select>
                <Input
                  label="Location Name"
                  value={formData.location_name}
                  onChange={(e) =>
                    setFormData({ ...formData, location_name: e.target.value })
                  }
                  placeholder="e.g., SunFit Pool"
                />
              </div>
              <Input
                label="Address"
                value={formData.location_address}
                onChange={(e) =>
                  setFormData({ ...formData, location_address: e.target.value })
                }
                placeholder="Full address..."
                className="mt-4"
              />
            </div>

            <label className="flex items-center gap-2 mt-4">
              <input
                type="checkbox"
                checked={formData.allow_mid_entry}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    allow_mid_entry: e.target.checked,
                  })
                }
                className="rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">
                Allow mid-cohort enrollment
              </span>
            </label>

            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={formData.require_approval}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    require_approval: e.target.checked,
                  })
                }
                className="rounded border-slate-300"
              />
              <div>
                <span className="text-sm text-slate-700">
                  Require admin approval
                </span>
                <p className="text-xs text-slate-500">
                  If enabled, enrollments stay pending even after payment until
                  manually approved
                </p>
              </div>
            </label>

            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold text-slate-900 mb-3">Pricing</h3>
              <Input
                label="Price Override (₦)"
                type="number"
                value={formData.price_override ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    price_override: e.target.value
                      ? parseInt(e.target.value)
                      : null,
                  })
                }
                placeholder={`Leave empty to use program price${selectedProgram?.price_amount ? ` (₦${selectedProgram.price_amount.toLocaleString()})` : ""}`}
              />
              <p className="text-xs text-slate-500 mt-1">
                Override the program&apos;s default price for this specific
                cohort
              </p>
            </div>
          </div>
        )}

        {step === "schedule" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Weekly Schedule
                </h2>
                <p className="text-sm text-slate-600">
                  Define when sessions will occur each week
                </p>
              </div>
              <Button variant="outline" onClick={addScheduleItem}>
                + Add Time Slot
              </Button>
            </div>

            {schedule.map((item, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 flex items-end gap-4"
              >
                <Select
                  label="Day"
                  value={item.day}
                  onChange={(e) =>
                    updateScheduleItem(index, "day", e.target.value)
                  }
                  className="flex-1"
                >
                  {daysOfWeek.map((day) => (
                    <option key={day} value={day}>
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Start Time"
                  type="time"
                  value={item.startTime}
                  onChange={(e) =>
                    updateScheduleItem(index, "startTime", e.target.value)
                  }
                />
                <Input
                  label="End Time"
                  type="time"
                  value={item.endTime}
                  onChange={(e) =>
                    updateScheduleItem(index, "endTime", e.target.value)
                  }
                />
                {schedule.length > 1 && (
                  <button
                    onClick={() => removeScheduleItem(index)}
                    className="text-red-500 hover:text-red-700 pb-2"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}

            <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
              <p>
                <strong>Note:</strong> Sessions will be auto-generated based on
                this schedule after you create the cohort.
              </p>
            </div>
          </div>
        )}

        {step === "sessions" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">
              Session Preview
            </h2>
            <p className="text-sm text-slate-600">
              Based on your schedule, the following sessions will be created:
            </p>

            <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4">
              <div className="text-3xl font-bold text-cyan-700">
                {calculateSessionCount()}
              </div>
              <div className="text-sm text-cyan-600">Total sessions</div>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-slate-900">Weekly Pattern:</h3>
              {schedule.map((item, index) => (
                <div key={index} className="text-sm text-slate-700">
                  • Every <strong>{item.day}</strong> from {item.startTime} to{" "}
                  {item.endTime}
                </div>
              ))}
            </div>

            <Textarea
              label="Internal Notes (optional)"
              value={formData.notes_internal}
              onChange={(e) =>
                setFormData({ ...formData, notes_internal: e.target.value })
              }
              placeholder="Notes visible only to admins/coaches..."
            />
          </div>
        )}

        {step === "review" && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-slate-900">
              Review & Create
            </h2>

            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-2">Program</h3>
                <p className="text-slate-700">{selectedProgram?.name || "—"}</p>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-2">
                  Cohort Details
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-500">Name:</span>{" "}
                    {formData.name || "—"}
                  </div>
                  <div>
                    <span className="text-slate-500">Capacity:</span>{" "}
                    {formData.capacity}
                  </div>
                  <div>
                    <span className="text-slate-500">Start:</span>{" "}
                    {formData.start_date || "—"}
                  </div>
                  <div>
                    <span className="text-slate-500">End:</span>{" "}
                    {formData.end_date || "—"}
                  </div>
                  <div>
                    <span className="text-slate-500">Location:</span>{" "}
                    {formData.location_name || "Not set"}
                  </div>
                  <div>
                    <span className="text-slate-500">Status:</span>{" "}
                    {formData.status}
                  </div>
                  <div>
                    <span className="text-slate-500">Lead Coach:</span>{" "}
                    {formData.lead_coach_id ? "Assigned" : "Not assigned"}
                  </div>
                  <div>
                    <span className="text-slate-500">Assistant Coach:</span>{" "}
                    {formData.assistant_coach_id ? "Assigned" : "None"}
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-2">
                  Schedule ({calculateSessionCount()} sessions)
                </h3>
                <div className="text-sm space-y-1">
                  {schedule.map((item, index) => (
                    <div key={index} className="text-slate-700">
                      {item.day.charAt(0).toUpperCase() + item.day.slice(1)}:{" "}
                      {item.startTime} – {item.endTime}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="ghost"
          onClick={() => {
            const prevIndex = currentStepIndex - 1;
            if (prevIndex >= 0) setStep(steps[prevIndex] as any);
          }}
          disabled={step === "select-program"}
        >
          ← Previous
        </Button>

        {step === "review" ? (
          <Button onClick={handleSubmit} disabled={saving}>
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
              if (
                step === "basics" &&
                (!formData.name || !formData.start_date)
              ) {
                toast.error("Please fill in cohort name and start date");
                return;
              }
              const nextIndex = currentStepIndex + 1;
              if (nextIndex < steps.length) setStep(steps[nextIndex] as any);
            }}
          >
            Next →
          </Button>
        )}
      </div>
    </div>
  );
}
