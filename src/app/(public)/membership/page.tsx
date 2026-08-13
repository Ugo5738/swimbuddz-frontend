import Link from "next/link";

const products = [
  {
    name: "Annual SwimBuddz Membership",
    price: "₦20,000/year",
    body: "Your base relationship with SwimBuddz: member identity, onboarding, community access, and the shared systems that support every programme.",
  },
  {
    name: "Club",
    price: "From ₦60,000/quarter",
    body: "Location-priced weekly practice, pods, programming, and progress tracking. Mid-quarter entry is adjusted when at least five sessions remain.",
  },
  {
    name: "Academy",
    price: "Published per programme or cohort",
    body: "Structured learning with a clear start, finish, and all-in learner price. Each programme can be open, require active annual membership, or include it in the published price.",
  },
  {
    name: "Community Experience",
    price: "Optional every quarter",
    body: "₦50,000 standard member rate; ₦40,000 for an active Club member buying later; ₦30,000 when selected with the current Club quarter.",
  },
];

export default function MembershipPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-10">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">Membership</p>
        <h1 className="text-3xl font-bold text-slate-900">One member relationship, separate programmes</h1>
        <p className="text-slate-600">
          You register with SwimBuddz once. Club, Academy, sessions, and Community Experiences are
          distinct things you can qualify for or purchase; you do not create a new identity each time.
        </p>
      </header>

      <section className="space-y-3">
        {products.map((product) => (
          <div key={product.name} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold text-slate-900">{product.name}</h2>
              <span className="font-semibold text-cyan-700">{product.price}</span>
            </div>
            <p className="mt-2 text-sm text-slate-700">{product.body}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">What each path looks like</h2>
        <div className="space-y-4 text-sm text-slate-700">
          <p>
            <strong>General member:</strong> create an account, complete onboarding, activate annual
            Membership where required, then book Community swims, events, and optional quarterly
            Community Experiences.
          </p>
          <p>
            <strong>Club:</strong> choose a location and quarter, complete the readiness assessment,
            then review one quote containing each Club quarter, annual Membership if due, and the
            optional current-quarter Community Experience.
          </p>
          <p>
            <strong>Academy:</strong> choose a programme and cohort, review its published all-in price
            and membership policy, then pay in full or use installments where the cohort permits.
          </p>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Guests and drop-ins</h2>
        <p className="text-sm text-slate-700">
          A guest can use a session-specific self-pay link without the referrer attending. Guest,
          Community drop-in, and Club rates are configured separately by location. After the first
          paid referred attendance, the referrer automatically receives 10 Bubbles.
        </p>
      </section>

      <section className="rounded-xl border border-cyan-200 bg-cyan-50 p-6 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">Ready to begin?</p>
        <p className="mt-1">
          <Link href="/register" className="font-semibold text-cyan-700 hover:underline">Create an account</Link>
          {" "}or{" "}
          <Link href="/login" className="font-semibold text-cyan-700 hover:underline">log in</Link>
          {" "}to continue from your dashboard.
        </p>
      </section>
    </div>
  );
}
