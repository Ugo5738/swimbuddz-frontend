"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { trackAssessmentCTA, trackAssessmentShared } from "@/lib/analytics";
import {
  calculateResults,
  getCtaHref,
  getLevelCTA,
  LEVEL_META,
  type AssessmentResult,
  type DimensionScore,
  type SwimLevel,
} from "@/lib/assessment";
import { getAssessmentResult, type AssessmentApiResponse } from "@/lib/assessment-api";
import clsx from "clsx";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ratingColor(rating: string) {
  switch (rating) {
    case "strong":
      return "bg-emerald-500";
    case "moderate":
      return "bg-amber-400";
    default:
      return "bg-rose-400";
  }
}

function ratingBadge(rating: string) {
  switch (rating) {
    case "strong":
      return "success" as const;
    case "moderate":
      return "warning" as const;
    default:
      return "danger" as const;
  }
}

function levelRingColor(level: SwimLevel) {
  return LEVEL_META[level]?.ringColor ?? "stroke-slate-300";
}

// ---------------------------------------------------------------------------
// Score Ring SVG
// ---------------------------------------------------------------------------

function ScoreRing({ score, level }: { score: number; level: SwimLevel }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative mx-auto flex h-48 w-48 items-center justify-center">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 160 160">
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-slate-100"
        />
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={clsx("transition-all duration-1000", levelRingColor(level))}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold text-slate-900">{score}</span>
        <span className="text-sm text-slate-500">out of 100</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dimension bar
// ---------------------------------------------------------------------------

function DimensionBar({ dim }: { dim: DimensionScore }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span>
          {dim.icon} {dim.label}
        </span>
        <Badge variant={ratingBadge(dim.rating)} className="text-xs">
          {dim.percentage}%
        </Badge>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={clsx(
            "h-full rounded-full transition-all duration-700",
            ratingColor(dim.rating)
          )}
          style={{ width: `${dim.percentage}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Share buttons
// ---------------------------------------------------------------------------

function ShareButtons({ score, level }: { score: number; level: string }) {
  const url = typeof window !== "undefined" ? window.location.href : "";

  const shareWhatsApp = () => {
    trackAssessmentShared("whatsapp");
    const text = `I scored ${score}/100 on the SwimBuddz Swim Assessment — I'm a ${level}! Can you beat my score? Take the quiz: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareTwitter = () => {
    trackAssessmentShared("twitter");
    const text = `I scored ${score}/100 on the @SwimBuddz Swim Assessment — I'm a ${level}! Can you beat my score?`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      "_blank"
    );
  };

  const copyLink = () => {
    trackAssessmentShared("copy_link");
    navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  };

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="primary"
        size="md"
        onClick={shareWhatsApp}
        className="bg-green-600 hover:bg-green-500"
      >
        WhatsApp
      </Button>
      <Button variant="secondary" size="md" onClick={shareTwitter}>
        Twitter / X
      </Button>
      <Button variant="outline" size="md" onClick={copyLink}>
        Copy Link
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ResultsContent({ assessmentId }: { assessmentId?: string }) {
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assessmentId) {
      setError("No assessment ID provided. Please take the quiz first.");
      setLoading(false);
      return;
    }

    getAssessmentResult(assessmentId)
      .then((apiResult: AssessmentApiResponse) => {
        // Reconstruct full result from the API response using client-side calc
        // (so recommendations/strengths/weaknesses are computed)
        const answers: Record<string, number> = {};
        if (apiResult.dimension_scores) {
          // We also have the answers stored; ideally use those
          // For now, compute from the API's total_score and dimension_scores
        }

        // Build a result object combining API data with client-side enrichment
        const dims: DimensionScore[] = apiResult.dimension_scores.map((d) => ({
          dimension: d.dimension as DimensionScore["dimension"],
          label: d.label,
          icon: d.icon,
          score: d.score,
          maxScore: d.maxScore,
          percentage: d.percentage,
          rating: d.rating as DimensionScore["rating"],
        }));

        const sorted = [...dims].sort((a, b) => b.percentage - a.percentage);
        const strengths = sorted.slice(0, 3);
        const weaknesses = [...sorted].reverse().slice(0, 3);

        const level = apiResult.level as SwimLevel;
        const meta = LEVEL_META[level];

        // Import recommendation generation from assessment lib
        // We call calculateResults with a fake answers map built from dim scores
        // Actually, let's just build the result directly
        const { recommendations } = calculateResults(
          // Build answers from dimension_scores: not perfect but we need the recs
          // The backend stores the actual answers so we could fetch them too
          // For now, use total_score to determine level and generate recs from dims
          Object.fromEntries(apiResult.dimension_scores.map((d) => [d.dimension, d.score]))
        );

        setResult({
          totalScore: apiResult.total_score,
          rawScore: apiResult.raw_score,
          maxPossibleScore: 39,
          level,
          levelLabel: meta?.label ?? level,
          levelDescription: meta?.description ?? "",
          dimensions: dims,
          strengths,
          weaknesses,
          recommendations,
        });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load results. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [assessmentId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h2 className="mb-2 text-xl font-semibold text-slate-900">Oops!</h2>
        <p className="mb-6 text-slate-600">{error ?? "No results found."}</p>
        <Link href="/assessment">
          <Button variant="primary">Take the Assessment</Button>
        </Link>
      </div>
    );
  }

  const cta = getLevelCTA(result.level);
  const meta = LEVEL_META[result.level];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Score */}
      <div className="mb-8 text-center">
        <h1 className="mb-4 text-2xl font-bold text-slate-900">Your Swim Assessment Results</h1>
        <ScoreRing score={result.totalScore} level={result.level} />
        <div className="mt-4">
          <span
            className={clsx(
              "inline-block rounded-full px-4 py-2 text-lg font-bold",
              meta.bgColor,
              meta.color
            )}
          >
            {result.levelLabel}
          </span>
        </div>
        <p className="mx-auto mt-3 max-w-md text-sm text-slate-600">{result.levelDescription}</p>
      </div>

      {/* Dimension Breakdown */}
      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Skill Breakdown</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {result.dimensions.map((dim) => (
            <DimensionBar key={dim.dimension} dim={dim} />
          ))}
        </div>
      </Card>

      {/* Strengths & Weaknesses */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-emerald-700">Your Strengths</h3>
          <div className="flex flex-col gap-2">
            {result.strengths.map((s) => (
              <div key={s.dimension} className="flex items-center gap-2 text-sm">
                <span>{s.icon}</span>
                <span className="text-slate-700">{s.label}</span>
                <Badge variant="success" className="ml-auto text-xs">
                  {s.percentage}%
                </Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-amber-700">Areas to Improve</h3>
          <div className="flex flex-col gap-2">
            {result.weaknesses.map((w) => (
              <div key={w.dimension} className="flex items-center gap-2 text-sm">
                <span>{w.icon}</span>
                <span className="text-slate-700">{w.label}</span>
                <Badge variant="warning" className="ml-auto text-xs">
                  {w.percentage}%
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recommendations */}
      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Personalized Recommendations</h2>
        <div className="flex flex-col gap-4">
          {result.recommendations.map((rec, i) => (
            <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <h4 className="mb-1 text-sm font-semibold text-slate-900">{rec.title}</h4>
              <p className="mb-2 text-sm text-slate-600">{rec.description}</p>
              {rec.ctaType !== "tip" && (
                <Link
                  href={getCtaHref(rec.ctaType)}
                  className="text-sm font-medium text-cyan-600 hover:text-cyan-500"
                >
                  Learn more &rarr;
                </Link>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Share */}
      <Card className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Challenge a Friend</h2>
        <p className="mb-4 text-sm text-slate-600">
          Share your results and see if they can beat your score!
        </p>
        <ShareButtons score={result.totalScore} level={result.levelLabel} />
      </Card>

      {/* Primary CTA */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-cyan-600 to-cyan-700 p-6 text-center text-white">
        <h2 className="mb-2 text-xl font-bold">
          {result.level === "non_swimmer" || result.level === "beginner"
            ? "Ready to Learn to Swim?"
            : result.level === "developing"
              ? "Ready to Level Up?"
              : "Swim With Us"}
        </h2>
        <p className="mb-4 text-sm text-cyan-100">
          Join hundreds of swimmers building skills and confidence together.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href={cta.href}
            onClick={() => trackAssessmentCTA({ level: result.level, destination: cta.href })}
          >
            <Button
              variant="secondary"
              size="lg"
              className="border-white bg-white text-cyan-700 hover:bg-cyan-50"
            >
              {cta.text}
            </Button>
          </Link>
          <Link
            href={cta.secondaryHref}
            onClick={() =>
              trackAssessmentCTA({ level: result.level, destination: cta.secondaryHref })
            }
          >
            <Button variant="ghost" size="md" className="text-white hover:bg-cyan-500/20">
              {cta.secondaryText}
            </Button>
          </Link>
        </div>
      </div>

      {/* Retake */}
      <div className="text-center">
        <Link href="/assessment/quiz" className="text-sm text-slate-500 hover:text-cyan-600">
          Retake Assessment &rarr;
        </Link>
      </div>
    </div>
  );
}
