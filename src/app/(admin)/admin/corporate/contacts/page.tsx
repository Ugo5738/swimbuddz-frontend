"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import {
  type CompanyIndustry,
  type CompanySize,
  type ContactSource,
  type CorporateContact,
  corporateApi,
} from "@/lib/corporate/api";
import { Building2, ChevronRight, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const INDUSTRIES: CompanyIndustry[] = [
  "tech",
  "bank_finance",
  "consultancy",
  "telco",
  "mda_parastatal",
  "fmcg",
  "healthcare",
  "education",
  "ngo",
  "other",
];

const SIZES: CompanySize[] = ["under_50", "50_to_250", "250_to_1000", "over_1000"];

const SOURCES: ContactSource[] = [
  "cold_outbound",
  "warm_intro",
  "referral",
  "inbound_email",
  "inbound_web",
  "event",
  "other",
];

const PAGE_SIZE = 20;

function labelize(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ContactsListPage() {
  const [contacts, setContacts] = useState<CorporateContact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState<CompanyIndustry | "">("");
  const [size, setSize] = useState<CompanySize | "">("");
  const [source, setSource] = useState<ContactSource | "">("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: PAGE_SIZE,
        is_active: true,
        ...(search ? { search } : {}),
        ...(industry ? { industry } : {}),
        ...(size ? { company_size: size } : {}),
        ...(source ? { source } : {}),
      };
      const data = await corporateApi.listContacts(params);
      setContacts(data.items);
      setTotal(data.total);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load contacts";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page, search, industry, size, source]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, industry, size, source]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-600" />
            Corporate Contacts
          </h1>
          <p className="text-slate-500">
            Companies + HR contacts in the corporate wellness pipeline
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/corporate">
            <Button variant="outline">Pipeline</Button>
          </Link>
          <Link href="/admin/corporate/contacts/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add company
            </Button>
          </Link>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by company, contact name or email…"
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value as CompanyIndustry | "")}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
          >
            <option value="">All industries</option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {labelize(i)}
              </option>
            ))}
          </select>
          <select
            value={size}
            onChange={(e) => setSize(e.target.value as CompanySize | "")}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
          >
            <option value="">All sizes</option>
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {labelize(s)}
              </option>
            ))}
          </select>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as ContactSource | "")}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
          >
            <option value="">All sources</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {labelize(s)}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {loading && contacts.length === 0 ? (
        <LoadingCard text="Loading contacts…" />
      ) : contacts.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-slate-600">No contacts match these filters yet.</p>
          <Link href="/admin/corporate/contacts/new">
            <Button className="mt-4">Add the first company</Button>
          </Link>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Company</th>
                <th className="text-left px-4 py-2 font-medium">Industry</th>
                <th className="text-left px-4 py-2 font-medium">Primary contact</th>
                <th className="text-left px-4 py-2 font-medium">Source</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/corporate/contacts/${c.id}`}
                      className="font-medium text-slate-900 hover:text-indigo-700"
                    >
                      {c.company_name}
                    </Link>
                    {c.hq_location && (
                      <div className="text-xs text-slate-500 mt-0.5">{c.hq_location}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {c.industry ? labelize(c.industry) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-900">{c.primary_contact_name}</div>
                    <div className="text-xs text-slate-500">{c.primary_contact_email}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{labelize(c.source)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/corporate/contacts/${c.id}`}>
                      <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Page {page} of {totalPages} — {total} contact{total === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
