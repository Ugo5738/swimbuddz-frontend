import Link from "next/link";

const guidelinesDocUrl =
  "https://docs.google.com/document/d/1xZ7n-NB62ahVRm1W3Epl2iGnjWVKxegxZD3Ai5FCNZA/edit?tab=t.0";

type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "subtitle"; text: string }
  | { type: "link"; text: string; href: string };

type Section = {
  title: string;
  content: ContentBlock[];
};

const sections: Section[] = [
  {
    title: "1. 🎯 Purpose and Focus",
    content: [
      {
        type: "paragraph",
        text: "SwimBuddz is a community built around a shared passion for swimming. Our goals are to:",
      },
      {
        type: "list",
        items: [
          "Encourage consistent swimming practice and improvement.",
          "Build a friendly, supportive environment for swimmers of all levels.",
          "Organize group swims, training sessions, and fun challenges.",
          "Share swimming-related tips, content, and opportunities.",
        ],
      },
      {
        type: "paragraph",
        text: "Please keep conversations centered on swimming or community-related topics. Light off-topic chat is fine occasionally — but swimming remains the main focus.",
      },
    ],
  },
  {
    title: "2. 🤝 Respect & Communication",
    content: [
      {
        type: "list",
        items: [
          "Be kind: No harassment, bullying, insults, or discriminatory language. Zero tolerance for hate speech.",
          "Be constructive: Offer feedback that helps people improve — criticize ideas, not people.",
          "No spam: Avoid chain messages, excessive emojis, or repeated posts.",
          "Respect privacy: Don’t share anyone’s personal details, videos, or photos outside the group without consent.",
        ],
      },
    ],
  },
  {
    title: "3. 🏅 Skill Levels and Groups",
    content: [
      {
        type: "paragraph",
        text: "To help everyone learn and grow at their own pace, we have different skill levels.",
      },
      { type: "subtitle", text: "Levels:" },
      {
        type: "list",
        items: [
          "Beginner: Focus on water confidence, floating, breathing, and basic stroke.",
          "Intermediate: Work on endurance, stroke efficiency, and body coordination.",
          "Advanced: Improve speed, refine techniques, and prepare for competitions.",
        ],
      },
      { type: "subtitle", text: "How It Works:" },
      {
        type: "list",
        items: [
          "We have WhatsApp groups for each level.",
          "Beginner: Open to all members.",
          "Intermediate: You should be able to swim at least two styles with above-average technique.",
          "Expert: You should be able to swim four styles with above-average technique.",
          "Admins may confirm your ability before adding you to higher-level groups.",
        ],
      },
      {
        type: "paragraph",
        text: "Mentorship and peer support are encouraged at all levels.",
      },
    ],
  },
  {
    title: "4. 🏊 Sessions, Meetups & RSVPs",
    content: [
      {
        type: "list",
        items: [
          "Punctuality: Arrive on time for warm-ups and briefings.",
          "RSVP Etiquette: If you mark “going,” please show up. If plans change, update promptly.",
          "Location & Fees: Some pools charge entry fees; each swimmer is responsible for their own unless otherwise announced.",
          "Cancellations: Weather, pool closures, or safety concerns may cause last-minute changes — check the Announcements channel before leaving home.",
        ],
      },
    ],
  },
  {
    title: "5. 🏆 Events & Challenges",
    content: [
      { type: "subtitle", text: "End-of-Year SwimBuddz Competition (2025):" },
      {
        type: "list",
        items: [
          "Informal, fun, and inclusive.",
          "Events will be scaled for Beginner, Intermediate, and Advanced swimmers.",
          "Training guidance will be posted in level groups.",
          "Details (date, venue, events, sign-up, and rules) will be announced in Announcements.",
        ],
      },
      {
        type: "paragraph",
        text: "We’ll also run periodic challenges (e.g., distance streaks, technique weeks) to keep motivation high.",
      },
    ],
  },
  {
    title: "6. 📸 Content Sharing (Videos/Photos) & Feedback",
    content: [
      {
        type: "list",
        items: [
          "Share to learn: Short clips for form checks are welcome.",
          "Consent first: Only post your own images/videos or those of others with their permission.",
          "Be constructive: Use specific, encouraging feedback (e.g., “Try a higher elbow catch on your pull”).",
          "No ridicule or body-shaming. Ever.",
        ],
      },
    ],
  },
  {
    title: "7. 🎒 Equipment & Gear",
    content: [
      {
        type: "list",
        items: [
          "Attire: Proper swimwear is required.",
          "Shared items: Use SwimBuddz gear (kickboards, fins, pull buoys) responsibly. Return after use and report any damage.",
          "Recommended basics: Goggles, swim cap (where required), water bottle, and small towel.",
          "Optional training aids: Fins, kickboard, pull buoy, or snorkel — ask your level lead for suggestions.",
        ],
      },
    ],
  },
  {
    title: "8. 🚫 Community Etiquette",
    content: [
      { type: "paragraph", text: "To keep the group clean, fun, and focused:" },
      {
        type: "list",
        items: [
          "Avoid spam, chain messages, or unrelated promotions.",
          "Refrain from offensive jokes, adult content, or political/religious debates.",
          "Keep discussions within the group’s swimming focus.",
          "If you wish to post something commercial (e.g., swim gear for sale), please get admin approval first.",
          "Do not add people to any group without admin consent.",
        ],
      },
    ],
  },
  {
    title: "9. ⚠️ Safety Guidelines",
    content: [
      {
        type: "list",
        items: [
          "Swim at your own risk: Swimming carries inherent risks. Participate within your ability.",
          "Know your limits: If unsure about a set or depth, sit out or modify.",
          "Health conditions: If you have a medical condition (e.g., asthma, epilepsy), inform an admin privately and carry needed medication (e.g., inhaler, EpiPen).",
          "Diving: Only where permitted and safe — check depth and follow pool rules.",
          "Never swim alone if you’re a beginner.",
        ],
      },
      { type: "subtitle", text: "Emergencies:" },
      {
        type: "list",
        items: [
          "Stay calm and follow lifeguards or session leads.",
          "Know where exits and safety equipment are located.",
          "Report incidents or hazards to admins immediately.",
        ],
      },
    ],
  },
  {
    title: "10. 💬 Promotions, Sales & External Links",
    content: [
      {
        type: "list",
        items: [
          "No unsolicited promotions (products, classes, or unrelated events).",
          "For-sale posts (e.g., used fins) require admin approval and must be honest and relevant.",
          "Coaches or vendors offering services must get admin clearance and clearly label any commercial posts.",
        ],
      },
    ],
  },
  {
    title: "11. 👶 Children & Safeguarding",
    content: [
      {
        type: "list",
        items: [
          "Children may only join sessions explicitly designated for them.",
          "They must be supervised by a parent or guardian unless the session is officially structured and supervised.",
          "Parents/guardians are responsible for the child’s safety and behavior.",
        ],
      },
    ],
  },
  {
    title: "12. ⚖️ Admins, Moderation & Enforcement",
    content: [
      {
        type: "paragraph",
        text: "To protect the group’s safety and focus, admins may:",
      },
      {
        type: "list",
        items: [
          "Give a gentle reminder (on-topic or tone nudge).",
          "Use message moderation (delete or redirect) or issue a temporary mute.",
          "Issue a formal warning for continued issues.",
          "Remove members for serious or repeated violations, including harassment, off-topic spam, or sharing private media without consent.",
          "Act immediately in severe cases.",
        ],
      },
    ],
  },
  {
    title: "13. 📢 Announcements & Updates",
    content: [
      {
        type: "list",
        items: [
          "Announcements channel: For official updates on schedules, events, and rule changes. Keep notifications on.",
          "Change notifications: Major updates will be summarized and shared in the group.",
        ],
      },
      {
        type: "paragraph",
        text: "Version control: The latest guidelines are always available at the shared document link.",
      },
      { type: "link", text: "Open the Google Doc", href: guidelinesDocUrl },
    ],
  },
  {
    title: "14. 📝 Agreement",
    content: [
      {
        type: "paragraph",
        text: "By joining and participating in SwimBuddz, you confirm that you have read and agree to follow these community guidelines.",
      },
    ],
  },
];

