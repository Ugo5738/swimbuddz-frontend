"use client";
import {apiGet,apiPost} from "@/lib/api";
import {useEffect,useState} from "react";
type PoolScope={pool_id:string};
type Redemption={status:string;guest_name:string;admission_id:string};
export default function PartnerReception(){
 const [pools,setPools]=useState<PoolScope[]>([]);
 const [pool,setPool]=useState("");
 const [ticket,setTicket]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [done,setDone]=useState<Redemption|null>(null);
 useEffect(()=>{apiGet<PoolScope[]>("/api/v1/pools/access/partner/assigned-pools",{auth:true}).then(rows=>{setPools(rows);if(rows.length===1)setPool(rows[0].pool_id)}).catch(()=>setError("Sign in with an authorised reception account."))},[]);
 async function redeem(e:React.FormEvent){e.preventDefault();if(busy)return;setBusy(true);setError("");setDone(null);
  try{const result=await apiPost<Redemption>(`/api/v1/pools/access/partner/${pool}/redeem`,{ticket:ticket.trim()},{auth:true});setDone(result);setTicket("");}
  catch(e){setError(e instanceof Error?e.message:"Admission could not be verified");}finally{setBusy(false)}
 }
 return <main className="mx-auto max-w-xl space-y-6 p-6">
  <header><p className="text-sm font-semibold uppercase text-cyan-700">Partner operations</p><h1 className="text-3xl font-bold">Pool reception</h1>
  <p className="text-slate-600">Verify SwimBuddz admission credentials. A code cannot be used twice.</p></header>
  {error&&<p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}
  {done&&<div role="status" className="rounded-lg bg-green-50 p-4 text-green-800"><strong>Admission confirmed</strong><p>{done.guest_name}</p></div>}
  {pools.length===0?<p>No reception pools assigned to this account.</p>:
   <form className="space-y-4 rounded-xl border bg-white p-5" onSubmit={redeem}>
    <label className="block text-sm font-semibold">Your assigned pool<select required value={pool} onChange={e=>setPool(e.target.value)} className="mt-1 w-full rounded-lg border p-3"><option value="">Select assigned pool</option>{pools.map(p=><option key={p.pool_id} value={p.pool_id}>{p.pool_id}</option>)}</select></label>
    <label className="block text-sm font-semibold">QR credential<input required autoComplete="off" className="mt-1 w-full rounded-lg border p-3" value={ticket} onChange={e=>setTicket(e.target.value)} placeholder="Paste or scan QR code"/></label>
    <button className="rounded-lg bg-cyan-700 px-5 py-3 text-white disabled:opacity-40" disabled={!pool||busy}>{busy?"Checking…":"Verify admission"}</button>
   </form>}
  <p className="text-xs text-slate-500">Only admission rights for your assigned facility are available. A handheld scanner can paste the QR value into the field.</p>
 </main>;
}
