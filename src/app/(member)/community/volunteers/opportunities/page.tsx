"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import {
  VolunteersApi,
  type VolunteerOpportunity,
  type VolunteerRole,
} from "@/lib/volunteers";
import { ArrowLeft, Calendar, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type RoleFilter = "all" | string;

export default function OpportunitiesListPage() {
  const [opportunities, setOpportunities] = useState<VolunteerOpportunity[]>(
    [],
  );
  const [roles, setRoles] = useState<VolunteerRole[]>([]);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } catch {
      setError("Failed to load opportunities.");
    } finally {
      setLoading(false);
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
          {filtered.map((opp) => {
            const slotsLeft = opp.slots_needed - opp.slots_filled;
            return (
              <Link
                key={opp.id}
                href={`/community/volunteers/opportunities/${opp.id}`}
              >
                <Card className="transition-shadow hover:shadow-md cursor-pointer">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-start gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900">
                          {opp.title}
                        </h3>
                        {opp.role_title && (
                          <Badge variant="default">{opp.role_title}</Badge>
                        )}
                        {opp.opportunity_type === "approval_required" && (
                          <Badge variant="warning">Approval Required</Badge>
                        )}
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
                    <div className="flex-shrink-0 text-right">
                      <Badge
                        variant={
                          slotsLeft <= 0
                            ? "warning"
                            : slotsLeft <= 1
                              ? "info"
                              : "success"
                        }
                      >
                        {slotsLeft <= 0
                          ? "Full"
                          : `${slotsLeft} slot${slotsLeft > 1 ? "s" : ""} left`}
                      </Badge>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
