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
import { Calendar, Eye, Link2, MapPin, Plus } from "lucide-react";
import Link from "next/link";

import { OppStatusBadge } from "../components";
import { formatDate } from "../utils";

type Props = {
  opportunities: VolunteerOpportunity[];
  onCreate: () => void;
  onPublish: (oppId: string) => void;
  onOpenSuggest: (opp: VolunteerOpportunity) => void;
};

export function OpportunitiesTab({ opportunities, onCreate, onPublish, onOpenSuggest }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={onCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Create Opportunity
        </Button>
      </div>

      {opportunities.length === 0 ? (
        <Card className="py-12 text-center">
          <Calendar className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">No opportunities created yet.</p>
          <Button className="mt-4" size="sm" onClick={onCreate}>
            Create your first opportunity
          </Button>
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="divide-y divide-slate-100 sm:hidden">
            {opportunities.map((opp) => {
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
                {opportunities.map((opp) => {
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
