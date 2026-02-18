"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { StatsCard } from "@/components/ui/StatsCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { Textarea } from "@/components/ui/Textarea";
import {
  CATEGORY_GROUPS,
  CATEGORY_LABELS,
  TIER_SHORT_LABELS,
  VolunteersApi,
  type DashboardSummary,
  type VolunteerOpportunity,
  type VolunteerProfile,
  type VolunteerRole,
  type VolunteerRoleCategory,
} from "@/lib/volunteers";
import {
  AlertTriangle,
  Calendar,
  Clock,
  Eye,
  MapPin,
  Pencil,
  Plus,
  Settings,
  Star,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Tab = "dashboard" | "roles" | "volunteers" | "opportunities";

export default function AdminVolunteersPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [roles, setRoles] = useState<VolunteerRole[]>([]);
  const [profiles, setProfiles] = useState<VolunteerProfile[]>([]);
  const [opportunities, setOpportunities] = useState<VolunteerOpportunity[]>(
    [],
  );

  // Modals
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [showCreateOpp, setShowCreateOpp] = useState(false);
  const [showEditRole, setShowEditRole] = useState(false);
  const [editingRole, setEditingRole] = useState<VolunteerRole | null>(null);

  // Forms
  const [roleForm, setRoleForm] = useState({
    title: "",
    description: "",
    category: "other" as VolunteerRoleCategory,
    icon: "",
    min_tier: "tier_1" as "tier_1" | "tier_2" | "tier_3",
    time_commitment: "",
    responsibilities: "",
    skills_needed: "",
    best_for: "",
  });
  const [oppForm, setOppForm] = useState({
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
  });

  // Spotlight feature
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [featureTarget, setFeatureTarget] = useState<VolunteerProfile | null>(
    null,
  );
  const [featureForm, setFeatureForm] = useState({
    spotlight_quote: "",
    featured_until: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashData, rolesData, profilesData, oppsData] = await Promise.all([
        VolunteersApi.admin.getDashboard(),
        VolunteersApi.listRoles(false),
        VolunteersApi.admin.listProfiles({ active_only: false }),
        VolunteersApi.listOpportunities({ status: undefined }),
      ]);
      setDashboard(dashData);
      setRoles(rolesData);
      setProfiles(profilesData);
      setOpportunities(oppsData);
    } catch {
      setError("Failed to load volunteer data.");
    } finally {
      setLoading(false);
    }
  };

  const emptyRoleForm = {
    title: "",
    description: "",
    category: "other" as VolunteerRoleCategory,
    icon: "",
    min_tier: "tier_1" as "tier_1" | "tier_2" | "tier_3",
    time_commitment: "",
    responsibilities: "",
    skills_needed: "",
    best_for: "",
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const respList = roleForm.responsibilities.trim()
        ? roleForm.responsibilities
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;
      await VolunteersApi.admin.createRole({
        title: roleForm.title,
        description: roleForm.description,
        category: roleForm.category,
        icon: roleForm.icon || undefined,
        min_tier: roleForm.min_tier,
        time_commitment: roleForm.time_commitment || undefined,
        responsibilities: respList,
        skills_needed: roleForm.skills_needed || undefined,
        best_for: roleForm.best_for || undefined,
      } as Partial<VolunteerRole>);
      setShowCreateRole(false);
      setRoleForm(emptyRoleForm);
      const rolesData = await VolunteersApi.listRoles(false);
      setRoles(rolesData);
    } catch {
      setError("Failed to create role.");
    }
  };

  const openEditRole = (role: VolunteerRole) => {
    setEditingRole(role);
    setRoleForm({
      title: role.title,
      description: role.description || "",
      category: role.category,
      icon: role.icon || "",
      min_tier: role.min_tier as "tier_1" | "tier_2" | "tier_3",
      time_commitment: role.time_commitment || "",
      responsibilities: role.responsibilities?.join("\n") || "",
      skills_needed: role.skills_needed || "",
      best_for: role.best_for || "",
    });
    setShowEditRole(true);
  };

  const handleEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    try {
      const respList = roleForm.responsibilities.trim()
        ? roleForm.responsibilities
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;
      await VolunteersApi.admin.updateRole(editingRole.id, {
        title: roleForm.title,
        description: roleForm.description,
        category: roleForm.category,
        icon: roleForm.icon || undefined,
        min_tier: roleForm.min_tier,
        time_commitment: roleForm.time_commitment || undefined,
        responsibilities: respList,
        skills_needed: roleForm.skills_needed || undefined,
        best_for: roleForm.best_for || undefined,
      } as Partial<VolunteerRole>);
      setShowEditRole(false);
      setEditingRole(null);
      setRoleForm(emptyRoleForm);
      const rolesData = await VolunteersApi.listRoles(false);
      setRoles(rolesData);
    } catch {
      setError("Failed to update role.");
    }
  };

  const handleToggleRole = async (roleId: string, currentActive: boolean) => {
    try {
      await VolunteersApi.admin.updateRole(roleId, {
        is_active: !currentActive,
      });
      const rolesData = await VolunteersApi.listRoles(false);
      setRoles(rolesData);
    } catch {
      setError("Failed to update role.");
    }
  };

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await VolunteersApi.admin.createOpportunity({
        title: oppForm.title,
        description: oppForm.description,
        role_id: oppForm.role_id || undefined,
        date: oppForm.date,
        start_time: oppForm.start_time || undefined,
        end_time: oppForm.end_time || undefined,
        location_name: oppForm.location_name || undefined,
        slots_needed: parseInt(oppForm.slots_needed),
        opportunity_type: oppForm.opportunity_type,
        min_tier: oppForm.min_tier,
        status: "draft",
      } as Partial<VolunteerOpportunity>);
      setShowCreateOpp(false);
      setOppForm({
        title: "",
        description: "",
        role_id: "",
        date: "",
        start_time: "",
        end_time: "",
        location_name: "",
        slots_needed: "1",
        opportunity_type: "open_claim",
        min_tier: "tier_1",
      });
      const oppsData = await VolunteersApi.listOpportunities({
        status: undefined,
      });
      setOpportunities(oppsData);
    } catch {
      setError("Failed to create opportunity.");
    }
  };

  const handlePublish = async (oppId: string) => {
    try {
      await VolunteersApi.admin.publishOpportunity(oppId);
      const oppsData = await VolunteersApi.listOpportunities({
        status: undefined,
      });
      setOpportunities(oppsData);
    } catch {
      setError("Failed to publish opportunity.");
    }
  };

  const handleFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!featureTarget) return;
    try {
      await VolunteersApi.admin.featureVolunteer(featureTarget.member_id, {
        spotlight_quote: featureForm.spotlight_quote || undefined,
        featured_until: featureForm.featured_until || undefined,
      });
      setShowFeatureModal(false);
      setFeatureTarget(null);
      setFeatureForm({ spotlight_quote: "", featured_until: "" });
      const profilesData = await VolunteersApi.admin.listProfiles({
        active_only: false,
      });
      setProfiles(profilesData);
    } catch {
      setError("Failed to feature volunteer.");
    }
  };

  const handleUnfeature = async (memberId: string) => {
    try {
      await VolunteersApi.admin.unfeatureVolunteer(memberId);
      const profilesData = await VolunteersApi.admin.listProfiles({
        active_only: false,
      });
      setProfiles(profilesData);
    } catch {
      setError("Failed to unfeature volunteer.");
    }
  };

  if (loading) return <LoadingPage text="Loading volunteer management..." />;

  const pendingApprovals = opportunities.filter(
    (o) => o.status === "open" && o.opportunity_type === "approval_required",
  ).length;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
          Volunteers
        </h1>
        <p className="text-sm text-slate-600">
          Manage roles, opportunities, and volunteer roster
        </p>
      </header>

      {error && <Alert variant="error">{error}</Alert>}

      {pendingApprovals > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <span className="text-sm text-amber-800">
            <strong>{pendingApprovals}</strong> opportunit
            {pendingApprovals === 1 ? "y" : "ies"} with approval-required slots
          </span>
          <button
            onClick={() => setTab("opportunities")}
            className="ml-auto text-sm font-medium text-amber-700 hover:text-amber-900"
          >
            View →
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="relative -mx-3 sm:mx-0">
        <div className="flex gap-1 border-b border-slate-200 overflow-x-auto px-3 sm:px-0 scrollbar-hide">
          {(
            [
              { key: "dashboard", label: "Dashboard" },
              {
                key: "opportunities",
                label: "Opportunities",
                count: opportunities.length,
              },
              {
                key: "volunteers",
                label: "Volunteers",
                count: profiles.length,
              },
              { key: "roles", label: "Roles", count: roles.length },
            ] as { key: Tab; label: string; count?: number }[]
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-cyan-600 text-cyan-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
              {t.count !== undefined && (
                <span
                  className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                    tab === t.key
                      ? "bg-cyan-100 text-cyan-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Dashboard ──────────────────────────────────────────── */}
      {tab === "dashboard" && dashboard && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatsCard
              label="Active Volunteers"
              value={dashboard.total_active_volunteers}
              icon={<Users className="h-5 w-5" />}
              color="cyan"
            />
            <StatsCard
              label="Hours This Month"
              value={dashboard.total_hours_this_month.toFixed(0)}
              icon={<Clock className="h-5 w-5" />}
              color="green"
            />
            <StatsCard
              label="Upcoming"
              value={dashboard.upcoming_opportunities}
              icon={<Calendar className="h-5 w-5" />}
              color="blue"
            />
            <StatsCard
              label="Unfilled Slots"
              value={dashboard.unfilled_slots}
              icon={<AlertTriangle className="h-5 w-5" />}
              color={dashboard.unfilled_slots > 5 ? "amber" : "slate"}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* No-show rate + reliability */}
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">No-Show Rate</p>
                  <p
                    className={`text-3xl font-bold ${
                      dashboard.no_show_rate > 15
                        ? "text-rose-600"
                        : dashboard.no_show_rate > 5
                          ? "text-amber-600"
                          : "text-emerald-600"
                    }`}
                  >
                    {dashboard.no_show_rate.toFixed(1)}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-slate-300" />
              </div>
              <button
                onClick={() => setTab("volunteers")}
                className="mt-3 text-sm text-cyan-600 hover:text-cyan-700 font-medium"
              >
                View reliability report →
              </button>
            </Card>

            {/* Top Volunteers */}
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Top Volunteers
              </h3>
              {dashboard.top_volunteers.length === 0 ? (
                <p className="text-sm text-slate-500">No data yet</p>
              ) : (
                <div className="space-y-2">
                  {dashboard.top_volunteers.map((v, i) => (
                    <div
                      key={v.member_id}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 bg-slate-50"
                    >
                      <span className="text-lg w-6 text-center">
                        {i === 0
                          ? "🥇"
                          : i === 1
                            ? "🥈"
                            : i === 2
                              ? "🥉"
                              : `${i + 1}`}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {v.member_name || "Unknown"}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-sm font-bold text-slate-900">
                          {v.total_hours.toFixed(0)}h
                        </span>
                        <span className="text-xs text-slate-400 ml-1">
                          ({v.total_sessions})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ── Opportunities ───────────────────────────────────────── */}
      {tab === "opportunities" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => setShowCreateOpp(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Create Opportunity
            </Button>
          </div>

          {opportunities.length === 0 ? (
            <Card className="py-12 text-center">
              <Calendar className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">
                No opportunities created yet.
              </p>
              <Button
                className="mt-4"
                size="sm"
                onClick={() => setShowCreateOpp(true)}
              >
                Create your first opportunity
              </Button>
            </Card>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="divide-y divide-slate-100 sm:hidden">
                {opportunities.map((opp) => (
                  <div key={opp.id} className="py-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-slate-900 text-sm">
                            {opp.title}
                          </h3>
                          <OppStatusBadge status={opp.status} />
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                          <span>{formatDate(opp.date)}</span>
                          {opp.start_time && (
                            <span>{opp.start_time.slice(0, 5)}</span>
                          )}
                          {opp.location_name && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="h-3 w-3" />
                              {opp.location_name}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2 text-xs">
                          <span className="text-slate-500">
                            {opp.slots_filled}/{opp.slots_needed} filled
                          </span>
                          {opp.role_title && (
                            <Badge variant="outline">{opp.role_title}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {opp.status === "draft" && (
                        <Button size="sm" onClick={() => handlePublish(opp.id)}>
                          Publish
                        </Button>
                      )}
                      <Link
                        href={`/admin/community/volunteers/opportunities/${opp.id}`}
                      >
                        <Button size="sm" variant="secondary">
                          Manage
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Opportunity</TableHeaderCell>
                      <TableHeaderCell>Date</TableHeaderCell>
                      <TableHeaderCell>Role</TableHeaderCell>
                      <TableHeaderCell>Slots</TableHeaderCell>
                      <TableHeaderCell>Type</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell></TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {opportunities.map((opp) => (
                      <TableRow key={opp.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-900">
                              {opp.title}
                            </p>
                            {opp.location_name && (
                              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3" />
                                {opp.location_name}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {formatDate(opp.date)}
                          </span>
                          {opp.start_time && (
                            <span className="text-xs text-slate-400 block">
                              {opp.start_time.slice(0, 5)}
                              {opp.end_time && ` – ${opp.end_time.slice(0, 5)}`}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {opp.role_title ? (
                            <Badge variant="outline">{opp.role_title}</Badge>
                          ) : (
                            <span className="text-xs text-slate-400">Any</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`font-medium ${
                              opp.slots_filled >= opp.slots_needed
                                ? "text-emerald-600"
                                : "text-slate-900"
                            }`}
                          >
                            {opp.slots_filled}/{opp.slots_needed}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-slate-500">
                            {opp.opportunity_type === "approval_required"
                              ? "Approval"
                              : "Open"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <OppStatusBadge status={opp.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-end">
                            {opp.status === "draft" && (
                              <Button
                                size="sm"
                                onClick={() => handlePublish(opp.id)}
                              >
                                Publish
                              </Button>
                            )}
                            <Link
                              href={`/admin/community/volunteers/opportunities/${opp.id}`}
                            >
                              <Button size="sm" variant="ghost">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {/* Create Opportunity Modal */}
          <Modal
            isOpen={showCreateOpp}
            onClose={() => setShowCreateOpp(false)}
            title="Create Volunteer Opportunity"
          >
            <form onSubmit={handleCreateOpportunity} className="space-y-4">
              <Input
                label="Title"
                value={oppForm.title}
                onChange={(e) =>
                  setOppForm({ ...oppForm, title: e.target.value })
                }
                required
                placeholder="e.g., Saturday Session Volunteers"
              />
              <Textarea
                label="Description"
                value={oppForm.description}
                onChange={(e) =>
                  setOppForm({ ...oppForm, description: e.target.value })
                }
                rows={2}
                placeholder="Optional details..."
              />
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <Select
                  label="Role"
                  value={oppForm.role_id}
                  onChange={(e) =>
                    setOppForm({ ...oppForm, role_id: e.target.value })
                  }
                >
                  <option value="">Any role</option>
                  {roles
                    .filter((r) => r.is_active)
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
                  value={oppForm.slots_needed}
                  onChange={(e) =>
                    setOppForm({ ...oppForm, slots_needed: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <Input
                  label="Date"
                  type="date"
                  value={oppForm.date}
                  onChange={(e) =>
                    setOppForm({ ...oppForm, date: e.target.value })
                  }
                  required
                />
                <Input
                  label="Location"
                  value={oppForm.location_name}
                  onChange={(e) =>
                    setOppForm({ ...oppForm, location_name: e.target.value })
                  }
                  placeholder="e.g., Yaba Pool"
                />
              </div>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <Input
                  label="Start Time"
                  type="time"
                  value={oppForm.start_time}
                  onChange={(e) =>
                    setOppForm({ ...oppForm, start_time: e.target.value })
                  }
                />
                <Input
                  label="End Time"
                  type="time"
                  value={oppForm.end_time}
                  onChange={(e) =>
                    setOppForm({ ...oppForm, end_time: e.target.value })
                  }
                />
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-sm font-medium text-slate-700 mb-3">
                  Settings
                </h4>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  <Select
                    label="Claim Type"
                    value={oppForm.opportunity_type}
                    onChange={(e) =>
                      setOppForm({
                        ...oppForm,
                        opportunity_type: e.target.value as
                          | "open_claim"
                          | "approval_required",
                      })
                    }
                  >
                    <option value="open_claim">Open (anyone can claim)</option>
                    <option value="approval_required">Approval required</option>
                  </Select>
                  <Select
                    label="Minimum Tier"
                    value={oppForm.min_tier}
                    onChange={(e) =>
                      setOppForm({
                        ...oppForm,
                        min_tier: e.target.value as
                          | "tier_1"
                          | "tier_2"
                          | "tier_3",
                      })
                    }
                  >
                    <option value="tier_1">Tier 1 — Anyone</option>
                    <option value="tier_2">Tier 2 — Core</option>
                    <option value="tier_3">Tier 3 — Lead</option>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateOpp(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create as Draft</Button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {/* ── Volunteers ──────────────────────────────────────────── */}
      {tab === "volunteers" && (
        <div className="space-y-4">
          {profiles.length === 0 ? (
            <Card className="py-12 text-center">
              <Users className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">
                No volunteers registered yet.
              </p>
            </Card>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="divide-y divide-slate-100 sm:hidden">
                {profiles.map((p) => (
                  <div key={p.id} className="py-4 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-slate-900 text-sm">
                        {p.member_name || "Unknown"}
                      </p>
                      <TierBadge tier={p.tier} />
                      {p.recognition_tier && (
                        <RecognitionBadge tier={p.recognition_tier} />
                      )}
                      {p.is_featured && (
                        <Badge variant="info">
                          <Star className="h-3 w-3 inline mr-0.5" /> Featured
                        </Badge>
                      )}
                      {!p.is_active && <Badge variant="danger">Inactive</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>{p.total_hours.toFixed(1)}h</span>
                      <span>{p.total_sessions_volunteered} sessions</span>
                      <ReliabilityText score={p.reliability_score} />
                      {p.total_no_shows > 0 && (
                        <span className="text-rose-500">
                          {p.total_no_shows} no-show
                          {p.total_no_shows !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    {p.member_email && (
                      <p className="text-xs text-slate-400">{p.member_email}</p>
                    )}
                    <div className="pt-1">
                      {p.is_featured ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUnfeature(p.member_id)}
                          className="text-xs"
                        >
                          <Star className="h-3 w-3 mr-1 fill-amber-400 text-amber-400" />
                          Unfeature
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setFeatureTarget(p);
                            setFeatureForm({
                              spotlight_quote: p.spotlight_quote || "",
                              featured_until: "",
                            });
                            setShowFeatureModal(true);
                          }}
                          className="text-xs"
                        >
                          <Star className="h-3 w-3 mr-1" />
                          Feature
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Volunteer</TableHeaderCell>
                      <TableHeaderCell>Tier</TableHeaderCell>
                      <TableHeaderCell>Hours</TableHeaderCell>
                      <TableHeaderCell>Sessions</TableHeaderCell>
                      <TableHeaderCell>Reliability</TableHeaderCell>
                      <TableHeaderCell>No-Shows</TableHeaderCell>
                      <TableHeaderCell>Recognition</TableHeaderCell>
                      <TableHeaderCell>Spotlight</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {profiles.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-medium text-slate-900">
                                {p.member_name || "Unknown"}
                              </p>
                              {p.member_email && (
                                <p className="text-xs text-slate-400">
                                  {p.member_email}
                                </p>
                              )}
                            </div>
                            {p.is_featured && (
                              <Star className="h-4 w-4 fill-amber-400 text-amber-400 flex-shrink-0" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <TierBadge tier={p.tier} />
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {p.total_hours.toFixed(1)}
                          </span>
                        </TableCell>
                        <TableCell>{p.total_sessions_volunteered}</TableCell>
                        <TableCell>
                          <ReliabilityText score={p.reliability_score} />
                        </TableCell>
                        <TableCell>
                          {p.total_no_shows > 0 ? (
                            <span className="text-rose-600 font-medium">
                              {p.total_no_shows}
                            </span>
                          ) : (
                            <span className="text-slate-300">0</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {p.recognition_tier ? (
                            <RecognitionBadge tier={p.recognition_tier} />
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {p.is_featured ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUnfeature(p.member_id)}
                            >
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 mr-1" />
                              Unfeature
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setFeatureTarget(p);
                                setFeatureForm({
                                  spotlight_quote: p.spotlight_quote || "",
                                  featured_until: "",
                                });
                                setShowFeatureModal(true);
                              }}
                            >
                              <Star className="h-3.5 w-3.5 mr-1" />
                              Feature
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Feature Volunteer Modal */}
      <Modal
        isOpen={showFeatureModal}
        onClose={() => {
          setShowFeatureModal(false);
          setFeatureTarget(null);
        }}
        title="Feature Volunteer"
      >
        <form onSubmit={handleFeature} className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-cyan-50 px-4 py-3">
            <Star className="h-5 w-5 text-cyan-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-900">
                {featureTarget?.member_name || "Unknown"}
              </p>
              <p className="text-xs text-slate-500">
                {featureTarget?.total_hours.toFixed(0)}h volunteered &middot;{" "}
                {featureTarget?.total_sessions_volunteered} sessions
              </p>
            </div>
          </div>

          <Textarea
            label="Spotlight Quote"
            value={featureForm.spotlight_quote}
            onChange={(e) =>
              setFeatureForm({
                ...featureForm,
                spotlight_quote: e.target.value,
              })
            }
            rows={3}
            placeholder="A short quote from this volunteer (optional)..."
          />

          <Input
            label="Featured Until (optional)"
            type="date"
            value={featureForm.featured_until}
            onChange={(e) =>
              setFeatureForm({ ...featureForm, featured_until: e.target.value })
            }
          />
          <p className="text-xs text-slate-400 -mt-3">
            Leave empty for indefinite featuring. The currently featured
            volunteer (if any) will be replaced.
          </p>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowFeatureModal(false);
                setFeatureTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">Feature Volunteer</Button>
          </div>
        </form>
      </Modal>

      {/* ── Roles ───────────────────────────────────────────────── */}
      {tab === "roles" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button
              onClick={() => setShowCreateRole(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Create Role
            </Button>
          </div>

          {roles.length === 0 ? (
            <Card className="py-12 text-center">
              <Settings className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">
                No roles created yet.
              </p>
            </Card>
          ) : (
            Object.entries(CATEGORY_GROUPS).map(([groupKey, group]) => {
              const groupRoles = roles.filter((r) =>
                group.categories.includes(r.category),
              );
              if (groupRoles.length === 0) return null;

              return (
                <div key={groupKey}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                    {group.label}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {groupRoles
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((role) => (
                        <RoleCard
                          key={role.id}
                          role={role}
                          onEdit={openEditRole}
                          onToggle={handleToggleRole}
                        />
                      ))}
                  </div>
                </div>
              );
            })
          )}

          {/* Ungrouped / "Other" roles */}
          {(() => {
            const allGroupedCategories = Object.values(CATEGORY_GROUPS).flatMap(
              (g) => g.categories,
            );
            const ungrouped = roles.filter(
              (r) => !allGroupedCategories.includes(r.category),
            );
            if (ungrouped.length === 0) return null;
            return (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Other
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {ungrouped.map((role) => (
                    <RoleCard
                      key={role.id}
                      role={role}
                      onEdit={openEditRole}
                      onToggle={handleToggleRole}
                    />
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Create Role Modal */}
          <Modal
            isOpen={showCreateRole}
            onClose={() => setShowCreateRole(false)}
            title="Create Volunteer Role"
          >
            <form onSubmit={handleCreateRole} className="space-y-4">
              <Input
                label="Title"
                value={roleForm.title}
                onChange={(e) =>
                  setRoleForm({ ...roleForm, title: e.target.value })
                }
                required
                placeholder="e.g., Media Volunteer"
              />
              <Textarea
                label="Description"
                value={roleForm.description}
                onChange={(e) =>
                  setRoleForm({ ...roleForm, description: e.target.value })
                }
                rows={3}
                placeholder="Describe the role and responsibilities..."
              />
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <Select
                  label="Category"
                  value={roleForm.category}
                  onChange={(e) =>
                    setRoleForm({
                      ...roleForm,
                      category: e.target.value as VolunteerRoleCategory,
                    })
                  }
                >
                  {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Icon (emoji)"
                  value={roleForm.icon}
                  onChange={(e) =>
                    setRoleForm({ ...roleForm, icon: e.target.value })
                  }
                  placeholder="e.g., 📸"
                />
              </div>
              <Select
                label="Minimum Tier"
                value={roleForm.min_tier}
                onChange={(e) =>
                  setRoleForm({
                    ...roleForm,
                    min_tier: e.target.value as "tier_1" | "tier_2" | "tier_3",
                  })
                }
              >
                <option value="tier_1">Tier 1 — Anyone</option>
                <option value="tier_2">Tier 2 — Core</option>
                <option value="tier_3">Tier 3 — Lead</option>
              </Select>

              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-sm font-medium text-slate-700 mb-3">
                  Role Details (shown to members)
                </h4>
                <div className="space-y-3">
                  <Input
                    label="Time Commitment"
                    value={roleForm.time_commitment}
                    onChange={(e) =>
                      setRoleForm({
                        ...roleForm,
                        time_commitment: e.target.value,
                      })
                    }
                    placeholder="e.g., 90–120 min (full session + 15 min before/after)"
                  />
                  <Textarea
                    label="Responsibilities (one per line)"
                    value={roleForm.responsibilities}
                    onChange={(e) =>
                      setRoleForm({
                        ...roleForm,
                        responsibilities: e.target.value,
                      })
                    }
                    rows={4}
                    placeholder={
                      "Arrive 15 minutes before session starts\nBrief other volunteers on the day's plan\nHandle any on-the-ground issues"
                    }
                  />
                  <Textarea
                    label="Skills Needed"
                    value={roleForm.skills_needed}
                    onChange={(e) =>
                      setRoleForm({
                        ...roleForm,
                        skills_needed: e.target.value,
                      })
                    }
                    rows={2}
                    placeholder="e.g., Comfortable speaking to groups. Calm under mild pressure."
                  />
                  <Textarea
                    label="Best For"
                    value={roleForm.best_for}
                    onChange={(e) =>
                      setRoleForm({ ...roleForm, best_for: e.target.value })
                    }
                    rows={2}
                    placeholder="e.g., People who like organising and being the go-to person."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateRole(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Role</Button>
              </div>
            </form>
          </Modal>

          {/* Edit Role Modal */}
          <Modal
            isOpen={showEditRole}
            onClose={() => {
              setShowEditRole(false);
              setEditingRole(null);
            }}
            title={
              editingRole ? `Edit: ${editingRole.title}` : "Edit Volunteer Role"
            }
          >
            <form onSubmit={handleEditRole} className="space-y-4">
              <Input
                label="Title"
                value={roleForm.title}
                onChange={(e) =>
                  setRoleForm({ ...roleForm, title: e.target.value })
                }
                required
              />
              <Textarea
                label="Description"
                value={roleForm.description}
                onChange={(e) =>
                  setRoleForm({ ...roleForm, description: e.target.value })
                }
                rows={3}
                placeholder="Describe the role and responsibilities..."
              />
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <Select
                  label="Category"
                  value={roleForm.category}
                  onChange={(e) =>
                    setRoleForm({
                      ...roleForm,
                      category: e.target.value as VolunteerRoleCategory,
                    })
                  }
                >
                  {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Icon (emoji)"
                  value={roleForm.icon}
                  onChange={(e) =>
                    setRoleForm({ ...roleForm, icon: e.target.value })
                  }
                  placeholder="e.g., 📸"
                />
              </div>
              <Select
                label="Minimum Tier"
                value={roleForm.min_tier}
                onChange={(e) =>
                  setRoleForm({
                    ...roleForm,
                    min_tier: e.target.value as "tier_1" | "tier_2" | "tier_3",
                  })
                }
              >
                <option value="tier_1">Tier 1 — Anyone</option>
                <option value="tier_2">Tier 2 — Core</option>
                <option value="tier_3">Tier 3 — Lead</option>
              </Select>

              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-sm font-medium text-slate-700 mb-3">
                  Role Details (shown to members)
                </h4>
                <div className="space-y-3">
                  <Input
                    label="Time Commitment"
                    value={roleForm.time_commitment}
                    onChange={(e) =>
                      setRoleForm({
                        ...roleForm,
                        time_commitment: e.target.value,
                      })
                    }
                    placeholder="e.g., 90–120 min (full session + 15 min before/after)"
                  />
                  <Textarea
                    label="Responsibilities (one per line)"
                    value={roleForm.responsibilities}
                    onChange={(e) =>
                      setRoleForm({
                        ...roleForm,
                        responsibilities: e.target.value,
                      })
                    }
                    rows={5}
                    placeholder={
                      "Arrive 15 minutes before session starts\nBrief other volunteers on the day's plan\nHandle any on-the-ground issues"
                    }
                  />
                  <Textarea
                    label="Skills Needed"
                    value={roleForm.skills_needed}
                    onChange={(e) =>
                      setRoleForm({
                        ...roleForm,
                        skills_needed: e.target.value,
                      })
                    }
                    rows={2}
                    placeholder="e.g., Comfortable speaking to groups. Calm under mild pressure."
                  />
                  <Textarea
                    label="Best For"
                    value={roleForm.best_for}
                    onChange={(e) =>
                      setRoleForm({ ...roleForm, best_for: e.target.value })
                    }
                    rows={2}
                    placeholder="e.g., People who like organising and being the go-to person."
                  />
                </div>
              </div>

              {editingRole && (
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span>
                    {editingRole.active_volunteers_count} active volunteer
                    {editingRole.active_volunteers_count !== 1 ? "s" : ""}
                  </span>
                  <span>·</span>
                  <span>Sort: {editingRole.sort_order}</span>
                  <span>·</span>
                  <span>
                    Created{" "}
                    {new Date(editingRole.created_at).toLocaleDateString(
                      "en-NG",
                    )}
                  </span>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowEditRole(false);
                    setEditingRole(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </Modal>
        </div>
      )}
    </div>
  );
}

// ── Helper Components ─────────────────────────────────────────────

function TierBadge({ tier }: { tier: string }) {
  const variant =
    tier === "tier_3" ? "warning" : tier === "tier_2" ? "success" : "default";
  return (
    <Badge variant={variant}>
      {TIER_SHORT_LABELS[tier as keyof typeof TIER_SHORT_LABELS] || tier}
    </Badge>
  );
}

function RecognitionBadge({ tier }: { tier: string }) {
  const emoji = tier === "gold" ? "🥇" : tier === "silver" ? "🥈" : "🥉";
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
      {emoji} {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </span>
  );
}

function ReliabilityText({ score }: { score: number }) {
  const color =
    score < 70
      ? "text-rose-600 font-medium"
      : score < 85
        ? "text-amber-600"
        : "text-emerald-600";
  return <span className={color}>{score}%</span>;
}

function OppStatusBadge({ status }: { status: string }) {
  const map: Record<
    string,
    "success" | "default" | "warning" | "info" | "danger"
  > = {
    open: "success",
    draft: "default",
    filled: "warning",
    in_progress: "info",
    completed: "info",
    cancelled: "danger",
  };
  return <Badge variant={map[status] || "default"}>{status}</Badge>;
}

function RoleCard({
  role,
  onEdit,
  onToggle,
}: {
  role: VolunteerRole;
  onEdit: (role: VolunteerRole) => void;
  onToggle: (roleId: string, currentActive: boolean) => void;
}) {
  const hasDetails = !!(
    role.time_commitment ||
    role.responsibilities?.length ||
    role.skills_needed ||
    role.best_for
  );

  return (
    <Card
      className={`relative group cursor-pointer transition-shadow hover:shadow-md ${!role.is_active ? "opacity-60" : ""}`}
      onClick={() => onEdit(role)}
    >
      <div className="space-y-3">
        {/* Top row: icon + title + status */}
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{role.icon || "🙋"}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-slate-900 text-sm">
                {role.title}
              </h4>
              {!role.is_active && <Badge variant="default">Inactive</Badge>}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {CATEGORY_LABELS[role.category] || role.category}
            </p>
          </div>
          <Pencil className="h-4 w-4 text-slate-300 group-hover:text-cyan-500 transition-colors flex-shrink-0 mt-1" />
        </div>

        {/* Description */}
        <p className="text-xs text-slate-500 line-clamp-2">
          {role.description}
        </p>

        {/* Meta row */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>Min: {TIER_SHORT_LABELS[role.min_tier]}</span>
            <span>{role.active_volunteers_count} active</span>
            {!hasDetails && (
              <span
                className="text-amber-500"
                title="No detailed role info defined"
              >
                ⚠
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(role.id, role.is_active);
            }}
            className="text-xs"
          >
            {role.is_active ? "Deactivate" : "Activate"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-NG", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
