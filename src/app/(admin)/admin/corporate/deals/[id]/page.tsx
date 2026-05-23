"use client";

import { LoseDealModal } from "@/components/admin/corporate/LoseDealModal";
import {
  DEAL_STAGES,
  DealStageBadge,
  dealStageLabel,
} from "@/components/admin/corporate/StatusBadges";
import { WinDealModal } from "@/components/admin/corporate/WinDealModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import {
  type CorporateContact,
  type CorporateDeal,
  type CorporateProgram,
  type CorporateTouchpoint,
  type DealStage,
  corporateApi,
  nairaFromKobo,
} from "@/lib/corporate/api";
import { ArrowLeft, Briefcase, CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

function labelize(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const NON_TERMINAL_STAGES: DealStage[] = DEAL_STAGES.filter((s) => s !== "won" && s !== "lost");

export default function DealDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const dealId = params.id;

  const [deal, setDeal] = useState<CorporateDeal | null>(null);
  const [contact, setContact] = useState<CorporateContact | null>(null);
  const [touchpoints, setTouchpoints] = useState<CorporateTouchpoint[]>([]);
  const [program, setProgram] = useState<CorporateProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [winOpen, setWinOpen] = useState(false);
  const [loseOpen, setLoseOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await corporateApi.getDeal(dealId);
      setDeal(d);
      const [c, tps, programsResp] = await Promise.all([
        corporateApi.getContact(d.contact_id),
        corporateApi.listTouchpoints(d.contact_id),
        d.stage === "won"
          ? corporateApi.listPrograms({
              contact_id: d.contact_id,
              page_size: 50,
            })
          : Promise.resolve(null),
      ]);
      setContact(c);
      setTouchpoints(tps.filter((t) => t.deal_id === dealId));
      if (programsResp) {
        const p = programsResp.items.find((x) => x.deal_id === dealId) ?? null;
        setProgram(p);
      } else {
        setProgram(null);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load deal";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    load();
  }, [load]);

  const advanceStage = async (newStage: DealStage) => {
    if (!deal) return;
    try {
      await corporateApi.updateDeal(deal.id, { stage: newStage });
      toast.success("Stage updated");
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  if (loading || !deal || !contact) {
    return <LoadingCard text="Loading deal…" />;
  }

  const isClosed = deal.stage === "won" || deal.stage === "lost";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/corporate/contacts/${contact.id}`}
          className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          {contact.company_name}
        </Link>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-indigo-600" />
            {deal.title}
          </h1>
          <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
            <DealStageBadge stage={deal.stage} />
            <span>
              opened {new Date(deal.created_at).toLocaleDateString()}
              {deal.actual_close_date && ` · closed ${deal.actual_close_date}`}
            </span>
          </p>
        </div>
        {!isClosed && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLoseOpen(true)}>
              <XCircle className="w-4 h-4 mr-1" />
              Mark lost
            </Button>
            <Button onClick={() => setWinOpen(true)}>
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Mark won
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
            Deal info
          </h2>
          <Row label="Expected employees" value={deal.expected_employees?.toString() ?? null} />
          <Row
            label="Expected total"
            value={deal.expected_total_kobo ? nairaFromKobo(deal.expected_total_kobo) : null}
          />
          <Row label="Expected close" value={deal.expected_close_date} />
          <Row label="Next action" value={deal.next_action} />
          <Row label="Due" value={deal.next_action_due} />
          <Row
            label="Last touch"
            value={deal.last_touch_at ? new Date(deal.last_touch_at).toLocaleString() : null}
          />
          {deal.lost_reason && <Row label="Lost reason" value={labelize(deal.lost_reason)} />}
          {deal.lost_notes && <Row label="Lost notes" value={deal.lost_notes} />}
          {deal.notes && (
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Notes</div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{deal.notes}</p>
            </div>
          )}
        </Card>

        <Card className="p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3">
            Quick stage move
          </h2>
          {isClosed ? (
            <p className="text-sm text-slate-500">This deal is closed and can't be moved.</p>
          ) : (
            <div className="space-y-1">
              {NON_TERMINAL_STAGES.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    if (s !== deal.stage) advanceStage(s);
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                    s === deal.stage
                      ? "bg-indigo-50 text-indigo-700 font-medium"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  {dealStageLabel(s)}
                </button>
              ))}
            </div>
          )}
          {program && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                Linked program
              </div>
              <Link
                href={`/admin/corporate/programs/${program.id}`}
                className="text-indigo-700 hover:underline text-sm inline-flex items-center"
              >
                {program.name}
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* Touchpoints filtered to this deal */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3">
          Touchpoints on this deal ({touchpoints.length})
        </h2>
        {touchpoints.length === 0 ? (
          <p className="text-sm text-slate-500">
            No touchpoints linked to this deal yet. Log them from the contact page, picking this
            deal in the form.
          </p>
        ) : (
          <ol className="space-y-2">
            {touchpoints.map((tp) => (
              <li key={tp.id} className="text-sm text-slate-700 border-l-2 border-slate-100 pl-3">
                <div className="text-xs text-slate-500">
                  {new Date(tp.occurred_at).toLocaleString()} · {labelize(tp.type)} ·{" "}
                  {labelize(tp.direction)}
                </div>
                {tp.summary && <div>{tp.summary}</div>}
              </li>
            ))}
          </ol>
        )}
      </Card>

      <WinDealModal
        deal={deal}
        isOpen={winOpen}
        onClose={() => setWinOpen(false)}
        onWon={(programId) => router.push(`/admin/corporate/programs/${programId}`)}
      />
      <LoseDealModal
        deal={deal}
        isOpen={loseOpen}
        onClose={() => setLoseOpen(false)}
        onLost={() => load()}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline gap-3">
      <div className="text-xs uppercase tracking-wide text-slate-500 w-36 flex-shrink-0">
        {label}
      </div>
      <div className="text-sm text-slate-900">
        {value || <span className="text-slate-400">—</span>}
      </div>
    </div>
  );
}
