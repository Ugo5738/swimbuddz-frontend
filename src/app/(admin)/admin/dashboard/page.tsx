import { Card } from "@/components/ui/Card";

const mockStats = {
  members: 180,
  activeMembers: 142,
  upcomingSessions: [
    { id: "yaba-0713", title: "Club Session – Yaba", date: "Sat, 13 Jul", signIns: 42 },
    { id: "ikoyi-meetup", title: "Meetup – Ikoyi Night Swim", date: "Wed, 10 Jul", signIns: 28 }
  ],
  recentAnnouncements: [
    { id: "1", title: "Yaba rain update", date: "Jun 14" },
    { id: "2", title: "Academy trials open", date: "Jun 10" }
  ]
};

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">Admin</p>
        <h1 className="text-4xl font-bold text-slate-900">Dashboard overview</h1>
        <p className="text-sm text-slate-600">Replace these mocks with backend data once available.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Total members</p>
          <p className="text-2xl font-semibold text-slate-900">{mockStats.members}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Active members</p>
          <p className="text-2xl font-semibold text-slate-900">{mockStats.activeMembers}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Upcoming sessions</p>
          <p className="text-2xl font-semibold text-slate-900">{mockStats.upcomingSessions.length}</p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Upcoming Sessions</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            {mockStats.upcomingSessions.map((session) => (
              <li key={session.id} className="flex justify-between">
                <span>{session.title}</span>
                <span>
                  {session.date} · {session.signIns} sign-ins
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Recent Announcements</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            {mockStats.recentAnnouncements.map((announcement) => (
              <li key={announcement.id} className="flex justify-between">
                <span>{announcement.title}</span>
                <span>{announcement.date}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
