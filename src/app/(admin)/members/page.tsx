"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell } from "@/components/ui/Table";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const mockMembers = [
  {
    id: "1",
    name: "Ada Obi",
    email: "ada@example.com",
    phone: "0801 234 5678",
    level: "Intermediate",
    location: "Yaba",
    status: "Active",
    volunteerInterest: "Ride share lead"
  },
  {
    id: "2",
    name: "Bola Adeyemi",
    email: "bola@swimbuddz.com",
    phone: "0701 555 2222",
    level: "Beginner",
    location: "Ikoyi",
    status: "Inactive",
    volunteerInterest: "Media"
  }
];

const filters = {
  levels: ["All", "Beginner", "Intermediate", "Advanced"],
  locations: ["All", "Yaba", "Ikoyi", "Landmark"],
  statuses: ["All", "Active", "Inactive", "Banned"]
};

export default function AdminMembersPage() {
  const [levelFilter, setLevelFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredMembers = useMemo(() => {
    return mockMembers.filter((member) => {
      const levelMatch = levelFilter === "All" || member.level === levelFilter;
      const statusMatch = statusFilter === "All" || member.status === statusFilter;
      return levelMatch && statusMatch;
    });
  }, [levelFilter, statusFilter]);

  async function handleStatusChange(memberId: string, nextStatus: string) {
    if (!window.confirm(`Set member status to ${nextStatus}?`)) {
      return;
    }

    setUpdatingId(memberId);
    setError(null);

    try {
      // TODO: replace with apiPatch(`/api/v1/admin/members/${memberId}/status`, { membership_status: nextStatus })
      await new Promise((resolve) => setTimeout(resolve, 600));
      // mock only – state is not persisted since we don’t mutate mock array
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update status.";
      setError(message);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">Admin · Members</p>
        <h1 className="text-4xl font-bold text-slate-900">Member directory</h1>
        <p className="text-sm text-slate-600">Filters and table use mock data; connect to `GET /api/v1/admin/members` later.</p>
      </header>

      <Card className="flex flex-wrap gap-4">
        <Select label="Level" value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)}>
          {filters.levels.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </Select>
        <Select label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          {filters.statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
      </Card>

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
            <TableHeaderCell>Phone</TableHeaderCell>
            <TableHeaderCell>Level</TableHeaderCell>
            <TableHeaderCell>Location</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredMembers.map((member) => (
            <TableRow key={member.id}>
              <TableCell>{member.name}</TableCell>
              <TableCell>{member.email}</TableCell>
              <TableCell>{member.phone}</TableCell>
              <TableCell>{member.level}</TableCell>
              <TableCell>{member.location}</TableCell>
              <TableCell>
                <Badge variant={member.status === "Active" ? "success" : "warning"}>{member.status}</Badge>
              </TableCell>
              <TableCell>
                <div className=
