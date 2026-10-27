import { describe, expect, it } from "vitest";
import { rankNextSwims } from "../next-swim-recommendations";
import { SessionType } from "../sessions";
import type { SessionWithRides } from "@/components/sessions/SessionCard";

function session(id: string, overrides: Record<string, unknown> = {}): SessionWithRides {
  return {
    id, title:id, starts_at:"2026-11-07T14:00:00+01:00",
    ends_at:"2026-11-07T16:00:00+01:00", session_type:SessionType.CLUB,
    status:"published", access:{bookable:true,fee_amount_kobo:0},
    pool_fee:0, ride_configs:[], ...overrides,
  } as unknown as SessionWithRides;
}
const ctx = {
  bookedSessionIds: new Set<string>(),
  enrolledCohortIds: new Set<string>(),
  myPodId:"dolphin",
};
describe("rankNextSwims",()=>{
  const now = new Date("2026-10-27T12:00:00+01:00");
  it("prioritizes an eligible exact pod over other available sessions",()=>{
    const ranked=rankNextSwims([session("general"),session("pod",{pod_id:"dolphin"})],ctx,now);
    expect(ranked.bookable.map(s=>s.id)).toEqual(["pod","general"]);
  });
  it("never suggests unavailable, foreign pod or cohort sessions as bookable",()=>{
    const ranked=rankNextSwims([session("foreign",{pod_id:"other"}),session("foreign-academy",{cohort_id:"other"}),session("locked",{access:{bookable:false}})],ctx,now);
    expect(ranked.bookable).toEqual([]);
  });
  it("keeps confirmed and assigned classes out of new booking suggestions",()=>{
    const ranked=rankNextSwims([
      session("booked"),session("class",{session_type:SessionType.COHORT_CLASS,cohort_id:"academy",cohort_fee_mode:"included"}),
    ],{...ctx,bookedSessionIds:new Set(["booked"]),enrolledCohortIds:new Set(["academy"])},now);
    expect(ranked.bookable).toEqual([]);
    expect(ranked.scheduled.map(s=>s.id)).toEqual(["booked","class"]);
  });
  it("uses saved preferences within the same eligibility tier",()=>{
    const ranked=rankNextSwims([session("far",{location_name:"Ikeja"}),session("preferred",{location_name:"Yaba"})],
      {...ctx,preferences:{preferredLocations:["Yaba"]}},now);
    expect(ranked.bookable[0].id).toBe("preferred");
  });
});
