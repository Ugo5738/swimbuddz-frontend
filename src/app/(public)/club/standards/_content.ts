import {
  BarChart3,
  BookOpen,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Flag,
  HeartHandshake,
  MessageCircle,
  Scale,
  ShieldCheck,
  Users,
  Waves,
  type LucideIcon,
} from "lucide-react";

export type Standard = {
  id: string;
  number: string;
  title: string;
  icon: LucideIcon;
  intro: string;
  bullets?: string[];
  closing?: string;
  ordered?: string[];
  note?: string;
};

export const quickRead = [
  "Arrive prepared and ready to begin on time.",
  "Treat Club time as structured practice time.",
  "Listen during instructions and keep banter from delaying a set.",
  "Ask for help politely and support your training partners.",
  "Follow safety directions and report concerns immediately.",
  "Respect consent, personal boundaries and every swimmer's progress.",
];

export const sessionFlow = [
  { title: "Dryland", detail: "Mobility, activation and the safety briefing." },
  { title: "Warm-up", detail: "Easy swimming and controlled preparation drills." },
  {
    title: "Main set",
    detail: "A clear objective, distance, repetitions, rest and technique focus.",
  },
  { title: "Cool-down", detail: "Light movement that brings the intensity down gradually." },
  { title: "Review", detail: "What worked, what was difficult and the next personal target." },
  { title: "Closing", detail: "Announcements and a formal end from the session coordinator." },
];

