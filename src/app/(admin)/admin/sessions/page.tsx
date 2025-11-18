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

const mockSessions = [
  {
    id: "yaba-0713",
    title: "Club Session – Yaba",
    type: "Club",
    location: "Yaba Aquatic Centre",
    date: "2024-07-13",
    startTime: "07:00",
    endTime: "09:30",
    poolFee: 12000,
    rideShareFee: 3000,
    signUps: 42
  },
  {
    id: "ikoyi-meetup",
    title: "Meetup – Ikoyi Night Swim",
    type: "Meetup",
    location: "Ikoyi Club",
    date: "2024-07-10",
    startTime: "19:00",
    endTime: "21:00",
    poolFee: 8000,
    signUps: 24
  }
];

const initialFormState = {
  title: "",
  type: "Club",
  location: "",
  description: "",
  date: "",
  startTime: "",
  endTime: "",
  poolFee: "",
  rideShareFee: ""
};

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState(mockSessions);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState(initialFormState);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(id);
  }, []);

  function updateField(field: keyof typeof initialFormState, value: string) {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    if (!formState.title || !formState.location || !formState.date) {
      setError("Title, location, and date are required.");
      setSaving(false);
      return;
    }

    try {
      // TODO: replace with apiPost("/api/v1/admin/sessions", body)
      await new Promise((resolve) => setTimeout(resolve, 600));
      setSessions((prev) => [
        ...prev,
        {
          id: `${formState.title.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
          title: formState.title,
          type: formState.type,
          location: formState.location,
          date: formState.date,
          startTime: formState.startTime,
          endTime: formState.endTime,
          poolFee: Number(formState.poolFee || 0),
          rideShareFee: formState.rideShareFee ? Number(formState.rideShareFee) : undefined,
          signUps: 0
        }
      ]);
      setMessage("Session created (mock)");
      setFormState(initialFormState);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unable to create session.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">Admin · Sessions</p>
        <h1 className="text-4xl font-bold text-slate-900">Manage sessions</h1>
        <p className="text-sm text-slate-600">List uses mock data; creation form simulates API calls.</p>
      </header>

      {loading ? (
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
          <Select label="Type" value={formState.type} onChange={(event) => updateField("type", event.target.value)}>
            <option value="Club">Club</option>
            <option value="Meetup">Meetup</option>
            <option value="Academy">Academy</option>
          </Select>
          <Input label="Location" value={formState.location} onChange={(event) => updateField("location", event.target.value)} required />
          <Textarea
            label="Description"
            className="md:col-span-2"
            rows={3}
            value={formState.description}
            onChange={(event) => updateField("description", event.target.value)}
          />
          <Input label="Date" type="date" value={formState.date} onChange={(event) => updateField("date", event.target.value)} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start time" type="time" value={formState.startTime} onChange={(event) => updateField("startTime", event.target.value)} />
            <Input label="End time" type="time" value={formState.endTime} onChange={(event) => updateField("endTime", event.target.value)} />
          </div>
          <Input label="Pool fee" type="number" min="0" value={formState.poolFee} onChange={(event) => updateField("poolFee", event.target.value)} />
          <Input label="Ride-share fee" type="number" min="0" value={formState.rideShareFee} onChange={(event) => updateField("rideShareFee", event.target.value)} />
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
            <TableHeaderCell>Pool fee</TableHeaderCell>
            <TableHeaderCell>Sign-ups</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sessions.map((session) => (
            <TableRow key={session.id}>
              <TableCell>{session.title}</TableCell>
              <TableCell>{session.type}</TableCell>
              <TableCell>{session.location}</TableCell>
              <TableCell>{session.date}</TableCell>
              <TableCell>
                {session.startTime} – {session.endTime}
              </TableCell>
              <TableCell>₦{session.poolFee.toLocaleString()}</TableCell>
              <TableCell>{session.signUps}</TableCell>
            </TableRow>
          ))}
        </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
