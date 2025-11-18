"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { LoadingCard } from "@/components/ui/LoadingCard";

const mockAnnouncements = [
  { id: "1", title: "Yaba rain update", date: "2024-06-14", category: "weather", content: "Session shifted to 9 am." },
  { id: "2", title: "Academy trials open", date: "2024-06-10", category: "academy", content: "Sign-ups open for July cohort." }
];

const initialFormState = { id: "", title: "", category: "general", content: "" };

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState(mockAnnouncements);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState(initialFormState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(id);
  }, []);

  function startEdit(id: string) {
    const announcement = announcements.find((item) => item.id === id);
    if (!announcement) return;
    setFormState({ id: announcement.id, title: announcement.title, category: announcement.category, content: announcement.content });
    setEditingId(id);
  }

  function resetForm() {
    setFormState(initialFormState);
    setEditingId(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (editingId) {
        setAnnouncements((prev) =>
          prev.map((item) => (item.id === editingId ? { ...item, title: formState.title, category: formState.category, content: formState.content } : item))
        );
        setMessage("Announcement updated (mock)");
      } else {
        setAnnouncements((prev) => [
          ...prev,
          { id: `${Date.now()}`, title: formState.title, category: formState.category, content: formState.content, date: new Date().toISOString().slice(0, 10) }
        ]);
        setMessage("Announcement created (mock)");
      }
      resetForm();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unable to save announcement.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">Admin · Announcements</p>
        <h1 className="text-4xl font-bold text-slate-900">Manage announcements</h1>
        <p className="text-sm text-slate-600">This interface uses mock data until the admin announcements API is ready.</p>
      </header>

      {loading ? (
        <LoadingCard text="Loading announcements..." />
      ) : (
        <>
          <Card className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">{editingId ? "Edit announcement" : "Create announcement"}</h2>
            {message ? <Alert variant="info" title={message} /> : null}
            {error ? (
              <Alert variant="error" title="Save failed">
                {error}
              </Alert>
            ) : null}
            <form className="space-y-4" onSubmit={handleSubmit}>
              <Input label="Title" value={formState.title} onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))} required />
              <Select label="Category" value={formState.category} onChange={(event) => setFormState((prev) => ({ ...prev, category: event.target.value }))}>
                <option value="general">General</option>
                <option value="weather">Weather</option>
                <option value="academy">Academy</option>
                <option value="event">Event</option>
              </Select>
              <Textarea
                label="Content"
                rows={4}
                value={formState.content}
                onChange={(event) => setFormState((prev) => ({ ...prev, content: event.target.value }))}
                required
              />
              <div className="flex flex-wrap gap-3">
                {editingId ? (
                  <Button type="button" variant="ghost" onClick={resetForm} disabled={saving}>
                    Cancel edit
                  </Button>
                ) : null}
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Save changes" : "Create announcement"}
                </Button>
              </div>
            </form>
          </Card>

          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Title</TableHeaderCell>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Category</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {announcements.map((announcement) => (
                <TableRow key={announcement.id}>
                  <TableCell>{announcement.title}</TableCell>
                  <TableCell>{announcement.date}</TableCell>
                  <TableCell>
                    <Badge variant="info">{announcement.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="secondary" onClick={() => startEdit(announcement.id)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
