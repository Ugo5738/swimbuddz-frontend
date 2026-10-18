"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

type Person = { id:string; first_name:string; last_name:string; email:string };

export function AttendeeAccessAdmin({vaultId}:{vaultId:string}) {
  const [query,setQuery] = useState("");
  const [people,setPeople] = useState<Person[]>([]);
  const [denied,setDenied] = useState<string[]>([]);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const refresh = async()=>{
    try{setDenied(await apiGet<string[]>(`/api/v1/media/vaults/${vaultId}/attendee-denials`,{auth:true}));}
    catch(e){setError(e instanceof Error?e.message:"Could not load exclusions");}
  };
  useEffect(()=>{void refresh();},[vaultId]);
  useEffect(()=>{
    if(query.trim().length < 2){setPeople([]);return;}
    let active=true;
    const t=setTimeout(()=>{
      apiGet<Person[]>(`/api/v1/members/?limit=20&search=${encodeURIComponent(query)}`,{auth:true})
        .then(rows=>{if(active)setPeople(rows.slice(0,10));}).catch(()=>{if(active)setPeople([]);});
    },250);
    return ()=>{active=false;clearTimeout(t);};
  },[query]);
  const change=async(id:string,deny:boolean)=>{
    setBusy(true);setError("");
    try{
      await apiPost(`/api/v1/media/vaults/${vaultId}/attendee-access`,{member_id:id,deny},{auth:true});
      await refresh();
    }catch(e){setError(e instanceof Error?e.message:"Could not change attendance access");}
    finally{setBusy(false);}
  };
  return <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
    <h3 className="font-semibold text-slate-900">Individual attendee access exceptions</h3>
    <p className="text-xs text-slate-700">Exclude an attendee from automatic access. You can restore them later. Explicit separately granted curator or contributor access is managed under Access & links.</p>
    <label className="block text-sm">Find attendee to restrict
      <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name or email" className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5" />
    </label>
    {people.map(person=><div key={person.id} className="flex items-center justify-between gap-3 rounded-lg bg-white p-2 text-sm">
      <span>{person.first_name} {person.last_name} · {person.email}</span>
      <button type="button" disabled={busy||denied.includes(person.id)} onClick={()=>void change(person.id,true)} className="rounded-lg border border-amber-600 px-3 py-2 text-xs font-semibold disabled:opacity-40">Revoke</button>
    </div>)}
    {denied.length>0&& <div className="space-y-2">
      <p className="text-sm font-semibold">Excluded member IDs</p>
      {denied.map(id=><div key={id} className="flex items-center justify-between gap-2 rounded-lg bg-white p-2 text-xs">
        <code className="truncate">{id}</code>
        <button type="button" disabled={busy} onClick={()=>void change(id,false)} className="rounded-lg border px-3 py-2 font-semibold">Restore</button>
      </div>)}
    </div>}
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>;
}
