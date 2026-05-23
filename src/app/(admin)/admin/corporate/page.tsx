"use client";

import {
  DealStageBadge,
  ProgramStatusBadge,
  dealStageLabel,
} from "@/components/admin/corporate/StatusBadges";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import {
  type CorporateDeal,
  type CorporateProgram,
  type DealStage,
  corporateApi,
  nairaFromKobo,
} from "@/lib/corporate/api";
import { Briefcase, Building2, ChevronRight, Plus, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type DealsByStage = Record<DealStage, CorporateDeal[]>;

const emptyByStage = (): DealsByStage => ({
  lead: [],
  contacted: [],
  intro_scheduled: [],
  intro_done: [],
  proposal_sent: [],
  negotiating: [],
  won: [],
  lost: [],
});

export default function CorporateLandingPage() {
  const [dealsByStage, setDealsByStage] = useState<DealsByStage>(emptyByStage());
  const [activePrograms, setActivePrograms] = useState<CorporateProgram[]>([]);
  const [contactCount, setContactCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Pull recent deals (large page_size — sales pipelines stay small for now)
        const [dealsResp, programsResp, contactsResp] = await Promise.all([
          corporateApi.listDeals({ page: 1, page_size: 200 }),
          corporateApi.listPrograms({ page: 1, page_size: 50 }),
          corporateApi.listContacts({ page: 1, page_size: 1, is_active: true }),
        ]);
        if (cancelled) return;

        const grouped = emptyByStage();
        for (const deal of dealsResp.items) {
          grouped[deal.stage].push(deal);
        }
        setDealsByStage(grouped);
        setActivePrograms(
          programsResp.items.filter((p) => p.status === "active" || p.status === "ready")
        );
        setContactCount(contactsResp.total);
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to load pipeline";
        toast.error(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openStages: DealStage[] = [
    "lead",
    "contacted",
    "intro_scheduled",
    "intro_done",
    "proposal_sent",
    "negotiating",
  ];

  if (loading) {
    return <LoadingCard text="Loading corporate pipeline…" />;
  }

  const totalOpenDeals = openStages.reduce((n, stage) => n + dealsByStage[stage].length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-indigo-600" />
            Corporate Wellness
          </h1>
          <p className="text-slate-500">B2B sales pipeline + active employer programs</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/corporate/contacts">
            <Button variant="outline">
              <Building2 className="w-4 h-4 mr-2" />
              All contacts ({contactCount})
            </Button>
          </Link>
          <Link href="/admin/corporate/contacts/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add company
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryTile
          label="Open deals"
          value={totalOpenDeals}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <SummaryTile label="Won deals" value={dealsByStage.won.length} />
        <SummaryTile label="Active programs" value={activePrograms.length} />
        <SummaryTile label="Companies" value={contactCount} />
      </div>

      {/* Pipeline columns */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">Pipeline</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {openStages.map((stage) => (
            <StageColumn key={stage} stage={stage} deals={dealsByStage[stage]} />
          ))}
        </div>
      </div>

      {/* Active programs */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">Active &amp; ready programs</h2>
        {activePrograms.length === 0 ? (
          <Card className="p-6 text-center text-sm text-slate-500">
            No active programs yet. Wins from the pipeline appear here.
          </Card>
        ) : (
          <div className="space-y-2">
            {activePrograms.map((p) => (
              <Link key={p.id} href={`/admin/corporate/programs/${p.id}`} className="block">
                <Card className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-900">{p.name}</div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                      <span>{p.employee_count} employees</span>
                      <span>{nairaFromKobo(p.total_kobo)}</span>
                      {p.expected_start_date && <span>starts {p.expected_start_date}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ProgramStatusBadge status={p.status} />
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
    </Card>
  );
}

function StageColumn({ stage, deals }: { stage: DealStage; deals: CorporateDeal[] }) {
  return (
    <Card className="p-3 flex flex-col gap-2 min-h-[10rem]">
      <div className="flex items-center justify-between">
        <DealStageBadge stage={stage} />
        <span className="text-xs text-slate-500">{deals.length}</span>
      </div>
      {deals.length === 0 ? (
        <p className="text-xs text-slate-400 px-1 mt-2">No deals.</p>
      ) : (
        <ul className="space-y-2">
          {deals.slice(0, 6).map((deal) => (
            <li key={deal.id}>
              <Link
                href={`/admin/corporate/deals/${deal.id}`}
                className="block rounded border border-slate-100 p-2 hover:bg-slate-50 transition-colors"
              >
                <div className="text-sm font-medium text-slate-900 truncate">{deal.title}</div>
                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                  {deal.expected_employees != null && (
                    <span>{deal.expected_employees} employees</span>
                  )}
                  {deal.next_action_due && <span>due {deal.next_action_due}</span>}
                </div>
              </Link>
            </li>
          ))}
          {deals.length > 6 && (
            <li className="text-xs text-slate-500 px-1">
              + {deals.length - 6} more —{" "}
              <Link
                className="text-indigo-600 hover:underline"
                href={`/admin/corporate/contacts?stage=${stage}`}
              >
                see all
              </Link>
            </li>
          )}
        </ul>
      )}
      <p className="sr-only">{dealStageLabel(stage)}</p>
    </Card>
  );
}
