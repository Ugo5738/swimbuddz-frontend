"use client";

import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { useApi } from "@/hooks/useApi";
import { GuestPassReceipt } from "@/lib/guestPasses";
import { formatCurrency } from "@/lib/upgradeContext";
import { CheckCircle, Clock } from "lucide-react";
import { useParams } from "next/navigation";

export default function GuestPassReceiptPage() {
  const { guestPassId } = useParams<{ guestPassId: string }>();
  const receipt = useApi<GuestPassReceipt>(`/api/v1/guest-passes/${guestPassId}`, { auth: false });

  if (receipt.loading) return <LoadingCard text="Checking payment..." />;
  if (receipt.error || !receipt.data) return <Alert variant="error">{receipt.error || "Guest pass not found."}</Alert>;

  const confirmed = ["confirmed", "attended"].includes(receipt.data.status);
  return (
    <main className="mx-auto max-w-lg space-y-6 py-12 text-center">
      <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${confirmed ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-700"}`}>
        {confirmed ? <CheckCircle className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
      </div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{confirmed ? "Guest pass confirmed" : "Payment being confirmed"}</h1>
        <p className="mt-2 text-slate-600">A confirmation email is sent when payment clears.</p>
      </div>
      <Card className="space-y-3 text-left">
        <div className="flex justify-between"><span className="text-slate-600">Reference</span><span className="font-medium">{receipt.data.payment_reference}</span></div>
        <div className="flex justify-between"><span className="text-slate-600">Guest rate</span><span>{formatCurrency(receipt.data.price_kobo / 100)}</span></div>
        {receipt.data.additional_charges.map((charge) => <div key={charge.label} className="flex justify-between"><span className="text-slate-600">{charge.label}</span><span>{formatCurrency(charge.amount_kobo / 100)}</span></div>)}
        <div className="flex justify-between border-t border-slate-100 pt-3 font-bold"><span>Total</span><span>{formatCurrency(receipt.data.total_kobo / 100)}</span></div>
      </Card>
      {!confirmed ? <Alert>Refresh this page in a moment if you have completed payment.</Alert> : null}
    </main>
  );
}
