// Constants extracted from page.tsx during the file-size sweep.

import { SessionType } from "@/lib/sessions";

import type { DateFilter, ViewTab } from "./types";

export const SESSION_TYPES_QUERY = [
  SessionType.COMMUNITY,
  SessionType.CLUB,
  SessionType.COHORT_CLASS,
  SessionType.EVENT,
].join(",");

export const TABS: { key: ViewTab; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "booked", label: "Booked" },
  { key: "past", label: "Past" },
  { key: "all", label: "All" },
];

export const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: "all", label: "Any date" },
  { key: "this_week", label: "This week" },
  { key: "next_7", label: "Next 7 days" },
  { key: "this_month", label: "This month" },
  { key: "next_30", label: "Next 30 days" },
];

// Session types available for filtering (user-friendly subset)
export const TYPE_FILTER_OPTIONS = [
  SessionType.COMMUNITY,
  SessionType.CLUB,
  SessionType.COHORT_CLASS,
  SessionType.EVENT,
];
