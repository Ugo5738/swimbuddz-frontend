"use client";

import { CoachGradesCard } from "@/components/coaches/CoachGradesCard";
import { CoachReadinessCard } from "@/components/coaches/CoachReadinessCard";
import { CoachStatusBadge } from "@/components/coaches/CoachStatusBadge";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { Modal } from "@/components/ui/Modal";
import { TagList } from "@/components/ui/TagList";
import { Textarea } from "@/components/ui/Textarea";
import { AdminCoachApplicationDetail, CoachesApi } from "@/lib/coaches";
import { formatDate } from "@/lib/format";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminCoachDetailPage() {
  const params = useParams();
  const router = useRouter();
  const coachId = params.id as string;

  const [application, setApplication] =
    useState<AdminCoachApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadApplication();
  }, [coachId]);

  const loadApplication = async () => {
    try {
      const data = await CoachesApi.getApplication(coachId);
      setApplication({
        ...data,
        coaching_specialties: data.coaching_specialties || [],
        certifications: data.certifications || [],
        levels_taught: data.levels_taught || [],
        age_groups_taught: data.age_groups_taught || [],
        languages_spoken: data.languages_spoken || [],
      });
      setAdminNotes(data.admin_notes || "");
    } catch (err) {
      setError("Failed to load application");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await CoachesApi.approve(coachId, adminNotes);
      loadApplication();
    } catch (err) {
      setError("Failed to approve application");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (rejectReason.length < 10) {
      setError(
        "Please provide a reason for rejection (at least 10 characters)",
      );
      return;
    }
    setActionLoading(true);
    try {
      await CoachesApi.reject(coachId, rejectReason, adminNotes);
      setShowRejectModal(false);
      loadApplication();
    } catch (err) {
      setError("Failed to reject application");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestInfo = async () => {
    if (infoMessage.length < 10) {
      setError(
        "Please provide details on what information is needed (at least 10 characters)",
      );
      return;
    }
    setActionLoading(true);
    try {
      await CoachesApi.requestMoreInfo(coachId, infoMessage, adminNotes);
      setShowInfoModal(false);
      loadApplication();
    } catch (err) {
      setError("Failed to request more info");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm.trim().toUpperCase() !== "DELETE") {
      setError("Type DELETE to confirm this action.");
      return;
    }
    setDeleteLoading(true);
    setError(null);
    try {
      await CoachesApi.deleteApplication(coachId);
      setShowDeleteModal(false);
      router.push("/admin/coaches");
    } catch (err) {
      setError("Failed to delete coach profile");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return <LoadingCard text="Loading application..." />;
  }

  if (!application) {
    return (
      <Card className="p-8 text-center">
        <p className="text-slate-500">Application not found.</p>
        <Link
          href="/admin/coaches"
          className="text-cyan-600 hover:underline mt-2 inline-block"
        >
          Back to applications
        </Link>
      </Card>
    );
  }

  const canTakeAction = ["pending_review", "more_info_needed"].includes(
    application.status,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/coaches"
            className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block"
          >
            ← Back to applications
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">
            {application.display_name ||
              `${application.first_name} ${application.last_name}`}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-slate-500">{application.email}</span>
            <CoachStatusBadge status={application.status} />
          </div>
        </div>

        <div className="flex gap-2">
          {canTakeAction && (
            <>
              <Button variant="outline" onClick={() => setShowInfoModal(true)}>
                Request Info
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRejectModal(true)}
              >
                Reject
              </Button>
              <Button onClick={handleApprove} disabled={actionLoading}>
                {actionLoading ? "..." : "Approve"}
              </Button>
            </>
          )}
          <Button
            variant="outline"
            className="border-rose-200 text-rose-700 hover:bg-rose-50"
            onClick={() => {
              setDeleteConfirm("");
              setShowDeleteModal(true);
            }}
          >
            Delete Coach
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bio */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">About</h2>
            <div className="space-y-4">
              {application.short_bio && (
                <div>
                  <label className="text-sm text-slate-500">Short Bio</label>
                  <p className="mt-1 text-slate-700">{application.short_bio}</p>
                </div>
              )}
              {application.full_bio && (
                <div>
                  <label className="text-sm text-slate-500">Full Bio</label>
                  <p className="mt-1 text-slate-700 whitespace-pre-wrap">
                    {application.full_bio}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Experience */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Experience & Qualifications
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-slate-500">
                  Years of Experience
                </label>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {application.coaching_years}
                </p>
              </div>
              {application.coaching_experience_summary && (
                <div className="col-span-2">
                  <label className="text-sm text-slate-500">
                    Experience Summary
                  </label>
                  <p className="mt-1 text-slate-700">
                    {application.coaching_experience_summary}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6">
              <label className="text-sm text-slate-500 block mb-2">
                Specialties
              </label>
              <TagList
                items={application.coaching_specialties}
                variant="cyan"
                size="md"
                emptyText="None specified"
              />
            </div>

            <div className="mt-6">
              <label className="text-sm text-slate-500 block mb-2">
                Levels Taught
              </label>
              <TagList
                items={application.levels_taught}
                variant="slate"
                size="md"
                emptyText="None specified"
              />
            </div>

            <div className="mt-6">
              <label className="text-sm text-slate-500 block mb-2">
                Age Groups
              </label>
              <TagList
                items={application.age_groups_taught}
                variant="slate"
                size="md"
                emptyText="None specified"
              />
            </div>
          </Card>

          {/* Certifications */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Certifications & Safety
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-500 block mb-2">
                  Certifications
                </label>
                <TagList
                  items={application.certifications}
                  variant="emerald"
                  size="md"
                  emptyText="None specified"
                />
              </div>

              {application.other_certifications_note && (
                <div>
                  <label className="text-sm text-slate-500">
                    Other Certifications
                  </label>
                  <p className="mt-1 text-slate-700">
                    {application.other_certifications_note}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-500">CPR Training</label>
                  <p
                    className={`mt-1 font-medium ${application.has_cpr_training ? "text-emerald-600" : "text-slate-400"}`}
                  >
                    {application.has_cpr_training ? "✓ Yes" : "No"}
                  </p>
                </div>
                {application.cpr_expiry_date && (
                  <div>
                    <label className="text-sm text-slate-500">CPR Expiry</label>
                    <p className="mt-1 text-slate-700">
                      {formatDate(application.cpr_expiry_date)}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-500">
                    Background Check
                  </label>
                  <p className="mt-1 text-slate-700">
                    {application.background_check_status}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Documents */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Documents & Links
            </h2>
            <div className="space-y-4">
              {application.coaching_document_link ? (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <label className="text-sm text-slate-500">
                    Uploaded Document
                  </label>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">
                        {application.coaching_document_file_name || "Document"}
                      </p>
                      <a
                        href={application.coaching_document_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-cyan-600 hover:underline"
                      >
                        {application.coaching_document_link}
                      </a>
                    </div>
                    <a
                      href={application.coaching_document_link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm">View Document</Button>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-lg text-center">
                  <p className="text-slate-400 text-sm">
                    No documents uploaded
                  </p>
                </div>
              )}

              {application.coaching_portfolio_link && (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <label className="text-sm text-slate-500">
                    Portfolio / Website
                  </label>
                  <div className="mt-2 flex items-center gap-3">
                    <a
                      href={application.coaching_portfolio_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-cyan-600 hover:underline"
                    >
                      {application.coaching_portfolio_link}
                    </a>
                    <a
                      href={application.coaching_portfolio_link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="secondary" size="sm">
                        Visit →
                      </Button>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Info */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Contact
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-slate-500">Email</label>
                <p className="font-medium">{application.email}</p>
              </div>
              {application.phone && (
                <div>
                  <label className="text-slate-500">Phone</label>
                  <p className="font-medium">{application.phone}</p>
                </div>
              )}
              {application.coaching_portfolio_link && (
                <div>
                  <label className="text-slate-500">Portfolio</label>
                  <a
                    href={application.coaching_portfolio_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-600 hover:underline block"
                  >
                    View Portfolio →
                  </a>
                </div>
              )}
            </div>
          </Card>

          {/* Timeline */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Timeline
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-slate-500">Applied</label>
                <p className="font-medium">
                  {application.application_submitted_at
                    ? formatDate(application.application_submitted_at, {
                        includeTime: true,
                      })
                    : "Not submitted"}
                </p>
              </div>
              {application.application_reviewed_at && (
                <div>
                  <label className="text-slate-500">Reviewed</label>
                  <p className="font-medium">
                    {formatDate(application.application_reviewed_at, {
                      includeTime: true,
                    })}
                  </p>
                  {application.application_reviewed_by && (
                    <p className="text-slate-400 text-xs">
                      by {application.application_reviewed_by}
                    </p>
                  )}
                </div>
              )}
              <div>
                <label className="text-slate-500">Last Updated</label>
                <p className="font-medium">
                  {formatDate(application.updated_at, { includeTime: true })}
                </p>
              </div>
            </div>
          </Card>

          {/* Admin Notes */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Admin Notes
            </h2>
            <Textarea
              hideLabel
              label="Admin Notes"
              rows={4}
              placeholder="Internal notes (not visible to applicant)..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            />
          </Card>

          {/* Coach Readiness (only for approved coaches) */}
          {application.status === "approved" && application.member_id && (
            <CoachReadinessCard coachId={application.member_id} />
          )}

          {/* Coach Grades (only for approved/active coaches) */}
          {["approved", "active"].includes(application.status) && (
            <CoachGradesCard coachProfileId={coachId} />
          )}

          {/* Rejection Reason */}
          {application.rejection_reason && (
            <Card className="p-6 border-red-100 bg-red-50">
              <h2 className="text-lg font-semibold text-red-900 mb-2">
                {application.status === "more_info_needed"
                  ? "Info Requested"
                  : "Rejection Reason"}
              </h2>
              <p className="text-red-700 text-sm">
                {application.rejection_reason}
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Application"
      >
        <p className="text-sm text-slate-600 mb-4">
          This reason will be sent to the applicant via email.
        </p>
        <Textarea
          hideLabel
          label="Rejection Reason"
          rows={4}
          placeholder="Reason for rejection..."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setShowRejectModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={handleReject}
            disabled={actionLoading}
          >
            {actionLoading ? "..." : "Reject"}
          </Button>
        </div>
      </Modal>

      {/* Request Info Modal */}
      <Modal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        title="Request More Information"
      >
        <p className="text-sm text-slate-600 mb-4">
          Explain what additional information is needed from the applicant.
        </p>
        <Textarea
          hideLabel
          label="Information Request"
          rows={4}
          placeholder="What information is needed..."
          value={infoMessage}
          onChange={(e) => setInfoMessage(e.target.value)}
        />
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setShowInfoModal(false)}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleRequestInfo}
            disabled={actionLoading}
          >
            {actionLoading ? "..." : "Send Request"}
          </Button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Coach Profile"
      >
        <p className="text-sm text-slate-600 mb-4">
          This will delete the coach profile and related coach agreements so the
          member can re-apply from scratch. The member account and login will be
          preserved.
        </p>
        <Input
          label="Type DELETE to confirm"
          value={deleteConfirm}
          onChange={(e) => setDeleteConfirm(e.target.value)}
        />
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setShowDeleteModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={handleDelete}
            disabled={deleteLoading}
          >
            {deleteLoading ? "..." : "Delete"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
