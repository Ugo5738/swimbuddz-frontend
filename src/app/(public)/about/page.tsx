import Link from "next/link";
import { Card } from "@/components/ui/Card";

const tierSections = [
  {
    name: "1. Community",
    subtitle: "The base layer — everyone starts here",
    benefits: [
      "Access to announcements and updates",
      "Invitations to community events and meetups (beach days, hangouts, watch parties, etc.)",
      "A personal member profile",
      "Optionally, inclusion in our member directory (for those who opt in)",
      "Access to swim tips, resources and educational content",
      "Opportunities to volunteer and help build the community"
    ],
    note: "The Community layer keeps you connected even on weeks you're not in the pool."
  },
  {
    name: "2. Club",
    subtitle: "For people who want structured training and consistent pool time",
    benefits: [
      "Access to weekly Club training sessions",
      "Ability to sign up for sessions and track your attendance",
      "Ride-share coordination for selected sessions",
      "Training-focused announcements and updates",
      "The beginning of a system that recognizes punctuality, commitment and progress"
    ],
    note: "Club is where you build consistency, not just good intentions."
  },
  {
    name: "3. Academy",
    subtitle: "For members who want a more guided learning journey",
    benefits: [
      "Structured programs and cohorts (e.g. 6–8 week beginner course)",
      "Clearly defined milestones (water comfort, floating, breathing, strokes, etc.)",
      "Coach feedback and basic progress tracking",
      "A small group environment focused on learning, not just \"laps\"",
      "Recognition when you complete a level or finish a cohort"
    ],
    note: "Academy is designed to answer the question: \"If I show up and do the work, will I actually learn?\" — with a clear yes."
  }
];

const approach = [
  {
    title: "Safety",
    description: "We prioritize safe environments, respect for pool rules, and a culture where people look out for one another."
  },
  {
    title: "Consistency",
    description: "Progress in swimming comes from showing up. Our structure (sessions, check-ins, cohorts) is designed to help you keep going."
  },
  {
    title: "Community",
    description: "SwimBuddz is not just lanes and drills. It's conversations, encouragement, shared struggles and small wins celebrated together."
  }
];

const locations = [
  { name: "Yaba / Rowe Park", purpose: "for structured training sessions" },
  { name: "Sunfit (Ago)", purpose: "for selected Club sessions" },
  { name: "Victoria Island (e.g. Federal Palace area)", purpose: "often for community events and relaxed meets" }
];

const getInvolved = [
  {
    title: "Join the Community",
    description: "Create an account, fill out your profile, and start receiving announcements and updates.",
    link: "/register"
  },
  {
    title: "Join the Club Sessions",
    description: "Once you're ready, sign up for Club training sessions and start building consistency with others.",
    link: "/sessions-and-events"
  },
  {
    title: "Enroll in the Academy",
    description: "If you're a beginner or you want a structured learning path, enroll in an Academy program when applications open.",
    link: "/academy"
  },
  {
    title: "Volunteer",
    description: "If you enjoy media, logistics, coordination or helping others, you can indicate your interest in volunteer roles inside your profile.",
    link: "/community/volunteers"
  }
];

