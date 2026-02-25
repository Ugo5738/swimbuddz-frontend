"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { useEffect, useState } from "react";

const mockAttendance = [
  {
    id: "1",
    name: "Ada Obi",
    email: "ada@example.com",
    status: "present",
    role: "swimmer",
    notes: "Looking forward to the session",
  },
  {
    id: "2",
    name: "Bola Adeyemi",
    email: "bola@example.com",
    status: "late",
    role: "swimmer",
    notes: "Will arrive 15 mins late",
  },
];

export default function AdminSessionAttendancePage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(id);
  }, []);

  function handleExport() {
    alert("Exporting pool list (mock)");
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
          Admin · Attendance
        </p>
        <h1 className="text-4xl font-bold text-slate-900">
          Session attendance
        </h1>
        <p className="text-sm text-slate-600">
          This page uses mock data until{" "}
          <code className="bg-slate-100 px-1 py-0.5 rounded">
            /api/v1/admin/sessions/{"{id}"}/attendance
          </code>{" "}
          is ready.
        </p>
      </header>

      {loading ? (
        <LoadingCard text="Loading attendance..." />
      ) : (
        <>
          <Card className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={handleExport}>
              Download pool list
            </Button>
          </Card>

          {success ? <Alert variant="info" title={success} /> : null}
          {error ? (
            <Alert variant="error" title="Update failed">
              {error}
            </Alert>
          ) : null}

          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Email</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Role</TableHeaderCell>
                <TableHeaderCell>Notes</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mockAttendance.map((attendee) => (
                <TableRow key={attendee.id}>
                  <TableCell>{attendee.name}</TableCell>
                  <TableCell>{attendee.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        attendee.status === "present" ? "success" : "warning"
                      }
                    >
                      {attendee.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{attendee.role}</TableCell>
                  <TableCell>{attendee.notes || "--"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
