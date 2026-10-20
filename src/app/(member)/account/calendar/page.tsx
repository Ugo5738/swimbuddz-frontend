import { redirect } from "next/navigation";

/** The shared SwimBuddz calendar is public, not an individual's booking list. */
export default function LegacyAccountCalendar() {
  redirect("/calendar");
}
