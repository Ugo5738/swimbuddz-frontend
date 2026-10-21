"use client";

import { apiGet, apiPatch } from "@/lib/api";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Pool={id:string;name:string;location_area:string|null;directory_published:boolean;partnership_status:string};
type PoolList={items:Pool[];total:number};
type Review={id:string;pool_id:string;rating:number;review:string};

export default function DirectoryModeration(){
 const [pools,setPools]=useState<Pool[]>([]);
 const [reviews,setReviews]=useState<Review[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState("");
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const [poolList,pending]=await Promise.all([
    apiGet<PoolList>("/api/v1/admin/pools?page_size=100",{auth:true}),
    apiGet<Review[]>("/api/v1/admin/pools/directory/reviews/pending",{auth:true})
   ]);
   setPools(poolList.items);setReviews(pending);
  }catch(e){setError(e instanceof Error?e.message:"Failed to load moderation");}
  finally{setLoading(false)}
 },[]);
 useEffect(()=>{void load()},[load]);
 async function publish(pool:Pool){
   setBusy(pool.id);setError("");
   try{
    await apiPatch(`/api/v1/admin/pools/directory/${pool.id}/publish?published=${!pool.directory_published}`,{}, {auth:true});
    await load();
   }catch(e){setError(e instanceof Error?e.message:"Unable to update pool listing");}
   finally{setBusy("")}
 }
 async function moderate(review:Review,approved:boolean){
   setBusy(review.id);setError("");
   try{
    await apiPatch(`/api/v1/admin/pools/directory/reviews/${review.id}?approved=${approved}`,{}, {auth:true});
    await load();
   }catch(e){setError(e instanceof Error?e.message:"Unable to moderate review");}
   finally{setBusy("")}
 }
 return <main className="space-y-7">
  <header className="space-y-2"><Link href="/admin/pools" className="text-sm text-cyan-700 underline">← All pools</Link><h1 className="text-2xl font-bold">Pool directory moderation</h1><p className="text-sm text-slate-600">Publish only verified listings. This does not make a pool bookable; Pool Access booking rules remain separate.</p></header>
  {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
  {loading?<p role="status">Loading pool directory moderation…</p>:<>
   <section className="space-y-3">
    <h2 className="text-xl font-semibold">Pool visibility</h2>
    {pools.map(pool=><article key={pool.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
     <div><p className="font-semibold">{pool.name}</p><p className="text-xs text-slate-500">{pool.location_area||"Area not set"} · {pool.partnership_status} · {pool.directory_published?"Published":"Unpublished"}</p></div>
     <div className="flex gap-3"><Link href={`/admin/pools/${pool.id}`} className="self-center text-sm text-cyan-700 underline">Inspect</Link><button disabled={busy!==""} onClick={()=>void publish(pool)} className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50">{pool.directory_published?"Unpublish":"Publish"}</button></div>
    </article>)}
    {!pools.length&&<p className="text-sm text-slate-600">No pools found.</p>}
    <p className="text-xs text-slate-500">Showing the first 100 pools. Use full pool administration for additional records.</p>
   </section>
   <section className="space-y-3">
    <h2 className="text-xl font-semibold">Pending swimmer reviews ({reviews.length})</h2>
    {reviews.map(review=><article key={review.id} className="rounded-xl border bg-white p-4">
     <p className="text-sm font-semibold">{review.rating}/5 stars · Pool {review.pool_id}</p><p className="my-3 whitespace-pre-wrap text-sm">{review.review}</p>
     <div className="flex gap-2"><button disabled={busy!==""} onClick={()=>void moderate(review,true)} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Approve</button><button disabled={busy!==""} onClick={()=>void moderate(review,false)} className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50">Reject</button></div>
    </article>)}
    {!reviews.length&&<p className="text-sm text-slate-600">No reviews awaiting approval.</p>}
   </section>
  </>}
 </main>;
}
