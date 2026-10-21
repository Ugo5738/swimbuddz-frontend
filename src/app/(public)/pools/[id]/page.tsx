"use client";

import { apiGet, apiPost } from "@/lib/api";
import { getCurrentAccessToken } from "@/lib/auth";
import { MapPin, ShieldCheck, Star, Waves } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Pool = { id:string;name:string;location_area:string|null;address:string|null;pool_length_m:number|null;depth_min_m:number|null;depth_max_m:number|null;indoor_outdoor:string|null;has_lifeguard:boolean|null;has_changing_rooms:boolean|null;has_showers:boolean|null;has_lockers:boolean|null;has_parking:boolean|null;rating_average:number|null;rating_count:number;bookable:boolean;last_verified_at:string|null;latitude:number|null;longitude:number|null };
type Review = {id:string;rating:number;review:string;created_at:string;attribution:string};
export default function PoolDetailPage() {
  const { id } = useParams() as {id:string};
  const [pool,setPool] = useState<Pool|null>(null);
  const [reviews,setReviews] = useState<Review[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [rating,setRating] = useState(5);
  const [review,setReview] = useState("");
  const [busy,setBusy] = useState(false);
  const [feedback,setFeedback] = useState("");
  useEffect(()=>{
    let mounted=true;
    Promise.all([apiGet<Pool>(`/api/v1/pools/directory/${encodeURIComponent(id)}`),apiGet<{items:Review[]}>(`/api/v1/pools/directory/${encodeURIComponent(id)}/reviews`)])
      .then(([p,r])=>{if(mounted){setPool(p);setReviews(r.items)}})
      .catch(e=>{if(mounted)setError(e instanceof Error?e.message:"Could not load pool")})
      .finally(()=>{if(mounted)setLoading(false)});
    return ()=>{mounted=false};
  },[id]);
  async function submit(e:React.FormEvent) {
    e.preventDefault();setFeedback("");
    if(!await getCurrentAccessToken()){window.location.assign(`/pool-access/visitor?next=${encodeURIComponent("/pools/"+id)}`);return;}
    setBusy(true);
    try {
      await apiPost(`/api/v1/pools/directory/${encodeURIComponent(id)}/reviews`,{rating,review:review.trim()},{auth:true});
      setFeedback("Thank you. Your review has been submitted for moderation.");
      setReview("");
    }catch(e){setFeedback(e instanceof Error?e.message:"Could not submit review");}
    finally{setBusy(false)}
  }
  if(loading)return <main className="mx-auto max-w-4xl p-6" role="status">Loading pool details…</main>;
  if(error||!pool)return <main className="mx-auto max-w-4xl p-6"><h1 className="text-xl font-bold">Pool unavailable</h1><p role="alert">{error||"This pool is not currently listed."}</p><Link href="/pools" className="text-cyan-700 underline">Explore pools</Link></main>;
  const amenities=[["Changing rooms",pool.has_changing_rooms],["Showers",pool.has_showers],["Lockers",pool.has_lockers],["Parking",pool.has_parking],["Lifeguard",pool.has_lifeguard]].filter(x=>x[1]===true).map(x=>x[0] as string);
  return <main className="mx-auto max-w-4xl space-y-7 px-4 py-9">
    <Link href="/pools" className="text-sm font-semibold text-cyan-700 underline">← All pools</Link>
    <header className="space-y-3">
      <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">Pool directory</p>
      <h1 className="text-3xl font-bold text-slate-950">{pool.name}</h1>
      <p className="flex items-start gap-2 text-slate-600"><MapPin className="h-5 w-5 shrink-0"/>{[pool.location_area,pool.address].filter(Boolean).join(" · ")||"Address awaiting verification"}</p>
      {pool.bookable ? <Link href="/pool-access" className="inline-flex min-h-11 items-center rounded-lg bg-cyan-700 px-5 py-3 font-semibold text-white">Check SwimBuddz booking availability</Link>
        : <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">This is a directory listing, not a bookable SwimBuddz visit. Verify admission and safety information with the facility before travelling.</p>}
    </header>
    <section className="rounded-2xl border bg-white p-5">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold"><Waves className="h-5 w-5 text-cyan-700"/>Pool information</h2>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-slate-500">Pool length</dt><dd className="font-semibold">{pool.pool_length_m ? `${pool.pool_length_m} metres`:"Not verified"}</dd></div>
        <div><dt className="text-slate-500">Depth</dt><dd className="font-semibold">{pool.depth_min_m!=null&&pool.depth_max_m!=null?`${pool.depth_min_m}–${pool.depth_max_m} m`:"Not verified"}</dd></div>
        <div><dt className="text-slate-500">Pool setting</dt><dd className="font-semibold capitalize">{pool.indoor_outdoor||"Not verified"}</dd></div>
        <div><dt className="text-slate-500">Facilities reported</dt><dd className="font-semibold">{amenities.join(", ")||"Not verified"}</dd></div>
      </dl>
      <p className="mt-4 flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4"/>Last information check: {pool.last_verified_at?new Date(pool.last_verified_at).toLocaleDateString("en-NG"):"Not yet verified"}. Facility conditions can change.</p>
      {pool.latitude!=null&&pool.longitude!=null&&<a href={`https://www.google.com/maps/search/?api=1&query=${pool.latitude}%2C${pool.longitude}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-cyan-700 underline">View map location</a>}
    </section>
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Swimmer reviews</h2>
      <p className="flex items-center gap-2 text-sm text-slate-600"><Star className="h-5 w-5 text-amber-500"/>{pool.rating_count?`${pool.rating_average}/5 from ${pool.rating_count} approved reviews`:"No approved reviews yet"}</p>
      {reviews.map(r=><article key={r.id} className="rounded-xl border bg-white p-4"><p className="text-sm font-semibold">{r.rating}/5 · {r.attribution}</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{r.review}</p><p className="mt-2 text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString("en-NG")}</p></article>)}
      <form onSubmit={submit} className="space-y-3 rounded-xl border bg-white p-5">
        <h3 className="font-semibold">Share your experience</h3>
        <p className="text-sm text-slate-600">Reviews are checked before publication. A free account is required to prevent spam; you do not need SwimBuddz membership.</p>
        <label className="block text-sm font-semibold">Rating <select value={rating} onChange={e=>setRating(Number(e.target.value))} className="mt-1 block rounded-lg border p-3">{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} stars</option>)}</select></label>
        <label className="block text-sm font-semibold">Your review<textarea required minLength={15} maxLength={2000} value={review} onChange={e=>setReview(e.target.value)} className="mt-1 block w-full rounded-lg border p-3 font-normal" rows={4} placeholder="Tell other swimmers about the water quality, access, amenities and your experience."/></label>
        <button disabled={busy} className="min-h-11 rounded-lg bg-cyan-700 px-5 py-2 font-semibold text-white disabled:opacity-50">{busy?"Submitting…":"Submit review"}</button>
        {feedback&&<p role="status" className="text-sm text-slate-700">{feedback}</p>}
      </form>
    </section>
  </main>;
}
