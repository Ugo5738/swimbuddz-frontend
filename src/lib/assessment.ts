// ---------------------------------------------------------------------------
// Swim Readiness Assessment – types, question data, scoring, and utilities
// ---------------------------------------------------------------------------

// ── Types ──────────────────────────────────────────────────────────────────

export type AssessmentDimension =
  | "water_comfort"
  | "floating"
  | "breathing"
  | "kicking"
  | "arm_stroke"
  | "distance"
  | "deep_water"
  | "treading"
  | "stroke_knowledge"
  | "consistency";

export type SwimLevel = "non_swimmer" | "beginner" | "developing" | "intermediate" | "advanced";

export type AssessmentOption = {
  label: string;
  score: number;
  emoji: string;
};

export type AssessmentQuestion = {
  id: string;
  dimension: AssessmentDimension;
  question: string;
  subtitle?: string;
  options: AssessmentOption[];
};

export type DimensionInfo = {
  id: AssessmentDimension;
  label: string;
  shortLabel: string;
  icon: string;
  maxScore: number;
};

export type DimensionScore = {
  dimension: AssessmentDimension;
  label: string;
  icon: string;
  score: number;
  maxScore: number;
  percentage: number;
  rating: "strong" | "moderate" | "needs_work";
};

export type Recommendation = {
  title: string;
  description: string;
  dimension: AssessmentDimension;
  ctaType: "academy" | "club" | "community" | "tip";
};

export type LevelMeta = {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  ringColor: string;
};

export type AssessmentResult = {
  totalScore: number;
  rawScore: number;
  maxPossibleScore: number;
  level: SwimLevel;
  levelLabel: string;
  levelDescription: string;
  dimensions: DimensionScore[];
  strengths: DimensionScore[];
  weaknesses: DimensionScore[];
  recommendations: Recommendation[];
};

// ── Dimension metadata ─────────────────────────────────────────────────────

export const DIMENSION_INFO: Record<AssessmentDimension, DimensionInfo> = {
  water_comfort: {
    id: "water_comfort",
    label: "Water Comfort",
    shortLabel: "Comfort",
    icon: "💧",
    maxScore: 6, // 2 questions × max 3
  },
  floating: {
    id: "floating",
    label: "Floating Ability",
    shortLabel: "Floating",
    icon: "🫧",
    maxScore: 3,
  },
  breathing: {
    id: "breathing",
    label: "Breathing Control",
    shortLabel: "Breathing",
    icon: "💨",
    maxScore: 6, // 2 questions × max 3
  },
  kicking: {
    id: "kicking",
    label: "Kicking Ability",
    shortLabel: "Kicking",
    icon: "🦵",
    maxScore: 3,
  },
  arm_stroke: {
    id: "arm_stroke",
    label: "Arm Stroke",
    shortLabel: "Arms",
    icon: "💪",
    maxScore: 3,
  },
  distance: {
    id: "distance",
    label: "Distance",
    shortLabel: "Distance",
    icon: "📏",
    maxScore: 4,
  },
  deep_water: {
    id: "deep_water",
    label: "Deep Water",
    shortLabel: "Deep",
    icon: "🌊",
    maxScore: 3,
  },
  treading: {
    id: "treading",
    label: "Treading Water",
    shortLabel: "Treading",
    icon: "⏱️",
    maxScore: 3,
  },
  stroke_knowledge: {
    id: "stroke_knowledge",
    label: "Stroke Knowledge",
    shortLabel: "Strokes",
    icon: "🏊",
    maxScore: 4,
  },
  consistency: {
    id: "consistency",
    label: "Consistency",
    shortLabel: "Frequency",
    icon: "🔥",
    maxScore: 4,
  },
};

// ── Questions ──────────────────────────────────────────────────────────────

