import { TierCalendar } from "@/components/calendar/TierCalendar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SwimBuddz Calendar | Member Portal",
};

export default function MemberCalendarPage() {
  return (
    <TierCalendar
      authenticated
      title="SwimBuddz Calendar"
      subtitle="Everything happening across SwimBuddz: Academy classes, Club practices, Community swims, events and experiences."
    />
  );
}
