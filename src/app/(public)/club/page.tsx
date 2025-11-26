import Link from "next/link";
import { Card } from "@/components/ui/Card";

const benefits = [
    "Access to weekly Club training sessions",
    "Ability to sign up for sessions and track your attendance",
    "Ride-share coordination for selected sessions",
    "Training-focused announcements and updates",
    "Punctuality and commitment tracking system",
    "Recognition for consistency and progress",
    "Access to club challenges and badges",
    "Everything in Community tier"
];

const trainingStructure = [
    {
        title: "Technique Blocks",
        description: "Focus sessions on specific strokes, breathing patterns, and form improvements."
    },
    {
        title: "Performance Squads",
        description: "Group training for swimmers looking to build endurance and speed."
    },
    {
        title: "Consistency Tracking",
        description: "Your attendance and punctuality are tracked to help you stay accountable."
    }
];

const challenges = [
    {
        badge: "Consistent 8",
        criteria: "Attend 8 sessions in a month"
    },
    {
        badge: "Early Bird",
        criteria: "Arrive 15+ minutes early to 5 sessions"
    },
    {
        badge: "Distance Swimmer",
        criteria: "Complete 2km in a single session"
    },
    {
        badge: "Technique Master",
        criteria: "Demonstrate proficiency in all four strokes"
    }
];

export default function ClubPage() {
    return (
        <div className="space-y-12">
            {/* Hero Section */}
            <section className="space-y-6">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
                    Club Tier
                </p>
                <h1 className="text-4xl font-bold text-slate-900 md:text-5xl">
                    Structured training and consistent pool time.
                </h1>
                <p className="text-lg text-slate-600 max-w-3xl">
                    Club is where you build consistency, not just good intentions. Join weekly training sessions
                    with a system that recognizes punctuality, commitment, and progress.
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

            {/* Training Structure */}
            <section className="space-y-6">
                <div>
                    <h2 className="text-2xl font-semibold text-slate-900">How Training Works</h2>
                    <p className="text-base text-slate-600 mt-2">
                        Every session has a purpose, and the community keeps you going.
                    </p>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                    {trainingStructure.map((item) => (
                        <Card key={item.title} className="space-y-3">
                            <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                            <p className="text-sm text-slate-600">{item.description}</p>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Challenges & Badges */}
            <section className="space-y-6">
                <div>
                    <h2 className="text-2xl font-semibold text-slate-900">Challenges & Badges</h2>
                    <p className="text-base text-slate-600 mt-2">
                        Push yourself and earn recognition for your commitment and achievements.
                    </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    {challenges.map((challenge) => (
                        <Card key={challenge.badge} className="flex items-start gap-4 p-4">
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-cyan-100">
                                <span className="text-2xl">🏅</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">{challenge.badge}</h3>
                                <p className="text-sm text-slate-600">{challenge.criteria}</p>
                            </div>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Session Schedule Preview */}
            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-slate-900">Upcoming Sessions</h2>
                <Card className="p-6 text-center">
                    <p className="text-slate-600 mb-4">
                        View the full schedule and sign up for upcoming training sessions.
                    </p>
                    <Link
                        href="/sessions-and-events"
                        className="inline-block rounded-full bg-cyan-600 px-6 py-3 font-semibold text-white hover:bg-cyan-500 transition"
                    >
                        View Sessions Schedule
                    </Link>
                </Card>
            </section>

            {/* CTA Section */}
            <section className="rounded-3xl bg-gradient-to-br from-cyan-600 to-cyan-700 px-8 py-12 text-center text-white">
                <h2 className="text-3xl font-bold mb-4">Ready to Commit to Consistency?</h2>
                <p className="text-lg mb-6 text-cyan-50 max-w-2xl mx-auto">
                    Upgrade to Club and start building the habit that will transform your swimming.
                </p>
                <Link
                    href="/register"
                    className="inline-block rounded-full bg-white px-8 py-3 font-semibold text-cyan-700 hover:bg-slate-50 transition"
                >
                    Join Club Tier
                </Link>
            </section>
        </div>
    );
}
