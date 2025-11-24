"use client";

import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { format } from "date-fns";

type Session = {
    id: string;
    start_time: string;
    location_name: string;
};

type Attendance = {
    id: string;
    member_name: string;
    member_email: string;
    ride_share_option: string;
    payment_status: string;
    ride_notes: string;
    total_fee: number;
};

export default function AdminAttendancePage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [loadingAttendance, setLoadingAttendance] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedSessionId, setSelectedSessionId] = useState("");

    useEffect(() => {
        async function fetchSessions() {
            try {
                const data = await apiGet<Session[]>("/api/v1/sessions/");
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
            try {
                const data = await apiGet<Attendance[]>(`/api/v1/sessions/${selectedSessionId}/attendance`);
                setAttendanceList(data);
            } catch (err) {
                console.error("Failed to fetch attendance", err);
                setError("Failed to load attendance list.");
            } finally {
                setLoadingAttendance(false);
            }
        }
        fetchAttendance();
    }, [selectedSessionId]);

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = () => {
        if (!selectedSessionId) return;
        // Direct link to the CSV endpoint
        window.location.href = `${process.env.NEXT_PUBLIC_API_BASE_URL}/sessions/${selectedSessionId}/pool-list`;
    };

    if (loadingSessions) {
        return <div className="p-8 text-center">Loading sessions...</div>;
    }

    return (
        <div className="mx-auto max-w-5xl space-y-8 p-8">
            <div className="flex items-center justify-between print:hidden">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Attendance Report</h1>
                    <p className="text-slate-600">View and manage session attendance.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={handlePrint}>
                        Print List
                    </Button>
                    <Button onClick={handleDownload}>Download CSV</Button>
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
                                {format(new Date(s.start_time), "MMM d, yyyy h:mm a")} - {s.location_name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Print-only header */}
                <div className="hidden print:block">
                    <h2 className="text-xl font-bold">Attendance List</h2>
                    {selectedSessionId && sessions.find(s => s.id === selectedSessionId) && (
                        <p className="text-sm text-slate-600">
                            {format(new Date(sessions.find(s => s.id === selectedSessionId)!.start_time), "MMMM d, yyyy h:mm a")} - {sessions.find(s => s.id === selectedSessionId)!.location_name}
                        </p>
                    )}
                </div>

                {loadingAttendance ? (
                    <div className="py-8 text-center text-slate-500">Loading attendance...</div>
                ) : attendanceList.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 py-12 text-center text-slate-500">
                        No attendees found for this session.
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm print:border-0 print:shadow-none">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50 print:bg-white">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                        Name
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                        Ride Share
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                        Payment
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                        Notes
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {attendanceList.map((attendance) => (
                                    <tr key={attendance.id}>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="text-sm font-medium text-slate-900">{attendance.member_name}</div>
                                            <div className="text-sm text-slate-500">{attendance.member_email}</div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <span className="inline-flex rounded-full bg-slate-100 px-2 text-xs font-semibold leading-5 text-slate-800">
                                                {attendance.ride_share_option === "none" ? "None" :
                                                    attendance.ride_share_option === "lead" ? "Lead" : "Join"}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="text-sm text-slate-900">₦{attendance.total_fee.toLocaleString()}</div>
                                            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${attendance.payment_status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                                                }`}>
                                                {attendance.payment_status}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                                            {attendance.ride_notes || "--"}
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
