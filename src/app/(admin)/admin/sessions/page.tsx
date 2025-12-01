"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { SessionCalendar } from "@/components/admin/SessionCalendar";
import { TemplatesSidebar } from "@/components/admin/TemplatesSidebar";
import { GenerateSessionsModal } from "@/components/admin/GenerateSessionsModal";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { OptionPillGroup } from "@/components/forms/OptionPillGroup";
import { Calendar, List, Plus } from "lucide-react";
import type { EventInput, DateSelectArg, EventClickArg } from "@fullcalendar/core";

interface Session {
  id: string;
  title: string;
  type?: "CLUB_SESSION" | "ACADEMY_CLASS" | "MEETUP" | "SPECIAL_EVENT";
  location: string;
  start_time: string;
  end_time: string;
  pool_fee: number;
  capacity: number;
  description?: string;
  template_id?: string;
  is_recurring_instance?: boolean;
}

interface Template {
  id: string;
  title: string;
  description?: string;
  location: string;
  pool_fee: number;
  capacity: number;
  day_of_week: number;
  start_time: string;
  duration_minutes: number;
  auto_generate: boolean;
  is_active: boolean;
}

export default function AdminSessionsPage() {
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        setError("Not authenticated");
        return;
      }

      const headers = { "Authorization": `Bearer ${token}` };

      // Fetch sessions
      const sessionsRes = await fetch(`${API_BASE_URL}/api/v1/sessions/`, { headers });
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setSessions(sessionsData);
      }

      // Fetch templates
      const templatesRes = await fetch(`${API_BASE_URL}/api/v1/sessions/templates`, { headers });
      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setTemplates(templatesData);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (data: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/v1/sessions/templates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (!res.ok) throw new Error("Failed to create template");

      await fetchData();
      setShowCreateTemplate(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTemplate = async (templateId: string, data: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/v1/sessions/templates/${templateId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (!res.ok) throw new Error("Failed to update template");

      await fetchData();
      setShowCreateTemplate(false);
      setSelectedTemplate(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateSessions = async (templateId: string, weeks: number, skipConflicts: boolean) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(`${API_BASE_URL}/api/v1/sessions/templates/${templateId}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ weeks, skip_conflicts: skipConflicts })
    });

    if (!res.ok) throw new Error("Failed to generate sessions");

    const result = await res.json();
    await fetchData();
    return result;
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Delete this template?")) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      await fetch(`${API_BASE_URL}/api/v1/sessions/templates/${templateId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Delete this session?")) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      await fetch(`${API_BASE_URL}/api/v1/sessions/${sessionId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      await fetchData();
      setSelectedSession(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Convert sessions to calendar events
  const calendarEvents: EventInput[] = sessions.map(session => ({
    id: session.id,
    title: session.title,
    start: session.start_time,
    end: session.end_time,
    extendedProps: {
      session_type: session.session_type || "Club",
      location: session.location,
      pool_fee: session.pool_fee,
      capacity: session.capacity,
      is_recurring_instance: session.is_recurring_instance
    }
  }));

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setSelectedDate(selectInfo.start);
    setShowCreateSession(true);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const session = sessions.find(s => s.id === clickInfo.event.id);
    if (session) {
      setSelectedSession(session);
    }
  };

  if (loading) return <LoadingCard text="Loading sessions..." />;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-600">Admin · Sessions</p>
        <h1 className="text-4xl font-bold text-slate-900">Sessions Management</h1>
        <p className="text-slate-600">Manage swim sessions and recurring templates</p>
      </header>

      {error && <Alert variant="error" title="Error">{error}</Alert>}

      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setView("calendar")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${view === "calendar"
            ? "bg-cyan-600 text-white"
            : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Calendar View</span>
        </button>
        <button
          onClick={() => setView("list")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${view === "list"
            ? "bg-cyan-600 text-white"
            : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
        >
          <List className="h-4 w-4" />
          <span>List View</span>
        </button>
        <div className="ml-auto">
          <Button onClick={() => setShowCreateSession(true)}>
            <Plus className="h-4 w-4" />
            <span>Create Session</span>
          </Button>
        </div>
      </div>

      {view === "calendar" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <SessionCalendar
            events={calendarEvents}
            onDateSelect={handleDateSelect}
            onEventClick={handleEventClick}
          />
          <TemplatesSidebar
            templates={templates}
            onCreateTemplate={() => {
              setSelectedTemplate(null);
              setShowCreateTemplate(true);
            }}
            onGenerateSessions={(templateId) => {
              const template = templates.find(t => t.id === templateId);
              if (template) {
                setSelectedTemplate(template);
                setShowGenerateModal(true);
              }
            }}
            onDeleteTemplate={handleDeleteTemplate}
            onEditTemplate={(template) => {
              setSelectedTemplate(template);
              setShowCreateTemplate(true);
            }}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Title</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Time</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Location</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm">
                      {session.is_recurring_instance && <span className="mr-1">🔁</span>}
                      {session.title}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(session.start_time).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(session.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{session.location}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="danger" onClick={() => handleDeleteSession(session.id)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Generate Sessions Modal */}
      <GenerateSessionsModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        template={selectedTemplate}
        onGenerate={handleGenerateSessions}
      />

      {/* Session Details Modal */}
      {selectedSession && (
        <Modal
          isOpen={!!selectedSession}
          onClose={() => setSelectedSession(null)}
          title="Session Details"
        >
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Title</p>
              <p className="text-slate-900">{selectedSession.title}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Location</p>
              <p className="text-slate-900">{selectedSession.location}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-slate-700">Start Time</p>
                <p className="text-slate-900">
                  {new Date(selectedSession.start_time).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">End Time</p>
                <p className="text-slate-900">
                  {new Date(selectedSession.end_time).toLocaleString()}
                </p>
              </div>
            </div>
            {selectedSession.is_recurring_instance && (
              <Alert variant="info" title="Recurring Session">
                This session was generated from a template
              </Alert>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setSelectedSession(null)}>
                Close
              </Button>
              <Button variant="danger" onClick={() => handleDeleteSession(selectedSession.id)}>
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Session Modal */}
      {showCreateSession && (
        <SimpleSessionForm
          onClose={() => setShowCreateSession(false)}
          onCreate={async (data: any) => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              const token = session?.access_token;

              const res = await fetch("/api/v1/sessions/", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(data)
              });

              if (!res.ok) throw new Error("Failed to create session");

              await fetchData();
              setShowCreateSession(false);
            } catch (err) {
              console.error(err);
              alert("Failed to create session");
            }
          }}
          initialDate={selectedDate}
        />
      )}

      {/* Create/Edit Template Modal */}
      {showCreateTemplate && (
        <SimpleTemplateForm
          onClose={() => {
            setShowCreateTemplate(false);
            setSelectedTemplate(null);
          }}
          onCreate={handleCreateTemplate}
          onUpdate={handleUpdateTemplate}
          initialData={selectedTemplate}
        />
      )}
    </div>
  );
}

// Simplified session form component
function SimpleSessionForm({
  onClose,
  onCreate,
  initialDate
}: {
  onClose: () => void;
  onCreate: (data: any) => void;
  initialDate?: Date | null;
}) {
  const now = new Date();
  const defaultStartDate = initialDate || now;
  const defaultEndDate = new Date(defaultStartDate.getTime() + 3 * 60 * 60 * 1000); // 3 hours later

  const formatDateTimeLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [formData, setFormData] = useState({
    title: "",
    type: "CLUB_SESSION",
    location: "main_pool",
    start_time: formatDateTimeLocal(defaultStartDate),
    end_time: formatDateTimeLocal(defaultEndDate),
    pool_fee: 2000,
    capacity: 20,
    description: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Convert datetime-local format to ISO format for the backend
    const sessionData = {
      ...formData,
      start_time: new Date(formData.start_time).toISOString(),
      end_time: new Date(formData.end_time).toISOString()
    };

    onCreate(sessionData);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Create Session">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
        <Select
          label="Session type"
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
        >
          <option value="CLUB_SESSION">Club session</option>
          <option value="ACADEMY_CLASS">Academy class</option>
          <option value="MEETUP">Community meetup</option>
          <option value="SPECIAL_EVENT">Special event</option>
        </Select>
        <Select
          label="Location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
        >
          <option value="main_pool">Main Pool</option>
          <option value="training_pool">Training Pool</option>
          <option value="outdoor_pool">Outdoor Pool</option>
        </Select>
        <Input
          label="Start Time"
          type="datetime-local"
          value={formData.start_time}
          onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
          required
        />
        <Input
          label="End Time"
          type="datetime-local"
          value={formData.end_time}
          onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
          required
        />
        <Input
          label="Pool Fee (cents)"
          type="number"
          value={formData.pool_fee}
          onChange={(e) => setFormData({ ...formData, pool_fee: parseInt(e.target.value) })}
          required
        />
        <Input
          label="Capacity"
          type="number"
          value={formData.capacity}
          onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
          required
        />
        <Textarea
          label="Description (optional)"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Create Session</Button>
        </div>
      </form>
    </Modal>
  );
}

// Simplified template form component
function SimpleTemplateForm({
  onClose,
  onCreate,
  onUpdate,
  initialData
}: {
  onClose: () => void;
  onCreate: (data: any) => void;
  onUpdate?: (id: string, data: any) => void;
  initialData?: Template | null;
}) {
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    type: "CLUB_SESSION",
    location: initialData?.location || "main_pool",
    day_of_week: initialData?.day_of_week ?? 5, // Saturday
    start_time: initialData?.start_time || "09:00",
    duration_minutes: initialData?.duration_minutes || 180,
    pool_fee: initialData?.pool_fee || 2000,
    capacity: initialData?.capacity || 20,
    auto_generate: initialData?.auto_generate || false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (initialData && onUpdate) {
      onUpdate(initialData.id, formData);
    } else {
      onCreate(formData);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={initialData ? "Edit Template" : "Create Template"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
        <Select
          label="Day of Week"
          value={formData.day_of_week.toString()}
          onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}
        >
          <option value="0">Monday</option>
          <option value="1">Tuesday</option>
          <option value="2">Wednesday</option>
          <option value="3">Thursday</option>
          <option value="4">Friday</option>
          <option value="5">Saturday</option>
          <option value="6">Sunday</option>
        </Select>
        <Input
          label="Start Time"
          type="time"
          value={formData.start_time}
          onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
          required
        />
        <Input
          label="Duration (minutes)"
          type="number"
          value={formData.duration_minutes}
          onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
          required
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">{initialData ? "Update Template" : "Create Template"}</Button>
        </div>
      </form>
    </Modal>
  );
}
