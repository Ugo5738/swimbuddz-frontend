import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { UpcomingCohorts } from "@/components/academy/UpcomingCohorts";

const benefits = [
    "Structured programs and cohorts (6-8 week courses)",
    "Clearly defined milestones for progression",
    "Direct coach feedback and progress tracking",
    "Small group environment focused on learning",
    "Recognition when you complete a level or cohort",
    "Skill assessments and certifications",
    "Everything in Community and Club tiers"
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
        description: "6-8 week programs with  consistent training times"
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
                    Guided learning with clear milestones.
                </h1>
                <p className="text-lg text-slate-600 max-w-3xl">
                    Academy is designed to answer the question: "If I show up and do the work, will I actually learn?"
                    With structured cohorts, defined milestones, and coach feedback, the answer is a clear yes.
                </p>
            </section>

            {/* Benefits Section */}
            <section className="space-y-6">
                <h2 className="text-2xl font-semibold text-slate-900">What You Get</h2>
                <Card className="space-y-4">
                    <ul className="space-y-3">
                        {benefits.map((benefit, index) => (
                            <li key={index} className="flex items-start gap-3">
                                <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-cyan-100 text-xs text-cyan-700">
                                    ✓
                                </span>
                                <span className="text-slate-700">{benefit}</span>
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
                    <Link href="/member/academy" className="text-cyan-600 font-semibold hover:text-cyan-700 flex items-center gap-1">
                        View all programs <span aria-hidden="true">&rarr;</span>
                    </Link>
                </div>

                <UpcomingCohorts />
            </section>

            {/* CTA Section */}
            <section className="rounded-3xl bg-gradient-to-br from-cyan-600 to-cyan-700 px-8 py-12 text-center text-white">
                <h2 className="text-3xl font-bold mb-4">Ready to Learn with Structure?</h2>
                <p className="text-lg mb-6 text-cyan-50 max-w-2xl mx-auto">
                    Join Academy and get on a clear path from beginner to confident swimmer.
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