export default function AboutPage() {
  return (
    <div className="space-y-16">
      {/* Header */}
      <section className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">About SwimBuddz</p>
        <h1 className="text-4xl font-bold text-slate-900 md:text-5xl">
          A swimming community that helps people learn, train and enjoy swimming together.
        </h1>
        <p className="text-xl text-slate-600">
          From absolute beginners to confident swimmers.
        </p>
      </section>

      {/* OUR STORY */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-slate-900">Our Story</h2>
        <div className="space-y-4 text-lg text-slate-700">
          <p>
            SwimBuddz was <strong>founded by Ugochukwu Daniel Nwachukwu</strong> to help adults learn swimming
            and build lasting swim communities.
          </p>
          <p>
            We noticed a few things:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Many adults wanted to learn to swim, but didn't know where to start.</li>
            <li>Some people had taken classes before, but lost confidence or stopped showing up.</li>
            <li>There was no simple way to plug into an active, friendly swim community that wasn't just "show up and figure it out."</li>
          </ul>
          <p>
            From there, SwimBuddz grew into a structured yet relaxed community:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>We organize regular swim sessions at pools around Lagos.</li>
            <li>We help beginners build confidence step by step.</li>
            <li>We support intermediates and advanced swimmers with technique, endurance and challenges.</li>
            <li>We create spaces for people to connect, not just swim.</li>
          </ul>
          <p>
            Today, SwimBuddz is part community, part club, and part academy — all working together to help people grow in the water.
            We're <strong>building globally, currently active in Lagos</strong>, with plans to expand rapidly.
          </p>
        </div>
      </section>

      {/* WHAT WE DO */}
      <section className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">What We Do</h2>
          <p className="text-lg text-slate-600 mt-2">SwimBuddz is built around three layers:</p>
        </div>

        {tierSections.map((tier, idx) => (
          <Card key={tier.name} className="space-y-4">
            <div>
              <h3 className="text-2xl font-bold text-cyan-700">{tier.name}</h3>
              <p className="text-slate-600 mt-1">{tier.subtitle}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3">As a {tier.name.substring(3)} member, you get:</p>
              <ul className="space-y-2">
                {tier.benefits.map((benefit, bidx) => (
                  <li key={bidx} className="flex items-start gap-2 text-slate-700">
                    <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-cyan-100 text-xs text-cyan-700">
                      ✓
                    </span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-sm italic text-slate-600 border-l-4 border-cyan-600 pl-4">
              {tier.note}
            </p>
          </Card>
        ))}
      </section>

      {/* OUR APPROACH */}
      <section className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Our Approach</h2>
          <p className="text-lg text-slate-600 mt-2">We care about three things:</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {approach.map((item) => (
            <Card key={item.title} className="space-y-3">
              <h3 className="text-xl font-bold text-cyan-700">{item.title}</h3>
              <p className="text-slate-700">{item.description}</p>
            </Card>
          ))}
        </div>
        <Card className="bg-slate-50 border-slate-200">
          <p className="text-slate-700">
            We don't promise instant transformation. We promise a realistic, supportive path you can walk — or swim — one session at a time.
          </p>
        </Card>
      </section>

      {/* WHERE WE SWIM */}
      <section className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Where We Swim</h2>
          <p className="text-lg text-slate-600 mt-2">
            We currently run activities at different pools and venues around Lagos, including:
          </p>
        </div>
        <div className="space-y-3">
          {locations.map((location) => (
            <Card key={location.name} className="flex items-center gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-cyan-100">
                <span className="text-xl">📍</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{location.name}</h3>
                <p className="text-sm text-slate-600">{location.purpose}</p>
              </div>
            </Card>
          ))}
        </div>
        <p className="text-slate-600 italic">
          As we grow, we'll expand and adjust locations to serve more members and different parts of the city (and beyond).
        </p>
      </section>

      {/* WHO RUNS SWIMBUDDZ */}
      <section className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Who Runs SwimBuddz?</h2>
          <p className="text-lg text-slate-600 mt-2">
            SwimBuddz is led by a small team of coaches, volunteers and community members who care about:
          </p>
        </div>
        <ul className="space-y-3 text-slate-700">
          <li className="flex items-start gap-3">
            <span className="mt-1">•</span>
            <span>Teaching adults to swim in a patient, encouraging way</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-1">•</span>
            <span>Building a culture of discipline without losing the fun</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-1">•</span>
            <span>Creating a welcoming space for people at different stages in life and fitness</span>
          </li>
        </ul>
        <Card className="bg-cyan-50 border-cyan-200">
          <p className="text-slate-700">
            We're constantly learning, improving and listening to feedback from the community.
          </p>
        </Card>
      </section>

      {/* HOW TO GET INVOLVED */}
      <section className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">How to Get Involved</h2>
          <p className="text-lg text-slate-600 mt-2">
            There are a few ways to plug into SwimBuddz:
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {getInvolved.map((option) => (
            <Card key={option.title} className="space-y-3">
              <h3 className="text-lg font-semibold text-cyan-700">{option.title}</h3>
              <p className="text-sm text-slate-700">{option.description}</p>
              <Link
                href={option.link}
                className="inline-flex text-sm font-semibold text-cyan-700 hover:text-cyan-600"
              >
                Get started →
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* OUR VISION */}
      <section className="rounded-3xl bg-gradient-to-br from-cyan-600 to-cyan-700 px-8 py-12 text-white">
        <div className="space-y-6 max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold">Our Vision</h2>
          <p className="text-xl text-cyan-50">
            We imagine a world where:
          </p>
          <ul className="space-y-3 text-lg text-left text-cyan-50">
            <li className="flex items-start gap-3">
              <span className="mt-1">•</span>
              <span>More adults are comfortable and confident in the water.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1">•</span>
              <span>Swimming is seen as a normal part of a healthy lifestyle.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1">•</span>
              <span>Community, not isolation, is what keeps people going.</span>
            </li>
          </ul>
          <p className="text-xl text-white pt-4">
            <strong>SwimBuddz is our way of building that future</strong> — one swimmer, one session, one shared experience at a time.
          </p>
        </div>
      </section>
    </div>
  );
}
