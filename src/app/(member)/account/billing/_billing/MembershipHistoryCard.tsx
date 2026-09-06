import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

import type { MembershipHistory } from "../types";
import { formatDate } from "../utils";

type Props = {
  history: MembershipHistory | null;
};

const statusStyles: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  upcoming: "bg-cyan-50 text-cyan-700",
  expired: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-50 text-red-700",
};

export function MembershipHistoryCard({ history }: Props) {
  if (!history?.periods.length) return null;

  return (
    <Card className="space-y-4 p-4 md:p-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900 md:text-lg">Membership history</h2>
        <p className="mt-1 text-xs text-slate-600 md:text-sm">
          Your Annual Membership and Club coverage periods in one place.
        </p>
      </div>

      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        {history.periods.map((period) => (
          <div
            key={period.id}
            className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-slate-900">{period.label}</p>
              <p className="text-xs text-slate-500">
                {period.starts_at ? formatDate(period.starts_at) : "Start date not recorded"} –{" "}
                {period.ends_at ? formatDate(period.ends_at) : "Ongoing"}
                {period.dates_are_estimated ? " · approximate legacy start" : ""}
              </p>
              {period.payment_mode === "transition_per_session" ? (
                <p className="mt-1 text-xs text-cyan-700">Transition · pay per booked session</p>
              ) : null}
            </div>
            <span
              className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                statusStyles[period.status] ?? "bg-slate-100 text-slate-600"
              }`}
            >
              {period.status}
            </span>
          </div>
        ))}
      </div>

      {history.club_renewal_status === "due" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">
            Your Club access ended
            {history.club_renewal_due_at
              ? ` on ${formatDate(history.club_renewal_due_at)}`
              : ""}
            .
          </p>
          <p className="mt-1 text-amber-800">
            Your annual Membership can remain active even when a Club period ends. Start the Club
            flow again to choose a location and renew or rejoin.
          </p>
          <Link href="/upgrade/club/readiness" className="mt-3 inline-block">
            <Button size="sm">Renew or rejoin Club</Button>
          </Link>
        </div>
      ) : null}
    </Card>
  );
}
