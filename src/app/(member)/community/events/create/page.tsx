import { redirect } from "next/navigation";

/** Member Open Swims now require the unified request and pool-approval flow. */
export default function LegacyCreateOpenSwim() {
  redirect("/account/plan-a-swim?kind=open");
}
