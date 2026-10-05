"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { supabase } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Pencil,
  Search,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Av,
  IBtn,
  KV,
  MemberForm,
  MobileBtn,
  StatCard,
  StatusBadge,
} from "./components";
import { EMPTY_FORM, PER_PAGE } from "./constants";
import type { ApprovalAction, FilterTab, Member } from "./types";
import {
  apiFetch,
  hasActiveClub,
  hasProgrammeRequest,
  membershipNeedsAction,
  programmeLabel,
  statusTone,
} from "./utils";

// ---------------------------------------------------------------------------
// Canonical programme presentation
// ---------------------------------------------------------------------------

function formatAdminDate(value?: string) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusPill({ label, status }: { label: string; status?: string }) {
  const tone = statusTone(status);
  const classes = {
    success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    warning: "bg-amber-50 text-amber-700 ring-amber-200",
    danger: "bg-rose-50 text-rose-700 ring-rose-200",
    neutral: "bg-slate-50 text-slate-500 ring-slate-200",
  }[tone];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${classes}`}>
      {label}
    </span>
  );
}

function MembershipSummary({ member }: { member: Member }) {
  const status = member.annual_membership_status || "inactive";
  const label = member.annual_membership_label || "Inactive";
  const until = formatAdminDate(member.annual_membership_paid_until);
  return (
    <div className="space-y-1">
      <StatusPill label={label} status={status} />
      {until && <p className="text-xs text-slate-400">Until {until}</p>}
    </div>
  );
}

function ProgrammeSummary({ member }: { member: Member }) {
  const programmes = [
    ["club", member.club_programme_status, member.club_programme_label],
    ["academy", member.academy_programme_status, member.academy_programme_label],
  ] as const;
  const visible = programmes.filter(([, status]) => status && status !== "inactive");
  if (!visible.length) return <span className="text-xs text-slate-400">No active programme</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map(([programme, status, label]) => (
        <StatusPill
          key={programme}
          label={`${programmeLabel(programme)} · ${label || status}`}
          status={status}
        />
      ))}
    </div>
  );
}

function ClubPlacement({ member }: { member: Member }) {
  if (!member.current_club_name) {
    return member.club_programme_status === "active" ? (
      <div>
        <p className="font-medium text-slate-700">Club access</p>
        <p className="text-xs text-amber-600">No current home Club</p>
      </div>
    ) : (
      <span className="text-slate-300">—</span>
    );
  }
  return (
    <div>
      <p className="font-medium text-slate-700">{member.current_club_name}</p>
      <p className="text-xs text-slate-400">{member.current_pod_name || "Pod not assigned"}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [page, setPage] = useState(1);

  // Modal state
  const [formModal, setFormModal] = useState<"create" | "edit" | null>(null);
  const [approvalModal, setApprovalModal] = useState<{
    member: Member;
    action: ApprovalAction;
  } | null>(null);
  const [deleteModal, setDeleteModal] = useState<Member | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // ---- Fetch ----
  const fetchMembers = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiFetch("/api/v1/members/");
      setMembers(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // ---- Derived data ----
  const counts = useMemo(() => {
    const c = { all: 0, pending: 0, membership_due: 0, programme_requests: 0, club: 0 };
    for (const m of members) {
      c.all++;
      if (m.approval_status === "pending") c.pending++;
      if (membershipNeedsAction(m)) c.membership_due++;
      if (hasProgrammeRequest(m)) c.programme_requests++;
      if (hasActiveClub(m)) c.club++;
    }
    return c;
  }, [members]);

  const filtered = useMemo(() => {
    let list = members;
    if (filterTab === "pending") list = list.filter((m) => m.approval_status === "pending");
    else if (filterTab === "membership_due") list = list.filter(membershipNeedsAction);
    else if (filterTab === "programme_requests") list = list.filter(hasProgrammeRequest);
    else if (filterTab === "club") list = list.filter(hasActiveClub);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q)
      );
    }
    return list;
  }, [members, filterTab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
  useEffect(() => {
    setPage(1);
  }, [filterTab, search]);

  // ---- Form helpers ----
  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const openCreate = () => {
    setFormData(EMPTY_FORM);
    setEditingMember(null);
    setFormModal("create");
  };
  const openEdit = (m: Member) => {
    setEditingMember(m);
    setFormData({
      first_name: m.first_name,
      last_name: m.last_name,
      email: m.email,
      phone: m.phone || "",
      swim_level: m.swim_level || "Beginner",
      location_preference: Array.isArray(m.location_preference)
        ? m.location_preference[0]
        : m.location_preference || "Ikoyi",
      membership_tier: m.membership_tier || "community",
      city: m.city || "",
      country: m.country || "Nigeria",
      emergency_contact_name: m.emergency_contact_name || "",
      emergency_contact_phone: m.emergency_contact_phone || "",
      medical_info: m.medical_info || "",
      goals_narrative: m.goals_narrative || "",
    });
    setFormModal("edit");
  };
  const openApproval = (member: Member, action: ApprovalAction) => {
    setApprovalModal({ member, action });
    setApprovalNotes("");
  };

  // ---- API actions ----
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiFetch("/api/v1/members/", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          auth_id: `admin-created-${crypto.randomUUID()}`,
          location_preference: [formData.location_preference],
          registration_complete: true,
          approval_status: "approved",
        }),
      });
      toast.success("Member created");
      setFormModal(null);
      await fetchMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setIsSubmitting(true);
    try {
      await apiFetch(`/api/v1/admin/members/${editingMember.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...formData, location_preference: [formData.location_preference] }),
      });
      toast.success("Member updated");
      setFormModal(null);
      await fetchMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproval = async () => {
    if (!approvalModal) return;
    const { member, action } = approvalModal;
    setIsSubmitting(true);
    try {
      const paths: Record<ApprovalAction, string> = {
        approve: `/api/v1/admin/members/${member.id}/approve`,
        reject: `/api/v1/admin/members/${member.id}/reject`,
      };
      await apiFetch(paths[action], {
        method: "POST",
        body: JSON.stringify({ notes: approvalNotes }),
      });
      toast.success({ approve: "Member approved", reject: "Member rejected" }[action]);
      setApprovalModal(null);
      await fetchMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${action}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (mode: "soft" | "hard") => {
    if (!deleteModal) return;
    const { id, first_name, last_name } = deleteModal;
    const name = `${first_name} ${last_name}`;
    if (mode === "hard" && !confirm(`Permanently delete ${name}? This cannot be undone.`)) return;
    setDeletingIds((prev) => new Set(prev).add(id));
    setDeleteModal(null);
    try {
      await apiFetch(`/api/v1/admin/cleanup/members/${id}`, {
        method: "POST",
        body: JSON.stringify({ mode }),
      });
      toast.success(`${name} deleted`);
      await fetchMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    }
  };

  // ---- Tab config ----
  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending approval" },
    { key: "membership_due", label: "Membership due" },
    { key: "programme_requests", label: "Programme requests" },
    { key: "club", label: "Club" },
  ];

  // ---- Render ----
  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600">Admin</p>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-4xl">Members</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage people, annual Membership, independent programmes, and Club placement.
          </p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" /> Create Member
        </Button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total Members"
          value={counts.all}
          icon={<Users className="h-5 w-5 text-slate-400" />}
        />
        <StatCard
          label="Pending Approval"
          value={counts.pending}
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          accent={counts.pending > 0}
        />
        <StatCard
          label="Membership Due"
          value={counts.membership_due}
          icon={<XCircle className="h-5 w-5 text-rose-500" />}
          accent={counts.membership_due > 0}
        />
        <StatCard
          label="Active Club"
          value={counts.club}
          icon={<CheckCircle className="h-5 w-5 text-emerald-500" />}
        />
      </div>

      {/* Search + tabs */}
      <div className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-px">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterTab(key)}
              className={`relative shrink-0 px-3 py-2 text-sm font-medium transition ${filterTab === key ? "text-cyan-700" : "text-slate-500 hover:text-slate-700"}`}
            >
              {label}
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${filterTab === key ? "bg-cyan-100 text-cyan-700" : "bg-slate-100 text-slate-500"}`}
              >
                {counts[key]}
              </span>
              {filterTab === key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-600" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table / list */}
      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <LoadingSpinner size="lg" text="Loading members..." />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-500">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            {search
              ? "No members match your search."
              : `No ${filterTab === "all" ? "" : filterTab + " "}members found.`}
          </div>
        ) : (
          <>
            {/* ---- Mobile list ---- */}
            <div className="divide-y divide-slate-100 sm:hidden">
              {pageItems.map((m) => {
                const del = deletingIds.has(m.id);
                return (
                  <div key={m.id} className={`space-y-3 p-4 ${del ? "opacity-50" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/admin/members/${m.id}`}
                          className="block truncate font-medium text-slate-900 hover:text-cyan-700"
                        >
                          {m.first_name} {m.last_name}
                        </Link>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{m.email}</p>
                      </div>
                      <StatusBadge s={m.approval_status} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="mb-1 uppercase tracking-wide text-slate-400">Membership</p>
                        <MembershipSummary member={m} />
                      </div>
                      <div>
                        <p className="mb-1 uppercase tracking-wide text-slate-400">Club / Pod</p>
                        <ClubPlacement member={m} />
                      </div>
                    </div>
                    <div>
                      <p className="mb-1 uppercase tracking-wide text-slate-400">Programmes</p>
                      <ProgrammeSummary member={m} />
                    </div>
                    <div className="flex items-center gap-1 border-t border-slate-100 pt-3">
                      <MobileBtn href={`/admin/members/${m.id}`}>
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </MobileBtn>
                      <MobileBtn onClick={() => openEdit(m)}>
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </MobileBtn>
                      {m.approval_status === "pending" && (
                        <>
                          <MobileBtn onClick={() => openApproval(m, "approve")} color="green">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Approve
                          </MobileBtn>
                          <MobileBtn onClick={() => openApproval(m, "reject")} color="red">
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </MobileBtn>
                        </>
                      )}
                      <button
                        onClick={() => !del && setDeleteModal(m)}
                        disabled={del}
                        aria-label="Delete"
                        className="rounded-lg bg-slate-100 p-2 text-slate-400 hover:bg-red-100 hover:text-red-600 disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ---- Desktop table ---- */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Member</th>
                    <th className="px-4 py-3 font-semibold">Membership</th>
                    <th className="px-4 py-3 font-semibold">Programmes</th>
                    <th className="px-4 py-3 font-semibold">Club / Pod</th>
                    <th className="px-4 py-3 font-semibold">Account</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageItems.map((m) => {
                    const del = deletingIds.has(m.id);
                    return (
                      <tr key={m.id} className={del ? "bg-slate-50 opacity-50" : "hover:bg-slate-50"}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Av m={m} />
                            <div className="min-w-0">
                              <Link
                                href={`/admin/members/${m.id}`}
                                className="block truncate font-medium text-slate-900 hover:text-cyan-700"
                              >
                                {m.first_name} {m.last_name}
                              </Link>
                              <p className="truncate text-xs text-slate-400">{m.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><MembershipSummary member={m} /></td>
                        <td className="px-4 py-3"><ProgrammeSummary member={m} /></td>
                        <td className="px-4 py-3"><ClubPlacement member={m} /></td>
                        <td className="px-4 py-3"><StatusBadge s={m.approval_status} /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <IBtn href={`/admin/members/${m.id}`} title="View">
                              <Eye className="h-4 w-4" />
                            </IBtn>
                            <IBtn onClick={() => openEdit(m)} title="Edit">
                              <Pencil className="h-4 w-4" />
                            </IBtn>
                            {m.approval_status === "pending" && (
                              <>
                                <IBtn onClick={() => openApproval(m, "approve")} title="Approve" className="text-green-600 hover:bg-green-50">
                                  <CheckCircle className="h-4 w-4" />
                                </IBtn>
                                <IBtn onClick={() => openApproval(m, "reject")} title="Reject" className="text-red-500 hover:bg-red-50">
                                  <XCircle className="h-4 w-4" />
                                </IBtn>
                              </>
                            )}
                            <IBtn
                              onClick={() => !del && setDeleteModal(m)}
                              title="Delete"
                              className="text-slate-400 hover:bg-red-50 hover:text-red-600"
                              disabled={del}
                            >
                              <Trash2 className="h-4 w-4" />
                            </IBtn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
                <span>
                  {(safePage - 1) * PER_PAGE + 1}&ndash;
                  {Math.min(safePage * PER_PAGE, filtered.length)} of {filtered.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="rounded p-1.5 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-2 font-medium">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    className="rounded p-1.5 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* ==== Modals ==== */}

      {/* Approval modal */}
      <Modal
        isOpen={!!approvalModal}
        onClose={() => setApprovalModal(null)}
        title={
          { approve: "Approve Member", reject: "Reject Member" }[approvalModal?.action || "approve"]
        }
      >
        {approvalModal &&
          (() => {
            const { member: am, action } = approvalModal;
            const colors: Record<ApprovalAction, string> = {
              approve: "bg-green-600 hover:bg-green-700",
              reject: "bg-red-600 hover:bg-red-700",
            };
            const labels: Record<ApprovalAction, [string, string]> = {
              approve: ["Approving...", "Approve Member"],
              reject: ["Rejecting...", "Reject Member"],
            };
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                  <Av m={am} />
                  <div>
                    <p className="font-medium text-slate-900">
                      {am.first_name} {am.last_name}
                    </p>
                    <p className="text-xs text-slate-500">{am.email}</p>
                    <p className="mt-0.5 text-xs text-slate-500">SwimBuddz member profile</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600">
                  {action === "approve"
                    ? `Approve ${am.first_name} ${am.last_name}?`
                    : `Reject ${am.first_name} ${am.last_name}?`}
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-slate-50 p-3 text-xs">
                    <KV k="Location" v={am.city || am.area_in_lagos} />
                    <KV k="Occupation" v={am.occupation} />
                    <KV k="How found us" v={am.how_found_us} />
                    <KV k="Swim level" v={am.swim_level} />
                    {am.emergency_contact_name && (
                      <KV k="Emergency" v={am.emergency_contact_name} />
                    )}
                    {am.medical_info && <KV k="Medical" v={am.medical_info} />}
                  </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Notes (optional)
                  </label>
                  <textarea
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    rows={2}
                    placeholder={action === "reject" ? "Reason for rejection..." : "Any notes..."}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="secondary" onClick={() => setApprovalModal(null)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleApproval}
                    disabled={isSubmitting}
                    className={colors[action]}
                  >
                    {isSubmitting ? labels[action][0] : labels[action][1]}
                  </Button>
                </div>
              </div>
            );
          })()}
      </Modal>

      {/* Delete modal */}
      <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete Member">
        {deleteModal && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Choose how to remove{" "}
              <strong>
                {deleteModal.first_name} {deleteModal.last_name}
              </strong>
              . Soft delete deactivates the account. Hard delete permanently removes all data.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => handleDelete("soft")}>
                Soft Delete
              </Button>
              <Button variant="danger" onClick={() => handleDelete("hard")}>
                Hard Delete
              </Button>
              <Button variant="outline" onClick={() => setDeleteModal(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create modal */}
      <Modal
        isOpen={formModal === "create"}
        onClose={() => setFormModal(null)}
        title="Create New Member"
      >
        <MemberForm
          data={formData}
          onChange={handleInput}
          onSubmit={handleCreate}
          onCancel={() => setFormModal(null)}
          submitting={isSubmitting}
          label="Create Member"
          note="Admin-created members are automatically approved."
        />
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={formModal === "edit"} onClose={() => setFormModal(null)} title="Edit Member">
        <MemberForm
          data={formData}
          onChange={handleInput}
          onSubmit={handleUpdate}
          onCancel={() => setFormModal(null)}
          submitting={isSubmitting}
          label="Save Changes"
          isEdit
        />
      </Modal>
    </div>
  );
}
