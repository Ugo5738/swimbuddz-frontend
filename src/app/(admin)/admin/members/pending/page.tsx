"use client";

import { Card } from "@/components/ui/Card";
import { getCurrentAccessToken } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import {
  Briefcase,
  CheckCircle,
  Clock,
  Eye,
  MapPin,
  MessageSquare,
  User,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface PendingMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  profile_photo_url?: string;
  phone?: string;
  city?: string;
  country?: string;
  swim_level?: string;
  created_at: string;
  // About You fields
  occupation?: string;
  area_in_lagos?: string;
  how_found_us?: string;
  previous_communities?: string;
  hopes_from_swimbuddz?: string;
  community_rules_accepted?: boolean;
  // Approval fields
  approval_status: string;
  approval_notes?: string;
}

export default function PendingMembersPage() {
  const router = useRouter();
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<PendingMember | null>(
    null,
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchPendingMembers();
  }, []);

  const fetchPendingMembers = async () => {
    try {
      const token = await getCurrentAccessToken();
      const response = await fetch(
        `${API_BASE_URL}/api/v1/members/admin/members/pending`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch pending members");
      }

      const data = await response.json();
      setPendingMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (memberId: string) => {
    setActionLoading(memberId);
    try {
      const token = await getCurrentAccessToken();
      const response = await fetch(
        `${API_BASE_URL}/api/v1/members/admin/members/${memberId}/approve`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ notes }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to approve member");
      }

      // Remove from list and close modal
      setPendingMembers((prev) => prev.filter((m) => m.id !== memberId));
      setSelectedMember(null);
      setNotes("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to approve member");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (memberId: string) => {
    if (!notes.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }

    setActionLoading(memberId);
    try {
      const token = await getCurrentAccessToken();
      const response = await fetch(
        `${API_BASE_URL}/api/v1/members/admin/members/${memberId}/reject`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ notes }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to reject member");
      }

      // Remove from list and close modal
      setPendingMembers((prev) => prev.filter((m) => m.id !== memberId));
      setSelectedMember(null);
      setNotes("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reject member");
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
        <p className="text-lg font-medium text-slate-600">
          Loading pending members...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchPendingMembers}
          className="text-cyan-600 hover:text-cyan-700"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Pending Registrations
          </h1>
          <p className="text-slate-600 mt-1">
            Review and approve new member applications
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Clock className="h-4 w-4" />
          <span>{pendingMembers.length} pending</span>
        </div>
      </div>

      {/* Empty State */}
      {pendingMembers.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            All caught up!
          </h3>
          <p className="text-slate-600">No pending registrations to review.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingMembers.map((member) => (
            <Card
              key={member.id}
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedMember(member)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center overflow-hidden">
                    {member.profile_photo_url ? (
                      <img
                        src={member.profile_photo_url}
                        alt={`${member.first_name} ${member.last_name}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {member.first_name} {member.last_name}
                    </h3>
                    <p className="text-sm text-slate-600">{member.email}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                      {member.area_in_lagos && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {member.area_in_lagos}
                        </span>
                      )}
                      {member.occupation && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {member.occupation}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                    <Clock className="h-3 w-3" />
                    Pending
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatDate(member.created_at)}
                  </p>
                </div>
              </div>

              {/* Quick preview of hopes */}
              {member.hopes_from_swimbuddz && (
                <div className="mt-4 p-3 rounded-lg bg-slate-50">
                  <p className="text-xs font-medium text-slate-500 mb-1">
                    What they hope to get:
                  </p>
                  <p className="text-sm text-slate-700 line-clamp-2">
                    {member.hopes_from_swimbuddz}
                  </p>
                </div>
              )}

              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMember(member);
                  }}
                  className="px-4 py-2 text-sm font-medium text-cyan-700 hover:bg-cyan-50 rounded-lg transition-colors"
                >
                  <Eye className="h-4 w-4 inline mr-1" />
                  Review
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">
                  Review Application
                </h2>
                <button
                  onClick={() => {
                    setSelectedMember(null);
                    setNotes("");
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Profile Header */}
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center overflow-hidden">
                  {selectedMember.profile_photo_url ? (
                    <img
                      src={selectedMember.profile_photo_url}
                      alt={`${selectedMember.first_name} ${selectedMember.last_name}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-8 w-8 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {selectedMember.first_name} {selectedMember.last_name}
                  </h3>
                  <p className="text-slate-600">{selectedMember.email}</p>
                  {selectedMember.phone && (
                    <p className="text-sm text-slate-500">
                      {selectedMember.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-slate-50">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Location
                  </p>
                  <p className="text-slate-900 mt-1">
                    {selectedMember.area_in_lagos ||
                      selectedMember.city ||
                      "Not specified"}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-slate-50">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Swim Level
                  </p>
                  <p className="text-slate-900 mt-1 capitalize">
                    {selectedMember.swim_level?.replace("_", " ") ||
                      "Not specified"}
                  </p>
                </div>
              </div>

              {/* About You Answers */}
              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  About You Responses
                </h4>

                {selectedMember.occupation && (
                  <div className="p-4 rounded-lg border border-slate-200">
                    <p className="text-xs font-medium text-slate-500 mb-1">
                      Work/School
                    </p>
                    <p className="text-slate-900">
                      {selectedMember.occupation}
                    </p>
                  </div>
                )}

                {selectedMember.how_found_us && (
                  <div className="p-4 rounded-lg border border-slate-200">
                    <p className="text-xs font-medium text-slate-500 mb-1">
                      How they found SwimBuddz
                    </p>
                    <p className="text-slate-900">
                      {selectedMember.how_found_us}
                    </p>
                  </div>
                )}

                {selectedMember.previous_communities && (
                  <div className="p-4 rounded-lg border border-slate-200">
                    <p className="text-xs font-medium text-slate-500 mb-1">
                      Previous Communities
                    </p>
                    <p className="text-slate-900">
                      {selectedMember.previous_communities}
                    </p>
                  </div>
                )}

                {selectedMember.hopes_from_swimbuddz && (
                  <div className="p-4 rounded-lg border border-slate-200 bg-cyan-50/50">
                    <p className="text-xs font-medium text-cyan-700 mb-1">
                      What they hope to get from SwimBuddz
                    </p>
                    <p className="text-slate-900">
                      {selectedMember.hopes_from_swimbuddz}
                    </p>
                  </div>
                )}

                <div className="p-4 rounded-lg border border-slate-200">
                  <p className="text-xs font-medium text-slate-500 mb-1">
                    Community Rules
                  </p>
                  <p className="text-slate-900">
                    {selectedMember.community_rules_accepted ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" /> Accepted
                      </span>
                    ) : (
                      <span className="text-amber-600">Not yet accepted</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Admin Notes (optional for approval, required for rejection)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this application..."
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => handleReject(selectedMember.id)}
                disabled={actionLoading === selectedMember.id}
                className="px-6 py-2.5 rounded-lg border-2 border-red-200 text-red-700 font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                <XCircle className="h-4 w-4 inline mr-1" />
                Reject
              </button>
              <button
                onClick={() => handleApprove(selectedMember.id)}
                disabled={actionLoading === selectedMember.id}
                className="px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading === selectedMember.id ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Processing...
                  </span>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 inline mr-1" />
                    Approve Member
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
