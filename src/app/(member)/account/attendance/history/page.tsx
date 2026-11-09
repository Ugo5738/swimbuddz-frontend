"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { apiGet } from "@/lib/api";
import { Download } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type AttendanceRecord = {
  id: string;
  session_id: string;
  status: string;
  check_in_time?: string | null;
  session?: {
    id: string;
    title: string;
    session_type: string;
    start_time: string;
    location_name?: string;
  };
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type StatusDisplay = {
  label: string;
  variant: React.ComponentProps<typeof Badge>["variant"];
};

/**
 * Resolve display label for an attendance status.
 * `present` / `registered` / `confirmed` are time-aware:
 *   - future session → "Booked"
 *   - past session   → "Attended"
 */
function getStatusDisplay(status: string, sessionStartTime?: string | null): StatusDisplay {
  const isPast = sessionStartTime ? new Date(sessionStartTime) < new Date() : false;

  switch (status) {
    case "present":
    case "registered":
    case "confirmed":
    case "checked_in":
      return isPast
        ? { label: "Attended", variant: "success" }
        : { label: "Booked", variant: "info" };
    case "late":
      return { label: "Late", variant: "warning" };
    case "absent":
    case "no_show":
      return { label: "No-show", variant: "warning" };
    case "excused":
      return { label: "Excused", variant: "default" };
    case "cancelled":
    case "canceled":
      return { label: "Cancelled", variant: "default" };
    case "pending":
      return { label: "Pending", variant: "info" };
    default:
      return { label: status, variant: "default" };
  }
}

type MemberProfile = {
  first_name?: string;
  last_name?: string;
  email?: string;
};

export default function AttendanceHistoryPage() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAttendance() {
      try {
        const [data, memberData] = await Promise.all([
          apiGet<AttendanceRecord[]>("/api/v1/attendance/me", {
            auth: true,
          }),
          apiGet<MemberProfile>("/api/v1/members/me", { auth: true }).catch(() => null),
        ]);
        setAttendance(data);
        if (memberData) {
          setMember(memberData);
        }
      } catch (e) {
        console.error("Failed to load attendance:", e);
        setError(e instanceof Error ? e.message : "Failed to load attendance history");
      } finally {
        setLoading(false);
      }
    }
    loadAttendance();
  }, []);

  const attendedCount = attendance.filter(
    (a) =>
      a.status === "confirmed" ||
      a.status === "checked_in" ||
      a.status === "registered" ||
      a.status === "present"
  ).length;

  const handleExportPdf = async () => {
    if (attendance.length === 0) return;
    setDownloadingPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();

      // Brand Title
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("SwimBuddz", 14, 20);

      doc.setFontSize(12);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text("Official Session Attendance Record", 14, 27);

      // Member info
      const memberName = [member?.first_name, member?.last_name].filter(Boolean).join(" ");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // slate-500
      let metaY = 34;
      if (memberName || member?.email) {
        doc.text(
          `Member: ${memberName || "Swimmer"}${member?.email ? ` (${member.email})` : ""}`,
          14,
          metaY
        );
        metaY += 5;
      }

      const generatedDate = new Date().toLocaleDateString("en-NG", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      doc.text(`Generated on: ${generatedDate}`, 14, metaY);
      metaY += 5;
      doc.text(`Total Sessions Attended: ${attendedCount}`, 14, metaY);
      metaY += 4;

      // Divider line
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.line(14, metaY, 196, metaY);

      // Table Header
      let y = metaY + 8;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59); // slate-800
      doc.text("Date", 14, y);
      doc.text("Session", 45, y);
      doc.text("Type", 135, y);
      doc.text("Status", 165, y);

      // Header underline
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.line(14, y + 2, 196, y + 2);

      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);

      for (const record of attendance) {
        if (y > 275) {
          doc.addPage();
          y = 20;
          doc.setFont("helvetica", "bold");
          doc.text("Date", 14, y);
          doc.text("Session", 45, y);
          doc.text("Type", 135, y);
          doc.text("Status", 165, y);
          doc.line(14, y + 2, 196, y + 2);
          y += 8;
          doc.setFont("helvetica", "normal");
        }

        const session = record.session;
        const status = getStatusDisplay(record.status, session?.start_time);
        const dateStr = session?.start_time ? formatDate(session.start_time) : "—";
        const titleStr = session?.title || "Session";
        const typeStr = session?.session_type ? session.session_type.replace("_", " ") : "—";

        // Truncate long session titles to fit 85mm
        const truncatedTitle = doc.splitTextToSize(titleStr, 85)[0] || titleStr;

        doc.setTextColor(71, 85, 105);
        doc.text(dateStr, 14, y);
        doc.setTextColor(15, 23, 42);
        doc.text(truncatedTitle, 45, y);
        doc.setTextColor(71, 85, 105);
        doc.text(typeStr, 135, y);

        // Color status
        if (status.label === "Attended") {
          doc.setTextColor(16, 149, 106); // emerald
        } else if (status.label === "Booked") {
          doc.setTextColor(14, 116, 144); // cyan
        } else if (status.label === "Late" || status.label === "No-show") {
          doc.setTextColor(180, 83, 9); // amber
        } else {
          doc.setTextColor(100, 116, 139);
        }
        doc.text(status.label, 165, y);

        y += 6.5;
      }

      // Footer
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(
          `SwimBuddz Swimming Community · swim@swimbuddz.com · Page ${i} of ${pageCount}`,
          14,
          290
        );
      }

      const fileDate = new Date().toISOString().split("T")[0];
      doc.save(`SwimBuddz_Attendance_Record_${fileDate}.pdf`);
    } catch (e) {
      console.error("Failed to generate PDF:", e);
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <LoadingSpinner size="lg" text="Loading attendance history..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Session History</h1>
          <p className="text-sm text-slate-600">Track your past sessions and attendance.</p>
        </header>
        <Card className="p-6 text-center">
          <p className="text-red-600">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <header className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Session History</h1>
          <p className="text-sm text-slate-600">Track your past sessions and attendance.</p>
        </header>
        {attendance.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportPdf}
            disabled={downloadingPdf}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            {downloadingPdf ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export PDF</span>
              </>
            )}
          </Button>
        )}
      </div>

      {attendance.length === 0 ? (
        <Card className="p-6 md:p-8 text-center space-y-4">
          <div className="text-5xl">📋</div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">No attendance history yet</h2>
            <p className="text-sm text-slate-600 mt-1">
              Your session attendance will appear here once you start attending sessions.
            </p>
          </div>
          <Link
            href="/sessions"
            className="inline-block px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm font-medium"
          >
            Browse Sessions
          </Link>
        </Card>
      ) : (
        <>
          {/* Summary Card */}
          <Card className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-base md:text-lg font-semibold text-slate-900">
              You&apos;ve attended {attendedCount} session
              {attendedCount !== 1 ? "s" : ""}.
            </p>
            <span className="text-xs text-slate-500">
              Total logged: {attendance.length} record{attendance.length === 1 ? "" : "s"}
            </span>
          </Card>

          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3">
            {attendance.map((record) => {
              const session = record.session;
              const status = getStatusDisplay(record.status, session?.start_time);
              return (
                <Card key={record.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 text-sm">
                        {session?.title || "Session"}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        {session?.start_time ? formatDate(session.start_time) : "—"}
                      </p>
                      <p className="text-xs text-slate-500 capitalize">
                        {session?.session_type?.replace("_", " ") || "Session"}
                      </p>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableHeaderCell>Session</TableHeaderCell>
                  <TableHeaderCell className="hidden md:table-cell">Type</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attendance.map((record) => {
                  const session = record.session;
                  const status = getStatusDisplay(record.status, session?.start_time);
                  return (
                    <TableRow key={record.id}>
                      <TableCell>
                        {session?.start_time ? formatDate(session.start_time) : "—"}
                      </TableCell>
                      <TableCell>{session?.title || "Session"}</TableCell>
                      <TableCell className="hidden md:table-cell capitalize">
                        {session?.session_type?.replace("_", " ") || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
