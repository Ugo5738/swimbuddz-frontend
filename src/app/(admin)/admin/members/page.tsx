"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { supabase } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { CheckCircle, Clock, Eye, Pencil, Trash2, TrendingUp, UserPlus, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Define Member type based on backend response
interface Member {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    swim_level: string;
    location_preference: string[];
    registration_complete: boolean;
    is_active: boolean;
    approval_status: "pending" | "approved" | "rejected";
    approved_at?: string;
    approved_by?: string;
    approval_notes?: string;

    // Additional comprehensive fields
    membership_tier?: string;
    city?: string;
    country?: string;
    time_zone?: string;
    deep_water_comfort?: string;
    goals_narrative?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    medical_info?: string;
    profile_photo_url?: string;
    date_of_birth?: string;
    gender?: string;

    // Vetting fields
    occupation?: string;
    area_in_lagos?: string;
    how_found_us?: string;
    previous_communities?: string;
    hopes_from_swimbuddz?: string;

    // Upgrade flow
    requested_membership_tiers?: string[];
}

type FilterTab = "all" | "pending" | "approved" | "rejected" | "upgrades";

export default function AdminMembersPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterTab, setFilterTab] = useState<FilterTab>("all");

    // Create Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<Member | null>(null);

    // Approval Modal State
    const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
    const [approvingMember, setApprovingMember] = useState<Member | null>(null);
    const [approvalNotes, setApprovalNotes] = useState("");
    const [approvalAction, setApprovalAction] = useState<"approve" | "reject" | "upgrade">("approve"); // Added upgrade

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingMember, setDeletingMember] = useState<Member | null>(null);
    const [deletingMemberIds, setDeletingMemberIds] = useState<Set<string>>(new Set());

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        swim_level: "Beginner",
        location_preference: "Ikoyi",
        membership_tier: "community",
        city: "",
        country: "Nigeria",
        emergency_contact_name: "",
        emergency_contact_phone: "",
        medical_info: "",
        goals_narrative: "",
    });

    const fetchMembers = async () => {
        try {
            setIsLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) {
                setError("Not authenticated");
                return;
            }

            const res = await fetch(`${API_BASE_URL}/api/v1/members/`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch members");
            const data = await res.json();
            setMembers(data);
            setError(null);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setFormData({
            first_name: "",
            last_name: "",
            email: "",
            phone: "",
            swim_level: "Beginner",
            location_preference: "Ikoyi",
            membership_tier: "community",
            city: "",
            country: "Nigeria",
            emergency_contact_name: "",
            emergency_contact_phone: "",
            medical_info: "",
            goals_narrative: "",
        });
    };

    const openCreateModal = () => {
        resetForm();
        setIsCreateModalOpen(true);
    };

    const openEditModal = (member: Member) => {
        setEditingMember(member);
        setFormData({
            first_name: member.first_name,
            last_name: member.last_name,
            email: member.email,
            phone: member.phone || "",
            swim_level: member.swim_level || "Beginner",
            location_preference: Array.isArray(member.location_preference)
                ? member.location_preference[0]
                : member.location_preference || "Ikoyi",
            membership_tier: member.membership_tier || "community",
            city: member.city || "",
            country: member.country || "Nigeria",
            emergency_contact_name: member.emergency_contact_name || "",
            emergency_contact_phone: member.emergency_contact_phone || "",
            medical_info: member.medical_info || "",
            goals_narrative: member.goals_narrative || "",
        });
        setIsEditModalOpen(true);
    };

    const openApprovalModal = (member: Member, action: "approve" | "reject" | "upgrade") => {
        setApprovingMember(member);
        setApprovalAction(action);
        setApprovalNotes("");
        setIsApprovalModalOpen(true);
    };

    const handleCreateMember = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Generate a placeholder auth_id since this is admin-created
            const auth_id = `admin-created-${crypto.randomUUID()}`;

            const payload = {
                ...formData,
                auth_id,
                location_preference: [formData.location_preference], // Backend expects list
                registration_complete: true,
                approval_status: "approved", // Admin-created members are auto-approved
            };

            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch(`${API_BASE_URL}/api/v1/members/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || "Failed to create member");
            }

            await fetchMembers();
            setIsCreateModalOpen(false);
            resetForm();
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to create member");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingMember) return;

        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                location_preference: [formData.location_preference], // Backend expects list
            };

            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch(`${API_BASE_URL}/api/v1/members/${editingMember.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || "Failed to update member");
            }

            await fetchMembers();
            setIsEditModalOpen(false);
            setEditingMember(null);
            resetForm();
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to update member");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApprovalAction = async () => {
        if (!approvingMember) return;

        setIsSubmitting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            let endpoint = "";
            if (approvalAction === "approve") {
                endpoint = `${API_BASE_URL}/api/v1/admin/members/${approvingMember.id}/approve`;
            } else if (approvalAction === "reject") {
                endpoint = `${API_BASE_URL}/api/v1/admin/members/${approvingMember.id}/reject`;
            } else if (approvalAction === "upgrade") {
                endpoint = `${API_BASE_URL}/api/v1/admin/members/${approvingMember.id}/approve-upgrade`;
            }

            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ notes: approvalNotes }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || `Failed to ${approvalAction} member`);
            }

            await fetchMembers();
            setIsApprovalModalOpen(false);
            setApprovingMember(null);
            setApprovalNotes("");
        } catch (err) {
            alert(err instanceof Error ? err.message : `Failed to ${approvalAction} member`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const openDeleteModal = (member: Member) => {
        setDeletingMember(member);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteMember = async (memberId: string, memberName: string, mode: "soft" | "hard") => {
        if (mode === "hard" && !confirm(`Hard delete ${memberName}? This cannot be undone.`)) {
            return;
        }

        setDeletingMemberIds((prev) => {
            const next = new Set(prev);
            next.add(memberId);
            return next;
        });
        setIsDeleteModalOpen(false);
        setDeletingMember(null);
        toast.message(`${mode === "hard" ? "Hard delete" : "Soft delete"} started for ${memberName}.`);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch(`${API_BASE_URL}/api/v1/admin/cleanup/members/${memberId}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ mode })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.detail || "Failed to delete member");
            }

            await fetchMembers();
            toast.success(`${memberName} deleted.`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to delete member");
        } finally {
            setDeletingMemberIds((prev) => {
                const next = new Set(prev);
                next.delete(memberId);
                return next;
            });
        }
    };

    // Filter members based on selected tab
    const filteredMembers = members.filter(member => {
        if (filterTab === "all") return true;
        if (filterTab === "upgrades") {
            return member.requested_membership_tiers && member.requested_membership_tiers.length > 0;
        }
        return member.approval_status === filterTab;
    });

    // Count for each status
    const counts = {
        all: members.length,
        pending: members.filter(m => m.approval_status === "pending").length,
        approved: members.filter(m => m.approval_status === "approved").length,
        rejected: members.filter(m => m.approval_status === "rejected").length,
        upgrades: members.filter(m => m.requested_membership_tiers && m.requested_membership_tiers.length > 0).length,
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "approved":
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                        <CheckCircle className="h-3 w-3" />
                        Approved
                    </span>
                );
            case "rejected":
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                        <XCircle className="h-3 w-3" />
                        Rejected
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                        <Clock className="h-3 w-3" />
                        Pending
                    </span>
                );
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Header - Responsive layout */}
            <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1 sm:space-y-2">
                    <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-cyan-600">Admin</p>
                    <h1 className="text-2xl sm:text-4xl font-bold text-slate-900">Members</h1>
                    <p className="text-xs sm:text-sm text-slate-600">Manage community members and approve registrations.</p>
                </div>
                <Button onClick={openCreateModal} className="flex items-center justify-center gap-2 w-full sm:w-auto">
                    <UserPlus className="h-4 w-4" />
                    <span className="sm:inline">Create Member</span>
                </Button>
            </header>

            {/* Filter Tabs - Horizontally scrollable on mobile */}
            <div className="relative -mx-3 sm:mx-0">
                <div className="flex gap-1 sm:gap-2 border-b border-slate-200 overflow-x-auto px-3 sm:px-0 scrollbar-hide">
                    {(["all", "pending", "approved", "rejected", "upgrades"] as FilterTab[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setFilterTab(tab)}
                            className={`px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap flex-shrink-0 ${filterTab === tab
                                ? "text-cyan-700"
                                : "text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            <span className="capitalize">{tab}</span>
                            <span className={`ml-1.5 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${filterTab === tab
                                ? "bg-cyan-100 text-cyan-700"
                                : "bg-slate-100 text-slate-500"
                                }`}>
                                {counts[tab]}
                            </span>
                            {filterTab === tab && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-600" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Pending Approval/Upgrade Alert */}
            {(counts.pending > 0 && filterTab !== "pending" || counts.upgrades > 0 && filterTab !== "upgrades") && (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-amber-600" />
                        <span className="text-amber-800">
                            {counts.pending > 0 && <span><strong>{counts.pending}</strong> new registration(s)</span>}
                            {counts.pending > 0 && counts.upgrades > 0 && <span> and </span>}
                            {counts.upgrades > 0 && <span><strong>{counts.upgrades}</strong> upgrade request(s)</span>}
                            <span> awaiting action.</span>
                        </span>
                    </div>
                </div>
            )}

            <Card className="overflow-hidden">
                {isLoading ? (
                    <div className="flex min-h-[300px] sm:min-h-[400px] items-center justify-center">
                        <LoadingSpinner size="lg" text="Loading members..." />
                    </div>
                ) : error ? (
                    <div className="p-4 text-center text-red-500">Error: {error}</div>
                ) : filteredMembers.length === 0 ? (
                    <div className="p-6 sm:p-8 text-center text-slate-500">
                        {filterTab === "all"
                            ? "No members found. Create one to get started."
                            : `No ${filterTab} members found.`}
                    </div>
                ) : (
                    <>
                        {/* Mobile Card View */}
                        <div className="divide-y divide-slate-100 sm:hidden">
                            {filteredMembers.map((member) => {
                                const isDeletingMember = deletingMemberIds.has(member.id);
                                return (
                                    <div
                                        key={member.id}
                                        className={`p-4 ${isDeletingMember ? "bg-slate-50 opacity-60" : ""}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <Link
                                                    href={`/admin/members/${member.id}`}
                                                    className="font-medium text-slate-900 hover:text-cyan-700 block truncate"
                                                >
                                                    {member.first_name} {member.last_name}
                                                </Link>
                                                <p className="text-xs text-slate-500 truncate mt-0.5">{member.email}</p>
                                            </div>
                                            {getStatusBadge(member.approval_status)}
                                        </div>

                                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                            <span className="capitalize bg-slate-100 px-2 py-0.5 rounded">
                                                {member.membership_tier || "community"}
                                            </span>
                                            <span>{member.swim_level}</span>
                                            {member.requested_membership_tiers && member.requested_membership_tiers.length > 0 && (
                                                <span className="text-purple-600 font-medium">
                                                    ➞ {member.requested_membership_tiers.join(", ")}
                                                </span>
                                            )}
                                        </div>

                                        {/* Mobile Actions */}
                                        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100">
                                            <Link
                                                href={`/admin/members/${member.id}`}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                View
                                            </Link>
                                            <button
                                                onClick={() => openEditModal(member)}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                                Edit
                                            </button>
                                            {member.approval_status === "pending" && (
                                                <>
                                                    <button
                                                        onClick={() => openApprovalModal(member, "approve")}
                                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-100 text-green-700 text-xs font-medium hover:bg-green-200 transition"
                                                    >
                                                        <CheckCircle className="h-3.5 w-3.5" />
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => openApprovalModal(member, "reject")}
                                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-100 text-red-700 text-xs font-medium hover:bg-red-200 transition"
                                                    >
                                                        <XCircle className="h-3.5 w-3.5" />
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                            {member.approval_status === "approved" && member.requested_membership_tiers && member.requested_membership_tiers.length > 0 && (
                                                <button
                                                    onClick={() => openApprovalModal(member, "upgrade")}
                                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-purple-100 text-purple-700 text-xs font-medium hover:bg-purple-200 transition"
                                                >
                                                    <TrendingUp className="h-3.5 w-3.5" />
                                                    Upgrade
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    if (isDeletingMember) return;
                                                    openDeleteModal(member);
                                                }}
                                                className="p-2 rounded-lg bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-600 transition disabled:opacity-50"
                                                disabled={isDeletingMember}
                                                aria-label="Delete"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Name</th>
                                        <th className="px-4 py-3 font-semibold">Contact</th>
                                        <th className="px-4 py-3 font-semibold">Tier</th>
                                        <th className="px-4 py-3 font-semibold">Level</th>
                                        <th className="px-4 py-3 font-semibold">Status</th>
                                        <th className="px-4 py-3 font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {filteredMembers.map((member) => {
                                        const isDeletingMember = deletingMemberIds.has(member.id);
                                        return (
                                            <tr
                                                key={member.id}
                                                className={isDeletingMember ? "bg-slate-50 opacity-60" : "hover:bg-slate-50"}
                                            >
                                                <td className="px-4 py-3 font-medium text-slate-900">
                                                    <Link href={`/admin/members/${member.id}`} className="hover:underline hover:text-cyan-700">
                                                        {member.first_name} {member.last_name}
                                                    </Link>
                                                    {member.requested_membership_tiers && member.requested_membership_tiers.length > 0 && (
                                                        <span className="ml-2 inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                                                            Upgrade Requested
                                                        </span>
                                                    )}
                                                    {isDeletingMember && (
                                                        <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                                            Deleting...
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span>{member.email}</span>
                                                        <span className="text-xs text-slate-400">{member.phone}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="capitalize">{member.membership_tier || "community"}</span>
                                                    {member.requested_membership_tiers && member.requested_membership_tiers.length > 0 && (
                                                        <div className="text-xs text-purple-600">
                                                            ➞ {member.requested_membership_tiers.join(", ")}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">{member.swim_level}</td>
                                                <td className="px-4 py-3">
                                                    {getStatusBadge(member.approval_status)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <Link
                                                            href={`/admin/members/${member.id}`}
                                                            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                                                            title="View"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Link>
                                                        <button
                                                            onClick={() => openEditModal(member)}
                                                            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-cyan-600"
                                                            title="Edit"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>

                                                        {/* Approve/Reject buttons for pending members */}
                                                        {member.approval_status === "pending" && (
                                                            <>
                                                                <button
                                                                    onClick={() => openApprovalModal(member, "approve")}
                                                                    className="p-1.5 rounded hover:bg-green-50 text-green-600 hover:text-green-700"
                                                                    title="Approve"
                                                                >
                                                                    <CheckCircle className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => openApprovalModal(member, "reject")}
                                                                    className="p-1.5 rounded hover:bg-red-50 text-red-500 hover:text-red-600"
                                                                    title="Reject"
                                                                >
                                                                    <XCircle className="h-4 w-4" />
                                                                </button>
                                                            </>
                                                        )}

                                                        {/* Approve Upgrade button */}
                                                        {member.approval_status === "approved" && member.requested_membership_tiers && member.requested_membership_tiers.length > 0 && (
                                                            <button
                                                                onClick={() => openApprovalModal(member, "upgrade")}
                                                                className="p-1.5 rounded hover:bg-purple-50 text-purple-600 hover:text-purple-700"
                                                                title="Approve Upgrade"
                                                            >
                                                                <TrendingUp className="h-4 w-4" />
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => {
                                                                if (isDeletingMember) return;
                                                                openDeleteModal(member);
                                                            }}
                                                            className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                                                            title="Delete"
                                                            disabled={isDeletingMember}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </Card>

            {/* Approval Modal */}
            <Modal
                isOpen={isApprovalModalOpen}
                onClose={() => setIsApprovalModalOpen(false)}
                title={
                    approvalAction === "upgrade"
                        ? "Approve Upgrade"
                        : approvalAction === "approve"
                            ? "Approve Member"
                            : "Reject Member"
                }
            >
                <div className="space-y-4">
                    <p className="text-slate-600">
                        {approvalAction === "approve"
                            ? `Are you sure you want to approve ${approvingMember?.first_name} ${approvingMember?.last_name}?`
                            : approvalAction === "upgrade"
                                ? `Approve ${approvingMember?.first_name} ${approvingMember?.last_name}'s upgrade from ${approvingMember?.membership_tier || "community"} to ${(approvingMember?.requested_membership_tiers || []).join(", ") || "the requested tier"}?`
                                : `Are you sure you want to reject ${approvingMember?.first_name} ${approvingMember?.last_name}?`}
                    </p>

                    {/* Member Details */}
                    {approvingMember && (
                        <div className="space-y-4">
                            {/* Profile Header */}
                            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="h-16 w-16 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 border-2 border-white shadow-sm">
                                    {approvingMember.profile_photo_url ? (
                                        <img
                                            src={approvingMember.profile_photo_url}
                                            alt={`${approvingMember.first_name}'s profile`}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-slate-400">
                                            <UserPlus className="h-8 w-8" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900 text-lg">
                                        {approvingMember.first_name} {approvingMember.last_name}
                                    </h3>
                                    <div className="text-sm text-slate-500 space-y-1">
                                        <p>{approvingMember.email}</p>
                                        <p>{approvingMember.phone}</p>
                                        <p className="capitalize text-cyan-700 font-medium">
                                            {approvingMember.membership_tier || "Community"} Member • {approvingMember.swim_level}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Personal Info */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b pb-1">
                                        Personal Info
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                        <div>
                                            <span className="text-slate-500 block text-xs">Location</span>
                                            <span className="text-slate-900">
                                                {approvingMember.city || "N/A"}, {approvingMember.country || "Nigeria"}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block text-xs">Date of Birth</span>
                                            <span className="text-slate-900">
                                                {approvingMember.date_of_birth ? new Date(approvingMember.date_of_birth).toLocaleDateString() : "N/A"}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block text-xs">Gender</span>
                                            <span className="text-slate-900 capitalize">{approvingMember.gender || "N/A"}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Emergency Contact */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b pb-1">
                                        Emergency Contact
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                        <div>
                                            <span className="text-slate-500 block text-xs">Name</span>
                                            <span className="text-slate-900">{approvingMember.emergency_contact_name || "N/A"}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block text-xs">Phone</span>
                                            <span className="text-slate-900">{approvingMember.emergency_contact_phone || "N/A"}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block text-xs">Medical Info</span>
                                            <span className="text-slate-900">{approvingMember.medical_info || "None provided"}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Vetting / Application Details */}
                            <div className="space-y-3 pt-2">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b pb-1">
                                    Application Details
                                </h4>
                                <div className="grid grid-cols-1 gap-3 text-sm bg-slate-50 p-3 rounded-lg">
                                    <div>
                                        <span className="text-slate-500 font-medium">Occupation: </span>
                                        <span className="text-slate-900">{approvingMember.occupation || "N/A"}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 font-medium">Area in Lagos: </span>
                                        <span className="text-slate-900">{approvingMember.area_in_lagos || "N/A"}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 font-medium">How found us: </span>
                                        <span className="text-slate-900">{approvingMember.how_found_us || "N/A"}</span>
                                    </div>
                                    {approvingMember.hopes_from_swimbuddz && (
                                        <div className="pt-1">
                                            <span className="text-slate-500 font-medium block mb-1">Hopes from SwimBuddz:</span>
                                            <p className="text-slate-900 bg-white p-2 rounded border border-slate-100 italic">
                                                "{approvingMember.hopes_from_swimbuddz}"
                                            </p>
                                        </div>
                                    )}
                                    {approvingMember.goals_narrative && (
                                        <div className="pt-1">
                                            <span className="text-slate-500 font-medium block mb-1">Swimming Goals:</span>
                                            <p className="text-slate-900 bg-white p-2 rounded border border-slate-100 italic">
                                                "{approvingMember.goals_narrative}"
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {approvalAction === "approve"
                                ? "Approval notes (optional)"
                                : approvalAction === "upgrade"
                                    ? "Upgrade notes (optional)"
                                    : "Reason for rejection (optional)"}
                        </label>
                        <textarea
                            value={approvalNotes}
                            onChange={(e) => setApprovalNotes(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            rows={3}
                            placeholder={
                                approvalAction === "approve"
                                    ? "Any notes about this approval..."
                                    : approvalAction === "upgrade"
                                        ? "Any notes about this upgrade..."
                                        : "Reason for rejection..."
                            }
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsApprovalModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleApprovalAction}
                            disabled={isSubmitting}
                            className={
                                approvalAction === "approve"
                                    ? "bg-green-600 hover:bg-green-700"
                                    : approvalAction === "upgrade"
                                        ? "bg-purple-600 hover:bg-purple-700"
                                        : "bg-red-600 hover:bg-red-700"
                            }
                        >
                            {isSubmitting
                                ? approvalAction === "approve"
                                    ? "Approving..."
                                    : approvalAction === "upgrade"
                                        ? "Approving upgrade..."
                                        : "Rejecting..."
                                : approvalAction === "approve"
                                    ? "Approve Member"
                                    : approvalAction === "upgrade"
                                        ? "Approve Upgrade"
                                        : "Reject Member"}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingMember(null);
                }}
                title="Delete member"
            >
                <p className="text-slate-600">
                    Choose how to remove {deletingMember?.first_name} {deletingMember?.last_name}.
                    Soft delete deactivates the account, hard delete permanently removes data.
                </p>
                <div className="flex flex-wrap gap-3">
                    <Button
                        variant="secondary"
                        onClick={() => {
                            if (!deletingMember) return;
                            handleDeleteMember(
                                deletingMember.id,
                                `${deletingMember.first_name} ${deletingMember.last_name}`,
                                "soft"
                            );
                        }}
                    >
                        Soft delete
                    </Button>
                    <Button
                        variant="danger"
                        onClick={() => {
                            if (!deletingMember) return;
                            handleDeleteMember(
                                deletingMember.id,
                                `${deletingMember.first_name} ${deletingMember.last_name}`,
                                "hard"
                            );
                        }}
                    >
                        Hard delete
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => {
                            setIsDeleteModalOpen(false);
                            setDeletingMember(null);
                        }}
                    >
                        Cancel
                    </Button>
                </div>
            </Modal>

            {/* Create Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create New Member"
            >
                <form onSubmit={handleCreateMember} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <Input
                            label="First Name"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleInputChange}
                            required
                        />
                        <Input
                            label="Last Name"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                    <Input
                        label="Email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                    />
                    <Input
                        label="Phone"
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <Select
                            label="Swim Level"
                            name="swim_level"
                            value={formData.swim_level}
                            onChange={handleInputChange}
                        >
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                            <option value="Pro">Pro</option>
                        </Select>
                        <Select
                            label="Membership Tier"
                            name="membership_tier"
                            value={formData.membership_tier}
                            onChange={handleInputChange}
                        >
                            <option value="community">Community</option>
                            <option value="club">Club</option>
                            <option value="academy">Academy</option>
                        </Select>
                    </div>
                    <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                        Note: Admin-created members are automatically approved.
                    </p>
                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                            {isSubmitting ? "Creating..." : "Create Member"}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Member"
            >
                <form onSubmit={handleUpdateMember} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <Input
                            label="First Name"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleInputChange}
                            required
                        />
                        <Input
                            label="Last Name"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                    <Input
                        label="Email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        disabled
                        hint="Email cannot be changed"
                    />
                    <Input
                        label="Phone"
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <Select
                            label="Swim Level"
                            name="swim_level"
                            value={formData.swim_level}
                            onChange={handleInputChange}
                        >
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                            <option value="Pro">Pro</option>
                        </Select>
                        <Select
                            label="Membership Tier"
                            name="membership_tier"
                            value={formData.membership_tier}
                            onChange={handleInputChange}
                        >
                            <option value="community">Community</option>
                            <option value="club">Club</option>
                            <option value="academy">Academy</option>
                        </Select>
                    </div>

                    {/* Location Details */}
                    <div className="border-t pt-4">
                        <h3 className="text-sm font-semibold mb-3 text-slate-700">Location</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <Input
                                label="City"
                                name="city"
                                value={formData.city}
                                onChange={handleInputChange}
                            />
                            <Input
                                label="Country"
                                name="country"
                                value={formData.country}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>

                    {/* Emergency Contact */}
                    <div className="border-t pt-4">
                        <h3 className="text-sm font-semibold mb-3 text-slate-700">Emergency Contact</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <Input
                                label="Contact Name"
                                name="emergency_contact_name"
                                value={formData.emergency_contact_name}
                                onChange={handleInputChange}
                            />
                            <Input
                                label="Contact Phone"
                                name="emergency_contact_phone"
                                value={formData.emergency_contact_phone}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsEditModalOpen(false)}
                            className="w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                            {isSubmitting ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div >
    );
}