export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  {
    id: "water_comfort",
    dimension: "water_comfort",
    question: "How do you feel about getting into a swimming pool?",
    subtitle: "Be honest — there's no wrong answer",
    options: [
      { label: "I avoid water entirely or feel very anxious", score: 0, emoji: "😰" },
      { label: "I can get in but stay in the shallow end", score: 1, emoji: "😬" },
      { label: "I'm comfortable in chest-deep water", score: 2, emoji: "🙂" },
      { label: "I'm comfortable anywhere in the pool", score: 3, emoji: "😎" },
    ],
  },
  {
    id: "face_in_water",
    dimension: "breathing",
    question: "Can you put your face in the water and blow bubbles?",
    subtitle: "Breathing control is the foundation of swimming",
    options: [
      { label: "No, I can't put my face in water", score: 0, emoji: "🚫" },
      { label: "I can briefly, but it's uncomfortable", score: 1, emoji: "😣" },
      { label: "Yes, I can hold my breath and submerge", score: 2, emoji: "💨" },
      { label: "Yes, I can exhale underwater rhythmically", score: 3, emoji: "🫧" },
    ],
  },
  {
    id: "floating",
    dimension: "floating",
    question: "Can you float on your back without support?",
    options: [
      { label: "No, I sink or panic when I try", score: 0, emoji: "😟" },
      { label: "I can for a few seconds with help", score: 1, emoji: "🤞" },
      { label: "I can float for about 30 seconds", score: 2, emoji: "👍" },
      { label: "I can float comfortably for over a minute", score: 3, emoji: "⭐" },
    ],
  },
  {
    id: "kicking",
    dimension: "kicking",
    question: "How would you describe your kicking ability?",
    subtitle: "Think about flutter kick — alternating legs up and down",
    options: [
      { label: "I don't know how to kick properly in water", score: 0, emoji: "❓" },
      { label: "I can kick holding the wall or a board, but it's tiring", score: 1, emoji: "🦵" },
      { label: "I can kick across the pool with a kickboard", score: 2, emoji: "💪" },
      { label: "I have a strong, efficient kick that propels me well", score: 3, emoji: "🚀" },
    ],
  },
  {
    id: "arm_stroke",
    dimension: "arm_stroke",
    question: "Can you swim using your arms in any recognizable stroke?",
    options: [
      { label: "No, I don't know any arm movements for swimming", score: 0, emoji: "🤷" },
      { label: "I do a basic dog paddle or survival stroke", score: 1, emoji: "🐕" },
      { label: "I can do a rough freestyle or breaststroke", score: 2, emoji: "🏊" },
      { label: "I swim with proper technique in at least one stroke", score: 3, emoji: "✅" },
    ],
  },
  {
    id: "distance",
    dimension: "distance",
    question: "How far can you swim without stopping?",
    subtitle: "A standard pool length is 25 meters",
    options: [
      { label: "I can't swim any distance", score: 0, emoji: "0️⃣" },
      { label: "Less than one pool length (under 25m)", score: 1, emoji: "🏁" },
      { label: "1–4 pool lengths (25m–100m)", score: 2, emoji: "📏" },
      { label: "More than 4 lengths (100m+) without stopping", score: 3, emoji: "🏅" },
      { label: "I can swim 400m+ comfortably", score: 4, emoji: "🌊" },
    ],
  },
  {
    id: "deep_water",
    dimension: "deep_water",
    question: "How do you feel in water where you can't touch the bottom?",
    options: [
      { label: "I've never been in deep water or I avoid it completely", score: 0, emoji: "⛔" },
      { label: "I feel very anxious and need to hold something", score: 1, emoji: "😰" },
      { label: "I'm okay for short periods but prefer shallow water", score: 2, emoji: "🆗" },
      { label: "I'm completely comfortable in deep water", score: 3, emoji: "🌊" },
    ],
  },
  {
    id: "treading",
    dimension: "treading",
    question: "Can you tread water (stay afloat in one place)?",
    options: [
      { label: "No, I can't tread water at all", score: 0, emoji: "❌" },
      { label: "I can stay up for a few seconds", score: 1, emoji: "⏱️" },
      { label: "I can tread for about 30 seconds to a minute", score: 2, emoji: "⏳" },
      { label: "I can tread water comfortably for several minutes", score: 3, emoji: "💎" },
    ],
  },
  {
    id: "stroke_knowledge",
    dimension: "stroke_knowledge",
    question: "How many swimming strokes can you perform?",
    subtitle: "Freestyle, backstroke, breaststroke, butterfly",
    options: [
      { label: "None — I can't swim any recognized stroke", score: 0, emoji: "0️⃣" },
      { label: "I can do 1 stroke (even if imperfect)", score: 1, emoji: "1️⃣" },
      { label: "I can do 2 strokes", score: 2, emoji: "2️⃣" },
      { label: "I can do 3 strokes", score: 3, emoji: "3️⃣" },
      { label: "I can do all 4 competitive strokes", score: 4, emoji: "4️⃣" },
    ],
  },
  {
    id: "breathing_while_swimming",
    dimension: "breathing",
    question: "Can you breathe properly while swimming?",
    subtitle: "For example, turning your head to breathe during freestyle",
    options: [
      { label: "I don't swim, so this doesn't apply", score: 0, emoji: "➖" },
      { label: "I lift my head up to breathe (not turning)", score: 1, emoji: "🙄" },
      { label: "I can turn to breathe but lose my rhythm", score: 2, emoji: "🔄" },
      { label: "I breathe smoothly on one or both sides", score: 3, emoji: "🎯" },
    ],
  },
  {
    id: "frequency",
    dimension: "consistency",
    question: "How often do you swim?",
    options: [
      { label: "Never or almost never", score: 0, emoji: "🚫" },
      { label: "A few times a year (holidays only)", score: 1, emoji: "🏖️" },
      { label: "A few times a month", score: 2, emoji: "📅" },
      { label: "At least once a week", score: 3, emoji: "🔥" },
      { label: "Multiple times per week", score: 4, emoji: "⚡" },
    ],
  },
  {
    id: "confidence",
    dimension: "water_comfort",
    question: "If a friend invited you to swim at a pool party, how would you react?",
    subtitle: "Your gut reaction matters here",
    options: [
      { label: "I'd avoid the pool entirely", score: 0, emoji: "🙈" },
      { label: "I'd sit by the edge and maybe dip my feet", score: 1, emoji: "🦶" },
      { label: "I'd get in but stay where I can stand", score: 2, emoji: "🤔" },
      { label: "I'd jump right in and swim around", score: 3, emoji: "🎉" },
    ],
  },
];

