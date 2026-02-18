/**
 * Coach Payouts API client.
 * For bank account management and payout history.
 */

import { apiDelete, apiGet, apiPost } from "./api";

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
