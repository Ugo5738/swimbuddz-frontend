"use client";

import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { OpportunityCard } from "@/components/volunteers/OpportunityCard";
import { useApi } from "@/hooks/useApi";
import {
  VolunteersApi,
  type VolunteerOpportunity,
  type VolunteerProfile,
  type VolunteerRole,
} from "@/lib/volunteers";
import { ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const PAGE_SIZE = 24;

export default function OpportunitiesListPage() {
  const [period, setPeriod] = useState<"upcoming" | "past">("upcoming");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const { data: roles } = useApi<VolunteerRole[]>("/api/v1/volunteers/roles");
  const { data: profile } = useApi<VolunteerProfile>("/api/v1/volunteers/profile/me");
  const query = new URLSearchParams({
    period,
    skip: String((page - 1) * PAGE_SIZE),
    limit: String(PAGE_SIZE + 1),
  });
  if (roleFilter !== "all") query.set("role_id", roleFilter);
  const {
    data: opportunities,
    loading,
    error,
    refetch,
  } = useApi<VolunteerOpportunity[]>(`/api/v1/volunteers/opportunities?${query}`);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("period") === "past") setPeriod("past");
  }, []);

  const claim = async (id: string) => {
    setActionMsg(null);
    setActionError(null);
    if (!profile) {
      setActionError("Join the volunteer team in the Volunteer Hub before claiming a slot.");
      return;
    }
    setClaimingId(id);
    try {
      const slot = await VolunteersApi.claimSlot(id);
      setActionMsg(
        slot.status === "approved"
          ? "You're confirmed! See you there."
          : "Your request has been submitted."
      );
      refetch();
    } catch (failure) {
      setActionError(failure instanceof Error ? failure.message : "Failed to claim slot.");
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-4 md:py-8">
      <div className="space-y-3">
        <Link
          href="/community/volunteers"
          className="inline-flex min-h-11 items-center gap-1 text-sm text-slate-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Volunteer Hub
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Volunteer opportunities</h1>
      </div>
      {(error || actionError) && (
        <Alert variant="error">
          {error || actionError}{" "}
          {error && (
            <button type="button" onClick={refetch} className="min-h-11 underline">
              Try again
            </button>
          )}
        </Alert>
      )}
      {actionMsg && <Alert variant="success">{actionMsg}</Alert>}
      <FilterTabs
        options={[
          { value: "upcoming", label: "Current opportunities" },
          { value: "past", label: "Past opportunities" },
        ]}
        value={period}
        onChange={(value) => {
          setPeriod(value);
          setPage(1);
        }}
      />
      {!!roles?.length && (
        <label className="block text-sm font-medium text-slate-700">
          Volunteer role
          <select
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value);
              setPage(1);
            }}
            className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 sm:max-w-sm"
          >
            <option value="all">All roles</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.title}
              </option>
            ))}
          </select>
        </label>
      )}
      {loading ? (
        <p role="status" className="py-8 text-center text-slate-500">
          Loading opportunities…
        </p>
      ) : !error && !opportunities?.length ? (
        <Card className="py-12 text-center">
          <Calendar className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-3 text-slate-600">
            No {period === "past" ? "past" : "current"} opportunities matching your filter.
          </p>
        </Card>
      ) : (
        !error && (
          <div className="space-y-4">
            {opportunities?.slice(0, PAGE_SIZE).map((opp) => (
              <OpportunityCard
                key={opp.id}
                opp={opp}
                memberTier={profile?.tier ?? null}
                onClaim={period === "upcoming" ? claim : undefined}
                claiming={claimingId === opp.id}
              />
            ))}
          </div>
        )
      )}
      {(page > 1 || (opportunities?.length ?? 0) > PAGE_SIZE) && (
        <nav aria-label="Opportunity pages" className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={loading || page === 1}
            onClick={() => setPage(page - 1)}
            className="min-h-11 rounded-lg border bg-white px-4 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm">Page {page}</span>
          <button
            type="button"
            disabled={loading || (opportunities?.length ?? 0) <= PAGE_SIZE}
            onClick={() => setPage(page + 1)}
            className="min-h-11 rounded-lg border bg-white px-4 disabled:opacity-40"
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
