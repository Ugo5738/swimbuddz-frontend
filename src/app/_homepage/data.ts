// Static data arrays extracted from `src/app/page.tsx` during the
// file-size sweep. Hand-edited copy lives here; render lives in page.tsx.

import { type SpotlightData } from "@/lib/volunteers";

export const whoSwimBudzIsFor = [
  {
    title: "Beginners",
    description: "Never swum before? Neither had most of us. Start here.",
    icon: "🌊",
    gradient: "from-cyan-400 to-blue-500",
    link: "/academy",
  },
  {
    title: "Fitness Swimmers",
    description: "Ready to get serious? Train with swimmers who push each other.",
    icon: "💪",
    gradient: "from-emerald-400 to-teal-500",
    link: "/club",
  },
  {
    title: "Advanced & Open Water",
    description: "You can swim. Now go further — open water, challenges, competitions.",
    icon: "🏊",
    gradient: "from-purple-400 to-indigo-500",
    link: "/club",
  },
];

export const tiers = [
  {
    name: "Community",
    description: "Connect with swimming enthusiasts across Lagos and beyond in a welcoming space.",
    price: "₦20,000",
    pricePeriod: "/year",
    priceSubtext: "Less than ₦400/week for a full community",
    benefits: [
      "Access to Global Community Network",
      "Community Events & Socials",
      "Swim tips & education",
      "Community group chats",
      "SwimBuddz merchandise access",
    ],
    cta: "Start with Community",
    link: "/community",
    accent: "cyan",
  },
  {
    name: "Club",
    description:
      "For swimmers ready to make swimming a lifestyle with structured, ongoing training.",
    price: "From ₦42,500",
    pricePeriod: "",
    priceSubtext: "Includes everything in Community",
    benefits: [
      "Regular training exercises",
      "Track your times & performance",
      "Team culture & challenges",
      "Exclusive club events",
      "Everything in Community",
    ],
    cta: "Start Training",
    link: "/club",
    accent: "blue",
    featured: true,
  },
  {
    name: "Academy",
    description:
      "A structured program with curriculum, assessments, and certification for learners.",
    price: "From ₦50,000",
    pricePeriod: "",
    priceSubtext: "Limited spots per cohort",
    benefits: [
      "Structured curriculum & milestones",
      "Coach-assigned drills and goals",
      "Certification",
      "Cohort-based program",
      "Everything in Community & Club",
    ],
    cta: "Apply for Next Cohort",
    link: "/academy",
    accent: "purple",
  },
];

// Full comparison features for the expandable table
export const comparisonFeatures = [
  { label: "Global Community Network", community: true, club: true, academy: true },
  { label: "Community Events & Socials", community: true, club: true, academy: true },
  { label: "Swim tips & education", community: true, club: true, academy: true },
  { label: "Community group chats", community: true, club: true, academy: true },
  { label: "SwimBuddz merchandise access", community: true, club: true, academy: true },
  { label: "Regular training sessions", community: false, club: true, academy: true },
  { label: "Performance tracking", community: false, club: true, academy: true },
  { label: "Team challenges", community: false, club: true, academy: true },
  { label: "Exclusive club events", community: false, club: true, academy: true },
  { label: "Structured curriculum", community: false, club: false, academy: true },
  { label: "Coach-assigned drills & goals", community: false, club: false, academy: true },
  { label: "Certification", community: false, club: false, academy: true },
  { label: "Cohort-based program", community: false, club: false, academy: true },
];

export const howItWorks = [
  {
    step: "1",
    title: "Join the Community",
    description:
      "Create your profile, choose your tier, and get plugged into announcements & groups.",
  },
  {
    step: "2",
    title: "Pick Your Path",
    description: "Join Club training sessions or enroll in Academy cohorts when you're ready.",
  },
  {
    step: "3",
    title: "Show Up Consistently",
    description: "Attend sessions, practice drills, and track your progress.",
  },
  {
    step: "4",
    title: "See Real Progress",
    description: "Track your improvement, earn Bubbles, and celebrate milestones with the pod.",
  },
];

// Default placeholder hero images (used when no admin-uploaded banners exist)
export const defaultHeroImages = [
  "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1920&q=80",
  "https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=1920&q=80",
  "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1920&q=80",
];

export const trustBadgeMessages = [
  "Nigeria's first swimming community",
  "Building globally • Currently active in Lagos",
];

// Fallback spotlight data shown when the API is unavailable
export const FALLBACK_SPOTLIGHT: SpotlightData = {
  featured_volunteer: {
    member_id: "fallback",
    member_name: "Join Our Volunteer Team",
    profile_photo_url: null,
    spotlight_quote:
      "Be part of something special — help build Nigeria's swimming community from the ground up.",
    recognition_tier: null,
    total_hours: 0,
    preferred_roles: [],
  },
  total_active_volunteers: 2,
  total_hours_all_time: 0,
  milestones_this_month: [],
  top_volunteers: [],
};

export type GalleryPhoto = {
  id: string;
  file_url: string;
  thumbnail_url?: string;
  title?: string;
};

export type VideoTestimonial = {
  id: string;
  file_url: string;
  name: string;
  role: string;
};
