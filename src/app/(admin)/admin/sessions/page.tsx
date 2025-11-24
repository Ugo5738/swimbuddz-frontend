"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { Modal } from "@/components/ui/Modal";
import { supabase } from "@/lib/auth";

interface Session {
  id: string;
  title: string;
  session_type: string;
  location_name: string;
  start_time: string;
  end_time: string;
  max_participants: number;
  price: number;
  drop_in_fee: number;
  is_active: boolean;
  description?: string;
  location?: string; // Backend field
  pool_fee?: number; // Backend field
  capacity?: number; // Backend field
}

const initialFormState = {
  title: "",
  session_type: "Club",
  location_name: "main_pool",
  description: "",
  date: "",
  startTime: "",
  endTime: "",
  price: "",
  drop_in_fee: "",
  max_participants: "20"
};

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState(initialFormState);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [editFormState, setEditFormState] = useState(initialFormState);

  const fetchSessions = async () => {
    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/v1/sessions/", { headers });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      const data = await res.json();

      // Map backend fields to frontend fields
      const mappedData = data.map((s: any) => ({
        ...s,
        price: s.pool_fee || 0,
        max_participants: s.capacity || 20,
        location_name: s.location || "main_pool",
        // Try to extract session_type from description if stored there
        session_type: s.description?.match(/^\[(.*?)\]/)?.[1] || "Club",
        description: s.description?.replace(/^\[.*?\]\s*/, "") || ""
      }));

      setSessions(mappedData);
    } catch (err) {
      console.error(err);
      setError("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  function updateField(field: keyof typeof initialFormState, value: string) {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }

  function updateEditField(field: keyof typeof initialFormState, value: string) {
    setEditFormState((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    if (!formState.title || !formState.location_name || !formState.date || !formState.startTime || !formState.endTime) {
      setError("Title, location, date, and times are required.");
      setSaving(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("Not authenticated");
      }

      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      };

      // Construct ISO timestamps
      const start_time = new Date(`${formState.date}T${formState.startTime}`).toISOString();
      const end_time = new Date(`${formState.date}T${formState.endTime}`).toISOString();

      // Store session_type in description for now
      const fullDescription = `[${formState.session_type}] ${formState.description}`;

      const payload = {
        title: formState.title,
        description: fullDescription,
        location: formState.location_name,
        pool_fee: Number(formState.price || 0),
        capacity: Number(formState.max_participants),
        start_time,
        end_time,
      };

      const res = await fetch("/api/v1/sessions/", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to create session");
      }

      await fetchSessions();
      setMessage("Session created successfully");
      setFormState(initialFormState);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unable to create session.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  function openEditModal(session: Session) {
    setEditSession(session);
    const date = new Date(session.start_time);
    const endDate = new Date(session.end_time);

    setEditFormState({
      title: session.title,
      session_type: session.session_type,
      location_name: session.location_name,
      description: session.description || "",
      date: date.toISOString().split('T')[0],
      startTime: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      endTime: endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      price: String(session.price),
      drop_in_fee: String(session.drop_in_fee),
      max_participants: String(session.max_participants)
    });
    setIsEditModalOpen(true);
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editSession) return;

    setSaving(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) throw new Error("Not authenticated");

      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      };

      const start_time = new Date(`${editFormState.date}T${editFormState.startTime}`).toISOString();
      const end_time = new Date(`${editFormState.date}T${editFormState.endTime}`).toISOString();
      const fullDescription = `[${editFormState.session_type}] ${editFormState.description}`;

      const payload = {
        title: editFormState.title,
        description: fullDescription,
        location: editFormState.location_name,
        pool_fee: Number(editFormState.price || 0),
        capacity: Number(editFormState.max_participants),
        start_time,
        end_time,
      };

      const res = await fetch(`/api/v1/sessions/${editSession.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to update session");
      }

      await fetchSessions();
      setIsEditModalOpen(false);
      setMessage("Session updated successfully");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unable to update session.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(sessionId: string) {
    if (!confirm("Are you sure you want to delete this session?")) return;

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const headers = { "Authorization": `Bearer ${token}` };

      const res = await fetch(`/api/v1/sessions/${sessionId}`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) throw new Error("Failed to delete session");

      await fetchSessions();
      setMessage("Session deleted successfully");
    } catch (error) {
      console.error(error);
      setError("Failed to delete session");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">Admin · Sessions</p>
        <h1 className="text-4xl font-bold text-slate-900">Manage sessions</h1>
        <p className="text-sm text-slate-600">Create and manage swim sessions.</p>
      </header>

      {loading && sessions.length === 0 ? (
        <LoadingCard text="Loading sessions..." />
      ) : (
        <>
          <Card className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Create session</h2>
            {message ? (
              <Alert variant="info" title={message} />
            ) : null}
            {error ? (
              <Alert variant="error" title={error} />
            ) : null}
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreate}>
              <Input label="Title" value={formState.title} onChange={(event) => updateField("title", event.target.value)} required />
              <Select label="Type" value={formState.session_type} onChange={(event) => updateField("session_type", event.target.value)}>
                <option value="Club">Club</option>
                <option value="Meetup">Meetup</option>
                <option value="Academy">Academy</option>
              </Select>
              <Select label="Location" value={formState.location_name} onChange={(event) => updateField("location_name", event.target.value)}>
                <option value="main_pool">Main Pool</option>
                <option value="diving_pool">Diving Pool</option>
                <option value="kids_pool">Kids Pool</option>
                <option value="open_water">Open Water</option>
              </Select>
              <Textarea
                label="Description"
                className="md:col-span-2"
                rows={3}
                value={formState.description}
                onChange={(event) => updateField("description", event.target.value)}
              />
              <Input label="Date" type="date" value={formState.date} onChange={(event) => updateField("date", event.target.value)} required />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Start time" type="time" value={formState.startTime} onChange={(event) => updateField("startTime", event.target.value)} required />
                <Input label="End time" type="time" value={formState.endTime} onChange={(event) => updateField("endTime", event.target.value)} required />
              </div>
              <Input label="Price (Pool Fee)" type="number" min="0" value={formState.price} onChange={(event) => updateField("price", event.target.value)} />
              <Input label="Max Participants" type="number" min="1" value={formState.max_participants} onChange={(event) => updateField("max_participants", event.target.value)} />

              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Create session"}
                </Button>
              </div>
            </form>
          </Card>

          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Title</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Location</TableHeaderCell>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Time</TableHeaderCell>
                <TableHeaderCell>Price</TableHeaderCell>
                <TableHeaderCell>Max</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>{session.title}</TableCell>
                  <TableCell>{session.session_type}</TableCell>
                  <TableCell>{session.location_name}</TableCell>
                  <TableCell>{new Date(session.start_time).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –
                    {new Date(session.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                  <TableCell>₦{(session.price || 0).toLocaleString()}</TableCell>
                  <TableCell>{session.max_participants}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEditModal(session)}>Edit</Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(session.id)}>Delete</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Session">
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleUpdate}>
              <Input label="Title" value={editFormState.title} onChange={(event) => updateEditField("title", event.target.value)} required />
              <Select label="Type" value={editFormState.session_type} onChange={(event) => updateEditField("session_type", event.target.value)}>
                <option value="Club">Club</option>
                <option value="Meetup">Meetup</option>
                <option value="Academy">Academy</option>
              </Select>
              <Select label="Location" value={editFormState.location_name} onChange={(event) => updateEditField("location_name", event.target.value)}>
                <option value="main_pool">Main Pool</option>
                <option value="diving_pool">Diving Pool</option>
                <option value="kids_pool">Kids Pool</option>
                <option value="open_water">Open Water</option>
              </Select>
              <Textarea
                label="Description"
                className="md:col-span-2"
                rows={3}
                value={editFormState.description}
                onChange={(event) => updateEditField("description", event.target.value)}
              />
              <Input label="Date" type="date" value={editFormState.date} onChange={(event) => updateEditField("date", event.target.value)} required />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Start time" type="time" value={editFormState.startTime} onChange={(event) => updateEditField("startTime", event.target.value)} required />
                <Input label="End time" type="time" value={editFormState.endTime} onChange={(event) => updateEditField("endTime", event.target.value)} required />
              </div>
              <Input label="Price (Pool Fee)" type="number" min="0" value={editFormState.price} onChange={(event) => updateEditField("price", event.target.value)} />
              <Input label="Max Participants" type="number" min="1" value={editFormState.max_participants} onChange={(event) => updateEditField("max_participants", event.target.value)} />

              <div className="md:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Updating..." : "Update Session"}
                </Button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </div>
  );
}
