"use client";
import {apiGet,apiPost} from "@/lib/api";
import Link from "next/link";
import {useCallback,useEffect,useState} from "react";
type Pool={id:string;name:string;location_area:string|null};
type PoolList={items:Pool[]};
type Operator={auth_id:string;pool_id:string;active:boolean};
export default function PoolReceptionAssignments(){
 const [pools,setPools]=useState<Pool[]>([]);
 const [poolId,setPoolId]=useState("");
 const [authId,setAuthId]=useState("");
 const [operators,setOperators]=useState<Operator[]>([]);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const load=useCallback(async()=>{if(!poolId){setOperators([]);return;}
  try{setOperators(await apiGet<Operator[]>("/api/v1/admin/pools/access/partner/"+poolId+"/operators",{auth:true}));}
  catch(e){setError(e instanceof Error?e.message:"Unable to load reception access")}},[poolId]);
 useEffect(()=>{apiGet<PoolList>("/api/v1/admin/pools?page_size=100",{auth:true}).then(p=>setPools(p.items)).catch(()=>setError("Could not load pools"))},[]);
 useEffect(()=>{void load()},[load]);
 async function grant(e:React.FormEvent){e.preventDefault();if(!poolId||!authId.trim())return;setBusy(true);setError("");
  try{await apiPost("/api/v1/admin/pools/access/partner/"+poolId+"/operators",{auth_id:authId.trim()},{auth:true});setAuthId("");await load();}
  catch(e){setError(e instanceof Error?e.message:"Failed to authorise operator");}
  finally{setBusy(false)}
 }
 async function revoke(user:string){if(!poolId)return;setBusy(true);setError("");
  try{const {apiDelete}=await import("@/lib/api");await apiDelete("/api/v1/admin/pools/access/partner/"+poolId+"/operators/"+encodeURIComponent(user),{auth:true});await load();}
  catch(e){setError(e instanceof Error?e.message:"Could not revoke operator");}
  finally{setBusy(false)}
 }
 return <main className="mx-auto max-w-3xl space-y-6 p-6">
  <header><p className="text-xs uppercase tracking-widest text-cyan-700">Partner operations</p>
   <h1 className="text-3xl font-bold">Reception access</h1>
   <p className="text-slate-600">Grant and revoke QR verification rights for individual pools. Operators never receive full admin permissions.</p>
   <Link href="/admin/pools/access" className="text-cyan-700 underline">Back to Pool Access</Link>
  </header>
  {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
  <label className="block text-sm font-semibold">Partner location
   <select className="mt-1 w-full rounded-lg border p-3" value={poolId} onChange={e=>setPoolId(e.target.value)}>
    <option value="">Choose pool</option>{pools.map(p=><option key={p.id} value={p.id}>{p.name} · {p.location_area}</option>)}
   </select></label>
  {poolId&&<><form className="space-y-3 rounded-xl border bg-white p-5" onSubmit={grant}>
   <h2 className="font-semibold">Add reception operator</h2>
   <label className="block text-sm">Verified account auth ID<input className="mt-1 w-full rounded-lg border p-3" placeholder="Existing login user ID" required value={authId} onChange={e=>setAuthId(e.target.value)}/></label>
   <p className="text-xs text-slate-500">The user must already have a verified account. Assign only staff authorised by this facility.</p>
   <button disabled={busy} className="rounded-lg bg-cyan-700 px-4 py-2 text-white disabled:opacity-40">Grant facility-only access</button>
  </form>
  <section className="space-y-3"><h2 className="text-lg font-semibold">Assigned reception accounts</h2>
   {operators.length===0?<p>No operators assigned.</p>:operators.map(o=><div key={o.auth_id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4">
    <div><strong className="text-sm">{o.auth_id}</strong><p className="text-xs text-slate-500">{o.active?"Active":"Revoked"}</p></div>
    {o.active&&<button disabled={busy} className="rounded-lg border px-3 py-2 text-red-700 disabled:opacity-40" onClick={()=>void revoke(o.auth_id)}>Revoke</button>}
   </div>)}</section></>}
 </main>;
}
