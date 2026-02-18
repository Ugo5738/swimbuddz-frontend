"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { apiGet } from "@/lib/api";
import { format } from "date-fns";
import type { jsPDF as JsPDFType } from "jspdf";
import { useEffect, useState } from "react";

type Session = {
  id: string;
  starts_at: string;
  location: string | null;
  location_name: string | null;
};

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

export default function AdminAttendancePage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedSessionId, setSelectedSessionId] = useState("");

  useEffect(() => {
    async function fetchSessions() {
      try {
        const data = await apiGet<Session[]>("/api/v1/sessions/", {
          auth: true,
        });
        setSessions(data);
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

    async function fetchAttendance() {
      setLoadingAttendance(true);
      setError(null); // Clear previous errors
      try {
        const [attendanceData, bookingsData, rideConfigs] = await Promise.all([
          apiGet<Attendance[]>(
            `/api/v1/attendance/sessions/${selectedSessionId}/attendance`,
            { auth: true },
          ),
          apiGet<RideBooking[]>(
            `/api/v1/transport/sessions/${selectedSessionId}/bookings`,
            { auth: true },
          ).catch((err) => {
            console.warn("Failed to fetch ride bookings", err);
            return [];
          }), // Fail gracefully if transport service is down or no bookings
          apiGet<RideConfig[]>(
            `/api/v1/transport/sessions/${selectedSessionId}/ride-configs`,
            { auth: true },
          ).catch((err) => {
            console.warn("Failed to fetch ride configs", err);
            return [];
          }),
        ]);

        // Build lookup maps
        const normalizeId = (id?: string | null) =>
          id ? id.toString().trim().toLowerCase() : "";
        const bookingsMap = new Map(
          bookingsData
            .map(
              (b) =>
                [
                  normalizeId((b as any).member_id ?? (b as any).memberId),
                  b,
                ] as const,
            )
            .filter(([key]) => Boolean(key)),
        );
        const pickupLocationsMap = new Map<
          string,
          { name: string; area_name: string }
        >();
        rideConfigs.forEach((config) => {
          config.pickup_locations.forEach((loc) => {
            pickupLocationsMap.set(loc.id, {
              name: loc.name,
              area_name: config.ride_area_name,
            });
          });
        });

        const mergedAttendance = attendanceData.map((record) => {
          const recordMemberId = normalizeId(
            (record as any).member_id ?? (record as any).memberId,
          );
          const booking = recordMemberId
            ? bookingsMap.get(recordMemberId)
            : undefined;

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
          } else if (
            !rideInfo &&
            (record.needs_ride || record.ride_share_option === "join")
          ) {
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
      } catch (err: any) {
        console.error("Failed to fetch attendance", err);
        setError(
          `Failed to load attendance list: ${err.message || "Unknown error"}`,
        );
      } finally {
        setLoadingAttendance(false);
      }
    }
    fetchAttendance();
  }, [selectedSessionId]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!selectedSessionId || attendanceList.length === 0) return;

    setError(null);
    setDownloading(true);
    try {
      const selectedSession = sessions.find((s) => s.id === selectedSessionId);
      const startDate = selectedSession?.starts_at
        ? new Date(selectedSession.starts_at)
        : null;
      const dateLabel =
        startDate && !isNaN(startDate.getTime())
          ? format(startDate, "yyyy-MM-dd")
          : "session";

      const headers = ["Name", "Ride Info", "Notes"];
      const rows = attendanceList.map((item) => {
        const rideLine = item.ride_info
          ? [
              item.ride_info.pickup_location,
              [
                item.ride_info.area_name,
                item.ride_info.ride_number
                  ? `Ride #${item.ride_info.ride_number}`
                  : null,
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
      const startDate = selectedSession?.starts_at
        ? new Date(selectedSession.starts_at)
        : null;
      const dateLabel =
        startDate && !isNaN(startDate.getTime())
          ? format(startDate, "PPPp")
          : "Session";
      const locationLabel =
        selectedSession?.location_name || selectedSession?.location || "";

      doc.setFontSize(14);
      doc.text("Attendance Report", 14, 16);
      doc.setFontSize(10);
      doc.text(
        `${dateLabel}${locationLabel ? ` - ${locationLabel}` : ""}`,
        14,
        22,
      );

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
                    item.ride_info.ride_number
                      ? `Ride #${item.ride_info.ride_number}`
                      : null,
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
          (col) =>
            doc.splitTextToSize(
              col.getText(item) || "",
              col.width - 4,
            ) as string[],
        );
        const maxLines = Math.max(
          ...wrappedTexts.map((lines) => lines.length || 1),
        );
        const rowHeight = maxLines * lineHeight;

        wrappedTexts.forEach((lines: string[], idx) => {
          const x = colPositions[idx];
          lines.forEach((line: string, lineIdx: number) => {
            doc.text(line, x, y + lineIdx * lineHeight);
          });
        });

        y += rowHeight + 2;
        doc.line(
          14,
          y - 2,
          14 + columns.reduce((sum, col) => sum + col.width, 0),
          y - 2,
        );
      };

      attendanceList.forEach(drawRow);

      const fileDate =
        startDate && !isNaN(startDate.getTime())
          ? format(startDate, "yyyy-MM-dd")
          : "session";
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
          <h1 className="text-2xl font-bold text-slate-900">
            Attendance Report
          </h1>
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
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Select Session
          </label>
          <select
            className="w-full max-w-md rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
          >
            {sessions.map((s) => {
              const startDate = s.starts_at ? new Date(s.starts_at) : null;
              const dateLabel =
                startDate && !isNaN(startDate.getTime())
                  ? format(startDate, "MMM d, yyyy h:mm a")
                  : "Date TBD";
              return (
                <option key={s.id} value={s.id}>
                  {dateLabel} -{" "}
                  {s.location_name || s.location || "Location TBD"}
                </option>
              );
            })}
          </select>
        </div>

        {/* Print-only header */}
        <div className="hidden print:block">
          <h2 className="text-xl font-bold">Attendance List</h2>
          {selectedSessionId &&
            (() => {
              const selectedSession = sessions.find(
                (s) => s.id === selectedSessionId,
              );
              if (!selectedSession) return null;
              const startDate = selectedSession.starts_at
                ? new Date(selectedSession.starts_at)
                : null;
              const dateLabel =
                startDate && !isNaN(startDate.getTime())
                  ? format(startDate, "MMMM d, yyyy h:mm a")
                  : "Date TBD";
              return (
                <p className="text-sm text-slate-600">
                  {dateLabel} -{" "}
                  {selectedSession.location_name ||
                    selectedSession.location ||
                    "Location TBD"}
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
                      <div className="text-sm text-slate-500">
                        {attendance.member_email}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex rounded-full bg-slate-100 px-2 text-xs font-semibold leading-5 text-slate-800">
                        {attendance.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {attendance.ride_info ? (
                        <div className="text-sm text-slate-700">
                          <div className="font-medium">
                            {attendance.ride_info.pickup_location}
                          </div>
                          {(attendance.ride_info.area_name ||
                            attendance.ride_info.ride_number) && (
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
      </div>
    </div>
  );
}
