"use client";
import {supabase} from "@/lib/auth";
import Link from "next/link";
import {useState} from "react";

export default function PoolAccessVisitorRegistration(){
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [sent,setSent]=useState(false);
 async function submit(e:React.FormEvent){
  e.preventDefault();setError("");setBusy(true);
  try{
   const destination="/pool-access";
   const confirmationUrl=new URL("/auth/callback",window.location.origin);
   confirmationUrl.searchParams.set("next",destination);
   const {data,error:authError}=await supabase.auth.signUp({
    email:email.trim().toLowerCase(),
    password,
    options:{
      emailRedirectTo:confirmationUrl.toString(),
      data:{pool_access_visitor:true,registration_return_to:destination},
    },
   });
   if(authError)throw authError;
   if(data.session){
     window.location.assign(destination);
     return;
   }
   setSent(true);
  }catch(e){setError(e instanceof Error?e.message:"Could not register visitor account");}
  finally{setBusy(false)}
 }
 return <main className="mx-auto max-w-xl space-y-5 px-4 py-12">
  <header className="space-y-2"><p className="text-sm font-semibold uppercase text-cyan-700">SwimBuddz Pool Access</p>
   <h1 className="text-3xl font-bold">Book as a visitor</h1>
   <p className="text-slate-600">You do not need Academy, Club or Community membership to book independent Pool Access. Create a free visitor login to keep your payment and QR credentials securely attached to your email.</p></header>
  {sent?<div role="status" className="rounded-xl border bg-white p-6">
   <h2 className="text-xl font-semibold">Check your email</h2>
   <p className="mt-2 text-slate-600">Follow the verification link sent to {email}. Then return to Pool Access to choose your visit.</p>
   <Link href="/login?redirect=%2Fpool-access" className="mt-4 inline-block text-cyan-700 underline">Already confirmed? Sign in</Link>
  </div>:<form onSubmit={submit} className="space-y-4 rounded-xl border bg-white p-6">
   {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
   <label className="block text-sm font-semibold">Email address<input type="email" autoComplete="email" required className="mt-1 w-full rounded-lg border p-3" value={email} onChange={e=>setEmail(e.target.value)}/></label>
   <label className="block text-sm font-semibold">Password<input type="password" autoComplete="new-password" minLength={8} required className="mt-1 w-full rounded-lg border p-3" value={password} onChange={e=>setPassword(e.target.value)}/></label>
   <p className="text-xs text-slate-600">Pool Access admission is subject to the published pool rules, safety eligibility, availability, and payment confirmation. This does not include coaching or membership benefits.</p>
   <button disabled={busy} className="rounded-lg bg-cyan-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{busy?"Creating account…":"Create free visitor login"}</button>
  </form>}
  <p className="text-sm text-slate-600">Already have an account? <Link href="/login?redirect=%2Fpool-access" className="text-cyan-700 underline">Sign in</Link></p>
 </main>;
}
