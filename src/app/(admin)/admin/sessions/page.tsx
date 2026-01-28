"use client";

import { EditSessionForm } from "@/components/admin/EditSessionForm";
import { GenerateSessionsModal } from "@/components/admin/GenerateSessionsModal";
import { SessionCalendar } from "@/components/admin/SessionCalendar";
import { SessionDetailsModal } from "@/components/admin/SessionDetailsModal";
import { TemplatesSidebar } from "@/components/admin/TemplatesSidebar";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { supabase } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import type { DateSelectArg, EventClickArg, EventInput } from "@fullcalendar/core";
import { Calendar, List, Plus } from "lucide-react";
import { useEffect, useState } from "react";

interface Session {
  id: string;
  title: string;
  session_type?: "club" | "academy" | "community" | "cohort_class" | "one_on_one" | "group_booking" | "event";
  location: string;
  starts_at: string;  // API returns starts_at, not start_time
  ends_at: string;    // API returns ends_at, not end_time
  pool_fee: number;
  capacity: number;
  description?: string;
  template_id?: string;
  is_recurring_instance?: boolean;
  ride_share_areas?: RideShareArea[];
}

interface RideShareArea {
  id?: string;
  title: string;
  cost: number;
  capacity: number;
  pickup_locations: string[] | string; // string for input handling
  departure_time?: string;
  arrival_time?: string;
  duration_minutes?: number;
}

