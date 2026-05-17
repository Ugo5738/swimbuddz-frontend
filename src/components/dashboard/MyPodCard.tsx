/**
 * "Your pod" dashboard widget for Club members.
 *
 * Renders a compact summary of the member's current pod (handle, lead,
 * roster count, default schedule) and a call-to-action to browse the
 * public directory if they're not in one yet.
 *
 * See docs/club/POD_OPERATIONS.md.
 */

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDay, formatTime, podDisplayName, type PodSummary } from "@/lib/pods";
import { ArrowRight, Calendar, Clock, Users } from "lucide-react";
import Link from "next/link";

interface MyPodCardProps {
  /** The member's current pod, or null if not in one. */
  pod: PodSummary | null;
  /** Whether to show "browse pods" CTA when the user isn't in a pod. */
  showJoinCta?: boolean;
}

export function MyPodCard({ pod, showJoinCta = true }: MyPodCardProps) {
  if (!pod) {
    if (!showJoinCta) return null;
    return (
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900">Your pod</h2>
            <p className="mt-1 text-sm text-gray-600">
              You're not in a pod yet. Pods are 2–5 swimmer crews who train
              together every week with a Pod Lead.
            </p>
          </div>
          <Users className="h-5 w-5 flex-shrink-0 text-gray-300" />
        </div>
        <Link href="/account/pods" className="mt-4 inline-block">
          <Button size="sm">
            Browse pods
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-cyan-200">
      <div className="border-b border-cyan-100 bg-cyan-50 px-5 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-cyan-700">
          Your pod
        </p>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-cyan-900">
            {podDisplayName(pod)}
          </h2>
          {pod.visibility === "private" && <Badge variant="default">Private</Badge>}
        </div>
      </div>

      <div className="space-y-3 px-5 py-4 text-sm">
        <Row icon={Users} label="Crew">
          <span className="font-medium">
            {pod.active_member_count} of {pod.max_size}
          </span>{" "}
          swimmers
        </Row>

        <Row icon={Calendar} label="Default day">
          {formatDay(pod.default_session_day, true)}
        </Row>

        <Row icon={Clock} label="Default time">
          {formatTime(pod.default_session_time)}
          {" · "}
          {pod.default_session_duration_minutes} min
        </Row>

        <div className="pt-1">
          <Link
            href="/account/pods"
            className="inline-flex items-center gap-1 text-sm font-medium text-cyan-700 hover:text-cyan-900"
          >
            Browse other pods
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </Card>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
      <div className="flex-1">
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-gray-900">{children}</p>
      </div>
    </div>
  );
}
