"use client";

import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
    CATEGORY_LABELS,
    TIER_SHORT_LABELS,
    type VolunteerRole,
} from "@/lib/volunteers";
import { CheckCircle2, Clock, Sparkles, Users } from "lucide-react";

type RoleDetailModalProps = {
    role: VolunteerRole | null;
    isOpen: boolean;
    onClose: () => void;
};

export function RoleDetailModal({ role, isOpen, onClose }: RoleDetailModalProps) {
    if (!role) return null;

    const hasDetails = role.time_commitment || role.responsibilities?.length || role.skills_needed || role.best_for;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={role.title}>
            <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <span className="text-3xl">{role.icon || "🙋"}</span>
                    <div>
                        <Badge variant="outline">
                            {CATEGORY_LABELS[role.category] || role.category}
                        </Badge>
                        <p className="mt-1 text-xs text-slate-500">
                            Min tier: {TIER_SHORT_LABELS[role.min_tier]}
                        </p>
                    </div>
                </div>

                {/* Description from API */}
                {role.description && (
                    <p className="text-sm text-slate-700">{role.description}</p>
                )}

                {/* Rich details from API */}
                {hasDetails && (
                    <>
                        {role.time_commitment && (
                            <div className="flex items-start gap-2">
                                <Clock className="h-4 w-4 text-cyan-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Time Commitment
                                    </p>
                                    <p className="text-sm text-slate-700">{role.time_commitment}</p>
                                </div>
                            </div>
                        )}

                        {role.responsibilities && role.responsibilities.length > 0 && (
                            <div className="flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 text-cyan-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        What You&apos;ll Do
                                    </p>
                                    <ul className="mt-1 space-y-1">
                                        {role.responsibilities.map((item, i) => (
                                            <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                                <span className="text-cyan-500 mt-0.5">&#8226;</span>
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {role.skills_needed && (
                            <div className="flex items-start gap-2">
                                <Sparkles className="h-4 w-4 text-cyan-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Skills Needed
                                    </p>
                                    <p className="text-sm text-slate-700">{role.skills_needed}</p>
                                </div>
                            </div>
                        )}

                        {role.best_for && (
                            <div className="flex items-start gap-2">
                                <Users className="h-4 w-4 text-cyan-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Best For
                                    </p>
                                    <p className="text-sm text-slate-700">{role.best_for}</p>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Required skills from API */}
                {role.required_skills && role.required_skills.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Required Skills
                        </p>
                        <div className="flex flex-wrap gap-1">
                            {role.required_skills.map((skill) => (
                                <Badge key={skill} variant="outline">{skill}</Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Active volunteers */}
                {role.active_volunteers_count > 0 && (
                    <p className="text-xs text-slate-400">
                        {role.active_volunteers_count} active volunteer{role.active_volunteers_count !== 1 ? "s" : ""} in this role
                    </p>
                )}
            </div>
        </Modal>
    );
}
