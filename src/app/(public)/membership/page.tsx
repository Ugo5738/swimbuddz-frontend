import Link from "next/link";

export default function MembershipPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-10">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
          Membership
        </p>
        <h1 className="text-3xl font-bold text-slate-900">
          How SwimBuddz membership works
        </h1>
        <p className="text-sm text-slate-600">
          Three tiers — Community, Club, Academy — with clear rules for
          registration, onboarding, payments, and upgrades.
        </p>
      </header>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          The three tiers
        </h2>
        <p className="text-sm text-slate-700">
          SwimBuddz has three membership types. Pick the one that fits where
          you are; you can upgrade later.
        </p>

        <div className="space-y-3">
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">
                Community
              </h3>
              <span className="text-sm font-semibold text-cyan-700">
                ₦20,000/year
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-700">
              The home base for everyone, regardless of swimming level. Open
              swim meetups, community events, and access to the broader
              SwimBuddz network. For people who can already swim and want to
              stay connected.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">Club</h3>
              <span className="text-sm font-semibold text-cyan-700">
                From ₦42,500/quarter
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-700">
              For people who want to swim together every week. Structured
              Saturday sessions, group challenges, and a crew that holds you
              accountable. Subscription-based — quarterly, 6-month, or
              12-month plans available. Includes Community access — no second
              fee.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">
                Academy
              </h3>
              <span className="text-sm font-semibold text-cyan-700">
                From ₦150,000 / 12-week cohort
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-700">
              Structured cohorts where you actually learn — beginner programs,
              stroke development, and competition prep depending on the level.
              Cohort-based with a fixed start and end date. Includes Club &
              Community access during the program, plus your first month of
              Club after graduation.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Registration vs onboarding
        </h2>
        <ul className="space-y-2 text-sm text-slate-700">
          <li>
            <span className="font-semibold">Registration</span> creates your
            account and saves your intent (Community / Club / Academy).
          </li>
          <li>
            <span className="font-semibold">Onboarding</span> collects the extra
            details needed to serve you well (availability, preferences,
            readiness, etc).
          </li>
        </ul>
        <p className="text-sm text-slate-600">
          You can register quickly, then complete onboarding after you log in.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          The core rule: every tier includes the one below
        </h2>
        <p className="text-sm text-slate-700">
          You pay for one tier, not many. Club includes Community access.
          Academy includes Club access during the program, plus your first
          month of Club after graduation. No fee stacking — pick the tier
          that fits where you are, and you get everything below it
          automatically.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          If you selected Club or Academy at signup
        </h2>
        <ol className="space-y-2 text-sm text-slate-700">
          <li>1) Confirm email → log in</li>
          <li>2) We’ll take you to your next step on your dashboard</li>
          <li>3) Complete onboarding / readiness checklist</li>
          <li>4) Request upgrade</li>
          <li>
            5) Pay your tier fee — Community access is included automatically,
            no separate payment
          </li>
        </ol>
        <p className="text-sm text-slate-600">
          Selecting Club/Academy during signup saves your request — it does not
          activate the tier immediately.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Payments and tier behavior
        </h2>
        <div className="space-y-3 text-sm text-slate-700">
          <p>
            <span className="font-semibold">Community</span> is annual
            (₦20,000/year) and unlocks member access — events, open meetups,
            and the broader network.
          </p>
          <p>
            <span className="font-semibold">Club</span> is subscription-based
            (quarterly, 6-month, or 12-month). The Club fee already includes
            Community access. If you stop paying for Club, you can continue on
            Community alone (₦20,000/year) to stay connected.
          </p>
          <p>
            <span className="font-semibold">Academy</span> is cohort-based
            (program enrollment). Your Academy fee includes Club access during
            the program plus your first month of Club after graduation. When
            the bridge month ends, you continue with Club, drop to Community,
            or pause — your choice.
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">Ready to join?</p>
        <p className="mt-1">
          Start with registration:{" "}
          <Link
            href="/register"
            className="font-semibold text-cyan-700 hover:underline"
          >
            Create an account
          </Link>{" "}
          or{" "}
          <Link
            href="/login"
            className="font-semibold text-cyan-700 hover:underline"
          >
            log in
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
