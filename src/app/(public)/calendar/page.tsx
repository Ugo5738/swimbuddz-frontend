import { TierCalendar } from "@/components/calendar/TierCalendar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calendar | SwimBuddz",
  description:
    "See upcoming SwimBuddz open swims, community talks, socials, assessments, and public activities.",
};

export default function PublicCalendarPage() {
  return (
    <TierCalendar
      authenticated={false}
      title="SwimBuddz Calendar"
      subtitle="Open swims, community talks, socials, assessments, and shared moments on the water."
    />
  );
}
