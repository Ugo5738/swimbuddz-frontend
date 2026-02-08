"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { Alert } from "@/components/ui/Alert";
import {
    ArrowLeft, Calendar, Clock, MapPin, Users,
    CheckCircle, XCircle, LogIn, LogOut, AlertTriangle,
} from "lucide-react";
import {
    VolunteersApi,
    SLOT_STATUS_LABELS,
    TIER_SHORT_LABELS,
    type VolunteerOpportunity,
    type VolunteerSlot,
} from "@/lib/volunteers";

export default function AdminOpportunityDetailPage() {
    const params = useParams();
    const id = params.id as string;

    const [opp, setOpp] = useState<VolunteerOpportunity | null>(null);
    const [slots, setSlots] = useState<VolunteerSlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionMsg, setActionMsg] = useState<string | null>(null);

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
        } catch { setError("Failed to approve slot."); }
    };

    const handleReject = async (slotId: string) => {
        try {
            await VolunteersApi.admin.updateSlot(slotId, { status: "rejected" });
            setActionMsg("Slot rejected.");
            await loadData();
        } catch { setError("Failed to reject slot."); }
    };

    const handleCheckin = async (slotId: string) => {
        try {
            await VolunteersApi.admin.checkinSlot(slotId);
            setActionMsg("Checked in.");
            await loadData();
        } catch { setError("Failed to check in."); }
    };

    const handleCheckout = async (slotId: string) => {
        try {
            await VolunteersApi.admin.checkoutSlot(slotId);
            setActionMsg("Checked out and hours logged.");
            await loadData();
        } catch { setError("Failed to check out."); }
    };

    const handleNoShow = async (slotId: string) => {
        try {
            await VolunteersApi.admin.markNoShow(slotId);
            setActionMsg("Marked as no-show.");
            await loadData();
        } catch { setError("Failed to mark no-show."); }
    };

    const handlePublish = async () => {
        try {
            await VolunteersApi.admin.publishOpportunity(id);
            setActionMsg("Opportunity published.");
            await loadData();
        } catch { setError("Failed to publish."); }
    };

    const handleCancel = async () => {
        try {
            await VolunteersApi.admin.cancelOpportunity(id);
            setActionMsg("Opportunity cancelled.");
            await loadData();
        } catch { setError("Failed to cancel."); }
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
        } catch { setError("Failed to bulk complete."); }
    };

    if (loading) return <LoadingPage text="Loading..." />;
    if (!opp) return <Alert variant="error">Opportunity not found.</Alert>;

    const slotVariant = (status: string) => {
        switch (status) {
            case "approved": return "success";
            case "claimed": return "info";
            case "completed": return "default";
            case "no_show": return "danger";
            case "rejected": case "cancelled": return "warning";
            default: return "default";
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
                                    opp.status === "open" ? "success" :
                                    opp.status === "draft" ? "default" :
                                    opp.status === "cancelled" ? "danger" : "info"
                                }
                            >
                                {opp.status}
                            </Badge>
                            {opp.role_title && <Badge variant="outline">{opp.role_title}</Badge>}
                        </div>
                        {opp.description && (
                            <p className="text-sm text-slate-600">{opp.description}</p>
                        )}
                        <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(opp.date).toLocaleDateString("en-NG", {
                                    weekday: "long", month: "long", day: "numeric", year: "numeric",
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
                    <div className="flex gap-2 flex-shrink-0">
                        {opp.status === "draft" && (
                            <Button size="sm" onClick={handlePublish}>Publish</Button>
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

            {/* Slots */}
            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900">
                    Volunteer Slots ({slots.length})
                </h2>

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
                                            <Badge variant={slotVariant(slot.status) as "success" | "info" | "default" | "danger" | "warning"}>
                                                {SLOT_STATUS_LABELS[slot.status]}
                                            </Badge>
                                        </div>
                                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                                            <span>Claimed: {new Date(slot.claimed_at).toLocaleString("en-NG")}</span>
                                            {slot.checked_in_at && (
                                                <span className="text-emerald-600">
                                                    In: {new Date(slot.checked_in_at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                                                </span>
                                            )}
                                            {slot.checked_out_at && (
                                                <span className="text-emerald-600">
                                                    Out: {new Date(slot.checked_out_at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
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
                                                <Button size="sm" onClick={() => handleApprove(slot.id)} className="flex items-center gap-1">
                                                    <CheckCircle className="h-3 w-3" /> Approve
                                                </Button>
                                                <Button size="sm" variant="danger" onClick={() => handleReject(slot.id)} className="flex items-center gap-1">
                                                    <XCircle className="h-3 w-3" /> Reject
                                                </Button>
                                            </>
                                        )}

                                        {/* Check-in for approved */}
                                        {(slot.status === "approved" || slot.status === "claimed") && !slot.checked_in_at && (
                                            <Button size="sm" variant="secondary" onClick={() => handleCheckin(slot.id)} className="flex items-center gap-1">
                                                <LogIn className="h-3 w-3" /> Check In
                                            </Button>
                                        )}

                                        {/* Check-out for checked-in */}
                                        {slot.checked_in_at && !slot.checked_out_at && slot.status !== "no_show" && (
                                            <Button size="sm" onClick={() => handleCheckout(slot.id)} className="flex items-center gap-1">
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
        </div>
    );
}
