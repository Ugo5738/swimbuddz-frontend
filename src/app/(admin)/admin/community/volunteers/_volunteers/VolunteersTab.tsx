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
import type { VolunteerProfile } from "@/lib/volunteers";
import { Clock, Star, Users } from "lucide-react";

import { RecognitionBadge, ReliabilityText, TierBadge } from "../components";

type Props = {
  profiles: VolunteerProfile[];
  onOpenLogHours: (profile: VolunteerProfile) => void;
  onOpenFeature: (profile: VolunteerProfile) => void;
  onUnfeature: (memberId: string) => Promise<void>;
};

export function VolunteersTab({
  profiles,
  onOpenLogHours,
  onOpenFeature,
  onUnfeature,
}: Props) {
  if (profiles.length === 0) {
    return (
      <Card className="py-12 text-center">
        <Users className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 text-sm text-slate-500">No volunteers registered yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile cards */}
      <div className="divide-y divide-slate-100 sm:hidden">
        {profiles.map((p) => (
          <div key={p.id} className="py-4 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-slate-900 text-sm">{p.member_name || "Unknown"}</p>
              <TierBadge tier={p.tier} />
              {p.recognition_tier && <RecognitionBadge tier={p.recognition_tier} />}
              {p.is_featured && (
                <Badge variant="info">
                  <Star className="h-3 w-3 inline mr-0.5" /> Featured
                </Badge>
              )}
              {!p.is_active && <Badge variant="danger">Inactive</Badge>}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
              <span>{p.total_hours.toFixed(1)}h</span>
              <span>{p.total_sessions_volunteered} sessions</span>
              <ReliabilityText score={p.reliability_score} />
              {p.total_no_shows > 0 && (
                <span className="text-rose-500">
                  {p.total_no_shows} no-show
                  {p.total_no_shows !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {p.member_email && <p className="text-xs text-slate-400">{p.member_email}</p>}
            <div className="pt-1 flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onOpenLogHours(p)}
                className="text-xs"
              >
                <Clock className="h-3 w-3 mr-1" />
                Log Hours
              </Button>
              {p.is_featured ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onUnfeature(p.member_id)}
                  className="text-xs"
                >
                  <Star className="h-3 w-3 mr-1 fill-amber-400 text-amber-400" />
                  Unfeature
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onOpenFeature(p)}
                  className="text-xs"
                >
                  <Star className="h-3 w-3 mr-1" />
                  Feature
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Volunteer</TableHeaderCell>
              <TableHeaderCell>Tier</TableHeaderCell>
              <TableHeaderCell>Hours</TableHeaderCell>
              <TableHeaderCell>Sessions</TableHeaderCell>
              <TableHeaderCell>Reliability</TableHeaderCell>
              <TableHeaderCell>No-Shows</TableHeaderCell>
              <TableHeaderCell>Recognition</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {profiles.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="font-medium text-slate-900">{p.member_name || "Unknown"}</p>
                      {p.member_email && (
                        <p className="text-xs text-slate-400">{p.member_email}</p>
                      )}
                    </div>
                    {p.is_featured && (
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400 flex-shrink-0" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <TierBadge tier={p.tier} />
                </TableCell>
                <TableCell>
                  <span className="font-medium">{p.total_hours.toFixed(1)}</span>
                </TableCell>
                <TableCell>{p.total_sessions_volunteered}</TableCell>
                <TableCell>
                  <ReliabilityText score={p.reliability_score} />
                </TableCell>
                <TableCell>
                  {p.total_no_shows > 0 ? (
                    <span className="text-rose-600 font-medium">{p.total_no_shows}</span>
                  ) : (
                    <span className="text-slate-300">0</span>
                  )}
                </TableCell>
                <TableCell>
                  {p.recognition_tier ? (
                    <RecognitionBadge tier={p.recognition_tier} />
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => onOpenLogHours(p)}>
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      Log Hours
                    </Button>
                    {p.is_featured ? (
                      <Button size="sm" variant="ghost" onClick={() => onUnfeature(p.member_id)}>
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 mr-1" />
                        Unfeature
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => onOpenFeature(p)}>
                        <Star className="h-3.5 w-3.5 mr-1" />
                        Feature
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