interface Template {
  id: string;
  title: string;
  description?: string;
  location: string;
  type?: "club" | "academy" | "community";  // Frontend uses 'type'
  session_type?: "club" | "academy" | "community";  // API returns 'session_type'
  pool_fee: number;
  capacity: number;
  day_of_week: number;
  start_time: string;
  duration_minutes: number;
  auto_generate: boolean;
  is_active: boolean;
  ride_share_config?: Array<{
    ride_area_id: string;
    cost: number;
    capacity: number;
  }>;
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
  const [showEditSession, setShowEditSession] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessionToEdit, setSessionToEdit] = useState<Session | null>(null);
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

  const handleCreateSession = async (data: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      };

      // Extract session and ride configs
      const { session: sessionData, ride_configs } = data;

      // 1. Create Session (WITHOUT ride configs)
      const sessionRes = await fetch(`${API_BASE_URL}/api/v1/sessions/`, {
        method: "POST",
        headers,
        body: JSON.stringify(sessionData)
      });

      if (!sessionRes.ok) {
        const errorText = await sessionRes.text();
        console.error("Session creation error:", errorText);
        throw new Error(`Failed to create session: ${sessionRes.statusText}`);
      }
      const newSession = await sessionRes.json();

      // 2. Attach Ride Configs (Transport) if provided
      if (ride_configs && ride_configs.length > 0) {
        // Filter out any configs without a real ride_area_id
        const validConfigs = ride_configs.filter((c: any) => c.ride_area_id);

        if (validConfigs.length > 0) {
          const transportRes = await fetch(`${API_BASE_URL}/api/v1/transport/sessions/${newSession.id}/ride-configs`, {
            method: "POST",
            headers,
            body: JSON.stringify(validConfigs)
          });
          if (!transportRes.ok) {
            const errorText = await transportRes.text();
            console.error("Ride config attachment error:", errorText);
          }
        }
      }

      setShowCreateSession(false);
      fetchData(); // Refresh list
    } catch (err) {
      console.error("Failed to create session", err);
      setError(err instanceof Error ? err.message : "Failed to create session");
    }
  };

  const handleUpdateSession = async (sessionId: string, data: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      };

      // Extract session and ride configs
      const { session: sessionData, ride_configs } = data;

      // 1. Update Session
      const sessionRes = await fetch(`${API_BASE_URL}/api/v1/sessions/${sessionId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(sessionData)
      });

      if (!sessionRes.ok) {
        const errorText = await sessionRes.text();
        console.error("Session update error:", errorText);
        throw new Error(`Failed to update session: ${sessionRes.statusText}`);
      }

      // 2. Update Ride Configs
      // First, delete existing configs, then recreate them
      if (ride_configs && ride_configs.length > 0) {
        const validConfigs = ride_configs.filter((c: any) => c.ride_area_id);

        if (validConfigs.length > 0) {
          const transportRes = await fetch(`${API_BASE_URL}/api/v1/transport/sessions/${sessionId}/ride-configs`, {
            method: "POST",
            headers,
            body: JSON.stringify(validConfigs)
          });
          if (!transportRes.ok) {
            const errorText = await transportRes.text();
            console.error("Ride config update error:", errorText);
          }
        }
      }

      setShowEditSession(false);
      setSessionToEdit(null);
      setSelectedSession(null);
      fetchData(); // Refresh list
    } catch (err) {
      console.error("Failed to update session", err);
      setError(err instanceof Error ? err.message : "Failed to update session");
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
    start: session.starts_at,
    end: session.ends_at,
    extendedProps: {
      session_type: session.session_type || "club",
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

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <LoadingSpinner size="lg" text="Loading sessions..." />
      </div>
    );
  }

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
          className={`flex items-center gap-2 rounded-lg px-3 sm:px-4 py-2.5 text-sm font-medium transition min-h-[44px] ${view === "calendar"
            ? "bg-cyan-600 text-white"
            : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
        >
          <Calendar className="h-5 w-5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Calendar View</span>
        </button>
        <button
          onClick={() => setView("list")}
          className={`flex items-center gap-2 rounded-lg px-3 sm:px-4 py-2.5 text-sm font-medium transition min-h-[44px] ${view === "list"
            ? "bg-cyan-600 text-white"
            : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
        >
          <List className="h-5 w-5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">List View</span>
        </button>
        <div className="ml-auto">
          <Button onClick={() => setShowCreateSession(true)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create Session</span>
            <span className="sm:hidden">Add</span>
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
        <>
          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-slate-900 truncate">
                      {session.is_recurring_instance && <span className="mr-1">🔁</span>}
                      {session.title}
                    </h3>
                    <div className="mt-1 space-y-1 text-sm text-slate-600">
                      <p>{new Date(session.starts_at).toLocaleDateString()} at {new Date(session.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                      <p className="truncate">{session.location}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedSession(session)}>
                      View
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleDeleteSession(session.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block rounded-lg border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Title</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Time</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 hidden md:table-cell">Location</th>
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
                        {new Date(session.starts_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {new Date(session.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 hidden md:table-cell">{session.location}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setSelectedSession(session)}>
                            View
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => handleDeleteSession(session.id)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
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
        <SessionDetailsModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          onDelete={handleDeleteSession}
          onEdit={(session: Session) => {
            setSessionToEdit(session);
            setSelectedSession(null);
            setShowEditSession(true);
          }}
        />
      )}

      {/* Create Session Modal */}
      {showCreateSession && (
        <SimpleSessionForm
          onClose={() => setShowCreateSession(false)}
          onCreate={handleCreateSession}
          initialDate={selectedDate}
        />
      )}

      {/* Edit Session Modal */}
      {showEditSession && sessionToEdit && (
        <EditSessionForm
          session={sessionToEdit}
          onClose={() => {
            setShowEditSession(false);
            setSessionToEdit(null);
          }}
          onUpdate={handleUpdateSession}
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
    type: "club",
    location: "sunfit_pool",
    start_time: formatDateTimeLocal(defaultStartDate),
    end_time: formatDateTimeLocal(defaultEndDate),
    pool_fee: 2000,
    capacity: 20,
    description: "",
  });

  const [availableAreas, setAvailableAreas] = useState<any[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<Array<{
    ride_area_id: string;
    cost: number;
    capacity: number;
    departure_time: string;
  }>>([]);

  useEffect(() => {
    fetchAvailableAreas();
  }, []);

  const fetchAvailableAreas = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/v1/transport/areas`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const areas = await res.json();
        setAvailableAreas(areas);
      }
    } catch (err) {
      console.error("Failed to fetch ride areas", err);
    }
  };

  const addAreaConfig = () => {
    setSelectedAreas([...selectedAreas, {
      ride_area_id: "",
      cost: 1000,
      capacity: 4,
      departure_time: formatDateTimeLocal(new Date(new Date(formData.start_time).getTime() - 2 * 60 * 60 * 1000))
    }]);
  };

  const removeAreaConfig = (index: number) => {
    const newConfigs = [...selectedAreas];
    newConfigs.splice(index, 1);
    setSelectedAreas(newConfigs);
  };

  const updateAreaConfig = (index: number, field: string, value: any) => {
    const newConfigs = [...selectedAreas];
    newConfigs[index] = { ...selectedAreas[index], [field]: value };
    setSelectedAreas(newConfigs);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Separate session data from ride configs
    // Note: API expects starts_at/ends_at and session_type (not type)
    const { start_time, end_time, type, location, ...restFormData } = formData;
    const sessionData = {
      ...restFormData,
      session_type: type, // Keep as lowercase (club, academy, community)
      location: location, // Keep as lowercase snake_case (sunfit_pool, rowe_park_pool)
      starts_at: new Date(start_time).toISOString(),
      ends_at: new Date(end_time).toISOString(),
    };

    // Process ride configs
    const rideConfigs = selectedAreas
      .filter(config => config.ride_area_id) // Only include configs with selected area
      .map(config => ({
        ride_area_id: config.ride_area_id,
        cost: parseFloat(config.cost as any) || 0,
        capacity: parseInt(config.capacity as any) || 4,
        departure_time: config.departure_time ? new Date(config.departure_time).toISOString() : null
      }));

    // Pass both separately to onCreate
    onCreate({
      session: sessionData,
      ride_configs: rideConfigs
    });
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Session type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
          >
            <option value="club">Club</option>
            <option value="academy">Academy</option>
            <option value="community">Community</option>
          </Select>
          <Select
            label="Location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          >
            <option value="sunfit_pool">Sunfit Pool</option>
            <option value="rowe_park_pool">Rowe Park Pool</option>
            <option value="federal_palace_pool">Federal Palace Pool</option>
            <option value="open_water">Open Water</option>
          </Select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </div>
        <Textarea
          label="Description (optional)"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />

        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium">Ride Share Options</label>
            <button
              type="button"
              onClick={addAreaConfig}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              + Add Ride Area
            </button>
          </div>

          {selectedAreas.map((config, index) => (
            <div key={index} className="mb-4 p-4 border rounded bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Ride Area {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeAreaConfig(index)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Select Area"
                  value={config.ride_area_id}
                  onChange={(e) => updateAreaConfig(index, "ride_area_id", e.target.value)}
                  required
                >
                  <option value="">-- Select Ride Area --</option>
                  {availableAreas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name} ({area.pickup_locations.length} locations)
                    </option>
                  ))}
                </Select>
                <Input
                  label="Cost (₦)"
                  type="number"
                  value={config.cost}
                  onChange={(e) => updateAreaConfig(index, "cost", parseFloat(e.target.value))}
                  required
                />
                <Input
                  label="Capacity (seats)"
                  type="number"
                  value={config.capacity}
                  onChange={(e) => updateAreaConfig(index, "capacity", parseInt(e.target.value))}
                  required
                />
                <Input
                  label="Departure Time"
                  type="datetime-local"
                  value={config.departure_time}
                  onChange={(e) => updateAreaConfig(index, "departure_time", e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
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
    type: initialData?.type || initialData?.session_type || "club",  // Handle both field names
    location: initialData?.location || "sunfit_pool",
    day_of_week: initialData?.day_of_week ?? 5, // Saturday
    start_time: initialData?.start_time || "09:00",
    duration_minutes: initialData?.duration_minutes || 180,
    pool_fee: initialData?.pool_fee || 2000,
    capacity: initialData?.capacity || 20,
    auto_generate: initialData?.auto_generate || false
  });

  const [availableAreas, setAvailableAreas] = useState<any[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<Array<{
    ride_area_id: string;
    cost: number;
    capacity: number;
  }>>([]);

  useEffect(() => {
    fetchAvailableAreas();
  }, []);

  // Load ride share config from existing template when editing
  useEffect(() => {
    if (initialData?.ride_share_config && Array.isArray(initialData.ride_share_config)) {
      setSelectedAreas(initialData.ride_share_config.map((cfg: any) => ({
        ride_area_id: cfg.ride_area_id || "",
        cost: cfg.cost || 0,
        capacity: cfg.capacity || 4,
      })));
    }
  }, [initialData]);

  const fetchAvailableAreas = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/v1/transport/areas`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const areas = await res.json();
        setAvailableAreas(areas);
      }
    } catch (err) {
      console.error("Failed to fetch ride areas", err);
    }
  };

  const addAreaConfig = () => {
    setSelectedAreas([...selectedAreas, {
      ride_area_id: "",
      cost: 1000,
      capacity: 4,
    }]);
  };

  const removeAreaConfig = (index: number) => {
    const newConfigs = [...selectedAreas];
    newConfigs.splice(index, 1);
    setSelectedAreas(newConfigs);
  };

  const updateAreaConfig = (index: number, field: string, value: any) => {
    const newConfigs = [...selectedAreas];
    newConfigs[index] = { ...selectedAreas[index], [field]: value };
    setSelectedAreas(newConfigs);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Map 'type' to 'session_type' for the API
    const { type, ...restFormData } = formData;

    const dataToSubmit = {
      ...restFormData,
      session_type: type,  // API expects session_type, not type
      ride_share_config: selectedAreas
        .filter(config => config.ride_area_id)
        .map(config => ({
          ride_area_id: config.ride_area_id,
          cost: parseFloat(config.cost as any) || 0,
          capacity: parseInt(config.capacity as any) || 4
        }))
    };

    if (initialData && onUpdate) {
      onUpdate(initialData.id, dataToSubmit);
    } else {
      onCreate(dataToSubmit);
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
          label="Session type"
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
        >
          <option value="club">Club</option>
          <option value="academy">Academy</option>
          <option value="community">Community</option>
        </Select>
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
        <Select
          label="Location (Pool)"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
        >
          <option value="sunfit_pool">Sunfit Pool</option>
          <option value="rowe_park_pool">Rowe Park Pool</option>
          <option value="federal_palace_pool">Federal Palace Pool</option>
          <option value="open_water">Open Water</option>
          <option value="other">Other</option>
        </Select>
        <Input
          label="Duration (minutes)"
          type="number"
          value={formData.duration_minutes}
          onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
          required
        />

        {/* Ride Share Config */}
        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium">Ride Share Options (Optional)</label>
            <button
              type="button"
              onClick={addAreaConfig}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              + Add Ride Area
            </button>
          </div>

          {selectedAreas.map((config, index) => (
            <div key={index} className="mb-3 p-3 border rounded bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-sm">Ride Area {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeAreaConfig(index)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Select
                  label="Select Area"
                  value={config.ride_area_id}
                  onChange={(e) => updateAreaConfig(index, "ride_area_id", e.target.value)}
                >
                  <option value="">-- Select Ride Area --</option>
                  {availableAreas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Cost (₦)"
                  type="number"
                  value={config.cost}
                  onChange={(e) => updateAreaConfig(index, "cost", parseFloat(e.target.value))}
                />
                <Input
                  label="Capacity (seats)"
                  type="number"
                  value={config.capacity}
                  onChange={(e) => updateAreaConfig(index, "capacity", parseInt(e.target.value))}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">{initialData ? "Update Template" : "Create Template"}</Button>
        </div>
      </form>
    </Modal>
  );
}
