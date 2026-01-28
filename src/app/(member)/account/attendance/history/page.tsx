import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";

const mockAttendance = {
  summary: "You’ve attended 7 sessions in the last 2 months.",
  sessions: [
    { id: "1", date: "2024-06-10", title: "Club – Yaba", type: "Club", status: "confirmed" },
    { id: "2", date: "2024-06-03", title: "Meetup – Landmark", type: "Meetup", status: "registered" },
    { id: "3", date: "2024-05-26", title: "Academy Trials", type: "Academy", status: "no_show" }
  ]
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

const statusMap: Record<string, { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }> = {
  confirmed: { label: "Confirmed", variant: "success" },
  registered: { label: "Registered", variant: "info" },
  no_show: { label: "No-show", variant: "warning" }
};

export default function AttendancePage() {
  // TODO: Replace mock with apiGet("/api/v1/members/me/attendance", { auth: true }).
  const data = mockAttendance;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">Attendance</p>
        <h1 className="text-4xl font-bold text-slate-900">Session history</h1>
        <p className="text-sm text-slate-600">Track past sessions, status, and upcoming confirmations.</p>
      </header>

      <Card>
        <p className="text-lg font-semibold text-slate-900">{data.summary}</p>
      </Card>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-3">
        {data.sessions.map((session) => {
          const status = statusMap[session.status] ?? statusMap.registered;
          return (
            <Card key={session.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{session.title}</p>
                  <p className="text-sm text-slate-600 mt-1">{formatDate(session.date)}</p>
                  <p className="text-sm text-slate-500">{session.type}</p>
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
            {data.sessions.map((session) => {
              const status = statusMap[session.status] ?? statusMap.registered;
              return (
                <TableRow key={session.id}>
                  <TableCell>{formatDate(session.date)}</TableCell>
                  <TableCell>{session.title}</TableCell>
                  <TableCell className="hidden md:table-cell">{session.type}</TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
