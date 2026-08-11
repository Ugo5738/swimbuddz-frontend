"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { useApi } from "@/hooks/useApi";
import {
  ChargePolicy,
  createChargePolicy,
  updateChargePolicy,
} from "@/lib/paymentCharges";
import { formatCurrency } from "@/lib/upgradeContext";
import { Plus, Power } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const paymentPurposes = [
  ["*", "All payment types"],
  ["club", "Club"],
  ["session_booking", "Session booking"],
  ["guest_pass", "Guest pass"],
  ["community", "Community membership"],
  ["academy_cohort", "Academy"],
] as const;

export default function PaymentChargesPage() {
  const policies = useApi<ChargePolicy[]>("/api/v1/payments/charges");
  const [form, setForm] = useState({
    purpose: "guest_pass",
    payment_method: "paystack",
    label: "Online payment processing",
    rate_percent: "1.5",
    fixed_naira: "100",
    cap_naira: "2000",
    waive_fixed_below_naira: "2500",
  });
  const [saving, setSaving] = useState(false);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createChargePolicy({
        purpose: form.purpose,
        payment_method: form.payment_method || null,
        label: form.label,
        rate_basis_points: Math.round(Number(form.rate_percent || 0) * 100),
        fixed_amount_kobo: Math.round(Number(form.fixed_naira || 0) * 100),
        cap_amount_kobo: form.cap_naira ? Math.round(Number(form.cap_naira) * 100) : null,
        waive_fixed_below_kobo: form.waive_fixed_below_naira
          ? Math.round(Number(form.waive_fixed_below_naira) * 100)
          : null,
        is_active: true,
      });
      policies.refetch();
      toast.success("Payment charge policy created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create policy");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (policy: ChargePolicy) => {
    try {
      await updateChargePolicy(policy.id, { is_active: !policy.is_active });
      policies.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update policy");
    }
  };

  if (policies.loading) return <LoadingCard text="Loading charge policies..." />;

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Additional payment charges</h1>
        <p className="mt-2 text-slate-600">
          Turn a charge on only for the payment types that should carry it. The server snapshots every
          applied line on the payment.
        </p>
      </header>

      <Alert title="Use the correct label">
        Paystack&apos;s processing fee is not the same as VAT. Use a transparent label such as
        “Online payment processing”; only use “VAT” when it is a separately valid tax charge.
      </Alert>
      {policies.error ? <Alert variant="error">{policies.error}</Alert> : null}

      <Card className="overflow-hidden p-0">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_auto] gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase text-slate-500">
          <span>Charge</span><span>Scope</span><span>Formula</span><span>Status</span>
        </div>
        {(policies.data ?? []).map((policy) => (
          <div key={policy.id} className="grid grid-cols-[1.2fr_1fr_1fr_auto] items-center gap-3 border-b border-slate-100 px-5 py-4 text-sm last:border-0">
            <span className="font-medium text-slate-900">{policy.label}</span>
            <span className="text-slate-600">{policy.purpose} · {policy.payment_method || "all methods"}</span>
            <span className="text-slate-600">
              {(policy.rate_basis_points / 100).toFixed(2)}% + {formatCurrency(policy.fixed_amount_kobo / 100)}
              {policy.cap_amount_kobo != null ? ` · capped ${formatCurrency(policy.cap_amount_kobo / 100)}` : ""}
            </span>
            <Button size="sm" variant={policy.is_active ? "primary" : "secondary"} onClick={() => void toggle(policy)}>
              <Power className="mr-1 h-4 w-4" />{policy.is_active ? "On" : "Off"}
            </Button>
          </div>
        ))}
        {!policies.data?.length ? <p className="p-6 text-sm text-slate-500">No additional charges are enabled.</p> : null}
      </Card>

      <Card>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Plus className="h-5 w-5" />Add policy</h2>
        <form onSubmit={create} className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium">Payment type
            <select value={form.purpose} onChange={(event) => setForm((current) => ({ ...current, purpose: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal">
              {paymentPurposes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm font-medium">Payment method
            <select value={form.payment_method} onChange={(event) => setForm((current) => ({ ...current, payment_method: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal"><option value="paystack">Paystack</option><option value="manual_transfer">Manual transfer</option><option value="">All methods</option></select>
          </label>
          <label className="space-y-1 text-sm font-medium sm:col-span-2">Customer-facing label<input required value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal" /></label>
          {([
            ["rate_percent", "Percentage (%)"],
            ["fixed_naira", "Fixed amount (₦)"],
            ["cap_naira", "Maximum charge (₦, optional)"],
            ["waive_fixed_below_naira", "Waive fixed part below (₦, optional)"],
          ] as const).map(([key, label]) => <label key={key} className="space-y-1 text-sm font-medium">{label}<input type="number" min="0" step="0.01" value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal" /></label>)}
          <Button type="submit" disabled={saving} className="sm:col-span-2">{saving ? "Saving..." : "Create charge policy"}</Button>
        </form>
      </Card>
    </div>
  );
}
