"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { useApi } from "@/hooks/useApi";
import {
  buildGuestPassSharePath,
  getOrCreateGuestReferrerCode,
  GuestPassAdmin,
  markGuestPassAttendance,
} from "@/lib/guestPasses";
import { MemberListItem, MembersApi } from "@/lib/members";
import { Session, SessionsApi, SessionStatus, SessionType } from "@/lib/sessions";
import { formatCurrency } from "@/lib/upgradeContext";
import { Clock, Copy, Gift, Link2, Mail, UserCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function GuestPassesAdminPage() {
  const passes = useApi<GuestPassAdmin[]>("/api/v1/admin/guest-passes");
  const [minutes, setMinutes] = useState<Record<string, string>>({});
  const [sessions, setSessions] = useState<Session[]>([]);
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedReferrerAuthId, setSelectedReferrerAuthId] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [builderLoading, setBuilderLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      SessionsApi.listAllSessions({
        types: SessionType.CLUB,
        status: SessionStatus.SCHEDULED,
        from: new Date().toISOString(),
        auth: true,
      }),
      MembersApi.listMembers(0, 500),
    ])
      .then(([sessionRows, memberRows]) => {
        if (!active) return;
        const guestSessions = sessionRows
          .filter((session) => session.allows_guests)
          .sort(
            (left, right) =>
              new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime(),
          );
        const activeMembers = memberRows
          .filter(
            (member) => member.is_active && member.approval_status === "approved",
          )
          .sort((left, right) =>
            `${left.first_name} ${left.last_name}`.localeCompare(
              `${right.first_name} ${right.last_name}`,
            ),
          );
        setSessions(guestSessions);
        setMembers(activeMembers);
        setSelectedSessionId((current) => current || guestSessions[0]?.id || "");
      })
      .catch((error: unknown) => {
        if (!active) return;
        toast.error(
          error instanceof Error
            ? error.message
            : "Guest-link options could not be loaded",
        );
      })
      .finally(() => {
        if (active) setBuilderLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [selectedSessionId, sessions],
  );

  const clearGeneratedLink = () => setGeneratedLink("");

  const generateLink = async () => {
    if (!selectedSessionId) {
      toast.error("Choose a guest-enabled Club session first");
      return;
    }
    setGenerating(true);
    try {
      const referralCode = selectedReferrerAuthId
        ? (await getOrCreateGuestReferrerCode(selectedReferrerAuthId)).code
        : null;
      const path = buildGuestPassSharePath(selectedSessionId, referralCode);
      setGeneratedLink(new URL(path, window.location.origin).toString());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create guest link",
      );
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      toast.success("Guest self-payment link copied");
    } catch {
      toast.error("Could not copy the link. Select and copy it manually.");
    }
  };

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
        The first paid attendance automatically grants the referrer 10 Bubbles. Repeated swims do not create repeated acquisition rewards.
      </Alert>

      <Card className="border-cyan-100 bg-cyan-50/30">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-cyan-100 p-2 text-cyan-700">
            <Link2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Create a guest self-payment link</h2>
            <p className="mt-1 text-sm text-slate-600">
              The guest books and pays in their own name. Choose a referrer only when a member made the introduction; that member can receive the one-time 10-Bubble thank-you after attendance.
            </p>
          </div>
        </div>

        {builderLoading ? (
          <p className="mt-5 text-sm text-slate-500">Loading upcoming sessions and members...</p>
        ) : sessions.length === 0 ? (
          <Alert className="mt-5">
            There are no upcoming scheduled Club sessions accepting guests. Enable guests and set a guest price on the session first.
          </Alert>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Club session
              <select
                value={selectedSessionId}
                onChange={(event) => {
                  setSelectedSessionId(event.target.value);
                  clearGeneratedLink();
                }}
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
              >
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.title} · {new Date(session.starts_at).toLocaleString("en-NG", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              Referrer (optional)
              <select
                value={selectedReferrerAuthId}
                onChange={(event) => {
                  setSelectedReferrerAuthId(event.target.value);
                  clearGeneratedLink();
                }}
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
              >
                <option value="">No member referral</option>
                {members.map((member) => (
                  <option key={member.id} value={member.auth_id}>
                    {member.first_name} {member.last_name} · {member.email}
                  </option>
                ))}
              </select>
            </label>

            {selectedSession ? (
              <div className="rounded-xl border border-cyan-100 bg-white p-4 text-sm text-slate-600 md:col-span-2">
                <p className="font-medium text-slate-900">{selectedSession.location_name || "Location to be confirmed"}</p>
                <p className="mt-1">
                  Guest price: {formatCurrency(selectedSession.guest_fee ?? selectedSession.pool_fee)}
                  {selectedSession.community_dropin_fee != null
                    ? ` · Community drop-in: ${formatCurrency(selectedSession.community_dropin_fee)}`
                    : ""}
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 md:col-span-2">
              <Button onClick={() => void generateLink()} disabled={generating}>
                <Link2 className="mr-2 h-4 w-4" />
                {generating ? "Creating link..." : "Create link"}
              </Button>
              {generatedLink ? (
                <Button variant="secondary" onClick={() => void copyLink()}>
                  <Copy className="mr-2 h-4 w-4" />Copy link
                </Button>
              ) : null}
            </div>

            {generatedLink ? (
              <div className="md:col-span-2">
                <label htmlFor="generated-guest-link" className="text-sm font-medium text-slate-700">
                  Share this link with the guest
                </label>
                <input
                  id="generated-guest-link"
                  readOnly
                  value={generatedLink}
                  onFocus={(event) => event.currentTarget.select()}
                  className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
                />
              </div>
            ) : null}
          </div>
        )}
      </Card>

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
                    Code {pass.referral_code} · {pass.referral_reward_bubbles} Bubbles ·{" "}
                    {pass.referral_reward_status.replaceAll("_", " ")}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">No referral attribution</p>
                )}
                {pass.referral_reward_status === "pending" ? <p className="text-xs text-amber-700">Wallet delivery will retry when attendance is saved again.</p> : null}
              </div>
            </div>
          </Card>
        ))}
        {!passes.data?.length ? <Card className="text-center text-slate-500">No guest passes yet.</Card> : null}
      </div>
    </div>
  );
}
