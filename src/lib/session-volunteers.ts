import { VolunteersApi, type OpportunityType, type VolunteerTier } from "./volunteers";

export type VolunteerNeedDraft = {
  source_template_id: string | null;
  role_id: string;
  role_title: string;
  slots_needed: number;
  opportunity_type: OpportunityType;
  min_tier: VolunteerTier;
  title_override: string;
  description: string;
  start_time: string;
  end_time: string;
  cancellation_deadline_hours: number;
  qr_checkin_enabled: boolean;
};

type SessionVolunteerContext = {
  title: string;
  starts_at: string;
  ends_at: string;
  location_name?: string | null;
};

function lagosDateAndTime(isoValue: string) {
  const value = new Date(isoValue);
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(value);
  return { date, time };
}

export async function createSessionVolunteerOpportunities(
  sessionId: string,
  session: SessionVolunteerContext,
  volunteerNeeds: VolunteerNeedDraft[]
) {
  if (volunteerNeeds.length === 0) return { createdCount: 0, skippedCount: 0 };
  const start = lagosDateAndTime(session.starts_at);
  const end = lagosDateAndTime(session.ends_at);
  const existing = await VolunteersApi.admin.listOpportunities({ session_id: sessionId });
  const activeKeys = new Set(
    existing
      .filter((opportunity) => opportunity.status !== "cancelled")
      .map(
        (opportunity) =>
          `${opportunity.role_id ?? ""}|${opportunity.date}|${opportunity.start_time?.slice(0, 5) ?? ""}|${opportunity.end_time?.slice(0, 5) ?? ""}`
      )
  );
  const toCreate: VolunteerNeedDraft[] = [];
  let skippedCount = 0;
  for (const need of volunteerNeeds) {
    const key = [
      need.role_id,
      start.date,
      (need.start_time || start.time).slice(0, 5),
      (need.end_time || end.time).slice(0, 5),
    ].join("|");
    if (activeKeys.has(key)) {
      skippedCount += 1;
      continue;
    }
    activeKeys.add(key);
    toCreate.push(need);
  }
  if (toCreate.length === 0) {
    return { createdCount: 0, skippedCount };
  }
  await VolunteersApi.admin.bulkCreateOpportunities(
    toCreate.map((need) => ({
      title: need.title_override || need.role_title || "Session volunteer",
      description: need.description || `Volunteer support for ${session.title}.`,
      role_id: need.role_id,
      date: start.date,
      start_time: need.start_time || start.time,
      end_time: need.end_time || end.time,
      session_id: sessionId,
      location_name: session.location_name || undefined,
      slots_needed: need.slots_needed,
      opportunity_type: need.opportunity_type,
      min_tier: need.min_tier,
      cancellation_deadline_hours: need.cancellation_deadline_hours,
      qr_checkin_enabled: need.qr_checkin_enabled,
      status: "open",
    }))
  );
  return { createdCount: toCreate.length, skippedCount };
}
