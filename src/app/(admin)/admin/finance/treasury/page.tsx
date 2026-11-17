"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";
import { formatNaira } from "@/lib/format";

type LedgerOption = { id: string; code: string; name: string };
type Role = "viewer" | "accountant" | "admin" | "owner";
type Bank = { id: string; code: string; bank_name: string; purpose: string; last_four: string | null; statement_balance_minor: number | null; statement_as_of: string | null };
type Budget = { id: string; name: string; category: string; amount_minor: number; starts_on: string; ends_on: string };
type RequestItem = {
  id: string; kind: "expense" | "funding"; status: string; amount_minor: number;
  purpose: string; category: string; source_bank_id: string; destination_bank_id: string | null;
  requested_by: string; created_at: string; approved_at: string | null;
  bank_line_id: string | null; destination_bank_line_id: string | null;
};
type Statement = {
  id: string; bank_account_id: string; statement_id: string; row_number: number;
  occurred_on: string; amount_minor: number; description: string;
  reference: string | null; match_status: string; request_id: string | null; journal_entry_id: string | null;
};
type Summary = { banks: Bank[]; pending_requests: number; approved_awaiting_bank_evidence: number; unmatched_statement_lines: number; confirmed_expenses_minor: number };
type FinanceMember = { id: string; role: Role };
const ROOT = "/api/v1/admin/finance/treasury";
const money = (amountMinor: number) => formatNaira(amountMinor / 100);
function toMinor(naira: string): number {
  const amount = naira.trim().replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(amount)) throw new Error("Enter a positive Naira amount with at most two decimal places.");
  const [whole, fraction = ""] = amount.split(".");
  const value = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error("Amount is invalid.");
  return value;
}
function parseSignedMinor(naira: string): number {
  const cleaned = naira.trim().replace(/,/g, "");
  const negative = cleaned.startsWith("-");
  const amount = toMinor(negative ? cleaned.slice(1) : cleaned);
  return negative ? -amount : amount;
}
function parseCsv(raw: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === '"') {
      if (quoted && raw[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (c === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && raw[i + 1] === "\n") i++;
      row.push(cell); if (row.some((value) => value.trim())) rows.push(row);
      row = []; cell = "";
    } else cell += c;
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  row.push(cell); if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}
function csvToStatement(text: string) {
  // Deliberately require a reviewed standard template instead of silently guessing
  // debit/credit sign conventions from arbitrary exports from different banks.
  const rows = parseCsv(text.replace(/^\uFEFF/, ""));
  if (rows.length < 2) throw new Error("The CSV must contain a header and at least one transaction.");
  const header = rows[0].map((v) => v.trim().toLowerCase());
  const required = ["date", "amount_ngn", "description", "reference"];
  if (required.some((col) => !header.includes(col))) {
    throw new Error("Expected CSV columns: date, amount_ngn, description, reference. Credits are positive; debits are negative. Convert bank exports to this template before importing.");
  }
  if (rows.length > 251) throw new Error("A statement can contain at most 250 rows per import.");
  return rows.slice(1).map((cols, i) => {
    const pick = (key: string) => (cols[header.indexOf(key)] || "").trim();
    const date = pick("date");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) throw new Error("Invalid date on CSV row " + (i + 2));
    return {
      row_number: i + 1, occurred_on: date, amount_minor: parseSignedMinor(pick("amount_ngn")),
      description: pick("description"), reference: pick("reference") || null,
    };
  });
}
const control = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
const primary = "rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";
const secondary = "rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50";
const tile = "rounded-xl border border-slate-200 bg-white p-4";

