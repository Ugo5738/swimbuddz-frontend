import { remainingAcademyInstallments } from "./academyBilling";
import type { Enrollment, PaymentRecord, UnpaidBooking } from "../types";

export type MoneyStatus = "due" | "upcoming" | "checking";
export type MemberObligation = {
  id: string;
  title: string;
  detail: string;
  amountKobo: number;
  status: MoneyStatus;
  href: string;
  date?: string;
  source: "academy" | "session";
};
export type FinancialOverviewData = {
  due: MemberObligation[];
  upcoming: MemberObligation[];
  checking: MemberObligation[];
  needsQuote: { id: string; title: string; href: string }[];
  dueKobo: number;
  upcomingKobo: number;
};

const lagosDay = (value: Date): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(value);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
};

export function installmentDay(dueAt: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dueAt)) return dueAt;
  const time = new Date(dueAt);
  return Number.isNaN(time.getTime()) ? null : lagosDay(time);
}

function unsettledTransferReference(
  transfers: PaymentRecord[],
  purpose: string,
  sourceId: string
): string | null {
  const matching = transfers.find(
    (payment) =>
      payment.payment_method === "manual_transfer" &&
      payment.status === "pending_review" &&
      payment.purpose === purpose &&
      ((purpose === "academy_cohort" &&
        payment.payment_metadata?.installment_id === sourceId) ||
        (purpose === "session_booking" &&
          payment.payment_metadata?.booking_id === sourceId))
  );
  return matching?.reference ?? null;
}

export function buildFinancialOverview(
  enrollments: Enrollment[],
  sessions: UnpaidBooking[],
  transfers: PaymentRecord[],
  now = new Date()
): FinancialOverviewData {
  const due: MemberObligation[] = [];
  const upcoming: MemberObligation[] = [];
  const checking: MemberObligation[] = [];
  const needsQuote: FinancialOverviewData["needsQuote"] = [];
  const today = lagosDay(now);

  for (const enrollment of enrollments) {
    if (!["enrolled", "pending_approval", "dropout_pending"].includes(enrollment.status)) continue;
    const name = enrollment.cohort?.name || enrollment.cohort?.program?.name || "Academy programme";
    const href = `/account/academy/enrollments/${encodeURIComponent(enrollment.id)}`;
    const rows = remainingAcademyInstallments(enrollment);
    // Missing schedule data is not a zero balance. Send members to the
    // canonical enrollment page so the backend provides an authoritative quote.
    if (
      !enrollment.installments?.length &&
      (enrollment.payment_status !== "paid" ||
        enrollment.uses_installments ||
        (enrollment.total_installments ?? 0) > 0)
    ) {
      needsQuote.push({ id: enrollment.id, title: name, href });
    }
    for (const installment of rows) {
      const day = installmentDay(installment.due_at);
      const reference = unsettledTransferReference(
        transfers, "academy_cohort", installment.id
      );
      const item: MemberObligation = {
        id: `academy:${enrollment.id}:${installment.id}`,
        title: name,
        detail: `Instalment ${installment.installment_number}${reference ? " · Transfer under review" : installment.status === "missed" ? " · Missed payment" : day && day < today ? " · Date has passed" : ""}`,
        amountKobo: installment.amount,
        status: reference ? "checking" : installment.status === "missed" || !day || day <= today ? "due" : "upcoming",
        href,
        date: installment.due_at,
        source: "academy",
      };
      if (item.status === "checking") checking.push(item);
      else if (item.status === "due") due.push(item);
      else upcoming.push(item);
    }
  }
  for (const session of sessions) {
    if (!Number.isSafeInteger(session.fee_amount_kobo) || session.fee_amount_kobo <= 0) continue;
    const reference = unsettledTransferReference(transfers, "session_booking", session.id);
    const item: MemberObligation = {
      id: `session:${session.id}`,
      title: session.session_title || "Swimming session",
      detail: reference ? "Bank transfer under review" : "Session fee in our records",
      amountKobo: session.fee_amount_kobo,
      status: reference ? "checking" : "due",
      href: `/account/billing/sessions/${encodeURIComponent(session.id)}`,
      date: session.session_starts_at,
      source: "session",
    };
    if (reference) checking.push(item);
    else due.push(item);
  }

  const sum = (rows: MemberObligation[]) =>
    rows.reduce((amount, item) => amount + item.amountKobo, 0);
  due.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  upcoming.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  return { due, upcoming, checking, needsQuote, dueKobo: sum(due), upcomingKobo: sum(upcoming) };
}
