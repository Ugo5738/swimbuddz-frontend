"use client";

import { GenerateSessionsModal } from "@/components/admin/GenerateSessionsModal";
import { SessionCalendar } from "@/components/admin/SessionCalendar";
import { SessionDetailsModal } from "@/components/admin/SessionDetailsModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { supabase } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import {
  LOCATION_LABELS as SHARED_LOCATION_LABELS,
  SESSION_TYPE_COLORS as SHARED_TYPE_CLR,
  SESSION_TYPE_LABELS as SHARED_TYPE_LABELS,
} from "@/lib/sessions";
import type { DateSelectArg, EventClickArg, EventInput } from "@fullcalendar/core";
import {
  Calendar,
  CheckCircle,
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
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type SessionStatusType = "draft" | "scheduled" | "in_progress" | "completed" | "cancelled";
type SessionType =
  | "club"
  | "academy"
  | "community"
  | "cohort_class"
  | "one_on_one"
  | "group_booking"
  | "event";
type ViewMode = "calendar" | "list";
type FilterTab = "all" | SessionStatusType;

interface Session {
  id: string;
  title: string;
  session_type?: SessionType;
  status?: SessionStatusType;
  published_at?: string;
  location: string;
  location_name?: string;
  starts_at: string;
  ends_at: string;
  pool_fee: number;
  ride_share_fee?: number;
  capacity: number;
  description?: string;
  notes?: string;
  template_id?: string;
  is_recurring_instance?: boolean;
  cohort_id?: string;
  timezone?: string;
}

interface Template {
  id: string;
  title: string;
  day_of_week: number;
  start_time: string;
  duration_minutes: number;
  location: string;
  session_type?: string;
  pool_fee: number;
  ride_share_fee?: number;
  capacity: number;
  auto_generate: boolean;
  is_active: boolean;
  description?: string;
  ride_share_config?: any;
}

interface RideArea {
  id: string;
  name: string;
  pickup_locations: any[];
}

const PER_PAGE = 20;

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const LOCATION_LABELS = SHARED_LOCATION_LABELS;

const TYPE_LABELS: Record<SessionType, string> = SHARED_TYPE_LABELS as Record<SessionType, string>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function apiFetch(path: string, opts: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...opts.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return res;
}

function formatDateTimeLocal(date: Date) {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${d}T${h}:${mi}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function locationLabel(loc: string) {
  return LOCATION_LABELS[loc] || loc;
}

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

const TYPE_CLR = SHARED_TYPE_CLR;

function TypeBadge({ t }: { t: string }) {
  const label = TYPE_LABELS[t as SessionType] || t;
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${TYPE_CLR[t] || "bg-slate-100 text-slate-600"}`}
    >
      {label}
    </span>
  );
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    draft: {
      cls: "bg-amber-50 text-amber-700",
      icon: <FileEdit className="h-3 w-3" />,
      label: "Draft",
    },
    scheduled: {
      cls: "bg-green-50 text-green-700",
      icon: <CheckCircle className="h-3 w-3" />,
      label: "Scheduled",
    },
    in_progress: {
      cls: "bg-blue-50 text-blue-700",
      icon: <Clock className="h-3 w-3" />,
      label: "In Progress",
    },
    completed: {
      cls: "bg-slate-100 text-slate-600",
      icon: <CheckCircle className="h-3 w-3" />,
      label: "Completed",
    },
    cancelled: {
      cls: "bg-red-50 text-red-700",
      icon: <XCircle className="h-3 w-3" />,
      label: "Cancelled",
    },
  };
  const m = map[s] || map.scheduled;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${m.cls}`}
    >
      {m.icon}
      {m.label}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: boolean;
  onClick?: () => void;
}) {
  return (
    <Card
      className={`flex items-center gap-3 p-4 ${accent ? "ring-1 ring-amber-200" : ""} ${onClick ? "cursor-pointer hover:bg-slate-50 transition" : ""}`}
      onClick={onClick}
    >
      {icon}
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </Card>
  );
}

