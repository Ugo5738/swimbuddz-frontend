// Typed API wrapper for the corporate_service backend (port 8017 via gateway).
// Pattern matches src/lib/pools.ts — local TS types + thin wrappers around apiGet/Post/Patch/Delete.

import { apiDelete, apiGet, apiPatch, apiPost } from "../api";

// ─── Enums ──────────────────────────────────────────────────────────────

export type CompanyIndustry =
  | "tech"
  | "bank_finance"
  | "consultancy"
  | "telco"
  | "mda_parastatal"
  | "fmcg"
  | "healthcare"
  | "education"
  | "ngo"
  | "other";

export type CompanySize = "under_50" | "50_to_250" | "250_to_1000" | "over_1000";

export type ContactSource =
  | "cold_outbound"
  | "warm_intro"
  | "referral"
  | "inbound_email"
  | "inbound_web"
  | "event"
  | "other";

export type DealStage =
  | "lead"
  | "contacted"
  | "intro_scheduled"
  | "intro_done"
  | "proposal_sent"
  | "negotiating"
  | "won"
  | "lost";

export type DealLostReason =
  | "price"
  | "timing"
  | "internal_priorities"
  | "budget_frozen"
  | "competitor"
  | "logistics"
  | "no_response"
  | "other";

export type DiscountTier = "full_price" | "bulk_5_9" | "bulk_10_plus";

export type PaymentTerms =
  | "full_upfront"
  | "deposit_half"
  | "net_30"
  | "net_60"
  | "custom";

export type ProgramStatus =
  | "draft"
  | "ready"
  | "active"
  | "completed"
  | "cancelled";

export type EmployeeEnrollmentStatus =
  | "pending"
  | "invited"
  | "registered"
  | "enrolled"
  | "opted_out";

export type TouchpointType =
  | "email_intro"
  | "email_followup_1"
  | "email_followup_2"
  | "intro_call"
  | "proposal_shared"
  | "demo"
  | "whatsapp"
  | "phone_call"
  | "in_person"
  | "note";

export type TouchpointDirection = "outbound" | "inbound";

// ─── Contacts ───────────────────────────────────────────────────────────

