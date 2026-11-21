"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { formatNaira } from "@/lib/format";

type LedgerOption = { id: string; code: string; name: string };
type ExpenseOption = { code: string; name: string };
type Role = "viewer" | "operations" | "accountant" | "admin" | "owner";
type Bank = { id: string; code: string; bank_name: string; purpose: string; last_four: string | null; ledger_account_id: string | null; statement_balance_minor: number | null; statement_as_of: string | null; statement_verified_at: string | null };
type BudgetUtilization = { id: string; kind: string; name: string; category: string; limit_minor: number; committed_minor: number; confirmed_minor: number; remaining_minor: number; starts_on: string; ends_on: string };
type Budget = { id: string; kind: "expense" | "funding"; name: string; category: string; amount_minor: number; starts_on: string; ends_on: string };
type RequestItem = {
  id: string; kind: "expense" | "funding"; status: string; amount_minor: number; budget_id: string | null; approval_note: string | null;
  purpose: string; category: string; source_bank_id: string; destination_bank_id: string | null;
  requested_by: string; created_at: string; approved_at: string | null;
  vendor_name: string | null; invoice_reference: string | null; evidence_reference: string | null;
  programme: string | null; cost_center_code: string | null; service_on: string | null;
  journal_entry_id: string | null; ledger_posted_at: string | null;
  bank_line_id: string | null; destination_bank_line_id: string | null;
};
type Statement = {
  id: string; bank_account_id: string; statement_id: string; row_number: number;
  occurred_on: string; amount_minor: number; description: string;
  reference: string | null; match_status: string; request_id: string | null; journal_entry_id: string | null;
};
type Summary = { banks: Bank[]; pending_requests: number; approved_awaiting_bank_evidence: number; unmatched_statement_lines: number; confirmed_expenses_minor: number };
type FinanceMember = { id: string; role: Role };
type Recon = { bank_id: string; code: string; latest_statement_balance_minor: number | null; latest_statement_date: string | null; ledger_balance_minor: number | null; difference_minor: number | null; matched_rows: number; unmatched_rows: number; status: string };
type Forecast = { id: string; direction: "inflow" | "outflow"; scenario: string; effective_on: string; amount_minor: number; purpose: string; programme: string | null };
type Projection = { scenario: string; projected_ending_minor: number | null; latest_bank_snapshot_date: string | null; planned_inflows_minor: number; planned_outflows_minor: number; pending_approved_expenses_minor: number; caveat: string };
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
function bankBalanceMinor(input: string): number {
  const normalized = input.trim().replace(/,/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) throw new Error("Bank balance must be entered in Naira with at most two decimal places.");
  const negative = normalized.startsWith("-");
  const [major, fraction = ""] = (negative ? normalized.slice(1) : normalized).split(".");
  const minor = Number(major) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(minor)) throw new Error("Bank balance exceeds safe precision.");
  return negative ? -minor : minor;
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
  const [utilization, setUtilization] = useState<BudgetUtilization[]>([]);
  const [lines, setLines] = useState<Statement[]>([]);
  const [recon, setRecon] = useState<Recon[]>([]);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [projection, setProjection] = useState<Projection | null>(null);
  const [projectionDays, setProjectionDays] = useState<7 | 30 | 90>(30);
  const [projectionScenario, setProjectionScenario] = useState("base");
  const [forecastScenario, setForecastScenario] = useState("base");
  const [forecastDirection, setForecastDirection] = useState<"inflow" | "outflow">("outflow");
  const [forecastDate, setForecastDate] = useState("");
  const [forecastAmount, setForecastAmount] = useState("");
  const [forecastPurpose, setForecastPurpose] = useState("");
  const [forecastProgramme, setForecastProgramme] = useState("");
  const [snapshotBank, setSnapshotBank] = useState("");
  const [snapshotDate, setSnapshotDate] = useState("");
  const [snapshotAmount, setSnapshotAmount] = useState("");
  const [snapshotEvidence, setSnapshotEvidence] = useState("");
  const [expenseVendor, setExpenseVendor] = useState("");
  const [expenseInvoice, setExpenseInvoice] = useState("");
  const [expenseEvidence, setExpenseEvidence] = useState("");
  const [expenseProgramme, setExpenseProgramme] = useState("");
  const [expenseCostCenter, setExpenseCostCenter] = useState("");
  const [serviceOn, setServiceOn] = useState("");
  const [postingExpenseCode, setPostingExpenseCode] = useState<Record<string, string>>({});
  const [newBudgetKind, setNewBudgetKind] = useState<"expense" | "funding">("expense");
  const [ledgerOptions, setLedgerOptions] = useState<LedgerOption[]>([]);
  const [expenseOptions, setExpenseOptions] = useState<ExpenseOption[]>([]);
  const [matchEntries, setMatchEntries] = useState<Record<string, string>>({});
  const [existingEntry, setExistingEntry] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [kind, setKind] = useState<"expense" | "funding">("expense");
  const [bankId, setBankId] = useState("");
  const [showBankRegistration, setShowBankRegistration] = useState(false);
  const [newBankName, setNewBankName] = useState("");
  const [newBankPurpose, setNewBankPurpose] = useState<"treasury" | "operations">("operations");
  const [newBankLastFour, setNewBankLastFour] = useState("");
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
      const [me, s, r, b, l, lo, rc, fc, cp, eo, bu] = await Promise.all([
        apiGet<FinanceMember>("/api/v1/admin/finance/users/me", { auth: true }),
        apiGet<Summary>(ROOT + "/summary", { auth: true }),
        apiGet<RequestItem[]>(ROOT + "/requests", { auth: true }),
        apiGet<Budget[]>(ROOT + "/budgets", { auth: true }),
        apiGet<Statement[]>(ROOT + "/statements", { auth: true }),
        apiGet<LedgerOption[]>(ROOT + "/ledger-options", { auth: true }),
        apiGet<Recon[]>(ROOT + "/reconciliation/banks", { auth: true }),
        apiGet<Forecast[]>(ROOT + "/forecasts", { auth: true }),
        apiGet<Projection>(ROOT + "/cash-projection?days=" + projectionDays + "&scenario=" + projectionScenario, { auth: true }),
        apiGet<ExpenseOption[]>(ROOT + "/expense-ledger-options", { auth: true }),
        apiGet<BudgetUtilization[]>(ROOT + "/budgets/utilization", { auth: true }),
      ]);
      setMember(me); setSummary(s); setRequests(r); setBudgets(b); setLines(l); setLedgerOptions(lo); setRecon(rc); setForecasts(fc); setProjection(cp); setExpenseOptions(eo); setUtilization(bu);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load treasury."); }
  }, [projectionDays, projectionScenario]);
  useEffect(() => { void load(); }, [load]);

  const banks = summary?.banks ?? [];
  // Never silently choose between several accounts that share a purpose.
  const treasuryBanks = banks.filter((b) => b.purpose === "treasury");
  const operationsBanks = banks.filter((b) => b.purpose === "operations");
  const treasury = treasuryBanks.length === 1 ? treasuryBanks[0] : undefined;
  const operations = operationsBanks.length === 1 ? operationsBanks[0] : undefined;
  const canPrepare = member?.role === "operations" || member?.role === "accountant" || member?.role === "admin" || member?.role === "owner";
  const owner = member?.role === "owner";
  const availableBudgets = budgets.filter((b) => b.category === category && b.kind === kind);
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
        <p className="text-sm text-slate-600">Register and reconcile each company bank account independently. Internal approvals do not execute payments or establish a live bank connection.</p>
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

      <section className={tile}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Company bank accounts</h2>
            <p className="text-sm text-slate-600">Account registration, ledger linking and live bank feeds are separate steps.</p>
          </div>
          {owner && <button type="button" className={secondary} onClick={() => setShowBankRegistration(!showBankRegistration)}>
            {showBankRegistration ? "Cancel" : "Register bank account"}
          </button>}
        </div>
        {owner && showBankRegistration && <form className="mt-4 grid gap-3 sm:grid-cols-3"
          onSubmit={(e) => { e.preventDefault(); void run(async () => {
            await apiPost(ROOT + "/banks", {
              bank_name: newBankName.trim(), purpose: newBankPurpose, last_four: newBankLastFour || null,
            }, { auth: true });
            setNewBankName(""); setNewBankLastFour(""); setShowBankRegistration(false);
          }, "Bank account registered. No live bank feed or opening balance has been inferred."); }}>
          <label className="text-sm">Bank or financial institution
            <input className={control} value={newBankName} onChange={(e) => setNewBankName(e.target.value)}
              placeholder="e.g. Stanbic IBTC" minLength={2} maxLength={120} required />
          </label>
          <label className="text-sm">Account purpose
            <select className={control} value={newBankPurpose} onChange={(e) => setNewBankPurpose(e.target.value as "treasury" | "operations")}>
              <option value="treasury">Treasury / collections</option>
              <option value="operations">Operations</option>
            </select>
          </label>
          <label className="text-sm">Last four digits (optional)
            <input className={control} value={newBankLastFour} onChange={(e) => setNewBankLastFour(e.target.value)}
              placeholder="1234" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} />
          </label>
          <div className="sm:col-span-3"><button className={primary} disabled={busy || !newBankName.trim()}>Register account</button></div>
        </form>}
      </section>

      <section className="grid gap-3 md:grid-cols-2" aria-label="Registered bank accounts">
        {banks.length === 0 && <div className={tile}><p className="text-sm text-slate-600">No bank accounts have been registered yet.</p></div>}
        {banks.map((bank) => <div key={bank.id} className={tile}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{bank.bank_name}</h2>
            <span className="text-xs uppercase text-slate-500">{bank.purpose}</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Account ending {bank.last_four || "not specified"}</p>
          <p className="mt-2 text-sm text-slate-600">Bank feed not connected — upload and reconcile verified statement evidence before relying on a cash balance.</p>
          <p className="mt-1 text-xs text-slate-500">{bank.ledger_account_id ? "Linked to accounting ledger" : "Accounting ledger not yet linked"}</p>
          {owner && !bank.ledger_account_id && (bank.code === "stanbic" ?
            <button className={secondary} disabled={busy || !ledgerOptions.some((o) => o.code === "1110")}
              onClick={() => { const account = ledgerOptions.find((o) => o.code === "1110");
                if (account && window.confirm("Confirm Stanbic is the bank represented by the historical NGN operating ledger account.")) {
                  void run(() => apiPost(ROOT + "/banks/" + bank.id + "/link-ledger", { account_id: account.id }, { auth: true }), "Stanbic linked to the existing ledger.");
                }}}>Link existing Stanbic ledger</button> :
            <button className={secondary} disabled={busy}
              onClick={() => void run(
                () => apiPost(ROOT + "/banks/" + bank.id +
                  (bank.code === "moniepoint" ? "/create-operations-ledger" : "/create-ledger"), {}, { auth: true }),
                "Dedicated bank ledger created and linked. No transactions were imported."
              )}>Create dedicated ledger account</button>)}
        </div>)}
      </section>

      <section id="requests" className={tile}>
        <h2 className="text-lg font-semibold">New expense or operations funding request</h2>
        <p className="mb-4 text-sm text-slate-500">Requests require independent internal approval and bank evidence before being marked confirmed.</p>
        {canPrepare ? <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void run(async () => {
          await apiPost(ROOT + "/requests", {
            kind, amount_minor: toMinor(amount), purpose, category,
            source_bank_id: bankId || (kind === "funding" ? treasury?.id : operations?.id),
            destination_bank_id: kind === "funding" ? (destinationId || operations?.id) : null,
            budget_id: selectedBudget || null,
            vendor_name: kind === "expense" ? (expenseVendor || null) : null,
            invoice_reference: kind === "expense" ? (expenseInvoice || null) : null,
            evidence_reference: kind === "expense" ? (expenseEvidence || null) : null,
            programme: expenseProgramme || null, cost_center_code: expenseCostCenter || null,
            service_on: kind === "expense" && serviceOn ? serviceOn : null,
          }, { auth: true });
          setAmount(""); setPurpose("");
        }, "Request submitted for independent approval."); }}>
          <label className="text-sm">Type<select className={control} value={kind} onChange={(e) => { const next = e.target.value as "expense" | "funding"; setKind(next); setBankId(""); }}><option value="expense">Operating expense</option><option value="funding">Stanbic → Moniepoint allocation</option></select></label>
          <label className="text-sm">Amount (₦)<input className={control} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="15000.00" required /></label>
          <label className="text-sm">Source bank<select className={control} value={bankId || (kind === "funding" ? treasury?.id : operations?.id) || ""} onChange={(e) => setBankId(e.target.value)} required><option value="">Choose account</option>{banks.filter((b) => kind === "expense" || b.purpose === "treasury").map((b) => <option key={b.id} value={b.id}>{b.bank_name}</option>)}</select></label>
          {kind === "funding" && <label className="text-sm">Destination<select className={control} value={destinationId || operations?.id || ""} onChange={(e) => setDestinationId(e.target.value)} required><option value="">Choose account</option>{banks.filter((b) => b.purpose === "operations").map((b) => <option key={b.id} value={b.id}>{b.bank_name}</option>)}</select></label>}
          <label className="text-sm">Category<input className={control} value={category} maxLength={80} onChange={(e) => { setCategory(e.target.value); setSelectedBudget(""); }} required /></label>
          <label className="text-sm">Budget (optional)<select className={control} value={selectedBudget} onChange={(e) => setSelectedBudget(e.target.value)}><option value="">Not linked to a budget</option>{availableBudgets.map((b) => <option key={b.id} value={b.id}>{b.name} — {money(b.amount_minor)}</option>)}</select></label>
          {kind === "expense" && <>
            <label className="text-sm">Vendor / payee<input className={control} value={expenseVendor} onChange={(e) => setExpenseVendor(e.target.value)} placeholder="Pool operator / supplier" /></label>
            <label className="text-sm">Invoice reference<input className={control} value={expenseInvoice} onChange={(e) => setExpenseInvoice(e.target.value)} placeholder="INV-123" /></label>
            <label className="text-sm">Receipt or evidence reference<input className={control} value={expenseEvidence} onChange={(e) => setExpenseEvidence(e.target.value)} placeholder="Secure receipt / payment proof ID" /></label>
            <label className="text-sm">Service date<input type="date" className={control} value={serviceOn} onChange={(e) => setServiceOn(e.target.value)} /></label>
          </>}
          <label className="text-sm">Programme<input className={control} value={expenseProgramme} onChange={(e) => setExpenseProgramme(e.target.value)} placeholder="academy / club / community / store" /></label>
          <label className="text-sm">Existing cost-centre code<input className={control} value={expenseCostCenter} onChange={(e) => setExpenseCostCenter(e.target.value)} placeholder="Optional, must exist in ledger" /></label>
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
              <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{money(r.amount_minor)} · {r.kind === "funding" ? "Operations allocation" : "Expense"}</p><p className="text-sm text-slate-600">{r.purpose}</p><p className="text-xs text-slate-500">{bankName(r.source_bank_id)}{r.destination_bank_id ? " → " + bankName(r.destination_bank_id) : ""} · {r.category}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{r.status}{r.journal_entry_id ? " · ledger posted" : ""}</span></div>
              {owner && r.status === "requested" && member?.id !== r.requested_by && <div className="mt-3 flex gap-2"><button disabled={busy} className={primary} onClick={() => {
                  let reason: string | null = null;
                  if (!r.budget_id) {
                    reason = window.prompt("Unbudgeted request — explain why this exception should be approved:");
                    if (!reason?.trim()) { setError("Unbudgeted approval requires a written justification."); return; }
                  }
                  void run(() => apiPost(ROOT + "/requests/" + r.id + "/decision", { action: "approve", reason }, { auth: true }), "Request approved internally. No bank payment has been sent.");
                }}>Approve internally</button><button disabled={busy} className={secondary} onClick={() => { const reason = window.prompt("Reason for rejection"); if (reason?.trim()) void run(() => apiPost(ROOT + "/requests/" + r.id + "/decision", { action: "reject", reason }, { auth: true }), "Request rejected."); }}>Reject</button></div>}
              {r.approval_note && <p className="mt-1 text-xs text-slate-600">Approval exception: {r.approval_note}</p>}
              {r.kind === "expense" && (r.vendor_name || r.invoice_reference || r.evidence_reference || r.programme) &&
                <p className="mt-1 text-xs text-slate-500">{[r.vendor_name, r.invoice_reference, r.evidence_reference, r.programme].filter(Boolean).join(" · ")}</p>}
              {owner && r.status === "confirmed" && !r.journal_entry_id &&
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  {r.kind === "expense" && <label className="text-xs">Expense ledger account<select className={control} value={postingExpenseCode[r.id] || ""} onChange={(e) => setPostingExpenseCode((old) => ({ ...old, [r.id]: e.target.value }))}>
                    <option value="">Choose expense account</option>{expenseOptions.map((a) => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
                  </select></label>}
                  <button className={secondary} disabled={busy || (r.kind === "expense" && !postingExpenseCode[r.id])}
                    onClick={() => {
                      if (!window.confirm("Confirm this transaction is not already posted by another SwimBuddz payout, PSP, refund or ledger workflow, and that original bank evidence was independently verified.")) return;
                      void run(() => apiPost(ROOT + "/requests/" + r.id + "/post-ledger",
                        { expense_account_code: r.kind === "expense" ? postingExpenseCode[r.id] : null, acknowledgement: true },
                        { auth: true }), "Balanced journal posted through existing ledger.");
                    }}>Post verified transaction to ledger</button>
                </div>}
              {owner && r.status === "confirmed" && !r.journal_entry_id && <div className="mt-2 flex flex-wrap items-end gap-2">
                <label className="text-xs">Existing posted journal UUID
                  <input className={control} placeholder="Only if an existing payout/payment already posted it" value={existingEntry[r.id] || ""} onChange={(e) => setExistingEntry((old) => ({ ...old, [r.id]: e.target.value }))} />
                </label>
                <button className={secondary} disabled={busy || !existingEntry[r.id]}
                  onClick={() => void run(() => apiPost(ROOT + "/requests/" + r.id + "/link-existing-ledger", { journal_entry_id: existingEntry[r.id] }, { auth: true }), "Existing journal linked without posting again.")}>Link existing journal</button>
              </div>}
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

      <section id="reconciliation" className={tile}>
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
          <table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="py-2">Date</th><th>Bank</th><th>Reference</th><th>Amount</th><th>Review state</th><th>Ledger evidence</th></tr></thead><tbody>{lines.slice(0, 40).map((l) => <tr className="border-b border-slate-100" key={l.id}><td className="py-2">{l.occurred_on}</td><td>{bankName(l.bank_account_id)}</td><td className="max-w-48 truncate" title={l.description}>{l.reference || l.description}</td><td className={l.amount_minor < 0 ? "text-red-700" : "text-emerald-700"}>{money(l.amount_minor)}</td><td>{l.match_status}</td><td>{owner && !l.journal_entry_id ? <div className="flex min-w-48 gap-1"><input className={control} aria-label="Posted journal entry UUID" placeholder="Posted journal UUID" value={matchEntries[l.id] ?? ""} onChange={(e) => setMatchEntries((old) => ({ ...old, [l.id]: e.target.value }))} /><button disabled={busy || !matchEntries[l.id]} className={secondary} onClick={() => void run(() => apiPost(ROOT + "/statements/" + l.id + "/match-journal", { journal_entry_id: matchEntries[l.id] }, { auth: true }), "Bank movement matched to posted ledger entry.")}>Match</button></div> : (l.journal_entry_id ? "Linked" : "—")}</td></tr>)}</tbody></table>
          {!lines.length && <p className="py-3 text-sm text-slate-500">No bank evidence has been imported yet.</p>}
        </div>
      </section>

      <section id="budgets" className={tile}>
        <h2 className="text-lg font-semibold">Approved operating budgets</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">{budgets.map((b) => <div key={b.id} className="rounded-lg bg-slate-50 p-3"><p className="font-medium">{b.name}</p><p className="text-sm">{money(b.amount_minor)} · {b.kind} · {b.category}</p>
                <p className="text-xs text-slate-600">Committed: {money(utilization.find((u) => u.id === b.id)?.committed_minor ?? 0)} · Confirmed: {money(utilization.find((u) => u.id === b.id)?.confirmed_minor ?? 0)}</p>
                <p className="text-xs font-medium">Remaining ceiling: {money(utilization.find((u) => u.id === b.id)?.remaining_minor ?? b.amount_minor)}</p>
                <p className="text-xs text-slate-500">{b.starts_on} – {b.ends_on}</p></div>)}</div>
        {owner && <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={(e) => { e.preventDefault(); void run(() => apiPost(ROOT + "/budgets", {
          name: newBudgetName, category: newBudgetCategory, kind: newBudgetKind, amount_minor: toMinor(newBudgetAmount),
          starts_on: newBudgetStart, ends_on: newBudgetEnd,
        }, { auth: true }), "Budget created."); }}>
          <label className="text-sm">Budget type<select className={control} value={newBudgetKind} onChange={(e) => setNewBudgetKind(e.target.value as "expense" | "funding")}><option value="expense">Expense ceiling</option><option value="funding">Treasury allocation ceiling</option></select></label>
          <label className="text-sm">Budget name<input className={control} required value={newBudgetName} onChange={(e) => setNewBudgetName(e.target.value)} /></label>
          <label className="text-sm">Category<input className={control} required value={newBudgetCategory} onChange={(e) => setNewBudgetCategory(e.target.value)} /></label>
          <label className="text-sm">Limit (₦)<input className={control} required value={newBudgetAmount} onChange={(e) => setNewBudgetAmount(e.target.value)} /></label>
          <label className="text-sm">From<input type="date" className={control} required value={newBudgetStart} onChange={(e) => setNewBudgetStart(e.target.value)} /></label>
          <label className="text-sm">Until<input type="date" className={control} required value={newBudgetEnd} onChange={(e) => setNewBudgetEnd(e.target.value)} /></label>
          <div className="self-end"><button disabled={busy} className={primary}>Create budget</button></div>
        </form>}
      </section>

      <section className={tile} id="reconciliation-status">
        <h2 className="text-lg font-semibold">Bank reconciliation status</h2>
        <p className="mt-1 text-sm text-slate-600">Each comparison is made at the date of a separately attested bank statement. An uploaded statement row does not, by itself, verify a bank balance.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {recon.map((bank) => <div key={bank.bank_id} className="rounded-lg border border-slate-200 p-3">
            <p className="font-semibold">{bank.code === "stanbic" ? "Stanbic IBTC" : "Moniepoint"}</p>
            <p className="mt-1 text-sm">Attested balance: {bank.latest_statement_balance_minor == null ? "Not verified" : money(bank.latest_statement_balance_minor)}</p>
            <p className="text-xs text-slate-500">As of {bank.latest_statement_date || "—"} · Ledger at same date: {bank.ledger_balance_minor == null ? "Not linked" : money(bank.ledger_balance_minor)}</p>
            <p className="mt-2 text-sm">Difference: {bank.difference_minor == null ? "Not comparable" : money(bank.difference_minor)} · {bank.unmatched_rows} unmatched rows</p>
            <p className="text-xs font-medium text-slate-600">{bank.status.replaceAll("_", " ")}</p>
          </div>)}
        </div>
        {owner && <div className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="text-sm">Bank<select className={control} value={snapshotBank} onChange={(e) => setSnapshotBank(e.target.value)}><option value="">Choose bank</option>{banks.map((b) => <option key={b.id} value={b.id}>{b.bank_name}</option>)}</select></label>
          <label className="text-sm">Statement closing date<input type="date" className={control} value={snapshotDate} onChange={(e) => setSnapshotDate(e.target.value)} /></label>
          <label className="text-sm">Closing balance (₦, signed)<input className={control} value={snapshotAmount} onChange={(e) => setSnapshotAmount(e.target.value)} /></label>
          <label className="text-sm">Original statement evidence ID<input className={control} value={snapshotEvidence} onChange={(e) => setSnapshotEvidence(e.target.value)} /></label>
          <button className={primary} disabled={busy || !snapshotBank || !snapshotDate || !snapshotAmount || snapshotEvidence.trim().length < 5}
            onClick={() => {
              let verifiedMinor: number;
              try { verifiedMinor = bankBalanceMinor(snapshotAmount); }
              catch (error) { setError(error instanceof Error ? error.message : "Invalid balance"); return; }
              if (!window.confirm("Have you personally verified the bank statement closing balance in the official bank portal? The attested snapshot will be kept in the audit history.")) return;
              void run(() => apiPost(ROOT + "/banks/" + snapshotBank + "/snapshot",
                { as_of: snapshotDate, balance_minor: verifiedMinor, evidence_reference: snapshotEvidence.trim() },
                { auth: true }), "Dated statement balance attested.");
            }}>Attest bank statement balance</button>
        </div>}
      </section>

      <section id="forecasts" className={tile}>
        <h2 className="text-lg font-semibold">Cash flow forecast</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <label className="text-sm">Forecast scenario<select className={control} value={projectionScenario} onChange={(e) => setProjectionScenario(e.target.value)}><option value="base">Base</option><option value="optimistic">Optimistic</option><option value="conservative">Conservative</option></select></label>
          <label className="text-sm">Forecast horizon<select className={control} value={projectionDays} onChange={(e) => setProjectionDays(Number(e.target.value) as 7 | 30 | 90)}><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></label>
        </div>
        <p className="text-sm text-slate-600">Plan upcoming collections and spending. Forecast assumptions are separate from actual payments and from expense ceilings.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Planning opening cash</p><p className="mt-2 font-semibold">{projection?.latest_bank_snapshot_date ? "Verified " + projection.latest_bank_snapshot_date : "Needs matching bank snapshots"}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Approved expenses pending</p><p className="mt-2 font-semibold">{money(projection?.pending_approved_expenses_minor ?? 0)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">{projectionDays}-day projected ending cash</p><p className="mt-2 font-semibold">{projection?.projected_ending_minor == null ? "Not available" : money(projection.projected_ending_minor)}</p></div>
        </div>
        <p className="mt-2 text-xs text-amber-800">{projection?.caveat || "Forecast is not a live bank balance."}</p>
        <h3 className="mt-4 font-semibold">Planned inflows and outflows</h3>
        <div className="mt-2 space-y-2">{forecasts.map((f) => <div key={f.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2">
          <p className="text-sm">{f.effective_on} · {f.scenario} · {f.direction === "outflow" ? "−" : "+"}{money(f.amount_minor)} · {f.purpose}{f.programme ? " · " + f.programme : ""}</p>
          {owner && <button className="text-xs text-red-700 hover:underline" disabled={busy} onClick={() => {
            if (window.confirm("Cancel this planning assumption? It remains in the audit log.")) void run(() => apiDelete(ROOT + "/forecasts/" + f.id, { auth: true }), "Forecast assumption cancelled.");
          }}>Cancel</button>}
        </div>)}</div>
        {canPrepare && <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={(e) => {
          e.preventDefault(); void run(() => apiPost(ROOT + "/forecasts",
            { direction: forecastDirection, scenario: forecastScenario, effective_on: forecastDate, amount_minor: toMinor(forecastAmount), purpose: forecastPurpose, programme: forecastProgramme || null },
            { auth: true }), "Planning assumption recorded.");
        }}>
          <label className="text-sm">Direction<select className={control} value={forecastDirection} onChange={(e) => setForecastDirection(e.target.value as "inflow" | "outflow")}><option value="outflow">Planned payment</option><option value="inflow">Expected collection</option></select></label>
          <label className="text-sm">Scenario<select className={control} value={forecastScenario} onChange={(e) => setForecastScenario(e.target.value)}><option value="base">Base</option><option value="optimistic">Optimistic</option><option value="conservative">Conservative</option></select></label>
          <label className="text-sm">Expected date<input type="date" required className={control} value={forecastDate} onChange={(e) => setForecastDate(e.target.value)} /></label>
          <label className="text-sm">Amount (₦)<input className={control} required value={forecastAmount} onChange={(e) => setForecastAmount(e.target.value)} /></label>
          <label className="text-sm">Description<input className={control} minLength={5} required value={forecastPurpose} onChange={(e) => setForecastPurpose(e.target.value)} /></label>
          <label className="text-sm">Programme<input className={control} value={forecastProgramme} onChange={(e) => setForecastProgramme(e.target.value)} /></label>
          <button className={primary} disabled={busy}>Add forecast assumption</button>
        </form>}
      </section>

      <p className="text-xs text-slate-500">No bank API integration is configured. Accounts shown here represent your internal financial controls; always verify movements against Stanbic and Moniepoint.</p>
    </main>
  );
}