export const standards: Standard[] = [
  {
    id: "purpose",
    number: "01",
    title: "Purpose of the Club",
    icon: Waves,
    intro:
      "SwimBuddz Club helps members practise consistently, improve their swimming and keep challenging their previous milestones. Club sessions are structured practice sessions—not casual pool meetups—while friendship, encouragement and light banter remain part of the experience.",
    closing: "The goal is simple: enjoy the water and make measurable progress.",
  },
  {
    id: "eligibility",
    number: "02",
    title: "Club eligibility",
    icon: CheckCircle2,
    intro: "Club is designed for swimmers who meet at least one of these requirements:",
    bullets: [
      "Can swim at least 25 metres independently.",
      "Graduated from SwimBuddz Academy with the basic swimming fundamentals.",
      "Have been assessed and approved by an authorised SwimBuddz coach or coordinator.",
    ],
    closing:
      "Members who are not yet ready may be guided to the Academy or additional lessons before joining Club practice.",
  },
  {
    id: "pods",
    number: "03",
    title: "Pods",
    icon: Users,
    intro:
      "Pods are small practice groups, normally around five swimmers, with a Pod Lead and an Assistant Pod Lead. They create accountability, coordination, encouragement and consistency.",
    bullets: [
      "Pods must not become cliques or tools for exclusion.",
      "Pod roles do not give anyone authority over another member's personal life.",
      "Membership may change as swimmers join, progress or change attendance patterns.",
    ],
    note: "The current pod roster is shared separately because it changes more often than these standards.",
  },
  {
    id: "pod-leads",
    number: "04",
    title: "Pod Lead responsibilities",
    icon: ClipboardCheck,
    intro: "Pod Leads and Assistant Pod Leads are expected to:",
    bullets: [
      "Understand the session plan and help members begin on time.",
      "Clarify instructions they understand and refer technical questions to a qualified coach.",
      "Coordinate partner drills and lane arrangements fairly.",
      "Encourage members without embarrassing, insulting or pressuring them.",
      "Report safety concerns, incidents and repeated attendance problems.",
      "Avoid favouritism, bullying, romantic pressure or abuse of their position.",
    ],
    note: "A Pod Lead is not automatically a swimming coach. Unsafe or highly technical drills require appropriate supervision.",
  },
  {
    id: "preparation",
    number: "05",
    title: "Session preparation",
    icon: BookOpen,
    intro:
      "The general plan should be shared before the session, preferably at least 24 hours ahead. Individual targets may be added where a swimmer needs them.",
    bullets: [
      "Review the session information and book correctly.",
      "Bring the required swimwear, water and training equipment.",
      "Arrive hydrated and physically prepared.",
      "Tell the coordinator about any relevant injury, illness or medical limitation.",
    ],
  },
  {
    id: "attendance",
    number: "07",
    title: "Attendance and punctuality",
    icon: Clock3,
    intro:
      "Your session details will state the official start or arrival time. Arrive before that time and be ready to begin. If a session has a grace period or a specific lateness consequence, it must be communicated before booking.",
    bullets: [
      "A swimmer who misses the safety briefing or warm-up may need an alternative warm-up or clearance before joining the main set.",
      "Repeated lateness, late cancellations or no-shows may affect booking priority, pod placement or continued participation.",
      "Tell the coordinator as early as possible when a genuine exception affects your arrival or attendance.",
    ],
    note: "No unannounced lateness fee or penalty will be applied.",
  },
  {
    id: "conduct",
    number: "08",
    title: "Conduct during practice",
    icon: MessageCircle,
    intro:
      "Encouragement and light banter are welcome, but conversation must not interrupt instructions, delay a drill, distract active swimmers or prevent another member from completing their session.",
    bullets: [
      "Ask politely when a drill requires a partner and cooperate fairly.",
      "Never mock or exclude someone because of their speed, body, appearance, fear level, technique or current ability.",
      "Do not use insulting, sexual, aggressive or disrespectful language.",
    ],
  },
  {
    id: "safety",
    number: "09",
    title: "Safety",
    icon: ShieldCheck,
    intro:
      "Directions from authorised coaches, coordinators, lifeguards and pool staff must be followed immediately.",
    bullets: [
      "Do not enter restricted areas or dive where diving is prohibited.",
      "Do not push, pull or deliberately submerge another swimmer.",
      "Do not attempt an unsafe drill without approval or attend while intoxicated.",
      "Do not conceal an injury or condition that creates an immediate safety risk.",
      "Report injury, breathing difficulty, dizziness, panic, collision or unsafe behaviour immediately.",
    ],
  },
  {
    id: "boundaries",
    number: "10",
    title: "Respect and personal boundaries",
    icon: HeartHandshake,
    intro: "SwimBuddz must remain respectful and safe. The following are prohibited:",
    bullets: [
      "Sexual comments about another member's body or swimwear, unwanted touching or inappropriate recording.",
      "Persistent romantic or sexual advances after disinterest has been shown.",
      "Bullying, intimidation, threats, insults, public humiliation, discrimination or deliberate exclusion.",
      "Using a leadership role to seek romantic, sexual, financial or personal favours.",
      "Favouring or punishing members because of a personal relationship.",
    ],
    closing:
      "Report uncomfortable or inappropriate conduct privately to an authorised coordinator.",
  },
  {
    id: "media",
    number: "11",
    title: "Photos and videos",
    icon: Camera,
    intro:
      "Media may be captured for progress tracking, community memories or SwimBuddz communications, with consent and care.",
    bullets: [
      "Tell members when recording is taking place.",
      "Obtain consent before using identifiable content publicly.",
      "Respect a member's request not to be recorded or posted.",
      "Never share private or embarrassing footage or content that sexualises, ridicules or misrepresents someone.",
    ],
  },
  {
    id: "progress",
    number: "12",
    title: "Progress measurement",
    icon: BarChart3,
    intro:
      "Progress may be measured through distance, repetitions, rest periods, technique consistency, breathing control, endurance, attendance and personal milestones.",
    closing:
      "Compare a swimmer primarily with their previous ability—not unfairly with stronger swimmers. Feedback should be specific, respectful and useful.",
  },
  {
    id: "reporting",
    number: "13",
    title: "Complaints and incident reporting",
    icon: Flag,
    intro:
      "Raise concerns early. A complaint may be made privately to the Club coordinator or another designated person, and serious complaints should be documented and handled discreetly.",
    closing:
      "No member should be punished or mocked for raising a genuine safety, harassment or conduct concern.",
  },
  {
    id: "corrective-action",
    number: "14",
    title: "Corrective action",
    icon: Scale,
    intro: "Depending on the seriousness and frequency of an issue, SwimBuddz may apply:",
    ordered: [
      "A private reminder.",
      "A formal warning.",
      "Temporary restriction from a session or activity.",
      "Suspension from the Club.",
      "Removal from the Club.",
    ],
    closing:
      "Serious safety violations, harassment, violence or deliberate misconduct may lead to immediate suspension during review. Corrective action protects members and the Club—it is not used to embarrass anyone.",
  },
];

export const contents = [
  ...standards.slice(0, 5),
  { id: "session-structure", number: "06", title: "Session structure" },
  ...standards.slice(5),
  { id: "commitment", number: "15", title: "Member commitment" },
];
