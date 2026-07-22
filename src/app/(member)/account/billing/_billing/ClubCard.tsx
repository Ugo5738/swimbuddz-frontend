import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

import type { Member } from "../types";
import { formatDate } from "../utils";

type Props = {
  member: Member | null;
  clubActive: boolean;
  communityActive: boolean;
};

export function ClubCard({ member, clubActive, communityActive }: Props) {
  if (clubActive) {
    const clubAccess = member?.membership?.tier_statuses?.club;
    const highestPaidTier = member?.membership?.highest_paid_tier || member?.membership?.paid_tier;
    const clubAccessUntil =
      clubAccess?.effective_until ||
      member?.membership?.club_paid_until ||
      member?.membership?.post_academy_club_until;
    const canRenewClub = highestPaidTier === "club";
    const accessDescription =
      clubAccess?.access_source === "post_academy"
        ? "Your complimentary post-Academy Club period is active."
        : clubAccess?.access_source === "academy"
          ? "Club access is included while your Academy entitlement is active."
          : "Your Club membership is active!";

    return (
      <Card className="p-4 md:p-6 space-y-3 md:space-y-4">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-slate-900">Club</h2>
          <p className="text-xs md:text-sm text-slate-600 mt-0.5 md:mt-1">
            Recurring membership for regular sessions with coaches.
          </p>
        </div>

        <dl className="space-y-1.5 md:space-y-2 text-sm">
          <div className="flex justify-between md:grid md:grid-cols-3 md:gap-2">
            <dt className="text-slate-600">Status</dt>
            <dd className="md:col-span-2 font-medium text-emerald-600">✓ Active</dd>
          </div>
          <div className="flex justify-between md:grid md:grid-cols-3 md:gap-2">
            <dt className="text-slate-600">Valid until</dt>
            <dd className="md:col-span-2 font-medium text-slate-900">
              {formatDate(clubAccessUntil)}
            </dd>
          </div>
        </dl>

        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 md:p-4 text-xs md:text-sm text-emerald-800">
          <p className="font-medium">{accessDescription}</p>
          <p className="mt-0.5 md:mt-1 text-emerald-600">
            You can book sessions and access all Club features.
          </p>
        </div>
        {canRenewClub && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link href="/upgrade/club/plan" className="block">
              <Button variant="outline" className="w-full sm:w-auto">
                {clubAccess?.access_source === "post_academy"
                  ? "Continue with Club"
                  : "Renew Club early"}
              </Button>
            </Link>
            <p className="text-xs text-slate-500">
              Your selected period starts after your current Club access ends.
            </p>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-4 md:p-6 space-y-3 md:space-y-4">
      <div>
        <h2 className="text-base md:text-lg font-semibold text-slate-900">Want to join Club?</h2>
        <p className="text-xs md:text-sm text-slate-600 mt-0.5 md:mt-1">
          Get access to regular swimming sessions with coaches. Pay quarterly, bi-annually, or
          annually.
        </p>
        {!communityActive && (
          <p className="text-xs md:text-sm text-emerald-700 mt-2 font-medium">
            Club includes Community access, so checkout will bundle both together.
          </p>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
        <Link href="/upgrade/club/readiness" className="block">
          <Button className="w-full sm:w-auto">
            {communityActive ? "Upgrade to Club" : "Join Club"}
          </Button>
        </Link>
        <Link
          href="/membership"
          className="text-sm text-cyan-600 hover:text-cyan-800 text-center sm:text-left"
        >
          How it works →
        </Link>
      </div>
    </Card>
  );
}
