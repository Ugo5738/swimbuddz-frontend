"use client";
import {apiGet,apiPost} from "@/lib/api";
import Link from "next/link";
import {useCallback,useEffect,useState} from "react";
type Booking={booking_id:string;pool_id:string;offer_title:string;buyer_email:string;headcount:number;status:string;revenue_kobo:number;currency:string;payment_reference:string|null;reconciliation_id:string|null;verified_admissions:number|null;partner_payable_kobo:number|null;visit_end_at:string};
const currency=(kobo:number,c:string)=>new Intl.NumberFormat("en-NG",{style:"currency",currency:c}).format(kobo/100);
export default function PoolAccessSettlement(){
 const [items,setItems]=useState<Booking[]>([]);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState<string|null>(null);
 const load=useCallback(async()=>{try{setItems(await apiGet<Booking[]>("/api/v1/admin/pools/access/bookings",{auth:true}));}catch(e){setError(e instanceof Error?e.message:"Failed to load settlements")}},[]);
 useEffect(()=>{void load()},[load]);
 async function reconcile(b:Booking){setError("");setBusy(b.booking_id);
  try{await apiPost("/api/v1/pools/access/bookings/"+b.booking_id+"/reconcile",{}, {auth:true});await load();}
  catch(e){setError(e instanceof Error?e.message:"Could not reconcile this booking")}
  finally{setBusy(null)}
 }
 async function recordExternalSettlement(b:Booking){
  if(!b.reconciliation_id)return;
  setError("");setBusy(b.booking_id);
  try{
   const current=await apiGet<{liability_kobo:number;settled_kobo:number;currency:string;entries:unknown[]}>(
    "/api/v1/pools/access/reconciliations/"+b.reconciliation_id+"/settlements",{auth:true}
   );
   const due=current.liability_kobo-current.settled_kobo;
   if(due<=0){setError("This partner liability has already been fully recorded as settled.");return;}
   const rawAmount=window.prompt("Outstanding: "+currency(due,b.currency)+". Enter the amount actually confirmed paid to the pool (₦):",(due/100).toFixed(2));
   if(!rawAmount)return;
   const amount_kobo=Math.round(Number(rawAmount)*100);
   if(!Number.isSafeInteger(amount_kobo)||amount_kobo<=0||amount_kobo>due)throw new Error("Amount must be a positive value not exceeding the outstanding liability.");
   const bank_reference=window.prompt("Enter the verified bank transfer reference:");
   if(!bank_reference)return;
   const evidence_note=window.prompt("Record payment evidence, paying account and bank confirmation details:");
   if(!evidence_note)return;
   await apiPost("/api/v1/pools/access/reconciliations/"+b.reconciliation_id+"/record-external-settlement",{
    amount_kobo,bank_reference:bank_reference.trim(),evidence_note:evidence_note.trim()
   },{auth:true});
   setError("External bank payment recorded. This did not initiate a transfer.");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Could not record external partner settlement");}
  finally{setBusy(null)}
 }
 return <main className="mx-auto max-w-6xl space-y-6 p-6">
   <header><p className="text-xs uppercase tracking-widest text-cyan-700">Partner finance</p>
    <h1 className="text-3xl font-bold">Pool Access settlements</h1>
    <p className="mt-2 text-slate-600">Compare paid sales with verified entries. A reconciliation snapshot is not an automatic payout.</p>
    <Link href="/admin/pools/access" className="text-cyan-700 underline">Manage offers</Link>
   </header>
   {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
   {items.length===0?<p>No independent Pool Access bookings yet.</p>:<div className="overflow-x-auto rounded-xl border bg-white">
    <table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr>
     <th className="p-3">Visit</th><th className="p-3">Booking</th><th className="p-3">Revenue</th><th className="p-3">Verified</th><th className="p-3">Pool cost</th><th className="p-3">Actions</th>
    </tr></thead><tbody>{items.map(b=><tr className="border-t" key={b.booking_id}>
     <td className="p-3"><strong>{b.offer_title}</strong><p className="text-xs text-slate-500">{b.buyer_email}</p></td>
     <td className="p-3">{b.status}<p className="text-xs text-slate-500">{b.headcount} booked</p></td>
     <td className="p-3">{currency(b.revenue_kobo,b.currency)}</td>
     <td className="p-3">{b.verified_admissions??"Pending"}</td>
     <td className="p-3">{b.partner_payable_kobo===null?"Not reconciled":currency(b.partner_payable_kobo,b.currency)}</td>
     <td className="p-3"><div className="flex flex-col gap-2">{b.status==="confirmed"&&b.verified_admissions===null?<button className="rounded-lg border p-2 text-cyan-700" disabled={busy===b.booking_id} onClick={()=>void reconcile(b)}>{busy===b.booking_id?"Processing…":"Reconcile after visit"}</button>:null}{b.reconciliation_id&&b.partner_payable_kobo!==null&&b.partner_payable_kobo>0?<button className="rounded-lg border p-2 text-cyan-700" disabled={busy===b.booking_id} onClick={()=>void recordExternalSettlement(b)}>Record verified bank payout</button>:null}</div></td>
    </tr>)}</tbody></table>
   </div>}
 </main>;
}
