"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { apiGet, apiPost } from "@/lib/api";
import type { components } from "@/lib/api-types";
import { format } from "date-fns";
import type { jsPDF as JsPDFType } from "jspdf";
import { useEffect, useMemo, useState } from "react";

type SessionBookingResponse = components["schemas"]["SessionBookingResponse"];
type EnrollmentResponse = components["schemas"]["EnrollmentResponse"];
type BookingChannel = components["schemas"]["BookingChannel"];
type AttendanceStatusEnum = components["schemas"]["AttendanceStatus"];
type CoachMarkEntry = components["schemas"]["CoachAttendanceMarkEntry"];
type MemberBasicResponse = components["schemas"]["MemberBasicResponse"];

type ExceptionStatus = Exclude<AttendanceStatusEnum, "present" | "cancelled">;

const EXCEPTION_STATUSES: ExceptionStatus[] = ["absent", "excused", "late"];

const CHANNEL_LABELS: Record<BookingChannel, string> = {
  member_self: "Self",
  admin: "Admin",
  corporate_bulk: "Corporate",
  bundle_cart: "Bundle",
};

function formatNaira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "present") return "bg-emerald-100 text-emerald-800";
  if (s === "late") return "bg-amber-100 text-amber-800";
  if (s === "absent") return "bg-rose-100 text-rose-800";
  if (s === "excused") return "bg-sky-100 text-sky-800";
  return "bg-slate-100 text-slate-800";
}

type Session = {
  id: string;
  starts_at: string;
  location: string | null;
  location_name: string | null;
  title: string | null;
  lesson_title: string | null;
  week_number: number | null;
  cohort_id: string | null;
  session_type: string | null;
};

type Cohort = {
  id: string;
  name: string;
};

function describeSession(session: Session, cohortNames: Map<string, string>): string {
  const startDate = session.starts_at ? new Date(session.starts_at) : null;
  const dateLabel =
    startDate && !isNaN(startDate.getTime()) ? format(startDate, "MMM d, yyyy h:mm a") : "Date TBD";

  const cohortName = session.cohort_id ? cohortNames.get(session.cohort_id) : null;
  const weekLabel = session.week_number ? `Week ${session.week_number}` : null;
  const cohortLabel = cohortName ? (weekLabel ? `${cohortName} · ${weekLabel}` : cohortName) : null;

  const titleLabel =
    session.title ||
    session.lesson_title ||
    (session.session_type
      ? session.session_type.charAt(0).toUpperCase() + session.session_type.slice(1)
      : "Session");

  const locationLabel = session.location_name || session.location || "Location TBD";

  return [dateLabel, titleLabel, cohortLabel, locationLabel].filter(Boolean).join(" · ");
}

type Attendance = {
  id: string;
  member_name: string;
  member_email: string;
  status: string;
  role: string;
  notes: string;
  member_id: string; // Needed for merging
  ride_share_option?: string;
  needs_ride?: boolean;
  can_offer_ride?: boolean;
  pickup_location?: string | null;
  ride_info?: {
    pickup_location: string;
    ride_number?: number | null;
    area_name?: string | null;
  };
};

type RideBooking = {
  member_id: string;
  pickup_location_name: string;
  assigned_ride_number: number;
  ride_area_name: string;
};

type RideConfig = {
  id: string;
  ride_area_id: string;
  ride_area_name: string;
  pickup_locations: Array<{
    id: string;
    name: string;
    description?: string | null;
  }>;
};

type MarkRow = {
  member_id: string;
  status: ExceptionStatus;
  notes: string;
};

