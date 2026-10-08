"use client";
import { apiGet } from "@/lib/api";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SessionBooking={id?:string;session_id:string;status?:string};
type Session={id:string;title?:string;name?:string;start_time?:string;starts_at?:string;location_name?:string};
type PoolBooking={id:string;status:string;headcount:number;offer_id:string};
type Enrollment={id:string;cohort_id?:string;status:string;payment_status?:string;cohort?:{name?:string}};
type Item={id:string;type:string;title:string;subtitle:string;href:string;date?:string};

export default function MyBookings(){
 const [sessionBookings,setSessionBookings]=useState<SessionBooking[]>([]);
 const [sessions,setSessions]=useState<Session[]>([]);
 const [poolBookings,setPoolBookings]=useState<PoolBooking[]>([]);
 const [enrollments,setEnrollments]=useState<Enrollment[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 useEffect(()=>{
  Promise.allSettled([
   apiGet<SessionBooking[]>("/api/v1/sessions/bookings/me?status_filter=confirmed",{auth:true}).then(setSessionBookings),
   apiGet<Session[]>("/api/v1/sessions?limit=100",{auth:true}).then(setSessions),
   apiGet<PoolBooking[]>("/api/v1/pools/access/bookings/me",{auth:true}).then(setPoolBookings),
   apiGet<Enrollment[]>("/api/v1/academy/my-enrollments",{auth:true}).then(setEnrollments),
  ]).then(results=>{
   if(results.every(r=>r.status==="rejected"))setError("Bookings could not be loaded. Please retry.");
   setLoading(false);
  })
 },[]);
 const items=useMemo(()=>{
  const lookup=new Map(sessions.map(x=>[x.id,x]));
  const booked:Item[]=sessionBookings.map(b=>{
    const s=lookup.get(b.session_id);
    return {id:b.id||b.session_id,type:"Organised session",title:s?.title||s?.name||"SwimBuddz session",
     subtitle:s?.location_name||"Your session booking",href:"/sessions",date:s?.starts_at||s?.start_time};
  });
  const access:Item[]=poolBookings.map(b=>({id:b.id,type:"Pool Access",title:"Independent pool visit",
   subtitle:b.headcount+" swimmer(s) · "+b.status.replace("_"," "),href:"/account/pool-access"}));
  const academy:Item[]=enrollments.map(e=>({id:e.id,type:"Academy enrollment",title:e.cohort?.name||"Academy programme",
   subtitle:e.payment_status||e.status,href:"/account/academy/enrollments/"+e.id}));
  return [...booked,...access,...academy].sort((a,b)=>String(a.type).localeCompare(b.type));
 },[sessionBookings,sessions,poolBookings,enrollments]);
 return <main className="mx-auto max-w-5xl space-y-6 p-6">
  <header className="space-y-2"><h1 className="text-3xl font-bold text-slate-900">My Bookings</h1>
   <p className="text-slate-600">Manage Pool Access, your Academy journey and organised SwimBuddz sessions in one place.</p>
   <Link className="text-cyan-700 underline" href="/find-a-swim">Find your next swim</Link></header>
  {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
  {loading?<p>Loading your swim activity…</p>:items.length?<div className="grid gap-3">
   {items.map(item=><Link key={item.type+item.id} href={item.href} className="block rounded-xl border bg-white p-5 hover:border-cyan-300">
    <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700">{item.type}</p>
    <h2 className="mt-1 text-lg font-semibold text-slate-900">{item.title}</h2>
    <p className="text-sm text-slate-600">{item.subtitle}</p>
    {item.date&&<p className="mt-2 text-xs text-slate-500">{new Date(item.date).toLocaleString()}</p>}
   </Link>)}</div>:<div className="rounded-xl border p-8 text-center">
    <p className="font-medium">You do not have any bookings yet.</p><Link className="mt-3 inline-block text-cyan-700 underline" href="/find-a-swim">Explore experiences</Link>
   </div>}
 </main>;
}
