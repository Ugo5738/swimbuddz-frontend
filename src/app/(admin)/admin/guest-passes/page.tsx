"use client";

import { GuestSessionAdminCard } from "@/components/guest-passes/GuestSessionAdminCard";
import { GuestLinkActions } from "@/components/guest-passes/GuestShareCard";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useApi } from "@/hooks/useApi";
import { apiGet, apiPost } from "@/lib/api";
import { GuestFunnel, GuestPassAdmin, markGuestPassAttendance } from "@/lib/guestPasses";
import type { MemberListItem } from "@/lib/members";
import type { Session } from "@/lib/sessions";
import { formatCurrency } from "@/lib/upgradeContext";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function PassCard({ pass, onSaved }: { pass: GuestPassAdmin; onSaved: () => void }) {
  const [minutes, setMinutes] = useState(String(pass.actual_swim_minutes ?? 120));
  const [assessment, setAssessment] = useState(String(pass.assessment_result?.summary ?? ""));
  const [sendEmail, setSendEmail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paymentLink, setPaymentLink] = useState("");
  const restore = async () => {
    setSaving(true);
    try {
      const result = await apiPost<{ url: string }>(
        `/api/v1/admin/guest-passes/${pass.id}/payment-link`,
        {},
        { auth: true }
      );
      setPaymentLink(result.url);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not restore payment");
    } finally {
      setSaving(false);
    }
  };
  const save = async () => {
    setSaving(true);
    try {
      await markGuestPassAttendance(pass.id, {
        actual_swim_minutes: Number(minutes),
        assessment_result: assessment.trim() ? { summary: assessment.trim() } : undefined,
        send_assessment_email: sendEmail,
      });
      onSaved();
      toast.success("Guest attendance saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not record attendance");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="font-semibold">{pass.full_name}</h2>
          <p className="text-sm text-slate-600">
            {pass.email} · {pass.phone}
          </p>
          <p className="break-all text-xs text-slate-500">
            {pass.payment_reference} · {pass.status.replaceAll("_", " ")} ·{" "}
            {formatCurrency(pass.total_kobo / 100)}
          </p>
        </div>
        <div className="text-xs text-slate-500">
          <p>
            {pass.booking_mode === "settlement" ? "Post-start settlement" : "Advance reservation"}
          </p>
          <p>{pass.marketing_consent ? "Updates opted in" : "Transactional email only"}</p>
        </div>
      </div>
      <div className="text-xs text-slate-600">
        <p>
          Source: {pass.booking_source || "direct"}
          {pass.campaign_key ? ` · Campaign: ${pass.campaign_key}` : ""}
        </p>
        <p>
          {pass.referral_code
            ? `Referrer code: ${pass.referral_code} · ${pass.referral_reward_bubbles} Bubbles · ${pass.referral_reward_status}`
            : "No member referral"}
        </p>
        {pass.confirmation_email_sent_at && (
          <p>
            Confirmation sent {new Date(pass.confirmation_email_sent_at).toLocaleString("en-NG")}
          </p>
        )}
      </div>
      {["pending_payment", "payment_failed"].includes(pass.status) && (
        <div className="space-y-3 border-t pt-3">
          <p className="text-sm text-slate-600">
            Restore payment on this existing guest booking. Before the swim this holds an available
            space for 30 minutes; afterward it settles payment without recording attendance.
          </p>
          <Button size="sm" disabled={saving} onClick={() => void restore()}>
            {saving ? "Restoring..." : "Restore guest payment link"}
          </Button>
          {paymentLink && <GuestLinkActions url={paymentLink} sessionId={pass.session_id} />}
        </div>
      )}
      {["confirmed", "attended"].includes(pass.status) && (
        <div className="space-y-3 border-t pt-3">
          <p className="text-sm font-medium">
            {pass.attended_at
              ? "Attendance recorded — update assessment or minutes"
              : "Confirm actual attendance"}
          </p>
          <label className="block text-sm">
            Swim minutes
            <input
              aria-label={`Swim minutes for ${pass.full_name}`}
              type="number"
              min={0}
              max={1440}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="ml-3 w-24 rounded border p-2"
            />
          </label>
          <label className="block text-sm">
            Assessment / next steps (optional)
            <textarea
              value={assessment}
              onChange={(e) => setAssessment(e.target.value)}
              maxLength={3000}
              rows={2}
              className="mt-1 w-full rounded border p-2"
            />
          </label>
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
            />
            Email this assessment to the guest
          </label>
          <Button
            size="sm"
            onClick={() => void save()}
            disabled={saving || minutes === "" || Number(minutes) < 0 || Number(minutes) > 1440}
          >
            {saving
              ? "Saving..."
              : pass.attended_at
                ? "Save attendance and assessment"
                : "Mark attended"}
          </Button>
        </div>
      )}
    </Card>
  );
}

export default function GuestPassesAdminPage() {
  const query = useSearchParams();
  const [selected, setSelected] = useState(query.get("session_id") || "");
  const [offset, setOffset] = useState(0);
  const sessions = useApi<Session[]>(
    `/api/v1/admin/sessions/guest-booking-options?offset=${offset}`
  );
  const members = useApi<MemberListItem[]>("/api/v1/members/?skip=0&limit=500");
  const passes = useApi<GuestPassAdmin[]>(
    `/api/v1/admin/guest-passes${selected ? `?session_id=${selected}` : ""}`
  );
  const funnel = useApi<GuestFunnel>(
    `/api/v1/admin/guest-passes/funnel${selected ? `?session_id=${selected}` : ""}`
  );
  const [referrer, setReferrer] = useState("");
  const [attributedLink, setAttributedLink] = useState("");
  const [generating, setGenerating] = useState(false);
  useEffect(() => {
    setAttributedLink("");
  }, [selected, referrer]);
  const generate = async () => {
    setGenerating(true);
    try {
      const result = await apiGet<{ url: string | null }>(
        `/api/v1/admin/sessions/${selected}/guest-share-link?referrer_auth_id=${encodeURIComponent(referrer)}`,
        { auth: true }
      );
      if (!result.url)
        throw new Error(
          "This swim needs an individual approval link or is closed to member invitations."
        );
      setAttributedLink(result.url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create invitation");
    } finally {
      setGenerating(false);
    }
  };
  return (
    <div className="mx-auto max-w-6xl space-y-6 py-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Guest passes</h1>
        <p className="mt-2 text-slate-600">
          Guest links, payments, attendance and follow-up for Community, Club and Academy swims.
        </p>
      </header>
      <Alert>
        Payment records a booking. Confirm actual attendance separately. The first qualifying paid
        attendance can grant the inviter a referral thank-you.
      </Alert>
      <Card className="space-y-4">
        <h2 className="font-semibold">Choose a swim</h2>
        <label className="block text-sm">
          Session
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="mt-1 block w-full rounded-lg border p-2.5"
          >
            <option value="">All guest bookings</option>
            {selected && !sessions.data?.some((s) => s.id === selected) && (
              <option value={selected}>Selected session</option>
            )}
            {sessions.data?.map((session) => (
              <option key={session.id} value={session.id}>
                {session.title} · {session.session_type.replaceAll("_", " ")} ·{" "}
                {new Date(session.starts_at).toLocaleDateString("en-NG")}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-slate-500">
          All eligible session types, including historical swims. Enable guest self-booking and an
          explicit guest price in the Session editor.
        </p>
        {sessions.loading && <p className="text-sm">Loading sessions...</p>}
        {sessions.error && <Alert variant="error">{sessions.error}</Alert>}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={!offset}
            onClick={() => setOffset(Math.max(0, offset - 100))}
          >
            Newer sessions
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={(sessions.data?.length ?? 0) < 100}
            onClick={() => setOffset(offset + 100)}
          >
            Older sessions
          </Button>
        </div>
      </Card>
      {selected && (
        <>
          <GuestSessionAdminCard key={selected} sessionId={selected} />
          <Card className="space-y-3">
            <h2 className="font-semibold">Attribute a member invitation</h2>
            <p className="text-sm text-slate-600">
              Choose a referrer only when this member made the introduction. Public, Instagram and
              admin links can have no inviter.
            </p>
            <label className="block text-sm">
              Inviting member
              <select
                value={referrer}
                onChange={(e) => setReferrer(e.target.value)}
                className="mt-1 block w-full rounded border p-2"
              >
                <option value="">Select a member</option>
                {members.data
                  ?.filter((m) => m.is_active && m.approval_status === "approved")
                  .map((m) => (
                    <option key={m.id} value={m.auth_id}>
                      {m.first_name} {m.last_name} · {m.email}
                    </option>
                  ))}
              </select>
            </label>
            {members.error && <Alert variant="error">{members.error}</Alert>}
            <Button size="sm" disabled={!referrer || generating} onClick={() => void generate()}>
              {generating ? "Creating..." : "Create member invitation"}
            </Button>
            {attributedLink && (
              <GuestLinkActions url={attributedLink} sessionId={selected} source="member_share" />
            )}
          </Card>
        </>
      )}
      {funnel.data && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Guest journey</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            {Object.entries(funnel.data).map(([key, value]) => (
              <div key={key}>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
                <p className="text-xs text-slate-500">{key.replaceAll("_", " ")}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Views and shares count link interactions, not unique people. Checkout onward counts
            guest bookings.
          </p>
        </Card>
      )}
      {passes.error && <Alert variant="error">{passes.error}</Alert>}
      {passes.loading && <p>Loading guest bookings...</p>}
      <div className="space-y-4">
        {passes.data?.map((pass) => (
          <PassCard
            key={pass.id}
            pass={pass}
            onSaved={() => {
              passes.refetch();
              funnel.refetch();
            }}
          />
        ))}
        {!passes.loading && !passes.data?.length && <Card>No guest bookings yet.</Card>}
      </div>
    </div>
  );
}
