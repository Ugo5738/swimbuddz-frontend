"use client";

import { useEffect, useState } from "react";
import { AcademyQuizApi, type LearnerQuiz, type QuizResult } from "@/lib/academy-quizzes";

export function LearnerKnowledgeQuizzes({ enrollmentId }: { enrollmentId: string }) {
  const [quizzes, setQuizzes] = useState<LearnerQuiz[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string,string[]>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try { setQuizzes(await AcademyQuizApi.listLearner(enrollmentId)); setError(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not load quizzes."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, [enrollmentId]);

  const active = quizzes.find(q => q.id === selected) || null;
  const choose = (questionId: string, optionId: string, multiple: boolean) => {
    setAnswers(prev => {
      const old = prev[questionId] || [];
      return { ...prev, [questionId]: multiple
        ? old.includes(optionId) ? old.filter(id => id !== optionId) : [...old, optionId]
        : [optionId] };
    });
  };
  const submit = async () => {
    if (!active) return;
    if (!active.questions?.every(q => (answers[q.id] || []).length > 0)) {
      setError("Please answer every question."); return;
    }
    setBusy(true); setError("");
    try {
      const grade = await AcademyQuizApi.submit(enrollmentId, active.id, answers);
      setResult(grade);
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not submit quiz."); }
    finally { setBusy(false); }
  };
  return (
    <section aria-labelledby="knowledge-quizzes-heading" className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <header>
        <h2 id="knowledge-quizzes-heading" className="text-xl font-semibold text-slate-900">Academy Knowledge Quizzes</h2>
        <p className="text-sm text-slate-600">Short safety and technique quizzes unlock in their assigned programme weeks.</p>
      </header>
      {loading && <p role="status">Loading knowledge quizzes…</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {!loading && quizzes.length === 0 && <p className="text-sm text-slate-600">No quizzes assigned to this cohort yet.</p>}
      {quizzes.map(quiz => (
        <div key={quiz.id} className="rounded-lg border border-slate-200 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-slate-900">Week {quiz.week_number}: {quiz.title}</p>
              <p className="text-xs text-slate-600">
                {quiz.passed ? "Passed" : !quiz.is_unlocked ? "Unlocks " + new Date(quiz.available_at).toLocaleDateString() : "Available"}
                {" · "}Pass mark {quiz.passing_score}%
                {" · "}{quiz.attempts_remaining === null ? "Unlimited attempts" : quiz.attempts_remaining + " attempts remaining"}
                {quiz.required ? " · Required" : " · Optional"}
              </p>
            </div>
            {quiz.is_unlocked && !quiz.passed && (quiz.attempts_remaining === null || quiz.attempts_remaining > 0) &&
              <button type="button" onClick={() => { setSelected(selected === quiz.id ? null : quiz.id); setAnswers({}); setResult(null); setError(""); }}
                className="rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-800">
                {selected === quiz.id ? "Close" : "Take quiz"}
              </button>}
          </div>
          {quiz.latest_result && <p className="mt-2 text-sm text-slate-700">Latest score: {quiz.latest_result.score_percent}% — {quiz.latest_result.passed ? "Passed" : "Try again after reviewing feedback"}</p>}
          {selected === quiz.id && quiz.questions && (
            <div className="mt-4 space-y-5 border-t border-slate-200 pt-4">
              {quiz.questions.map((question,index) => (
                <fieldset key={question.id} className="space-y-2">
                  <legend className="text-sm font-semibold text-slate-900">{index+1}. {question.text}</legend>
                  <p className="text-xs text-slate-500">{question.kind === "multiple" ? "Select all correct answers." : "Select one answer."}</p>
                  {question.options.map(option => (
                    <label key={option.id} className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-100 p-2 text-sm">
                      <input type={question.kind === "multiple" ? "checkbox" : "radio"} name={question.id}
                        checked={(answers[question.id] || []).includes(option.id)}
                        onChange={() => choose(question.id, option.id, question.kind === "multiple")} />
                      <span>{option.text}</span>
                    </label>
                  ))}
                </fieldset>
              ))}
              <button type="button" disabled={busy} onClick={() => void submit()} className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Grading…" : "Submit answers"}</button>
            </div>
          )}
          {selected === quiz.id && result && (
            <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3" aria-live="polite">
              <p className="font-semibold">Score {result.score_percent}% — {result.passed ? "Passed!" : "Not yet passed"}</p>
              {result.feedback.map(f => <div key={f.question_id} className="text-sm">
                <strong>{f.correct ? "Correct" : "Incorrect"}:</strong> {f.explanation}
              </div>)}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
