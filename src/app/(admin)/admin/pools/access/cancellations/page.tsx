"use client";
import {apiGet} from "@/lib/api";
import Link from "next/link";
import {useEffect,useState} from "react";
type Request={id:string;booking_id:string;buyer_email:string;payment_reference:string;reason:string;status:string};
export default function PoolAccessCancellationQueue(){
 const [items,setItems]=useState<Request[]>([]);
 const [error,setError]=useState("");
 useEffect(()=>{
  apiGet<Request[]>("/api/v1/admin/pools/access/cancellation-requests",{auth:true})
   .then(setItems).catch(()=>setError("Unable to retrieve cancellation review queue."));
 },[]);
 return <main className="mx-auto max-w-5xl space-y-6 p-6">
  <header><p className="text-sm font-semibold uppercase text-cyan-700">Finance review</p>
   <h1 className="text-3xl font-bold">Pool Access cancellations</h1>
   <p className="mt-2 text-slate-600">Review confirmed bookings before refunding, revoking access or adjusting partner liability. Submission is not a refund.</p>
   <Link href="/admin/pools/access/bookings" className="text-cyan-700 underline">Review Pool Access settlements</Link>
  </header>
  {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
  <div className="space-y-3">{items.length?items.map(item=><article key={item.id} className="rounded-xl border bg-white p-5">
   <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{item.status.replace("_"," ")}</p>
   <h2 className="mt-2 font-semibold">{item.buyer_email}</h2>
   <p className="mt-2 text-sm text-slate-700">{item.reason}</p>
   <p className="mt-3 text-xs text-slate-500">Booking: {item.booking_id} · Payment: {item.payment_reference}</p>
   <p className="mt-2 text-xs text-amber-700">A refund or rejection must be processed through the existing finance workflow with evidence before this request is closed.</p>
  </article>):<p className="rounded-xl border p-5 text-slate-600">No Pool Access cancellation requests.</p>}</div>
 </main>;
}
