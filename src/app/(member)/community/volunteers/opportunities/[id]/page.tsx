"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import {
  TIER_SHORT_LABELS,
  VolunteersApi,
  type VolunteerOpportunity,
} from "@/lib/volunteers";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  MapPin,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [opp, setOpp] = useState<VolunteerOpportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    loadOpportunity();
  }, [id]);

  const loadOpportunity = async () => {
    try {
      const data = await VolunteersApi.getOpportunity(id);
      setOpp(data);
    } catch {
      setError("Failed to load opportunity details.");
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    setClaiming(true);
    setActionMsg(null);
    setError(null);
    try {
      const slot = await VolunteersApi.claimSlot(id);
      setHasClaimed(true);
      setActionMsg(
        slot.status === "approved"
          ? "You're confirmed! See you there."
          : "Your request has been submitted. An admin will review it.",
      );
      await loadOpportunity();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to claim slot.";
      setError(message);
    } finally {
      setClaiming(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    setActionMsg(null);
    setError(null);
    try {
      await VolunteersApi.cancelClaim(id);
      setHasClaimed(false);
      setActionMsg("Your claim has been cancelled.");
      await loadOpportunity();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to cancel claim.";
      setError(message);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <LoadingPage text="Loading opportunity..." />;
  if (!opp) {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <Alert variant="error">Opportunity not found.</Alert>
      </div>
    );
  }

  const slotsLeft = opp.slots_needed - opp.slots_filled;
  const isFull = slotsLeft <= 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4 md:py-8">
      {/* Back */}
      <Link
        href="/community/volunteers/opportunities"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to opportunities
      </Link>

      {/* Title + Status */}
      <div className="space-y-3">
        <div className="flex items-start gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-slate-900">{opp.title}</h1>
          <Badge
            variant={
              opp.status === "open"
                ? "success"
                : opp.status === "filled"
                  ? "warning"
                  : opp.status === "completed"
                    ? "default"
                    : "info"
            }
          >
            {opp.status.replace("_", " ")}
          </Badge>
        </div>
        {opp.role_title && <Badge variant="default">{opp.role_title}</Badge>}
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {actionMsg && <Alert variant="success">{actionMsg}</Alert>}

      {/* Details Card */}
      <Card className="space-y-4">
        {opp.description && <p className="text-slate-700">{opp.description}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>
              {new Date(opp.date).toLocaleDateString("en-NG", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>

          {opp.start_time && (
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span>
                {opp.start_time.slice(0, 5)}
                {opp.end_time && ` – ${opp.end_time.slice(0, 5)}`}
              </span>
            </div>
          )}

          {opp.location_name && (
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span>{opp.location_name}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-slate-600">
            <Users className="h-4 w-4 flex-shrink-0" />
            <span>
              {opp.slots_filled}/{opp.slots_needed} volunteers signed up
            </span>
          </div>
        </div>

        {/* Extra info */}
        <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
          {opp.min_tier !== "tier_1" && (
            <Badge variant="outline">
              Min tier: {TIER_SHORT_LABELS[opp.min_tier]}
            </Badge>
          )}
          {opp.opportunity_type === "approval_required" && (
            <Badge variant="warning">Requires admin approval</Badge>
          )}
          <Badge variant="outline">
            Cancel deadline: {opp.cancellation_deadline_hours}h before
          </Badge>
        </div>
      </Card>

      {/* Action */}
      {(opp.status === "open" || opp.status === "in_progress") && (
        <Card>
          {hasClaimed ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">
                  You&apos;ve signed up for this opportunity
                </span>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? "Cancelling..." : "Cancel My Spot"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-medium text-slate-900">
                  {isFull
                    ? "All slots are filled"
                    : `${slotsLeft} slot${slotsLeft > 1 ? "s" : ""} available`}
                </p>
                {!isFull && opp.opportunity_type === "approval_required" && (
                  <p className="text-sm text-slate-600 mt-1">
                    Your request will be reviewed by an admin before
                    confirmation.
                  </p>
                )}
              </div>
              <Button onClick={handleClaim} disabled={claiming || isFull}>
                {claiming
                  ? "Claiming..."
                  : isFull
                    ? "Full"
                    : opp.opportunity_type === "approval_required"
                      ? "Request to Join"
                      : "Claim Slot"}
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
