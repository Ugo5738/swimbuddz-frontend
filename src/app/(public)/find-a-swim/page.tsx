import Link from "next/link";
import {BookOpen, CalendarCheck2, MapPin, UsersRound} from "lucide-react";
const choices=[
 {title:"Learn to swim",desc:"Explore structured Academy programmes and upcoming cohorts.",href:"/academy",icon:BookOpen},
 {title:"Organised practice",desc:"Book an eligible SwimBuddz Club or practice session.",href:"/sessions",icon:CalendarCheck2},
 {title:"Community swims",desc:"Join events, social swimming and community experiences.",href:"/community/events",icon:UsersRound},
 {title:"Pool Access",desc:"Reserve an independent swim for yourself or with friends at published partner locations.",href:"/pool-access",icon:MapPin},
];
export default function FindASwim(){
 return <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
  <header className="max-w-2xl space-y-2">
   <p className="text-sm font-semibold uppercase tracking-widest text-cyan-700">SwimBuddz</p>
   <h1 className="text-4xl font-bold text-slate-900">Find a Swim</h1>
   <p className="text-slate-600">Choose an experience that fits your goals. Coaching, organised sessions and independent pool access are different products, each with clear availability and admission rules.</p>
  </header>
  <div className="grid gap-4 sm:grid-cols-2">{choices.map(c=>{const Icon=c.icon;return <Link key={c.href} href={c.href} className="group rounded-xl border bg-white p-6 hover:border-cyan-400">
   <Icon className="mb-3 h-7 w-7 text-cyan-700"/><h2 className="text-xl font-semibold group-hover:text-cyan-700">{c.title}</h2>
   <p className="mt-2 text-sm text-slate-600">{c.desc}</p><p className="mt-4 text-sm font-semibold text-cyan-700">Explore →</p>
  </Link>})}</div>
 </main>;
}
