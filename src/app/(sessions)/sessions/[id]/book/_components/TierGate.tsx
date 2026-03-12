import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { tierDisplayLabel } from "@/lib/sessionAccess";
import type { MembershipTier } from "@/lib/tiers";
import Link from "next/link";

type TierGateProps = {
  requiredTier: MembershipTier;
  memberTier: MembershipTier;
};

function getUpgradeHref(requiredTier: MembershipTier): string {
  if (requiredTier === "academy") return "/account/academy/browse";
  if (requiredTier === "club") return "/club";
  return "/community";
}

export function TierGate({ requiredTier, memberTier }: TierGateProps) {
  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <Card className="p-6 space-y-6 text-center">
        <Alert variant="info" title="Tier upgrade required">
          This is a {tierDisplayLabel(requiredTier)} session. Your current tier is{" "}
          {tierDisplayLabel(memberTier)}.
        </Alert>
        <div className="flex flex-col gap-3">
          <Link href={getUpgradeHref(requiredTier)}>
            <Button className="w-full">Upgrade to {tierDisplayLabel(requiredTier)}</Button>
          </Link>
          <Link href="/sessions">
            <Button variant="secondary" className="w-full">
              Back to Sessions
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
