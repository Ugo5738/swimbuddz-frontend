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
type CoachMarkEntry = components["schemas"]["CoachAttendanceMarkEntry"];
type MemberBasicResponse = components["schemas"]["MemberBasicResponse"];

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

type RosterSource = "cohort" | "booking" | "walkin";

// Unified roster row: every member who matters for this session, regardless
// of source. Replaces the old 3-tab split (Expected/Attendance/Mark
// exceptions). One status dropdown per row, batched save at the bottom.
type RosterRow = {
  member_id: string;
  name: string;
  email: string;
  source: RosterSource;
  // The attendance record, if one exists. Absence of a row + cohort source =
  // default-present (the cohort attendance model).
  attendance?: Attendance;
  booking?: SessionBookingResponse;
  ride_info?: Attendance["ride_info"];
  // Effective status to display: derived from attendance/booking/source.
  effectiveStatus: "present" | "absent" | "late" | "excused" | "cancelled" | "awaiting";
};

// Draft edit per member: the status the admin wants to save. "present" for a
// row with an existing exception row deletes that exception (or, for non-
// cohort, materializes a PRESENT record). Unset means no change.
type DraftStatus = "present" | "absent" | "late" | "excused";

// A session "has started" once its start time is in the past. We use this to
// decide whether unmatched bookings should be labelled "Pending" (not yet
// arrived) versus "No-show" (the session has begun without them).
function hasSessionStarted(startsAt: string | null | undefined): boolean {
  if (!startsAt) return false;
  const d = new Date(startsAt);
  if (isNaN(d.getTime())) return false;
  return d.getTime() <= Date.now();
}

