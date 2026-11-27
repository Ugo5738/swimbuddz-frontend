"use client";

import { Alert } from "@/components/ui/Alert";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { ConsistencyCommunityStrip } from "@/components/scorecard/ConsistencyCommunityStrip";
import { PerformanceBenchmarksSection } from "@/components/scorecard/PerformanceBenchmarksSection";
import { PrivacyShareModal } from "@/components/scorecard/PrivacyShareModal";
import { ScorecardOverviewHero } from "@/components/scorecard/ScorecardOverviewHero";
import { SkillsMatrixSection } from "@/components/scorecard/SkillsMatrixSection";
import {
  fetchMyScorecard,
  type MemberScorecard,
  type ScorecardSettings,
} from "@/lib/scorecard";
import { useCallback, useEffect, useState } from "react";

export default function MemberScorecardPage() {
  const [scorecard, setScorecard] = useState<MemberScorecard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const loadScorecard = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchMyScorecard();
      setScorecard(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your Swim Scorecard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadScorecard();
  }, [loadScorecard]);

  if (loading) {
    return <LoadingCard text="Loading your Swim Scorecard…" />;
  }

  if (error || !scorecard) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Swim Scorecard</h1>
        <Alert variant="error">{error || "Swim Scorecard could not be loaded."}</Alert>
      </div>
    );
  }

  const handleSettingsUpdated = (updated: ScorecardSettings) => {
    setScorecard((prev) => (prev ? { ...prev, settings: updated } : prev));
  };

  return (
    <div className="space-y-8">
      <ScorecardOverviewHero
        scorecard={scorecard}
        onOpenPrivacyModal={() => setPrivacyOpen(true)}
      />

      <SkillsMatrixSection
        memberId={scorecard.member_id}
        domains={scorecard.domains}
        canEditSelf={scorecard.can_edit_self}
        canVerify={false}
        hasClubAccess={scorecard.has_club_access}
        onUpdated={loadScorecard}
      />

      <PerformanceBenchmarksSection
        memberId={scorecard.member_id}
        hasFullPerformanceAccess={scorecard.has_full_performance_access}
        canEditSelf={scorecard.can_edit_self}
        canVerify={false}
        preferredPoolLengthM={scorecard.settings?.preferred_pool_length_m}
        personalBests={scorecard.personal_bests}
        benchmarks={scorecard.benchmarks}
        trends={scorecard.trends}
        strokelab={scorecard.strokelab}
        onUpdated={loadScorecard}
      />

      <ConsistencyCommunityStrip
        academy={scorecard.academy}
        consistency={scorecard.consistency}
        showReportsLink={true}
      />

      {scorecard.settings && (
        <PrivacyShareModal
          isOpen={privacyOpen}
          onClose={() => setPrivacyOpen(false)}
          settings={scorecard.settings}
          onUpdated={handleSettingsUpdated}
        />
      )}
    </div>
  );
}