export default function TreasuryPage() {
  const [member, setMember] = useState<FinanceMember | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [lines, setLines] = useState<Statement[]>([]);
  const [ledgerOptions, setLedgerOptions] = useState<LedgerOption[]>([]);
  const [matchEntries, setMatchEntries] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [kind, setKind] = useState<"expense" | "funding">("expense");
  const [bankId, setBankId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [category, setCategory] = useState("pool_fees");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [selectedBudget, setSelectedBudget] = useState("");
  const [newBudgetName, setNewBudgetName] = useState("");
  const [newBudgetCategory, setNewBudgetCategory] = useState("pool_fees");
  const [newBudgetAmount, setNewBudgetAmount] = useState("");
  const [newBudgetStart, setNewBudgetStart] = useState("");
  const [newBudgetEnd, setNewBudgetEnd] = useState("");
  const [statementBank, setStatementBank] = useState("");
  const [statementId, setStatementId] = useState("");
  const [statementRows, setStatementRows] = useState<ReturnType<typeof csvToStatement>>([]);
  const [confirmation, setConfirmation] = useState<Record<string, { source: string; destination: string }>>({});

  const load = useCallback(async () => {
    try {
      const [me, s, r, b, l, lo] = await Promise.all([
        apiGet<FinanceMember>("/api/v1/admin/finance/users/me", { auth: true }),
        apiGet<Summary>(ROOT + "/summary", { auth: true }),
        apiGet<RequestItem[]>(ROOT + "/requests", { auth: true }),
        apiGet<Budget[]>(ROOT + "/budgets", { auth: true }),
        apiGet<Statement[]>(ROOT + "/statements", { auth: true }),
        apiGet<LedgerOption[]>(ROOT + "/ledger-options", { auth: true }),
      ]);
      setMember(me); setSummary(s); setRequests(r); setBudgets(b); setLines(l); setLedgerOptions(lo);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load treasury."); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const banks = summary?.banks ?? [];
  const treasury = banks.find((b) => b.purpose === "treasury");
  const operations = banks.find((b) => b.purpose === "operations");
  const canPrepare = member?.role === "accountant" || member?.role === "admin" || member?.role === "owner";
  const owner = member?.role === "owner";
  const availableBudgets = budgets.filter((b) => b.category === category);
  const unmatched = useMemo(() => lines.filter((l) => l.match_status === "unmatched"), [lines]);

  async function run(task: () => Promise<unknown>, success: string) {
    setError(""); setMessage(""); setBusy(true);
    try { await task(); setMessage(success); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Request failed."); }
    finally { setBusy(false); }
  }
  const bankName = (id: string | null) => banks.find((b) => b.id === id)?.bank_name ?? "Unknown bank";

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="space-y-2">
        <Link href="/admin/finance" className="text-sm text-cyan-700 hover:underline">Finance overview</Link>
        <h1 className="text-3xl font-bold text-slate-900">Treasury & Operations</h1>
        <p className="text-sm text-slate-600">Stanbic is the primary collection and treasury bank; Moniepoint holds controlled operating funds. Platform approvals do not execute bank transfers.</p>
      </header>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Treasury summary">
        {[
          ["Awaiting internal decision", summary?.pending_requests],
          ["Approved, awaiting bank evidence", summary?.approved_awaiting_bank_evidence],
          ["Statement lines unmatched", summary?.unmatched_statement_lines],
          ["Confirmed operating expenses", summary ? money(summary.confirmed_expenses_minor) : null],
        ].map(([label, value]) => <div key={String(label)} className={tile}><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-xl font-semibold">{value ?? "—"}</p></div>)}
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {(["stanbic", "moniepoint"] as const).map((code) => {
          const bank = banks.find((b) => b.code === code);
          return <div key={code} className={tile}>
            <div className="flex items-center justify-between gap-2"><h2 className="text-lg font-semibold">{code === "stanbic" ? "Stanbic IBTC" : "Moniepoint"}</h2><span className="text-xs uppercase text-slate-500">{code === "stanbic" ? "Treasury" : "Operations"}</span></div>
            {bank ? <>
              <p className="mt-2 text-xs text-slate-500">Account ending {bank.last_four || "not specified"}</p>
              <p className="mt-2 text-sm text-slate-600">Bank balance: Not connected — reconcile statement evidence before relying on a cash figure.</p>
              <p className="mt-1 text-xs text-slate-500">{bank.ledger_account_id ? "Linked to accounting ledger" : "Accounting ledger not yet linked"}</p>
              {owner && !bank.ledger_account_id && (code === "moniepoint" ?
                <button className={secondary} disabled={busy} onClick={() => void run(() => apiPost(ROOT + "/banks/" + bank.id + "/create-operations-ledger", {}, { auth: true }), "Moniepoint ledger account created and linked.")}>Create dedicated Moniepoint ledger account</button> :
                <button className={secondary} disabled={busy || !ledgerOptions.some((o) => o.code === "1110")} onClick={() => { const account = ledgerOptions.find((o) => o.code === "1110"); if (account && window.confirm("Confirm Stanbic is the bank represented by the existing NGN operating ledger account, including its historical postings.")) void run(() => apiPost(ROOT + "/banks/" + bank.id + "/link-ledger", { account_id: account.id }, { auth: true }), "Stanbic linked to the existing settlement ledger."); }}>Link existing Stanbic NGN ledger</button>)}
            </> : <div className="mt-3 space-y-2"><p className="text-sm text-amber-700">Not registered in the finance ledger.</p>
              {owner && <button className={secondary} disabled={busy} onClick={() => void run(() => apiPost(ROOT + "/banks", { code }, { auth: true }), "Bank account created. Opening balance must be independently verified.")}>Register {code === "stanbic" ? "Stanbic" : "Moniepoint"}</button>}
            </div>}
          </div>;
        })}
      </section>

      <section className={tile}>
        <h2 className="text-lg font-semibold">New expense or operations funding request</h2>
        <p className="mb-4 text-sm text-slate-500">Requests require independent internal approval and bank evidence before being marked confirmed.</p>
        {canPrepare ? <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void run(async () => {
          await apiPost(ROOT + "/requests", {
            kind, amount_minor: toMinor(amount), purpose, category,
            source_bank_id: bankId || (kind === "funding" ? treasury?.id : operations?.id),
            destination_bank_id: kind === "funding" ? (destinationId || operations?.id) : null,
            budget_id: selectedBudget || null,
          }, { auth: true });
          setAmount(""); setPurpose("");
        }, "Request submitted for independent approval."); }}>
          <label className="text-sm">Type<select className={control} value={kind} onChange={(e) => { const next = e.target.value as "expense" | "funding"; setKind(next); setBankId(""); }}><option value="expense">Operating expense</option><option value="funding">Stanbic → Moniepoint allocation</option></select></label>
          <label className="text-sm">Amount (₦)<input className={control} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="15000.00" required /></label>
          <label className="text-sm">Source bank<select className={control} value={bankId || (kind === "funding" ? treasury?.id : operations?.id) || ""} onChange={(e) => setBankId(e.target.value)} required><option value="">Choose account</option>{banks.filter((b) => kind === "expense" || b.purpose === "treasury").map((b) => <option key={b.id} value={b.id}>{b.bank_name}</option>)}</select></label>
          {kind === "funding" && <label className="text-sm">Destination<select className={control} value={destinationId || operations?.id || ""} onChange={(e) => setDestinationId(e.target.value)} required><option value="">Choose account</option>{banks.filter((b) => b.purpose === "operations").map((b) => <option key={b.id} value={b.id}>{b.bank_name}</option>)}</select></label>}
          <label className="text-sm">Category<input className={control} value={category} maxLength={80} onChange={(e) => { setCategory(e.target.value); setSelectedBudget(""); }} required /></label>
          <label className="text-sm">Budget (optional)<select className={control} value={selectedBudget} onChange={(e) => setSelectedBudget(e.target.value)}><option value="">Not linked to a budget</option>{availableBudgets.map((b) => <option key={b.id} value={b.id}>{b.name} — {money(b.amount_minor)}</option>)}</select></label>
          <label className="text-sm md:col-span-2">Purpose and supporting context<textarea className={control} value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2} required minLength={5} /></label>
          <div><button className={primary} disabled={busy || !banks.length}>Submit request</button></div>
        </form> : <p className="text-sm text-slate-500">Your finance role has view-only access.</p>}
      </section>

      <section className={tile}>
        <h2 className="text-lg font-semibold">Requests & decisions</h2>
        <div className="mt-3 space-y-3">
          {requests.length === 0 && <p className="text-sm text-slate-500">No treasury requests recorded yet.</p>}
          {requests.map((r) => {
            const candidateDebits = unmatched.filter((l) => l.bank_account_id === r.source_bank_id && l.amount_minor === -r.amount_minor);
            const candidateCredits = unmatched.filter((l) => l.bank_account_id === r.destination_bank_id && l.amount_minor === r.amount_minor);
            const selected = confirmation[r.id] ?? { source: "", destination: "" };
            return <article className="rounded-lg border border-slate-200 p-3" key={r.id}>
              <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{money(r.amount_minor)} · {r.kind === "funding" ? "Operations allocation" : "Expense"}</p><p className="text-sm text-slate-600">{r.purpose}</p><p className="text-xs text-slate-500">{bankName(r.source_bank_id)}{r.destination_bank_id ? " → " + bankName(r.destination_bank_id) : ""} · {r.category}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{r.status}</span></div>
              {owner && r.status === "requested" && member?.id !== r.requested_by && <div className="mt-3 flex gap-2"><button disabled={busy} className={primary} onClick={() => void run(() => apiPost(ROOT + "/requests/" + r.id + "/decision", { action: "approve" }, { auth: true }), "Request approved internally. No bank payment has been sent.")}>Approve internally</button><button disabled={busy} className={secondary} onClick={() => { const reason = window.prompt("Reason for rejection"); if (reason?.trim()) void run(() => apiPost(ROOT + "/requests/" + r.id + "/decision", { action: "reject", reason }, { auth: true }), "Request rejected."); }}>Reject</button></div>}
              {owner && r.status === "approved" && <div className="mt-3 grid gap-2 md:grid-cols-3">
                <label className="text-xs">Bank debit evidence<select className={control} value={selected.source} onChange={(e) => setConfirmation((old) => ({ ...old, [r.id]: { ...selected, source: e.target.value } }))}><option value="">Choose matching debit</option>{candidateDebits.map((l) => <option key={l.id} value={l.id}>{l.occurred_on}: {l.description.slice(0, 60)}</option>)}</select></label>
                {r.kind === "funding" && <label className="text-xs">Bank credit evidence<select className={control} value={selected.destination} onChange={(e) => setConfirmation((old) => ({ ...old, [r.id]: { ...selected, destination: e.target.value } }))}><option value="">Choose matching credit</option>{candidateCredits.map((l) => <option key={l.id} value={l.id}>{l.occurred_on}: {l.description.slice(0, 60)}</option>)}</select></label>}
                <div className="self-end"><button className={secondary} disabled={busy || !selected.source || (r.kind === "funding" && !selected.destination)} onClick={() => {
                  if (!window.confirm("Have you independently checked both bank records? This only records confirmation; it does not send money.")) return;
                  void run(() => apiPost(ROOT + "/requests/" + r.id + "/confirm", { source_line_id: selected.source, destination_line_id: r.kind === "funding" ? selected.destination : null }, { auth: true }), "Bank evidence linked and request confirmed.");
                }}>Confirm bank evidence</button></div>
              </div>}
            </article>;
          })}
        </div>
      </section>

      <section className={tile}>
        <h2 className="text-lg font-semibold">Bank statement evidence</h2>
        <p className="mt-1 text-sm text-slate-600">Only reviewed CSV templates are accepted. Required columns: <code>date,amount_ngn,description,reference</code>. Debit amounts are negative and credits positive, with dates as YYYY-MM-DD.</p>
        <p className="mt-1 text-xs text-amber-800">Imported rows are unverified evidence, not automatically bank-confirmed balances or ledger postings. Verify against the actual bank portal before approving settlement.</p>
        {canPrepare && <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="text-sm">Bank<select className={control} value={statementBank} onChange={(e) => setStatementBank(e.target.value)}><option value="">Choose account</option>{banks.map((b) => <option key={b.id} value={b.id}>{b.bank_name}</option>)}</select></label>
          <label className="text-sm">Unique statement ID<input className={control} value={statementId} onChange={(e) => setStatementId(e.target.value)} placeholder="stanbic-2026-11" /></label>
          <label className="text-sm">Reviewed CSV file<input className="block w-full py-2 text-sm" type="file" accept=".csv,text/csv" onChange={async (e) => {
            try { const file = e.target.files?.[0]; if (file) { setStatementRows(csvToStatement(await file.text())); setError(""); } }
            catch (err) { setStatementRows([]); setError(err instanceof Error ? err.message : "Invalid CSV"); }
          }} /></label>
          <div className="md:col-span-3 flex items-center gap-3"><span className="text-sm text-slate-500">{statementRows.length} rows ready</span><button disabled={busy || !statementBank || !statementId.trim() || !statementRows.length} className={primary} onClick={() => void run(() => apiPost(ROOT + "/banks/" + statementBank + "/statements", { statement_id: statementId.trim(), rows: statementRows }, { auth: true }), "Statement evidence imported. Review unmatched entries.")}>Import statement</button></div>
        </div>}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="py-2">Date</th><th>Bank</th><th>Reference</th><th>Amount</th><th>Review state</th><th>Ledger evidence</th></tr></thead><tbody>{lines.slice(0, 40).map((l) => <tr className="border-b border-slate-100" key={l.id}><td className="py-2">{l.occurred_on}</td><td>{bankName(l.bank_account_id)}</td><td className="max-w-48 truncate" title={l.description}>{l.reference || l.description}</td><td className={l.amount_minor < 0 ? "text-red-700" : "text-emerald-700"}>{money(l.amount_minor)}</td><td>{l.match_status}</td><td>{canPrepare && !l.journal_entry_id ? <div className="flex min-w-48 gap-1"><input className={control} aria-label="Posted journal entry UUID" placeholder="Posted journal UUID" value={matchEntries[l.id] ?? ""} onChange={(e) => setMatchEntries((old) => ({ ...old, [l.id]: e.target.value }))} /><button disabled={busy || !matchEntries[l.id]} className={secondary} onClick={() => void run(() => apiPost(ROOT + "/statements/" + l.id + "/match-journal", { journal_entry_id: matchEntries[l.id] }, { auth: true }), "Bank movement matched to posted ledger entry.")}>Match</button></div> : (l.journal_entry_id ? "Linked" : "—")}</td></tr>)}</tbody></table>
          {!lines.length && <p className="py-3 text-sm text-slate-500">No bank evidence has been imported yet.</p>}
        </div>
      </section>

      <section className={tile}>
        <h2 className="text-lg font-semibold">Approved operating budgets</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">{budgets.map((b) => <div key={b.id} className="rounded-lg bg-slate-50 p-3"><p className="font-medium">{b.name}</p><p className="text-sm">{money(b.amount_minor)} · {b.category}</p><p className="text-xs text-slate-500">{b.starts_on} – {b.ends_on}</p></div>)}</div>
        {owner && <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={(e) => { e.preventDefault(); void run(() => apiPost(ROOT + "/budgets", {
          name: newBudgetName, category: newBudgetCategory, amount_minor: toMinor(newBudgetAmount),
          starts_on: newBudgetStart, ends_on: newBudgetEnd,
        }, { auth: true }), "Budget created."); }}>
          <label className="text-sm">Budget name<input className={control} required value={newBudgetName} onChange={(e) => setNewBudgetName(e.target.value)} /></label>
          <label className="text-sm">Category<input className={control} required value={newBudgetCategory} onChange={(e) => setNewBudgetCategory(e.target.value)} /></label>
          <label className="text-sm">Limit (₦)<input className={control} required value={newBudgetAmount} onChange={(e) => setNewBudgetAmount(e.target.value)} /></label>
          <label className="text-sm">From<input type="date" className={control} required value={newBudgetStart} onChange={(e) => setNewBudgetStart(e.target.value)} /></label>
          <label className="text-sm">Until<input type="date" className={control} required value={newBudgetEnd} onChange={(e) => setNewBudgetEnd(e.target.value)} /></label>
          <div className="self-end"><button disabled={busy} className={primary}>Create budget</button></div>
        </form>}
      </section>
      <p className="text-xs text-slate-500">No bank API integration is configured. Accounts shown here represent your internal financial controls; always verify movements against Stanbic and Moniepoint.</p>
    </main>
  );
}