export default function AdminAttendancePage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [cohortNames, setCohortNames] = useState<Map<string, string>>(() => new Map());
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
  const [bookings, setBookings] = useState<SessionBookingResponse[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentResponse[]>([]);
  const [memberLookup, setMemberLookup] = useState<Map<string, { name: string; email: string }>>(
    () => new Map()
  );
  // Pending status edits per member, keyed by member_id. Diffed against
  // effectiveStatus on save so we only send actual changes to the backend.
  const [drafts, setDrafts] = useState<Map<string, DraftStatus>>(() => new Map());
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
  const sessionStarted = hasSessionStarted(selectedSession?.starts_at);

  // Reset draft edits whenever the selected session changes.
  useEffect(() => {
    setDrafts(new Map());
  }, [selectedSessionId]);

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
        // Only seed entries when we actually have a name — otherwise leave the
        // slot empty so the bulk-basic fallback below can fill it in.
        const lookup = new Map<string, { name: string; email: string }>();
        for (const a of mergedAttendance) {
          if (a.member_id && a.member_name) {
            lookup.set(a.member_id, {
              name: a.member_name,
              email: a.member_email || "",
            });
          }
        }
        for (const e of cohortEnrollments) {
          if (e.member_id && e.member_name && !lookup.has(e.member_id)) {
            lookup.set(e.member_id, {
              name: e.member_name,
              email: e.member_email || "",
            });
          }
        }

        // Fill in any remaining booking members via /members/bulk-basic.
        // Also include cohort enrollees who came back without a name so the
        // mark-exceptions dropdown is never littered with "(unknown)".
        const idsToFetch = new Set<string>();
        for (const b of sessionBookings) {
          if (b.member_id && !lookup.has(b.member_id)) {
            idsToFetch.add(b.member_id);
          }
        }
        for (const e of cohortEnrollments) {
          if (e.member_id && !lookup.has(e.member_id)) {
            idsToFetch.add(e.member_id);
          }
        }
        const missingIds = Array.from(idsToFetch);
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

  // "Unmatched" bookings = confirmed but no PRESENT/LATE attendance row.
  // Before the session starts we display these as "Pending arrivals";
  // once the session has started they're proper "No-shows".
  const unmatchedBookings = useMemo(() => {
    return confirmedBookings.filter((b) => {
      const a = attendanceByMember.get(b.member_id);
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

  // Build the unified roster: cohort enrollees + confirmed bookings + walk-ins,
  // deduplicated by member_id. Each row carries its effective status — what
  // it would be saved as right now (default-present for cohort, or the
  // attendance row's status, or "awaiting" for a pre-session booking).
  const roster = useMemo<RosterRow[]>(() => {
    const byMember = new Map<string, RosterRow>();

    const computeEffective = (
      source: RosterSource,
      attendance: Attendance | undefined
    ): RosterRow["effectiveStatus"] => {
      if (attendance?.status) {
        const s = attendance.status.toLowerCase();
        if (
          s === "present" ||
          s === "absent" ||
          s === "late" ||
          s === "excused" ||
          s === "cancelled"
        ) {
          return s as RosterRow["effectiveStatus"];
        }
      }
      // No explicit attendance row:
      //   - cohort member → default present (implicit)
      //   - paid booking before/after session → "awaiting" if upcoming, "absent" once session is over
      //   - walk-in (shouldn't hit this branch since walk-ins are derived from attendance rows)
      if (source === "cohort") return "present";
      if (source === "booking") return sessionStarted ? "absent" : "awaiting";
      return "awaiting";
    };

    if (isCohortSession) {
      for (const e of cohortRoster) {
        const att = attendanceByMember.get(e.member_id);
        byMember.set(e.member_id, {
          member_id: e.member_id,
          name: memberLookup.get(e.member_id)?.name || e.member_name || "(unknown)",
          email: memberLookup.get(e.member_id)?.email || e.member_email || "",
          source: "cohort",
          attendance: att,
          ride_info: att?.ride_info,
          effectiveStatus: computeEffective("cohort", att),
        });
      }
    }

    for (const b of confirmedBookings) {
      if (byMember.has(b.member_id)) continue;
      const att = attendanceByMember.get(b.member_id);
      byMember.set(b.member_id, {
        member_id: b.member_id,
        name: memberLookup.get(b.member_id)?.name || "(unknown)",
        email: memberLookup.get(b.member_id)?.email || "",
        source: "booking",
        attendance: att,
        booking: b,
        ride_info: att?.ride_info,
        effectiveStatus: computeEffective("booking", att),
      });
    }

    for (const a of walkIns) {
      if (byMember.has(a.member_id)) continue;
      byMember.set(a.member_id, {
        member_id: a.member_id,
        name: a.member_name || memberLookup.get(a.member_id)?.name || "(unknown)",
        email: a.member_email || memberLookup.get(a.member_id)?.email || "",
        source: "walkin",
        attendance: a,
        ride_info: a.ride_info,
        effectiveStatus: computeEffective("walkin", a),
      });
    }

    return Array.from(byMember.values()).sort((x, y) => x.name.localeCompare(y.name));
  }, [
    isCohortSession,
    cohortRoster,
    confirmedBookings,
    walkIns,
    attendanceByMember,
    memberLookup,
    sessionStarted,
  ]);

  // Count drafts whose target status differs from the current effective status
  // — these are the rows that will produce coach-mark entries on save.
  const pendingChangeCount = useMemo(() => {
    let n = 0;
    for (const r of roster) {
      const d = drafts.get(r.member_id);
      if (d && d !== r.effectiveStatus) n++;
    }
    return n;
  }, [roster, drafts]);

  const handleDraftStatus = (memberId: string, status: DraftStatus) => {
    setMarkSuccess(null);
    setDrafts((prev) => {
      const next = new Map(prev);
      next.set(memberId, status);
      return next;
    });
  };

  const handleSaveRoster = async () => {
    if (!selectedSessionId) return;
    // Build entries from drafts whose target differs from current effective.
    const entries: CoachMarkEntry[] = [];
    for (const r of roster) {
      const target = drafts.get(r.member_id);
      if (!target || target === r.effectiveStatus) continue;
      entries.push({
        member_id: r.member_id,
        status: target,
        notes: null,
      });
    }
    if (entries.length === 0) {
      setMarkSuccess("No changes to save.");
      return;
    }
    setSubmittingMark(true);
    setError(null);
    setMarkSuccess(null);
    try {
      await apiPost(
        `/api/v1/attendance/sessions/${selectedSessionId}/coach-mark`,
        { entries },
        { auth: true }
      );
      const refreshed = await apiGet<Attendance[]>(
        `/api/v1/attendance/sessions/${selectedSessionId}/attendance`,
        { auth: true }
      );
      setAttendanceList(refreshed);
      setDrafts(new Map());
      setMarkSuccess(`Saved ${entries.length} change${entries.length === 1 ? "" : "s"}.`);
    } catch (err: any) {
      console.error("Failed to save attendance", err);
      setError(`Failed to save: ${err.message || "Unknown error"}`);
    } finally {
      setSubmittingMark(false);
    }
  };

  // One-click bulk mark for non-cohort sessions: every confirmed booking
  // without a PRESENT/LATE row gets a PRESENT AttendanceRecord. Replaces
  // the "click each booking" workflow when a coach just wants to confirm
  // the whole expected list arrived (the typical case for small community
  // sessions). The admin can still mark no-shows individually afterwards.
  const handleBulkMarkPresent = async () => {
    if (!selectedSessionId) return;
    if (unmatchedBookings.length === 0) return;
    setSubmittingMark(true);
    setError(null);
    setMarkSuccess(null);
    try {
      const entries: CoachMarkEntry[] = unmatchedBookings.map((b) => ({
        member_id: b.member_id,
        status: "present",
        notes: null,
      }));
      await apiPost(
        `/api/v1/attendance/sessions/${selectedSessionId}/coach-mark`,
        { entries },
        { auth: true }
      );
      setMarkSuccess(
        `Marked ${entries.length} booking${entries.length === 1 ? "" : "s"} as present.`
      );
      // Refresh the attendance list so the new rows show up.
      const refreshed = await apiGet<Attendance[]>(
        `/api/v1/attendance/sessions/${selectedSessionId}/attendance`,
        { auth: true }
      );
      setAttendanceList(refreshed);
    } catch (err: any) {
      console.error("Failed to bulk-mark attendance", err);
      setError(`Failed to bulk-mark: ${err.message || "Unknown error"}`);
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:hidden">
            <ReconciliationStat label="Confirmed bookings" value={confirmedBookings.length} />
            <ReconciliationStat
              label={isCohortSession ? "Recorded exceptions" : "Checked in"}
              value={attendanceList.length}
            />
            <ReconciliationStat
              label={sessionStarted ? "No-shows" : "Pending arrivals"}
              value={unmatchedBookings.length}
              tone={unmatchedBookings.length === 0 ? "ok" : sessionStarted ? "warn" : "neutral"}
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

        {!loadingAttendance && selectedSessionId ? (
          <UnifiedRoster
            roster={roster}
            drafts={drafts}
            isCohortSession={isCohortSession}
            sessionStarted={sessionStarted}
            unmatchedBookingCount={unmatchedBookings.length}
            onDraftStatus={handleDraftStatus}
            onBulkMarkPresent={handleBulkMarkPresent}
            onSaveRoster={handleSaveRoster}
            submitting={submittingMark}
            successMessage={markSuccess}
            pendingChangeCount={pendingChangeCount}
          />
        ) : null}

        {loadingAttendance && <LoadingPage text="Loading attendance..." />}
      </div>
    </div>
  );
}

// =========================================================================
// UnifiedRoster — single merged view of cohort enrollees + paid bookings +
// walk-ins. Replaces the previous Expected / Attendance / Mark exceptions
// tabs. One status dropdown per row; batched save at the bottom.
// =========================================================================

function UnifiedRoster({
  roster,
  drafts,
  isCohortSession,
  sessionStarted,
  unmatchedBookingCount,
  onDraftStatus,
  onBulkMarkPresent,
  onSaveRoster,
  submitting,
  successMessage,
  pendingChangeCount,
}: {
  roster: RosterRow[];
  drafts: Map<string, DraftStatus>;
  isCohortSession: boolean;
  sessionStarted: boolean;
  unmatchedBookingCount: number;
  onDraftStatus: (memberId: string, status: DraftStatus) => void;
  onBulkMarkPresent: () => void;
  onSaveRoster: () => void;
  submitting: boolean;
  successMessage: string | null;
  pendingChangeCount: number;
}) {
  if (roster.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
        {isCohortSession
          ? "No members are enrolled in this cohort yet."
          : sessionStarted
            ? "No bookings or walk-ins recorded for this session."
            : "No bookings yet — paid attendees will appear here."}
      </div>
    );
  }

  return (
    <div className="space-y-3 print:space-y-1">
      {!isCohortSession && unmatchedBookingCount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 print:hidden">
          <p className="text-sm text-slate-700">
            {unmatchedBookingCount} booked attendee
            {unmatchedBookingCount === 1 ? "" : "s"} not yet marked present.
          </p>
          <Button size="sm" onClick={onBulkMarkPresent} disabled={submitting}>
            {submitting ? "Marking…" : `Mark all ${unmatchedBookingCount} as present`}
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm print:border-0 print:shadow-none">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50 print:bg-white">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Source
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 print:hidden">
                Set
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Ride
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {roster.map((row) => (
              <RosterTableRow
                key={row.member_id}
                row={row}
                draft={drafts.get(row.member_id)}
                onDraftStatus={onDraftStatus}
                disabled={submitting}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="text-sm text-slate-600">
          {successMessage ? (
            <span className="text-emerald-700">{successMessage}</span>
          ) : pendingChangeCount > 0 ? (
            <span>
              {pendingChangeCount} unsaved change
              {pendingChangeCount === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
        <Button onClick={onSaveRoster} disabled={submitting || pendingChangeCount === 0}>
          {submitting ? "Saving…" : "Save attendance"}
        </Button>
      </div>
    </div>
  );
}

function RosterTableRow({
  row,
  draft,
  onDraftStatus,
  disabled,
}: {
  row: RosterRow;
  draft: DraftStatus | undefined;
  onDraftStatus: (memberId: string, status: DraftStatus) => void;
  disabled: boolean;
}) {
  // What the row will be saved as if no draft is set — used as the value of
  // the dropdown so the displayed select reflects the current effective state.
  const effectiveForSelect: DraftStatus =
    row.effectiveStatus === "awaiting"
      ? "absent"
      : row.effectiveStatus === "cancelled"
        ? "absent"
        : (row.effectiveStatus as DraftStatus);

  const selectedValue: DraftStatus = draft ?? effectiveForSelect;
  const hasDraft = draft !== undefined && draft !== row.effectiveStatus;

  const sourceBadge = (() => {
    if (row.source === "cohort") {
      return { label: "Cohort", cls: "bg-purple-100 text-purple-800" };
    }
    if (row.source === "booking") {
      return { label: "Booking", cls: "bg-cyan-100 text-cyan-800" };
    }
    return { label: "Walk-in", cls: "bg-violet-100 text-violet-800" };
  })();

  const statusLabel = (() => {
    if (row.effectiveStatus === "awaiting") {
      return sessionStartedLabel(row);
    }
    return row.effectiveStatus.charAt(0).toUpperCase() + row.effectiveStatus.slice(1);
  })();

  return (
    <tr className={`hover:bg-slate-50 ${hasDraft ? "bg-amber-50/50" : ""}`}>
      <td className="px-4 py-3">
        <div className="text-sm font-medium text-slate-900">{row.name}</div>
        {row.email && <div className="text-xs text-slate-500">{row.email}</div>}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${sourceBadge.cls}`}
        >
          {sourceBadge.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(
            row.effectiveStatus === "awaiting" ? "absent" : row.effectiveStatus
          )}`}
        >
          {statusLabel}
        </span>
      </td>
      <td className="px-4 py-3 print:hidden">
        <select
          value={selectedValue}
          disabled={disabled}
          onChange={(e) => onDraftStatus(row.member_id, e.target.value as DraftStatus)}
          className="rounded-md border border-slate-200 px-2 py-1 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        >
          <option value="present">Present</option>
          <option value="late">Late</option>
          <option value="excused">Excused</option>
          <option value="absent">Absent</option>
        </select>
      </td>
      <td className="px-4 py-3">
        {row.ride_info ? (
          <div className="text-xs text-slate-700">
            <div className="font-medium">{row.ride_info.pickup_location}</div>
            {(row.ride_info.area_name || row.ride_info.ride_number) && (
              <div className="text-slate-500">
                {[
                  row.ride_info.area_name,
                  row.ride_info.ride_number ? `Ride #${row.ride_info.ride_number}` : null,
                ]
                  .filter(Boolean)
                  .join(" • ")}
              </div>
            )}
          </div>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">{row.attendance?.notes || "—"}</td>
    </tr>
  );
}

// Show "Awaiting" pre-session and "No-show" post-session for paid bookings
// without an attendance row.
function sessionStartedLabel(row: RosterRow): string {
  if (row.effectiveStatus !== "awaiting") {
    return row.effectiveStatus;
  }
  return "Awaiting";
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
