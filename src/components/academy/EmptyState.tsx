"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

interface EmptyStateProps {
    icon?: string;
    title: string;
    description: string;
    action?: {
        label: string;
        href?: string;
        onClick?: () => void;
    };
}

const presetMessages = {
    noEnrollments: {
        icon: "🏊",
        title: "Start your swimming journey!",
        description:
            "Browse our programs and find the perfect cohort to begin your transformation.",
        action: {
            label: "Browse Programs →",
            href: "/account/academy/browse",
        },
    },
    noOpenCohorts: {
        icon: "📅",
        title: "All cohorts are currently full",
        description:
            "Want to be notified when new spots open or new cohorts are scheduled?",
        action: {
            label: "Get Notified",
        },
    },
    noCohorts: {
        icon: "🗓️",
        title: "New cohorts coming soon!",
        description:
            "We're planning the next batch of cohorts. Get notified when enrollment opens.",
        action: {
            label: "Get Notified",
        },
    },
    noProgress: {
        icon: "📈",
        title: "No progress yet",
        description:
            "Complete your first session to start tracking your achievements!",
        action: {
            label: "View Schedule",
            href: "/sessions",
        },
    },
    noPrograms: {
        icon: "🔍",
        title: "No programs found",
        description: "Try selecting a different level or check back later.",
    },
    noSessions: {
        icon: "📆",
        title: "No upcoming sessions",
        description:
            "Check back closer to your cohort start date for session details.",
    },
    noResources: {
        icon: "📚",
        title: "No resources available",
        description: "Resources will be added as your program progresses.",
    },
};

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <Card className="p-12 text-center">
            <div className="space-y-4">
                <span className="text-5xl">{icon || "📭"}</span>
                <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                <p className="text-slate-600 max-w-sm mx-auto">{description}</p>
                {action && (
                    <>
                        {action.href ? (
                            <Link href={action.href}>
                                <Button>{action.label}</Button>
                            </Link>
                        ) : (
                            <Button
                                variant="outline"
                                onClick={action.onClick || (() => { })}
                            >
                                {action.label}
                            </Button>
                        )}
                    </>
                )}
            </div>
        </Card>
    );
}

// Preset empty states for common scenarios
EmptyState.NoEnrollments = function NoEnrollments() {
    return <EmptyState {...presetMessages.noEnrollments} />;
};
EmptyState.NoOpenCohorts = function NoOpenCohorts() {
    return <EmptyState {...presetMessages.noOpenCohorts} />;
};
EmptyState.NoCohorts = function NoCohorts() {
    return <EmptyState {...presetMessages.noCohorts} />;
};
EmptyState.NoProgress = function NoProgress() {
    return <EmptyState {...presetMessages.noProgress} />;
};
EmptyState.NoPrograms = function NoPrograms() {
    return <EmptyState {...presetMessages.noPrograms} />;
};
EmptyState.NoSessions = function NoSessions() {
    return <EmptyState {...presetMessages.noSessions} />;
};
EmptyState.NoResources = function NoResources() {
    return <EmptyState {...presetMessages.noResources} />;
};
