"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useApi } from "@/hooks/useApi";
import { apiDelete, apiPost } from "@/lib/api";
import { buildGuestPassSharePath, GuestPassOffer, isGuestShareEnabled } from "@/lib/guestPasses";
import type { Session } from "@/lib/sessions";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { GuestLinkActions } from "./GuestShareCard";

export function GuestSessionAdminCard({ sessionId }: { sessionId: string }) {
  const session = useApi<Session>(`/api/v1/sessions/${sessionId}`);
  const publicOffer = useApi<GuestPassOffer>(
    session.data?.guest_booking_mode === "public"
      ? `/api/v1/sessions/${sessionId}/guest-pass`
      : null,
    { auth: false }
  );
  const [source, setSource] = useState("admin_share");
  const [campaign, setCampaign] = useState("");
  const [email, setEmail] = useState("");
  const [issued, setIssued] = useState<{ id: string; url: string; expires_at: string } | null>(
    null
  );
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const createApproval = async () => {
    setBusy(true);
    try {
      setIssued(
        await apiPost<{ id: string; url: string; expires_at: string }>(
          `/api/v1/admin/sessions/${sessionId}/guest-booking-links`,
          { email, expires_in_hours: 72 },
          { auth: true }
        )
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create guest link");
    } finally {
      setBusy(false);
    }
  };
  const revoke = async () => {
    if (!issued) return;
    setBusy(true);
    try {
      await apiDelete(`/api/v1/admin/guest-booking-links/${issued.id}`, { auth: true });
      setIssued(null);
      toast.success("Individual guest link revoked");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not revoke this link");
    } finally {
      setBusy(false);
    }
  };
  if (session.loading) return null;
  if (session.error)
    return (
      <p className="text-sm text-rose-700">
        Guest link unavailable.{" "}
        <button type="button" onClick={session.refetch} className="underline">
          Retry
        </button>
      </p>
    );
  const swim = session.data;
  if (!swim || !isGuestShareEnabled(swim) || ["draft", "cancelled"].includes(swim.status))
    return null;
  const started = new Date(swim.starts_at).getTime() <= Date.now();
  const older =
    started &&
    (swim.guest_reconciliation_days === 0 ||
      new Date(swim.ends_at).getTime() + (swim.guest_reconciliation_days ?? 3) * 86400000 <
        Date.now());
  const cutoff = new Date(swim.guest_booking_closes_at || swim.starts_at).getTime() <= Date.now();
  const general =
    swim.guest_booking_mode === "public" &&
    !older &&
    (started || !cutoff) &&
    !publicOffer.loading &&
    !publicOffer.error &&
    publicOffer.data?.booking_mode !== "closed" &&
    !!publicOffer.data;
  const url =
    typeof window === "undefined"
      ? ""
      : new URL(
          buildGuestPassSharePath(sessionId, null, { source, campaign }),
          window.location.origin
        ).toString();
  return (
    <Card className="space-y-3 border-cyan-100 bg-cyan-50/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Guest booking link</h2>
          <p className="text-sm text-slate-600">
            {swim.title} · {started ? "Guest settlement" : "Advance guest booking"}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setShow(!show)}
          aria-expanded={show}
        >
          {show ? "Hide guest links" : "Copy / share guest link"}
        </Button>
      </div>
      {show && (
        <div className="space-y-4">
          {publicOffer.error && <p className="text-sm text-slate-600">{publicOffer.error}</p>}
          {general && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  Source
                  <input
                    value={source}
                    onChange={(e) => setSource(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                    maxLength={80}
                    className="mt-1 w-full rounded border p-2"
                    placeholder="instagram"
                  />
                </label>
                <label className="text-sm">
                  Campaign (optional)
                  <input
                    value={campaign}
                    onChange={(e) => setCampaign(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                    maxLength={120}
                    className="mt-1 w-full rounded border p-2"
                    placeholder="september_swim"
                  />
                </label>
              </div>
              <GuestLinkActions url={url} sessionId={sessionId} source={source} />
            </>
          )}
          <p className="text-sm text-slate-600">
            {older
              ? "The public settlement window has closed. Create a private reconciliation link for the guest below."
              : "For approval-only swims, private Events, or a guest without a member invitation, issue an individual link below."}{" "}
            The link works for the specified email once and expires in 72 hours.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-0 flex-1 text-sm">
              Guest email
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setIssued(null);
                }}
                className="mt-1 w-full rounded border p-2"
              />
            </label>
            <Button
              type="button"
              size="sm"
              disabled={busy || !email.includes("@")}
              onClick={() => void createApproval()}
            >
              {busy ? "Creating..." : "Create individual link"}
            </Button>
          </div>
          {issued && (
            <>
              <p className="text-xs text-slate-600">
                Approved for {email}. Expires {new Date(issued.expires_at).toLocaleString("en-NG")}.
              </p>
              <GuestLinkActions url={issued.url} sessionId={sessionId} />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => void revoke()}
              >
                Revoke this individual link
              </Button>
            </>
          )}
          <Link
            href={`/admin/guest-passes?session_id=${sessionId}`}
            className="inline-block text-sm font-medium text-cyan-700 underline"
          >
            Manage guest payments, attendance and follow-up
          </Link>
        </div>
      )}
    </Card>
  );
}
