import Link from "next/link";
import { Card } from "@/components/ui/Card";

const whoSwimBudzIsFor = [
  {
    title: "Beginners",
    description: "Start from zero in a safe, supportive environment. Learn water confidence, breathing and basic strokes.",
    icon: "🌊"
  },
  {
    title: "Fitness Swimmers",
    description: "Improve your technique, build endurance, and stay consistent with weekly group sessions.",
    icon: "💪"
  },
  {
    title: "Competitive / Ocean Curious",
    description: "Explore more advanced training, challenges and open-water goals over time.",
    icon: "🏊"
  }
];

const tiers = [
  {
    name: "Community",
    description: "The base layer that keeps everyone connected.",
    benefits: [
      "Access to announcements and updates",
      "Invitations to community events and meetups",
      "Personal member profile",
      "Access to swim tips and resources",
      "Volunteer opportunities"
    ],
    pricing: "Free",
    link: "/community"
  },
  {
    name: "Club",
    description: "Structured training and consistent pool time.",
    benefits: [
      "Weekly Club training sessions",
      "Attendance and progress tracking",
      "Ride-share coordination",
      "Club challenges and badges",
      "Everything in Community"
    ],
    pricing: "Pay-per-session",
    link: "/club"
  },
  {
    name: "Academy",
    description: "Guided learning with clear milestones.",
    benefits: [
      "Structured 6-8 week cohorts",
      "Defined learning milestones",
      "Direct coach feedback",
      "Small group environment",
      "Everything in Community & Club"
    ],
    pricing: "Per cohort",
    link: "/academy"
  }
];

const howItWorks = [
  {
    step: "1",
    title: "Join the Community",
    description: "Create your profile, choose your tier, and get plugged into announcements & groups."
  },
  {
    step: "2",
    title: "Pick Your Path",
    description: "Join Club training sessions or enroll in Academy cohorts when you're ready."
  },
  {
    step: "3",
    title: "Show Up Consistently",
    description: "Attend sessions, practice drills, and track your progress."
  },
  {
    step: "4",
    title: "Grow With the Pod",
    description: "Take on challenges, volunteer, and be part of building SwimBuddz."
  }
];