/** Set of valid question IDs (useful for server-side validation) */
export const VALID_QUESTION_IDS = new Set(ASSESSMENT_QUESTIONS.map((q) => q.id));

// ── Level metadata ─────────────────────────────────────────────────────────

export const LEVEL_META: Record<SwimLevel, LevelMeta> = {
  non_swimmer: {
    label: "Non-Swimmer",
    description:
      "You're at the very beginning of your swimming journey. The good news? Everyone starts somewhere, and SwimBuddz Academy is designed exactly for you.",
    color: "text-rose-700",
    bgColor: "bg-rose-50",
    ringColor: "stroke-rose-500",
  },
  beginner: {
    label: "Beginner",
    description:
      "You have some water exposure but haven't developed core swimming skills yet. A structured program would accelerate your progress significantly.",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    ringColor: "stroke-amber-500",
  },
  developing: {
    label: "Developing Swimmer",
    description:
      "You've got the basics but there's room to build confidence and technique. You're ready for more structured practice.",
    color: "text-cyan-700",
    bgColor: "bg-cyan-50",
    ringColor: "stroke-cyan-500",
  },
  intermediate: {
    label: "Intermediate Swimmer",
    description:
      "You can swim and have solid fundamentals. Now it's about refining technique, building endurance, and joining a community of swimmers.",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    ringColor: "stroke-blue-500",
  },
  advanced: {
    label: "Advanced Swimmer",
    description:
      "You're a confident, skilled swimmer. You'd thrive in structured training with other strong swimmers who push each other.",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    ringColor: "stroke-emerald-500",
  },
};

// ── Scoring ────────────────────────────────────────────────────────────────

export const MAX_RAW_SCORE = Object.values(DIMENSION_INFO).reduce((sum, d) => sum + d.maxScore, 0); // 39

