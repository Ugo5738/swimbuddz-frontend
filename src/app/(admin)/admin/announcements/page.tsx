"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Select } from "@/components/ui/Select";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import { Textarea } from "@/components/ui/Textarea";
import { Announcement, AnnouncementCategory, AnnouncementCreate, CommunicationsApi, formatAnnouncementCategory } from "@/lib/communications";
import { useEffect, useState } from "react";

const initialFormState: AnnouncementCreate = {
  title: "",
  category: AnnouncementCategory.GENERAL,
  status: "published",
  audience: "community",
  body: "",
  published_at: new Date().toISOString(),
  expires_at: null,
  notify_email: true,
  notify_push: false,
  is_pinned: false,
};

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState<AnnouncementCreate>(initialFormState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  useEffect(() => {
    if (editingId) return;
    const isUrgent =
      formState.category === AnnouncementCategory.RAIN_UPDATE ||
      formState.category === AnnouncementCategory.SCHEDULE_CHANGE;
    setFormState((prev) => ({
      ...prev,
      notify_email: true,
      notify_push: isUrgent,
    }));
  }, [formState.category, editingId]);

  async function loadAnnouncements() {
    try {
      const data = await CommunicationsApi.listAnnouncements(true);
      setAnnouncements(data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(id: string) {
    const announcement = announcements.find((item) => item.id === id);
    if (!announcement) return;
    setFormState({
      title: announcement.title,
      category: announcement.category,
      status: announcement.status,
      audience: announcement.audience,
      body: announcement.body,
      published_at: announcement.published_at,
      expires_at: announcement.expires_at ?? null,
      notify_email: announcement.notify_email,
      notify_push: announcement.notify_push,
      is_pinned: announcement.is_pinned,
    });
    setEditingId(id);
  }

  function resetForm() {
    setFormState({ ...initialFormState, published_at: new Date().toISOString() });
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;

    try {
      await CommunicationsApi.deleteAnnouncement(id);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      setMessage("Announcement deleted");
    } catch (err) {
      console.error("Failed to delete announcement", err);
      const errMsg = err instanceof Error ? err.message : "Unable to delete announcement.";
      setError(errMsg);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      if (editingId) {
        const updated = await CommunicationsApi.updateAnnouncement(editingId, formState);
        setAnnouncements((prev) =>
          prev.map((item) => (item.id === editingId ? updated : item))
        );
        setMessage("Announcement updated");
      } else {
        const created = await CommunicationsApi.createAnnouncement(formState);
        setAnnouncements((prev) => [created, ...prev]);
        setMessage("Announcement created");
      }
      resetForm();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unable to save announcement.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  const formatDateTimeLocal = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 16);
  };

  const parseDateTimeLocal = (value: string) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">Admin · Announcements</p>
        <h1 className="text-4xl font-bold text-slate-900">Manage announcements</h1>
      </header>

      {loading ? (
        <div className="flex h-[calc(100vh-12rem)] items-center justify-center">
          <LoadingSpinner size="lg" text="Loading announcements..." />
        </div>
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
              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  label="Category"
                  value={formState.category}
                  onChange={(event) => setFormState((prev) => ({ ...prev, category: event.target.value as AnnouncementCategory }))}
                >
                  <option value={AnnouncementCategory.GENERAL}>General</option>
                  <option value={AnnouncementCategory.RAIN_UPDATE}>Rain Update</option>
                  <option value={AnnouncementCategory.SCHEDULE_CHANGE}>Schedule Change</option>
                  <option value={AnnouncementCategory.ACADEMY_UPDATE}>Academy Update</option>
                  <option value={AnnouncementCategory.EVENT}>Event</option>
                  <option value={AnnouncementCategory.COMPETITION}>Competition</option>
                </Select>
                <Select
                  label="Status"
                  value={formState.status}
                  onChange={(event) => setFormState((prev) => ({ ...prev, status: event.target.value as AnnouncementCreate["status"] }))}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </Select>
                <Select
                  label="Audience"
                  value={formState.audience}
                  onChange={(event) => setFormState((prev) => ({ ...prev, audience: event.target.value as AnnouncementCreate["audience"] }))}
                >
                  <option value="community">Community (All Members)</option>
                  <option value="club">Club</option>
                  <option value="academy">Academy</option>
                </Select>
                <Input
                  label="Expires At"
                  type="datetime-local"
                  value={formatDateTimeLocal(formState.expires_at)}
                  onChange={(event) => setFormState((prev) => ({ ...prev, expires_at: parseDateTimeLocal(event.target.value) }))}
                />
              </div>
              <div className="flex flex-wrap gap-4">
                <Checkbox
                  label="Pin announcement"
                  checked={formState.is_pinned || false}
                  onChange={(event) => setFormState((prev) => ({ ...prev, is_pinned: event.target.checked }))}
                />
                <Checkbox
                  label="Notify by email"
                  checked={formState.notify_email ?? false}
                  onChange={(event) => setFormState((prev) => ({ ...prev, notify_email: event.target.checked }))}
                />
                <Checkbox
                  label="Notify by push"
                  checked={formState.notify_push ?? false}
                  onChange={(event) => setFormState((prev) => ({ ...prev, notify_push: event.target.checked }))}
                />
              </div>
              <Textarea
                label="Content"
                rows={4}
                value={formState.body}
                onChange={(event) => setFormState((prev) => ({ ...prev, body: event.target.value }))}
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
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Audience</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {announcements.map((announcement) => (
                <TableRow key={announcement.id}>
                  <TableCell>{announcement.title}</TableCell>
                  <TableCell>
                    {announcement.published_at ? new Date(announcement.published_at).toLocaleDateString() : "--"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="info">{formatAnnouncementCategory(announcement.category)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="info" className="capitalize">{announcement.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="info" className="capitalize">{announcement.audience}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => startEdit(announcement.id)}>
                        Edit
                      </Button>
                      <Button variant="danger" onClick={() => handleDelete(announcement.id)}>
                        Delete
                      </Button>
                    </div>
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
