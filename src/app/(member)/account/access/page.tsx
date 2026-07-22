"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { apiGet } from "@/lib/api";
import type { MembershipTier, MembershipTierStatus } from "@/lib/tiers";
import { AlertCircle, ArrowLeft, CreditCard, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Member = {
  membership?: {
    paid_tier?: string | null;
    tier_statuses?: Partial<Record<MembershipTier, MembershipTierStatus>> | null;
  } | null;
};

const TIER_NAMES: Record<MembershipTier, string> = {
  community: "Community",
  club: "Club",
  academy: "Academy",
};

function safeReturnPath(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/account";
}

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function AccessRequiredPage() {
  const params = useSearchParams();
  const rawRequired = params.get("required")?.toLowerCase();
  const required: MembershipTier =
    rawRequired === "club" || rawRequired === "academy" ? rawRequired : "community";
  const returnTo = safeReturnPath(params.get("returnTo"));
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  // Upgrade flows span several pages and may not preserve query parameters.
  // Store the blocked destination here so a later successful payment can
  // still return the member to the feature they originally requested.
  useEffect(() => {
    sessionStorage.setItem("swimbuddz:membership-return-to", returnTo);
  }, [returnTo]);

  useEffect(() => {
    apiGet<Member>("/api/v1/members/me", { auth: true })
      .then(setMember)
      .finally(() => setLoading(false));
  }, []);

  const status = member?.membership?.tier_statuses?.[required];
  const lowerTier = member?.membership?.paid_tier;
  const expiry = formatDate(status?.paid_until || status?.effective_until);

  const action = useMemo(() => {
    const currentStatus = status?.status || params.get("status") || "inactive";
    if (currentStatus === "requested") {
      return { href: "/account/profile?upgrade=pending", label: "View upgrade request" };
    }
    if (["payment_pending", "approved_unpaid", "expired"].includes(currentStatus)) {
      return {
        href: `/account/billing?required=${required}&returnTo=${encodeURIComponent(returnTo)}`,
        label: currentStatus === "expired" ? `Renew ${TIER_NAMES[required]}` : "Complete payment",
      };
    }
    if (required === "club") {
      return {
        href: `/upgrade/club/plan?returnTo=${encodeURIComponent(returnTo)}`,
        label: "Upgrade to Club",
      };
    }
    if (required === "academy") {
      return {
        href: `/upgrade/academy/details?returnTo=${encodeURIComponent(returnTo)}`,
        label: "Explore Academy",
      };
    }
    return {
      href: `/account/billing?required=community&returnTo=${encodeURIComponent(returnTo)}`,
      label: "Activate Community",
    };
  }, [params, required, returnTo, status?.status]);

  if (loading) return <LoadingPage text="Checking your membership access..." />;

  const statusText =
    status?.status === "expired" && expiry
      ? `Your ${TIER_NAMES[required]} access ended on ${expiry}.`
      : status?.status === "payment_pending"
        ? `Your ${TIER_NAMES[required]} payment is still being confirmed.`
        : status?.status === "requested"
          ? `Your ${TIER_NAMES[required]} request is awaiting approval.`
          : `${TIER_NAMES[required]} access is required for this feature.`;

  const fallbackText =
    lowerTier && lowerTier !== "prospect" && lowerTier !== required
      ? `Your ${TIER_NAMES[lowerTier as MembershipTier] ?? lowerTier} membership remains active.`
      : null;

  return (
    <div className="mx-auto max-w-2xl space-y-5 py-6">
      <Card className="overflow-hidden border-amber-200">
        <div className="bg-amber-50 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <LockKeyhole className="h-6 w-6 text-amber-700" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            {TIER_NAMES[required]} access required
          </h1>
          <p className="mt-2 text-slate-700">{statusText}</p>
          {fallbackText && <p className="mt-1 text-sm text-emerald-700">{fallbackText}</p>}
        </div>

        <div className="space-y-4 p-6">
          <div className="flex gap-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <p>
              Your account and history are safe. Restore the required access and we&apos;ll return
              you to the page you tried to open.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href={action.href} className="flex-1">
              <Button className="w-full">
                <CreditCard className="mr-2 h-4 w-4" />
                {action.label}
              </Button>
            </Link>
            <Link href="/account" className="flex-1">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to dashboard
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
