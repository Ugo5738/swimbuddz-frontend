"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { Textarea } from "@/components/ui/Textarea";
import { apiGet, apiPost } from "@/lib/api";
import {
  calculateProgressPercentage,
  getCohort,
  getCohortStudents,
  getProgramMilestones,
  type Cohort,
  type Enrollment,
  type Milestone,
} from "@/lib/coach";
import { formatDate } from "@/lib/format";
import {
  Calendar,
  CheckCircle,
  Mail,
  MapPin,
  Send,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface AttendanceSummary {
  cohort_id: string;
  total_sessions: number;
  students: {
    member_id: string;
    member_name: string;
    member_email: string;
    sessions_attended: number;
    sessions_total: number;
    attendance_rate: number;
  }[];
}

export default function CoachCohortDetailPage() {
  const params = useParams();
  const cohortId = params.id as string;

  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [students, setStudents] = useState<Enrollment[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [attendanceSummary, setAttendanceSummary] =
    useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Messaging state
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSuccess, setMessageSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const cohortData = await getCohort(cohortId);
        setCohort(cohortData);

        // Load students, milestones, and attendance in parallel
        const [studentsData, milestonesData, attendanceData] =
          await Promise.all([
            getCohortStudents(cohortId).catch(() => []),
            cohortData.program_id
              ? getProgramMilestones(cohortData.program_id).catch(() => [])
              : Promise.resolve([]),
            apiGet<AttendanceSummary>(
              `/api/v1/attendance/cohorts/${cohortId}/attendance/summary`,
              { auth: true },
            ).catch(() => null),
          ]);

        setStudents(studentsData);
        setMilestones(milestonesData);
        setAttendanceSummary(attendanceData);
      } catch (err) {
        console.error("Failed to load cohort", err);
        setError("Failed to load cohort details. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [cohortId]);

  const handleSendMessage = async () => {
    if (!messageSubject.trim() || !messageBody.trim()) return;

    setSendingMessage(true);
    setMessageSuccess(null);

    try {
      const result = await apiPost<{ message: string }>(
        `/api/v1/messages/cohorts/${cohortId}`,
        { subject: messageSubject, body: messageBody },
        { auth: true },
      );

      setMessageSuccess(result.message || "Message sent successfully!");
      setMessageSubject("");
      setMessageBody("");
      setTimeout(() => {
        setShowMessageModal(false);
        setMessageSuccess(null);
      }, 2000);
    } catch (err) {
      console.error("Failed to send message", err);
      setMessageSuccess("Failed to send message. Please try again.");
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return <LoadingCard text="Loading cohort details..." />;
  }

  if (error || !cohort) {
    return (
      <Alert variant="error" title="Error">
        {error || "Cohort not found"}
      </Alert>
    );
  }

  const statusVariant =
    cohort.status === "active"
      ? "success"
      : cohort.status === "open"
        ? "info"
        : cohort.status === "completed"
          ? "default"
          : "warning";

  const enrolledStudents = students.filter(
    (s) => s.status === "enrolled" || s.status === "completed",
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <Link
          href="/coach/cohorts"
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Back to cohorts
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-2">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900">
                {cohort.name || "Unnamed Cohort"}
              </h1>
              <Badge variant={statusVariant}>
                {cohort.status.toUpperCase()}
              </Badge>
            </div>
            {cohort.program && (
              <p className="text-emerald-700 font-medium mt-1">
                {cohort.program.name}
              </p>
            )}
          </div>
          <Button
            onClick={() => setShowMessageModal(true)}
            className="flex items-center gap-2"
          >
            <Mail className="h-4 w-4" />
            Message Students
          </Button>
        </div>
      </header>

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Message All Students
            </h2>
            <div className="space-y-4">
              <Input
                label="Subject"
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                placeholder="e.g., Important: Session time change"
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Message
                </label>
                <Textarea
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Write your message to all students in this cohort..."
                  rows={5}
                />
              </div>

              {messageSuccess && (
                <Alert
                  variant={
                    messageSuccess.includes("Failed") ? "error" : "success"
                  }
                >
                  {messageSuccess}
                </Alert>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowMessageModal(false);
                    setMessageSubject("");
                    setMessageBody("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={
                    sendingMessage ||
                    !messageSubject.trim() ||
                    !messageBody.trim()
                  }
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {sendingMessage ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Cohort Info */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-100">
            <Calendar className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Duration</p>
            <p className="font-medium text-slate-900">
              {formatDate(cohort.start_date)} - {formatDate(cohort.end_date)}
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100">
            <MapPin className="h-5 w-5 text-blue-700" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Location</p>
            <p className="font-medium text-slate-900">
              {cohort.location_name || "Not specified"}
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100">
            <Users className="h-5 w-5 text-amber-700" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Enrollment</p>
            <p className="font-medium text-slate-900">
              {enrolledStudents.length} / {cohort.capacity} students
            </p>
          </div>
        </Card>
      </div>

      {/* Students List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Students</h2>
            <p className="text-sm text-slate-600">
              {enrolledStudents.length} enrolled student
              {enrolledStudents.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {enrolledStudents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
            <Users className="h-12 w-12 mx-auto text-slate-400 mb-3" />
            <p className="text-slate-600 font-medium">
              No students enrolled yet
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Students will appear here once they enroll in this cohort.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                    Student
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                    Progress
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                    Enrolled
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {enrolledStudents.map((enrollment) => (
                  <StudentRow
                    key={enrollment.id}
                    enrollment={enrollment}
                    totalMilestones={milestones.length}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Attendance Summary */}
      {attendanceSummary && attendanceSummary.total_sessions > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Attendance
              </h2>
              <p className="text-sm text-slate-600">
                {attendanceSummary.total_sessions} session
                {attendanceSummary.total_sessions !== 1 ? "s" : ""} held
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                    Student
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                    Attended
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                    Rate
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {attendanceSummary.students.map((student) => {
                  const ratePercent = Math.round(student.attendance_rate * 100);
                  const isAtRisk = ratePercent < 70;
                  const isGood = ratePercent >= 80;

                  return (
                    <tr
                      key={student.member_id}
                      className="border-b border-slate-100"
                    >
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-900">
                          {student.member_name}
                        </p>
                        <p className="text-sm text-slate-500">
                          {student.member_email}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {student.sessions_attended} / {student.sessions_total}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden max-w-[80px]">
                            <div
                              className={`h-full rounded-full ${
                                isAtRisk
                                  ? "bg-red-500"
                                  : isGood
                                    ? "bg-emerald-500"
                                    : "bg-amber-500"
                              }`}
                              style={{ width: `${ratePercent}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">
                            {ratePercent}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {isAtRisk ? (
                          <span className="inline-flex items-center gap-1 text-sm text-red-600">
                            <XCircle className="h-4 w-4" />
                            At Risk
                          </span>
                        ) : isGood ? (
                          <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                            <CheckCircle className="h-4 w-4" />
                            Good
                          </span>
                        ) : (
                          <span className="text-sm text-amber-600">
                            Needs Attention
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Program Milestones */}
      {milestones.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Program Milestones
          </h2>
          <div className="space-y-3">
            {milestones.map((milestone, index) => (
              <div
                key={milestone.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-slate-50"
              >
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium text-slate-900">{milestone.name}</p>
                  {milestone.criteria && (
                    <p className="text-sm text-slate-600 mt-1">
                      {milestone.criteria}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function StudentRow({
  enrollment,
  totalMilestones,
}: {
  enrollment: Enrollment;
  totalMilestones: number;
}) {
  const progress = enrollment.progress || [];
  const progressPercent = calculateProgressPercentage(
    progress,
    totalMilestones,
  );
  const achievedCount = progress.filter((p) => p.status === "achieved").length;

  const statusVariant =
    enrollment.status === "enrolled"
      ? "info"
      : enrollment.status === "completed"
        ? "success"
        : "default";

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="py-3 px-4">
        <div>
          <p className="font-medium text-slate-900">
            {enrollment.member_name ||
              `Student ${enrollment.member_id.slice(0, 8)}`}
          </p>
          {enrollment.member_email && (
            <p className="text-sm text-slate-500">{enrollment.member_email}</p>
          )}
        </div>
      </td>
      <td className="py-3 px-4">
        <Badge variant={statusVariant}>{enrollment.status}</Badge>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden max-w-[100px]">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-sm text-slate-600">
            {achievedCount}/{totalMilestones}
          </span>
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-slate-600">
        {formatDate(enrollment.created_at)}
      </td>
      <td className="py-3 px-4 text-right">
        <Link href={`/coach/students/${enrollment.id}`}>
          <Button size="sm" variant="outline">
            View Progress
          </Button>
        </Link>
      </td>
    </tr>
  );
}
