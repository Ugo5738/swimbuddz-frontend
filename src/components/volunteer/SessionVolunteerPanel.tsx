"use client";

/**
 * "Volunteer at this session" panel surfaced on the session booking page
 * (and any other context where a member is deciding to attend something
 * that may have volunteer slots open).
 *
 * Behaviour:
 *
 *  - Fetches open volunteer opportunities tied to the given session_id /
 *    event_id when the component mounts. Also fetches the viewer's
 *    volunteer profile in parallel so we can tier-gate.
 *
 *  - Hides opportunities the member can't claim (their tier is below
 *    min_tier). If any opportunities were hidden, shows a single
 *    discreet "More roles unlock at Tier X" link instead of itemising
 *    them.
 *
 *  - Claim flow reuses the existing
 *    `POST /api/v1/volunteer/opportunities/{id}/claim` endpoint via
 *    `VolunteersApi.claimSlot`. Approval-required opportunities show a
 *    "Request" CTA; OPEN_CLAIM shows "Claim".
 *
 * See docs/design/VOLUNTEER_OPPORTUNITY_CONTEXT_DESIGN.md §A.
 */

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  TIER_LABELS,
  VolunteersApi,
  type VolunteerOpportunity,
  type VolunteerProfile,
  type VolunteerTier,
} from "@/lib/volunteers";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function formatError(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "string") return e;
  return fallback;
}

const TIER_ORDER: Record<VolunteerTier, number> = {
  tier_1: 1,
  tier_2: 2,
  tier_3: 3,
};

function tierAtOrBelow(memberTier: VolunteerTier, requiredTier: VolunteerTier) {
  return TIER_ORDER[memberTier] >= TIER_ORDER[requiredTier];
}

function nextTierLabel(currentTier: VolunteerTier): string | null {
  if (currentTier === "tier_1") return TIER_LABELS.tier_2;
  if (currentTier === "tier_2") return TIER_LABELS.tier_3;
  return null;
}

type Props = { sessionId: string; eventId?: never } | { sessionId?: never; eventId: string };

export function SessionVolunteerPanel(props: Props) {
  const [opportunities, setOpportunities] = useState<VolunteerOpportunity[] | null>(null);
  const [profile, setProfile] = useState<VolunteerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());
  const [hiddenAboveTier, setHiddenAboveTier] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [opps, prof] = await Promise.all([
          VolunteersApi.listOpportunities({
            status: "open",
            session_id: props.sessionId,
            event_id: props.eventId,
          }),
          // getMyProfile 404s for members without a volunteer profile —
          // treat that as "Tier 1 (default)" rather than failing the panel.
          VolunteersApi.getMyProfile().catch(() => null),
        ]);
        if (cancelled) return;
        setProfile(prof as VolunteerProfile | null);

        const memberTier: VolunteerTier = (prof as VolunteerProfile | null)?.tier ?? "tier_1";

        let hidden = 0;
        const visible = opps.filter((o) => {
          // Defensive: an opportunity that's already full has no point
          // being surfaced as a CTA.
          if (o.slots_filled >= o.slots_needed) return false;
          if (!tierAtOrBelow(memberTier, o.min_tier)) {
            hidden += 1;
            return false;
          }
          return true;
        });
        setHiddenAboveTier(hidden);
        setOpportunities(visible);
      } catch (e) {
        if (!cancelled) {
          // Don't toast — this panel is supplementary. Just hide it.
          console.error("Failed to load volunteer opportunities", e);
          setOpportunities([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.sessionId, props.eventId]);

  const handleClaim = async (opp: VolunteerOpportunity) => {
    setClaiming(opp.id);
    try {
      await VolunteersApi.claimSlot(opp.id);
      setClaimedIds((prev) => new Set(prev).add(opp.id));
      toast.success(
        opp.opportunity_type === "approval_required"
          ? "Request sent — an admin will review."
          : `You're signed up to volunteer as ${opp.role_title ?? "a volunteer"}.`
      );
    } catch (e) {
      toast.error(formatError(e, "Could not claim this volunteer slot."));
    } finally {
      setClaiming(null);
    }
  };

  // Loading state: render nothing rather than a flicker — this panel is
  // optional and the booking page should still be responsive.
  if (loading) return null;

  const hasAny = (opportunities?.length ?? 0) > 0;
  if (!hasAny && hiddenAboveTier === 0) return null;

  const memberTier: VolunteerTier = profile?.tier ?? "tier_1";
  const nextTier = nextTierLabel(memberTier);

  return (
    <Card className="p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Volunteer at this session</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Help out and rack up volunteer hours while you're here.
        </p>
      </div>

      {opportunities && opportunities.length > 0 ? (
        <ul className="space-y-3">
          {opportunities.map((opp) => {
            const filled = opp.slots_filled;
            const total = opp.slots_needed;
            const remaining = Math.max(total - filled, 0);
            const isApproval = opp.opportunity_type === "approval_required";
            const isClaimed = claimedIds.has(opp.id);
            return (
              <li
                key={opp.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-slate-900">{opp.role_title ?? opp.title}</p>
                    {opp.min_tier !== "tier_1" && (
                      <Badge variant="default">{TIER_LABELS[opp.min_tier]}</Badge>
                    )}
                  </div>
                  {opp.description && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{opp.description}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    {remaining} of {total} slot{total === 1 ? "" : "s"} open
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={isApproval ? "secondary" : "primary"}
                  onClick={() => handleClaim(opp)}
                  disabled={claiming === opp.id || isClaimed || remaining === 0}
                >
                  {isClaimed
                    ? isApproval
                      ? "Requested"
                      : "Signed up"
                    : claiming === opp.id
                      ? "Saving…"
                      : isApproval
                        ? "Request"
                        : "Claim"}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {hiddenAboveTier > 0 && nextTier ? (
        <p className="text-xs text-slate-400 text-center">
          {hiddenAboveTier} more role{hiddenAboveTier === 1 ? "" : "s"} unlock at {nextTier}.
        </p>
      ) : null}
    </Card>
  );
}
