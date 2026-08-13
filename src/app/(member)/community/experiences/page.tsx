"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { useApi } from "@/hooks/useApi";
import { CommunityExperienceOffering } from "@/lib/clubOnboarding";
import { formatCurrency } from "@/lib/upgradeContext";
import { CalendarHeart } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CommunityExperiencesPage() {
  const router = useRouter();
  const experiences = useApi<CommunityExperienceOffering[]>(
    "/api/v1/clubs/community-experiences",
  );

  if (experiences.loading) return <LoadingCard text="Loading Community Experiences..." />;

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <header className="space-y-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
          <CalendarHeart className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Community Experiences</h1>
        <p className="text-slate-600">
          Optional quarterly get-togethers and community activities. Your exact eligible rate is
          calculated before payment.
        </p>
      </header>
      <Alert title="Transparent quarterly rates">
        Standard member: ₦50,000. Active Club member buying later: ₦40,000. Bought with the current
        Club quarter: ₦30,000.
      </Alert>
      {experiences.error ? <Alert variant="error">{experiences.error}</Alert> : null}
      <div className="space-y-4">
        {(experiences.data ?? []).map((experience) => (
          <Card key={experience.id} className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-900">{experience.name}</h2>
              <p className="text-sm text-slate-600">
                {experience.period_start} to {experience.period_end}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Standard rate {formatCurrency(experience.standard_member_fee_kobo / 100)}; Club rate
                is applied automatically where eligible.
              </p>
            </div>
            <Button
              onClick={() =>
                router.push(`/checkout?purpose=community_experience&offering_id=${experience.id}`)
              }
            >
              Review my price
            </Button>
          </Card>
        ))}
        {!experiences.data?.length ? <Card>No Community Experience is open right now.</Card> : null}
      </div>
    </div>
  );
}
