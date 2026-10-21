"use client";

import { apiGet, apiPatch } from "@/lib/api";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Pool = {
  id:string; name:string; location_area:string|null; partnership_status:string;
  directory_published:boolean; last_verified_at:string|null;
  directory_assessment_rating:number|null; directory_assessment_summary:string|null;
};
type PoolList={items:Pool[];total:number};
type Review={id:string;pool_id:string;rating:number;review:string};
const PAGE_SIZE=20;

function AssessmentEditor({pool,onSaved}:{pool:Pool;onSaved:()=>void}){
  const [open,setOpen]=useState(false);
  const [rating,setRating]=useState(pool.directory_assessment_rating ? String(pool.directory_assessment_rating) : "");
  const [summary,setSummary]=useState(pool.directory_assessment_summary||"");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function save(){
    setBusy(true);setError("");
    try{
      await apiPatch(`/api/v1/admin/pools/${pool.id}`,{
        directory_assessment_rating:rating ? Number(rating) : null,
        directory_assessment_summary:summary.trim()||null,
      },{auth:true});
      setOpen(false);onSaved();
    }catch(e){setError(e instanceof Error?e.message:"Unable to save assessment");}
    finally{setBusy(false);}
  }
  return <div className="space-y-2">
    <button type="button" aria-expanded={open} onClick={()=>setOpen(v=>!v)} className="text-sm font-semibold text-cyan-700 underline">{open?"Close assessment editor":"Edit public SwimBuddz assessment"}</button>
    {open&&<div className="space-y-3 rounded-xl border bg-slate-50 p-3">
      <p className="text-xs text-slate-600">This is the SwimBuddz editorial assessment, separate from swimmer reviews and internal commercial scoring. Publish only findings supported by a recent inspection.</p>
      <label className="block text-sm font-semibold">SwimBuddz assessment (1–5)
        <select value={rating} onChange={e=>setRating(e.target.value)} className="mt-1 block w-full rounded-lg border bg-white p-2">
          <option value="">Not assessed</option>
          {[5,4,3,2,1].map(n=><option key={n} value={n}>{n}/5</option>)}
        </select>
      </label>
      <label className="block text-sm font-semibold">Public assessment summary
        <textarea value={summary} onChange={e=>setSummary(e.target.value)} maxLength={800} rows={3} className="mt-1 block w-full rounded-lg border bg-white p-2 font-normal" placeholder="Verified suitability, facilities, safety observations and caveats"/>
      </label>
      <div className="flex gap-2">
        <button type="button" disabled={busy || Boolean(rating)!==Boolean(summary.trim())} onClick={()=>void save()} className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save assessment</button>
        <button type="button" onClick={()=>setOpen(false)} className="rounded-lg border px-3 py-2 text-sm">Cancel</button>
      </div>
      {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>}
  </div>;
}

export default function DirectoryModeration(){
  const [pools,setPools]=useState<Pool[]>([]);
  const [reviews,setReviews]=useState<Review[]>([]);
  const [page,setPage]=useState(1);
  const [total,setTotal]=useState(0);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState("");
  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try{
      const [poolList,pending]=await Promise.all([
        apiGet<PoolList>(`/api/v1/admin/pools?page=${page}&page_size=${PAGE_SIZE}`,{auth:true}),
        apiGet<Review[]>("/api/v1/admin/pools/directory/reviews/pending",{auth:true})
      ]);
      setPools(poolList.items);setTotal(poolList.total);setReviews(pending);
    }catch(e){setError(e instanceof Error?e.message:"Failed to load moderation");}
    finally{setLoading(false);}
  },[page]);
  useEffect(()=>{void load()},[load]);
  async function publish(pool:Pool){
    setBusy(pool.id);setError("");
    try{
      await apiPatch(`/api/v1/admin/pools/directory/${pool.id}/publish?published=${!pool.directory_published}`,{}, {auth:true});
      await load();
    }catch(e){setError(e instanceof Error?e.message:"Unable to update pool visibility");}
    finally{setBusy("");}
  }
  async function moderate(review:Review,approved:boolean){
    setBusy(review.id);setError("");
    try{
      await apiPatch(`/api/v1/admin/pools/directory/reviews/${review.id}?approved=${approved}`,{}, {auth:true});
      await load();
    }catch(e){setError(e instanceof Error?e.message:"Unable to moderate review");}
    finally{setBusy("");}
  }
  return <main className="space-y-7">
    <header className="space-y-2">
      <Link href="/admin/pools" className="text-sm text-cyan-700 underline">← All pools</Link>
      <h1 className="text-2xl font-bold">Pool directory moderation</h1>
      <p className="text-sm text-slate-600">Publish only verified listings, approve photos individually under Pool Assets, and keep official assessments separate from community reviews. Publishing never enables booking on its own.</p>
    </header>
    {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    {loading?<p role="status">Loading directory moderation…</p>:<>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Published pool information</h2>
        {pools.map(pool=><article key={pool.id} className="space-y-3 rounded-xl border bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="font-semibold">{pool.name}</p><p className="text-xs text-slate-500">{pool.location_area||"No area"} · {pool.partnership_status} · {pool.directory_published?"Published":"Not public"} · {pool.last_verified_at?"Verified "+new Date(pool.last_verified_at).toLocaleDateString("en-NG"):"Needs verification"}</p></div>
            <div className="flex flex-wrap gap-3">
              <Link href={`/admin/pools/${pool.id}`} className="self-center text-sm font-semibold text-cyan-700 underline">Inspect & edit photos</Link>
              <button type="button" disabled={busy!==""||(!pool.directory_published&&!pool.last_verified_at)} onClick={()=>void publish(pool)}
                className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-40">{pool.directory_published?"Unpublish":"Publish"}</button>
            </div>
          </div>
          {!pool.directory_published&&!pool.last_verified_at&&<p className="text-xs text-amber-700">Verify the pool and record its verification date on the Pool Details page before publication.</p>}
          <AssessmentEditor key={pool.id} pool={pool} onSaved={()=>void load()}/>
        </article>)}
        {!pools.length&&<p className="text-sm text-slate-600">No pools found.</p>}
        {total>PAGE_SIZE&&<div className="flex items-center justify-between gap-2 text-sm">
          <button type="button" disabled={page===1||loading} onClick={()=>setPage(p=>p-1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">Previous</button>
          <span>Page {page} of {Math.ceil(total/PAGE_SIZE)}</span>
          <button type="button" disabled={page*PAGE_SIZE>=total||loading} onClick={()=>setPage(p=>p+1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">Next</button>
        </div>}
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Pending swimmer reviews ({reviews.length})</h2>
        {reviews.map(review=><article key={review.id} className="rounded-xl border bg-white p-4">
          <p className="text-sm font-semibold">{review.rating}/5 stars · Pool <Link href={`/admin/pools/${review.pool_id}`} className="text-cyan-700 underline">{review.pool_id}</Link></p>
          <p className="my-3 whitespace-pre-wrap text-sm">{review.review}</p>
          <div className="flex gap-2">
            <button type="button" disabled={busy!==""} onClick={()=>void moderate(review,true)} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Approve</button>
            <button type="button" disabled={busy!==""} onClick={()=>void moderate(review,false)} className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50">Reject</button>
          </div>
        </article>)}
        {!reviews.length&&<p className="text-sm text-slate-600">No reviews awaiting moderation.</p>}
      </section>
    </>}
  </main>;
}
