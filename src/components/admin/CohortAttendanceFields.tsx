"use client";

import { Select } from "@/components/ui/Select";

export function CohortAttendanceFields({ value, paidExtra, onChange }: {
  value: "automatic" | "individual";
  paidExtra: boolean;
  onChange: (value: "automatic" | "individual") => void;
}) {
  return (
    <Select
      label="Class attendance"
      value={paidExtra ? "individual" : value}
      disabled={paidExtra}
      onChange={(event) => onChange(event.target.value as "automatic" | "individual")}
      hint={paidExtra || value === "individual"
        ? "No student is marked Present automatically. Record each attendee under Academy student, choosing a purchased class or a separately paid extra."
        : "Enrolled students default to Present for this regular class. Admins and coaches can record Absent or Excused exceptions."}
    >
      <option value="automatic">Regular cohort class — automatic Present</option>
      <option value="individual">Extra / individual class — record each attendee</option>
    </Select>
  );
}
