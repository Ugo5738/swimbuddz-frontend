import Link from "next/link";
import { Card } from "@/components/ui/Card";

const communityFeatures = [
    {
        title: "Events Calendar",
        description: "Enjoy occasional social swims, casual meetups, beach hangouts, socials, watch parties and community-led activities.",
        link: "/community/events"
    },
    {
        title: "Member Directory",
        description: "Connect with other swimmers who opted in to be visible in the community.",
        link: "/community/directory"
    },
    {
        title: "Volunteer Hub",
        description: "Help build SwimBuddz by volunteering in media, logistics, or coaching support.",
        link: "/community/volunteers"
    },
    {
        title: "Tips & Articles",
        description: "Educational content on swimming techniques, safety, breathing, and more.",
        link: "/community/tips"
    }
];

const benefits = [
    "Access to the Community Network",
    "Access to Community Events (Social swims, casual meetups, beach hangouts)",
    "Basic Member Profile",
    "Access to Community Chats (General conversation, Q&A)",
    "Educational Content (Swim tips, technique guides, lifestyle/fitness)",
    "Opt-in Features (Volunteer roles, Interest tags)"
];

export default function CommunityPage() {
    return (
        <div className="space-y-12">
            {/* Hero Section */}
            <section className="space-y-6">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
                    Community Tier
                </p>
                <h1 className="text-4xl font-bold text-slate-900 md:text-5xl">
                    Access to the Community Network
                </h1>
                <p className="text-lg text-slate-600 max-w-3xl">
                    Designed for people who simply want to be part of the SwimBuddz family.
                    A welcoming space to connect with swimmers from around the world.
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

            {/* Community Features Grid */}
            <section className="space-y-6">
                <div>
                    <h2 className="text-2xl font-semibold text-slate-900">Explore Community Features</h2>
                    <p className="text-base text-slate-600 mt-2">
                        Jump into the different areas of the SwimBuddz community.
                    </p>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    {communityFeatures.map((feature) => (
                        <Card key={feature.title} className="space-y-3">
                            <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
                            <p className="text-sm text-slate-600">{feature.description}</p>
                            <Link
                                href={feature.link}
                                className="inline-flex text-sm font-semibold text-cyan-700 hover:text-cyan-600"
                            >
                                Explore →
                            </Link>
                        </Card>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="rounded-3xl bg-gradient-to-br from-cyan-600 to-cyan-700 px-8 py-12 text-center text-white">
                <h2 className="text-3xl font-bold mb-4">Who is this for?</h2>
                <p className="text-lg mb-6 text-cyan-50 max-w-2xl mx-auto">
                    Anyone who wants to join the movement, make friends, and participate casually—no commitments or training expectations.
                </p>
                <Link
                    href="/register"
                    className="inline-block rounded-full bg-white px-8 py-3 font-semibold text-cyan-700 hover:bg-slate-50 transition"
                >
                    Join SwimBuddz
                </Link>
            </section>

            {/* Next Steps */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-900">Want More?</h2>
                <div className="grid gap-4 md:grid-cols-2">
                    <Card className="space-y-2">
                        <h3 className="text-lg font-semibold text-cyan-700">Club Tier</h3>
                        <p className="text-sm text-slate-600">
                            Join structured training sessions, track your attendance, and build consistency.
                        </p>
                        <Link href="/club" className="inline-flex text-sm font-semibold text-cyan-700 hover:underline">
                            Learn about Club →
                        </Link>
                    </Card>
                    <Card className="space-y-2">
                        <h3 className="text-lg font-semibold text-cyan-700">Academy Tier</h3>
                        <p className="text-sm text-slate-600">
                            Enroll in structured learning programs with clear milestones and coach feedback.
                        </p>
                        <Link href="/academy" className="inline-flex text-sm font-semibold text-cyan-700 hover:underline">
                            Learn about Academy →
                        </Link>
                    </Card>
                </div>
            </section>
        </div>
    );
}
