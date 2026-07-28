import { TierCalendar } from "@/components/calendar/TierCalendar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Calendar | SwimBuddz",
};

export default function MemberCalendarPage() {
  return (
    <TierCalendar
      authenticated
      title="My SwimBuddz Calendar"
      subtitle="Your available Community activities, Club sessions, and Academy cohort dates in one place."
    />
  );
}
