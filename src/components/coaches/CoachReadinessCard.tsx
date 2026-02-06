"use client";

import { Card } from "@/components/ui/Card";
import { CoachAssignmentApi, type CoachReadiness } from "@/lib/academy";
import { useEffect, useState } from "react";

interface CoachReadinessCardProps {
    coachId: string;
}

const GRADE_LABELS: Record<string, string> = {
    grade_1: "Grade 1 — Entry Level",
    grade_2: "Grade 2 — Experienced",
    grade_3: "Grade 3 — Expert",
};

const STATUS_STYLES: Record<string, { icon: string; bg: string; text: string }> = {
    passed: { icon: "✓", bg: "bg-emerald-50", text: "text-emerald-700" },
    pending: { icon: "○", bg: "bg-amber-50", text: "text-amber-700" },
    failed: { icon: "✗", bg: "bg-red-50", text: "text-red-700" },
};

export function CoachReadinessCard({ coachId }: CoachReadinessCardProps) {
    const [targetGrade, setTargetGrade] = useState("grade_1");
    const [readiness, setReadiness] = useState<CoachReadiness | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        CoachAssignmentApi.getReadiness(coachId, targetGrade)
            .then(setReadiness)
            .catch(() => setError("Failed to load readiness data"))
            .finally(() => setLoading(false));
    }, [coachId, targetGrade]);

    return (
        <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Coach Readiness</h2>
                <select
                    value={targetGrade}
                    onChange={(e) => setTargetGrade(e.target.value)}
                    className="text-sm border border-slate-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                    <option value="grade_1">Grade 1</option>
                    <option value="grade_2">Grade 2</option>
                    <option value="grade_3">Grade 3</option>
                </select>
            </div>

            {loading ? (
                <p className="text-sm text-slate-500">Loading readiness...</p>
            ) : error ? (
                <p className="text-sm text-red-600">{error}</p>
            ) : readiness ? (
                <div className="space-y-4">
                    {/* Overall status */}
                    <div
                        className={`rounded-lg p-3 text-center ${
                            readiness.is_ready
                                ? "bg-emerald-50 border border-emerald-200"
                                : "bg-amber-50 border border-amber-200"
                        }`}
                    >
                        <p className={`text-lg font-bold ${readiness.is_ready ? "text-emerald-700" : "text-amber-700"}`}>
                            {readiness.is_ready ? "Ready" : "Not Ready"}
                        </p>
                        <p className="text-sm text-slate-600">{GRADE_LABELS[targetGrade] || targetGrade}</p>
                    </div>

                    {/* Checklist */}
                    <div className="space-y-2">
                        {readiness.checks.map((check, i) => {
                            const style = STATUS_STYLES[check.status] || STATUS_STYLES.pending;
                            return (
                                <div key={i} className={`flex items-start gap-3 rounded-lg p-2.5 ${style.bg}`}>
                                    <span className={`font-bold text-sm mt-0.5 ${style.text}`}>{style.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className={`text-sm font-medium ${style.text}`}>{check.name}</p>
                                            {check.required && (
                                                <span className="text-[10px] uppercase font-semibold text-slate-400">Required</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500">{check.description}</p>
                                        {check.details && (
                                            <p className="text-xs text-slate-400 mt-0.5">{check.details}</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Missing requirements */}
                    {readiness.missing_requirements.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-slate-700 mb-1">Missing Requirements</p>
                            <ul className="text-sm text-slate-600 space-y-1">
                                {readiness.missing_requirements.map((req, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className="text-red-400 mt-0.5">•</span>
                                        {req}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Recommendations */}
                    {readiness.recommendations.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-slate-700 mb-1">Recommendations</p>
                            <ul className="text-sm text-slate-600 space-y-1">
                                {readiness.recommendations.map((rec, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className="text-cyan-400 mt-0.5">•</span>
                                        {rec}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            ) : null}
        </Card>
    );
}
