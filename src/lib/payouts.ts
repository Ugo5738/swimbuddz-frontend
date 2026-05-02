/**
 * Coach Payouts API client.
 * For bank account management and payout history.
 */

import { apiDelete, apiGet, apiPatch, apiPost } from "./api";

// --- Types ---

export type PayoutStatus =
  | "pending"
  | "approved"
  | "processing"
  | "paid"
  | "failed";
export type PayoutMethod = "paystack_transfer" | "bank_transfer" | "other";

export interface BankAccount {
  id: string;
  member_id: string;
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_verified: boolean;
  verified_at: string | null;
  paystack_recipient_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface Bank {
  name: string;
  code: string;
  slug: string;
}

export interface ResolvedAccount {
  account_number: string;
  account_name: string;
  bank_code: string;
}

export interface Payout {
  id: string;
  coach_member_id: string;
  period_start: string;
  period_end: string;
  period_label: string;
  academy_earnings: number;
  session_earnings: number;
  other_earnings: number;
  total_amount: number;
  currency: string;
  status: PayoutStatus;
  payout_method: PayoutMethod | null;
  approved_by: string | null;
  approved_at: string | null;
  paid_at: string | null;
  payment_reference: string | null;
  paystack_transfer_code: string | null;
  paystack_transfer_status: string | null;
  admin_notes: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayoutListResponse {
  items: Payout[];
  total: number;
  page: number;
  page_size: number;
}

export interface PayoutSummary {
  total_pending: number;
  total_approved: number;
  total_paid: number;
  total_failed: number;
  pending_amount: number;
  paid_amount: number;
}

// --- Bank Account API ---

/** Get the current coach's bank account. */
export async function getMyBankAccount(): Promise<BankAccount | null> {
  try {
    return await apiGet<BankAccount>("/api/v1/coaches/me/bank-account", {
      auth: true,
    });
  } catch (err: unknown) {
    // 404 means no account set up yet
    interface ApiError {
      status?: number;
      message?: string;
    }
    const message =
      err instanceof Error ? err.message : (err as ApiError)?.message || "";

    if (
      (err as ApiError)?.status === 404 ||
      message.includes("404") ||
      /no bank account/i.test(message)
    ) {
      return null;
    }
    throw err;
  }
}

/** Create or update coach's bank account with auto-verification. */
export async function saveBankAccount(data: {
  bank_code: string;
  bank_name: string;
  account_number: string;
}): Promise<BankAccount> {
  return apiPost<BankAccount>("/api/v1/coaches/me/bank-account", data, {
    auth: true,
  });
}

/** Delete coach's bank account. */
export async function deleteBankAccount(): Promise<void> {
  await apiDelete("/api/v1/coaches/me/bank-account", { auth: true });
}

/** Get list of Nigerian banks for dropdown. */
export async function listBanks(): Promise<Bank[]> {
  return apiGet<Bank[]>("/api/v1/coaches/banks");
}

/** Verify a bank account and get the account holder name. */
export async function resolveAccount(
  bank_code: string,
  account_number: string,
): Promise<ResolvedAccount> {
  return apiPost<ResolvedAccount>(
    "/api/v1/coaches/resolve-account",
    {
      bank_code,
      account_number,
    },
    { auth: true },
  );
}

// --- Coach Payout History API ---

/** Get current coach's payout history. */
export async function getMyPayouts(options?: {
  status?: PayoutStatus;
  page?: number;
  page_size?: number;
}): Promise<PayoutListResponse> {
  const params = new URLSearchParams();
  if (options?.status) params.append("status", options.status);
  if (options?.page) params.append("page", String(options.page));
  if (options?.page_size) params.append("page_size", String(options.page_size));

  const query = params.toString() ? `?${params.toString()}` : "";
  return apiGet<PayoutListResponse>(
    `/api/v1/payments/coach/me/payouts/${query}`,
    { auth: true },
  );
}

/** Get a single payout detail. */
export async function getMyPayout(payoutId: string): Promise<Payout> {
  return apiGet<Payout>(`/api/v1/payments/coach/me/payouts/${payoutId}`, {
    auth: true,
  });
}

// --- Admin Payout API ---

/** Admin: List all payouts with optional filters. */
export async function adminListPayouts(options?: {
  status?: PayoutStatus;
  coach_member_id?: string;
  page?: number;
  page_size?: number;
}): Promise<PayoutListResponse> {
  const params = new URLSearchParams();
  if (options?.status) params.append("status", options.status);
  if (options?.coach_member_id)
    params.append("coach_member_id", options.coach_member_id);
  if (options?.page) params.append("page", String(options.page));
  if (options?.page_size) params.append("page_size", String(options.page_size));

  const query = params.toString() ? `?${params.toString()}` : "";
  return apiGet<PayoutListResponse>(`/api/v1/payments/admin/payouts/${query}`, {
    auth: true,
  });
}

/** Admin: Get payout summary stats. */
export async function adminGetPayoutSummary(): Promise<PayoutSummary> {
  return apiGet<PayoutSummary>("/api/v1/payments/admin/payouts/summary", {
    auth: true,
  });
}

/** Admin: Create a new payout for a coach. */
export async function adminCreatePayout(data: {
  coach_member_id: string;
  period_start: string;
  period_end: string;
  period_label: string;
  academy_earnings?: number;
  session_earnings?: number;
  other_earnings?: number;
  admin_notes?: string;
}): Promise<Payout> {
  return apiPost<Payout>("/api/v1/payments/admin/payouts/", data, {
    auth: true,
  });
}

/** Admin: Approve a pending payout. */
export async function adminApprovePayout(
  payoutId: string,
  admin_notes?: string,
): Promise<Payout> {
  return apiPost<Payout>(
    `/api/v1/payments/admin/payouts/${payoutId}/approve`,
    {
      admin_notes,
    },
    { auth: true },
  );
}

/** Admin: Initiate Paystack transfer for a payout. */
export async function adminInitiateTransfer(payoutId: string): Promise<Payout> {
  return apiPost<Payout>(
    `/api/v1/payments/admin/payouts/${payoutId}/initiate-transfer`,
    {},
    { auth: true },
  );
}

/** Admin: Mark payout as manually completed. */
export async function adminCompleteManual(
  payoutId: string,
  data: {
    payout_method?: PayoutMethod;
    payment_reference: string;
    admin_notes?: string;
  },
): Promise<Payout> {
  return apiPost<Payout>(
    `/api/v1/payments/admin/payouts/${payoutId}/complete-manual`,
    data,
    { auth: true },
  );
}

/** Admin: Mark payout as failed. */
export async function adminFailPayout(
  payoutId: string,
  failure_reason: string,
  admin_notes?: string,
): Promise<Payout> {
  return apiPost<Payout>(
    `/api/v1/payments/admin/payouts/${payoutId}/fail`,
    {
      failure_reason,
      admin_notes,
    },
    { auth: true },
  );
}

// =============================================================================
// Recurring payout configs
// =============================================================================

export type RecurringPayoutStatus =
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

export interface RecurringPayoutConfig {
  id: string;
  coach_member_id: string;
  cohort_id: string;
  band_percentage: string; // Decimal serializes as string in JSON
  total_blocks: number;
  block_length_days: number;
  cohort_start_date: string;
  cohort_end_date: string;
  cohort_price_amount: number;
  currency: string;
  block_index: number;
  next_run_date: string;
  status: RecurringPayoutStatus;
  created_by_member_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecurringPayoutConfigListResponse {
  items: RecurringPayoutConfig[];
  total: number;
}

export interface PayoutPreviewLine {
  student_member_id: string;
  student_name: string | null;
  enrolled_at: string;
  sessions_in_block: number;
  sessions_delivered: number;
  sessions_excused: number;
  makeups_completed_in_block: number;
  per_session_amount_kobo: number;
  student_total_kobo: number;
}

export interface PayoutPreview {
  config_id: string;
  block_index: number;
  block_start: string;
  block_end: string;
  per_session_amount_kobo: number;
  lines: PayoutPreviewLine[];
  total_kobo: number;
  currency: string;
}

/** Admin: list recurring payout configs (with optional filters). */
export async function adminListRecurringPayouts(options?: {
  coach_member_id?: string;
  cohort_id?: string;
  status?: RecurringPayoutStatus;
  page?: number;
  page_size?: number;
}): Promise<RecurringPayoutConfigListResponse> {
  const params = new URLSearchParams();
  if (options?.coach_member_id)
    params.set("coach_member_id", options.coach_member_id);
  if (options?.cohort_id) params.set("cohort_id", options.cohort_id);
  if (options?.status) params.set("status", options.status);
  if (options?.page) params.set("page", String(options.page));
  if (options?.page_size) params.set("page_size", String(options.page_size));
  const query = params.toString();
  return apiGet<RecurringPayoutConfigListResponse>(
    `/api/v1/payments/admin/recurring-payouts/${query ? `?${query}` : ""}`,
    { auth: true },
  );
}

/** Admin: fetch a single recurring config. */
export async function adminGetRecurringPayout(
  configId: string,
): Promise<RecurringPayoutConfig> {
  return apiGet<RecurringPayoutConfig>(
    `/api/v1/payments/admin/recurring-payouts/${configId}`,
    { auth: true },
  );
}

/** Admin: create a new recurring config for a (coach, cohort) pair.
 * Backend validates band_percentage falls within the cohort's
 * complexity-derived pay band and snapshots cohort price/dates.
 */
export async function adminCreateRecurringPayout(data: {
  coach_member_id: string;
  cohort_id: string;
  band_percentage: number | string;
  notes?: string;
}): Promise<RecurringPayoutConfig> {
  return apiPost<RecurringPayoutConfig>(
    `/api/v1/payments/admin/recurring-payouts/`,
    data,
    { auth: true },
  );
}

/** Admin: update band % / status / notes on an existing config. */
export async function adminUpdateRecurringPayout(
  configId: string,
  data: {
    band_percentage?: number | string;
    status?: RecurringPayoutStatus;
    notes?: string | null;
  },
): Promise<RecurringPayoutConfig> {
  return apiPatch<RecurringPayoutConfig>(
    `/api/v1/payments/admin/recurring-payouts/${configId}`,
    data,
    { auth: true },
  );
}

/** Admin: dry-run the next block payout. Returns per-student breakdown.
 * No DB writes happen.
 */
export async function adminPreviewRecurringPayout(
  configId: string,
): Promise<PayoutPreview> {
  return apiGet<PayoutPreview>(
    `/api/v1/payments/admin/recurring-payouts/${configId}/preview`,
    { auth: true },
  );
}

/** Admin: force-run the next block now (back-pay / first-block trigger). */
export async function adminRunRecurringPayoutNow(
  configId: string,
): Promise<RecurringPayoutConfig> {
  return apiPost<RecurringPayoutConfig>(
    `/api/v1/payments/admin/recurring-payouts/${configId}/run-now`,
    {},
    { auth: true },
  );
}

// =============================================================================
// Make-up obligations (coach + admin)
// =============================================================================

export type MakeupStatus =
  | "pending"
  | "scheduled"
  | "completed"
  | "expired"
  | "cancelled";

export type MakeupReason =
  | "late_join"
  | "excused_absence"
  | "session_cancelled";

export interface MakeupObligation {
  id: string;
  cohort_id: string;
  student_member_id: string;
  coach_member_id: string;
  original_session_id: string | null;
  scheduled_session_id: string | null;
  reason: MakeupReason;
  status: MakeupStatus;
  completed_at: string | null;
  pay_credited_in_payout_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MakeupObligationListResponse {
  items: MakeupObligation[];
  total: number;
}

/** Coach: list own make-up obligations, optionally filtered by cohort/status. */
export async function coachListMyMakeups(options?: {
  cohort_id?: string;
  status?: MakeupStatus;
  page?: number;
  page_size?: number;
}): Promise<MakeupObligationListResponse> {
  const params = new URLSearchParams();
  if (options?.cohort_id) params.set("cohort_id", options.cohort_id);
  if (options?.status) params.set("status", options.status);
  if (options?.page) params.set("page", String(options.page));
  if (options?.page_size) params.set("page_size", String(options.page_size));
  const query = params.toString();
  return apiGet<MakeupObligationListResponse>(
    `/api/v1/payments/coach/me/cohort-makeups/${query ? `?${query}` : ""}`,
    { auth: true },
  );
}

/** Coach: link an obligation to one of their cohort's future sessions.
 * Backend verifies coach owns the obligation, the session is in the same
 * cohort, and the session is in the future.
 */
export async function coachScheduleMakeup(
  obligationId: string,
  scheduled_session_id: string,
  notes?: string,
): Promise<MakeupObligation> {
  return apiPatch<MakeupObligation>(
    `/api/v1/payments/coach/me/cohort-makeups/${obligationId}/schedule`,
    { scheduled_session_id, notes },
    { auth: true },
  );
}
