"use client";

import { OutreachPanel } from "@/components/admin/corporate/OutreachPanel";
import { DealStageBadge, ProgramStatusBadge } from "@/components/admin/corporate/StatusBadges";
import { TouchpointsPanel } from "@/components/admin/corporate/TouchpointsPanel";
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
import { ArrowLeft, Building2, ChevronRight, Mail, MessageCircle, Phone, Plus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Tab = "details" | "deals" | "touchpoints" | "outreach" | "programs";

const DEAL_STAGES_FOR_CREATE: DealStage[] = [
  "lead",
  "contacted",
  "intro_scheduled",
  "intro_done",
  "proposal_sent",
  "negotiating",
];

function labelize(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ContactDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const contactId = params.id;

  const [tab, setTab] = useState<Tab>("details");
  const [contact, setContact] = useState<CorporateContact | null>(null);
  const [deals, setDeals] = useState<CorporateDeal[]>([]);
  const [touchpoints, setTouchpoints] = useState<CorporateTouchpoint[]>([]);
  const [programs, setPrograms] = useState<CorporateProgram[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, dealsResp, tps, programsResp] = await Promise.all([
        corporateApi.getContact(contactId),
        corporateApi.listDeals({ contact_id: contactId, page_size: 100 }),
        corporateApi.listTouchpoints(contactId),
        corporateApi.listPrograms({ contact_id: contactId, page_size: 50 }),
      ]);
      setContact(c);
      setDeals(dealsResp.items);
      setTouchpoints(tps);
      setPrograms(programsResp.items);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load contact";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDeactivate = async () => {
    if (!contact) return;
    if (
      !confirm(
        `Deactivate "${contact.company_name}"? Soft-deletes the contact; deals + programs are preserved.`
      )
    )
      return;
    try {
      await corporateApi.deleteContact(contact.id);
      toast.success("Contact deactivated");
      router.push("/admin/corporate/contacts");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  if (loading || !contact) {
    return <LoadingCard text="Loading contact…" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/corporate/contacts"
          className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          All contacts
        </Link>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-600" />
            {contact.company_name}
          </h1>
          <p className="text-slate-500 text-sm">
            {contact.industry ? labelize(contact.industry) : "—"} ·{" "}
            {contact.hq_location || "no location set"} · added{" "}
            {new Date(contact.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDeactivate}>
            Deactivate
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {(["details", "deals", "touchpoints", "outreach", "programs"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {t === "details"
              ? "Details"
              : t === "deals"
                ? `Deals (${deals.length})`
                : t === "touchpoints"
                  ? `Touchpoints (${touchpoints.length})`
                  : t === "outreach"
                    ? "Outreach"
                    : `Programs (${programs.length})`}
          </button>
        ))}
      </div>

      {tab === "details" && <DetailsTab contact={contact} />}
      {tab === "deals" && <DealsTab contactId={contactId} deals={deals} onChange={load} />}
      {tab === "touchpoints" && (
        <TouchpointsPanel
          contactId={contactId}
          deals={deals}
          touchpoints={touchpoints}
          onChange={load}
        />
      )}
      {tab === "outreach" && <OutreachPanel contactId={contactId} />}
      {tab === "programs" && <ProgramsTab programs={programs} />}
    </div>
  );
}

// ─── Details tab ────────────────────────────────────────────────────────

function DetailsTab({ contact }: { contact: CorporateContact }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Company</h2>
        <Row label="Website" value={contact.company_website} link />
        <Row label="Industry" value={contact.industry ? labelize(contact.industry) : null} />
        <Row label="Size" value={contact.company_size ? labelize(contact.company_size) : null} />
        <Row label="HQ" value={contact.hq_location} />
        <Row label="Source" value={labelize(contact.source)} />
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
          Primary contact
        </h2>
        <Row label="Name" value={contact.primary_contact_name} />
        <Row label="Role" value={contact.primary_contact_role} />
        <Row
          label="Email"
          value={contact.primary_contact_email}
          icon={<Mail className="w-3.5 h-3.5" />}
        />
        <Row
          label="Phone"
          value={contact.primary_contact_phone}
          icon={<Phone className="w-3.5 h-3.5" />}
        />
        <Row
          label="WhatsApp"
          value={contact.primary_contact_whatsapp}
          icon={<MessageCircle className="w-3.5 h-3.5" />}
        />
      </Card>

      {contact.notes && (
        <Card className="p-5 md:col-span-2">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-2">
            Notes
          </h2>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{contact.notes}</p>
        </Card>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  link,
  icon,
}: {
  label: string;
  value: string | null;
  link?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <div className="text-xs uppercase tracking-wide text-slate-500 w-24 flex-shrink-0">
        {label}
      </div>
      <div className="text-sm text-slate-900 flex items-center gap-1">
        {icon}
        {value ? (
          link && /^https?:/.test(value) ? (
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-700 hover:underline"
            >
              {value}
            </a>
          ) : (
            value
          )
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </div>
    </div>
  );
}

// ─── Deals tab ──────────────────────────────────────────────────────────

function DealsTab({
  contactId,
  deals,
  onChange,
}: {
  contactId: string;
  deals: CorporateDeal[];
  onChange: () => void;
}) {
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [stage, setStage] = useState<DealStage>("lead");
  const [employees, setEmployees] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title required");
    setSubmitting(true);
    try {
      await corporateApi.createDeal(contactId, {
        title: title.trim(),
        stage,
        expected_employees: employees === "" ? null : Number(employees),
      });
      toast.success("Deal opened");
      setShowNew(false);
      setTitle("");
      setStage("lead");
      setEmployees("");
      onChange();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowNew((s) => !s)}>
          <Plus className="w-4 h-4 mr-2" />
          New deal
        </Button>
      </div>

      {showNew && (
        <Card className="p-4">
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Q3 wellness cohort"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Stage</label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value as DealStage)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  {DEAL_STAGES_FOR_CREATE.map((s) => (
                    <option key={s} value={s}>
                      {labelize(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Expected employees
                </label>
                <input
                  type="number"
                  min={0}
                  value={employees}
                  onChange={(e) =>
                    setEmployees(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowNew(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Create deal"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {deals.length === 0 ? (
        <Card className="p-6 text-center text-sm text-slate-500">
          No deals yet. Open one when you start outreach.
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Deal</th>
                <th className="text-left px-4 py-2 font-medium">Stage</th>
                <th className="text-left px-4 py-2 font-medium">Employees</th>
                <th className="text-left px-4 py-2 font-medium">Expected total</th>
                <th className="text-left px-4 py-2 font-medium">Last touch</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/corporate/deals/${d.id}`}
                      className="font-medium text-slate-900 hover:text-indigo-700"
                    >
                      {d.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <DealStageBadge stage={d.stage} />
                  </td>
                  <td className="px-4 py-3 text-slate-700">{d.expected_employees ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {d.expected_total_kobo ? nairaFromKobo(d.expected_total_kobo) : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {d.last_touch_at ? new Date(d.last_touch_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/corporate/deals/${d.id}`}>
                      <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ─── Programs tab ───────────────────────────────────────────────────────

function ProgramsTab({ programs }: { programs: CorporateProgram[] }) {
  if (programs.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-slate-500">
        No sold programs yet. Programs appear here when a deal is won.
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {programs.map((p) => (
        <Link key={p.id} href={`/admin/corporate/programs/${p.id}`}>
          <Card className="p-4 hover:bg-slate-50 flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-900">{p.name}</div>
              <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-3">
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
  );
}
