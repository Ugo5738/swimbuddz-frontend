import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { UpcomingCohorts } from "@/components/academy/UpcomingCohorts";

type Benefit = {
    title: string;
    description?: string;
    subItems?: string[];
};

const benefits: Benefit[] = [
    {
        title: "Everything in Club",
        description: ""
    },
    {
        title: "Structured Curriculum & Milestones",
        description: "(e.g., water comfort → floating → breathing → kick → arm movement → full stroke → endurance → efficiency)"
    },
    {
        title: "Coach-Assigned Drills and Goals",
        description: "Each swimmer receives personalized tasks to complete between sessions."
    },
    {
        title: "Progress Tracking (Academy Level)",
        subItems: [
            "Detailed milestone tracking",
            "Dates of completion",
            "Skill gap analysis",
            "Stroke-by-stroke progress"
        ]
    },
    {
        title: "Cohort-Based Scheduling",
        description: "4+ weeks programs with classmates starting and graduating together."
    },
    {
        title: "Coach Notes & Feedback History",
        description: "A dedicated performance journal accessible on your profile."
    },
    {
        title: "Video Analysis (Optional)",
        description: "Coaches review your technique and provide annotated feedback."
    },
    {
        title: "Certification / Level Badge",
        description: "At the end of the cohort, swimmers receive badges/certificates showing their achieved level."
    },
    {
        title: "Premium Resources",
        description: "Access to exclusive academy materials, drills library, progression charts, and bonus sessions."
    },
    {
        title: "Priority Access",
        description: "Priority booking for sessions and limited-seat workshops."
    }
];

const learningPaths = [
    {
        title: "Beginner Pathway",
        description: "Water comfort, floating, breathing, and basic stroke introduction.",
        milestones: ["Water confidence", "Floating", "Breathing control", "Freestyle basics"]
    },
    {
        title: "Intermediate Pathway",
        description: "Refine strokes, build endurance, and improve technique across all four strokes.",
        milestones: ["All four strokes", "Endurance building", "Flip turns", "Technique refinement"]
    },
    {
        title: "Advanced Pathway",
        description: "Open water training, advanced techniques, and competitive swim preparation.",
        milestones: ["Open water skills", "Race strategy", "Advanced drills", "Competition ready"]
    }
];

const cohortStructure = [
    {
        title: "Small Groups",
        description: "6-12 swimmers per cohort for personalized attention"
    },
    {
        title: "Fixed Schedule",
        description: "Cohort-based scheduling (e.g. 8-week beginner program)"
    },
    {
        title: "Clear Milestones",
        description: "Know exactly what you're working toward each week"
    },
    {
        title: "Coach Feedback",
        description: "Regular check-ins and progress assessments"
    }
];

export default function AcademyPage() {
    return (
        <div className="space-y-12">
            {/* Hero Section */}
            <section className="space-y-6">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
                    Academy Tier
                </p>
                <h1 className="text-4xl font-bold text-slate-900 md:text-5xl">
                    A formal training program with a curriculum, assessments, and certification.
                </h1>
                <p className="text-lg text-slate-600 max-w-3xl">
                    From water comfort to advanced strokes. Access advanced training materials, dedicated academy-only events, and a more focused learning environment.
                </p>
            </section>

            {/* Benefits Section */}
            <section className="space-y-6">
                <h2 className="text-2xl font-semibold text-slate-900">What You Get</h2>
                <Card className="space-y-6 p-6">
                    <ul className="space-y-6">
                        {benefits.map((benefit, index) => (
                            <li key={index} className="flex items-start gap-4">
                                <span className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cyan-100 text-sm text-cyan-700">
                                    ✓
                                </span>
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-slate-900 text-lg leading-tight">
                                        {benefit.title}
                                    </h3>
                                    {benefit.description && (
                                        <p className="text-slate-600 leading-relaxed">
                                            {benefit.description}
                                        </p>
                                    )}
                                    {benefit.subItems && (
                                        <ul className="list-disc pl-4 space-y-1 mt-2">
                                            {benefit.subItems.map((subItem, idx) => (
                                                <li key={idx} className="text-slate-600">
                                                    {subItem}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            </section>

            {/* Learning Pathways */}
            <section className="space-y-6">
                <div>
                    <h2 className="text-2xl font-semibold text-slate-900">Learning Pathways</h2>
                    <p className="text-base text-slate-600 mt-2">
                        Choose the path that matches your current level and goals.
                    </p>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                    {learningPaths.map((path) => (
                        <Card key={path.title} className="space-y-4">
                            <h3 className="text-lg font-semibold text-cyan-700">{path.title}</h3>
                            <p className="text-sm text-slate-600">{path.description}</p>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                                    Key Milestones
                                </p>
                                <ul className="space-y-1">
                                    {path.milestones.map((milestone, idx) => (
                                        <li key={idx} className="text-sm text-slate-700 flex items-center gap-2">
                                            <span className="text-cyan-600">•</span>
                                            {milestone}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Cohort Structure */}
            <section className="space-y-6">
                <div>
                    <h2 className="text-2xl font-semibold text-slate-900">How Cohorts Work</h2>
                    <p className="text-base text-slate-600 mt-2">
                        Structured learning in a supportive small-group environment.
                    </p>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {cohortStructure.map((item) => (
                        <Card key={item.title} className="space-y-2 text-center">
                            <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                            <p className="text-sm text-slate-600">{item.description}</p>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Available Programs */}
            <section className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-semibold text-slate-900">Upcoming Cohorts</h2>
                        <p className="text-slate-600 mt-2">
                            Secure your spot in our next structured learning cycle.
                        </p>
                    </div>
                    <Link href="/upgrade/academy/details" className="text-cyan-600 font-semibold hover:text-cyan-700 flex items-center gap-1">
                        View all programs <span aria-hidden="true">&rarr;</span>
                    </Link>
                </div>

                <UpcomingCohorts />
            </section>

            {/* CTA Section */}
            <section className="rounded-3xl bg-gradient-to-br from-cyan-600 to-cyan-700 px-8 py-12 text-center text-white">
                <h2 className="text-3xl font-bold mb-4">Who is this for?</h2>
                <p className="text-lg mb-6 text-cyan-50 max-w-2xl mx-auto">
                    Beginners who want to learn properly from scratch, or intermediates who want structured professional guidance and a clear progression path.
                    Perfect for people who want to achieve something specific in a set timeframe.
                </p>
                <Link
                    href="/register"
                    className="inline-block rounded-full bg-white px-8 py-3 font-semibold text-cyan-700 hover:bg-slate-50 transition"
                >
                    Join Academy Tier
                </Link>
            </section>
        </div>
    );
}
