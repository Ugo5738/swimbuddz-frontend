"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { supabase } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { useEffect, useState } from "react";

type SessionStatusType =
  | "draft"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

interface Session {
  id: string;
  title: string;
  session_type?:
    | "club"
    | "academy"
    | "community"
    | "cohort_class"
    | "one_on_one"
    | "group_booking"
    | "event";
  status?: SessionStatusType;
  location: string;
  starts_at: string;
  ends_at: string;
  pool_fee: number;
  capacity: number;
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

  const status = session.status || "scheduled";

  useEffect(() => {
    fetchRideConfigs();
  }, [session.id]);

  const fetchRideConfigs = async () => {
    try {
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();
      const token = authSession?.access_token;

      const res = await fetch(
        `${API_BASE_URL}/api/v1/transport/sessions/${session.id}/ride-configs`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
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
  };

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

  // Check if session start is less than 6 hours away
  const isShortNotice = () => {
    const hoursUntilStart =
      (new Date(session.starts_at).getTime() - Date.now()) / (1000 * 60 * 60);
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
              {session.session_type
                ? session.session_type.toUpperCase()
                : "COMMUNITY"}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-slate-700">Location</p>
            <p className="text-slate-900">{session.location}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">Capacity</p>
            <p className="text-slate-900">{session.capacity} swimmers</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-slate-700">Start Time</p>
            <p className="text-slate-900">
              {new Date(session.starts_at).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">End Time</p>
            <p className="text-slate-900">
              {new Date(session.ends_at).toLocaleString()}
            </p>
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

        {/* Ride Share Information */}
        <div className="border-t pt-4">
          <p className="text-sm font-medium text-slate-700 mb-2">
            Ride Share Options
          </p>
          {loading ? (
            <p className="text-sm text-slate-500">Loading ride share info...</p>
          ) : rideConfigs.length > 0 ? (
            <div className="space-y-2">
              {rideConfigs.map((config, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 rounded border border-slate-200"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-slate-900">
                        {config.ride_area_name}
                      </p>
                      <p className="text-sm text-slate-600">
                        Cost: ₦{config.cost} · Capacity: {config.capacity} seats
                      </p>
                      {config.departure_time && (
                        <p className="text-xs text-slate-500">
                          Departs:{" "}
                          {new Date(config.departure_time).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                  {config.pickup_locations &&
                    config.pickup_locations.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-slate-700 mb-1">
                          Pickup locations:
                        </p>
                        <ul className="text-xs text-slate-600 space-y-0.5">
                          {config.pickup_locations.map(
                            (loc: any, idx: number) => (
                              <li key={idx}>• {loc.name}</li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">
              No ride share options configured
            </p>
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
            <p className="text-sm font-medium text-slate-900">
              Publish this session?
            </p>
            <p className="text-sm text-slate-600">
              This will make the session visible to members and send
              notification emails to subscribed members.
            </p>
            {isShortNotice() && (
              <Alert variant="info" title="Short Notice">
                This session starts in less than 6 hours. It will be marked as
                short notice.
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
            <p className="text-sm font-medium text-red-700">
              Cancel this session?
            </p>
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
              <Button
                variant="danger"
                onClick={handleCancel}
                disabled={actionLoading}
              >
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
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            {status === "draft" && onPublish && (
              <Button onClick={() => setShowPublishConfirm(true)}>
                Publish
              </Button>
            )}
            <Button variant="outline" onClick={() => onEdit(session)}>
              Edit
            </Button>
            {(status === "draft" || status === "scheduled") && onCancel && (
              <Button
                variant="danger"
                onClick={() => setShowCancelConfirm(true)}
              >
                Cancel Session
              </Button>
            )}
            <Button variant="danger" onClick={() => onDelete(session.id)}>
              Delete
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
