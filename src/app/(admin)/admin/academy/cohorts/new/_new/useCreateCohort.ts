"use client";

import {
  AcademyApi,
  LocationType,
  type CoachAssignmentInput,
  type Program,
} from "@/lib/academy";
import { apiPost } from "@/lib/api";
import { SessionLocation, SessionsApi, SessionType } from "@/lib/sessions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import type { CohortFormData, ScheduleItem } from "../types";

const dayMap: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

type Params = {
  selectedProgramId: string;
  selectedProgram: Program | undefined;
  formData: CohortFormData;
  schedule: ScheduleItem[];
};

export function useCreateCohort({
  selectedProgramId,
  selectedProgram,
  formData,
  schedule,
}: Params) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const submit = async () => {
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
        coach_assignments: coachAssignments.length > 0 ? coachAssignments : undefined,
        timezone: formData.timezone,
        location_type: formData.location_type,
        pool_id: formData.pool_id,
        location_name: formData.location_name || undefined,
        location_address: formData.location_address || undefined,
        notes_internal: formData.notes_internal || undefined,
        require_approval: formData.require_approval,
        admin_dropout_approval: formData.admin_dropout_approval,
        // Session defaults
        default_pool_fee: formData.default_pool_fee,
        default_ride_configs:
          formData.default_ride_configs.length > 0 ? formData.default_ride_configs : null,
        // Installment billing
        installment_plan_enabled: formData.installment_plan_enabled,
        installment_count: formData.installment_count ?? undefined,
        installment_deposit_amount: formData.installment_deposit_amount ?? undefined,
      });

      // Generate sessions based on schedule
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);

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
              const createdSession = await SessionsApi.createSession({
                title: `Week ${weekNumber} - ${selectedProgram?.name || "Session"}`,
                session_type: SessionType.COHORT_CLASS,
                cohort_id: cohort.id,
                week_number: weekNumber,
                starts_at: sessionStart.toISOString(),
                ends_at: sessionEnd.toISOString(),
                timezone: formData.timezone,
                capacity: formData.capacity,
                // Prefer the pool link from the registry; fall back to the
                // legacy enum only when no pool was selected.
                pool_id: formData.pool_id,
                location: formData.pool_id
                  ? undefined
                  : formData.location_type === LocationType.OPEN_WATER
                    ? SessionLocation.OPEN_WATER
                    : SessionLocation.OTHER,
                location_name: formData.location_name || undefined,
                location_address: formData.location_address || undefined,
                pool_fee: formData.default_pool_fee ?? 0,
              });

              // Attach any default ride configs to the newly-created session.
              // Non-fatal — failure here doesn't roll back the session creation;
              // admin can fix ride configs on the session detail page later.
              if (createdSession?.id && formData.default_ride_configs.length > 0) {
                try {
                  // Departure defaults to 2 hours before session start (matches
                  // the session edit form's default).
                  const departureIso = new Date(
                    sessionStart.getTime() - 2 * 60 * 60 * 1000,
                  ).toISOString();
                  await apiPost(
                    `/api/v1/transport/sessions/${createdSession.id}/ride-configs`,
                    formData.default_ride_configs.map((rc) => ({
                      ride_area_id: rc.ride_area_id,
                      cost: rc.cost,
                      capacity: rc.capacity,
                      departure_time: departureIso,
                    })),
                    { auth: true },
                  );
                } catch (rideErr) {
                  console.error("Failed to attach default ride configs to session:", rideErr);
                }
              }

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

  return { saving, submit };
}
