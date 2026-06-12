import { ChevronDown, Info } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Collapsible "how this works" panel shown on the availability + make-up pages
 * so coaches, learners and admins all see the same rules. Content mirrors the
 * Missed Session & Make-Up Policy (§4): reschedule needs a reason, 24h notice,
 * one grace/term, 14-day window, one outstanding make-up, 48h spacing.
 */
type Audience = "coach" | "learner" | "admin";

const CONTENT: Record<Audience, { title: string; points: ReactNode[] }> = {
  coach: {
    title: "How your availability is used",
    points: [
      <>
        The times you publish are offered to learners who need to{" "}
        <strong>make up a missed lesson</strong> — we slice them into bookable
        slots, minus your blackout dates and the sessions you already run.
      </>,
      <>
        You decide only two things: <strong>are you free</strong> and{" "}
        <strong>is the spacing right</strong>. Admin handles eligibility,
        booking and payment.
      </>,
      <>
        We keep at least <strong>48 hours between any one learner&rsquo;s
        sessions</strong> (or your own minimum, set below) and avoid{" "}
        <strong>back-to-back days</strong> unless you approve — spaced practice
        helps swimmers progress.
      </>,
      <>
        No calendar yet? Learners can still join your existing sessions that
        have room — publishing availability just adds dedicated make-up slots.
      </>,
      <>
        All scheduling runs through SwimBuddz, so there&rsquo;s no need to
        arrange make-ups privately.
      </>,
    ],
  },
  learner: {
    title: "How make-ups work",
    points: [
      <>
        Missed a lesson? You can make it up — either in a{" "}
        <strong>dedicated slot</strong> with your coach or by{" "}
        <strong>joining one of their sessions</strong> that has room.
      </>,
      <>
        A reschedule needs a <strong>genuine reason</strong>. With{" "}
        <strong>24 hours&rsquo; notice or more</strong> there&rsquo;s no
        penalty; a last-minute change or no-show uses up that lesson — unless
        you still have your <strong>one grace</strong> for the term (for real
        emergencies).
      </>,
      <>
        Book and take your make-up <strong>within 2 weeks</strong> (or before
        your term ends, whichever comes first), and{" "}
        <strong>one at a time</strong> — clear it before booking another.
      </>,
      <>
        We keep your sessions at least <strong>48 hours apart</strong> so your
        skills settle, so we might suggest a better-spaced day than the one you
        first picked.
      </>,
    ],
  },
  admin: {
    title: "Booking rules (quick reference)",
    points: [
      <>
        <strong>Reschedule:</strong> needs a genuine reason. 24h+ notice → no
        penalty; under 24h or a no-show → forfeited, unless grace applies.
      </>,
      <>
        <strong>Grace:</strong> one per learner per block (cohort term).
      </>,
      <>
        <strong>Window:</strong> booked + taken within the block or{" "}
        <strong>14 days</strong>, whichever comes first.{" "}
        <strong>One outstanding</strong> make-up per learner.
      </>,
      <>
        <strong>Spacing:</strong> <strong>48h</strong> minimum between a
        learner&rsquo;s sessions (or the coach&rsquo;s override); no back-to-back
        days unless the coach approves — flagged here, not blocked.
      </>,
    ],
  },
};

export function MakeupGuidelines({ audience }: { audience: Audience }) {
  const { title, points } = CONTENT[audience];
  return (
    <details
      open
      className="group rounded-lg border border-cyan-100 bg-cyan-50/60 p-4"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-cyan-900 [&::-webkit-details-marker]:hidden">
        <Info className="h-5 w-5 shrink-0 text-cyan-600" />
        <span>{title}</span>
        <ChevronDown className="ml-auto h-4 w-4 text-cyan-600 transition-transform group-open:rotate-180" />
      </summary>
      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        {points.map((p, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden className="text-cyan-500">
              •
            </span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
