"use client";

import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
    CATEGORY_LABELS,
    ROLE_DETAILS,
    TIER_SHORT_LABELS,
    type VolunteerRole,
    type VolunteerRoleCategory,
} from "@/lib/volunteers";
import { CheckCircle2, Clock, Sparkles, Users } from "lucide-react";

type RoleDetailModalProps = {
    role: VolunteerRole | null;
    isOpen: boolean;
    onClose: () => void;
};

export function RoleDetailModal({ role, isOpen, onClose }: RoleDetailModalProps) {
    if (!role) return null;

    const details = ROLE_DETAILS[role.category as VolunteerRoleCategory];

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

                {/* Rich details from ROLE_DETAILS constant */}
                {details && (
                    <>
                        <div className="flex items-start gap-2">
                            <Clock className="h-4 w-4 text-cyan-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Time Commitment
                                </p>
                                <p className="text-sm text-slate-700">{details.timeCommitment}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-cyan-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    What You&apos;ll Do
                                </p>
                                <ul className="mt-1 space-y-1">
                                    {details.responsibilities.map((item, i) => (
                                        <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                            <span className="text-cyan-500 mt-0.5">&#8226;</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="flex items-start gap-2">
                            <Sparkles className="h-4 w-4 text-cyan-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Skills Needed
                                </p>
                                <p className="text-sm text-slate-700">{details.skillsNeeded}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-2">
                            <Users className="h-4 w-4 text-cyan-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Best For
                                </p>
                                <p className="text-sm text-slate-700">{details.bestFor}</p>
                            </div>
                        </div>
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
