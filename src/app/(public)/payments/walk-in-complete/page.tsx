import Link from "next/link";

export default function WalkInPaymentCompletePage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-6 py-16">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Payment submitted</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Thanks. SwimBuddz will confirm the payment against your swim record.
          You can close this page once your payment provider shows the transaction as successful.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
        >
          Back to SwimBuddz
        </Link>
      </div>
    </main>
  );
}