function IBtn({
  children,
  title,
  className = "text-slate-500 hover:bg-slate-100",
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  title: string;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded p-1.5 transition ${className} disabled:opacity-40`}
      title={title}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Color legend for calendar
// ---------------------------------------------------------------------------

const LEGEND_ITEMS: { key: SessionType; label: string; cls: string }[] = [
  { key: "club", label: "Club", cls: "bg-cyan-600" },
  { key: "community", label: "Community", cls: "bg-purple-600" },
  { key: "cohort_class", label: "Academy", cls: "bg-orange-600" },
  { key: "one_on_one", label: "1-on-1", cls: "bg-emerald-600" },
  { key: "group_booking", label: "Group", cls: "bg-blue-600" },
  { key: "event", label: "Event", cls: "bg-rose-600" },
];

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
    async (sessionData: any, rideConfigs: any[], publishAfter?: boolean) => {
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

        if (publishAfter) {
          await apiFetch(`/api/v1/sessions/${created.id}/publish`, { method: "POST" });
          toast.success("Session created and published");
        } else {
          toast.success("Session created as draft");
        }

        setFormModal(null);
        await fetchData();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create session");
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchData]
  );

  const handleUpdateSession = useCallback(
    async (id: string, sessionData: any, rideConfigs: any[]) => {
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
    async (data: any) => {
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
    async (id: string, data: any) => {
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

// ---------------------------------------------------------------------------
// SessionFormModal — unified create + edit
// ---------------------------------------------------------------------------

function SessionFormModal({
  mode,
  session,
  initialDate,
  rideAreas,
  submitting,
  onClose,
  onCreate,
  onUpdate,
}: {
  mode: "create" | "edit";
  session?: Session | null;
  initialDate?: Date | null;
  rideAreas: RideArea[];
  submitting: boolean;
  onClose: () => void;
  onCreate: (data: any, rideConfigs: any[], publishAfter?: boolean) => void;
  onUpdate: (id: string, data: any, rideConfigs: any[]) => void;
}) {
  const now = new Date();
  const defaultStart = initialDate || now;
  const defaultEnd = new Date(defaultStart.getTime() + 3 * 60 * 60 * 1000);

  const [form, setForm] = useState({
    title: session?.title || "",
    session_type: session?.session_type || "club",
    location: session?.location || "sunfit_pool",
    starts_at: session
      ? formatDateTimeLocal(new Date(session.starts_at))
      : formatDateTimeLocal(defaultStart),
    ends_at: session
      ? formatDateTimeLocal(new Date(session.ends_at))
      : formatDateTimeLocal(defaultEnd),
    pool_fee: session?.pool_fee ?? 2000,
    capacity: session?.capacity ?? 20,
    description: session?.description || "",
    publish_status: "draft" as "draft" | "published",
  });

  const [rideConfigs, setRideConfigs] = useState<
    Array<{ ride_area_id: string; cost: number; capacity: number; departure_time: string }>
  >([]);
  const [showRide, setShowRide] = useState(false);

  const addRideConfig = () => {
    setShowRide(true);
    setRideConfigs((prev) => [
      ...prev,
      {
        ride_area_id: "",
        cost: 1000,
        capacity: 4,
        departure_time: formatDateTimeLocal(
          new Date(new Date(form.starts_at).getTime() - 2 * 60 * 60 * 1000)
        ),
      },
    ]);
  };

  const removeRideConfig = (i: number) => {
    setRideConfigs((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateRideConfig = (i: number, field: string, value: any) => {
    setRideConfigs((prev) => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sessionData = {
      title: form.title,
      session_type: form.session_type,
      location: form.location,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      pool_fee: form.pool_fee,
      capacity: form.capacity,
      description: form.description || undefined,
    };

    const validRides = rideConfigs
      .filter((c) => c.ride_area_id)
      .map((c) => ({
        ride_area_id: c.ride_area_id,
        cost: parseFloat(c.cost as any) || 0,
        capacity: parseInt(c.capacity as any) || 4,
        departure_time: c.departure_time ? new Date(c.departure_time).toISOString() : null,
      }));

    if (mode === "edit" && session) {
      onUpdate(session.id, sessionData, validRides);
    } else {
      onCreate(sessionData, validRides, form.publish_status === "published");
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={mode === "create" ? "Create Session" : "Edit Session"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Session Type"
            value={form.session_type}
            onChange={(e) => setForm({ ...form, session_type: e.target.value as any })}
          >
            <option value="club">Club</option>
            <option value="cohort_class">Academy / Cohort Class</option>
            <option value="community">Community</option>
            <option value="one_on_one">One-on-One</option>
            <option value="group_booking">Group Booking</option>
            <option value="event">Event</option>
          </Select>
          <Select
            label="Location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          >
            <option value="sunfit_pool">Sunfit Pool</option>
            <option value="rowe_park_pool">Rowe Park Pool</option>
            <option value="federal_palace_pool">Federal Palace Pool</option>
            <option value="open_water">Open Water</option>
          </Select>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Start Time"
            type="datetime-local"
            value={form.starts_at}
            onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
            required
          />
          <Input
            label="End Time"
            type="datetime-local"
            value={form.ends_at}
            onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
            required
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Pool Fee (₦)"
            type="number"
            value={form.pool_fee}
            onChange={(e) => setForm({ ...form, pool_fee: parseInt(e.target.value) || 0 })}
            required
          />
          <Input
            label="Capacity"
            type="number"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })}
            required
          />
        </div>
        <Textarea
          label="Description (optional)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        {mode === "create" && (
          <Select
            label="Status"
            value={form.publish_status}
            onChange={(e) =>
              setForm({ ...form, publish_status: e.target.value as "draft" | "published" })
            }
          >
            <option value="draft">Draft</option>
            <option value="published">Published (visible to members immediately)</option>
          </Select>
        )}

        {/* Ride Share section */}
        <div className="border-t border-slate-200 pt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Ride Share Options</span>
            <button
              type="button"
              onClick={addRideConfig}
              className="text-sm text-cyan-600 hover:text-cyan-800"
            >
              + Add Ride Area
            </button>
          </div>
          {rideConfigs.map((cfg, i) => (
            <div key={i} className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Ride Area {i + 1}</span>
                <button
                  type="button"
                  onClick={() => removeRideConfig(i)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Select
                  label="Area"
                  value={cfg.ride_area_id}
                  onChange={(e) => updateRideConfig(i, "ride_area_id", e.target.value)}
                  required
                >
                  <option value="">-- Select --</option>
                  {rideAreas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.pickup_locations.length} stops)
                    </option>
                  ))}
                </Select>
                <Input
                  label="Cost (N)"
                  type="number"
                  value={cfg.cost}
                  onChange={(e) => updateRideConfig(i, "cost", parseFloat(e.target.value))}
                />
                <Input
                  label="Capacity (seats)"
                  type="number"
                  value={cfg.capacity}
                  onChange={(e) => updateRideConfig(i, "capacity", parseInt(e.target.value))}
                />
                <Input
                  label="Departure Time"
                  type="datetime-local"
                  value={cfg.departure_time}
                  onChange={(e) => updateRideConfig(i, "departure_time", e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : mode === "create" ? "Create Session" : "Save Changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Templates Drawer
// ---------------------------------------------------------------------------

function TemplatesDrawer({
  templates,
  rideAreas,
  templateForm,
  editingTemplate,
  onClose,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onGenerate,
  onOpenForm,
}: {
  templates: Template[];
  rideAreas: RideArea[];
  templateForm: "create" | "edit" | null;
  editingTemplate: Template | null;
  onClose: () => void;
  onCreateTemplate: (data: any) => void;
  onUpdateTemplate: (id: string, data: any) => void;
  onDeleteTemplate: (id: string) => void;
  onGenerate: (t: Template) => void;
  onOpenForm: (mode: "create" | "edit", tmpl?: Template) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      {/* Panel */}
      <div className="relative z-10 flex w-full max-w-md flex-col bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Session Templates</h2>
          <button onClick={onClose} className="rounded p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {templateForm ? (
            <TemplateFormInline
              mode={templateForm}
              template={editingTemplate}
              rideAreas={rideAreas}
              onCancel={() => onOpenForm(null as any)}
              onCreate={onCreateTemplate}
              onUpdate={onUpdateTemplate}
            />
          ) : (
            <>
              <Button
                onClick={() => onOpenForm("create")}
                className="mb-4 flex w-full items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" /> New Template
              </Button>

              {templates.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No templates yet. Create one to generate recurring sessions.
                </p>
              ) : (
                <div className="space-y-3">
                  {templates.map((t) => (
                    <div key={t.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900">{t.title}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {DAY_NAMES[t.day_of_week]} at {t.start_time} &middot;{" "}
                            {t.duration_minutes}min
                          </p>
                          <p className="text-xs text-slate-500">
                            {locationLabel(t.location)} &middot; N{t.pool_fee} &middot; {t.capacity}{" "}
                            cap
                          </p>
                        </div>
                        <IBtn
                          title="Delete template"
                          className="text-slate-400 hover:bg-red-50 hover:text-red-600"
                          onClick={() => onDeleteTemplate(t.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </IBtn>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => onGenerate(t)}
                          className="flex items-center gap-1"
                        >
                          <Calendar className="h-3.5 w-3.5" /> Generate
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onOpenForm("edit", t)}
                          className="flex items-center gap-1"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Template form (rendered inline within the drawer)
// ---------------------------------------------------------------------------

function TemplateFormInline({
  mode,
  template,
  rideAreas,
  onCancel,
  onCreate,
  onUpdate,
}: {
  mode: "create" | "edit";
  template: Template | null;
  rideAreas: RideArea[];
  onCancel: () => void;
  onCreate: (data: any) => void;
  onUpdate: (id: string, data: any) => void;
}) {
  const [form, setForm] = useState({
    title: template?.title || "",
    session_type: template?.session_type || "club",
    location: template?.location || "sunfit_pool",
    day_of_week: template?.day_of_week ?? 5,
    start_time: template?.start_time || "09:00",
    duration_minutes: template?.duration_minutes || 180,
    pool_fee: template?.pool_fee || 2000,
    capacity: template?.capacity || 20,
    auto_generate: template?.auto_generate || false,
  });

  const [rideConfigs, setRideConfigs] = useState<
    Array<{ ride_area_id: string; cost: number; capacity: number }>
  >(
    template?.ride_share_config && Array.isArray(template.ride_share_config)
      ? template.ride_share_config.map((c: any) => ({
          ride_area_id: c.ride_area_id || "",
          cost: c.cost || 0,
          capacity: c.capacity || 4,
        }))
      : []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...form,
      ride_share_config: rideConfigs
        .filter((c) => c.ride_area_id)
        .map((c) => ({
          ride_area_id: c.ride_area_id,
          cost: parseFloat(c.cost as any) || 0,
          capacity: parseInt(c.capacity as any) || 4,
        })),
    };
    if (mode === "edit" && template) {
      onUpdate(template.id, data);
    } else {
      onCreate(data);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-semibold text-slate-900">
        {mode === "create" ? "New Template" : "Edit Template"}
      </h3>
      <Input
        label="Title"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        required
      />
      <Select
        label="Session Type"
        value={form.session_type}
        onChange={(e) => setForm({ ...form, session_type: e.target.value })}
      >
        <option value="club">Club</option>
        <option value="cohort_class">Academy / Cohort Class</option>
        <option value="community">Community</option>
        <option value="one_on_one">One-on-One</option>
        <option value="group_booking">Group Booking</option>
        <option value="event">Event</option>
      </Select>
      <Select
        label="Day of Week"
        value={form.day_of_week.toString()}
        onChange={(e) => setForm({ ...form, day_of_week: parseInt(e.target.value) })}
      >
        {DAY_NAMES.map((d, i) => (
          <option key={i} value={i}>
            {d}
          </option>
        ))}
      </Select>
      <Input
        label="Start Time"
        type="time"
        value={form.start_time}
        onChange={(e) => setForm({ ...form, start_time: e.target.value })}
        required
      />
      <Select
        label="Location"
        value={form.location}
        onChange={(e) => setForm({ ...form, location: e.target.value })}
      >
        <option value="sunfit_pool">Sunfit Pool</option>
        <option value="rowe_park_pool">Rowe Park Pool</option>
        <option value="federal_palace_pool">Federal Palace Pool</option>
        <option value="open_water">Open Water</option>
      </Select>
      <Input
        label="Duration (minutes)"
        type="number"
        value={form.duration_minutes}
        onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })}
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Pool Fee (N)"
          type="number"
          value={form.pool_fee}
          onChange={(e) => setForm({ ...form, pool_fee: parseInt(e.target.value) || 0 })}
        />
        <Input
          label="Capacity"
          type="number"
          value={form.capacity}
          onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })}
        />
      </div>

      {/* Ride share config */}
      <div className="border-t border-slate-200 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Ride Share (optional)</span>
          <button
            type="button"
            onClick={() =>
              setRideConfigs((p) => [...p, { ride_area_id: "", cost: 1000, capacity: 4 }])
            }
            className="text-sm text-cyan-600 hover:text-cyan-800"
          >
            + Add
          </button>
        </div>
        {rideConfigs.map((cfg, i) => (
          <div key={i} className="mb-2 rounded border border-slate-200 bg-white p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Area {i + 1}</span>
              <button
                type="button"
                onClick={() => setRideConfigs((p) => p.filter((_, idx) => idx !== i))}
                className="text-xs text-red-600"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Select
                label="Area"
                value={cfg.ride_area_id}
                onChange={(e) => {
                  const next = [...rideConfigs];
                  next[i] = { ...cfg, ride_area_id: e.target.value };
                  setRideConfigs(next);
                }}
              >
                <option value="">--</option>
                {rideAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
              <Input
                label="Cost"
                type="number"
                value={cfg.cost}
                onChange={(e) => {
                  const next = [...rideConfigs];
                  next[i] = { ...cfg, cost: parseFloat(e.target.value) };
                  setRideConfigs(next);
                }}
              />
              <Input
                label="Seats"
                type="number"
                value={cfg.capacity}
                onChange={(e) => {
                  const next = [...rideConfigs];
                  next[i] = { ...cfg, capacity: parseInt(e.target.value) };
                  setRideConfigs(next);
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" className="flex-1">
          {mode === "create" ? "Create Template" : "Update Template"}
        </Button>
      </div>
    </form>
  );
}
