import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

import type { Member } from "../types";
import { formatCurrency, formatDate } from "../utils";

type Props = {
  member: Member | null;
  communityActive: boolean;
  communityFee: number;
};

export function CommunityCard({ member, communityActive, communityFee }: Props) {
  return (
    <Card className="p-4 md:p-6 space-y-3 md:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-slate-900">Community</h2>
          <p className="text-xs md:text-sm text-slate-600 mt-0.5 md:mt-1">
            Annual membership that unlocks all member features.
          </p>
        </div>
        <span className="text-xs md:text-sm text-slate-500 font-medium">
          {formatCurrency(communityFee)}/year
        </span>
      </div>

      <dl className="space-y-1.5 md:space-y-2 text-sm">
        <div className="flex justify-between md:grid md:grid-cols-3 md:gap-2">
          <dt className="text-slate-600">Status</dt>
          <dd
            className={`md:col-span-2 font-medium ${communityActive ? "text-emerald-600" : "text-slate-500"}`}
          >
            {communityActive ? "✓ Active" : "Inactive"}
          </dd>
        </div>
        {communityActive && (
          <div className="flex justify-between md:grid md:grid-cols-3 md:gap-2">
            <dt className="text-slate-600">Valid until</dt>
            <dd className="md:col-span-2 font-medium text-slate-900">
              {formatDate(member?.membership?.community_paid_until)}
            </dd>
          </div>
        )}
      </dl>

      {communityActive ? (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 md:p-4 text-xs md:text-sm text-emerald-800">
          <p className="font-medium">Your Community membership is active!</p>
          <p className="mt-0.5 md:mt-1 text-emerald-600">
            You have full access to member features.
          </p>
        </div>
      ) : (
        <Link href="/checkout?purpose=community" className="block">
          <Button className="w-full sm:w-auto">
            Activate Community ({formatCurrency(communityFee)})
          </Button>
        </Link>
      )}
    </Card>
  );
}
