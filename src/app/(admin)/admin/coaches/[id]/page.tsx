"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import {
    AdminCoachApplicationDetail,
    CoachesApi,
    getStatusColor,
    getStatusLabel,
} from "@/lib/coaches";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminCoachDetailPage() {
    const params = useParams();
    const router = useRouter();
    const coachId = params.id as string;

    const [application, setApplication] = useState<AdminCoachApplicationDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [infoMessage, setInfoMessage] = useState("");
    const [adminNotes, setAdminNotes] = useState("");

    useEffect(() => {
        loadApplication();
    }, [coachId]);

    const loadApplication = async () => {
        try {
            const data = await CoachesApi.getApplication(coachId);
            setApplication(data);
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
            setError("Please provide a reason for rejection (at least 10 characters)");
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
            setError("Please provide details on what information is needed (at least 10 characters)");
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

    if (loading) {
        return <LoadingCard text="Loading application..." />;
    }

    if (!application) {
        return (
            <Card className="p-8 text-center">
                <p className="text-slate-500">Application not found.</p>
                <Link href="/admin/coaches" className="text-cyan-600 hover:underline mt-2 inline-block">
                    Back to applications
                </Link>
            </Card>
        );
    }

    const canTakeAction = ["pending_review", "more_info_needed"].includes(application.status);

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
                        {application.display_name || `${application.first_name} ${application.last_name}`}
                    </h1>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="text-slate-500">{application.email}</span>
                        <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                application.status
                            )}`}
                            style={{
                                backgroundColor:
                                    application.status === "pending_review"
                                        ? "#fef3c7"
                                        : application.status === "approved" || application.status === "active"
                                            ? "#d1fae5"
                                            : application.status === "rejected"
                                                ? "#fee2e2"
                                                : "#f1f5f9",
                            }}
                        >
                            {getStatusLabel(application.status)}
                        </span>
                    </div>
                </div>

                {canTakeAction && (
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowInfoModal(true)}>
                            Request Info
                        </Button>
                        <Button variant="outline" onClick={() => setShowRejectModal(true)}>
                            Reject
                        </Button>
                        <Button onClick={handleApprove} disabled={actionLoading}>
                            {actionLoading ? "..." : "Approve"}
                        </Button>
                    </div>
                )}
            </div>

            {error && <Alert variant="error" title="Error">{error}</Alert>}

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
                                    <p className="mt-1 text-slate-700 whitespace-pre-wrap">{application.full_bio}</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Experience */}
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Experience & Qualifications</h2>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-sm text-slate-500">Years of Experience</label>
                                <p className="mt-1 text-2xl font-bold text-slate-900">{application.coaching_years}</p>
                            </div>
                            {application.coaching_experience_summary && (
                                <div className="col-span-2">
                                    <label className="text-sm text-slate-500">Experience Summary</label>
                                    <p className="mt-1 text-slate-700">{application.coaching_experience_summary}</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-6">
                            <label className="text-sm text-slate-500">Specialties</label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {application.coaching_specialties.map((s) => (
                                    <span key={s} className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-sm">
                                        {s}
                                    </span>
                                ))}
                                {application.coaching_specialties.length === 0 && (
                                    <span className="text-slate-400">None specified</span>
                                )}
                            </div>
                        </div>

                        <div className="mt-6">
                            <label className="text-sm text-slate-500">Levels Taught</label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {application.levels_taught.map((l) => (
                                    <span key={l} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                                        {l}
                                    </span>
                                ))}
                                {application.levels_taught.length === 0 && (
                                    <span className="text-slate-400">None specified</span>
                                )}
                            </div>
                        </div>

                        <div className="mt-6">
                            <label className="text-sm text-slate-500">Age Groups</label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {application.age_groups_taught.map((a) => (
                                    <span key={a} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                                        {a}
                                    </span>
                                ))}
                                {application.age_groups_taught.length === 0 && (
                                    <span className="text-slate-400">None specified</span>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Certifications */}
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Certifications & Safety</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-slate-500">Certifications</label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {application.certifications.map((c) => (
                                        <span key={c} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm">
                                            {c}
                                        </span>
                                    ))}
                                    {application.certifications.length === 0 && (
                                        <span className="text-slate-400">None specified</span>
                                    )}
                                </div>
                            </div>

                            {application.other_certifications_note && (
                                <div>
                                    <label className="text-sm text-slate-500">Other Certifications</label>
                                    <p className="mt-1 text-slate-700">{application.other_certifications_note}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-slate-500">CPR Training</label>
                                    <p className={`mt-1 font-medium ${application.has_cpr_training ? "text-emerald-600" : "text-slate-400"}`}>
                                        {application.has_cpr_training ? "✓ Yes" : "No"}
                                    </p>
                                </div>
                                {application.cpr_expiry_date && (
                                    <div>
                                        <label className="text-sm text-slate-500">CPR Expiry</label>
                                        <p className="mt-1 text-slate-700">
                                            {new Date(application.cpr_expiry_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-slate-500">Background Check</label>
                                    <p className="mt-1 text-slate-700">{application.background_check_status}</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Contact Info */}
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Contact</h2>
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
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Timeline</h2>
                        <div className="space-y-3 text-sm">
                            <div>
                                <label className="text-slate-500">Applied</label>
                                <p className="font-medium">
                                    {application.application_submitted_at
                                        ? new Date(application.application_submitted_at).toLocaleString()
                                        : "Not submitted"}
                                </p>
                            </div>
                            {application.application_reviewed_at && (
                                <div>
                                    <label className="text-slate-500">Reviewed</label>
                                    <p className="font-medium">
                                        {new Date(application.application_reviewed_at).toLocaleString()}
                                    </p>
                                    {application.application_reviewed_by && (
                                        <p className="text-slate-400 text-xs">by {application.application_reviewed_by}</p>
                                    )}
                                </div>
                            )}
                            <div>
                                <label className="text-slate-500">Last Updated</label>
                                <p className="font-medium">{new Date(application.updated_at).toLocaleString()}</p>
                            </div>
                        </div>
                    </Card>

                    {/* Admin Notes */}
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Admin Notes</h2>
                        <textarea
                            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-cyan-500 focus:outline-none text-sm"
                            rows={4}
                            placeholder="Internal notes (not visible to applicant)..."
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                        />
                    </Card>

                    {/* Rejection Reason */}
                    {application.rejection_reason && (
                        <Card className="p-6 border-red-100 bg-red-50">
                            <h2 className="text-lg font-semibold text-red-900 mb-2">
                                {application.status === "more_info_needed" ? "Info Requested" : "Rejection Reason"}
                            </h2>
                            <p className="text-red-700 text-sm">{application.rejection_reason}</p>
                        </Card>
                    )}
                </div>
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-md p-6 m-4">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Reject Application</h2>
                        <p className="text-sm text-slate-600 mb-4">
                            This reason will be sent to the applicant via email.
                        </p>
                        <textarea
                            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-cyan-500 focus:outline-none"
                            rows={4}
                            placeholder="Reason for rejection..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                        />
                        <div className="flex gap-2 mt-4">
                            <Button variant="outline" className="flex-1" onClick={() => setShowRejectModal(false)}>
                                Cancel
                            </Button>
                            <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleReject} disabled={actionLoading}>
                                {actionLoading ? "..." : "Reject"}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Request Info Modal */}
            {showInfoModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-md p-6 m-4">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Request More Information</h2>
                        <p className="text-sm text-slate-600 mb-4">
                            Explain what additional information is needed from the applicant.
                        </p>
                        <textarea
                            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-cyan-500 focus:outline-none"
                            rows={4}
                            placeholder="What information is needed..."
                            value={infoMessage}
                            onChange={(e) => setInfoMessage(e.target.value)}
                        />
                        <div className="flex gap-2 mt-4">
                            <Button variant="outline" className="flex-1" onClick={() => setShowInfoModal(false)}>
                                Cancel
                            </Button>
                            <Button className="flex-1" onClick={handleRequestInfo} disabled={actionLoading}>
                                {actionLoading ? "..." : "Send Request"}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