export default function GuidelinesPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
          Community rules
        </p>
        <h1 className="text-4xl font-bold text-slate-900">
          🏊‍♂️ SwimBuddz Community Rules &amp; Safety Guidelines
        </h1>
        <p className="text-base text-slate-600">
          Last Updated: 19 October, 2025
        </p>
        <p className="text-lg text-slate-600">
          Our mission is to build a fun, supportive, and safe community that
          helps swimmers at every level improve, stay consistent, and enjoy the
          water. By participating in SwimBuddz activities or group discussions,
          you agree to follow the guidelines below.
        </p>
      </header>

      <section className="space-y-8">
        {sections.map((section) => (
          <article
            key={section.title}
            className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-2xl font-semibold text-slate-900">
              {section.title}
            </h2>
            {section.content.map((block, index) => {
              if (block.type === "paragraph") {
                return (
                  <p key={index} className="text-slate-700">
                    {block.text}
                  </p>
                );
              }

              if (block.type === "subtitle") {
                return (
                  <p
                    key={index}
                    className="text-sm font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {block.text}
                  </p>
                );
              }

              if (block.type === "list") {
                return (
                  <ul
                    key={index}
                    className="list-disc space-y-1 pl-5 text-slate-700"
                  >
                    {block.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                );
              }

              if (block.type === "link") {
                return (
                  <Link
                    key={index}
                    href={block.href}
                    target="_blank"
                    className="inline-flex text-sm font-semibold text-cyan-700 hover:underline"
                  >
                    {block.text} &rarr;
                  </Link>
                );
              }

              return null;
            })}
          </article>
        ))}
      </section>

      <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Contact</h2>
        <p className="text-slate-700">Daniel Nwachukwu</p>
        <p className="text-sm text-slate-600">
          📧 Email: contactugodaniels@gmail.com
        </p>
        <p className="text-sm text-slate-600">📞 Phone: +234 703 358 8400</p>
      </section>
    </div>
  );
}
