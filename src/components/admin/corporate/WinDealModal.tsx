"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  type CorporateDeal,
  type DealWinRequest,
  type DiscountTier,
  type PaymentTerms,
  corporateApi,
  discountTierForCount,
  nairaFromKobo,
  previewProgramTotal,
} from "@/lib/corporate/api";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Props = {
  deal: CorporateDeal;
  isOpen: boolean;
  onClose: () => void;
  onWon: (programId: string) => void;
};

const TIER_OPTIONS: { value: DiscountTier; label: string }[] = [
  { value: "full_price", label: "Full price (1-4 employees, ₦150,000 each)" },
  { value: "bulk_5_9", label: "5-9 employees, ₦135,000 each (10% off)" },
  {
    value: "bulk_10_plus",
    label: "10+ employees, ₦127,500 each (15% off)",
  },
];

const PAYMENT_OPTIONS: { value: PaymentTerms; label: string }[] = [
  { value: "deposit_half", label: "50% deposit / 50% at week 6 (default)" },
  { value: "full_upfront", label: "Full upfront" },
  { value: "net_30", label: "Net 30" },
  { value: "net_60", label: "Net 60" },
  { value: "custom", label: "Custom (record manually)" },
];

export function WinDealModal({ deal, isOpen, onClose, onWon }: Props) {
  const initialCount = deal.expected_employees ?? 5;
  const [programName, setProgramName] = useState(
    `${deal.title} — corporate cohort`,
  );
  const [employeeCount, setEmployeeCount] = useState<number>(initialCount);
  const [tier, setTier] = useState<DiscountTier>(
    deal.expected_discount_tier ?? discountTierForCount(initialCount),
  );
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>("deposit_half");
  const [isPilot, setIsPilot] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Auto-adjust tier when employee_count changes (admin can still override).
  useEffect(() => {
    setTier(discountTierForCount(employeeCount));
  }, [employeeCount]);

  const totalKobo = useMemo(
    () => previewProgramTotal(employeeCount, tier),
    [employeeCount, tier],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programName.trim()) {
      toast.error("Program name is required");
      return;
    }
    if (employeeCount <= 0) {
      toast.error("Employee count must be > 0");
      return;
    }
    const payload: DealWinRequest = {
      program_name: programName.trim(),
      employee_count: employeeCount,
      discount_tier: tier,
      payment_terms: paymentTerms,
      is_pilot_partner: isPilot,
      expected_start_date: startDate || null,
      expected_end_date: endDate || null,
      notes: notes.trim() || null,
    };
    setSubmitting(true);
    try {
      const program = await corporateApi.winDeal(deal.id, payload);
      toast.success("Deal closed-won — program created");
      onWon(program.id);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to win deal";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Close deal as won">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-600">
          Marks <strong>{deal.title}</strong> as won and creates a draft
          CorporateProgram. Pricing comes from the discount tier × headcount —
          you can adjust on the program later.
        </p>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Program name
          </label>
          <input
            type="text"
            value={programName}
            onChange={(e) => setProgramName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Employee count
            </label>
            <input
              type="number"
              min={1}
              value={employeeCount}
              onChange={(e) => setEmployeeCount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Total (kobo auto)
            </label>
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono">
              {nairaFromKobo(totalKobo)}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Discount tier
          </label>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as DiscountTier)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
          >
            {TIER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Payment terms
          </label>
          <select
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value as PaymentTerms)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
          >
            {PAYMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Expected start
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Expected end
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPilot}
            onChange={(e) => setIsPilot(e.target.checked)}
          />
          <span>Pilot partner (first 5 corporate customers)</span>
        </label>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating program…" : "Close as won"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
