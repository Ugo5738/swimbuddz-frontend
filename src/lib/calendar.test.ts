import {
  calendarActivityLabel,
  calendarActionLabel,
  calendarMatchesAudience,
  type CalendarItem,
} from "./calendar";
import { describe, expect, it } from "vitest";

const item: CalendarItem = {
  id: "community-swim",
  source: "event",
  primary_audience: "community",
  audiences: ["community", "club", "academy"],
  audience: "community",
  kind: "stroke_endurance_clinic",
  visibility: "public",
  access_level: "public",
  location_type: "physical",
  title: "Deep Water Confidence Clinic",
  description: null,
  starts_at: "2027-01-02T08:00:00Z",
  ends_at: null,
  timezone: "Africa/Lagos",
  location_name: null,
  location_area: null,
  pool_id: null,
  status: "published",
  href: "/community/events/community-swim",
  bookable: false,
  viewer_can_attend: true,
};

describe("calendar projection helpers", () => {
  it("matches every relevant audience rather than only the primary lane", () => {
    expect(calendarMatchesAudience(item, "community")).toBe(true);
    expect(calendarMatchesAudience(item, "club")).toBe(true);
    expect(calendarMatchesAudience(item, "academy")).toBe(true);
  });

  it("humanises unknown activity keys", () => {
    expect(calendarActivityLabel("stroke_endurance_clinic")).toBe(
      "Stroke Endurance Clinic"
    );
  });

  it("uses a graceful action for future calendar sources", () => {
    expect(calendarActionLabel({ ...item, source: "future_domain" })).toBe("View activity");
  });
});