export default function AdminAttendancePage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [cohortNames, setCohortNames] = useState<Map<string, string>>(() => new Map());
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
  const [bookings, setBookings] = useState<SessionBookingResponse[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentResponse[]>([]);
  const [memberLookup, setMemberLookup] = useState<Map<string, { name: string; email: string }>>(
    () => new Map()
  );
  const [markRows, setMarkRows] = useState<MarkRow[]>([]);
  const [submittingMark, setSubmittingMark] = useState(false);
  const [markSuccess, setMarkSuccess] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedSessionId, setSelectedSessionId] = useState("");

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId]
  );
  const isCohortSession = Boolean(selectedSession?.cohort_id);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const [data, cohorts] = await Promise.all([
          apiGet<Session[]>("/api/v1/sessions/", { auth: true }),
          apiGet<Cohort[]>("/api/v1/academy/cohorts", { auth: true }).catch((err) => {
            console.warn("Failed to fetch cohorts for dropdown labels", err);
            return [] as Cohort[];
          }),
        ]);
        setSessions(data);
        setCohortNames(new Map(cohorts.map((c) => [c.id, c.name])));
        if (data.length > 0) {
          setSelectedSessionId(data[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch sessions", err);
        setError("Failed to load sessions.");
      } finally {
        setLoadingSessions(false);
      }
    }
    fetchSessions();
  }, []);

  useEffect(() => {
    if (!selectedSessionId) return;
    const session = sessions.find((s) => s.id === selectedSessionId) ?? null;
    const cohortId = session?.cohort_id ?? null;

    async function fetchAttendance() {
      setLoadingAttendance(true);
      setError(null); // Clear previous errors
      setMarkSuccess(null);
      try {
        const [attendanceData, rideBookingsData, rideConfigs, sessionBookings, cohortEnrollments] =
          await Promise.all([
            apiGet<Attendance[]>(`/api/v1/attendance/sessions/${selectedSessionId}/attendance`, {
              auth: true,
            }),
            apiGet<RideBooking[]>(`/api/v1/transport/sessions/${selectedSessionId}/bookings`, {
              auth: true,
            }).catch((err) => {
              console.warn("Failed to fetch ride bookings", err);
              return [];
            }), // Fail gracefully if transport service is down or no bookings
            apiGet<RideConfig[]>(`/api/v1/transport/sessions/${selectedSessionId}/ride-configs`, {
              auth: true,
            }).catch((err) => {
              console.warn("Failed to fetch ride configs", err);
              return [];
            }),
            apiGet<SessionBookingResponse[]>(`/api/v1/sessions/${selectedSessionId}/bookings`, {
              auth: true,
            }).catch((err) => {
              console.warn("Failed to fetch session bookings", err);
              return [] as SessionBookingResponse[];
            }),
            cohortId
              ? apiGet<EnrollmentResponse[]>(`/api/v1/academy/cohorts/${cohortId}/enrollments`, {
                  auth: true,
                }).catch((err) => {
                  console.warn("Failed to fetch cohort enrollments", err);
                  return [] as EnrollmentResponse[];
                })
              : Promise.resolve([] as EnrollmentResponse[]),
          ]);
        const bookingsData = rideBookingsData;

        // Build lookup maps
        const normalizeId = (id?: string | null) => (id ? id.toString().trim().toLowerCase() : "");
        const bookingsMap = new Map(
          bookingsData
            .map((b) => [normalizeId((b as any).member_id ?? (b as any).memberId), b] as const)
            .filter(([key]) => Boolean(key))
        );
        const pickupLocationsMap = new Map<string, { name: string; area_name: string }>();
        rideConfigs.forEach((config) => {
          config.pickup_locations.forEach((loc) => {
            pickupLocationsMap.set(loc.id, {
              name: loc.name,
              area_name: config.ride_area_name,
            });
          });
        });

        const mergedAttendance = attendanceData.map((record) => {
          const recordMemberId = normalizeId((record as any).member_id ?? (record as any).memberId);
          const booking = recordMemberId ? bookingsMap.get(recordMemberId) : undefined;

          let rideInfo: Attendance["ride_info"] = booking
            ? {
                pickup_location: booking.pickup_location_name,
                ride_number: booking.assigned_ride_number,
                area_name: booking.ride_area_name,
              }
            : undefined;

          // Fallback to attendance record data when booking is missing
          if (!rideInfo && record.pickup_location) {
            const locationMeta = pickupLocationsMap.get(record.pickup_location);
            rideInfo = {
              pickup_location: locationMeta?.name || record.pickup_location,
              ride_number: null,
              area_name: locationMeta?.area_name,
            };
          } else if (!rideInfo && (record.needs_ride || record.ride_share_option === "join")) {
            rideInfo = {
              pickup_location: "Ride requested",
              ride_number: null,
              area_name: undefined,
            };
          }

          return {
            ...record,
            ride_info: rideInfo,
          };
        });

        setAttendanceList(mergedAttendance);
        setBookings(sessionBookings);
        setEnrollments(cohortEnrollments);

        // Build a member_id -> {name, email} lookup, merging known sources.
        const lookup = new Map<string, { name: string; email: string }>();
        for (const a of mergedAttendance) {
          if (a.member_id) {
            lookup.set(a.member_id, {
              name: a.member_name || "(unknown)",
              email: a.member_email || "",
            });
          }
        }
        for (const e of cohortEnrollments) {
          if (e.member_id && !lookup.has(e.member_id)) {
            lookup.set(e.member_id, {
              name: e.member_name || "(unknown)",
              email: e.member_email || "",
            });
          }
        }

        // Fill in any remaining booking members via /members/bulk-basic.
        const missingIds = sessionBookings
          .map((b) => b.member_id)
          .filter((id) => id && !lookup.has(id));
        if (missingIds.length > 0) {
          try {
            const basic = await apiPost<Record<string, MemberBasicResponse>>(
              "/api/v1/members/bulk-basic",
              missingIds,
              { auth: true }
            );
            for (const [id, m] of Object.entries(basic)) {
              lookup.set(id, {
                name: `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || "(unknown)",
                email: m.email ?? "",
              });
            }
          } catch (err) {
            console.warn("Failed to enrich booking member names", err);
          }
        }
        setMemberLookup(lookup);

        // Pre-populate the cohort bulk-mark form with existing exceptions
        // (anything not PRESENT). For non-cohort sessions this is ignored.
        const seededRows: MarkRow[] = mergedAttendance
          .filter(
            (a) => a.status && (EXCEPTION_STATUSES as string[]).includes(a.status.toLowerCase())
          )
          .map((a) => ({
            member_id: a.member_id,
            status: a.status.toLowerCase() as ExceptionStatus,
            notes: a.notes || "",
          }));
        setMarkRows(seededRows);
      } catch (err: any) {
        console.error("Failed to fetch attendance", err);
        setError(`Failed to load attendance list: ${err.message || "Unknown error"}`);
      } finally {
        setLoadingAttendance(false);
      }
    }
    fetchAttendance();
  }, [selectedSessionId, sessions]);

  const attendanceByMember = useMemo(() => {
    const m = new Map<string, Attendance>();
    for (const a of attendanceList) {
      if (a.member_id) m.set(a.member_id, a);
    }
    return m;
  }, [attendanceList]);

  const confirmedBookings = useMemo(
    () => bookings.filter((b) => b.status === "confirmed"),
    [bookings]
  );

  const noShows = useMemo(() => {
    return confirmedBookings.filter((b) => {
      const a = attendanceByMember.get(b.member_id);
      // No attendance row at all, OR explicit absent — counts as no-show.
      return !a || a.status?.toLowerCase() === "absent";
    });
  }, [confirmedBookings, attendanceByMember]);

  const walkIns = useMemo(() => {
    if (isCohortSession) return [] as Attendance[];
    const bookedMembers = new Set(confirmedBookings.map((b) => b.member_id));
    return attendanceList.filter(
      (a) =>
        a.member_id &&
        !bookedMembers.has(a.member_id) &&
        a.status?.toLowerCase() !== "absent" &&
        a.status?.toLowerCase() !== "excused"
    );
  }, [attendanceList, confirmedBookings, isCohortSession]);

  const cohortRoster = useMemo(() => {
    if (!isCohortSession) return [] as EnrollmentResponse[];
    return enrollments.filter((e) => e.status === "enrolled");
  }, [enrollments, isCohortSession]);

  const markRowMemberIds = useMemo(() => new Set(markRows.map((r) => r.member_id)), [markRows]);

  const eligibleMembersForMark = useMemo(() => {
    // Cohort enrollment is the source of truth for who can be marked.
    return cohortRoster
      .filter((e) => !markRowMemberIds.has(e.member_id))
      .map((e) => ({
        id: e.member_id,
        name: memberLookup.get(e.member_id)?.name || e.member_name || "(unknown)",
        email: memberLookup.get(e.member_id)?.email || e.member_email || "",
      }));
  }, [cohortRoster, markRowMemberIds, memberLookup]);

  const handleAddMarkRow = (memberId: string) => {
    if (!memberId) return;
    setMarkRows((prev) =>
      prev.some((r) => r.member_id === memberId)
        ? prev
        : [...prev, { member_id: memberId, status: "absent", notes: "" }]
    );
    setMarkSuccess(null);
  };

  const handleUpdateMarkRow = (memberId: string, patch: Partial<MarkRow>) => {
    setMarkRows((prev) => prev.map((r) => (r.member_id === memberId ? { ...r, ...patch } : r)));
    setMarkSuccess(null);
  };

  const handleRemoveMarkRow = (memberId: string) => {
    setMarkRows((prev) => prev.filter((r) => r.member_id !== memberId));
    setMarkSuccess(null);
  };

  const handleSubmitMark = async () => {
    if (!selectedSessionId) return;
    setSubmittingMark(true);
    setError(null);
    setMarkSuccess(null);
    try {
      // Submit current exceptions.
      const entries: CoachMarkEntry[] = markRows.map((r) => ({
        member_id: r.member_id,
        status: r.status,
        notes: r.notes || null,
      }));

      // Revert: any existing AttendanceRecord exception that's no longer in
      // the form needs to be submitted as PRESENT so the server deletes it.
      const currentExceptionIds = new Set(markRows.map((r) => r.member_id));
      for (const a of attendanceList) {
        const lower = a.status?.toLowerCase();
        if (
          a.member_id &&
          lower &&
          (EXCEPTION_STATUSES as string[]).includes(lower) &&
          !currentExceptionIds.has(a.member_id)
        ) {
          entries.push({ member_id: a.member_id, status: "present" });
        }
      }

      if (entries.length === 0) {
        setMarkSuccess("No changes to submit.");
        return;
      }

      await apiPost(
        `/api/v1/attendance/sessions/${selectedSessionId}/coach-mark`,
        { entries },
        { auth: true }
      );
      setMarkSuccess(`Saved ${entries.length} change${entries.length === 1 ? "" : "s"}.`);

      // Refresh attendance + reseed mark rows.
      const refreshed = await apiGet<Attendance[]>(
        `/api/v1/attendance/sessions/${selectedSessionId}/attendance`,
        { auth: true }
      );
      setAttendanceList(refreshed);
      setMarkRows(
        refreshed
          .filter(
            (a) => a.status && (EXCEPTION_STATUSES as string[]).includes(a.status.toLowerCase())
          )
          .map((a) => ({
            member_id: a.member_id,
            status: a.status.toLowerCase() as ExceptionStatus,
            notes: a.notes || "",
          }))
      );
    } catch (err: any) {
      console.error("Failed to submit attendance mark", err);
      setError(`Failed to save attendance: ${err.message || "Unknown error"}`);
    } finally {
      setSubmittingMark(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!selectedSessionId || attendanceList.length === 0) return;

    setError(null);
    setDownloading(true);
    try {
      const selectedSession = sessions.find((s) => s.id === selectedSessionId);
      const startDate = selectedSession?.starts_at ? new Date(selectedSession.starts_at) : null;
      const dateLabel =
        startDate && !isNaN(startDate.getTime()) ? format(startDate, "yyyy-MM-dd") : "session";

      const headers = ["Name", "Ride Info", "Notes"];
      const rows = attendanceList.map((item) => {
        const rideLine = item.ride_info
          ? [
              item.ride_info.pickup_location,
              [
                item.ride_info.area_name,
                item.ride_info.ride_number ? `Ride #${item.ride_info.ride_number}` : null,
              ]
                .filter(Boolean)
                .join(" • "),
            ]
              .filter(Boolean)
              .join(" — ")
          : "--";
        const notes = item.notes || "";
        return [item.member_name, rideLine, notes];
      });

      const escapeCell = (cell: string) => {
        const needsQuotes = /[",\n]/.test(cell);
        const escaped = cell.replace(/"/g, '""');
        return needsQuotes ? `"${escaped}"` : escaped;
      };

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => escapeCell(cell || "")).join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `attendance-${dateLabel}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Failed to download pool list", err);
      setError("Failed to download attendance CSV. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedSessionId || attendanceList.length === 0) return;
    setError(null);
    setDownloadingPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc: JsPDFType = new jsPDF();

      const selectedSession = sessions.find((s) => s.id === selectedSessionId);
      const startDate = selectedSession?.starts_at ? new Date(selectedSession.starts_at) : null;
      const subtitle = selectedSession ? describeSession(selectedSession, cohortNames) : "Session";

      doc.setFontSize(14);
      doc.text("Attendance Report", 14, 16);
      doc.setFontSize(10);
      doc.text(subtitle, 14, 22);

      const columns = [
        {
          key: "name",
          label: "Name",
          width: 60,
          getText: (item: Attendance) => item.member_name,
        },
        {
          key: "ride",
          label: "Ride",
          width: 70,
          getText: (item: Attendance) =>
            item.ride_info
              ? [
                  item.ride_info.pickup_location,
                  [
                    item.ride_info.area_name,
                    item.ride_info.ride_number ? `Ride #${item.ride_info.ride_number}` : null,
                  ]
                    .filter(Boolean)
                    .join(" • "),
                ]
                  .filter(Boolean)
                  .join(" — ")
              : "--",
        },
        {
          key: "notes",
          label: "Notes",
          width: 60,
          getText: (item: Attendance) => item.notes || "",
        },
      ];

      let y = 32;
      const lineHeight = 6;
      doc.setFontSize(9);

      const colPositions: number[] = [];
      let currentX = 14;
      columns.forEach((col) => {
        colPositions.push(currentX);
        doc.text(col.label, currentX, y);
        currentX += col.width;
      });

      y += 4;
      doc.line(14, y, 14 + columns.reduce((sum, col) => sum + col.width, 0), y);
      y += 6;

      const drawRow = (item: Attendance) => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        const wrappedTexts = columns.map(
          (col) => doc.splitTextToSize(col.getText(item) || "", col.width - 4) as string[]
        );
        const maxLines = Math.max(...wrappedTexts.map((lines) => lines.length || 1));
        const rowHeight = maxLines * lineHeight;

        wrappedTexts.forEach((lines: string[], idx) => {
          const x = colPositions[idx];
          lines.forEach((line: string, lineIdx: number) => {
            doc.text(line, x, y + lineIdx * lineHeight);
          });
        });

        y += rowHeight + 2;
        doc.line(14, y - 2, 14 + columns.reduce((sum, col) => sum + col.width, 0), y - 2);
      };

      attendanceList.forEach(drawRow);

      const fileDate =
        startDate && !isNaN(startDate.getTime()) ? format(startDate, "yyyy-MM-dd") : "session";
      doc.save(`attendance-${fileDate}.pdf`);
    } catch (err: any) {
      console.error("Failed to generate PDF", err);
      setError("Failed to generate PDF. Please try again.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loadingSessions) {
    return <LoadingPage text="Loading sessions..." />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-8">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance Report</h1>
          <p className="text-slate-600">View and manage session attendance.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handlePrint}>
            Print List
          </Button>
          <Button
            variant="secondary"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf || attendanceList.length === 0}
          >
            {downloadingPdf ? "Preparing PDF..." : "Download PDF"}
          </Button>
          <Button onClick={handleDownload} disabled={downloading}>
            {downloading ? "Preparing..." : "Download CSV"}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      )}

      <div className="space-y-4 print:space-y-2">
        <div className="print:hidden">
          <label className="mb-1 block text-sm font-medium text-slate-700">Select Session</label>
          <select
            className="w-full max-w-md rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {describeSession(s, cohortNames)}
              </option>
            ))}
          </select>
        </div>

        {!loadingAttendance && selectedSessionId ? (
          <div className="grid grid-cols-2 gap-3 print:hidden sm:grid-cols-4">
            <ReconciliationStat label="Confirmed bookings" value={confirmedBookings.length} />
            <ReconciliationStat
              label={isCohortSession ? "Recorded exceptions" : "Checked in"}
              value={attendanceList.length}
            />
            <ReconciliationStat
              label="No-shows"
              value={noShows.length}
              tone={noShows.length > 0 ? "warn" : "ok"}
            />
            <ReconciliationStat
              label={isCohortSession ? "Cohort enrolled" : "Walk-ins"}
              value={isCohortSession ? cohortRoster.length : walkIns.length}
            />
          </div>
        ) : null}

        {/* Print-only header */}
        <div className="hidden print:block">
          <h2 className="text-xl font-bold">Attendance List</h2>
          {selectedSessionId &&
            (() => {
              const selectedSession = sessions.find((s) => s.id === selectedSessionId);
              if (!selectedSession) return null;
              return (
                <p className="text-sm text-slate-600">
                  {describeSession(selectedSession, cohortNames)}
                </p>
              );
            })()}
        </div>

        {loadingAttendance ? (
          <LoadingPage text="Loading attendance..." />
        ) : attendanceList.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 py-12 text-center text-slate-500">
            No attendees found for this session.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm print:border-0 print:shadow-none">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 print:bg-white">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500"
                  >
                    Ride Info
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500"
                  >
                    Role
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500"
                  >
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {attendanceList.map((attendance) => (
                  <tr key={attendance.id}>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">
                        {attendance.member_name}
                      </div>
                      <div className="text-sm text-slate-500">{attendance.member_email}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${statusBadgeClass(attendance.status)}`}
                      >
                        {attendance.status}
                      </span>
                      {!isCohortSession &&
                      attendance.member_id &&
                      !confirmedBookings.some((b) => b.member_id === attendance.member_id) &&
                      attendance.status?.toLowerCase() !== "absent" &&
                      attendance.status?.toLowerCase() !== "excused" ? (
                        <span className="ml-2 inline-flex rounded-full bg-violet-100 px-2 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                          Walk-in
                        </span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {attendance.ride_info ? (
                        <div className="text-sm text-slate-700">
                          <div className="font-medium">{attendance.ride_info.pickup_location}</div>
                          {(attendance.ride_info.area_name || attendance.ride_info.ride_number) && (
                            <div className="text-xs text-slate-500">
                              {[
                                attendance.ride_info.area_name,
                                attendance.ride_info.ride_number
                                  ? `Ride #${attendance.ride_info.ride_number}`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" • ")}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">--</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                      {attendance.role}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                      {attendance.notes || "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loadingAttendance && selectedSessionId && bookings.length > 0 ? (
          <ExpectedBookingsPanel
            bookings={bookings}
            attendanceByMember={attendanceByMember}
            memberLookup={memberLookup}
          />
        ) : null}

        {!loadingAttendance && selectedSessionId && isCohortSession ? (
          <CohortMarkForm
            markRows={markRows}
            memberLookup={memberLookup}
            eligibleMembers={eligibleMembersForMark}
            submitting={submittingMark}
            successMessage={markSuccess}
            onAdd={handleAddMarkRow}
            onUpdate={handleUpdateMarkRow}
            onRemove={handleRemoveMarkRow}
            onSubmit={handleSubmitMark}
          />
        ) : null}

        {!loadingAttendance &&
        selectedSessionId &&
        !isCohortSession &&
        attendanceList.length === 0 &&
        bookings.length === 0
          ? null
          : null}
      </div>
    </div>
  );
}

function ReconciliationStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "ok" | "warn";
}) {
  const toneClass =
    tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "ok"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : "border-slate-200 bg-white text-slate-900";
  return (
    <div className={`rounded-lg border px-4 py-3 shadow-sm ${toneClass}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

function ExpectedBookingsPanel({
  bookings,
  attendanceByMember,
  memberLookup,
}: {
  bookings: SessionBookingResponse[];
  attendanceByMember: Map<string, Attendance>;
  memberLookup: Map<string, { name: string; email: string }>;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm print:hidden">
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Expected (paid bookings)</h2>
        <p className="text-xs text-slate-500">
          Confirmed SessionBookings for this session. Walk-ins and self sign-ins are not listed
          here.
        </p>
      </div>
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Member
            </th>
            <th className="px-6 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Channel
            </th>
            <th className="px-6 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Amount
            </th>
            <th className="px-6 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Booking status
            </th>
            <th className="px-6 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Arrival
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {bookings.map((b) => {
            const member = memberLookup.get(b.member_id);
            const attendance = attendanceByMember.get(b.member_id);
            const lower = attendance?.status?.toLowerCase();
            let arrival: { label: string; cls: string };
            if (!attendance) {
              arrival = {
                label: "Awaiting",
                cls: "bg-slate-100 text-slate-700",
              };
            } else if (lower === "absent") {
              arrival = { label: "No-show", cls: "bg-rose-100 text-rose-800" };
            } else if (lower === "excused") {
              arrival = { label: "Excused", cls: "bg-sky-100 text-sky-800" };
            } else if (lower === "late") {
              arrival = { label: "Late", cls: "bg-amber-100 text-amber-800" };
            } else {
              arrival = {
                label: "Arrived",
                cls: "bg-emerald-100 text-emerald-800",
              };
            }
            return (
              <tr key={b.id}>
                <td className="whitespace-nowrap px-6 py-3">
                  <div className="text-sm font-medium text-slate-900">
                    {member?.name || "(unknown)"}
                  </div>
                  {member?.email ? (
                    <div className="text-xs text-slate-500">{member.email}</div>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-6 py-3 text-xs text-slate-700">
                  {CHANNEL_LABELS[b.channel]}
                </td>
                <td className="whitespace-nowrap px-6 py-3 text-sm text-slate-700">
                  {formatNaira(b.fee_amount_kobo)}
                </td>
                <td className="whitespace-nowrap px-6 py-3">
                  <span className="inline-flex rounded-full bg-slate-100 px-2 text-xs font-semibold text-slate-700">
                    {b.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 text-xs font-semibold ${arrival.cls}`}
                  >
                    {arrival.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CohortMarkForm({
  markRows,
  memberLookup,
  eligibleMembers,
  submitting,
  successMessage,
  onAdd,
  onUpdate,
  onRemove,
  onSubmit,
}: {
  markRows: MarkRow[];
  memberLookup: Map<string, { name: string; email: string }>;
  eligibleMembers: Array<{ id: string; name: string; email: string }>;
  submitting: boolean;
  successMessage: string | null;
  onAdd: (memberId: string) => void;
  onUpdate: (memberId: string, patch: Partial<MarkRow>) => void;
  onRemove: (memberId: string) => void;
  onSubmit: () => void;
}) {
  const [pickerValue, setPickerValue] = useState("");
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm print:hidden">
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-3">
        <h2 className="text-sm font-semibold text-slate-900">
          Mark exceptions (default = present)
        </h2>
        <p className="text-xs text-slate-500">
          Cohort sessions use a default-present model. Only enter rows for students who were absent,
          excused, or late. Remove a row to revert a student back to present.
        </p>
      </div>
      <div className="space-y-3 px-6 py-4">
        {markRows.length === 0 ? (
          <p className="text-sm text-slate-500">
            No exceptions yet — everyone in the cohort is assumed present.
          </p>
        ) : (
          <div className="space-y-2">
            {markRows.map((row) => {
              const member = memberLookup.get(row.member_id);
              return (
                <div
                  key={row.member_id}
                  className="grid grid-cols-12 items-center gap-2 rounded-md border border-slate-200 p-2"
                >
                  <div className="col-span-4 text-sm">
                    <div className="font-medium text-slate-900">{member?.name || "(unknown)"}</div>
                    {member?.email ? (
                      <div className="text-xs text-slate-500">{member.email}</div>
                    ) : null}
                  </div>
                  <select
                    className="col-span-2 rounded-md border border-slate-200 px-2 py-1 text-sm"
                    value={row.status}
                    onChange={(e) =>
                      onUpdate(row.member_id, {
                        status: e.target.value as ExceptionStatus,
                      })
                    }
                  >
                    {EXCEPTION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Notes (optional)"
                    className="col-span-5 rounded-md border border-slate-200 px-2 py-1 text-sm"
                    value={row.notes}
                    onChange={(e) => onUpdate(row.member_id, { notes: e.target.value })}
                  />
                  <button
                    type="button"
                    className="col-span-1 text-sm text-rose-600 hover:underline"
                    onClick={() => onRemove(row.member_id)}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
          <div className="flex-1 min-w-[16rem]">
            <label className="mb-1 block text-xs font-medium text-slate-600">Add student</label>
            <select
              className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm"
              value={pickerValue}
              onChange={(e) => {
                const v = e.target.value;
                setPickerValue("");
                if (v) onAdd(v);
              }}
            >
              <option value="">
                {eligibleMembers.length === 0
                  ? "All cohort members already added"
                  : "Select a student…"}
              </option>
              {eligibleMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {m.email ? ` · ${m.email}` : ""}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? "Saving…" : "Save attendance"}
          </Button>
        </div>

        {successMessage ? <p className="text-sm text-emerald-700">{successMessage}</p> : null}
      </div>
    </div>
  );
}
