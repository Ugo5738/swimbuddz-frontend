"use client";
import { apiGet, apiPost } from "@/lib/api";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Offer = {id:string;pool_id:string;pool_name:string;location_area:string|null;pool_address:string|null;pool_length_m:number|null;depth_min_m:number|null;depth_max_m:number|null;has_lifeguard:boolean|null;title:string;starts_at:string;ends_at:string;capacity:number;
 selling_price_kobo:number;currency:string;amenities:string[];access_rules:string;cancellation_policy:string};
type Booking = {id:string;status:string;headcount:number;selling_total_kobo:number;currency:string;hold_expires_at:string};
type PaymentIntent={reference:string;checkout_url?:string|null;};

const money=(minor:number,currency:string)=>new Intl.NumberFormat("en-NG",{style:"currency",currency}).format(minor/100);

export default function PoolAccessPage(){
 const [offers,setOffers]=useState<Offer[]>([]);
 const [area,setArea]=useState("");
 const areas=useMemo(()=>Array.from(new Set(offers.map(x=>x.location_area).filter((x):x is string=>!!x))).sort(),[offers]);
 const visibleOffers=useMemo(()=>offers.filter(x=>!area||x.location_area===area),[offers,area]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [selected,setSelected]=useState<Offer|null>(null);
 const [guests,setGuests]=useState([""]);
 const [booking,setBooking]=useState<Booking|null>(null);
 const [busy,setBusy]=useState(false);
 const [paymentBusy,setPaymentBusy]=useState(false);
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
 async function payForAccess(){
  if(!booking||paymentBusy)return;
  setPaymentBusy(true);setError("");
  try{
   const intent=await apiPost<PaymentIntent>("/api/v1/payments/intents",{
    purpose:"pool_access",pool_access_booking_id:booking.id,payment_method:"paystack",currency:"NGN"
   },{auth:true});
   if(!intent.checkout_url)throw new Error("Payment checkout is not currently available");
   window.location.assign(intent.checkout_url);
  }catch(e){setError(e instanceof Error?e.message:"Payment could not be initialized");setPaymentBusy(false);}
 }
 return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
  <header className="space-y-2"><p className="text-sm font-semibold uppercase tracking-widest text-cyan-700">Find a Swim</p>
   <h1 className="text-3xl font-bold text-slate-900">Pool Access</h1>
   <p className="max-w-2xl text-slate-600">Discover independent swims at published SwimBuddz partner locations. Coaching is not included. Entry requires a confirmed, paid booking and compliance with pool safety rules.</p>
   <Link className="text-cyan-700 underline" href="/sessions">Looking for an organised Club or Community swim instead?</Link>
  </header>
  {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
  {!selected&&!booking&&areas.length>0&&<label className="block max-w-sm text-sm font-semibold text-slate-800">Find a swim near your area
   <select className="mt-2 w-full rounded-lg border bg-white p-3" value={area} onChange={e=>setArea(e.target.value)}>
    <option value="">All available areas</option>{areas.map(x=><option key={x} value={x}>{x}</option>)}
   </select>
  </label>}
  {booking?<section className="rounded-xl border bg-white p-6 space-y-3">
   <h2 className="text-xl font-semibold">Places held — complete payment</h2>
   <p>Your reservation does not grant entry until your payment is verified.</p>
   <p className="text-sm text-slate-600">Hold expires {new Date(booking.hold_expires_at).toLocaleString()}. Reference: {booking.id}</p>
   <button disabled={paymentBusy} onClick={payForAccess} className="rounded-lg bg-cyan-700 px-4 py-2 text-white disabled:opacity-40">{paymentBusy?"Opening checkout…":"Pay securely with Paystack"}</button>
   <Link className="block text-cyan-700 underline" href="/account">Return to your account</Link>
  </section>:selected?<section className="rounded-xl border bg-white p-6 space-y-4">
   <button className="text-cyan-700 underline" onClick={()=>{setSelected(null);setError("")}}>← All available visits</button>
   <h2 className="text-2xl font-semibold">{selected.title}</h2>
   <p className="text-sm text-slate-600">{selected.location_area} · {selected.pool_address}</p>
   <p className="text-sm text-slate-600">{selected.pool_length_m?selected.pool_length_m+"m pool · ":""}{selected.depth_min_m!=null&&selected.depth_max_m!=null?selected.depth_min_m+"–"+selected.depth_max_m+"m depth · ":""}{selected.has_lifeguard?"Lifeguard on site":""}</p>
   {!!selected.amenities.length&&<p className="text-sm">Included amenities: {selected.amenities.join(", ")}</p>}
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
   <button disabled={busy} className="rounded-lg bg-cyan-700 px-5 py-3 font-semibold text-white disabled:opacity-40" onClick={reserve}>{busy?"Reserving…":"Hold places to proceed to payment"}</button>
   <p className="text-xs text-slate-500">Payment is processed by Paystack. Admission requires verified payment and a valid QR ticket.</p>
  </section>:loading?<p>Loading available swims…</p>:visibleOffers.length?<div className="grid gap-4 md:grid-cols-2">{visibleOffers.map(offer=><article key={offer.id} className="rounded-xl border bg-white p-5 space-y-3">
   <h2 className="text-xl font-semibold">{offer.title}</h2>
   <p className="text-sm text-slate-600">{offer.location_area} · {offer.pool_address}</p>
   <p className="text-sm text-slate-600">{new Date(offer.starts_at).toLocaleString()} – {new Date(offer.ends_at).toLocaleTimeString()}</p>
   <p className="font-semibold">{money(offer.selling_price_kobo,offer.currency)} / person</p>
   {!!offer.amenities.length&&<p className="text-sm">{offer.amenities.join(" · ")}</p>}
   <button className="rounded-lg bg-cyan-700 px-4 py-2 text-white" onClick={()=>{setSelected(offer);setGuests([""]);setError("")}}>View visit</button>
  </article>)}</div>:<div className="rounded-xl border bg-slate-50 p-8 text-center">
   <h2 className="font-semibold">No Pool Access visits published yet</h2>
   <p className="mt-2 text-sm text-slate-600">No published visits match this area. Adjust the filter or explore our organised swims.</p>
   <Link href="/sessions" className="mt-3 inline-block text-cyan-700 underline">Browse sessions</Link>
  </div>}
 </main>;
}