export function scoreToLevel(totalScore: number): SwimLevel {
  if (totalScore <= 15) return "non_swimmer";
  if (totalScore <= 35) return "beginner";
  if (totalScore <= 55) return "developing";
  if (totalScore <= 80) return "intermediate";
  return "advanced";
}

export function calculateDimensionScores(answers: Record<string, number>): DimensionScore[] {
  return Object.values(DIMENSION_INFO).map((dim) => {
    const questions = ASSESSMENT_QUESTIONS.filter((q) => q.dimension === dim.id);
    const score = questions.reduce((sum, q) => sum + (answers[q.id] ?? 0), 0);
    const percentage = Math.round((score / dim.maxScore) * 100);
    const rating: DimensionScore["rating"] =
      percentage >= 67 ? "strong" : percentage >= 34 ? "moderate" : "needs_work";

    return {
      dimension: dim.id,
      label: dim.label,
      icon: dim.icon,
      score,
      maxScore: dim.maxScore,
      percentage,
      rating,
    };
  });
}

export function calculateResults(answers: Record<string, number>): AssessmentResult {
  const dimensions = calculateDimensionScores(answers);
  const rawScore = dimensions.reduce((sum, d) => sum + d.score, 0);
  const totalScore = Math.round((rawScore / MAX_RAW_SCORE) * 100);

  const sorted = [...dimensions].sort((a, b) => b.percentage - a.percentage);
  const strengths = sorted.slice(0, 3);
  const weaknesses = [...sorted].reverse().slice(0, 3);

  const level = scoreToLevel(totalScore);
  const meta = LEVEL_META[level];

  const recommendations = generateRecommendations(dimensions, level);

  return {
    totalScore,
    rawScore,
    maxPossibleScore: MAX_RAW_SCORE,
    level,
    levelLabel: meta.label,
    levelDescription: meta.description,
    dimensions,
    strengths,
    weaknesses,
    recommendations,
  };
}

// ── Recommendations ────────────────────────────────────────────────────────

const DIMENSION_RECS: Record<AssessmentDimension, Recommendation> = {
  water_comfort: {
    title: "Build water confidence gradually",
    description:
      "Start by spending time in shallow water. Practice submerging your shoulders, then chin, then face. A patient coach makes all the difference.",
    dimension: "water_comfort",
    ctaType: "academy",
  },
  floating: {
    title: "Learn to float — it changes everything",
    description:
      "Floating is the foundation skill. Practice with a partner supporting your back. Once you can float, the rest of swimming gets much easier.",
    dimension: "floating",
    ctaType: "academy",
  },
  breathing: {
    title: "Master breathing technique",
    description:
      "Practice blowing bubbles with your face in water. Then try rhythmic breathing: exhale underwater, inhale when you turn. This is the skill most beginners struggle with.",
    dimension: "breathing",
    ctaType: "academy",
  },
  kicking: {
    title: "Strengthen your kick",
    description:
      "Use a kickboard to isolate your legs. Focus on kicking from the hips with relaxed ankles, not from the knees. Consistent practice builds endurance fast.",
    dimension: "kicking",
    ctaType: "tip",
  },
  arm_stroke: {
    title: "Develop your arm technique",
    description:
      "Start with freestyle arms: reach forward, pull through the water, recover over the surface. A coach can spot and correct issues you can't feel yourself.",
    dimension: "arm_stroke",
    ctaType: "academy",
  },
  distance: {
    title: "Build your swimming endurance",
    description:
      "Swim short distances with rest breaks, gradually increasing. Even swimming one extra length per week adds up. Consistency beats intensity.",
    dimension: "distance",
    ctaType: "club",
  },
  deep_water: {
    title: "Get comfortable in deep water",
    description:
      "Deep water confidence comes from trust in your floating and treading skills. Practice in progressively deeper water with a buddy or coach nearby.",
    dimension: "deep_water",
    ctaType: "academy",
  },
  treading: {
    title: "Learn to tread water",
    description:
      "Treading water is a safety skill. Practice the eggbeater kick or scissor kick in chest-deep water first, then gradually move deeper.",
    dimension: "treading",
    ctaType: "academy",
  },
  stroke_knowledge: {
    title: "Expand your stroke repertoire",
    description:
      "Learning multiple strokes develops a more balanced swimmer. Backstroke is often the easiest to learn after freestyle. Each stroke works different muscles.",
    dimension: "stroke_knowledge",
    ctaType: "club",
  },
  consistency: {
    title: "Swim more regularly",
    description:
      "Swimming once a week is the minimum to retain and build skills. A community with scheduled sessions gives you the accountability to show up consistently.",
    dimension: "consistency",
    ctaType: "community",
  },
};