const testimonials = [
  {
    quote: "I went from being afraid of water to swimming across the pool confidently.",
    author: "SwimBuddz Member"
  },
  {
    quote: "The group energy keeps me showing up, even on slow days.",
    author: "Club Member"
  },
  {
    quote: "SwimBuddz gave me the structure I needed to finally learn how to swim properly.",
    author: "Academy Graduate"
  }
];

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* 1. HERO SECTION */}
      <section className="space-y-6 rounded-3xl bg-gradient-to-br from-cyan-600 to-cyan-700 px-8 py-16 text-white shadow-xl">
        <h1 className="text-4xl font-bold md:text-5xl lg:text-6xl">
          Learn, train, and enjoy swimming with our swimming community.
        </h1>
        <p className="text-xl text-cyan-50 max-w-3xl md:text-2xl">
          SwimBuddz connects beginners, fitness swimmers, and competitors in a structured but friendly swim community.
        </p>
        <p className="text-sm font-semibold tracking-wide text-cyan-100">
          Building globally • Currently active in Lagos
        </p>
        <div className="flex flex-col gap-4 sm:flex-row pt-4">
          <Link
            href="/register"
            className="rounded-full bg-white px-8 py-4 text-center text-lg font-semibold text-cyan-700 hover:bg-slate-50 transition shadow-lg"
          >
            Join SwimBuddz
          </Link>
          <Link
            href="/sessions-and-events"
            className="rounded-full border-2 border-white px-8 py-4 text-center text-lg font-semibold text-white hover:bg-white/10 transition"
          >
            View Upcoming Sessions
          </Link>
        </div>
      </section>

      {/* 2. WHO SWIMBUDDZ IS FOR */}
      <section className="space-y-8">
        <div className="text-center space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
            For Everyone
          </p>
          <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
            Who SwimBuddz Is For
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {whoSwimBudzIsFor.map((audience) => (
            <Card key={audience.title} className="space-y-4 text-center">
              <div className="text-5xl">{audience.icon}</div>
              <h3 className="text-xl font-semibold text-slate-900">{audience.title}</h3>
              <p className="text-slate-600">{audience.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* 3. TIERS OVERVIEW */}
      <section className="space-y-8">
        <div className="text-center space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
            Three Tiers
          </p>
          <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
            Choose Your Level of Commitment
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Start with Community, upgrade to Club for consistent training, or join Academy for structured learning.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {tiers.map((tier) => (
            <Card key={tier.name} className="space-y-6 relative overflow-hidden">
              <div>
                <h3 className="text-2xl font-bold text-cyan-700">{tier.name}</h3>
                <p className="text-slate-600 mt-2">{tier.description}</p>
                <p className="text-sm font-semibold text-slate-500 mt-3">{tier.pricing}</p>
              </div>
              <ul className="space-y-3">
                {tier.benefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-cyan-100 text-xs text-cyan-700">
                      ✓
                    </span>
                    <span className="text-slate-700">{benefit}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={tier.link}
                className="block text-center font-semibold text-cyan-700 hover:text-cyan-600 mt-4"
              >
                Learn more →
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* 4. SESSIONS & EVENTS PREVIEW */}
      <section className="space-y-6 rounded-2xl bg-slate-100 p-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Upcoming Sessions & Events</h2>
          <p className="text-slate-600 mt-2">
            Join training sessions or RSVP to community events.
          </p>
        </div>
        <Card className="p-6 text-center">
          <p className="text-slate-600 mb-4">
            View the full calendar of club sessions and community events.
          </p>
          <Link
            href="/sessions-and-events"
            className="inline-block rounded-full bg-cyan-600 px-6 py-3 font-semibold text-white hover:bg-cyan-500 transition"
          >
            View Full Calendar
          </Link>
        </Card>
      </section>

      {/* 5. COMMUNITY HIGHLIGHTS / PHOTOS */}
      <section className="space-y-8">
        <div className="text-center space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
            Our Community
          </p>
          <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
            Building a Culture Together
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            We're building a culture of consistency, safety and fun in and out of the pool.
          </p>
        </div>

        {/* Photo grid placeholder - will be populated from media service */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-lg bg-gradient-to-br from-cyan-100 to-cyan-200 flex items-center justify-center"
            >
              <span className="text-4xl">🏊</span>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/gallery"
            className="inline-block rounded-full border-2 border-cyan-600 px-8 py-3 font-semibold text-cyan-700 hover:bg-cyan-50 transition"
          >
            Browse Gallery
          </Link>
        </div>
      </section>

      {/* 6. HOW IT WORKS */}
      <section className="space-y-8">
        <div className="text-center space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
            Simple Process
          </p>
          <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
            How It Works
          </h2>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {howItWorks.map((step) => (
            <div key={step.step} className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-600 text-2xl font-bold text-white">
                {step.step}
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
              <p className="text-sm text-slate-600">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. TESTIMONIALS */}
      <section className="space-y-8 bg-slate-50 -mx-4 px-4 py-12 md:-mx-8 md:px-8 rounded-2xl">
        <div className="text-center space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
            Member Stories
          </p>
          <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
            What Our Swimmers Say
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial, idx) => (
            <Card key={idx} className="space-y-4">
              <p className="text-slate-700 italic">"{testimonial.quote}"</p>
              <p className="text-sm font-semibold text-cyan-700">— {testimonial.author}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* 8. FINAL CTA STRIP */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 px-8 py-16 text-center text-white shadow-xl">
        <h2 className="text-3xl font-bold mb-4 md:text-4xl">
          Ready to swim with people who actually show up?
        </h2>
        <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
          Join SwimBuddz and start your next chapter in the water.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/register"
            className="rounded-full bg-cyan-600 px-8 py-4 text-lg font-semibold text-white hover:bg-cyan-500 transition shadow-lg"
          >
            Join SwimBuddz
          </Link>
          <Link
            href="/about"
            className="rounded-full border-2 border-white px-8 py-4 text-lg font-semibold text-white hover:bg-white/10 transition"
          >
            Learn More About Us
          </Link>
        </div>
      </section>
    </div>
  );
}
