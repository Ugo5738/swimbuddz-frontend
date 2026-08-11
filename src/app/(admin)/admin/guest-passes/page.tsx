"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { useApi } from "@/hooks/useApi";
import {
  GuestPassAdmin,
  markGuestPassAttendance,
  markGuestRewardPaid,
} from "@/lib/guestPasses";
import { formatCurrency } from "@/lib/upgradeContext";
import { Clock, Gift, Mail, UserCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function GuestPassesAdminPage() {
  const passes = useApi<GuestPassAdmin[]>("/api/v1/admin/guest-passes");
  const [minutes, setMinutes] = useState<Record<string, string>>({});

  const attend = async (pass: GuestPassAdmin) => {
    try {
      await markGuestPassAttendance(pass.id, {
        actual_swim_minutes: Number(minutes[pass.id] || 120),
        send_assessment_email: false,
      });
      passes.refetch();
      toast.success("Guest attendance and swimmer-hours recorded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record attendance");
    }
  };

  const payReward = async (pass: GuestPassAdmin) => {
    const reference = window.prompt("Enter the bank transfer or payment reference");
    if (!reference) return;
    try {
      await markGuestRewardPaid(pass.id, reference);
      passes.refetch();
      toast.success("Referral thank-you marked paid");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update reward");
    }
  };

  if (passes.loading) return <LoadingCard text="Loading guest passes..." />;

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Guest passes</h1>
        <p className="mt-2 text-slate-600">
          Track self-paying guests, swimmer-hours, marketing consent, assessments, and first-attendance referral thank-yous.
        </p>
      </header>
      {passes.error ? <Alert variant="error">{passes.error}</Alert> : null}
      <Alert>
        A referral reward becomes eligible only after the guest&apos;s first paid attendance. Repeated swims do not create repeated acquisition rewards.
      </Alert>

      <div className="space-y-4">
        {(passes.data ?? []).map((pass) => (
          <Card key={pass.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-slate-900">{pass.full_name}</h2>
                <p className="mt-1 flex items-center gap-2 text-sm text-slate-600"><Mail className="h-4 w-4" />{pass.email} · {pass.phone}</p>
                <p className="mt-1 text-xs text-slate-500">{pass.payment_reference} · {pass.status.replaceAll("_", " ")} · {formatCurrency(pass.total_kobo / 100)}</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${pass.marketing_consent ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                {pass.marketing_consent ? "Updates opted in" : "Transactional email only"}
              </span>
            </div>

            <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-sm font-medium text-slate-800"><Clock className="h-4 w-4" />Swimmer-hours</p>
                {pass.attended_at ? (
                  <p className="text-sm text-slate-600">Recorded: {pass.actual_swim_minutes || 0} minutes ({((pass.actual_swim_minutes || 0) / 60).toFixed(1)} hours)</p>
                ) : (
                  <div className="flex gap-2"><input type="number" min="0" value={minutes[pass.id] || "120"} onChange={(event) => setMinutes((current) => ({ ...current, [pass.id]: event.target.value }))} className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm" /><Button size="sm" onClick={() => void attend(pass)} disabled={pass.status !== "confirmed"}><UserCheck className="mr-1 h-4 w-4" />Mark attended</Button></div>
                )}
              </div>
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-sm font-medium text-slate-800"><Gift className="h-4 w-4" />Referral thank-you</p>
                {pass.referral_code ? (
                  <p className="text-sm text-slate-600" title={pass.referrer_auth_id || undefined}>
                    Code {pass.referral_code} · {formatCurrency(pass.referral_reward_kobo / 100)} ·{" "}
                    {pass.referral_reward_status.replaceAll("_", " ")}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">No referral attribution</p>
                )}
                {pass.referral_reward_status === "eligible" ? <Button size="sm" variant="secondary" onClick={() => void payReward(pass)}>Record manual transfer</Button> : null}
                {pass.referral_reward_reference ? <p className="text-xs text-slate-500">Transfer: {pass.referral_reward_reference}</p> : null}
              </div>
            </div>
          </Card>
        ))}
        {!passes.data?.length ? <Card className="text-center text-slate-500">No guest passes yet.</Card> : null}
      </div>
    </div>
  );
}
