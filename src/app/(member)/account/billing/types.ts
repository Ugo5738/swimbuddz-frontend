// Types extracted from page.tsx during the file-size sweep.

export type Member = {
  id?: string | null;
  email?: string | null;
  membership?: {
    community_paid_until?: string | null;
    club_paid_until?: string | null;
    active_tiers?: string[] | null;
    requested_tiers?: string[] | null;
    primary_tier?: string | null;
    pending_payment_reference?: string | null;
  } | null;
};

export type PaymentRecord = {
  id: string;
  reference: string;
  status: string;
  amount: number;
  currency: string;
  purpose?: string; // Direct field on payment, e.g. "club_bundle", "club", "community"
  payment_method?: string | null; // paystack or manual_transfer
  proof_of_payment_url?: string | null;
  admin_review_note?: string | null;
  paid_at?: string | null;
  entitlement_applied_at?: string | null;
  entitlement_error?: string | null;
  created_at: string;
  payment_metadata?: {
    purpose?: string; // Legacy/backup
  } | null;
};

export type PricingConfig = {
  community_annual: number;
  club_quarterly: number;
  club_biannual: number;
  club_annual: number;
  currency: string;
};

export type Cohort = {
  id: string;
  name: string;
  program_name?: string;
  start_date?: string;
  price?: number;
  status?: string;
};

export type EnrollmentInstallment = {
  id: string;
  installment_number: number;
  amount: number; // kobo
  due_at: string;
  status: "pending" | "paid" | "missed" | "waived";
  paid_at?: string | null;
};

export type Enrollment = {
  id: string;
  cohort_id: string;
  status: string;
  payment_status: string;
  total_installments?: number;
  paid_installments_count?: number;
  cohort?: {
    name: string;
    start_date?: string;
    end_date?: string;
    program?: {
      name: string;
    };
  };
  installments?: EnrollmentInstallment[];
};

export type WalletSummary = {
  balance: number;
  welcomeBonusGranted: boolean;
  welcomeBonusAmount: number;
};
