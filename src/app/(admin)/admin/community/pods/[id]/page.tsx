"use client";

/**
 * Admin pod detail — view, edit, manage members, dissolve, extend.
 *
 * Single page with three sections:
 *   1. Header + lifecycle actions (extend, dissolve)
 *   2. Editable pod fields (handle, leads, sizes, schedule, visibility)
 *   3. Members table with add / remove / transfer actions
 *
 * See docs/club/POD_OPERATIONS.md.
 */

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { listClubs, type Club } from "@/lib/clubs";
import { MembersApi, type MemberListItem } from "@/lib/members";
import {
  adminAddMember,
  adminDissolvePod,
  adminExtendPod,
  adminGetPod,
  adminRemoveMember,
  adminTransferMember,
  adminUpdatePod,
  formatDay,
  formatTime,
  podDisplayName,
  type DayOfWeek,
  type PodDetail,
  type PodMemberOut,
  type PodSummary,
  type PodUpdateInput,
  type PodVisibility,
} from "@/lib/pods";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  Calendar,
  CheckCircle,
  Clock,
  Pencil,
  Plus,
  RotateCw,
  Save,
  Trash2,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: "mon", label: "Monday" },
  { value: "tue", label: "Tuesday" },
  { value: "wed", label: "Wednesday" },
  { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" },
  { value: "sat", label: "Saturday" },
  { value: "sun", label: "Sunday" },
];

