import type { CostQuoteLine } from "./poolPricing";

export type EventAudience = "community" | "club" | "academy";
export type EventVisibility = "public" | "members_only" | "invite_only";
export type LocationType = "physical" | "online" | "hybrid";
export type TierAccess = "public" | "community" | "club" | "academy" | "invite_only";
export type EventFrequency = "weekly" | "monthly" | "quarterly" | "annual";
export type EventPricingMode = "free" | "included" | "fixed" | "cost_plus";
export type MarginType = "fixed_per_attendee" | "percentage";

export interface EventTemplate {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  audience: EventAudience;
  visibility: EventVisibility;
  location_type: LocationType;
  timezone: string;
  location_area: string | null;
  is_location_private: boolean;
  location: string | null;
  local_start_time: string;
  duration_minutes: number;
  max_capacity: number | null;
  tier_access: TierAccess;
  pool_id: string | null;
  cost_naira: number | null;
  pricing_mode: EventPricingMode;
  pricing_expected_attendees: number | null;
  cost_lines: CostQuoteLine[];
  margin_type: MarginType;
  margin_value: number;
  email_reminder_hours: number[];
  frequency: EventFrequency;
  interval: number;
  day_of_week: number | null;
  week_of_month: number | null;
  day_of_month: number | null;
  month_of_year: number | null;
  starts_on: string;
  ends_on: string | null;
  is_active: boolean;
}

export type EventTemplateForm = Omit<
  EventTemplate,
  | "id"
  | "description"
  | "location"
  | "location_area"
  | "cost_naira"
  | "max_capacity"
  | "ends_on"
  | "pricing_expected_attendees"
  | "margin_value"
> & {
  description: string;
  location: string;
  location_area: string;
  ends_on: string;
  max_capacity: string;
  cost_naira: string;
  pricing_expected_attendees: string;
  margin_value: string;
};

export interface EventOccurrence {
  local_date: string;
  start_time: string;
  end_time: string;
  external_key: string;
}

export interface CalendarImportEvent {
  title: string;
  description: string | null;
  event_type: string;
  audience: EventAudience;
  visibility: EventVisibility;
  status: "draft";
  location_type: LocationType;
  timezone: string;
  location_area: string | null;
  is_location_private: boolean;
  location: string | null;
  start_time: string;
  end_time: string | null;
  max_capacity: number | null;
  tier_access: TierAccess;
  pool_id: string | null;
  cost_naira: number | null;
  pricing_mode: EventPricingMode;
  pricing_expected_attendees: number | null;
  cost_lines: CostQuoteLine[];
  margin_type: MarginType;
  margin_value: number;
  email_reminder_hours: number[];
  external_key: string;
  source_sheet: string;
  source_row: number;
}

export interface CalendarImportPreviewItem {
  source_row: number;
  selected: boolean;
  event: CalendarImportEvent | null;
  warnings: string[];
  errors: string[];
}

export interface CalendarImportPreview {
  sheet_name: string;
  valid_count: number;
  invalid_count: number;
  rows: CalendarImportPreviewItem[];
}

export const EMPTY_EVENT_TEMPLATE: EventTemplateForm = {
  title: "",
  description: "",
  event_type: "assessment",
  audience: "academy",
  visibility: "public",
  location_type: "physical",
  timezone: "Africa/Lagos",
  location_area: "",
  is_location_private: false,
  location: "",
  local_start_time: "09:00",
  duration_minutes: 120,
  max_capacity: "",
  cost_naira: "",
  pricing_mode: "free",
  pricing_expected_attendees: "",
  cost_lines: [],
  margin_type: "fixed_per_attendee",
  margin_value: "0",
  email_reminder_hours: [],
  pool_id: null,
  tier_access: "public",
  frequency: "monthly",
  interval: 1,
  day_of_week: 6,
  week_of_month: 2,
  day_of_month: null,
  month_of_year: null,
  starts_on: "",
  ends_on: "",
  is_active: true,
};
