"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  SLOT_STATUS_LABELS,
  VolunteersApi,
  type VolunteerOpportunity,
  type VolunteerRole,
  type VolunteerSlot,
} from "@/lib/volunteers";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  LogIn,
  LogOut,
  MapPin,
  Pencil,
  Printer,
  QrCode,
  Users,
  XCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const QRCodeCanvas = dynamic(() => import("qrcode.react").then((mod) => mod.QRCodeCanvas), {
  ssr: false,
  loading: () => <div className="h-48 w-48 animate-pulse rounded bg-slate-200" />,
});

export default function AdminOpportunityDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [opp, setOpp] = useState<VolunteerOpportunity | null>(null);
  const [slots, setSlots] = useState<VolunteerSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Edit modal state — lazy-load roles only when the admin opens it,
  // since most page visits are read-only.
  const [showEdit, setShowEdit] = useState(false);
  const [editRoles, setEditRoles] = useState<VolunteerRole[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    role_id: "",
    date: "",
    start_time: "",
    end_time: "",
    location_name: "",
    slots_needed: "1",
    opportunity_type: "open_claim" as "open_claim" | "approval_required",
    min_tier: "tier_1" as "tier_1" | "tier_2" | "tier_3",
    qr_checkin_enabled: false,
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [oppData, slotsData] = await Promise.all([
        VolunteersApi.getOpportunity(id),
        VolunteersApi.admin.listSlots(id),
      ]);
      setOpp(oppData);
      setSlots(slotsData);
    } catch {
      setError("Failed to load opportunity.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (slotId: string) => {
    try {
      await VolunteersApi.admin.updateSlot(slotId, { status: "approved" });
      setActionMsg("Slot approved.");
      await loadData();
    } catch {
      setError("Failed to approve slot.");
    }
  };

  const handleReject = async (slotId: string) => {
    try {
      await VolunteersApi.admin.updateSlot(slotId, { status: "rejected" });
      setActionMsg("Slot rejected.");
      await loadData();
    } catch {
      setError("Failed to reject slot.");
    }
  };

  const handleCheckin = async (slotId: string) => {
    try {
      await VolunteersApi.admin.checkinSlot(slotId);
      setActionMsg("Checked in.");
      await loadData();
    } catch {
      setError("Failed to check in.");
    }
  };

  const handleCheckout = async (slotId: string) => {
    try {
      await VolunteersApi.admin.checkoutSlot(slotId);
      setActionMsg("Checked out and hours logged.");
      await loadData();
    } catch {
      setError("Failed to check out.");
    }
  };

  const handleNoShow = async (slotId: string) => {
    try {
      await VolunteersApi.admin.markNoShow(slotId);
      setActionMsg("Marked as no-show.");
      await loadData();
    } catch {
      setError("Failed to mark no-show.");
    }
  };

  const handlePublish = async () => {
    try {
      await VolunteersApi.admin.publishOpportunity(id);
      setActionMsg("Opportunity published.");
      await loadData();
    } catch {
      setError("Failed to publish.");
    }
  };

  const handleCancel = async () => {
    try {
      await VolunteersApi.admin.cancelOpportunity(id);
      setActionMsg("Opportunity cancelled.");
      await loadData();
    } catch {
      setError("Failed to cancel.");
    }
  };

  const openEditModal = async () => {
    if (!opp) return;
    setEditForm({
      title: opp.title,
      description: opp.description ?? "",
      role_id: opp.role_id ?? "",
      date: opp.date,
      start_time: opp.start_time ? opp.start_time.slice(0, 5) : "",
      end_time: opp.end_time ? opp.end_time.slice(0, 5) : "",
      location_name: opp.location_name ?? "",
      slots_needed: String(opp.slots_needed),
      opportunity_type: opp.opportunity_type,
      min_tier: opp.min_tier,
      qr_checkin_enabled: opp.qr_checkin_enabled,
    });
    setShowEdit(true);
    // Lazy-fetch roles for the picker. Failure is non-fatal — admin can
    // still edit other fields with the current role_id.
    if (editRoles.length === 0) {
      try {
        const data = await VolunteersApi.listRoles(false);
        setEditRoles(data);
      } catch {
        /* swallow — Select will fall back to the existing role_id */
      }
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opp) return;
    setEditSaving(true);
    // Backend Pydantic `time` parsing wants ISO-style HH:MM:SS — HTML
    // <input type="time"> emits HH:MM, which 3.10 rejects. Append :00.
    const padTime = (v: string) => (v && v.length === 5 ? `${v}:00` : v || undefined);
    const slots = parseInt(editForm.slots_needed, 10);
    try {
      await VolunteersApi.admin.updateOpportunity(id, {
        title: editForm.title,
        description: editForm.description || undefined,
        role_id: editForm.role_id || undefined,
        date: editForm.date,
        start_time: padTime(editForm.start_time),
        end_time: padTime(editForm.end_time),
        location_name: editForm.location_name || undefined,
        // Coerce defensively — a non-numeric value would send JSON `null`
        // and trip the NOT NULL column. Fall back to the current value.
        slots_needed: Number.isFinite(slots) && slots > 0 ? slots : opp.slots_needed,
        opportunity_type: editForm.opportunity_type,
        min_tier: editForm.min_tier,
        qr_checkin_enabled: editForm.qr_checkin_enabled,
      } as Partial<VolunteerOpportunity>);
      setShowEdit(false);
      setActionMsg("Opportunity updated.");
      await loadData();
    } catch (e) {
      // Surface the actual server error instead of a generic "Failed to
      // update opportunity." — the catch was swallowing the only useful
      // signal we had.
      const msg =
        e instanceof Error && e.message
          ? `Failed to update opportunity: ${e.message}`
          : "Failed to update opportunity.";
      setError(msg);
    } finally {
      setEditSaving(false);
    }
  };

  const handleBulkComplete = async () => {
    const activeSlotIds = slots
      .filter((s) => s.status === "approved" || s.status === "claimed")
      .map((s) => s.id);
    if (activeSlotIds.length === 0) return;
    try {
      await VolunteersApi.admin.bulkComplete(activeSlotIds);
      setActionMsg(`${activeSlotIds.length} slot(s) completed.`);
      await loadData();
    } catch {
      setError("Failed to bulk complete.");
    }
  };

  if (loading) return <LoadingPage text="Loading..." />;
  if (!opp) return <Alert variant="error">Opportunity not found.</Alert>;

  const slotVariant = (status: string) => {
    switch (status) {
      case "approved":
        return "success";
      case "claimed":
        return "info";
      case "completed":
        return "default";
      case "no_show":
        return "danger";
      case "rejected":
      case "cancelled":
        return "warning";
      default:
        return "default";
    }
  };

  const activeSlots = slots.filter((s) => ["claimed", "approved"].includes(s.status));

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-4 md:py-8">
      {/* Back */}
      <Link
        href="/admin/community/volunteers"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Volunteer Management
      </Link>

      {error && <Alert variant="error">{error}</Alert>}
      {actionMsg && <Alert variant="success">{actionMsg}</Alert>}

      {/* Opportunity Header */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{opp.title}</h1>
              <Badge
                variant={
                  opp.status === "open"
                    ? "success"
                    : opp.status === "draft"
                      ? "default"
                      : opp.status === "cancelled"
                        ? "danger"
                        : "info"
                }
              >
                {opp.status}
              </Badge>
              {opp.qr_checkin_enabled && (
                <Badge variant="info">
                  <QrCode className="mr-1 h-3 w-3 inline" />
                  QR Check-in
                </Badge>
              )}
              {opp.role_title && <Badge variant="outline">{opp.role_title}</Badge>}
            </div>
            {opp.description && (
              <p className="text-sm text-slate-600 whitespace-pre-line">{opp.description}</p>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(opp.date).toLocaleDateString("en-NG", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              {opp.start_time && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {opp.start_time.slice(0, 5)}
                  {opp.end_time && ` – ${opp.end_time.slice(0, 5)}`}
                </span>
              )}
              {opp.location_name && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {opp.location_name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {opp.slots_filled}/{opp.slots_needed} filled
              </span>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0 flex-wrap">
            {opp.status === "draft" && (
              <Button size="sm" onClick={handlePublish}>
                Publish
              </Button>
            )}
            {opp.status !== "cancelled" && opp.status !== "completed" && (
              <Button size="sm" variant="secondary" onClick={openEditModal}>
                <Pencil className="mr-1 h-4 w-4" /> Edit
              </Button>
            )}
            {opp.status !== "cancelled" && opp.status !== "completed" && (
              <Button size="sm" variant="danger" onClick={handleCancel}>
                Cancel
              </Button>
            )}
            {activeSlots.length > 0 && (
              <Button size="sm" variant="secondary" onClick={handleBulkComplete}>
                Complete All ({activeSlots.length})
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* QR Code Card */}
      {opp.qr_checkin_enabled && opp.qr_token && (
        <Card>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
              <QRCodeCanvas
                value={`${process.env.NEXT_PUBLIC_BASE_URL || "https://swimbuddz.com"}/community/volunteers/qr-checkin?token=${opp.qr_token}`}
                size={180}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#1e293b"
              />
            </div>
            <div className="flex-1 text-center sm:text-left space-y-2">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2 justify-center sm:justify-start">
                <QrCode className="h-5 w-5 text-teal-600" />
                QR Code Check-in
              </h3>
              <p className="text-sm text-slate-600">
                Print this QR code and display it at the pool. Volunteers scan it with their phone
                camera to check in automatically.
              </p>
              <p className="text-xs text-slate-400">
                Check-in opens 15 minutes before start time and closes 30 minutes after.
              </p>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const printWindow = window.open("", "_blank");
                  if (!printWindow) return;
                  const qrUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://swimbuddz.com"}/community/volunteers/qr-checkin?token=${opp.qr_token}`;
                  printWindow.document.write(`
                    <html>
                      <head><title>QR Check-in — ${opp.title}</title></head>
                      <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,sans-serif;margin:0;padding:2rem;">
                        <h1 style="font-size:1.5rem;margin-bottom:0.25rem;">${opp.title}</h1>
                        <p style="color:#64748b;margin-bottom:1.5rem;">Scan to check in as a volunteer</p>
                        <div id="qr" style="padding:1rem;background:white;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);"></div>
                        <p style="margin-top:1rem;color:#94a3b8;font-size:0.875rem;">
                          ${opp.date} ${opp.start_time ? "• " + opp.start_time.slice(0, 5) : ""} ${opp.location_name ? "• " + opp.location_name : ""}
                        </p>
                        <script src="https://cdn.jsdelivr.net/npm/qrcode@1/build/qrcode.min.js"><\/script>
                        <script>
                          QRCode.toCanvas(document.createElement('canvas'), '${qrUrl}', {width:300,margin:0,errorCorrectionLevel:'H'}, function(err, canvas) {
                            if (!err) document.getElementById('qr').appendChild(canvas);
                            window.print();
                          });
                        <\/script>
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                }}
              >
                <Printer className="mr-1 h-4 w-4" />
                Print QR Code
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Slots */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Volunteer Slots ({slots.length})</h2>

        {slots.length === 0 ? (
          <Card className="py-8 text-center">
            <Users className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm text-slate-600">No volunteers have signed up yet.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {slots.map((slot) => (
              <Card key={slot.id}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900">
                        {slot.member_name || "Unknown Member"}
                      </p>
                      <Badge
                        variant={
                          slotVariant(slot.status) as
                            | "success"
                            | "info"
                            | "default"
                            | "danger"
                            | "warning"
                        }
                      >
                        {SLOT_STATUS_LABELS[slot.status]}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>Claimed: {new Date(slot.claimed_at).toLocaleString("en-NG")}</span>
                      {slot.checked_in_at && (
                        <span className="text-emerald-600">
                          In:{" "}
                          {new Date(slot.checked_in_at).toLocaleTimeString("en-NG", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                      {slot.checked_out_at && (
                        <span className="text-emerald-600">
                          Out:{" "}
                          {new Date(slot.checked_out_at).toLocaleTimeString("en-NG", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                      {slot.hours_logged != null && (
                        <span className="font-medium">{slot.hours_logged.toFixed(1)}h logged</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0 flex-wrap">
                    {/* Approve/Reject for pending claims */}
                    {slot.status === "claimed" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(slot.id)}
                          className="flex items-center gap-1"
                        >
                          <CheckCircle className="h-3 w-3" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleReject(slot.id)}
                          className="flex items-center gap-1"
                        >
                          <XCircle className="h-3 w-3" /> Reject
                        </Button>
                      </>
                    )}

                    {/* Check-in for approved */}
                    {(slot.status === "approved" || slot.status === "claimed") &&
                      !slot.checked_in_at && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleCheckin(slot.id)}
                          className="flex items-center gap-1"
                        >
                          <LogIn className="h-3 w-3" /> Check In
                        </Button>
                      )}

                    {/* Check-out for checked-in */}
                    {slot.checked_in_at && !slot.checked_out_at && slot.status !== "no_show" && (
                      <Button
                        size="sm"
                        onClick={() => handleCheckout(slot.id)}
                        className="flex items-center gap-1"
                      >
                        <LogOut className="h-3 w-3" /> Check Out
                      </Button>
                    )}

                    {/* No-show for active slots */}
                    {["claimed", "approved"].includes(slot.status) && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleNoShow(slot.id)}
                        className="flex items-center gap-1 text-rose-600 hover:bg-rose-50"
                      >
                        <AlertTriangle className="h-3 w-3" /> No-Show
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Edit Opportunity Modal — uses the same VolunteerOpportunityUpdate
          fields as the create form. Lazy-loads role list on first open. */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title={`Edit: ${opp.title}`}>
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <Input
            label="Title"
            value={editForm.title}
            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            rows={2}
          />
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <Select
              label="Role"
              value={editForm.role_id}
              onChange={(e) => setEditForm({ ...editForm, role_id: e.target.value })}
            >
              <option value="">Any role</option>
              {editRoles
                .filter((r) => r.is_active || r.id === editForm.role_id)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.icon} {r.title}
                  </option>
                ))}
            </Select>
            <Input
              label="Slots Needed"
              type="number"
              min={1}
              value={editForm.slots_needed}
              onChange={(e) => setEditForm({ ...editForm, slots_needed: e.target.value })}
              required
            />
          </div>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <Input
              label="Date"
              type="date"
              value={editForm.date}
              onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
              required
            />
            <Input
              label="Location"
              value={editForm.location_name}
              onChange={(e) => setEditForm({ ...editForm, location_name: e.target.value })}
            />
          </div>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <Input
              label="Start Time"
              type="time"
              value={editForm.start_time}
              onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
            />
            <Input
              label="End Time"
              type="time"
              value={editForm.end_time}
              onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
            />
          </div>

          <div className="border-t border-slate-200 pt-4">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <Select
                label="Claim Type"
                value={editForm.opportunity_type}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    opportunity_type: e.target.value as "open_claim" | "approval_required",
                  })
                }
              >
                <option value="open_claim">Open (anyone can claim)</option>
                <option value="approval_required">Approval required</option>
              </Select>
              <Select
                label="Minimum Tier"
                value={editForm.min_tier}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    min_tier: e.target.value as "tier_1" | "tier_2" | "tier_3",
                  })
                }
              >
                <option value="tier_1">Tier 1 — Anyone</option>
                <option value="tier_2">Tier 2 — Core</option>
                <option value="tier_3">Tier 3 — Lead</option>
              </Select>
            </div>
            <label className="flex items-center gap-3 mt-3 cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.qr_checkin_enabled}
                onChange={(e) => setEditForm({ ...editForm, qr_checkin_enabled: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm text-slate-700">Enable QR self check-in</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowEdit(false)}
              disabled={editSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={editSaving}>
              {editSaving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