function generateRecommendations(dimensions: DimensionScore[], level: SwimLevel): Recommendation[] {
  const recs: Recommendation[] = [];

  // Add dimension-specific recs for weak areas (top 3 weakest)
  const weakDims = dimensions
    .filter((d) => d.rating === "needs_work")
    .sort((a, b) => a.percentage - b.percentage);

  for (const dim of weakDims.slice(0, 3)) {
    recs.push(DIMENSION_RECS[dim.dimension]);
  }

  // If fewer than 3 weak dims, add moderate ones
  if (recs.length < 3) {
    const moderateDims = dimensions
      .filter((d) => d.rating === "moderate")
      .sort((a, b) => a.percentage - b.percentage);
    for (const dim of moderateDims.slice(0, 3 - recs.length)) {
      recs.push(DIMENSION_RECS[dim.dimension]);
    }
  }

  // Add a level-appropriate CTA
  if (level === "non_swimmer" || level === "beginner") {
    recs.push({
      title: "Join SwimBuddz Academy",
      description:
        "Our structured beginner program takes you from zero to swimming confidently. Small groups, patient coaches, real progress.",
      dimension: "water_comfort",
      ctaType: "academy",
    });
  } else if (level === "developing") {
    recs.push({
      title: "Level up with SwimBuddz",
      description:
        "You're ready for structured training. The Academy refines your technique while the Club builds your endurance and community.",
      dimension: "distance",
      ctaType: "academy",
    });
  } else {
    recs.push({
      title: "Join SwimBuddz Club",
      description:
        "Train with other strong swimmers. Structured sessions, technique coaching, and a community that pushes you to get better.",
      dimension: "consistency",
      ctaType: "club",
    });
  }

  return recs;
}

// ── CTA helpers ────────────────────────────────────────────────────────────

export function getLevelCTA(level: SwimLevel): {
  text: string;
  href: string;
  secondaryText: string;
  secondaryHref: string;
} {
  switch (level) {
    case "non_swimmer":
      return {
        text: "Join SwimBuddz Academy",
        href: "/academy?ref=assessment",
        secondaryText: "Start with Community",
        secondaryHref: "/community?ref=assessment",
      };
    case "beginner":
      return {
        text: "Start Your Swimming Journey",
        href: "/academy?ref=assessment",
        secondaryText: "Explore Community",
        secondaryHref: "/community?ref=assessment",
      };
    case "developing":
      return {
        text: "Level Up with Academy",
        href: "/academy?ref=assessment",
        secondaryText: "Join the Club",
        secondaryHref: "/club?ref=assessment",
      };
    case "intermediate":
      return {
        text: "Join SwimBuddz Club",
        href: "/club?ref=assessment",
        secondaryText: "Explore Academy",
        secondaryHref: "/academy?ref=assessment",
      };
    case "advanced":
      return {
        text: "Train with SwimBuddz Club",
        href: "/club?ref=assessment",
        secondaryText: "Explore Academy",
        secondaryHref: "/academy?ref=assessment",
      };
  }
}

export function getCtaHref(ctaType: Recommendation["ctaType"]): string {
  switch (ctaType) {
    case "academy":
      return "/academy?ref=assessment";
    case "club":
      return "/club?ref=assessment";
    case "community":
      return "/community?ref=assessment";
    case "tip":
      return "/assessment/quiz"; // retake
  }
}
