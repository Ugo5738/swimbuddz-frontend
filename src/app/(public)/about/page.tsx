import { Card } from "@/components/ui/Card";

const values = [
  { title: "Respect & Safety", detail: "Pool etiquette and safety come first in every SwimBuddz space." },
  { title: "Inclusiveness & Fun", detail: "All levels welcome. We mix learning with playlists and laughter." },
  { title: "Progress & Accountability", detail: "Every session has a purpose, and the community keeps you going." }
];

export default function AboutPage() {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">Our story</p>
        <h1 className="text-4xl font-bold text-slate-900">SwimBuddz is built by swimmers for swimmers.</h1>
        <p className="text-lg text-slate-600">
          What started as a handful of friends sharing lane times has grown into a connected community spanning club members, academy trainees, and adventure swimmers across Lagos.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Card className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-600">Mission</p>
          <p className="text-xl font-semibold text-slate-900">Unlock swim confidence for thousands of Lagosians.</p>
          <p className="text-base text-slate-600">
            We give members a predictable rhythm: structured sessions, safe pools, and coaches who genuinely track progress.
          </p>
        </Card>
        <Card className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-600">Goals</p>
          <ul className="list-disc space-y-2 pl-5 text-base text-slate-600">
            <li>Make every session easy to join and harder to miss.</li>
            <li>Surface clear pathways from beginner to elite squads.</li>
            <li>Document flows so admins and AI assistants can keep things moving.</li>
          </ul>
        </Card>
      </section>

      <section className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">Values</p>
          <h2 className="text-2xl font-semibold text-slate-900">The SwimBuddz baseline</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {values.map((value) => (
            <Card key={value.title} className="space-y-2">
              <p className="text-sm font-semibold text-cyan-700">{value.title}</p>
              <p className="text-sm text-slate-600">{value.detail}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
