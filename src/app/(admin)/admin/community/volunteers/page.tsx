"use client";

import { Alert } from "@/components/ui/Alert";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { apiGet } from "@/lib/api";
import { SessionsApi } from "@/lib/sessions";
import {
  VolunteersApi,
  type DashboardSummary,
  type VolunteerOpportunity,
  type VolunteerProfile,
  type VolunteerRole,
  type VolunteerRoleCategory,
} from "@/lib/volunteers";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

import { CreateOpportunityModal } from "./_volunteers/CreateOpportunityModal";
import { CreateRoleModal } from "./_volunteers/CreateRoleModal";
import { DashboardTab } from "./_volunteers/DashboardTab";
import { EditRoleModal } from "./_volunteers/EditRoleModal";
import { FeatureVolunteerModal } from "./_volunteers/FeatureVolunteerModal";
import { FindSessionModal } from "./_volunteers/FindSessionModal";
import { LogHoursModal } from "./_volunteers/LogHoursModal";
import { OpportunitiesTab } from "./_volunteers/OpportunitiesTab";
import { RolesTab } from "./_volunteers/RolesTab";
import { TabsNav } from "./_volunteers/TabsNav";
import { VolunteersTab } from "./_volunteers/VolunteersTab";
import { VolunteerTemplatesTab } from "./TemplatesTab";
import type { Tab } from "./types";
import { getErrorMessage } from "./utils";

