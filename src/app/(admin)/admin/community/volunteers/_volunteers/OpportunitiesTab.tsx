"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import type { VolunteerOpportunity } from "@/lib/volunteers";
import { AlertCircle, Calendar, CheckCircle2, Eye, Link2, MapPin, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { OppStatusBadge } from "../components";
import { formatDate } from "../utils";

type Props = {
  opportunities: VolunteerOpportunity[];
  onCreate: () => void;
  onPublish: (oppId: string) => void;
  onOpenSuggest: (opp: VolunteerOpportunity) => void;
};

export function OpportunitiesTab({ opportunities, onCreate, onPublish, onOpenSuggest }: Props) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "draft" | "other">("all");
  const [attachmentFilter, setAttachmentFilter] = useState<"all" | "attached" | "unattached">(
    "all"
  );

  const counts = useMemo(
    () => ({
      open: opportunities.filter((opportunity) => opportunity.status === "open").length,
      draft: opportunities.filter((opportunity) => opportunity.status === "draft").length,
      unattached: opportunities.filter(
        (opportunity) => !opportunity.session_id && !opportunity.event_id
      ).length,
      openSlots: opportunities.reduce(
        (total, opportunity) =>
          opportunity.status === "open"
            ? total + Math.max(opportunity.slots_needed - opportunity.slots_filled, 0)
            : total,
        0
      ),
    }),
    [opportunities]
  );

  const visibleOpportunities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return [...opportunities]
      .filter((opportunity) => {
        if (
          normalizedQuery &&
          ![opportunity.title, opportunity.role_title, opportunity.location_name]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(normalizedQuery))
        ) {
          return false;
        }
        if (statusFilter === "open" && opportunity.status !== "open") return false;
        if (statusFilter === "draft" && opportunity.status !== "draft") return false;
        if (
          statusFilter === "other" &&
          (opportunity.status === "open" || opportunity.status === "draft")
        ) {
          return false;
        }
        const attached = Boolean(opportunity.session_id || opportunity.event_id);
        if (attachmentFilter === "attached" && !attached) return false;
        if (attachmentFilter === "unattached" && attached) return false;
        return true;
      })
      .sort((first, second) => first.date.localeCompare(second.date));
  }, [attachmentFilter, opportunities, query, statusFilter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Volunteer opportunities</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Publish roles members can claim, and attach session-specific work to the relevant
            booking page.
          </p>
        </div>
        <Button onClick={onCreate} className="flex shrink-0 items-center gap-2">
          <Plus className="h-4 w-4" /> New opportunity
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Visible now" value={counts.open} icon={<CheckCircle2 />} tone="green" />
        <SummaryCard label="Drafts" value={counts.draft} icon={<Calendar />} tone="slate" />
        <SummaryCard
          label="Needs attaching"
          value={counts.unattached}
          icon={<AlertCircle />}
          tone={counts.unattached > 0 ? "amber" : "slate"}
        />
        <SummaryCard label="Open slots" value={counts.openSlots} icon={<Plus />} tone="cyan" />
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_12rem_12rem]">
        <label className="relative block">
          <span className="sr-only">Search opportunities</span>
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, role, or location"
            className="h-10 w-full rounded-md border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
          />
        </label>
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
          className="h-10 rounded-md border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-cyan-500"
        >
          <option value="all">All statuses</option>
          <option value="open">Visible now</option>
          <option value="draft">Draft</option>
          <option value="other">Filled / completed</option>
        </select>
        <select
          aria-label="Filter by attachment"
          value={attachmentFilter}
          onChange={(event) => setAttachmentFilter(event.target.value as typeof attachmentFilter)}
          className="h-10 rounded-md border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-cyan-500"
        >
          <option value="all">All attachments</option>
          <option value="attached">Attached</option>
          <option value="unattached">Unattached</option>
        </select>
      </div>

      {visibleOpportunities.length === 0 ? (
        <Card className="py-12 text-center">
          <Calendar className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            {opportunities.length === 0
              ? "No opportunities created yet."
              : "No opportunities match these filters."}
          </p>
          {opportunities.length === 0 && (
            <Button className="mt-4" size="sm" onClick={onCreate}>
              Create your first opportunity
            </Button>
          )}
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="divide-y divide-slate-100 sm:hidden">
            {visibleOpportunities.map((opp) => {
              const isUnattached = !opp.session_id && !opp.event_id;
              return (
                <div key={opp.id} className="py-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-slate-900 text-sm">{opp.title}</h3>
                        <OppStatusBadge status={opp.status} />
                        {isUnattached && <Badge variant="default">Unattached</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>{formatDate(opp.date)}</span>
                        {opp.start_time && <span>{opp.start_time.slice(0, 5)}</span>}
                        {opp.location_name && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" />
                            {opp.location_name}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 text-xs">
                        <span className="text-slate-500">
                          {opp.slots_filled}/{opp.slots_needed} filled
                        </span>
                        {opp.role_title && <Badge variant="outline">{opp.role_title}</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {opp.status === "draft" && (
                      <Button size="sm" onClick={() => onPublish(opp.id)}>
                        Publish
                      </Button>
                    )}
                    {isUnattached && (
                      <Button size="sm" variant="secondary" onClick={() => onOpenSuggest(opp)}>
                        Find session
                      </Button>
                    )}
                    <Link href={`/admin/community/volunteers/opportunities/${opp.id}`}>
                      <Button size="sm" variant="secondary">
                        Manage
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Opportunity</TableHeaderCell>
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableHeaderCell>Role</TableHeaderCell>
                  <TableHeaderCell>Slots</TableHeaderCell>
                  <TableHeaderCell>Type</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell></TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleOpportunities.map((opp) => {
                  const isUnattached = !opp.session_id && !opp.event_id;
                  return (
                    <TableRow key={opp.id}>
                      <TableCell>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-slate-900">{opp.title}</p>
                            {isUnattached && (
                              <span title="Not attached to a session or event — members on the booking page won't see it.">
                                <Badge variant="default">Unattached</Badge>
                              </span>
                            )}
                          </div>
                          {opp.location_name && (
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" />
                              {opp.location_name}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{formatDate(opp.date)}</span>
                        {opp.start_time && (
                          <span className="text-xs text-slate-400 block">
                            {opp.start_time.slice(0, 5)}
                            {opp.end_time && ` – ${opp.end_time.slice(0, 5)}`}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {opp.role_title ? (
                          <Badge variant="outline">{opp.role_title}</Badge>
                        ) : (
                          <span className="text-xs text-slate-400">Any</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-medium ${
                            opp.slots_filled >= opp.slots_needed
                              ? "text-emerald-600"
                              : "text-slate-900"
                          }`}
                        >
                          {opp.slots_filled}/{opp.slots_needed}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-500">
                          {opp.opportunity_type === "approval_required" ? "Approval" : "Open"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <OppStatusBadge status={opp.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-end">
                          {opp.status === "draft" && (
                            <Button size="sm" onClick={() => onPublish(opp.id)}>
                              Publish
                            </Button>
                          )}
                          {isUnattached && (
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Find a matching session and attach this opportunity"
                              onClick={() => onOpenSuggest(opp)}
                            >
                              <Link2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Link href={`/admin/community/volunteers/opportunities/${opp.id}`}>
                            <Button size="sm" variant="ghost">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactElement<{ className?: string }>;
  tone: "green" | "amber" | "cyan" | "slate";
}) {
  const tones = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    cyan: "border-cyan-200 bg-cyan-50 text-cyan-700",
    slate: "border-slate-200 bg-slate-50 text-slate-600",
  };
  return (
    <div className={`rounded-xl border p-3 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">{label}</p>
        <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
