"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";

type ClubTerm = {
  adjustment_id: string;
  member_id: string;
  enrollment_id: string;
  club_name: string;
  standard_session_fee_kobo: number | null;
  agreed_session_fee_kobo: number;
  potential_concession_per_swim_kobo: number | null;
  valid_until: string;
  reason: string;
};
const money = (v: number) => new Intl.NumberFormat("en-NG", {
  style: "currency", currency: "NGN", maximumFractionDigits: 0,
}).format(v / 100);

export default function ClubCommercialTermsReport() {
  const [items, setItems] = useState<ClubTerm[]>([]);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  useEffect(() => {
    void apiGet<{items: ClubTerm[]; note: string}>("/api/v1/clubs/admin/commercial-terms/report", {auth: true})
      .then(result => { setItems(result.items); setNote(result.note); })
      .catch((e: Error) => setError(e.message));
  }, []);
  return <main className="mx-auto max-w-6xl space-y-6 py-6">
    <Link href="/admin/finance/reports" className="text-sm text-cyan-700 underline">← Finance reports</Link>
    <h1 className="text-2xl font-semibold">Club approved pricing agreements</h1>
    <p className="text-slate-600">Temporary adjustments to individual enrollments. Standard Club and paid-add-on prices remain unchanged.</p>
    {error && <p role="alert" className="text-rose-700">{error}</p>}
    {note && <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">{note}</p>}
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-slate-50"><tr><th className="p-3">Location</th><th className="p-3">Member</th><th className="p-3">Standard swim</th><th className="p-3">Approved swim</th><th className="p-3">Difference / swim</th><th className="p-3">Valid until</th><th className="p-3">Reason</th></tr></thead>
        <tbody>{items.map(item => <tr className="border-t border-slate-200" key={item.adjustment_id}>
          <td className="p-3">{item.club_name}</td>
          <td className="p-3"><Link href={`/admin/community/members/${item.member_id}`} className="text-cyan-700 underline">View member</Link></td>
          <td className="p-3">{item.standard_session_fee_kobo == null ? "Not recorded" : money(item.standard_session_fee_kobo)}</td>
          <td className="p-3 font-semibold">{money(item.agreed_session_fee_kobo)}</td>
          <td className="p-3">{item.potential_concession_per_swim_kobo == null ? "—" : money(item.potential_concession_per_swim_kobo)}</td>
          <td className="p-3">{new Date(item.valid_until).toLocaleDateString("en-NG")}</td>
          <td className="p-3">{item.reason}</td>
        </tr>)}</tbody>
      </table>
    </div>
    {!error && items.length === 0 && <p>No pricing agreements recorded yet.</p>}
  </main>;
}