export default function AdminVolunteersPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [roles, setRoles] = useState<VolunteerRole[]>([]);
  const [profiles, setProfiles] = useState<VolunteerProfile[]>([]);
  const [opportunities, setOpportunities] = useState<VolunteerOpportunity[]>([]);

  // Modals
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [showCreateOpp, setShowCreateOpp] = useState(false);
  const [showEditRole, setShowEditRole] = useState(false);
  const [editingRole, setEditingRole] = useState<VolunteerRole | null>(null);

  // Forms
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
  const [roleForm, setRoleForm] = useState(emptyRoleForm);
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
    qr_checkin_enabled: false,
    // "Attach to" picker — when set, date/time/location are inherited
    // from the chosen session/event and the corresponding fields lock.
    attach_mode: "standalone" as "standalone" | "session" | "event",
    session_id: "",
    event_id: "",
  });

  // Lazy-loaded lookup data for the attach-to picker. Both lists are
  // fetched once when the picker mode flips off "standalone" — keeps
  // page-load fast for the common (no-attach) flow.
  const [attachSessions, setAttachSessions] = useState<
    {
      id: string;
      title: string;
      starts_at: string;
      ends_at: string;
      location_name?: string | null;
    }[]
  >([]);
  const [attachEvents, setAttachEvents] = useState<
    {
      id: string;
      title: string;
      start_time: string;
      end_time?: string | null;
      location?: string | null;
    }[]
  >([]);
  const [attachLoading, setAttachLoading] = useState(false);

  // "Find session for unattached opportunity" backfill flow.
  const [suggestForOpp, setSuggestForOpp] = useState<VolunteerOpportunity | null>(null);
  const [suggestCandidates, setSuggestCandidates] = useState<
    {
      id: string;
      title: string;
      starts_at: string;
      ends_at: string;
      location_name?: string | null;
    }[]
  >([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [attachingSessionId, setAttachingSessionId] = useState<string | null>(null);

  // Manual hours
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [hoursTarget, setHoursTarget] = useState<VolunteerProfile | null>(null);
  const [hoursForm, setHoursForm] = useState({
    hours: "",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  // Spotlight feature
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [featureTarget, setFeatureTarget] = useState<VolunteerProfile | null>(null);
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
      const [dashData, rolesData, profilesData, oppsData] = await Promise.allSettled([
        VolunteersApi.admin.getDashboard(),
        VolunteersApi.listRoles(false),
        VolunteersApi.admin.listProfiles({ active_only: false }),
        VolunteersApi.admin.listOpportunities({ status: undefined }),
      ]);

      if (dashData.status === "fulfilled") setDashboard(dashData.value);
      if (rolesData.status === "fulfilled") setRoles(rolesData.value);
      if (profilesData.status === "fulfilled") setProfiles(profilesData.value);
      if (oppsData.status === "fulfilled") setOpportunities(oppsData.value);

      const failures = [dashData, rolesData, profilesData, oppsData].filter(
        (result): result is PromiseRejectedResult => result.status === "rejected",
      );

      if (failures.length > 0) {
        const firstFailure = failures[0];
        setError(
          failures.length === 1
            ? getErrorMessage(firstFailure.reason, "Failed to load volunteer data.")
            : `${failures.length} volunteer requests failed. ${getErrorMessage(
                firstFailure.reason,
                "Please try again.",
              )}`,
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Role handlers ───────────────────────────────────────────────
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
    } catch (error) {
      setError(getErrorMessage(error, "Failed to create role."));
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
    } catch (error) {
      setError(getErrorMessage(error, "Failed to update role."));
    }
  };

  const handleToggleRole = async (roleId: string, currentActive: boolean) => {
    try {
      await VolunteersApi.admin.updateRole(roleId, { is_active: !currentActive });
      const rolesData = await VolunteersApi.listRoles(false);
      setRoles(rolesData);
    } catch (error) {
      setError(getErrorMessage(error, "Failed to update role."));
    }
  };

  // ── Opportunity handlers ────────────────────────────────────────
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
        qr_checkin_enabled: oppForm.qr_checkin_enabled,
        status: "draft",
        // Cross-service refs — set only when the admin explicitly
        // attaches this opportunity to a session / event. Volunteer
        // service stores them as plain UUIDs.
        session_id:
          oppForm.attach_mode === "session" && oppForm.session_id ? oppForm.session_id : undefined,
        event_id:
          oppForm.attach_mode === "event" && oppForm.event_id ? oppForm.event_id : undefined,
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
        qr_checkin_enabled: false,
        attach_mode: "standalone",
        session_id: "",
        event_id: "",
      });
      const oppsData = await VolunteersApi.admin.listOpportunities({ status: undefined });
      setOpportunities(oppsData);
    } catch (error) {
      setError(getErrorMessage(error, "Failed to create opportunity."));
    }
  };

  // Lazy-load sessions + events the first time the admin flips the
  // attach-to picker off "standalone". Cheap, and avoids loading them on
  // every page render.
  const ensureAttachLookups = async (mode: "session" | "event") => {
    if (mode === "session" && attachSessions.length === 0) {
      setAttachLoading(true);
      try {
        const sessions = await SessionsApi.listSessions({ include_drafts: true });
        const todayIso = new Date().toISOString();
        // Limit to the next 90 days — same window as the design doc.
        const cutoffMs = Date.now() + 90 * 24 * 60 * 60 * 1000;
        setAttachSessions(
          sessions
            .filter((s) => s.starts_at >= todayIso && new Date(s.starts_at).getTime() <= cutoffMs)
            .map((s) => ({
              id: s.id,
              title: s.title,
              starts_at: s.starts_at,
              ends_at: s.ends_at,
              location_name: (s as { location_name?: string | null }).location_name,
            })),
        );
      } finally {
        setAttachLoading(false);
      }
    }
    if (mode === "event" && attachEvents.length === 0) {
      setAttachLoading(true);
      try {
        const events = await apiGet<
          {
            id: string;
            title: string;
            start_time: string;
            end_time?: string | null;
            location?: string | null;
          }[]
        >("/api/v1/events/", { auth: true });
        const todayIso = new Date().toISOString();
        setAttachEvents(events.filter((ev) => ev.start_time >= todayIso));
      } finally {
        setAttachLoading(false);
      }
    }
  };

  // When the admin picks a session/event from the attach-to dropdown,
  // copy date/start/end/location into the form fields. The form fields
  // themselves stay editable — the picker is convenience, not coercion.
  const handleAttachSelect = (id: string) => {
    if (oppForm.attach_mode === "session") {
      const s = attachSessions.find((x) => x.id === id);
      if (!s) {
        setOppForm({ ...oppForm, session_id: id });
        return;
      }
      const startDt = new Date(s.starts_at);
      const endDt = new Date(s.ends_at);
      const isoDate = startDt.toISOString().slice(0, 10);
      const isoStart = startDt.toTimeString().slice(0, 5);
      const isoEnd = endDt.toTimeString().slice(0, 5);
      setOppForm({
        ...oppForm,
        session_id: id,
        date: isoDate,
        start_time: isoStart,
        end_time: isoEnd,
        location_name: s.location_name || oppForm.location_name,
      });
    } else if (oppForm.attach_mode === "event") {
      const ev = attachEvents.find((x) => x.id === id);
      if (!ev) {
        setOppForm({ ...oppForm, event_id: id });
        return;
      }
      const startDt = new Date(ev.start_time);
      const endDt = ev.end_time ? new Date(ev.end_time) : null;
      const isoDate = startDt.toISOString().slice(0, 10);
      const isoStart = startDt.toTimeString().slice(0, 5);
      const isoEnd = endDt ? endDt.toTimeString().slice(0, 5) : "";
      setOppForm({
        ...oppForm,
        event_id: id,
        date: isoDate,
        start_time: isoStart,
        end_time: isoEnd,
        location_name: ev.location || oppForm.location_name,
      });
    }
  };

  // Open the "Find session" modal for an unattached opportunity. Fetches
  // sessions matching the opportunity's date + location_name (case
  // insensitive, trimmed). Matching is intentionally fuzzy on time.
  const openSuggestModal = async (opp: VolunteerOpportunity) => {
    setSuggestForOpp(opp);
    setSuggestCandidates([]);
    setSuggestLoading(true);
    try {
      const sessions = await SessionsApi.listSessions({ include_drafts: true });
      const oppLoc = (opp.location_name ?? "").trim().toLowerCase();
      const candidates = sessions
        .filter((s) => {
          const sessionDateIso = new Date(s.starts_at).toISOString().slice(0, 10);
          if (sessionDateIso !== opp.date) return false;
          if (!oppLoc) return true; // no opp location → date match is best we have
          const sLoc = ((s as { location_name?: string | null }).location_name ?? "")
            .trim()
            .toLowerCase();
          return sLoc === oppLoc;
        })
        .map((s) => ({
          id: s.id,
          title: s.title,
          starts_at: s.starts_at,
          ends_at: s.ends_at,
          location_name: (s as { location_name?: string | null }).location_name,
        }));
      setSuggestCandidates(candidates);
    } catch (e) {
      setError(getErrorMessage(e, "Failed to find matching sessions."));
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleAttachOpportunityToSession = async (sessionId: string) => {
    if (!suggestForOpp) return;
    setAttachingSessionId(sessionId);
    try {
      await VolunteersApi.admin.updateOpportunity(suggestForOpp.id, {
        session_id: sessionId,
      } as Partial<VolunteerOpportunity>);
      const oppsData = await VolunteersApi.admin.listOpportunities({ status: undefined });
      setOpportunities(oppsData);
      setSuggestForOpp(null);
      setSuggestCandidates([]);
    } catch (e) {
      setError(getErrorMessage(e, "Failed to attach opportunity to session."));
    } finally {
      setAttachingSessionId(null);
    }
  };

  const handlePublish = async (oppId: string) => {
    try {
      await VolunteersApi.admin.publishOpportunity(oppId);
      const oppsData = await VolunteersApi.admin.listOpportunities({ status: undefined });
      setOpportunities(oppsData);
    } catch (error) {
      setError(getErrorMessage(error, "Failed to publish opportunity."));
    }
  };

  // ── Volunteer handlers ──────────────────────────────────────────
  const openLogHoursModal = (profile: VolunteerProfile) => {
    setHoursTarget(profile);
    setHoursForm({
      hours: "",
      date: new Date().toISOString().slice(0, 10),
      notes: "",
    });
    setShowHoursModal(true);
  };

  const openFeatureModal = (profile: VolunteerProfile) => {
    setFeatureTarget(profile);
    setFeatureForm({
      spotlight_quote: profile.spotlight_quote || "",
      featured_until: "",
    });
    setShowFeatureModal(true);
  };

  const handleLogHours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hoursTarget) return;
    const hours = parseFloat(hoursForm.hours);
    if (isNaN(hours) || hours <= 0) {
      setError("Please enter a valid number of hours.");
      return;
    }
    try {
      await VolunteersApi.admin.addManualHours({
        member_id: hoursTarget.member_id,
        hours,
        date: hoursForm.date,
        notes: hoursForm.notes || undefined,
      });
      setShowHoursModal(false);
      setHoursTarget(null);
      setHoursForm({ hours: "", date: new Date().toISOString().slice(0, 10), notes: "" });
      const profilesData = await VolunteersApi.admin.listProfiles({ active_only: false });
      setProfiles(profilesData);
    } catch (error) {
      setError(getErrorMessage(error, "Failed to log hours."));
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
      const profilesData = await VolunteersApi.admin.listProfiles({ active_only: false });
      setProfiles(profilesData);
    } catch (error) {
      setError(getErrorMessage(error, "Failed to feature volunteer."));
    }
  };

  const handleUnfeature = async (memberId: string) => {
    try {
      await VolunteersApi.admin.unfeatureVolunteer(memberId);
      const profilesData = await VolunteersApi.admin.listProfiles({ active_only: false });
      setProfiles(profilesData);
    } catch (error) {
      setError(getErrorMessage(error, "Failed to unfeature volunteer."));
    }
  };

  // ── Render ──────────────────────────────────────────────────────
  if (loading) return <LoadingPage text="Loading volunteer management..." />;

  const pendingApprovals = opportunities.filter(
    (o) => o.status === "open" && o.opportunity_type === "approval_required",
  ).length;

  return (
    <div className="space-y-4 md:space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Volunteers</h1>
        <p className="text-sm text-slate-600">Manage roles, opportunities, and volunteer roster</p>
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

      <TabsNav
        tab={tab}
        setTab={setTab}
        opportunitiesCount={opportunities.length}
        volunteersCount={profiles.length}
        rolesCount={roles.length}
      />

      {tab === "dashboard" && dashboard && (
        <DashboardTab dashboard={dashboard} setTab={setTab} />
      )}

      {tab === "opportunities" && (
        <>
          <OpportunitiesTab
            opportunities={opportunities}
            onCreate={() => setShowCreateOpp(true)}
            onPublish={handlePublish}
            onOpenSuggest={openSuggestModal}
          />

          <CreateOpportunityModal
            isOpen={showCreateOpp}
            onClose={() => setShowCreateOpp(false)}
            oppForm={oppForm}
            setOppForm={setOppForm}
            roles={roles}
            attachSessions={attachSessions}
            attachEvents={attachEvents}
            attachLoading={attachLoading}
            ensureAttachLookups={ensureAttachLookups}
            onAttachSelect={handleAttachSelect}
            onSubmit={handleCreateOpportunity}
          />

          <FindSessionModal
            suggestForOpp={suggestForOpp}
            suggestCandidates={suggestCandidates}
            suggestLoading={suggestLoading}
            attachingSessionId={attachingSessionId}
            onClose={() => {
              setSuggestForOpp(null);
              setSuggestCandidates([]);
            }}
            onAttach={handleAttachOpportunityToSession}
          />
        </>
      )}

      {tab === "volunteers" && (
        <VolunteersTab
          profiles={profiles}
          onOpenLogHours={openLogHoursModal}
          onOpenFeature={openFeatureModal}
          onUnfeature={handleUnfeature}
        />
      )}

      <FeatureVolunteerModal
        isOpen={showFeatureModal}
        onClose={() => {
          setShowFeatureModal(false);
          setFeatureTarget(null);
        }}
        target={featureTarget}
        featureForm={featureForm}
        setFeatureForm={setFeatureForm}
        onSubmit={handleFeature}
      />

      <LogHoursModal
        isOpen={showHoursModal}
        onClose={() => {
          setShowHoursModal(false);
          setHoursTarget(null);
        }}
        target={hoursTarget}
        hoursForm={hoursForm}
        setHoursForm={setHoursForm}
        onSubmit={handleLogHours}
      />

      {tab === "roles" && (
        <>
          <RolesTab
            roles={roles}
            onCreate={() => setShowCreateRole(true)}
            onEdit={openEditRole}
            onToggle={handleToggleRole}
          />

          <CreateRoleModal
            isOpen={showCreateRole}
            onClose={() => setShowCreateRole(false)}
            roleForm={roleForm}
            setRoleForm={setRoleForm}
            onSubmit={handleCreateRole}
          />

          <EditRoleModal
            isOpen={showEditRole}
            onClose={() => {
              setShowEditRole(false);
              setEditingRole(null);
            }}
            editingRole={editingRole}
            roleForm={roleForm}
            setRoleForm={setRoleForm}
            onSubmit={handleEditRole}
          />
        </>
      )}

      {tab === "templates" && (
        <VolunteerTemplatesTab
          roles={roles}
          onOpportunitiesChanged={async () => {
            // Re-fetch opportunities after the admin generates from a
            // template so the Opportunities tab reflects them immediately.
            const oppsData = await VolunteersApi.admin.listOpportunities({ status: undefined });
            setOpportunities(oppsData);
          }}
        />
      )}
    </div>
  );
}
