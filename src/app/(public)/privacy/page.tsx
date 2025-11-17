import Link from "next/link";
import { Card } from "@/components/ui/Card";

const sections = [
  {
    title: "Data We Collect",
    details: [
      "Profile basics: name, email, phone, swimming level, emergency contact.",
      "Session activity: attendance history, ride-share selections, payments.",
      "Optional media consent and communication preferences."
    ]
  },
  {
    title: "How We Use It",
    details: [
      "To coordinate sessions, safety checks, payments, and announcements.",
      "To share aggregated insights with coaches and admins.",
      "To improve SwimBuddz flows (without selling personal data)."
    ]
  },
  {
    title: "Your Controls",
    details: [
      "Update profile data directly via member profile.",
      "Request exports or deletion through support.",
      "Limit communication channels (SMS, WhatsApp, email)."
    ]
  }
];

export default function PrivacyPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
          Privacy & trust
        </p>
        <h1 className="text-4xl font-bold text-slate-900">
          We collect only what SwimBuddz needs to keep members safe and informed.
        </h1>
        <p className="text-lg text-slate-600">
          This summary highlights how SwimBuddz handles personal information. Review the complete
          privacy policy for full details before onboarding.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        {sections.map((section) => (
          <Card key={section.title} className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
              {section.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </Card>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Need the full privacy policy?</p>
        <p className="text-sm text-slate-600">
          The full SwimBuddz privacy policy covers retention timelines, third-party processors, and
          contact channels for data subject requests.
        </p>
        <Link
          href="https://docs.google.com/document/d/placeholder-privacy"
          className="mt-3 inline-flex text-sm font-semibold text-cyan-700 hover:underline"
          target="_blank"
        >
          Read the latest Google Doc &rarr;
        </Link>
      </section>
    </div>
  );
}
