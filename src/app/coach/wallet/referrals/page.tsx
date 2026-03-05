"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { AmbassadorBadge } from "@/components/wallet/AmbassadorBadge";
import { ReferralCodeCard } from "@/components/wallet/ReferralCodeCard";
import { apiGet } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { ArrowLeft, Gift, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

// ============================================================================
// Types — aligned with backend schemas
// ============================================================================

type ReferralCodeResponse = {
  code: string;
  share_link: string;
  share_text: string;
  is_active: boolean;
  uses_count: number;
  successful_referrals: number;
  max_uses: number | null;
  expires_at: string | null;
  created_at: string;
};

type ReferralStatsResponse = {
  total_referrals_sent: number;
  registered: number;
  qualified: number;
  rewarded: number;
  pending: number;
  total_bubbles_earned: number;
  is_ambassador: boolean;
  referrals_to_ambassador: number;
  max_referrals: number;
  remaining_referrals: number;
};

type ReferralHistoryItem = {
  id: string;
  referee_auth_id: string;
  referee_name?: string | null;
  status: string;
  referrer_reward_bubbles?: number | null;
  referee_reward_bubbles?: number | null;
  referral_code?: string | null;
  qualification_trigger?: string | null;
  referee_registered_at?: string | null;
  qualified_at?: string | null;
  rewarded_at?: string | null;
  created_at: string;
};

type AmbassadorStatusResponse = {
  is_ambassador: boolean;
  successful_referrals: number;
  referrals_to_ambassador: number;
  ambassador_since?: string | null;
  total_referral_bubbles_earned: number;
};

// ============================================================================
// Helpers
// ============================================================================

function referralStatusVariant(status: string) {
  switch (status) {
    case "rewarded":
    case "qualified":
      return "success" as const;
    case "registered":
      return "warning" as const;
    default:
      return "secondary" as const;
  }
}

function referralStatusLabel(status: string) {
  switch (status) {
    case "rewarded":
      return "Rewarded 🎉";
    case "qualified":
      return "Qualified";
    case "registered":
      return "Signed up";
    case "pending":
      return "Pending";
    default:
      return status;
  }
}

// ============================================================================
// Component
// ============================================================================

export default function CoachReferralHubPage() {
  const [code, setCode] = useState<ReferralCodeResponse | null>(null);
  const [stats, setStats] = useState<ReferralStatsResponse | null>(null);
  const [records, setRecords] = useState<ReferralHistoryItem[]>([]);
  const [ambassador, setAmbassador] = useState<AmbassadorStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        apiGet<ReferralCodeResponse>("/api/v1/wallet/referral/code", {
          auth: true,
        }),
        apiGet<ReferralStatsResponse>("/api/v1/wallet/referral/stats", {
          auth: true,
        }),
        apiGet<ReferralHistoryItem[]>("/api/v1/wallet/referral/history", {
          auth: true,
        }),
        apiGet<AmbassadorStatusResponse>("/api/v1/wallet/referral/ambassador", {
          auth: true,
        }),
      ]);

      if (results[0].status === "fulfilled") setCode(results[0].value);
      if (results[1].status === "fulfilled") setStats(results[1].value);
      if (results[2].status === "fulfilled") setRecords(results[2].value);
      if (results[3].status === "fulfilled") setAmbassador(results[3].value);
    } catch (e) {
      console.error("Failed to load referral data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <LoadingPage text="Loading referral hub..." />;
  }

  const shareUrl = code?.share_link ?? "";

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/coach/wallet">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Referrals</h1>
      </div>

      {code ? (
        <ReferralCodeCard code={code.code} shareUrl={shareUrl} />
      ) : (
        <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 p-6 text-center md:p-8">
          <Gift className="mx-auto mb-3 h-12 w-12 text-cyan-500" />
          <h2 className="mb-2 text-lg font-semibold text-slate-900">Start Earning Bubbles</h2>
          <p className="mx-auto mb-4 max-w-md text-sm text-slate-600">
            Share your referral code with friends. When they join SwimBuddz, you both earn Bubbles!
          </p>
          <p className="text-sm text-slate-500">
            Your referral code will appear here once your wallet is set up.
          </p>
        </Card>
      )}

      {stats && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className="p-3 text-center md:p-4">
            <p className="text-xs text-slate-500">Total Referrals</p>
            <p className="text-lg font-semibold text-slate-900">{stats.total_referrals_sent}</p>
          </Card>
          <Card className="p-3 text-center md:p-4">
            <p className="text-xs text-slate-500">Successful</p>
            <p className="text-lg font-semibold text-emerald-600">{stats.rewarded}</p>
          </Card>
          <Card className="p-3 text-center md:p-4">
            <p className="text-xs text-slate-500">Bubbles Earned</p>
            <p className="text-lg font-semibold text-cyan-600">{stats.total_bubbles_earned} 🫧</p>
          </Card>
        </div>
      )}

      {ambassador && (
        <AmbassadorBadge
          isAmbassador={ambassador.is_ambassador}
          ambassadorSince={ambassador.ambassador_since}
          referralCount={ambassador.successful_referrals}
        />
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Your Referrals</h2>
        {records.length === 0 ? (
          <Card className="border-dashed bg-slate-50 p-6 text-center">
            <Users className="mx-auto mb-2 h-8 w-8 text-slate-400" />
            <p className="text-slate-600">Share your code to start earning Bubbles!</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {records.map((record) => (
              <Card key={record.id} className="p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="shrink-0 rounded-full bg-blue-100 p-2">
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {record.referee_name || "Invited Friend"}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <Badge variant={referralStatusVariant(record.status)}>
                          {referralStatusLabel(record.status)}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {formatDate(
                            record.rewarded_at ||
                              record.qualified_at ||
                              record.referee_registered_at ||
                              record.created_at
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  {record.referrer_reward_bubbles != null && record.referrer_reward_bubbles > 0 && (
                    <span className="inline-flex shrink-0 items-center rounded-lg bg-emerald-100 px-2.5 py-1 text-sm font-bold text-emerald-700">
                      +{record.referrer_reward_bubbles} 🫧
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
