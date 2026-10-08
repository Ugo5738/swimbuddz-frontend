"use client";
import {apiGet,apiPost} from "@/lib/api";
import {QRCodeSVG} from "qrcode.react";
import Link from "next/link";
import {useEffect,useState} from "react";
type Booking={id:string;offer_id:string;status:string;headcount:number;selling_total_kobo:number;currency:string;payment_reference:string|null};
type Ticket={id:string;guest_name:string;ticket:string|null;checked_in_at:string|null};
export default function PoolAccessBookings(){
 const [bookings,setBookings]=useState<Booking[]>([]);
 const [tickets,setTickets]=useState<Record<string,Ticket[]>>({});
 const [error,setError]=useState("");
 const [verifying,setVerifying]=useState<string|null>(null);
 const load=()=>apiGet<Booking[]>("/api/v1/pools/access/bookings/me",{auth:true}).then(setBookings).catch(()=>setError("Could not load your pool visits"));
 useEffect(()=>{void load()},[]);
 async function verify(b:Booking){
  if(!b.payment_reference)return;
  setVerifying(b.id);setError("");
  try{await apiPost("/api/v1/payments/paystack/verify/"+encodeURIComponent(b.payment_reference),{}, {auth:true});
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Payment verification is still pending");}
  finally{setVerifying(null)}
 }
 async function showTickets(b:Booking){
  setError("");
  try{const rows=await apiGet<Ticket[]>("/api/v1/pools/access/bookings/"+b.id+"/tickets",{auth:true});
   setTickets(prev=>({...prev,[b.id]:rows}));
  }catch(e){setError(e instanceof Error?e.message:"Could not retrieve admission tickets")}
 }
 return <main className="mx-auto max-w-4xl space-y-6 p-6">
  <header><h1 className="text-3xl font-bold">My Pool Access bookings</h1>
   <p className="text-slate-600">View verified visits and individual entry credentials.</p>
   <Link className="text-cyan-700 underline" href="/pool-access">Find another swim</Link>
  </header>
  {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
  {bookings.length===0?<div className="rounded-xl border p-6">No Pool Access bookings yet.</div>:bookings.map(b=>
   <section key={b.id} className="space-y-3 rounded-xl border bg-white p-5">
    <h2 className="font-semibold">Visit {b.id.slice(0,8)}</h2>
    <p>Status: <strong>{b.status.replace("_"," ")}</strong> · {b.headcount} swimmer(s)</p>
    <p className="text-sm text-slate-600">Total: {new Intl.NumberFormat("en-NG",{style:"currency",currency:b.currency}).format(b.selling_total_kobo/100)}</p>
    {b.status==="confirmed"?
      <button className="rounded-lg bg-cyan-700 px-4 py-2 text-white" onClick={()=>void showTickets(b)}>View admission QR codes</button>:
      b.payment_reference?<button className="rounded-lg border px-4 py-2" disabled={verifying===b.id} onClick={()=>void verify(b)}>{verifying===b.id?"Verifying…":"Verify payment"}</button>:
      <p className="text-sm text-amber-700">Pending checkout. No admission credentials have been issued.</p>}
    {tickets[b.id]?.map(t=><article key={t.id} className="rounded-lg bg-slate-50 p-4">
     <h3 className="font-medium">{t.guest_name}</h3>
     {t.checked_in_at?<p className="text-sm text-green-700">Checked in {new Date(t.checked_in_at).toLocaleString()}</p>:
       t.ticket?<div className="mt-3 inline-block rounded-lg bg-white p-4"><QRCodeSVG value={t.ticket} size={180}/></div>:null}
     <p className="text-xs text-slate-500">Show this code at authorised SwimBuddz reception check-in. Each code works once.</p>
    </article>)}
   </section>)}
 </main>;
}
