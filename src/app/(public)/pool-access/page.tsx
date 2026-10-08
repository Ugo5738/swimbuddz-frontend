"use client";
import { apiGet, apiPost } from "@/lib/api";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Offer = {id:string;pool_id:string;title:string;starts_at:string;ends_at:string;capacity:number;
 selling_price_kobo:number;currency:string;amenities:string[];access_rules:string;cancellation_policy:string};
type Booking = {id:string;status:string;headcount:number;selling_total_kobo:number;currency:string;hold_expires_at:string};

const money=(minor:number,currency:string)=>new Intl.NumberFormat("en-NG",{style:"currency",currency}).format(minor/100);

export default function PoolAccessPage(){
 const [offers,setOffers]=useState<Offer[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [selected,setSelected]=useState<Offer|null>(null);
 const [guests,setGuests]=useState([""]);
 const [booking,setBooking]=useState<Booking|null>(null);
 const [busy,setBusy]=useState(false);
 useEffect(()=>{apiGet<Offer[]>("/api/v1/pools/access/offers").then(setOffers).catch(()=>setError("Could not load published Pool Access availability.")).finally(()=>setLoading(false))},[]);
 const total=useMemo(()=>selected?money(selected.selling_price_kobo*guests.length,selected.currency):"",[selected,guests]);
 async function reserve(){
  if(!selected||busy)return;
  if(guests.some(g=>g.trim().length<2)){setError("Enter each swimmer's name.");return;}
  setBusy(true);setError("");
  try{
    const key=crypto.randomUUID();
    const result=await apiPost<Booking>("/api/v1/pools/access/bookings",{
      offer_id:selected.id, idempotency_key:key,guests:guests.map(name=>({name:name.trim()}))
    },{auth:true});
    setBooking(result);
  }catch(e){setError(e instanceof Error?e.message:"Could not hold these places. Please sign in and try again.")}
  finally{setBusy(false)}
 }
 return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
  <header className="space-y-2"><p className="text-sm font-semibold uppercase tracking-widest text-cyan-700">Find a Swim</p>
   <h1 className="text-3xl font-bold text-slate-900">Pool Access</h1>
   <p className="max-w-2xl text-slate-600">Discover independent swims at published SwimBuddz partner locations. Coaching is not included. Entry requires a confirmed, paid booking and compliance with pool safety rules.</p>
   <Link className="text-cyan-700 underline" href="/sessions">Looking for an organised Club or Community swim instead?</Link>
  </header>
  {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
  {booking?<section className="rounded-xl border bg-white p-6 space-y-3">
   <h2 className="text-xl font-semibold">Places held — payment not yet available</h2>
   <p>Your reservation is pending payment, and <strong>does not grant pool entry</strong>. No QR credential has been issued.</p>
   <p className="text-sm text-slate-600">Hold expires {new Date(booking.hold_expires_at).toLocaleString()}. Reference: {booking.id}</p>
   <Link className="text-cyan-700 underline" href="/account">Return to your account</Link>
  </section>:selected?<section className="rounded-xl border bg-white p-6 space-y-4">
   <button className="text-cyan-700 underline" onClick={()=>{setSelected(null);setError("")}}>← All available visits</button>
   <h2 className="text-2xl font-semibold">{selected.title}</h2>
   <p>{new Date(selected.starts_at).toLocaleString()} – {new Date(selected.ends_at).toLocaleTimeString()}</p>
   <p className="font-medium">{money(selected.selling_price_kobo,selected.currency)} per swimmer</p>
   <p className="text-sm text-slate-600">{selected.access_rules||"Follow the host facility's safety and entry instructions."}</p>
   <p className="text-sm text-slate-600">Cancellation policy: {selected.cancellation_policy||"Contact SwimBuddz before booking for cancellation terms."}</p>
   <h3 className="font-semibold">Swimmers</h3>
   {guests.map((name,i)=><label className="block text-sm" key={i}>Swimmer {i+1}
     <input className="mt-1 w-full rounded-lg border p-3" value={name} maxLength={150} onChange={e=>setGuests(a=>a.map((g,j)=>j===i?e.target.value:g))} placeholder="Name for admission"/>
   </label>)}
   <div className="flex gap-2"><button className="rounded-lg border p-2" disabled={guests.length>=25} onClick={()=>setGuests(a=>[...a,""])}>Add guest</button>
    <button className="rounded-lg border p-2" disabled={guests.length<=1} onClick={()=>setGuests(a=>a.slice(0,-1))}>Remove guest</button></div>
   <p className="font-semibold">Total: {total}</p>
   <button disabled={busy} className="rounded-lg bg-cyan-700 px-5 py-3 font-semibold text-white disabled:opacity-40" onClick={reserve}>{busy?"Reserving…":"Hold places (no payment or entry yet)"}</button>
   <p className="text-xs text-slate-500">This is a staged release. Payment verification and reception admission will be enabled only when the secure integration is ready.</p>
  </section>:loading?<p>Loading available swims…</p>:offers.length?<div className="grid gap-4 md:grid-cols-2">{offers.map(offer=><article key={offer.id} className="rounded-xl border bg-white p-5 space-y-3">
   <h2 className="text-xl font-semibold">{offer.title}</h2>
   <p className="text-sm text-slate-600">{new Date(offer.starts_at).toLocaleString()} – {new Date(offer.ends_at).toLocaleTimeString()}</p>
   <p className="font-semibold">{money(offer.selling_price_kobo,offer.currency)} / person</p>
   {!!offer.amenities.length&&<p className="text-sm">{offer.amenities.join(" · ")}</p>}
   <button className="rounded-lg bg-cyan-700 px-4 py-2 text-white" onClick={()=>{setSelected(offer);setGuests([""]);setError("")}}>View visit</button>
  </article>)}</div>:<div className="rounded-xl border bg-slate-50 p-8 text-center">
   <h2 className="font-semibold">No Pool Access visits published yet</h2>
   <p className="mt-2 text-sm text-slate-600">Explore our organised swims while we prepare independent visits.</p>
   <Link href="/sessions" className="mt-3 inline-block text-cyan-700 underline">Browse sessions</Link>
  </div>}
 </main>;
}
