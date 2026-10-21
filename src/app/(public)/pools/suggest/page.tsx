"use client";

import { apiPost } from "@/lib/api";
import { getCurrentAccessToken } from "@/lib/auth";
import Link from "next/link";
import { useState } from "react";

export default function SuggestPublicPool() {
  const [name,setName] = useState("");
  const [area,setArea] = useState("");
  const [address,setAddress] = useState("");
  const [details,setDetails] = useState("");
  const [contactEmail,setContactEmail] = useState("");
  const [website,setWebsite] = useState("");
  const [status,setStatus] = useState("");
  const [submitted,setSubmitted] = useState(false);
  const [busy,setBusy] = useState(false);
  async function submit(e:React.FormEvent){
    e.preventDefault();setStatus("");
    if(!await getCurrentAccessToken()){
      window.location.assign("/pool-access/visitor");
      return;
    }
    setBusy(true);
    try {
      await apiPost("/api/v1/pools/directory/suggestions", {
        pool_name:name.trim(),location_area:area.trim(),
        address:address.trim()||null,details:details.trim()||null,
        contact_email:contactEmail.trim()||null,website
      },{auth:true});
      setSubmitted(true);setStatus("Your suggestion is in review. Thanks for helping other swimmers find new pools.");
    }catch(e){setStatus(e instanceof Error?e.message:"Could not submit suggestion.");}
    finally{setBusy(false);}
  }
  return <main className="mx-auto max-w-xl space-y-6 px-4 py-10">
    <Link href="/pools" className="text-sm font-semibold text-cyan-700 underline">← Back to pool directory</Link>
    <header className="space-y-2">
      <h1 className="text-3xl font-bold">Suggest a swimming pool</h1>
      <p className="text-sm text-slate-600">Anyone can recommend a swimming pool for the directory. You don't need a paid SwimBuddz membership, but a free visitor login is needed to prevent spam. Suggestions are reviewed before publication.</p>
    </header>
    {submitted ? <div role="status" className="rounded-xl border border-green-200 bg-green-50 p-6"><p>{status}</p><Link href="/pools" className="mt-3 inline-block font-semibold text-cyan-700 underline">Explore other pools</Link></div>
    : <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-white p-5">
      <label className="block text-sm font-semibold">Pool name<input required minLength={2} maxLength={255} value={name} onChange={e=>setName(e.target.value)} className="mt-1 block w-full rounded-lg border p-3 font-normal" placeholder="Name of the pool"/></label>
      <label className="block text-sm font-semibold">Neighbourhood or area<input required minLength={2} maxLength={255} value={area} onChange={e=>setArea(e.target.value)} className="mt-1 block w-full rounded-lg border p-3 font-normal" placeholder="e.g. Yaba"/></label>
      <label className="block text-sm font-semibold">Address (optional)<textarea maxLength={500} value={address} onChange={e=>setAddress(e.target.value)} rows={2} className="mt-1 block w-full rounded-lg border p-3 font-normal" placeholder="Street address, landmark or directions"/></label>
      <label className="block text-sm font-semibold">Anything else we should know? (optional)<textarea maxLength={1000} value={details} onChange={e=>setDetails(e.target.value)} rows={3} className="mt-1 block w-full rounded-lg border p-3 font-normal" placeholder="Facilities, pool size, what swimmers should know"/></label>
      <label className="block text-sm font-semibold">Pool's public contact email (optional)<input type="email" maxLength={255} value={contactEmail} onChange={e=>setContactEmail(e.target.value)} className="mt-1 block w-full rounded-lg border p-3 font-normal"/></label>
      <label className="hidden" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={website} onChange={e=>setWebsite(e.target.value)}/></label>
      {status&&<p role="alert" className="text-sm text-red-700">{status}</p>}
      <button disabled={busy} className="min-h-11 rounded-lg bg-cyan-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{busy?"Submitting…":"Suggest this pool"}</button>
    </form>}
  </main>;
}
