import Link from "next/link";

export default function MembershipPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-10">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">Membership</p>
        <h1 className="text-3xl font-bold text-slate-900">How SwimBuddz membership works</h1>
        <p className="text-sm text-slate-600">
          Clear, simple rules for registration, onboarding, payments, and upgrades.
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Registration vs onboarding</h2>
        <ul className="space-y-2 text-sm text-slate-700">
          <li>
            <span className="font-semibold">Registration</span> creates your account and saves your intent (Community / Club / Academy).
          </li>
          <li>
            <span className="font-semibold">Onboarding</span> collects the extra details needed to serve you well (availability, preferences, readiness, etc).
          </li>
        </ul>
        <p className="text-sm text-slate-600">
          You can register quickly, then complete onboarding after you log in.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">The core rule: Community is the foundation</h2>
        <p className="text-sm text-slate-700">
          Everyone starts with Community. After you confirm your email and log in, you’ll activate your annual Community membership (₦5,000/year) to unlock member features.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">If you selected Club or Academy at signup</h2>
        <ol className="space-y-2 text-sm text-slate-700">
          <li>1) Confirm email → log in</li>
          <li>2) We’ll take you to your next step on your dashboard</li>
          <li>3) Activate Community (₦5,000/year) to unlock member features</li>
          <li>4) Complete onboarding / readiness checklist</li>
          <li>5) Request upgrade (approval may be required)</li>
          <li>6) Pay when you activate Club or enroll in an Academy cohort</li>
        </ol>
        <p className="text-sm text-slate-600">
          Selecting Club/Academy during signup saves your request — it does not activate the tier immediately.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Payments and tier behavior</h2>
        <div className="space-y-3 text-sm text-slate-700">
          <p>
            <span className="font-semibold">Community</span> is annual (₦5,000/year) and unlocks member access.
          </p>
          <p>
            <span className="font-semibold">Club</span> is subscription-based. If you stop paying, Club access pauses and you fall back to Community (while your Community membership is still active).
          </p>
          <p>
            <span className="font-semibold">Academy</span> is cohort-based (program enrollment). When a cohort ends, Academy access ends, but you keep your membership history (e.g. Academy alumni).
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">Ready to join?</p>
        <p className="mt-1">
          Start with registration:{" "}
          <Link href="/register" className="font-semibold text-cyan-700 hover:underline">
            Create an account
          </Link>
          {" "}or{" "}
          <Link href="/login" className="font-semibold text-cyan-700 hover:underline">
            log in
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
