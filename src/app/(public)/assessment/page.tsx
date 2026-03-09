import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DIMENSION_INFO } from "@/lib/assessment";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Can You Swim? | SwimBuddz Swim Assessment",
  description:
    "Take our free 2-minute swim readiness assessment. Discover your swim level, get personalized recommendations, and find out where to improve.",
  openGraph: {
    title: "Can You Swim? | SwimBuddz Swim Assessment",
    description:
      "Take our free 2-minute swim readiness assessment. Discover your swim level and get personalized recommendations.",
    type: "website",
    siteName: "SwimBuddz",
  },
  twitter: {
    card: "summary_large_image",
    title: "Can You Swim? | SwimBuddz Swim Assessment",
    description:
      "Take our free 2-minute swim readiness assessment. Discover your swim level and get personalized recommendations.",
  },
};

const dimensions = Object.values(DIMENSION_INFO);

export default function AssessmentLandingPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {/* Hero */}
      <div className="mb-10 text-center">
        <span className="mb-3 inline-block text-6xl">🏊</span>
        <h1 className="mb-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Can You Swim?
        </h1>
        <p className="mx-auto mb-6 max-w-md text-lg text-slate-600">
          Take our free 2-minute assessment to discover your swim level and get personalized
          recommendations.
        </p>
        <Link href="/assessment/quiz">
          <Button variant="primary" size="lg" className="px-8 text-base">
            Start Assessment
          </Button>
        </Link>
        <p className="mt-3 text-sm text-slate-400">12 questions &middot; No signup required</p>
      </div>

      {/* What we assess */}
      <Card className="mb-8">
        <h2 className="mb-4 text-center text-lg font-semibold text-slate-900">What We Assess</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {dimensions.map((dim) => (
            <div
              key={dim.id}
              className="flex flex-col items-center gap-1 rounded-lg bg-slate-50 p-3 text-center"
            >
              <span className="text-2xl">{dim.icon}</span>
              <span className="text-xs font-medium text-slate-600">{dim.shortLabel}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* How it works */}
      <div className="mb-8">
        <h2 className="mb-4 text-center text-lg font-semibold text-slate-900">How It Works</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              step: "1",
              title: "Answer 12 Questions",
              desc: "Honest self-assessment about your swimming skills and comfort level.",
            },
            {
              step: "2",
              title: "Get Your Score",
              desc: "Receive a score out of 100 with a detailed breakdown across 10 dimensions.",
            },
            {
              step: "3",
              title: "Get Recommendations",
              desc: "Personalized tips, drills, and next steps based on your results.",
            },
          ].map((item) => (
            <Card key={item.step} className="text-center">
              <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-sm font-bold text-cyan-700">
                {item.step}
              </div>
              <h3 className="mb-1 text-sm font-semibold text-slate-900">{item.title}</h3>
              <p className="text-xs text-slate-500">{item.desc}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="text-center">
        <Link href="/assessment/quiz">
          <Button variant="primary" size="lg" className="px-8 text-base">
            Start Assessment
          </Button>
        </Link>
      </div>
    </div>
  );
}
