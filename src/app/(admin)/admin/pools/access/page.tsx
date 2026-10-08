"use client";
import { apiGet, apiPost } from "@/lib/api";
import { useEffect, useState } from "react";
type Pool = {id:string;name:string;location_area:string|null};
type PoolList={items:Pool[]};
type Offer={id:string;title:string;status:string};
export default function PoolAccessAdmin(){
 const [pools,setPools]=useState<Pool[]>([]);
 const [offers,setOffers]=useState<Offer[]>([]);
 const loadOffers=()=>apiGet<Offer[]>("/api/v1/admin/pools/access/offers",{auth:true}).then(setOffers).catch(()=>setError("Could not load existing offers"));
 const [error,setError]=useState("");
 const [saved,setSaved]=useState<Offer|null>(null);
 const [poolId,setPoolId]=useState("");
 const [title,setTitle]=useState("");
 const [start,setStart]=useState("");
 const [end,setEnd]=useState("");
 const [capacity,setCapacity]=useState(10);
 const [sell,setSell]=useState("");
 const [cost,setCost]=useState("");
 const [basis,setBasis]=useState<"per_person"|"per_group">("per_person");
 const [enabled,setEnabled]=useState(false);
 const [amenities,setAmenities]=useState("");
 const [rules,setRules]=useState("");
 const [cancellation,setCancellation]=useState("");
 const [busy,setBusy]=useState(false);
 useEffect(()=>{void loadOffers();apiGet<PoolList>("/api/v1/admin/pools?page_size=100",{auth:true}).then(x=>setPools(x.items)).catch(()=>setError("Could not load pool locations"))},[]);
 async function save(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");setSaved(null);
  try{const payload={
    pool_id:poolId,title,starts_at:new Date(start).toISOString(),ends_at:new Date(end).toISOString(),
    capacity,selling_price_kobo:Math.round(Number(sell)*100),negotiated_cost_kobo:Math.round(Number(cost)*100),
    cost_basis:basis,currency:"NGN",self_directed_permitted:enabled,public_booking_enabled:enabled,
    admissions_require_lifeguard:true,amenities:amenities.split(",").map(s=>s.trim()).filter(Boolean),access_rules:rules,cancellation_policy:cancellation
   };
   const x=await apiPost<Offer>("/api/v1/admin/pools/access/offers",payload,{auth:true});setSaved(x);void loadOffers();
  }catch(e){setError(e instanceof Error?e.message:"Unable to save offer");}finally{setBusy(false)}
 }
 async function publish(offer:Offer){
  setError("");try{await apiPost("/api/v1/admin/pools/access/offers/"+offer.id+"/publish",{}, {auth:true});await loadOffers();}
  catch(e){setError(e instanceof Error?e.message:"Cannot publish until pool safety and offer rules are confirmed");}
 }
 return <main className="mx-auto max-w-3xl p-6 space-y-6">
  <header><p className="text-sm uppercase tracking-widest text-cyan-700">Operations</p>
  <h1 className="text-3xl font-bold">Pool Access offers</h1>
  <p className="text-sm text-slate-600">Create scheduled admission inventory with separate negotiated facility costs and public selling prices. New offers remain drafts until explicitly published.</p></header>
  {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
  {saved&&<div className="rounded-lg bg-green-50 p-4 text-green-900">Draft created: {saved.title} ({saved.id}). Publishing must be done after operational approval. No admission is issued.</div>}
  <section className="rounded-xl border bg-white p-5 space-y-3"><h2 className="text-xl font-semibold">Published and draft inventory</h2>
  {offers.length===0?<p className="text-sm text-slate-500">No Pool Access offers created yet.</p>:
  <div className="space-y-3">{offers.map(o=><div key={o.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
    <div><h3 className="font-medium">{o.title}</h3><p className="text-xs text-slate-500">{o.status}</p></div>
    {o.status==="draft"&&<button className="rounded-lg bg-cyan-700 px-3 py-2 text-sm text-white" onClick={()=>publish(o)}>Publish offer</button>}
  </div>)}</div>}
  </section>
  <form className="space-y-4 rounded-xl border bg-white p-5" onSubmit={save}>
   <label className="block text-sm font-semibold">Partner pool<select required className="mt-1 w-full rounded-lg border p-3" value={poolId} onChange={e=>setPoolId(e.target.value)}><option value="">Select a pool</option>{pools.map(p=><option key={p.id} value={p.id}>{p.name} {p.location_area?"· "+p.location_area:""}</option>)}</select></label>
   <label className="block text-sm font-semibold">Offer title<input required minLength={3} maxLength={160} className="mt-1 w-full rounded-lg border p-3" value={title} onChange={e=>setTitle(e.target.value)}/></label>
   <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Visit begins<input required type="datetime-local" className="mt-1 w-full rounded-lg border p-3" value={start} onChange={e=>setStart(e.target.value)}/></label>
   <label className="text-sm font-semibold">Visit ends<input required type="datetime-local" className="mt-1 w-full rounded-lg border p-3" value={end} onChange={e=>setEnd(e.target.value)}/></label></div>
   <label className="block text-sm font-semibold">Admission capacity<input required type="number" min={1} max={1000} value={capacity} onChange={e=>setCapacity(Number(e.target.value))} className="mt-1 w-full rounded-lg border p-3"/></label>
   <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Customer price (₦ per swimmer)<input required type="number" min="1" step=".01" value={sell} onChange={e=>setSell(e.target.value)} className="mt-1 w-full rounded-lg border p-3"/></label>
   <label className="text-sm font-semibold">Negotiated pool cost (₦)<input required type="number" min="0" step=".01" value={cost} onChange={e=>setCost(e.target.value)} className="mt-1 w-full rounded-lg border p-3"/></label></div>
   <label className="block text-sm font-semibold">Pool cost basis<select className="mt-1 w-full rounded-lg border p-3" value={basis} onChange={e=>setBasis(e.target.value as typeof basis)}><option value="per_person">Per verified admission</option><option value="per_group">One charge per visiting group</option></select></label>
   <label className="block text-sm font-semibold">Verified amenities (comma-separated)<textarea className="mt-1 w-full rounded-lg border p-3" rows={2} value={amenities} onChange={e=>setAmenities(e.target.value)} placeholder="Showers, lockers, changing rooms, parking" /></label>
   <label className="block text-sm font-semibold">Pool entry and safety rules<textarea required className="mt-1 w-full rounded-lg border p-3" rows={3} value={rules} onChange={e=>setRules(e.target.value)} placeholder="Eligibility, swimwear, lifeguard, reception instructions"/></label>
   <label className="block text-sm font-semibold">Cancellation and no-show terms<textarea required className="mt-1 w-full rounded-lg border p-3" rows={3} value={cancellation} onChange={e=>setCancellation(e.target.value)} placeholder="Customer-facing cancellation and refund terms"/></label>
   <label className="flex gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/> Pool permits self-directed visits and published inventory</label>
   <p className="text-xs text-slate-500">The offer starts as a draft even if the checkbox is enabled. Confirm pool capacity, safety, terms and payment integration before publishing.</p>
   <button disabled={busy} className="rounded-lg bg-cyan-700 px-5 py-3 text-white disabled:opacity-40">{busy?"Saving…":"Create draft offer"}</button>
  </form>
 </main>;
}
