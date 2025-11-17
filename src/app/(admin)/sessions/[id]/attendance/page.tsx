"use client";

import { useState } from "react";
import { Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell } from "@/components/ui/Table";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const mockAttendance = [
  {
    id: "1",
    name: "Ada Obi",
    level: "Intermediate",
    rideShareRole: "Driver (2 seats)",
    paymentStatus: "Pending",
    attendanceStatus: "Registered"
  },
  {
    id: "2",
    name: "Bola Adeyemi",
    level: "Beginner",
    rideShareRole: "Passenger",
    paymentStatus: "Confirmed",
    attendanceStatus: "Registered"
  }
];

export default function AdminSessionAttendancePage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function updateStatus(memberId: string, action: "payment" | "no_show") {
    setUpdatingId(memberId);
    setError(null);
    setSuccess(null);

    try {
      // TODO: replace with real API calls
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSuccess(action === "payment" ? "Payment confirmed (mock)" : "Marked no-show (mock)");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update attendee.";
      setError(message);
    } finally {
      setUpdatingId(null);
    }
  }

  function handleExport() {
    alert("Exporting pool list (mock)");
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">Admin · Attendance</p>
        <h1 className="text-4xl font-bold text-slate-900">Session attendance</h1>
        <p className="text-sm text-slate-600">This page uses mock data until `/api/v1/admin/sessions/{id}/attendance` is ready.</p>
      </header>

      <Card className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={handleExport}>
          Download pool list
        </Button>
      </Card>

      {success ? (
        <Alert variant="info" title={success} />
      ) : null}
      {error ? (
        <Alert variant="error" title="Update failed">
          {error}
        </Alert>
      ) : null}

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Level</TableHeaderCell>
            <TableHeaderCell>Ride-share</TableHeaderCell>
            <TableHeaderCell>Payment</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {mockAttendance.map((attendee) => (
            <TableRow key={attendee.id}>
              <TableCell>{attendee.name}</TableCell>
              <TableCell>{attendee.level}</TableCell>
              <TableCell>{attendee.rideShareRole}</TableCell>
              <TableCell>
                <Badge variant={attendee.paymentStatus === "Confirmed" ? "success" : "warning"}>
                  {attendee.paymentStatus}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={attendee.attendanceStatus === "Registered" ? "info" : "warning"}>
                  {attendee.attendanceStatus}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={updatingId === attendee.id}
                    onClick={() => updateStatus(attendee.id, "payment")}
                  >
                    {updatingId === attendee.id ? "Updating..." : "Confirm payment"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={updatingId === attendee.id}
                    onClick={() => updateStatus(attendee.id, "no_show")}
                  >
                    {updatingId === attendee.id ? "Updating..." : "Mark no-show"}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
