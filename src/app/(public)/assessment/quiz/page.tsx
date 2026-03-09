"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ASSESSMENT_QUESTIONS } from "@/lib/assessment";
import { submitAssessment } from "@/lib/assessment-api";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

const TOTAL = ASSESSMENT_QUESTIONS.length;

export default function AssessmentQuizPage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = ASSESSMENT_QUESTIONS[current];
  const selectedScore = answers[question.id];
  const isAnswered = selectedScore !== undefined;
  const isLast = current === TOTAL - 1;

  // Handle option selection
  const handleSelect = useCallback(
    (score: number) => {
      setAnswers((prev) => ({ ...prev, [question.id]: score }));

      // Auto-advance after a short delay (unless it's the last question)
      if (!isLast) {
        setTimeout(() => {
          setCurrent((prev) => Math.min(prev + 1, TOTAL - 1));
        }, 400);
      }
    },
    [question.id, isLast]
  );

  const handleBack = useCallback(() => {
    setCurrent((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleNext = useCallback(() => {
    if (isLast) return;
    setCurrent((prev) => Math.min(prev + 1, TOTAL - 1));
  }, [isLast]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitAssessment(answers);
      router.push(`/assessment/results?id=${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }, [answers, router]);

  const progress = ((current + 1) / TOTAL) * 100;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      {/* Progress */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
          <span>
            Question {current + 1} of {TOTAL}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={current + 1}
          aria-valuemin={1}
          aria-valuemax={TOTAL}
        >
          <div
            className="h-full rounded-full bg-cyan-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <Card className="mb-6">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-cyan-600">
          {question.dimension.replace(/_/g, " ")}
        </p>
        <h2 className="mb-1 text-xl font-semibold text-slate-900">{question.question}</h2>
        {question.subtitle && <p className="mb-4 text-sm text-slate-500">{question.subtitle}</p>}

        {/* Options */}
        <div className="mt-4 flex flex-col gap-3">
          {question.options.map((opt, idx) => {
            const isSelected = selectedScore === opt.score;
            return (
              <button
                key={idx}
                onClick={() => handleSelect(opt.score)}
                aria-pressed={isSelected}
                className={clsx(
                  "flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition",
                  "min-h-[52px]",
                  isSelected
                    ? "border-cyan-600 bg-cyan-50 text-cyan-800"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <span className="text-xl leading-none">{opt.emoji}</span>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Error */}
      {error && <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="secondary" size="md" onClick={handleBack} disabled={current === 0}>
          Back
        </Button>

        {isLast ? (
          <Button
            variant="primary"
            size="lg"
            onClick={handleSubmit}
            disabled={!isAnswered || submitting}
            className="flex-1"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <LoadingSpinner size="sm" /> Calculating...
              </span>
            ) : (
              "See My Results"
            )}
          </Button>
        ) : (
          <Button variant="primary" size="md" onClick={handleNext} disabled={!isAnswered}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
