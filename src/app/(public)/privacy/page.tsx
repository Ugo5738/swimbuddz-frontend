import Link from "next/link";

const privacyDocUrl =
  "https://docs.google.com/document/d/12BZo7nlyxsE7UBY3-8v74YqXuG84fL7U56K4n39YgvE/edit?tab=t.0";

type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "link"; text: string; href: string };

type Section = {
  title: string;
  content: ContentBlock[];
};

const sections: Section[] = [
  {
    title: "1) Who We Are",
    content: [
      {
        type: "paragraph",
        text: "SwimBuddz (“we”, “us”, “our”) runs a community for swimming meetups, training, and events.",
      },
      { type: "paragraph", text: "Data Controller: Daniel Nwachukwu" },
      {
        type: "paragraph",
        text: "Contact: contactugodaniels@gmail.com | +234 703 358 8400",
      },
    ],
  },
  {
    title: "2) What We Collect (and what’s optional)",
    content: [
      {
        type: "list",
        items: [
          "Required for membership/coordination: Name, WhatsApp contact/phone, preferred contact email.",
          "Swimming profile (optional but helpful): Stated level (beginner/intermediate/advanced), strokes you’re working on.",
          "Attendance & logistics: Session RSVPs, check-ins, cancellations.",
          "Performance data (optional): Times, technique notes and Scorecards if you opt in.",
          "Emergency contact (optional but recommended): Name & phone.",
          "Media (optional): Photos/videos captured at activities (see Section 5).",
          "Meta-data: Timestamps and message content in our groups (WhatsApp policies apply).",
        ],
      },
    ],
  },
  {
    title: "3) How We Use Your Information",
    content: [
      {
        type: "list",
        items: [
          "Organise activities: plan sessions, lane allocations, competitions, and challenges.",
          "Communications: send reminders, updates, safety notices, changes/cancellations.",
          "Membership administration: manage level groups and eligibility (e.g., Intermediate/Expert checks).",
          "Safety: respond to incidents and contact your emergency contact if needed.",
          "Scorecards (opt-in): provide personalised progress tracking; private to you and authorised admins.",
          "Community improvements: anonymised/aggregated stats (e.g., participation counts, PBs).",
          "We do not sell your data.",
        ],
      },
    ],
  },
  {
    title: "4) Our Grounds for Using Your Data (plain English)",
    content: [
      {
        type: "list",
        items: [
          "We need it to run the group (organising sessions, contacting you about changes).",
          "You consent to optional things like scorecards and media. You can withdraw consent anytime.",
          "Safety & legal obligations (e.g., responding to incidents or lawful requests).",
        ],
      },
    ],
  },
  {
    title: "5) Photos & Videos (Consent and Opt-Out)",
    content: [
      {
        type: "list",
        items: [
          "We’ll ask before close-ups or identifiable features. General group shots may occur at events.",
          "Your choices: tell an admin “no photos of me,” or use the tag “MEDIA OPT-OUT.”",
          "We will avoid featuring you and will remove content we control if you ask.",
        ],
      },
    ],
  },
  {
    title: "6) Scorecards & Performance Data",
    content: [
      {
        type: "list",
        items: [
          "Opt-in only.",
          "Accessible to you and authorised admins/coaches who maintain it.",
          "Group sharing is aggregated/anonymised unless you give explicit consent.",
        ],
      },
    ],
  },
  {
    title: "7) Children & Teens",
    content: [
      {
        type: "list",
        items: [
          "Children may join only where a session is designated for them.",
          "A parent/guardian must supervise unless a structured supervised session says otherwise.",
          "We collect only what’s needed to run the session; guardian contact required.",
        ],
      },
    ],
  },
  {
    title: "8) Data Sharing",
    content: [
      {
        type: "paragraph",
        text: "Within SwimBuddz: Your name may appear on attendance lists/heat sheets.",
      },
      {
        type: "paragraph",
        text: "Vendors/Processors (to run the group): WhatsApp (group chat, announcements), Google Workspace (Forms/Drive/Sheets) for registration, attendance, scorecards, and cloud storage providers used by admins.",
      },
      {
        type: "paragraph",
        text: "We require any tools we use to implement reasonable security. We don’t share data for third-party marketing.",
      },
    ],
  },
  {
    title: "9) International Transfers",
    content: [
      {
        type: "paragraph",
        text: "Some tools may store data outside Nigeria. We choose reputable services and use settings/measures intended to protect your data.",
      },
    ],
  },
  {
    title: "10) Security",
    content: [
      {
        type: "list",
        items: [
          "Access to member data is restricted to authorised admins on a need-to-know basis.",
          "We use reasonable technical/admin safeguards (device locks, limited sharing, least-privilege access).",
          "If we learn of a risk or breach affecting your data, we’ll take steps to limit harm and notify impacted members where appropriate.",
        ],
      },
    ],
  },
  {
    title: "11) Retention",
    content: [
      {
        type: "list",
        items: [
          "Active members: keep core contact + participation info while you’re active.",
          "Inactive members: we aim to delete or anonymise routine data within 12 months of inactivity.",
          "Scorecards (opt-in): kept while you participate; deleted on request or within 3 months after you leave.",
          "Emergency contacts: deleted when you leave or on request.",
          "Media: kept while relevant for community history unless you opt-out or ask us to remove where feasible.",
        ],
      },
    ],
  },
  {
    title: "12) Your Rights",
    content: [
      {
        type: "list",
        items: [
          "Access & correction: ask what we hold about you and to fix inaccuracies.",
          "Deletion: ask us to delete data we don’t need to keep.",
          "Objection/Restriction: ask us to stop certain uses (e.g., marketing-style broadcasts) or limit processing.",
          "Withdraw consent: for scorecards or media at any time.",
          "To exercise any right, email contactugodaniels@gmail.com.",
        ],
      },
    ],
  },
  {
    title: "13) Admin Access & Governance",
    content: [
      {
        type: "paragraph",
        text: "A small number of admins maintain logistics (attendance, level groups, scorecards). All admins are expected to follow this policy; misuse can lead to admin removal.",
      },
    ],
  },
  {
    title: "14) Changes to This Policy",
    content: [
      {
        type: "paragraph",
        text: "We may update this Policy from time to time. We’ll post updates and a summary of changes in the Announcements group.",
      },
      {
        type: "link",
        text: "The latest version lives on Google Docs",
        href: privacyDocUrl,
      },
    ],
  },
  {
    title: "15) Contact",
    content: [
      { type: "paragraph", text: "Questions, concerns, or requests:" },
      {
        type: "paragraph",
        text: "Daniel Nwachukwu — contactugodaniels@gmail.com | +234 703 358 8400",
      },
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
          Privacy & trust
        </p>
        <h1 className="text-4xl font-bold text-slate-900">
          SwimBuddz Privacy Policy
        </h1>
        <p className="text-base text-slate-600">
          Last Updated: 19 October, 2025
        </p>
        <p className="text-lg text-slate-600">
          We collect only what SwimBuddz needs to run safe, coordinated
          sessions. Review the full policy below before onboarding.
        </p>
      </header>

      <section className="space-y-6">
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
    </div>
  );
}
