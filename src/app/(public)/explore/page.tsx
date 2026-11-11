import Link from "next/link";
import { ArrowRight, BookOpen, ShoppingBag, Users, Waves, MapPin } from "lucide-react";

const options = [
  { title: "Learn to swim", description: "Start as a beginner or build stronger swimming skills through coached Academy classes.", href: "/academy", action: "Explore Academy", Icon: BookOpen },
  { title: "Swim regularly", description: "Already swim? Join Club practice, meet your pod and keep improving.", href: "/club", action: "Explore Club", Icon: Waves },
  { title: "Find your community", description: "Discover social swims, experiences, events and Community membership.", href: "/community", action: "Explore Community", Icon: Users },
  { title: "Shop swimming essentials", description: "Buy goggles, swimwear, caps and equipment. Swimming membership isn't required.", href: "/store", action: "Shop the store", Icon: ShoppingBag },
  { title: "Discover swimming pools", description: "Explore pools and available independent pool access.", href: "/pools", action: "Find a pool", Icon: MapPin },
] as const;

export default function ExplorePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <div className="max-w-3xl space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-700">Discover SwimBuddz</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">What would you like to do?</h1>
        <p className="text-base text-slate-600">Explore freely. You don't need to purchase a membership or choose a swimming programme to create an account or shop.</p>
      </div>
      <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {options.map(({ title, description, href, action, Icon }) => (
          <Link key={href} href={href} className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-cyan-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">
            <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><Icon className="h-6 w-6" aria-hidden="true" /></span>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{description}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700">{action}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
          </Link>
        ))}
      </div>
      <p className="mt-8 text-sm text-slate-600">Already know where you're going? <Link href="/account" className="font-semibold text-cyan-700 underline">Open your account</Link>.</p>
    </main>
  );
}
