"use client";

import { GenerateSessionsModal } from "@/components/admin/GenerateSessionsModal";
import { SessionCalendar } from "@/components/admin/SessionCalendar";
import { SessionDetailsModal } from "@/components/admin/SessionDetailsModal";
import { SessionFormModal } from "@/components/admin/SessionFormModal";
import { TemplatesDrawer, type TemplateFormPayload } from "@/components/admin/TemplatesDrawer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { DateSelectArg, EventClickArg, EventInput } from "@fullcalendar/core";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileEdit,
  LayoutTemplate,
  List,
  Pencil,
  Plus,
  Repeat,
  Search,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { IBtn, StatCard, StatusBadge, TypeBadge } from "./components";
import type {
  FilterTab,
  RideArea,
  Session,
  SessionPayload,
  SessionRideConfig,
  SessionStatusType,
  Template,
  ViewMode,
} from "./types";
import { apiFetch, fmtDate, fmtTime, LEGEND_ITEMS, locationLabel, PER_PAGE } from "./utils";

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [rideAreas, setRideAreas] = useState<RideArea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<ViewMode>("calendar");

  // Modal / drawer state
  const [formModal, setFormModal] = useState<"create" | "edit" | null>(null);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [initialDate, setInitialDate] = useState<Date | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateForm, setTemplateForm] = useState<"create" | "edit" | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [generateTemplate, setGenerateTemplate] = useState<Template | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Re-entrancy guard for session creation. The submit button is disabled
  // via isSubmitting, but React state updates are async, so a fast
  // double-click can fire a second create before the disable lands. This
  // ref blocks the second call synchronously, preventing duplicate sessions.
  const creatingRef = useRef(false);

  // ---- Fetch ----
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [sessRes, tmplRes, areasRes] = await Promise.all([
        apiFetch("/api/v1/sessions/?include_drafts=true"),
        apiFetch("/api/v1/sessions/templates").catch(() => null),
        apiFetch("/api/v1/transport/areas").catch(() => null),
      ]);
      setSessions(await sessRes.json());
      if (tmplRes) setTemplates(await tmplRes.json());
      if (areasRes) setRideAreas(await areasRes.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---- Derived data ----
  const counts = useMemo(() => {
    const c = { all: 0, draft: 0, scheduled: 0, in_progress: 0, completed: 0, cancelled: 0 };
    const now = new Date();
    let upcoming = 0;
    for (const s of sessions) {
      c.all++;
      const st = (s.status || "scheduled") as SessionStatusType;
      if (st in c) c[st]++;
      if (st === "scheduled" && new Date(s.starts_at) > now) upcoming++;
    }
    return { ...c, upcoming };
  }, [sessions]);

  const filtered = useMemo(() => {
    let list = sessions;
    if (filterTab !== "all") {
      list = list.filter((s) => (s.status || "scheduled") === filterTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.location_name || locationLabel(s.location)).toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
  }, [sessions, filterTab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [filterTab, search]);

  const calendarEvents: EventInput[] = useMemo(
    () =>
      filtered.map((s) => ({
        id: s.id,
        title: s.title,
        start: s.starts_at,
        end: s.ends_at,
        extendedProps: {
          session_type: s.session_type || "club",
          status: s.status,
          location: s.location,
          pool_fee: s.pool_fee,
          capacity: s.capacity,
          is_recurring_instance: s.is_recurring_instance,
        },
      })),
    [filtered]
  );

  // ---- Calendar handlers ----
  const handleDateSelect = useCallback((info: DateSelectArg) => {
    setInitialDate(info.start);
    setEditingSession(null);
    setFormModal("create");
  }, []);

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      const s = sessions.find((x) => x.id === info.event.id);
      if (s) setSelectedSession(s);
    },
    [sessions]
  );

  // ---- API actions ----
  const handleCreateSession = useCallback(
    async (
      sessionData: SessionPayload,
      rideConfigs: SessionRideConfig[],
      publishAfter?: boolean
    ) => {
      // Block re-entrant calls (e.g. a fast double-click) before the
      // isSubmitting-driven button disable has a chance to render.
      if (creatingRef.current) return;
      creatingRef.current = true;
      setIsSubmitting(true);
      try {
        const res = await apiFetch("/api/v1/sessions/", {
          method: "POST",
          body: JSON.stringify(sessionData),
        });
        const created = await res.json();

        if (rideConfigs.length > 0) {
          await apiFetch(`/api/v1/transport/sessions/${created.id}/ride-configs`, {
            method: "POST",
            body: JSON.stringify(rideConfigs),
          }).catch((err) => console.error("Ride config error:", err));
        }

        // Cohort-class sessions are auto-scheduled (already published) at
        // creation time by the backend, so calling /publish again returns a
        // 400 "already scheduled". Only publish a session that came back as
        // a DRAFT; otherwise it's already live.
        let published = created.status !== "draft";
        if (publishAfter && created.status === "draft") {
          await apiFetch(`/api/v1/sessions/${created.id}/publish`, { method: "POST" });
          published = true;
        }
        toast.success(published ? "Session created and published" : "Session created as draft");

        setFormModal(null);
        await fetchData();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create session");
      } finally {
        setIsSubmitting(false);
        creatingRef.current = false;
      }
    },
    [fetchData]
  );

  const handleUpdateSession = useCallback(
    async (id: string, sessionData: SessionPayload, rideConfigs: SessionRideConfig[]) => {
      setIsSubmitting(true);
      try {
        await apiFetch(`/api/v1/sessions/${id}`, {
          method: "PATCH",
          body: JSON.stringify(sessionData),
        });

        if (rideConfigs.length > 0) {
          await apiFetch(`/api/v1/transport/sessions/${id}/ride-configs`, {
            method: "POST",
            body: JSON.stringify(rideConfigs),
          }).catch((err) => console.error("Ride config error:", err));
        }

        toast.success("Session updated");
        setFormModal(null);
        setEditingSession(null);
        await fetchData();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update session");
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchData]
  );

  const handleDeleteSession = useCallback(
    async (id: string) => {
      if (!confirm("Delete this session? This cannot be undone.")) return;
      try {
        await apiFetch(`/api/v1/sessions/${id}`, { method: "DELETE" });
        toast.success("Session deleted");
        setSelectedSession(null);
        await fetchData();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete session");
      }
    },
    [fetchData]
  );

  const handlePublishSession = useCallback(
    async (id: string, shortNoticeMessage?: string) => {
      try {
        const query = shortNoticeMessage
          ? `?short_notice_message=${encodeURIComponent(shortNoticeMessage)}`
          : "";
        await apiFetch(`/api/v1/sessions/${id}/publish${query}`, { method: "POST" });
        toast.success("Session published");
        setSelectedSession(null);
        await fetchData();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to publish session");
      }
    },
    [fetchData]
  );

  const handleCancelSession = useCallback(
    async (id: string, reason?: string) => {
      try {
        const query = reason ? `?cancellation_reason=${encodeURIComponent(reason)}` : "";
        await apiFetch(`/api/v1/sessions/${id}/cancel${query}`, { method: "POST" });
        toast.success("Session cancelled");
        setSelectedSession(null);
        await fetchData();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to cancel session");
      }
    },
    [fetchData]
  );

  const handleGenerateSessions = useCallback(
    async (templateId: string, weeks: number, skipConflicts: boolean) => {
      const res = await apiFetch(`/api/v1/sessions/templates/${templateId}/generate`, {
        method: "POST",
        body: JSON.stringify({ weeks, skip_conflicts: skipConflicts }),
      });
      const result = await res.json();
      await fetchData();
      return result;
    },
    [fetchData]
  );

  const handleCreateTemplate = useCallback(
    async (data: TemplateFormPayload) => {
      try {
        await apiFetch("/api/v1/sessions/templates", {
          method: "POST",
          body: JSON.stringify(data),
        });
        toast.success("Template created");
        setTemplateForm(null);
        await fetchData();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create template");
      }
    },
    [fetchData]
  );

  const handleUpdateTemplate = useCallback(
    async (id: string, data: TemplateFormPayload) => {
      try {
        await apiFetch(`/api/v1/sessions/templates/${id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
        toast.success("Template updated");
        setTemplateForm(null);
        setEditingTemplate(null);
        await fetchData();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update template");
      }
    },
    [fetchData]
  );

  const handleDeleteTemplate = useCallback(
    async (id: string) => {
      if (!confirm("Delete this template?")) return;
      try {
        await apiFetch(`/api/v1/sessions/templates/${id}`, { method: "DELETE" });
        toast.success("Template deleted");
        await fetchData();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete template");
      }
    },
    [fetchData]
  );

  // ---- Interaction helpers ----
  const openCreate = () => {
    setEditingSession(null);
    setInitialDate(null);
    setFormModal("create");
  };

  const openEdit = (s: Session) => {
    setEditingSession(s);
    setFormModal("edit");
  };

  // ---- Tab config ----
  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "draft", label: "Draft" },
    { key: "scheduled", label: "Scheduled" },
    { key: "in_progress", label: "In Progress" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
  ];

  // ---- Render ----
  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600">
            Admin &middot; Sessions
          </p>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-4xl">Sessions</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage swim sessions, templates, and scheduling.
          </p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Create Session
        </Button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total Sessions"
          value={counts.all}
          icon={<Calendar className="h-5 w-5 text-cyan-500" />}
        />
        <StatCard
          label="Upcoming"
          value={counts.upcoming}
          icon={<Clock className="h-5 w-5 text-slate-400" />}
        />
        <StatCard
          label="Drafts"
          value={counts.draft}
          icon={<FileEdit className="h-5 w-5 text-amber-500" />}
          accent={counts.draft > 0}
          onClick={() => setFilterTab("draft")}
        />
        <StatCard
          label="Cancelled"
          value={counts.cancelled}
          icon={<XCircle className="h-5 w-5 text-red-400" />}
        />
      </div>

      {/* Search + tabs */}
      <div className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title or location..."
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

      {/* View toggle + templates */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setView("calendar")}
          className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition sm:px-4 ${
            view === "calendar"
              ? "bg-cyan-600 text-white"
              : "bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">Calendar</span>
        </button>
        <button
          onClick={() => setView("list")}
          className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition sm:px-4 ${
            view === "list" ? "bg-cyan-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          <List className="h-4 w-4" />
          <span className="hidden sm:inline">List</span>
        </button>
        <div className="ml-auto">
          <Button
            variant="secondary"
            onClick={() => setShowTemplates(true)}
            className="flex items-center gap-2"
          >
            <LayoutTemplate className="h-4 w-4" />
            <span className="hidden sm:inline">Templates</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <LoadingSpinner size="lg" text="Loading sessions..." />
        </div>
      ) : error ? (
        <div className="p-6 text-center text-red-500">{error}</div>
      ) : view === "calendar" ? (
        <>
          {/* Color legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-slate-600">
            {LEGEND_ITEMS.map((l) => (
              <span key={l.key} className="flex items-center gap-1.5">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${l.cls}`} />
                {l.label}
              </span>
            ))}
          </div>
          <SessionCalendar
            events={calendarEvents}
            onDateSelect={handleDateSelect}
            onEventClick={handleEventClick}
          />
        </>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">
          {search
            ? "No sessions match your search."
            : `No ${filterTab === "all" ? "" : filterTab + " "}sessions found.`}
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          {/* Mobile list */}
          <div className="divide-y divide-slate-100 sm:hidden">
            {pageItems.map((s) => (
              <div key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate font-medium text-slate-900">
                      {s.is_recurring_instance && (
                        <Repeat className="h-3 w-3 shrink-0 text-slate-400" />
                      )}
                      {s.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {fmtDate(s.starts_at)} &middot; {fmtTime(s.starts_at)}&ndash;
                      {fmtTime(s.ends_at)}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {s.location_name || locationLabel(s.location)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <TypeBadge t={s.session_type || "club"} />
                    <StatusBadge s={s.status || "scheduled"} />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 border-t border-slate-100 pt-3">
                  <IBtn title="View details" onClick={() => setSelectedSession(s)}>
                    <Eye className="h-4 w-4" />
                  </IBtn>
                  <IBtn title="Edit" onClick={() => openEdit(s)}>
                    <Pencil className="h-4 w-4" />
                  </IBtn>
                  {(s.status || "scheduled") === "draft" && (
                    <IBtn
                      title="Publish"
                      className="text-green-600 hover:bg-green-50"
                      onClick={() => handlePublishSession(s.id)}
                    >
                      <Send className="h-4 w-4" />
                    </IBtn>
                  )}
                  <IBtn
                    title="Delete"
                    className="text-slate-400 hover:bg-red-50 hover:text-red-600"
                    onClick={() => handleDeleteSession(s.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </IBtn>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Date / Time</th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">Location</th>
                  <th className="px-4 py-3 font-semibold">Cap.</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageItems.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 font-medium text-slate-900">
                        {s.is_recurring_instance && (
                          <Repeat className="h-3 w-3 shrink-0 text-slate-400" />
                        )}
                        {s.title}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <TypeBadge t={s.session_type || "club"} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge s={s.status || "scheduled"} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {fmtDate(s.starts_at)}
                      <br />
                      <span className="text-xs">
                        {fmtTime(s.starts_at)}&ndash;{fmtTime(s.ends_at)}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                      {s.location_name || locationLabel(s.location)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.capacity}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <IBtn title="View details" onClick={() => setSelectedSession(s)}>
                          <Eye className="h-4 w-4" />
                        </IBtn>
                        <IBtn title="Edit" onClick={() => openEdit(s)}>
                          <Pencil className="h-4 w-4" />
                        </IBtn>
                        {(s.status || "scheduled") === "draft" && (
                          <IBtn
                            title="Publish"
                            className="text-green-600 hover:bg-green-50"
                            onClick={() => handlePublishSession(s.id)}
                          >
                            <Send className="h-4 w-4" />
                          </IBtn>
                        )}
                        <IBtn
                          title="Delete"
                          className="text-slate-400 hover:bg-red-50 hover:text-red-600"
                          onClick={() => handleDeleteSession(s.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </IBtn>
                      </div>
                    </td>
                  </tr>
                ))}
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
        </Card>
      )}

      {/* ==== Modals ==== */}

      {/* Session Details Modal */}
      {selectedSession && (
        <SessionDetailsModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          onDelete={handleDeleteSession}
          onEdit={(s) => {
            setSelectedSession(null);
            openEdit(s as Session);
          }}
          onPublish={handlePublishSession}
          onCancel={handleCancelSession}
        />
      )}

      {/* Create / Edit Session Modal */}
      {formModal && (
        <SessionFormModal
          mode={formModal}
          session={editingSession}
          initialDate={initialDate}
          rideAreas={rideAreas}
          submitting={isSubmitting}
          onClose={() => {
            setFormModal(null);
            setEditingSession(null);
          }}
          onCreate={handleCreateSession}
          onUpdate={handleUpdateSession}
        />
      )}

      {/* Generate Sessions Modal */}
      <GenerateSessionsModal
        isOpen={!!generateTemplate}
        onClose={() => setGenerateTemplate(null)}
        template={generateTemplate}
        onGenerate={handleGenerateSessions}
      />

      {/* Templates Drawer */}
      {showTemplates && (
        <TemplatesDrawer
          templates={templates}
          rideAreas={rideAreas}
          templateForm={templateForm}
          editingTemplate={editingTemplate}
          onClose={() => {
            setShowTemplates(false);
            setTemplateForm(null);
            setEditingTemplate(null);
          }}
          onCreateTemplate={handleCreateTemplate}
          onUpdateTemplate={handleUpdateTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          onGenerate={(t) => {
            setGenerateTemplate(t);
          }}
          onOpenForm={(mode, tmpl) => {
            setTemplateForm(mode);
            setEditingTemplate(tmpl || null);
          }}
        />
      )}
    </div>
  );
}
