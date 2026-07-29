"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { supabase } from "@/lib/auth";
import { API_BASE_URL, buildAppUrl } from "@/lib/config";
import { getLocationDisplayName } from "@/lib/sessions";
import { Ban, Link as LinkIcon, Pencil, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type SessionStatusType = "draft" | "scheduled" | "in_progress" | "completed" | "cancelled";

interface Session {
  id: string;
  title: string;
  session_type?: "club" | "academy" | "community" | "cohort_class" | "event";
  status?: SessionStatusType;
  pool_id?: string | null;
  location: string | null;
  location_name?: string | null;
  starts_at: string;
  ends_at: string;
  pool_fee: number;
  capacity: number;
  pricing_mode?: "manual" | "cost_plus";
  pricing_expected_attendees?: number | null;
  estimated_total_cost?: number;
  estimated_cost_per_attendee?: number;
  margin_type?: "fixed_per_attendee" | "percentage";
  margin_value?: number;
  margin_amount_per_attendee?: number;
  cost_lines?: Array<{
    description: string;
    unit_cost_naira: number;
    quantity: number;
  }>;
  description?: string;
  template_id?: string;
  is_recurring_instance?: boolean;
  published_at?: string;
}

const STATUS_BADGE_STYLES: Record<SessionStatusType, string> = {
  draft: "bg-amber-100 text-amber-800",
  scheduled: "bg-green-100 text-green-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-slate-100 text-slate-800",
  cancelled: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<SessionStatusType, string> = {
  draft: "DRAFT",
  scheduled: "PUBLISHED",
  in_progress: "IN PROGRESS",
  completed: "COMPLETED",
  cancelled: "CANCELLED",
};

export { SessionDetailsModal };

// Session Details Modal with Ride Share Info
function SessionDetailsModal({
  session,
  onClose,
  onDelete,
  onEdit,
  onPublish,
  onCancel,
}: {
  session: Session;
  onClose: () => void;
  onDelete: (sessionId: string) => void;
  onEdit: (session: Session) => void;
  onPublish?: (sessionId: string, shortNoticeMessage?: string) => void;
  onCancel?: (sessionId: string, cancellationReason?: string) => void;
}) {
  const [rideConfigs, setRideConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Publish/Cancel flow state
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [shortNoticeMessage, setShortNoticeMessage] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");

  const status = session.status || "scheduled";

  const fetchRideConfigs = useCallback(async () => {
    try {
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();
      const token = authSession?.access_token;

      const res = await fetch(
        `${API_BASE_URL}/api/v1/transport/sessions/${session.id}/ride-configs`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const configs = await res.json();
        setRideConfigs(configs);
      }
    } catch (err) {
      console.error("Failed to fetch ride configs", err);
    } finally {
      setLoading(false);
    }
  }, [session.id]);

  useEffect(() => {
    void fetchRideConfigs();
  }, [fetchRideConfigs]);

  const handlePublish = async () => {
    if (!onPublish) return;
    setActionLoading(true);
    try {
      await onPublish(session.id, shortNoticeMessage || undefined);
    } finally {
      setActionLoading(false);
      setShowPublishConfirm(false);
    }
  };

  const handleCancel = async () => {
    if (!onCancel) return;
    setActionLoading(true);
    try {
      await onCancel(session.id, cancellationReason || undefined);
    } finally {
      setActionLoading(false);
      setShowCancelConfirm(false);
    }
  };

  const handleCopyBookingLink = async () => {
    const bookingUrl = buildAppUrl(`/sessions/${session.id}/book`);
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopyFeedback("Booking link copied");
      setTimeout(() => setCopyFeedback(""), 2500);
    } catch (err) {
      console.error("Failed to copy booking link", err);
      setCopyFeedback("Could not copy link. Please try again.");
      setTimeout(() => setCopyFeedback(""), 2500);
    }
  };

  // Check if session start is less than 6 hours away
  const isShortNotice = () => {
    const hoursUntilStart = (new Date(session.starts_at).getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursUntilStart < 6;
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Session Details">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">Title</p>
            <p className="text-slate-900">{session.title}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Status badge */}
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE_STYLES[status]}`}
            >
              {STATUS_LABELS[status]}
            </span>
            {/* Session type badge */}
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                session.session_type === "club"
                  ? "bg-cyan-100 text-cyan-800"
                  : session.session_type === "academy"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {session.session_type ? session.session_type.toUpperCase() : "COMMUNITY"}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-slate-700">Location</p>
            <p className="text-slate-900">
              {getLocationDisplayName(
                session.location ?? undefined,
                session.location_name ?? undefined
              )}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">Capacity</p>
            <p className="text-slate-900">{session.capacity} swimmers</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-slate-700">Start Time</p>
            <p className="text-slate-900">{new Date(session.starts_at).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">End Time</p>
            <p className="text-slate-900">{new Date(session.ends_at).toLocaleString()}</p>
          </div>
        </div>
        {session.published_at && (
          <div>
            <p className="text-sm font-medium text-slate-700">Published</p>
            <p className="text-sm text-slate-600">
              {new Date(session.published_at).toLocaleString()}
            </p>
          </div>
        )}
        {session.description && (
          <div>
            <p className="text-sm font-medium text-slate-700">Description</p>
            <p className="text-slate-900">{session.description}</p>
          </div>
        )}
        <div className="border-t border-slate-200 pt-4">
          <p className="mb-2 text-sm font-medium text-slate-700">Booking price and cost snapshot</p>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <PriceMetric label="Booking price" value={session.pool_fee} />
            <PriceMetric label="Estimated total cost" value={session.estimated_total_cost ?? 0} />
            <PriceMetric label="Cost / attendee" value={session.estimated_cost_per_attendee ?? 0} />
            <PriceMetric
              label="Margin / attendee"
              value={session.margin_amount_per_attendee ?? 0}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {session.pricing_mode === "cost_plus"
              ? `Cost plus ${
                  session.margin_type === "percentage"
                    ? `${session.margin_value ?? 0}%`
                    : `₦${(session.margin_value ?? 0).toLocaleString()} per attendee`
                }`
              : "Manual booking price"}
            {session.pricing_expected_attendees
              ? ` · planned for ${session.pricing_expected_attendees} attendees`
              : ""}
          </p>
          {session.cost_lines?.length ? (
            <div className="mt-3 divide-y divide-slate-100 border-y border-slate-100">
              {session.cost_lines.map((line, index) => (
                <div
                  key={`${line.description}-${index}`}
                  className="flex justify-between py-2 text-sm"
                >
                  <span className="text-slate-600">{line.description}</span>
                  <span className="font-medium text-slate-900">
                    ₦{(line.unit_cost_naira * line.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Ride Share Information */}
        <div className="border-t pt-4">
          <p className="text-sm font-medium text-slate-700 mb-2">Ride Share Options</p>
          {loading ? (
            <p className="text-sm text-slate-500">Loading ride share info...</p>
          ) : rideConfigs.length > 0 ? (
            <div className="space-y-2">
              {rideConfigs.map((config, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded border border-slate-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-slate-900">{config.ride_area_name}</p>
                      <p className="text-sm text-slate-600">
                        Cost: ₦{config.cost} · Capacity: {config.capacity} seats
                      </p>
                      {config.departure_time && (
                        <p className="text-xs text-slate-500">
                          Departs: {new Date(config.departure_time).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                  {config.pickup_locations && config.pickup_locations.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-slate-700 mb-1">Pickup locations:</p>
                      <ul className="text-xs text-slate-600 space-y-0.5">
                        {config.pickup_locations.map((loc: any, idx: number) => (
                          <li key={idx}>• {loc.name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">No ride share options configured</p>
          )}
        </div>

        {session.is_recurring_instance && (
          <Alert variant="info" title="Recurring Session">
            This session was generated from a template
          </Alert>
        )}

        {/* Publish Confirmation */}
        {showPublishConfirm && (
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium text-slate-900">Publish this session?</p>
            <p className="text-sm text-slate-600">
              This will make the session visible to members and send notification emails to
              subscribed members.
            </p>
            {isShortNotice() && (
              <Alert variant="info" title="Short Notice">
                This session starts in less than 6 hours. It will be marked as short notice.
              </Alert>
            )}
            <Textarea
              label="Message (optional)"
              placeholder="e.g. Created on short notice — things will be more structured from next week."
              value={shortNoticeMessage}
              onChange={(e) => setShortNoticeMessage(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={handlePublish} disabled={actionLoading}>
                {actionLoading ? "Publishing..." : "Confirm Publish"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowPublishConfirm(false)}
                disabled={actionLoading}
              >
                Back
              </Button>
            </div>
          </div>
        )}

        {/* Cancel Confirmation */}
        {showCancelConfirm && (
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium text-red-700">Cancel this session?</p>
            <p className="text-sm text-slate-600">
              This will cancel the session and notify all registered members.
            </p>
            <Textarea
              label="Cancellation reason (optional)"
              placeholder="e.g. Pool maintenance — session rescheduled to next week."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="danger" onClick={handleCancel} disabled={actionLoading}>
                {actionLoading ? "Cancelling..." : "Confirm Cancel"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowCancelConfirm(false)}
                disabled={actionLoading}
              >
                Back
              </Button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!showPublishConfirm && !showCancelConfirm && (
          <div className="space-y-2">
            <div className="flex flex-wrap justify-end gap-2">
              {status === "draft" && onPublish && (
                <Button
                  size="sm"
                  className="h-9 w-9 min-h-0 p-0"
                  onClick={() => setShowPublishConfirm(true)}
                  aria-label="Publish"
                  title="Publish"
                >
                  <Send size={16} aria-hidden="true" />
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 min-h-0 p-0"
                onClick={() => onEdit(session)}
                aria-label="Edit"
                title="Edit"
              >
                <Pencil size={16} aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 min-h-0 p-0"
                onClick={handleCopyBookingLink}
                aria-label="Copy booking link"
                title="Copy booking link"
              >
                <LinkIcon size={16} aria-hidden="true" />
              </Button>
              {(status === "draft" || status === "scheduled") && onCancel && (
                <Button
                  variant="danger"
                  size="sm"
                  className="h-9 w-9 min-h-0 p-0"
                  onClick={() => setShowCancelConfirm(true)}
                  aria-label="Cancel session"
                  title="Cancel session"
                >
                  <Ban size={16} aria-hidden="true" />
                </Button>
              )}
              <Button
                variant="danger"
                size="sm"
                className="h-9 w-9 min-h-0 p-0"
                onClick={() => onDelete(session.id)}
                aria-label="Delete"
                title="Delete"
              >
                <Trash2 size={16} aria-hidden="true" />
              </Button>
            </div>
            {copyFeedback ? (
              <p className="text-sm text-right text-cyan-700">{copyFeedback}</p>
            ) : null}
          </div>
        )}
      </div>
    </Modal>
  );
}

function PriceMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">
        ₦{value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </p>
    </div>
  );
}
