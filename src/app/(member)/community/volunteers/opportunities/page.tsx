"use client";

import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { OpportunityCard } from "@/components/volunteers/OpportunityCard";
import {
  VolunteersApi,
  type VolunteerOpportunity,
  type VolunteerProfile,
  type VolunteerRole,
} from "@/lib/volunteers";
import { ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type RoleFilter = "all" | string;

export default function OpportunitiesListPage() {
  const [opportunities, setOpportunities] = useState<VolunteerOpportunity[]>(
    [],
  );
  const [roles, setRoles] = useState<VolunteerRole[]>([]);
  const [profile, setProfile] = useState<VolunteerProfile | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [opps, rolesData] = await Promise.all([
        VolunteersApi.listOpportunities(),
        VolunteersApi.listRoles(),
      ]);
      setOpportunities(opps);
      setRoles(rolesData);
      // Profile is optional — member may not yet be a registered volunteer.
      // Used only to decorate the cards with eligibility info.
      try {
        const p = await VolunteersApi.getMyProfile();
        setProfile(p);
      } catch {
        // not registered; cards just won't show eligibility chips
      }
    } catch {
      setError("Failed to load opportunities.");
    } finally {
      setLoading(false);
    }
  };

  const handleInlineClaim = async (oppId: string) => {
    setActionMsg(null);
    setError(null);
    if (!profile) {
      setError(
        "Join the volunteer team first to claim opportunities. Go to the Volunteer Hub.",
      );
      return;
    }
    setClaimingId(oppId);
    try {
      const slot = await VolunteersApi.claimSlot(oppId);
      setActionMsg(
        slot.status === "approved"
          ? "You're confirmed! See you there."
          : "Your request has been submitted.",
      );
      await loadData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to claim slot.";
      setError(message);
    } finally {
      setClaimingId(null);
    }
  };

  const filtered =
    roleFilter === "all"
      ? opportunities
      : opportunities.filter((o) => o.role_id === roleFilter);

  const roleFilterOptions = [
    { value: "all" as const, label: "All Roles" },
    ...roles.map((r) => ({ value: r.id, label: r.title })),
  ];

  if (loading) return <LoadingPage text="Loading opportunities..." />;

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-4 md:py-8">
      {/* Back + Header */}
      <div className="space-y-3">
        <Link
          href="/community/volunteers"
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Volunteer Hub
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
          Volunteer Opportunities
        </h1>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {actionMsg && <Alert variant="success">{actionMsg}</Alert>}

      {/* Role Filter */}
      {roles.length > 0 && (
        <FilterTabs
          options={roleFilterOptions}
          value={roleFilter}
          onChange={setRoleFilter}
          size="sm"
        />
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="py-12 text-center">
          <Calendar className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-3 text-slate-600">
            No open opportunities matching your filter.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((opp) => (
            <OpportunityCard
              key={opp.id}
              opp={opp}
              memberTier={profile?.tier ?? null}
              onClaim={handleInlineClaim}
              claiming={claimingId === opp.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