export interface CorporateContact {
  id: string;
  company_name: string;
  company_website: string | null;
  industry: CompanyIndustry | null;
  company_size: CompanySize | null;
  hq_location: string | null;
  primary_contact_name: string;
  primary_contact_role: string | null;
  primary_contact_email: string;
  primary_contact_phone: string | null;
  primary_contact_whatsapp: string | null;
  source: ContactSource;
  owner_auth_id: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CorporateContactCreate {
  company_name: string;
  company_website?: string | null;
  industry?: CompanyIndustry | null;
  company_size?: CompanySize | null;
  hq_location?: string | null;
  primary_contact_name: string;
  primary_contact_role?: string | null;
  primary_contact_email: string;
  primary_contact_phone?: string | null;
  primary_contact_whatsapp?: string | null;
  source?: ContactSource;
  owner_auth_id?: string | null;
  notes?: string | null;
}

export type CorporateContactUpdate = Partial<CorporateContactCreate> & {
  is_active?: boolean;
};

export interface ContactListParams {
  industry?: CompanyIndustry;
  company_size?: CompanySize;
  source?: ContactSource;
  is_active?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface ContactListResponse {
  items: CorporateContact[];
  total: number;
  page: number;
  page_size: number;
}

// ─── Deals ──────────────────────────────────────────────────────────────

export interface CorporateDeal {
  id: string;
  contact_id: string;
  title: string;
  stage: DealStage;
  expected_employees: number | null;
  expected_discount_tier: DiscountTier | null;
  expected_total_kobo: number | null;
  expected_close_date: string | null;
  actual_close_date: string | null;
  next_action: string | null;
  next_action_due: string | null;
  last_touch_at: string | null;
  lost_reason: DealLostReason | null;
  lost_notes: string | null;
  owner_auth_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CorporateDealCreate {
  title: string;
  stage?: DealStage;
  expected_employees?: number | null;
  expected_discount_tier?: DiscountTier | null;
  expected_total_kobo?: number | null;
  expected_close_date?: string | null;
  next_action?: string | null;
  next_action_due?: string | null;
  owner_auth_id?: string | null;
  notes?: string | null;
}

export type CorporateDealUpdate = Partial<CorporateDealCreate> & {
  actual_close_date?: string | null;
  last_touch_at?: string | null;
  lost_reason?: DealLostReason | null;
  lost_notes?: string | null;
};

export interface DealListParams {
  stage?: DealStage;
  contact_id?: string;
  owner_auth_id?: string;
  page?: number;
  page_size?: number;
}

export interface DealListResponse {
  items: CorporateDeal[];
  total: number;
  page: number;
  page_size: number;
}

export interface DealWinRequest {
  program_name: string;
  employee_count: number;
  discount_tier: DiscountTier;
  payment_terms?: PaymentTerms;
  is_pilot_partner?: boolean;
  expected_start_date?: string | null;
  expected_end_date?: string | null;
  notes?: string | null;
}

export interface DealLossRequest {
  lost_reason: DealLostReason;
  lost_notes?: string | null;
}

// ─── Programs ───────────────────────────────────────────────────────────

export interface CorporateProgram {
  id: string;
  contact_id: string;
  deal_id: string | null;
  name: string;
  status: ProgramStatus;
  employee_count: number;
  discount_tier: DiscountTier;
  per_employee_kobo: number;
  total_kobo: number;
  payment_terms: PaymentTerms;
  deposit_paid_kobo: number;
  balance_paid_kobo: number;
  cohort_id: string | null;
  corporate_wallet_id: string | null;
  expected_start_date: string | null;
  actual_start_date: string | null;
  expected_end_date: string | null;
  actual_end_date: string | null;
  is_pilot_partner: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CorporateProgramCreate {
  contact_id: string;
  deal_id?: string | null;
  name: string;
  status?: ProgramStatus;
  employee_count?: number;
  discount_tier?: DiscountTier;
  per_employee_kobo: number;
  total_kobo: number;
  payment_terms?: PaymentTerms;
  deposit_paid_kobo?: number;
  balance_paid_kobo?: number;
  expected_start_date?: string | null;
  expected_end_date?: string | null;
  is_pilot_partner?: boolean;
  notes?: string | null;
}

export type CorporateProgramUpdate = Partial<
  Omit<CorporateProgramCreate, "contact_id" | "deal_id">
> & {
  actual_start_date?: string | null;
  actual_end_date?: string | null;
};

export interface ProgramListParams {
  status?: ProgramStatus;
  contact_id?: string;
  page?: number;
  page_size?: number;
}

export interface ProgramListResponse {
  items: CorporateProgram[];
  total: number;
  page: number;
  page_size: number;
}

export interface LinkCohortRequest {
  cohort_id: string;
}

export interface ProvisionWalletRequest {
  budget_kobo?: number | null;
  member_bubble_limit?: number | null;
}

export interface EnrollAllResponse {
  enrolled: number;
  skipped_no_member_id: number;
  skipped_already_booked: number;
  employee_count: number;
}

// ─── Employees ──────────────────────────────────────────────────────────

export interface CorporateProgramEmployee {
  id: string;
  program_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  member_id: string | null;
  member_auth_id: string | null;
  enrollment_status: EmployeeEnrollmentStatus;
  invitation_sent_at: string | null;
  registered_at: string | null;
  enrolled_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeRow {
  full_name: string;
  email: string;
  phone?: string | null;
  notes?: string | null;
}

export interface EmployeeBulkAddRequest {
  employees: EmployeeRow[];
}

export interface EmployeeBulkAddResponse {
  added: number;
  skipped_duplicates: number;
  items: CorporateProgramEmployee[];
}

export interface MatchMembersResponse {
  matched: number;
  already_matched: number;
  unresolved: number;
}

// ─── Touchpoints ────────────────────────────────────────────────────────

export interface CorporateTouchpoint {
  id: string;
  contact_id: string;
  deal_id: string | null;
  type: TouchpointType;
  direction: TouchpointDirection;
  occurred_at: string;
  summary: string | null;
  outcome: string | null;
  next_action: string | null;
  logged_by_auth_id: string | null;
  created_at: string;
}

export interface CorporateTouchpointCreate {
  type: TouchpointType;
  direction?: TouchpointDirection;
  occurred_at?: string | null;
  summary?: string | null;
  outcome?: string | null;
  next_action?: string | null;
  deal_id?: string | null;
}

// ─── Outreach automation ────────────────────────────────────────────────

export interface OutreachState {
  contact_id: string;
  outreach_paused: boolean;
  outreach_started_at: string | null;
  last_outbound_email_at: string | null;
  last_outbound_email_type: string | null;
  next_email_number: number | null;
  has_inbound_reply: boolean;
}

export interface OutreachPreview {
  number: number;
  subject: string;
  plain: string;
  html: string;
}

export interface OutreachSendResult {
  sent: boolean;
  email_number: number | null;
  touchpoint_id: string | null;
  reason: string | null;
}

export interface OutreachCycleResult {
  considered: number;
  sent: number;
  skipped: number;
}

// ─── Outcome reports (SwimBuddz Wrapped) ────────────────────────────────

export interface EmployeeReportRow {
  employee_id: string;
  full_name: string;
  email: string;
  enrollment_status: EmployeeEnrollmentStatus;
  sessions_attended: number;
  sessions_total: number;
  attendance_rate: number | null;
  milestones_achieved: number;
}

export interface ProgramOutcomeReport {
  program_id: string;
  program_name: string;
  company_name: string;
  status: string;
  generated_at: string;
  period_from: string;
  period_to: string;
  employee_count: number;
  enrollment_funnel: Record<string, number>;
  sessions_in_cohort: number;
  aggregate_sessions_attended: number;
  aggregate_sessions_possible: number;
  aggregate_attendance_rate: number | null;
  aggregate_milestones_achieved: number;
  employees: EmployeeReportRow[];
}

export interface EmailReportRequest {
  custom_note?: string | null;
  report_url?: string | null;
}

export interface EmailReportResponse {
  delivered: boolean;
  recipient_email: string;
  touchpoint_id: string;
}

// ─── Public lead capture ────────────────────────────────────────────────

export interface PublicLeadCreate {
  company_name: string;
  primary_contact_name: string;
  primary_contact_email: string;
  employee_count?: number | null;
  message?: string | null;
  /** Honeypot — must remain empty. Submitting a value gets silently accepted
   * but no record is created. The form leaves this hidden + un-filled. */
  website?: string;
}

export interface PublicLeadResponse {
  ok: boolean;
  message: string;
}

// ─── Endpoint helpers ───────────────────────────────────────────────────

const BASE = "/api/v1/admin/corporate";
const PUBLIC_BASE = "/api/v1/corporate";

function qs(params: object | undefined): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// Contacts ---------------------------------------------------------------
export const corporateApi = {
  // Public (no auth)
  submitLead: (body: PublicLeadCreate) =>
    apiPost<PublicLeadResponse>(`${PUBLIC_BASE}/leads`, body),

  // Contacts
  listContacts: (params?: ContactListParams) =>
    apiGet<ContactListResponse>(`${BASE}/contacts${qs(params)}`, { auth: true }),
  getContact: (id: string) =>
    apiGet<CorporateContact>(`${BASE}/contacts/${id}`, { auth: true }),
  createContact: (body: CorporateContactCreate) =>
    apiPost<CorporateContact>(`${BASE}/contacts`, body, { auth: true }),
  updateContact: (id: string, body: CorporateContactUpdate) =>
    apiPatch<CorporateContact>(`${BASE}/contacts/${id}`, body, { auth: true }),
  deleteContact: (id: string) =>
    apiDelete<void>(`${BASE}/contacts/${id}`, { auth: true }),

  // Touchpoints
  listTouchpoints: (contactId: string) =>
    apiGet<CorporateTouchpoint[]>(
      `${BASE}/contacts/${contactId}/touchpoints`,
      { auth: true },
    ),
  createTouchpoint: (contactId: string, body: CorporateTouchpointCreate) =>
    apiPost<CorporateTouchpoint>(
      `${BASE}/contacts/${contactId}/touchpoints`,
      body,
      { auth: true },
    ),

  // Deals
  listDeals: (params?: DealListParams) =>
    apiGet<DealListResponse>(`${BASE}/deals${qs(params)}`, { auth: true }),
  getDeal: (id: string) =>
    apiGet<CorporateDeal>(`${BASE}/deals/${id}`, { auth: true }),
  createDeal: (contactId: string, body: CorporateDealCreate) =>
    apiPost<CorporateDeal>(`${BASE}/contacts/${contactId}/deals`, body, {
      auth: true,
    }),
  updateDeal: (id: string, body: CorporateDealUpdate) =>
    apiPatch<CorporateDeal>(`${BASE}/deals/${id}`, body, { auth: true }),
  winDeal: (id: string, body: DealWinRequest) =>
    apiPost<CorporateProgram>(`${BASE}/deals/${id}/win`, body, { auth: true }),
  loseDeal: (id: string, body: DealLossRequest) =>
    apiPost<CorporateDeal>(`${BASE}/deals/${id}/lose`, body, { auth: true }),

  // Programs
  listPrograms: (params?: ProgramListParams) =>
    apiGet<ProgramListResponse>(`${BASE}/programs${qs(params)}`, { auth: true }),
  getProgram: (id: string) =>
    apiGet<CorporateProgram>(`${BASE}/programs/${id}`, { auth: true }),
  createProgram: (body: CorporateProgramCreate) =>
    apiPost<CorporateProgram>(`${BASE}/programs`, body, { auth: true }),
  updateProgram: (id: string, body: CorporateProgramUpdate) =>
    apiPatch<CorporateProgram>(`${BASE}/programs/${id}`, body, { auth: true }),
  cancelProgram: (id: string) =>
    apiDelete<void>(`${BASE}/programs/${id}`, { auth: true }),

  // Employees
  listEmployees: (programId: string) =>
    apiGet<CorporateProgramEmployee[]>(
      `${BASE}/programs/${programId}/employees`,
      { auth: true },
    ),
  bulkAddEmployees: (programId: string, body: EmployeeBulkAddRequest) =>
    apiPost<EmployeeBulkAddResponse>(
      `${BASE}/programs/${programId}/employees`,
      body,
      { auth: true },
    ),
  removeEmployee: (programId: string, employeeId: string) =>
    apiDelete<void>(
      `${BASE}/programs/${programId}/employees/${employeeId}`,
      { auth: true },
    ),
  matchMembers: (programId: string) =>
    apiPost<MatchMembersResponse>(
      `${BASE}/programs/${programId}/employees/match-members`,
      {},
      { auth: true },
    ),

  // Orchestration
  linkCohort: (programId: string, body: LinkCohortRequest) =>
    apiPost<CorporateProgram>(
      `${BASE}/programs/${programId}/link-cohort`,
      body,
      { auth: true },
    ),
  provisionWallet: (programId: string, body: ProvisionWalletRequest) =>
    apiPost<CorporateProgram>(
      `${BASE}/programs/${programId}/provision-wallet`,
      body,
      { auth: true },
    ),
  enrollAll: (programId: string) =>
    apiPost<EnrollAllResponse>(
      `${BASE}/programs/${programId}/enroll-all`,
      {},
      { auth: true },
    ),

  // Outcome reports
  getProgramReport: (programId: string) =>
    apiGet<ProgramOutcomeReport>(
      `${BASE}/programs/${programId}/report`,
      { auth: true },
    ),
  emailProgramReport: (programId: string, body: EmailReportRequest) =>
    apiPost<EmailReportResponse>(
      `${BASE}/programs/${programId}/report/email`,
      body,
      { auth: true },
    ),

  // Outreach automation
  getOutreachState: (contactId: string) =>
    apiGet<OutreachState>(
      `${BASE}/contacts/${contactId}/outreach`,
      { auth: true },
    ),
  startOutreach: (contactId: string) =>
    apiPost<OutreachState>(
      `${BASE}/contacts/${contactId}/outreach/start`,
      {},
      { auth: true },
    ),
  pauseOutreach: (contactId: string) =>
    apiPost<OutreachState>(
      `${BASE}/contacts/${contactId}/outreach/pause`,
      {},
      { auth: true },
    ),
  resumeOutreach: (contactId: string) =>
    apiPost<OutreachState>(
      `${BASE}/contacts/${contactId}/outreach/resume`,
      {},
      { auth: true },
    ),
  previewOutreach: (contactId: string) =>
    apiGet<OutreachPreview[]>(
      `${BASE}/contacts/${contactId}/outreach/preview`,
      { auth: true },
    ),
  sendNextOutreach: (contactId: string) =>
    apiPost<OutreachSendResult>(
      `${BASE}/contacts/${contactId}/outreach/send-now`,
      {},
      { auth: true },
    ),
  runOutreachCycle: () =>
    apiPost<OutreachCycleResult>(`${BASE}/outreach/run-cycle`, {}, { auth: true }),
};

// ─── Display helpers ────────────────────────────────────────────────────

export function nairaFromKobo(kobo: number | null | undefined): string {
  if (kobo === null || kobo === undefined) return "—";
  const naira = kobo / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(naira);
}

// Per-employee tier price (kobo). Mirrors backend's services/pricing.py.
export const TIER_PRICE_KOBO: Record<DiscountTier, number> = {
  full_price: 15_000_000,
  bulk_5_9: 13_500_000,
  bulk_10_plus: 12_750_000,
};

export function discountTierForCount(count: number): DiscountTier {
  if (count >= 10) return "bulk_10_plus";
  if (count >= 5) return "bulk_5_9";
  return "full_price";
}

export function previewProgramTotal(count: number, tier: DiscountTier): number {
  return TIER_PRICE_KOBO[tier] * count;
}
