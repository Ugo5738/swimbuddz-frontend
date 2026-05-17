"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  TIER_SHORT_LABELS,
  type VolunteerOpportunity,
  type VolunteerTier,
} from "@/lib/volunteers";
import { Calendar, Clock, MapPin } from "lucide-react";
import Link from "next/link";

interface OpportunityCardProps {
  opp: VolunteerOpportunity;
  /** Logged-in member's volunteer tier, if registered. Used to flag ineligible
   *  opportunities. `null` = not registered or tier not yet loaded; treated as
   *  "no eligibility info" rather than ineligible. */
  memberTier?: VolunteerTier | null;
  /** Called when an `open_claim` card's inline Claim button is pressed.
   *  When omitted, the whole card just links to the detail page. */
  onClaim?: (oppId: string) => void;
  /** True while a claim is in-flight for this card. */
  claiming?: boolean;
  /** True if the logged-in member has already claimed this opportunity. */
  hasClaimed?: boolean;
}

const TIER_RANK: Record<VolunteerTier, number> = {
  tier_1: 1,
  tier_2: 2,
  tier_3: 3,
};

function isEligibleByTier(
  memberTier: VolunteerTier | null | undefined,
  minTier: VolunteerTier,
): boolean {
  if (!memberTier) return true; // unknown → don't block visually
  return TIER_RANK[memberTier] >= TIER_RANK[minTier];
}

/** Hours until a Date (negative if past). Returns null if the input is null. */
function hoursUntil(target: Date): number {
  return (target.getTime() - Date.now()) / 3_600_000;
}

export function OpportunityCard({
  opp,
  memberTier,
  onClaim,
  claiming = false,
  hasClaimed = false,
}: OpportunityCardProps) {
  const slotsLeft = opp.slots_needed - opp.slots_filled;
  const isFull = slotsLeft <= 0;
  const eligible = isEligibleByTier(memberTier, opp.min_tier);
  const isApproval = opp.opportunity_type === "approval_required";

  // Cancellation-deadline window. The opportunity becomes uncancellable
  // `cancellation_deadline_hours` before its start; treat the same window as
  // "closing soon" for unclaimed members.
  let closingSoon = false;
  if (opp.start_time) {
    const startAt = new Date(`${opp.date}T${opp.start_time}`);
    const hrs = hoursUntil(startAt);
    closingSoon =
      hrs > 0 && hrs <= opp.cancellation_deadline_hours;
  }

  const detailHref = `/community/volunteers/opportunities/${opp.id}`;

  // The inline Claim button only shows for open_claim opportunities. Approval-
  // required ones intentionally route through the detail page so the member
  // reads more before committing.
  const showInlineClaim =
    !!onClaim && !isApproval && !isFull && !hasClaimed && eligible;

  const body = (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-2 flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <h3 className="font-semibold text-slate-900">{opp.title}</h3>
          {opp.role_title && (
            <Badge variant="default">{opp.role_title}</Badge>
          )}
          {isApproval && <Badge variant="warning">Approval Required</Badge>}
          {!eligible && (
            <Badge variant="outline">
              Min: {TIER_SHORT_LABELS[opp.min_tier]}
            </Badge>
          )}
          {closingSoon && !hasClaimed && (
            <Badge variant="warning">Closing soon</Badge>
          )}
          {hasClaimed && <Badge variant="success">You&apos;re signed up</Badge>}
        </div>
        {opp.description && (
          <p className="text-sm text-slate-600 line-clamp-2">
            {opp.description}
          </p>
        )}
        <div className="flex flex-wrap gap-4 text-sm text-slate-500">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {new Date(opp.date).toLocaleDateString("en-NG", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </span>
          {opp.start_time && (
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {opp.start_time.slice(0, 5)}
              {opp.end_time && ` – ${opp.end_time.slice(0, 5)}`}
            </span>
          )}
          {opp.location_name && (
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {opp.location_name}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-3">
        <Badge
          variant={
            isFull ? "warning" : slotsLeft <= 1 ? "info" : "success"
          }
        >
          {isFull
            ? "Full"
            : `${slotsLeft} slot${slotsLeft > 1 ? "s" : ""} left`}
        </Badge>
        {showInlineClaim && (
          <Button
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClaim?.(opp.id);
            }}
            disabled={claiming}
          >
            {claiming ? "Claiming…" : "Claim"}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Link href={detailHref} className="block">
      <Card className="transition-shadow hover:shadow-md cursor-pointer">
        {body}
      </Card>
    </Link>
  );
}
