import { API_BASE_URL } from "@/lib/config";
import type { Metadata } from "next";
import ResultsContent from "./ResultsContent";

type Props = {
  searchParams: Promise<{ id?: string }>;
};

/** Fetch assessment result server-side for OG metadata. */
async function fetchResult(id: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/assessments/${id}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

const LEVEL_LABELS: Record<string, string> = {
  non_swimmer: "Non-Swimmer",
  beginner: "Beginner",
  developing: "Developing Swimmer",
  intermediate: "Intermediate Swimmer",
  advanced: "Advanced Swimmer",
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const id = params.id;

  let title = "My Swim Assessment Results | SwimBuddz";
  let description =
    "I just took the SwimBuddz swim readiness assessment. Take it yourself and find out your level!";

  if (id) {
    const result = await fetchResult(id);
    if (result) {
      const label = LEVEL_LABELS[result.level] ?? result.level;
      title = `I scored ${result.total_score}/100 — ${label} | SwimBuddz`;
      description = `I'm a ${label} according to the SwimBuddz swim assessment. Can you beat my score? Take the quiz!`;
    }
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "SwimBuddz",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function AssessmentResultsPage({ searchParams }: Props) {
  const params = await searchParams;
  return <ResultsContent assessmentId={params.id} />;
}
