"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  type CompanyIndustry,
  type CompanySize,
  type ContactSource,
  type CorporateContactCreate,
  corporateApi,
} from "@/lib/corporate/api";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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

function labelize(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function NewContactPage() {
  const router = useRouter();
  const [form, setForm] = useState<CorporateContactCreate>({
    company_name: "",
    primary_contact_name: "",
    primary_contact_email: "",
    source: "cold_outbound",
  });
  const [submitting, setSubmitting] = useState(false);

  const update = <K extends keyof CorporateContactCreate>(
    key: K,
    value: CorporateContactCreate[K]
  ) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_name.trim()) return toast.error("Company name required");
    if (!form.primary_contact_name.trim()) return toast.error("Primary contact name required");
    if (!form.primary_contact_email.trim()) return toast.error("Primary contact email required");

    setSubmitting(true);
    try {
      const contact = await corporateApi.createContact({
        ...form,
        company_name: form.company_name.trim(),
        primary_contact_name: form.primary_contact_name.trim(),
        primary_contact_email: form.primary_contact_email.trim(),
        company_website: form.company_website?.trim() || null,
        hq_location: form.hq_location?.trim() || null,
        primary_contact_role: form.primary_contact_role?.trim() || null,
        primary_contact_phone: form.primary_contact_phone?.trim() || null,
        primary_contact_whatsapp: form.primary_contact_whatsapp?.trim() || null,
        notes: form.notes?.trim() || null,
      });
      toast.success("Contact added");
      router.push(`/admin/corporate/contacts/${contact.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create";
      toast.error(message);
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href="/admin/corporate/contacts"
          className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to contacts
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Add a corporate contact</h1>
        <p className="text-slate-500 text-sm">
          A company + its primary HR / wellness contact. You can open a deal and log outreach
          touchpoints once it's saved.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Company</h2>
          <Field
            label="Company name *"
            value={form.company_name}
            onChange={(v) => update("company_name", v)}
            required
          />
          <Field
            label="Website"
            value={form.company_website ?? ""}
            onChange={(v) => update("company_website", v)}
            placeholder="https://acme.com"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SelectField
              label="Industry"
              value={form.industry ?? ""}
              options={["", ...INDUSTRIES]}
              onChange={(v) => update("industry", (v || null) as CompanyIndustry | null)}
            />
            <SelectField
              label="Company size"
              value={form.company_size ?? ""}
              options={["", ...SIZES]}
              onChange={(v) => update("company_size", (v || null) as CompanySize | null)}
            />
          </div>
          <Field
            label="HQ location"
            value={form.hq_location ?? ""}
            onChange={(v) => update("hq_location", v)}
            placeholder="Lekki, Lagos"
          />
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
            Primary contact (HR / wellness lead)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field
              label="Full name *"
              value={form.primary_contact_name}
              onChange={(v) => update("primary_contact_name", v)}
              required
            />
            <Field
              label="Role"
              value={form.primary_contact_role ?? ""}
              onChange={(v) => update("primary_contact_role", v)}
              placeholder="Head of People"
            />
          </div>
          <Field
            label="Email *"
            type="email"
            value={form.primary_contact_email}
            onChange={(v) => update("primary_contact_email", v)}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field
              label="Phone"
              value={form.primary_contact_phone ?? ""}
              onChange={(v) => update("primary_contact_phone", v)}
              placeholder="+234…"
            />
            <Field
              label="WhatsApp"
              value={form.primary_contact_whatsapp ?? ""}
              onChange={(v) => update("primary_contact_whatsapp", v)}
              placeholder="+234…"
            />
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
            Pipeline meta
          </h2>
          <SelectField
            label="Source"
            value={form.source ?? "cold_outbound"}
            options={SOURCES}
            onChange={(v) => update("source", v as ContactSource)}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => update("notes", e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="Anything useful about how we got here, who the champion is, etc."
            />
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Link href="/admin/corporate/contacts">
            <Button variant="ghost" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Create contact"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o ? labelize(o) : "—"}
          </option>
        ))}
      </select>
    </div>
  );
}