export default function AdminPodDetailPage() {
  const params = useParams<{ id: string }>();
  const podId = params?.id;
  const router = useRouter();

  const [pod, setPod] = useState<PodDetail | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [allPods, setAllPods] = useState<PodSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit form state (local — only flushes to server on save)
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<PodUpdateInput>({});
  const [saving, setSaving] = useState(false);

  // Member-management modals
  const [addingMember, setAddingMember] = useState(false);
  const [transferring, setTransferring] = useState<PodMemberOut | null>(null);

  // Lifecycle action loading flags
  const [extending, setExtending] = useState(false);
  const [dissolving, setDissolving] = useState(false);

  const load = async () => {
    if (!podId) return;
    setError(null);
    try {
      const detail = await adminGetPod(podId);
      setPod(detail);
      setEditForm(toEditForm(detail));

      // Load deps for member-add picker, transfer-target picker, etc.
      const [clubs, memberList] = await Promise.all([
        listClubs(false),
        MembersApi.listMembers(0, 500),
      ]);
      setClub(clubs.find((c) => c.id === detail.club_id) ?? null);
      setMembers(memberList);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pod");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [podId]);

  // Lazy-load other pods only when transfer modal opens — keeps the
  // initial render snappy.
  useEffect(() => {
    if (!transferring || allPods.length > 0 || !pod) return;
    void (async () => {
      try {
        const { listPublicPods } = await import("@/lib/pods");
        // Other pods in the same club only — that's the realistic transfer scope.
        const list = await listPublicPods(pod.club_id);
        setAllPods(list.filter((p) => p.id !== pod.id));
      } catch (e) {
        console.warn("Failed to load transfer targets", e);
      }
    })();
  }, [transferring, pod, allPods.length]);

  if (loading) return <LoadingPage />;

  if (!pod) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error ?? "Pod not found"}
        </Card>
      </div>
    );
  }

  const reviewOverdue =
    pod.status === "active" && new Date(pod.review_due_at) <= new Date();
  const isInactive = pod.status === "inactive";

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // Drop empty-string fields so the server doesn't try to set them to "".
      const cleaned: PodUpdateInput = {};
      for (const [k, v] of Object.entries(editForm)) {
        if (v === "" || v === null || v === undefined) continue;
        (cleaned as Record<string, unknown>)[k] = v;
      }
      await adminUpdatePod(pod.id, cleaned);
      await load();
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleExtend = async () => {
    if (!confirm("Reset the 3-month review cycle to start now?")) return;
    setExtending(true);
    try {
      await adminExtendPod(pod.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extend failed");
    } finally {
      setExtending(false);
    }
  };

  const handleDissolve = async () => {
    if (
      !confirm(
        `Dissolve "${podDisplayName(pod)}"? All members will be soft-removed and the chat channel will be archived. This is reversible only by re-creating the pod.`,
      )
    )
      return;
    setDissolving(true);
    try {
      await adminDissolvePod(pod.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dissolve failed");
    } finally {
      setDissolving(false);
    }
  };

  const handleRemoveMember = async (assignment: PodMemberOut) => {
    const member = members.find((m) => m.id === assignment.member_id);
    const name = memberDisplay(member, assignment.member_id);
    if (!confirm(`Remove ${name} from the pod? Their slot will free up immediately.`))
      return;
    try {
      await adminRemoveMember(pod.id, assignment.member_id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed");
    }
  };

  const memberOf = (id: string) => members.find((m) => m.id === id);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Top bar */}
      <div>
        <Link
          href="/admin/community/pods"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to pods
        </Link>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </Card>
      )}

      {/* Header card */}
      <Card className="overflow-hidden">
        <div className={`px-5 py-4 ${isInactive ? "bg-gray-50" : "bg-cyan-50"}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-gray-900">
                  {podDisplayName(pod)}
                </h1>
                <StatusBadge status={pod.status} />
                {pod.visibility === "private" && (
                  <Badge variant="default">Private</Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-600">
                {club?.name ?? "Unknown club"} · slug <code className="rounded bg-gray-100 px-1 text-xs">{pod.slug}</code>
              </p>
            </div>

            {!isInactive && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleExtend()}
                  disabled={extending}
                >
                  <RotateCw className="mr-2 h-4 w-4" />
                  {extending ? "Extending…" : "Extend cycle"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleDissolve()}
                  disabled={dissolving}
                  className="text-red-600 hover:bg-red-50"
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  {dissolving ? "Dissolving…" : "Dissolve"}
                </Button>
              </div>
            )}
          </div>

          {reviewOverdue && (
            <div className="mt-3 flex items-center gap-2 rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-900">
              <AlertTriangle className="h-4 w-4" />
              This pod is past its 3-month review. Decide whether to extend,
              rebalance members, or dissolve.
            </div>
          )}
          {isInactive && pod.dissolved_at && (
            <div className="mt-3 text-sm text-gray-600">
              Dissolved {new Date(pod.dissolved_at).toLocaleDateString()}.
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3 px-5 py-4 text-sm sm:grid-cols-4">
          <Stat icon={Users} label="Active members">
            {pod.active_member_count} / {pod.max_size}
          </Stat>
          <Stat icon={Calendar} label="Default day">
            {formatDay(pod.default_session_day, true)}
          </Stat>
          <Stat icon={Clock} label="Default time">
            {formatTime(pod.default_session_time)} · {pod.default_session_duration_minutes}m
          </Stat>
          <Stat icon={RotateCw} label="Review due">
            {new Date(pod.review_due_at).toLocaleDateString()}
          </Stat>
        </div>
      </Card>

      {/* Editable fields */}
      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Pod settings</h2>
          {!isInactive &&
            (editing ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(false);
                    setEditForm(toEditForm(pod));
                  }}
                  disabled={saving}
                >
                  <X className="mr-1 h-4 w-4" />
                  Cancel
                </Button>
                <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
                  <Save className="mr-1 h-4 w-4" />
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="mr-1 h-4 w-4" />
                Edit
              </Button>
            ))}
        </div>

        {editing ? (
          <EditForm
            form={editForm}
            setForm={setEditForm}
            members={members}
            currentLeadId={pod.pod_lead_id}
          />
        ) : (
          <ReadOnlyView pod={pod} members={members} />
        )}
      </Card>

      {/* Members */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-3">
          <h2 className="font-semibold text-gray-900">
            Members ({pod.members.length})
          </h2>
          {!isInactive && pod.active_member_count < pod.max_size && (
            <Button size="sm" onClick={() => setAddingMember(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Add member
            </Button>
          )}
        </div>

        {pod.members.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-500">
            No members yet. Add the first one to seed the pod.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {pod.members.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">
                    {memberDisplay(memberOf(a.member_id), a.member_id)}
                    {a.member_id === pod.pod_lead_id && (
                      <Badge variant="info" className="ml-2">
                        Lead
                      </Badge>
                    )}
                    {a.member_id === pod.assistant_pod_lead_id && (
                      <Badge variant="default" className="ml-2">
                        Assistant
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    Joined {new Date(a.joined_at).toLocaleDateString()} ·{" "}
                    via {a.assigned_by.replace("_", " ")}
                  </p>
                </div>
                {!isInactive && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTransferring(a)}
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleRemoveMember(a)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Add-member modal */}
      {addingMember && (
        <AddMemberModal
          podId={pod.id}
          members={members}
          existingMemberIds={new Set(pod.members.map((m) => m.member_id))}
          onClose={() => setAddingMember(false)}
          onAdded={async () => {
            setAddingMember(false);
            await load();
          }}
        />
      )}

      {/* Transfer modal */}
      {transferring && (
        <TransferModal
          assignment={transferring}
          memberLabel={memberDisplay(
            memberOf(transferring.member_id),
            transferring.member_id,
          )}
          sourcePodId={pod.id}
          targets={allPods}
          onClose={() => setTransferring(null)}
          onTransferred={async () => {
            setTransferring(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Read-only view & edit form
// ---------------------------------------------------------------------------

function ReadOnlyView({
  pod,
  members,
}: {
  pod: PodDetail;
  members: MemberListItem[];
}) {
  const lead = members.find((m) => m.id === pod.pod_lead_id);
  const assistant = pod.assistant_pod_lead_id
    ? members.find((m) => m.id === pod.assistant_pod_lead_id)
    : null;

  return (
    <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
      <Field label="Pod Lead">{memberDisplay(lead, pod.pod_lead_id)}</Field>
      <Field label="Assistant Pod Lead">
        {pod.assistant_pod_lead_id ? memberDisplay(assistant, pod.assistant_pod_lead_id) : "—"}
      </Field>
      <Field label="Min / max size">
        {pod.min_size} / {pod.max_size}
      </Field>
      <Field label="Visibility">
        {pod.visibility === "public" ? "Public (in directory)" : "Private (admin-assigned)"}
      </Field>
      <Field label="Description" wide>
        {pod.description || <span className="italic text-gray-400">None</span>}
      </Field>
    </dl>
  );
}

function EditForm({
  form,
  setForm,
  members,
  currentLeadId,
}: {
  form: PodUpdateInput;
  setForm: (f: PodUpdateInput) => void;
  members: MemberListItem[];
  currentLeadId: string;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Handle"
          value={form.handle ?? ""}
          onChange={(e) =>
            setForm({ ...form, handle: e.target.value.toLowerCase() })
          }
          placeholder="dolphins"
        />
        <Input
          label="Display name"
          value={form.name ?? ""}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>

      <Textarea
        label="Description"
        rows={2}
        value={form.description ?? ""}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Pod Lead"
          value={form.pod_lead_id ?? currentLeadId}
          onChange={(e) => setForm({ ...form, pod_lead_id: e.target.value })}
        >
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {memberDisplay(m, m.id)}
            </option>
          ))}
        </Select>
        <Select
          label="Assistant Pod Lead"
          value={form.assistant_pod_lead_id ?? ""}
          onChange={(e) =>
            setForm({ ...form, assistant_pod_lead_id: e.target.value })
          }
        >
          <option value="">(none)</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {memberDisplay(m, m.id)}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          label="Min size"
          type="number"
          min={1}
          max={10}
          value={form.min_size ?? 2}
          onChange={(e) => setForm({ ...form, min_size: Number(e.target.value) })}
        />
        <Input
          label="Max size"
          type="number"
          min={1}
          max={10}
          value={form.max_size ?? 5}
          onChange={(e) => setForm({ ...form, max_size: Number(e.target.value) })}
        />
        <Select
          label="Visibility"
          value={form.visibility ?? "public"}
          onChange={(e) =>
            setForm({ ...form, visibility: e.target.value as PodVisibility })
          }
        >
          <option value="public">Public</option>
          <option value="private">Private</option>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Select
          label="Default day"
          value={form.default_session_day ?? "sat"}
          onChange={(e) =>
            setForm({ ...form, default_session_day: e.target.value as DayOfWeek })
          }
        >
          {DAYS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </Select>
        <Input
          label="Default time"
          type="time"
          value={form.default_session_time ?? ""}
          onChange={(e) =>
            setForm({ ...form, default_session_time: e.target.value })
          }
        />
        <Input
          label="Duration (min)"
          type="number"
          min={15}
          max={480}
          value={form.default_session_duration_minutes ?? 180}
          onChange={(e) =>
            setForm({
              ...form,
              default_session_duration_minutes: Number(e.target.value),
            })
          }
        />
      </div>
    </div>
  );
}

function toEditForm(pod: PodDetail): PodUpdateInput {
  return {
    handle: pod.handle ?? "",
    name: pod.name,
    description: pod.description ?? "",
    pod_lead_id: pod.pod_lead_id,
    assistant_pod_lead_id: pod.assistant_pod_lead_id ?? "",
    min_size: pod.min_size,
    max_size: pod.max_size,
    visibility: pod.visibility,
    default_session_day: pod.default_session_day,
    default_session_time: pod.default_session_time.slice(0, 5),
    default_session_duration_minutes: pod.default_session_duration_minutes,
  };
}

// ---------------------------------------------------------------------------
// Add-member + transfer modals
// ---------------------------------------------------------------------------

interface AddMemberModalProps {
  podId: string;
  members: MemberListItem[];
  existingMemberIds: Set<string>;
  onClose: () => void;
  onAdded: () => Promise<void> | void;
}

function AddMemberModal({
  podId,
  members,
  existingMemberIds,
  onClose,
  onAdded,
}: AddMemberModalProps) {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const candidates = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return members
      .filter((m) => !existingMemberIds.has(m.id))
      .filter((m) => {
        if (!needle) return true;
        const hay = `${m.first_name ?? ""} ${m.last_name ?? ""} ${m.email ?? ""}`.toLowerCase();
        return hay.includes(needle);
      })
      .slice(0, 30);
  }, [members, existingMemberIds, search]);

  const handleAdd = async (memberId: string) => {
    setAdding(memberId);
    setError(null);
    try {
      await adminAddMember(podId, memberId);
      await onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add member");
      setAdding(null);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Add a member">
      <div className="space-y-3">
        {error && (
          <div className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</div>
        )}
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <div className="max-h-80 overflow-y-auto rounded-md border border-gray-200">
          {candidates.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No matching members.</p>
          ) : (
            candidates.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2 text-sm last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{memberDisplay(m, m.id)}</p>
                  {m.email && <p className="truncate text-xs text-gray-500">{m.email}</p>}
                </div>
                <Button
                  size="sm"
                  onClick={() => void handleAdd(m.id)}
                  disabled={adding === m.id}
                >
                  {adding === m.id ? "Adding…" : "Add"}
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}

interface TransferModalProps {
  assignment: PodMemberOut;
  memberLabel: string;
  sourcePodId: string;
  targets: PodSummary[];
  onClose: () => void;
  onTransferred: () => Promise<void> | void;
}

function TransferModal({
  assignment,
  memberLabel,
  sourcePodId,
  targets,
  onClose,
  onTransferred,
}: TransferModalProps) {
  const [targetId, setTargetId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTransfer = async () => {
    if (!targetId) return;
    setSubmitting(true);
    setError(null);
    try {
      await adminTransferMember(sourcePodId, assignment.member_id, targetId);
      await onTransferred();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transfer failed");
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Transfer ${memberLabel}`}>
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          Move {memberLabel} from this pod to another active pod in the same
          club. Capacity is checked on the target before the move commits.
        </p>
        {error && (
          <div className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</div>
        )}
        <Select
          label="Target pod"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
        >
          <option value="">Select a target pod…</option>
          {targets.map((p) => {
            const full = p.active_member_count >= p.max_size;
            return (
              <option key={p.id} value={p.id} disabled={full}>
                {podDisplayName(p)} ({p.active_member_count}/{p.max_size})
                {full ? " — full" : ""}
              </option>
            );
          })}
        </Select>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => void handleTransfer()} disabled={!targetId || submitting}>
            <CheckCircle className="mr-1 h-4 w-4" />
            {submitting ? "Transferring…" : "Transfer"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Tiny presentational helpers
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: PodSummary["status"] }) {
  if (status === "inactive") return <Badge variant="default">Dissolved</Badge>;
  return <Badge variant="success">Active</Badge>;
}

function Stat({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-gray-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 font-medium text-gray-900">{children}</p>
    </div>
  );
}

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 text-gray-900">{children}</dd>
    </div>
  );
}

function memberDisplay(
  member: MemberListItem | null | undefined,
  id: string,
): string {
  if (!member) return id.slice(0, 8) + "…";
  const name = `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim();
  return name || member.email || id.slice(0, 8) + "…";
}
