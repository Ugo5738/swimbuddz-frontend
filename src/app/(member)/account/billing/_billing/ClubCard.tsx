import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

import type { Member, MembershipHistory } from "../types";
import { formatDate } from "../utils";

type Props = {
  member: Member | null;
  clubActive: boolean;
  communityActive: boolean;
  history?: MembershipHistory | null;
};

export function ClubCard({ member, clubActive, communityActive, history }: Props) {
  if (!clubActive && history?.club_renewal_status === "upcoming") {
    const nextPeriod = [...history.periods]
      .filter((period) => period.product === "club" && period.status === "upcoming")
      .sort((left, right) => (left.starts_at ?? "").localeCompare(right.starts_at ?? ""))[0];
    return (
      <Card className="space-y-3 p-4 md:p-6">
        <h2 className="text-base font-semibold text-slate-900 md:text-lg">Your next Club period is booked</h2>
        <p className="text-sm text-slate-600">
          {nextPeriod?.starts_at ? `Club access starts on ${formatDate(nextPeriod.starts_at)}.` : "Your Club access starts in the upcoming period."}
          {" "}Your prepaid period does not include sessions before its start date.
        </p>
      </Card>
    );
  }
  if (clubActive) {
    const clubAccess = member?.membership?.tier_statuses?.club;
    const highestPaidTier = member?.membership?.highest_paid_tier || member?.membership?.paid_tier;
    const clubAccessUntil =
      clubAccess?.effective_until ||
      member?.membership?.club_enrollment_until ||
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
              Review the available quarters and their coverage dates before paying.
            </p>
          </div>
        )}
      </Card>
    );
  }

  const formerClubMember =
    history?.club_action === "renew" ||
    member?.membership?.declared_tiers?.includes("club") ||
    Boolean(
      member?.membership?.club_paid_until || member?.membership?.post_academy_club_until
    );
  const previousClubEnd =
    history?.club_renewal_due_at ||
    member?.membership?.club_paid_until ||
    member?.membership?.post_academy_club_until;

  return (
    <Card className="p-4 md:p-6 space-y-3 md:space-y-4">
      <div>
        <h2 className="text-base md:text-lg font-semibold text-slate-900">
          {formerClubMember ? "Your Club access ended" : "Want to join Club?"}
        </h2>
        <p className="text-xs md:text-sm text-slate-600 mt-0.5 md:mt-1">
          {formerClubMember && previousClubEnd
            ? `Your previous Club period ended on ${formatDate(previousClubEnd)}. Choose a location to renew or rejoin.`
            : "Choose a location-priced quarter for structured practice, pods and progress tracking."}
        </p>
        {!communityActive && (
          <p className="text-xs md:text-sm text-emerald-700 mt-2 font-medium">
            If your annual SwimBuddz membership is due, checkout will show it as a separate line.
          </p>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
        <Link href="/upgrade/club/readiness" className="block">
          <Button className="w-full sm:w-auto">
            {formerClubMember
              ? "Renew or rejoin Club"
              : communityActive
                ? "Upgrade to Club"
                : "Join Club"}
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
